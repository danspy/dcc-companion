# The Recap as Content — Implementation Plan (sub-project A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every entity a short recap paragraph per book and every beat a one-sentence gist, both gated and linted like the rest of the content, composed by one rule into "the story so far" on the entity page.

**Architecture:** Two new fields in the curation JSON (`recap` on an entity, `gist` + `gistDraft` on a beat), resolved by `build-content.mjs` into the committed snapshot and seeded into two new columns. A new lint block guards their shape and gates, and a new **faithfulness** rule guards their prose: a text may name only what its sources name. `src/lib/story.ts` composes what a reader at a given position sees; the entity page renders it. Two scripts draft the prose through Ollama Cloud, screening each answer with the lint's own functions before writing it back as `draft`.

**Tech Stack:** Node 22 ESM scripts (`node:test`, `--experimental-strip-types` for `src/lib`), Astro 6 + Astro DB, one `fetch` to Ollama's `/api/chat` (no SDK).

**Spec:** `docs/superpowers/specs/2026-10-06-entity-recap-design.md`

## Global Constraints

- A recap step's `at` is always `N:end`; any other form is a lint error.
- One recap step per book the entity has a beat in; a step for a book with no beat is an error.
- Recap: 2–4 sentences, ≤ 80 words. Gist: one sentence, ≤ 18 words. Narrator's third person, present tense.
- The forward-phrase heuristic and the forward-reference check apply to recap and gist text exactly as to a tagline. **No exemption list**, for either rule or for faithfulness.
- Faithfulness: every capitalised word not at a sentence start, and every token containing a digit, must occur as a whole word in the text's sources (case-sensitive for capitalised words).
- `confidence` on a recap step is `verified | draft`; a gist's review state is the beat's `gistDraft: true|absent`, never the beat's `confidence`.
- Body text never says *book*, *series*, *later*, *the reader*; `Bk 4 · Ch 6` is chrome and allowed in stamps only.
- `src/lib` imports name the `.ts` extension. `scripts/lib/gate.mjs` stays a pure copy of `progress.ts`.
- Model: `OLLAMA_MODEL` defaulting to `gemma4:31b`, `OLLAMA_HOST` defaulting to `https://ollama.com`, `OLLAMA_API_KEY` from `.env`. The key is never committed.
- The snapshot carries no timestamp; the staleness guard rebuilds and diffs it.
- The app export (`src/lib/app-export.ts`) is untouched: it picks fields explicitly, so new fields do not reach `content.json`.

## Review Focus

Inputs the spec implies but no task would otherwise test — each gets a test in the task that owns it:

1. **A recap step for a book the reader has finished sits beside a current book with no beats yet** — e.g. Carl at 4:1 with no beat at 4:1 — `storySoFar` must return `current` with empty `lines` and `thisChapter: 0`, not `null`, and not throw. (Task 4)
2. **A faithfulness check on text whose sources contain the name only in possessive or hyphenated form** — the beat says "Donut's" and the gist says "Donut" — must pass: tokens are split on non-word characters before comparison. (Task 2)
3. **A number written with a thousands separator or as a decimal** — "2,145", "1.5" — must be compared as the whole token the text uses; "2,145" in a gist passes only if "2,145" is in the source. (Task 2)
4. **A beat whose `gist` is an empty string** — a model that answered nothing — must be a lint error, not an accepted blank line. (Task 1)
5. **The drafting script's model answer wrapped in quotes or a fenced block** must be unwrapped before screening, or every answer fails faithfulness on the backticks. (Task 6)

---

## File map

| file | responsibility |
|---|---|
| `scripts/lib/lint.mjs` | the recap/gist structural rules; the forward checks applied to them; exports `faithfulness()` and `tokensOf()` |
| `scripts/build-content.mjs` | resolves `recap` steps to `sortKey`; passes `gist` / `gistDraft` through on beats; counts drafts |
| `db/config.ts` | `Entity.recap` (json), `Beat.gist` (text, optional), `Beat.gistDraft` (boolean) |
| `src/lib/story.ts` | `storySoFar()` — the one composition rule |
| `src/lib/content.ts` | `recapSteps()` — the reached recap steps, mirroring `taglineFor` |
| `src/pages/entity/[id].astro` | the **So far** block |
| `scripts/check-facts.mjs` | reads recap and gist text as units |
| `scripts/lib/ollama.mjs` | `ask(messages)` — one fetch, key from `.env` |
| `scripts/lib/recaps.mjs` | pure: prompts, `unwrap()`, `screen()`, the per-entity/per-book work list, write-back |
| `scripts/draft-recaps.mjs` | CLI: `npm run recaps:draft` |
| `scripts/draft-gists.mjs` | CLI: `npm run gists:draft` |
| `scripts/test-gate.mjs` | tests for lint rules, faithfulness, `storySoFar` |
| `scripts/test-recaps.mjs` | tests for the drafting library with a fake `ask` |
| `scripts/smoke.mjs` | asserts the So far block on an entity page |

---

### Task 1: Lint — the recap and gist structural rules

**Files:**
- Modify: `scripts/lib/lint.mjs` (inside the `for (const e of entities)` loop, after the taglines block at ~line 188, and inside the beats loop after `checkForward(b.text, …)` at ~line 237)
- Test: `scripts/test-gate.mjs`

**Interfaces:**
- Consumes: `lint({ books, floors, entities })`, `checkForward(text, atValue, where)`, `parseAt`, `bookOf`, `END_OF_BOOK`.
- Produces: errors with the prefixes `entity <id> recap <n>:` and `entity <id> beat "<headline>" gist:`; warnings `draft recap — <id>: book <n>` and `draft gist — <id>: <headline>`.

- [ ] **Step 1: Write the failing tests** (append to `scripts/test-gate.mjs`)

```js
const recapBooks = [{ id: 1, title: 'One', chapters: 47 }, { id: 2, title: 'Two', chapters: 25 }];
const recapEntity = (recap, beats) => ({
  id: 'x', kind: 'character', name: 'Xan', role: 'r', tagline: 't', revealedAt: '1:1', voice: 'system',
  beats: beats ?? [{ kind: 'arc', book: 1, at: '1:3', headline: 'h', text: 'Xan arrives.', confidence: 'verified' }],
  recap,
});
const recapLint = (recap, beats) => lint({ books: recapBooks, floors: [], entities: [recapEntity(recap, beats)] });

test('a recap step must be gated at the end of its book', () => {
  const { errors } = recapLint([{ at: '1:12', text: 'Xan arrives.', confidence: 'draft' }]);
  assert.ok(errors.some(e => /recap 1: "1:12" is not a book's end/.test(e)), errors.join('\n'));
  assert.equal(recapLint([{ at: '1:end', text: 'Xan arrives.', confidence: 'draft' }]).errors.length, 0);
});

test('one recap step per book, in order, and only for a book with a beat', () => {
  const two = recapLint([
    { at: '1:end', text: 'Xan arrives.', confidence: 'draft' },
    { at: '1:end', text: 'Xan arrives again.', confidence: 'draft' },
  ]);
  assert.ok(two.errors.some(e => /recap 2: a second step for book 1/.test(e)), two.errors.join('\n'));
  const empty = recapLint([{ at: '2:end', text: 'Xan rests.', confidence: 'draft' }]);
  assert.ok(empty.errors.some(e => /recap 1: book 2 has no beat of x to recap/.test(e)), empty.errors.join('\n'));
});

test('a recap step before its entity, or with no text, or an unknown confidence, is an error', () => {
  const late = recapLint([{ at: '1:end', text: 'Xan arrives.', confidence: 'draft' }], [
    { kind: 'arc', book: 1, at: '1:3', headline: 'h', text: 'Xan arrives.', confidence: 'verified' },
  ]);
  assert.equal(late.errors.length, 0);
  const e2 = lint({ books: recapBooks, floors: [], entities: [{ ...recapEntity([{ at: '1:end', text: 'Xan.', confidence: 'draft' }]), revealedAt: '2:1',
    beats: [{ kind: 'arc', book: 2, at: '2:3', headline: 'h', text: 'Xan.', confidence: 'verified' }] }] });
  assert.ok(e2.errors.some(e => /recap 1: unseals at "1:end", before the entity itself/.test(e)), e2.errors.join('\n'));
  assert.ok(recapLint([{ at: '1:end', text: '', confidence: 'draft' }]).errors.some(e => /recap 1: no text/.test(e)));
  assert.ok(recapLint([{ at: '1:end', text: 'Xan.', confidence: 'maybe' }]).errors.some(e => /recap 1: confidence must be/.test(e)));
});

test('recap and gist text obey the forward rules, and a blank gist is an error', () => {
  const fwd = recapLint([{ at: '1:end', text: 'Xan arrives and later dies.', confidence: 'draft' }]);
  assert.ok(fwd.errors.some(e => /recap 1: "later" points past/.test(e)), fwd.errors.join('\n'));
  const gist = recapLint(undefined, [
    { kind: 'arc', book: 1, at: '1:3', headline: 'h', text: 'Xan arrives.', gist: 'Xan arrives, and ends up dead.', confidence: 'verified' },
  ]);
  assert.ok(gist.errors.some(e => /beat "h" gist: "ends up" points past/.test(e)), gist.errors.join('\n'));
  const blank = recapLint(undefined, [
    { kind: 'arc', book: 1, at: '1:3', headline: 'h', text: 'Xan arrives.', gist: '', confidence: 'verified' },
  ]);
  assert.ok(blank.errors.some(e => /beat "h" gist: empty/.test(e)), blank.errors.join('\n'));
});

test('draft recaps and draft gists are warnings, which is the work queue', () => {
  const { warnings } = recapLint([{ at: '1:end', text: 'Xan arrives.', confidence: 'draft' }], [
    { kind: 'arc', book: 1, at: '1:3', headline: 'h', text: 'Xan arrives.', gist: 'Xan arrives.', gistDraft: true, confidence: 'verified' },
  ]);
  assert.ok(warnings.some(w => w === 'draft recap — x: book 1'), warnings.join('\n'));
  assert.ok(warnings.some(w => w === 'draft gist — x: h'), warnings.join('\n'));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:gate 2>&1 | grep -E '^not ok|^# (pass|fail)'`
Expected: the five new tests fail (no recap errors are produced today).

- [ ] **Step 3: Implement the rules**

In `scripts/lib/lint.mjs`, after the taglines block (the `}` closing `if (!Array.isArray(taglines) …) else { … }`), add:

```js
    /* The recap: a paragraph per book, each telling that book only. A paragraph
       about a book is a summary of a span and unseals at the span's end, so
       `at` is always "N:end". A step for a book the entity has no beat in would
       be a paragraph written from nothing, and two steps for one book is a
       duplicated list. Steps are born draft; the warning is the work queue. */
    if (e.recap != null) {
      if (!Array.isArray(e.recap)) {
        errors.push(`${where}: recap must be a list of { at, text, confidence }`);
      } else {
        const beatBooks = new Set((e.beats ?? []).map(b => b.book));
        let prevBook = 0;
        e.recap.forEach((r, i) => {
          const rw = `${where} recap ${i + 1}`;
          const rAt = at(r.at, rw);
          if (rAt === null) return;
          if (rAt % 1000 !== 999) { errors.push(`${rw}: "${r.at}" is not a book's end — a recap is a summary of a span`); return; }
          const book = bookOf(rAt);
          if (book === prevBook) errors.push(`${rw}: a second step for book ${book}`);
          else if (book < prevBook) errors.push(`${rw}: book ${book} comes after book ${prevBook} in the list`);
          prevBook = Math.max(prevBook, book);
          if (!beatBooks.has(book)) errors.push(`${rw}: book ${book} has no beat of ${e.id} to recap`);
          if (rAt < entityAt) errors.push(`${rw}: unseals at "${r.at}", before the entity itself ("${e.revealedAt}")`);
          if (!r.text) errors.push(`${rw}: no text`);
          if (!VALID_CONFIDENCE.has(r.confidence ?? 'draft')) errors.push(`${rw}: confidence must be "verified" or "draft"`);
          checkForward(r.text, rAt, rw);
          if ((r.confidence ?? 'draft') === 'draft') warnings.push(`draft recap — ${e.id}: book ${book}`);
        });
      }
    }
```

In the beats loop, directly after `checkForward(b.text, beatAt, \`${bw}\`);`, add:

```js
      /* A gist is one sentence restating the beat, gated by the beat's own key.
         Its review state is its own: a drafted gist on a verified beat does not
         make the beat draft. */
      if (b.gist != null) {
        if (!b.gist.trim()) errors.push(`${bw} gist: empty`);
        else checkForward(b.gist, Math.max(beatAt, entityAt), `${bw} gist`);
        if (b.gistDraft) warnings.push(`draft gist — ${e.id}: ${b.headline}`);
      }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:gate 2>&1 | grep -E '^not ok|^# (pass|fail)'`
Expected: `# fail 0`.

- [ ] **Step 5: Run the lint over the real content**

Run: `npm run content:check 2>&1 | tail -3`
Expected: `OK — …` (no entity has a `recap` or `gist` yet, so nothing new fires).

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/lint.mjs scripts/test-gate.mjs
git commit -m "Lint: a recap step per book at the book's end, a gist per beat, both held to the forward rules"
```

---

### Task 2: Lint — the faithfulness rule

**Files:**
- Modify: `scripts/lib/lint.mjs` (new exported helpers above `lint()`; calls inside the recap block and the gist block from Task 1)
- Test: `scripts/test-gate.mjs`

**Interfaces:**
- Produces: `export function tokensOf(text): Set<string>` — whole-word tokens, split on anything that is not a letter, digit, apostrophe, comma-between-digits or period-between-digits; `export function faithfulness(text, sources): string[]` — the offending tokens (empty when faithful); `sources` is an array of strings.

- [ ] **Step 1: Write the failing tests**

```js
import { faithfulness, tokensOf } from './lib/lint.mjs';   // add to the existing import line

test('a text may name only what its sources name', () => {
  const src = ['The stairwell drops us into a sandstorm and an achievement. The Quarry pays 2,145 gold.', 'Every bounty on me, doubled'];
  assert.deepEqual(faithfulness('The stairwell drops them into a sandstorm; the Quarry pays 2,145 gold.', src), []);
  assert.deepEqual(faithfulness('Donut watches from the Quarry.', src), ['Donut']);
  assert.deepEqual(faithfulness('The Quarry pays 2145 gold.', src), ['2145']);
  assert.deepEqual(faithfulness('He wins 1.5 million.', src), ['1.5']);
});

test('a sentence-initial capital is not a name, and a possessive still counts as the name', () => {
  assert.deepEqual(faithfulness('Stairwells drop. Sandstorms follow.', ['the stairwell and the sandstorm']), []);
  assert.deepEqual(faithfulness("Carl finds Donut's biscuit.", ["Donut's biscuit is in Carl's pocket"]), []);
  assert.deepEqual(faithfulness('He meets Mordecai-the-guide.', ['Mordecai is the guide']), []);
  assert.ok(tokensOf("Donut's 2,145 Quarry-side").has('Donut'));
  assert.ok(tokensOf("Donut's 2,145 Quarry-side").has('2,145'));
  assert.ok(tokensOf("Donut's 2,145 Quarry-side").has('Quarry'));
});

test('the lint fails a recap or a gist that names what its sources do not', () => {
  const { errors } = lint({ books: recapBooks, floors: [], entities: [{
    ...recapEntity([{ at: '1:end', text: 'Xan arrives with Bea.', confidence: 'draft' }], [
      { kind: 'arc', book: 1, at: '1:3', headline: 'h', text: 'Xan arrives.', gist: 'Xan arrives at Meadow Lark.', confidence: 'verified' },
    ]),
  }] });
  assert.ok(errors.some(e => /recap 1: names "Bea", which none of its sources do/.test(e)), errors.join('\n'));
  assert.ok(errors.some(e => /beat "h" gist: names "Meadow", "Lark", which none of its sources do/.test(e)), errors.join('\n'));
});

test('a recap may draw on taglines and descriptions reached by its gate, and on the name and aliases', () => {
  const ent = {
    ...recapEntity([{ at: '1:end', text: 'Xan, the Coast Guard man, arrives.', confidence: 'draft' }]),
    aka: ['Xan the Bold'],
    tagline: [{ at: '1:1', text: 'A Coast Guard man.' }, { at: '2:end', text: 'A Navy man now.' }],
  };
  const ok = lint({ books: recapBooks, floors: [], entities: [ent] });
  assert.equal(ok.errors.filter(e => /none of its sources/.test(e)).length, 0, ok.errors.join('\n'));
  const bad = lint({ books: recapBooks, floors: [], entities: [{ ...ent, recap: [{ at: '1:end', text: 'Xan the Navy man arrives.', confidence: 'draft' }] }] });
  assert.ok(bad.errors.some(e => /recap 1: names "Navy"/.test(e)), 'a tagline past the step\'s gate is not a source');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:gate 2>&1 | grep -E '^not ok|^# (pass|fail)'`
Expected: fails — `faithfulness` is not exported.

- [ ] **Step 3: Implement**

Above `export function lint(…)` in `scripts/lib/lint.mjs`:

```js
/* Faithfulness. Model-drafted text enters a project where every sentence has
   been read against the book; the rule that makes that tolerable is that a
   text may name only what its sources name. A token is a run of letters,
   digits, apostrophes, and the commas or periods inside a number ("2,145",
   "1.5"); a possessive drops its 's so "Donut's" names Donut. A capitalised
   word at the start of a sentence is English, not a name, and is skipped.
   Like the forward-phrase rule this flags honest sentences now and then, and
   like it has no exemption list: the sentence is reworded instead. */
const TOKEN = /[\p{L}\p{N}]+(?:[,.](?=\p{N})[\p{N}]+)*(?:'s)?/gu;

export function tokensOf(text) {
  const out = new Set();
  for (const m of (text ?? '').matchAll(TOKEN)) out.add(m[0].replace(/'s$/, ''));
  return out;
}

export function faithfulness(text, sources) {
  const have = new Set();
  for (const s of sources) for (const t of tokensOf(s)) have.add(t);
  const offending = [];
  const sentences = (text ?? '').split(/(?<=[.!?…])\s+/);
  for (const sentence of sentences) {
    let first = true;
    for (const m of sentence.matchAll(TOKEN)) {
      const tok = m[0].replace(/'s$/, '');
      const checked = /\p{N}/u.test(tok) || (!first && /^\p{Lu}/u.test(tok));
      first = false;
      if (checked && !have.has(tok) && !offending.includes(tok)) offending.push(tok);
    }
  }
  return offending;
}
```

Inside the recap block from Task 1, after `checkForward(r.text, rAt, rw);`:

```js
          const sources = [
            e.name, ...aliasesOf(e).map(a => a.name),
            ...(e.beats ?? []).filter(b => b.book === book).flatMap(b => [b.headline, b.text]),
            ...taglines.filter(t => (at(t.at, rw) ?? Infinity) <= rAt).map(t => t.text),
            ...descriptions.filter(d => (at(d.at, rw) ?? Infinity) <= rAt).map(d => d.text),
          ];
          const off = faithfulness(r.text, sources);
          if (off.length) errors.push(`${rw}: names ${off.map(t => `"${t}"`).join(', ')}, which none of its sources do`);
```

(`taglines` and `descriptions` are the normalised lists the surrounding code already built; the recap block must sit after both.)

Inside the gist block, after the `checkForward` for the gist:

```js
        const off = faithfulness(b.gist, [e.name, ...aliasesOf(e).map(a => a.name), b.headline, b.text]);
        if (off.length) errors.push(`${bw} gist: names ${off.map(t => `"${t}"`).join(', ')}, which none of its sources do`);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:gate 2>&1 | grep -E '^not ok|^# (pass|fail)'`
Expected: `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/lint.mjs scripts/test-gate.mjs
git commit -m "Lint: faithfulness — a recap or a gist may name only what its sources name"
```

---

### Task 3: Build, snapshot, schema

**Files:**
- Modify: `scripts/build-content.mjs:80-97`
- Modify: `db/config.ts` (Entity and Beat tables)
- Modify: `scripts/check-facts.mjs:146-147` (recap and gist units)
- Test: `scripts/test-gate.mjs` (the snapshot's shape, read from disk)

**Interfaces:**
- Produces, in the snapshot: `entities[].recap: [{ at, sortKey, text, confidence }]` (always an array, possibly empty); `beats[].gist: string | null`; `beats[].gistDraft: boolean`.
- DB: `Entity.recap` json default `[]`; `Beat.gist` text optional; `Beat.gistDraft` boolean default `false`.

- [ ] **Step 1: Write the failing test**

```js
import { readFileSync } from 'node:fs';   // add if not already imported

test('the snapshot carries recap steps and gists in resolved form', () => {
  const snap = JSON.parse(readFileSync(new URL('../data/content.snapshot.json', import.meta.url), 'utf8'));
  for (const e of snap.entities) {
    assert.ok(Array.isArray(e.recap), `${e.id}: recap is a list`);
    for (const r of e.recap) {
      assert.equal(typeof r.sortKey, 'number');
      assert.equal(r.sortKey % 1000, 999, `${e.id}: a recap step sits at a book's end`);
      assert.ok(['verified', 'draft'].includes(r.confidence));
    }
  }
  for (const b of snap.beats) {
    assert.ok('gist' in b && 'gistDraft' in b, `${b.entityId} "${b.headline}": gist fields present`);
    assert.equal(typeof b.gistDraft, 'boolean');
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:gate 2>&1 | grep -E '^not ok|^# (pass|fail)'`
Expected: fails — `recap is a list`.

- [ ] **Step 3: Implement the build**

In `scripts/build-content.mjs`, in the entity loop before `resolvedEntities.push`, add:

```js
  /* The recap: one paragraph per book, each unsealing at that book's end. The
     lint has already pinned the shape; this only resolves the key. */
  const recap = (e.recap ?? []).map(r => ({
    at: r.at, sortKey: Math.max(parseAt(r.at), entityAt), text: r.text, confidence: r.confidence ?? 'draft',
  }));
```

and add `recap,` to the pushed object (after `descriptions`). In `resolvedBeats.push`, after `voice: beatVoice(e, b),` add:

```js
      // One sentence restating the beat, gated by the beat's own key. Its review state is its own.
      gist: b.gist ?? null, gistDraft: !!b.gistDraft,
```

Extend the summary line so the work queue is visible:

```js
const recapSteps = resolvedEntities.reduce((n, e) => n + e.recap.length, 0);
const recapDrafts = resolvedEntities.reduce((n, e) => n + e.recap.filter(r => r.confidence === 'draft').length, 0);
const gists = resolvedBeats.filter(b => b.gist).length;
const gistDrafts = resolvedBeats.filter(b => b.gistDraft).length;
```

and append to `summary`: `` ` · ${recapSteps} recap steps (${recapDrafts} draft) · ${gists} gists (${gistDrafts} draft)` ``.

- [ ] **Step 4: Add the columns**

In `db/config.ts`, in `Entity.columns` after `descriptions`:

```ts
    /* The recap: one paragraph per book the entity has a beat in, each telling
       that book only and unsealing at its end — a summary of a span, gated at
       the end of the span. [{ at, sortKey, text, confidence }], ascending. */
    recap: column.json({ default: [] }),
```

In `Beat.columns` after `voice`:

```ts
    /* One sentence restating the beat in the narrator's third person, gated by
       the beat's own sortKey. gistDraft is its own review state: a drafted gist
       on a verified beat does not make the beat draft. */
    gist: column.text({ optional: true }),
    gistDraft: column.boolean({ default: false }),
```

- [ ] **Step 5: `check-facts` reads the new text**

In `scripts/check-facts.mjs` directly after the tagline `units.push` lines (~147), add:

```js
  (e.recap ?? []).forEach((r, i) => units.push({ id: e.id, where: `recap ${i + 1}`, gate: parseAt(r.at), text: r.text }));
```

and inside its beats loop, where a beat's text becomes a unit, add beside it:

```js
    if (b.gist) units.push({ id: e.id, where: `gist "${b.headline}"`, gate: max(b.at, e.revealedAt), text: b.gist });
```

(Use the same `gate` expression the beat unit beside it uses.)

- [ ] **Step 6: Rebuild, test, type-check, build**

Run:
```bash
npm run content:build 2>&1 | tail -2
npm run test:gate 2>&1 | grep -E '^not ok|^# (pass|fail)'
npm run check 2>&1 | grep -E 'errors|error' | head -2
ASTRO_DATABASE_FILE=./.astro/build.db npm run build 2>&1 | tail -2
```
Expected: the snapshot is rewritten with `recap: []` on every entity and `gist: null, gistDraft: false` on every beat; `# fail 0`; `0 errors`; the build completes (the seed inserts the new columns).

- [ ] **Step 7: Commit**

```bash
git add scripts/build-content.mjs db/config.ts scripts/check-facts.mjs scripts/test-gate.mjs data/content.snapshot.json
git commit -m "Build: recap steps and gists resolved into the snapshot and seeded into two new columns"
```

---

### Task 4: `storySoFar()` — the one composition rule

**Files:**
- Create: `src/lib/story.ts`
- Modify: `src/lib/content.ts` (after `taglineFor`)
- Test: `scripts/test-gate.mjs`

**Interfaces:**
- Produces:

```ts
export interface RecapStep { sortKey: number; text: string; confidence: string }
export interface StoryBeat { sortKey: number; book: number; chapter: number | null; headline: string; gist: string | null; gistDraft?: boolean }
export interface StorySoFar {
  books: { book: number; text: string; draft: boolean }[];
  current: { book: number; lines: { chapter: number | null; text: string; draft: boolean }[]; earlier: number; thisChapter: number } | null;
  sealed: { count: number; nextKey: number } | null;
}
export function storySoFar(recap: RecapStep[], beats: StoryBeat[], frontier: number, opts?: { cut?: number; max?: number }): StorySoFar
```
  `cut` defaults to `frontier`; `max` to 8. `books` are the steps with `sortKey <= frontier`, in order. `current` is non-null when `frontier` is inside a book (`frontier % 1000` is neither 0 nor 999) **and** that book has no recap step reached; its `lines` are that book's beats with `sortKey <= cut`, text = `gist ?? headline`, `draft = !!gistDraft`, the last `max` kept and the rest counted in `earlier`; `thisChapter` counts that book's beats with `cut < sortKey <= frontier`. `sealed` counts beats with `sortKey > frontier` and names the smallest such key; null when none.
- `content.ts`: `export function recapSteps(entity: EntityRow): RecapStep[]` returning `entity.recap ?? []` typed — the page calls `storySoFar(recapSteps(entity), beats, gate.frontier)`.

- [ ] **Step 1: Write the failing tests**

```js
import { storySoFar } from '../src/lib/story.ts';   // add to the imports

const steps = [{ sortKey: 1999, text: 'Book one.', confidence: 'verified' }, { sortKey: 3999, text: 'Book three.', confidence: 'draft' }];
const sbeat = (sortKey, headline, gist) => ({ sortKey, book: Math.floor(sortKey / 1000), chapter: sortKey % 1000, headline, gist: gist ?? null });
const sbeats = [sbeat(1003, 'h1', 'Gist one.'), sbeat(3002, 'h3'), sbeat(4001, 'h4a', 'Four a.'), sbeat(4002, 'h4b', 'Four b.'),
  sbeat(4005, 'h4e', 'Four e.'), sbeat(4006, 'h4f', 'Four f.'), sbeat(4009, 'h4i', 'Four i.')];

test('storySoFar lists every reached book paragraph and the current book to the cut', () => {
  const s = storySoFar(steps, sbeats, 4006, { cut: 4005 });
  assert.deepEqual(s.books.map(b => b.book), [1, 3]);
  assert.equal(s.books[1].draft, true);
  assert.equal(s.current.book, 4);
  assert.deepEqual(s.current.lines.map(l => l.text), ['Four a.', 'Four b.', 'Four e.']);
  assert.equal(s.current.thisChapter, 1, 'the beat at 4:6 is counted, not shown');
  assert.deepEqual(s.sealed, { count: 1, nextKey: 4009 });
});

test('on the site the cut is the frontier, so the current chapter is listed and nothing is counted', () => {
  const s = storySoFar(steps, sbeats, 4006);
  assert.deepEqual(s.current.lines.map(l => l.text), ['Four a.', 'Four b.', 'Four e.', 'Four f.']);
  assert.equal(s.current.thisChapter, 0);
});

test('a finished book has its paragraph and no current list; a reader before any recap gets lines only', () => {
  const done = storySoFar(steps, sbeats, 3999);
  assert.deepEqual(done.books.map(b => b.book), [1, 3]);
  assert.equal(done.current, null);
  const early = storySoFar(steps, sbeats, 1005);
  assert.deepEqual(early.books, []);
  assert.deepEqual(early.current.lines.map(l => l.text), ['Gist one.']);
});

test('a beat with no gist is listed by its headline, and long lists fold', () => {
  const s = storySoFar([], sbeats, 3002);
  assert.deepEqual(s.current.lines.map(l => l.text), ['h3']);
  const many = Array.from({ length: 12 }, (_, i) => sbeat(5001 + i, `h${i}`, `g${i}`));
  const folded = storySoFar([], many, 5020, { max: 8 });
  assert.equal(folded.current.lines.length, 8);
  assert.equal(folded.current.earlier, 4);
  assert.equal(folded.current.lines[0].text, 'g4');
});

test('a current book with no beat yet is an empty list, not nothing', () => {
  const s = storySoFar(steps, [sbeat(1003, 'h1', 'g'), sbeat(4009, 'h4i', 'g')], 4001);
  assert.deepEqual(s.current, { book: 4, lines: [], earlier: 0, thisChapter: 0 });
  assert.deepEqual(s.sealed, { count: 1, nextKey: 4009 });
});

test('no position means no story', () => {
  const s = storySoFar(steps, sbeats, 0);
  assert.deepEqual(s.books, []);
  assert.equal(s.current, null);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run test:gate 2>&1 | grep -E '^not ok|^# (pass|fail)|Cannot find'`
Expected: fails — module not found.

- [ ] **Step 3: Implement `src/lib/story.ts`**

```ts
/* The story so far, composed from what the reader has reached: one paragraph
   per finished book (the entity's recap steps), then the current book as one
   line per beat up to a cut. This is the only place that composition lives;
   cc_gate.lua in the KOReader plugin is a pure copy, held to the same cases. */
import { CHAPTER_STRIDE, END_OF_BOOK, FRONTIER_NONE } from './progress.ts';

export interface RecapStep { sortKey: number; text: string; confidence: string }
export interface StoryBeat {
  sortKey: number; book: number; chapter: number | null; headline: string; gist: string | null; gistDraft?: boolean;
}
export interface StoryLine { chapter: number | null; text: string; draft: boolean }
export interface StorySoFar {
  books: { book: number; text: string; draft: boolean }[];
  current: { book: number; lines: StoryLine[]; earlier: number; thisChapter: number } | null;
  sealed: { count: number; nextKey: number } | null;
}

export const STORY_LINES = 8;

export function storySoFar(
  recap: RecapStep[], beats: StoryBeat[], frontier: number,
  { cut = frontier, max = STORY_LINES }: { cut?: number; max?: number } = {},
): StorySoFar {
  if (frontier <= FRONTIER_NONE) return { books: [], current: null, sealed: beats.length ? sealedOf(beats, frontier) : null };

  const books = recap.filter(r => r.sortKey <= frontier)
    .map(r => ({ book: Math.floor(r.sortKey / CHAPTER_STRIDE), text: r.text, draft: r.confidence !== 'verified' }));

  /* The current book: the frontier is inside it (not at its start, not past
     its end) and its own paragraph is not reached — a finished book is told by
     its paragraph, not its list. */
  const chapter = frontier % CHAPTER_STRIDE;
  const book = Math.floor(frontier / CHAPTER_STRIDE);
  let current: StorySoFar['current'] = null;
  if (chapter !== 0 && chapter !== END_OF_BOOK && !books.some(b => b.book === book)) {
    const inBook = beats.filter(b => b.book === book);
    const reached = inBook.filter(b => b.sortKey <= cut);
    const lines = reached.slice(Math.max(0, reached.length - max))
      .map(b => ({ chapter: b.chapter, text: b.gist ?? b.headline, draft: !!b.gistDraft }));
    current = {
      book, lines, earlier: reached.length - lines.length,
      thisChapter: inBook.filter(b => b.sortKey > cut && b.sortKey <= frontier).length,
    };
  }

  return { books, current, sealed: sealedOf(beats, frontier) };
}

function sealedOf(beats: StoryBeat[], frontier: number) {
  const hidden = beats.filter(b => b.sortKey > frontier);
  return hidden.length ? { count: hidden.length, nextKey: Math.min(...hidden.map(b => b.sortKey)) } : null;
}
```

Then in `src/lib/content.ts`, after `taglineFor`:

```ts
import type { RecapStep } from './story';

/** The recap steps as the snapshot resolved them; storySoFar() picks the reached ones. */
export function recapSteps(entity: EntityRow): RecapStep[] {
  return ((entity as { recap?: RecapStep[] }).recap ?? []) as RecapStep[];
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:gate 2>&1 | grep -E '^not ok|^# (pass|fail)'`
Expected: `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/story.ts src/lib/content.ts scripts/test-gate.mjs
git commit -m "storySoFar: one composition rule for the paragraphs reached and the current book to a cut"
```

---

### Task 5: The entity page's **So far** block

**Files:**
- Modify: `src/pages/entity/[id].astro` (frontmatter after `const description = …`; markup between the description section and the `booknav`)
- Modify: `scripts/smoke.mjs` (one marker on an entity route)

**Interfaces:**
- Consumes: `storySoFar(recapSteps(entity), beats, gate.frontier)` from Task 4; `stampOf` from `src/lib/stamps.ts`.

- [ ] **Step 1: Add the smoke assertion first**

In `scripts/smoke.mjs`, find the entity route entry (the one fetching `/entity/carl`) and add the marker `'class="sofar"'` to its expected markers. Run `npm run dev` in one terminal and `npm run smoke` in another: the entity route fails on the missing marker. (If no entity route exists, add `['/entity/carl', ['class="sofar"', 'Story so far']]` beside the others; the smoke cookie is a late position, so Carl's current book list has lines.)

- [ ] **Step 2: Frontmatter**

After `const description = descriptionFor(entity, gate);`:

```ts
import { storySoFar } from '../../lib/story';
import { recapSteps } from '../../lib/content';   // add to the existing content import list instead

/* The story so far: a paragraph per finished book, then the current book one
   line per beat. Composed by the same rule the KOReader plugin uses. The
   `use` beats of an item are its log, not its story, so they are left out. */
const soFar = storySoFar(recapSteps(entity), story.map(b => ({
  sortKey: b.sortKey, book: b.book, chapter: b.chapter, headline: b.headline,
  gist: (b as { gist?: string | null }).gist ?? null, gistDraft: (b as { gistDraft?: boolean }).gistDraft,
})), gate.frontier);
const hasSoFar = soFar.books.length > 0 || (soFar.current?.lines.length ?? 0) > 0;
```

- [ ] **Step 3: Markup**

Between the `{description && (…)}` section and `{filterable && (…)}`:

```astro
        {hasSoFar && (
          <section class="sofar">
            <h2 class="sect">So far</h2>
            {soFar.books.map(b => (
              <div class="sofar-book">
                <p class="label">Book {b.book}{b.draft && <span class="draft">unverified</span>}</p>
                <p>{b.text}</p>
              </div>
            ))}
            {soFar.current && soFar.current.lines.length > 0 && (
              <div class="sofar-book">
                <p class="label">Book {soFar.current.book} · so far</p>
                {soFar.current.earlier > 0 && <p class="sofar-more">… {soFar.current.earlier} earlier this book</p>}
                <ul class="sofar-lines">
                  {soFar.current.lines.map(l => (
                    <li><span class="stamp">Ch {l.chapter ?? '—'}</span> {l.text}{l.draft && <span class="draft">unverified</span>}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
```

Styles, in the page's `<style>` block (the page's own rhythm; `.label`, `.stamp`, `.draft` are component-layer classes):

```css
  .sofar-book + .sofar-book { margin-top: 14px; }
  .sofar-book p { margin: 4px 0 0; font-size: var(--type-body); line-height: 1.5; }
  .sofar-lines { list-style: none; margin: 4px 0 0; padding: 0; }
  .sofar-lines li { font-size: var(--type-meta); line-height: 1.5; padding: 3px 0; border-top: 1px solid var(--color-line); }
  .sofar-lines .stamp { margin-right: 8px; }
  .sofar-more { font-size: var(--type-meta); color: var(--color-dim); }
```

(Check the token names against `src/styles/global.css`; use the ones that exist — `--color-dim` may be `--color-muted`.)

- [ ] **Step 4: Verify**

```bash
npm run check 2>&1 | grep -E '^- [0-9]+ errors'
npm run content:check 2>&1 | grep -E 'OK — no gated name'
ASTRO_DATABASE_FILE=./.astro/build.db npm run build 2>&1 | tail -1
ASTRO_DATABASE_FILE=./.astro/build.db PORT=4360 node dist/server/entry.mjs &
npm run smoke -- --base=http://127.0.0.1:4360
kill %1
```
Expected: `0 errors`; `check-pages` still OK (no names in the static copy); all smoke routes pass, including the `sofar` marker. Open `/entity/carl` with a `dcc_pos` of book 4 chapter 6 in a browser: the block shows "Book 4 · so far" with headline lines (no gists yet) and no paragraphs (no recaps yet).

- [ ] **Step 5: Commit**

```bash
git add src/pages/entity/\[id\].astro scripts/smoke.mjs
git commit -m "Entity page: the story so far, a paragraph per book and the current book one line per beat"
```

---

### Task 6: The drafting library — prompts, screening, write-back

**Files:**
- Create: `scripts/lib/ollama.mjs`
- Create: `scripts/lib/recaps.mjs`
- Create: `scripts/test-recaps.mjs`
- Modify: `package.json` (`test:gate` gains `scripts/test-recaps.mjs`)

**Interfaces:**
- `scripts/lib/ollama.mjs`: `export async function ask(messages, { model, host, key } = {})` → the reply string; reads `.env` the way `fetch-books.mjs` does (copy its `env()` into this module as `readEnv(root)`); throws `Error('OLLAMA_API_KEY is not set')` without a key.
- `scripts/lib/recaps.mjs`:
  - `export function unwrap(raw): string` — strips a fenced block, surrounding quotes, leading "Recap:"/"Gist:" labels, collapses whitespace.
  - `export function recapWork(entities): { entity, book, beats }[]` — every (entity, book) with a beat and no `recap` step for that book.
  - `export function gistWork(entities): { entity, beat }[]` — every beat with no `gist`.
  - `export function recapMessages(entity, book, beats): Message[]` and `export function gistMessages(entity, beat): Message[]` — the chat messages, with the worked examples in an assistant turn.
  - `export function screenRecap(text, entity, book, books): string[]` and `export function screenGist(text, entity, beat): string[]` — the problems (empty when clean), built from the lint: run `lint({ books, floors: [], entities: [candidate] })` on a copy of the entity with the step/gist inserted and return the errors mentioning that recap/gist; plus a word-count check (`> 80` / `> 18` words → `"too long: N words"`).
  - `export async function draftOne(messages, screen, askFn, tries = 3): Promise<{ text, problems } >` — ask, unwrap, screen; on problems, append `{ role: 'user', content: 'Not acceptable: <problems>. Write it again.' }` and retry; after `tries`, return the last text with its problems.
  - `export function applyRecap(entity, book, text)` — inserts `{ at: \`${book}:end\`, text, confidence: 'draft' }` into `entity.recap` in book order; `export function applyGist(beat, text)` sets `beat.gist = text; beat.gistDraft = true`.

- [ ] **Step 1: Write the failing tests** — `scripts/test-recaps.mjs`

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { unwrap, recapWork, gistWork, recapMessages, gistMessages, screenRecap, screenGist, draftOne, applyRecap, applyGist } from './lib/recaps.mjs';

const books = [{ id: 1, title: 'One', chapters: 47 }, { id: 2, title: 'Two', chapters: 25 }];
const xan = () => ({
  id: 'xan', kind: 'character', name: 'Xan', aka: [], role: 'Crawler', revealedAt: '1:1', tagline: 'A crawler.', voice: 'system',
  beats: [
    { kind: 'arc', book: 1, at: '1:3', headline: 'Down the stairs', text: 'Xan takes the stairs with Bea and finds a Boon Box.', confidence: 'verified' },
    { kind: 'arc', book: 2, at: '2:4', headline: 'The second floor', text: 'Xan reaches the Over City.', confidence: 'verified', gist: 'Xan reaches the Over City.' },
  ],
});

test('unwrap strips fences, quotes and labels', () => {
  assert.equal(unwrap('```\nXan descends.\n```'), 'Xan descends.');
  assert.equal(unwrap('"Xan descends."'), 'Xan descends.');
  assert.equal(unwrap('Recap: Xan  descends.\n'), 'Xan descends.');
});

test('the work lists name what is missing and nothing else', () => {
  const e = xan();
  assert.deepEqual(recapWork([e]).map(w => w.book), [1, 2]);
  e.recap = [{ at: '1:end', text: 'done', confidence: 'draft' }];
  assert.deepEqual(recapWork([e]).map(w => w.book), [2]);
  assert.deepEqual(gistWork([e]).map(w => w.beat.headline), ['Down the stairs']);
});

test('the messages carry the voice by example, the rules, and the beats', () => {
  const m = recapMessages(xan(), 1, xan().beats.filter(b => b.book === 1));
  assert.equal(m[0].role, 'system');
  assert.ok(m.some(x => x.role === 'assistant'), 'worked examples in the assistant turn');
  const user = m[m.length - 1];
  assert.equal(user.role, 'user');
  assert.match(user.content, /Xan/);
  assert.match(user.content, /Down the stairs/);
  assert.match(user.content, /Boon Box/);
  assert.doesNotMatch(user.content, /Over City/, 'only this book\'s beats');
  const g = gistMessages(xan(), xan().beats[0]);
  assert.match(g[g.length - 1].content, /Boon Box/);
});

test('screening uses the lint: faithfulness, forward phrases, and the length cap', () => {
  const e = xan();
  assert.deepEqual(screenRecap('Xan takes the stairs with Bea and finds a Boon Box.', e, 1, books), []);
  assert.ok(screenRecap('Xan takes the stairs with Donut.', e, 1, books).some(p => /"Donut"/.test(p)));
  assert.ok(screenRecap('Xan takes the stairs and later dies.', e, 1, books).some(p => /"later"/.test(p)));
  assert.ok(screenRecap(Array(81).fill('word').join(' '), e, 1, books).some(p => /too long: 81 words/.test(p)));
  assert.deepEqual(screenGist('Xan finds a Boon Box.', e, e.beats[0]), []);
  assert.ok(screenGist('Xan finds a Celestial Box.', e, e.beats[0]).some(p => /"Celestial"/.test(p)));
  assert.ok(screenGist(Array(19).fill('w').join(' '), e, e.beats[0]).some(p => /too long: 19 words/.test(p)));
});

test('draftOne retries with the problems named and gives up after three', async () => {
  const seen = [];
  const answers = ['"Xan meets Donut."', 'Xan takes the stairs with Bea.'];
  const fakeAsk = async msgs => { seen.push(msgs[msgs.length - 1].content); return answers.shift(); };
  const e = xan();
  const r = await draftOne(recapMessages(e, 1, e.beats.slice(0, 1)), t => screenRecap(t, e, 1, books), fakeAsk);
  assert.equal(r.text, 'Xan takes the stairs with Bea.');
  assert.deepEqual(r.problems, []);
  assert.match(seen[1], /Not acceptable: .*"Donut"/);
  const stubborn = await draftOne([{ role: 'user', content: 'x' }], () => ['bad'], async () => 'nope', 3);
  assert.deepEqual(stubborn.problems, ['bad']);
});

test('applyRecap keeps book order and applyGist marks the gist draft', () => {
  const e = xan();
  applyRecap(e, 2, 'Two.');
  applyRecap(e, 1, 'One.');
  assert.deepEqual(e.recap.map(r => r.at), ['1:end', '2:end']);
  assert.equal(e.recap[0].confidence, 'draft');
  applyGist(e.beats[0], 'Xan finds a Boon Box.');
  assert.equal(e.beats[0].gist, 'Xan finds a Boon Box.');
  assert.equal(e.beats[0].gistDraft, true);
});
```

Add the file to `test:gate` in `package.json`:

```json
"test:gate": "node --disable-warning=ExperimentalWarning --experimental-strip-types --test scripts/test-gate.mjs scripts/test-export-koreader.mjs scripts/test-export-app.mjs scripts/test-recaps.mjs",
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:gate 2>&1 | grep -E '^not ok|^# (pass|fail)|Cannot find'`
Expected: module not found.

- [ ] **Step 3: Implement `scripts/lib/ollama.mjs`**

```js
/* One call to Ollama's chat endpoint, the way src/lib/achievement.ts makes it:
   a fetch, no SDK. The key comes from .env (gitignored) or the environment. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function readEnv(root) {
  const e = { ...process.env };
  const p = join(root, '.env');
  if (existsSync(p)) for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !(m[1] in e)) e[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return e;
}

export async function ask(messages, { model, host, key } = {}) {
  if (!key) throw new Error('OLLAMA_API_KEY is not set — put it in .env (it is in /etc/dcc-companion.env on the box)');
  const res = await fetch(`${host ?? 'https://ollama.com'}/api/chat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model ?? 'gemma4:31b', stream: false, think: false,
      options: { temperature: 0.7, top_p: 0.9 },
      messages,
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  return body?.message?.content ?? '';
}
```

- [ ] **Step 4: Implement `scripts/lib/recaps.mjs`**

```js
/* The drafting library: what the model is asked, how its answer is checked,
   and how a clean answer is written into the curation files. Pure — the CLIs
   in draft-recaps.mjs and draft-gists.mjs wire it to the network and the disk,
   and test-recaps.mjs drives it with a fake ask(). The screens are the lint's
   own rules, not a copy: a candidate is linted as the entity it would join. */
import { lint } from './lint.mjs';

export const RECAP_WORDS = 80;
export const GIST_WORDS = 18;

const RULES = `You write for a reader's companion to Dungeon Crawler Carl. Rules, all of them:
- The narrator's voice: third person, present tense, plain and dry. Never first person, even when the notes are.
- Name only people, places, things and numbers that the notes name. Invent nothing. Add nothing you merely remember about these books.
- Never write "book", "the series", "chapter", "later", "eventually", "ends up", "in the end", "the reader", or any phrase that points past the notes.
- Never mention floors by name unless the notes do.
- No preamble, no title, no quotation marks, no markdown. The paragraph or sentence alone.`;

const RECAP_EXAMPLES = `Notes for Carl, one stretch:
1:1 "Pink Crocs" — I'm Carl. My ex's cat gets out and I go after her in Bea's Crocs. The sky opens and everyone inside dies.
1:2 "Down the stairs" — Donut and I take the stairs. A box. A guide named Mordecai who smells of whisky.

Carl follows his ex-girlfriend's cat Donut into the freezing night in a pair of pink Crocs, and the collapse of every building on Earth leaves the two of them alive on the stairs down. A guide named Mordecai, smelling of whisky, meets them at the bottom with a box.

Notes for the Enhanced Pet Biscuit, one stretch:
1:5 "A biscuit for a cat" — Mordecai says even a bronze one beats a plain gold box. Donut eats it and starts to talk.

Mordecai rates even a bronze biscuit above a plain gold box. Donut eats one and begins to talk.`;

const GIST_EXAMPLES = `Note: 1:2 "Down the stairs" — Donut and I take the stairs. A box. A guide named Mordecai who smells of whisky.
Carl and Donut take the stairs and meet Mordecai, a whisky-smelling guide, beside a box.

Note: 4:1 "Every bounty on me, doubled" — The stairwell drops us into a sandstorm and an achievement. The Quarry is open.
The stairwell drops them into a sandstorm; the Quarry opens and every bounty on Carl doubles.`;

const beatLine = b => `${b.at} "${b.headline}" — ${b.text}`;
const who = e => `${e.name}${e.aka?.length ? ` (also ${e.aka.map(a => typeof a === 'string' ? a : a.name).join(', ')})` : ''}, ${e.kind}${e.role ? `, ${e.role}` : ''}`;

export function recapMessages(entity, book, beats) {
  return [
    { role: 'system', content: `${RULES}\n- A recap is 2 to 4 sentences, at most ${RECAP_WORDS} words, telling only what these notes tell.` },
    { role: 'user', content: 'Two examples, then mine.' },
    { role: 'assistant', content: RECAP_EXAMPLES },
    { role: 'user', content: `Notes for ${who(entity)}, one stretch:\n${beats.map(beatLine).join('\n')}\n\nThe recap:` },
  ];
}

export function gistMessages(entity, beat) {
  return [
    { role: 'system', content: `${RULES}\n- A gist is one sentence, at most ${GIST_WORDS} words, restating the note.` },
    { role: 'user', content: 'Two examples, then mine.' },
    { role: 'assistant', content: GIST_EXAMPLES },
    { role: 'user', content: `Note for ${who(entity)}: ${beatLine(beat)}\nThe gist:` },
  ];
}

export function unwrap(raw) {
  let t = (raw ?? '').trim();
  t = t.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
  t = t.replace(/^(recap|gist|summary)\s*:\s*/i, '');
  t = t.replace(/^["“'‘]+|["”'’]+$/g, '');
  return t.replace(/\s+/g, ' ').trim();
}

const words = t => t.split(/\s+/).filter(Boolean).length;
const clone = x => JSON.parse(JSON.stringify(x));

export function screenRecap(text, entity, book, books) {
  const e = clone(entity);
  e.recap = [...(e.recap ?? []).filter(r => !r.at.startsWith(`${book}:`)), { at: `${book}:end`, text, confidence: 'draft' }]
    .sort((a, b) => parseInt(a.at) - parseInt(b.at));
  const idx = e.recap.findIndex(r => r.at === `${book}:end`) + 1;
  const { errors } = lint({ books, floors: [], entities: [e] });
  const problems = errors.filter(m => m.includes(`recap ${idx}:`)).map(m => m.split(`recap ${idx}: `)[1] ?? m);
  if (words(text) > RECAP_WORDS) problems.push(`too long: ${words(text)} words`);
  if (!text) problems.push('empty');
  return problems;
}

export function screenGist(text, entity, beat, books = [{ id: beat.book, title: '', chapters: null }]) {
  const e = clone(entity);
  const b = e.beats.find(x => x.headline === beat.headline && x.at === beat.at);
  b.gist = text;
  const { errors } = lint({ books, floors: [], entities: [e] });
  const problems = errors.filter(m => m.includes(`beat "${beat.headline}" gist:`)).map(m => m.split(' gist: ')[1] ?? m);
  if (words(text) > GIST_WORDS) problems.push(`too long: ${words(text)} words`);
  return problems;
}

export async function draftOne(messages, screen, askFn, tries = 3) {
  let msgs = [...messages];
  let text = '', problems = [];
  for (let i = 0; i < tries; i++) {
    text = unwrap(await askFn(msgs));
    problems = screen(text);
    if (!problems.length) return { text, problems };
    msgs = [...msgs, { role: 'assistant', content: text }, { role: 'user', content: `Not acceptable: ${problems.join('; ')}. Write it again, obeying every rule.` }];
  }
  return { text, problems };
}

export function recapWork(entities) {
  const out = [];
  for (const e of entities) {
    const have = new Set((e.recap ?? []).map(r => parseInt(r.at)));
    const byBook = new Map();
    for (const b of e.beats ?? []) (byBook.get(b.book) ?? byBook.set(b.book, []).get(b.book)).push(b);
    for (const book of [...byBook.keys()].sort((a, b) => a - b)) if (!have.has(book)) out.push({ entity: e, book, beats: byBook.get(book) });
  }
  return out;
}

export function gistWork(entities) {
  return entities.flatMap(e => (e.beats ?? []).filter(b => b.gist == null).map(beat => ({ entity: e, beat })));
}

export function applyRecap(entity, book, text) {
  entity.recap = [...(entity.recap ?? []).filter(r => parseInt(r.at) !== book), { at: `${book}:end`, text, confidence: 'draft' }]
    .sort((a, b) => parseInt(a.at) - parseInt(b.at));
}

export function applyGist(beat, text) {
  beat.gist = text;
  beat.gistDraft = true;
}
```

Note for `screenGist`: the lint also needs the book to exist for the beat's `book` check; the default `books` argument supplies it. The CLI passes the real `books` from `data/books.json` merged with chapter counts the way `build-content.mjs` does — the CLI (Task 7) imports that merge.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test:gate 2>&1 | grep -E '^not ok|^# (pass|fail)'`
Expected: `# fail 0`. If `screenRecap` passes nothing through because the lint's message prefix differs, fix the prefix in `recaps.mjs` to match Task 1's strings exactly (`entity x recap 1: …`).

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/ollama.mjs scripts/lib/recaps.mjs scripts/test-recaps.mjs package.json
git commit -m "Drafting library: the prompts by example, the lint as the screen, three tries, write-back as draft"
```

---

### Task 7: The two CLIs

**Files:**
- Create: `scripts/draft-recaps.mjs`
- Create: `scripts/draft-gists.mjs`
- Modify: `scripts/build-content.mjs:17-28` — extract the books-with-chapters merge into `scripts/lib/books.mjs` as `export function loadBooks(root)` and import it back
- Modify: `package.json` scripts: `"recaps:draft": "node scripts/draft-recaps.mjs"`, `"gists:draft": "node scripts/draft-gists.mjs"`

**Interfaces:**
- Consumes everything from Task 6. Both CLIs take `--entity <id>`, `--book <n>`, `--redo`, `--limit <n>` (stop after n drafts, for a trial run), `--dry` (print the work list and exit).
- Writes `data/entities/<file>.json` with `JSON.stringify(data, null, 2) + '\n'` — the files round-trip byte-identically through that, verified.

- [ ] **Step 1: Extract `loadBooks`**

Create `scripts/lib/books.mjs`:

```js
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* books.json plus the chapter counts from chapters.json and the colours from
   book-colors.json — the merge build-content.mjs always did, lifted out so the
   drafting scripts lint against the same books the build does. */
export function loadBooks(root) {
  const read = p => JSON.parse(readFileSync(join(root, p), 'utf8'));
  const { books, floors } = read('data/books.json');
  const chapterIndex = new Map(read('data/chapters.json').books.map(b => [b.book, b]));
  for (const b of books) {
    const entry = chapterIndex.get(b.id);
    b.chapters = entry ? entry.count : null;
    b.divisions = entry ? entry.divisions : [];
    b.chapterTitles = entry ? entry.titles : [];
  }
  const colorIndex = new Map(read('data/book-colors.json').books.map(c => [c.book, c]));
  for (const b of books) {
    const c = colorIndex.get(b.id);
    if (!c) throw new Error(`book ${b.id} has no colour in data/book-colors.json`);
    b.accent = c.accent;
    b.ink = c.ink;
  }
  return { books, floors, colorIndex };
}
```

In `build-content.mjs`, replace lines 17–40 with `const { books, floors, colorIndex } = loadBooks(root);` and the import. Run `npm run content:build` — the snapshot must come back **unchanged** (`git diff --stat data/content.snapshot.json` prints nothing).

- [ ] **Step 2: `scripts/draft-recaps.mjs`**

```js
#!/usr/bin/env node
/* npm run recaps:draft [-- --entity carl --book 4 --redo --limit 10 --dry]

   Drafts the missing recap paragraphs — one per entity per book it has a beat
   in — with the model, screens each through the lint, and writes what passes
   into data/entities/*.json as draft. Re-runnable: only missing steps are
   drafted unless --redo. Then run npm run content:build. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadBooks } from './lib/books.mjs';
import { ask, readEnv } from './lib/ollama.mjs';
import { recapWork, recapMessages, screenRecap, draftOne, applyRecap } from './lib/recaps.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const only = flag('entity'), onlyBook = flag('book') && Number(flag('book'));
const limit = flag('limit') ? Number(flag('limit')) : Infinity;
const redo = args.includes('--redo'), dry = args.includes('--dry');
const PARALLEL = 4;

const env = readEnv(root);
const opts = { key: env.OLLAMA_API_KEY, host: env.OLLAMA_HOST, model: env.OLLAMA_MODEL };
const { books } = loadBooks(root);

const FILES = ['characters', 'items', 'mechanics', 'factions', 'places', 'threads'];
const files = FILES.map(f => ({ path: join(root, `data/entities/${f}.json`), data: JSON.parse(readFileSync(join(root, `data/entities/${f}.json`), 'utf8')) }));
const entities = files.flatMap(f => f.data.entities);

let work = recapWork(entities.map(e => redo ? { ...e, recap: [] } : e))
  .map(w => ({ ...w, entity: entities.find(e => e.id === w.entity.id) }));
if (only) work = work.filter(w => w.entity.id === only);
if (onlyBook) work = work.filter(w => w.book === onlyBook);
work = work.slice(0, limit);
console.log(`${work.length} recap step(s) to draft${dry ? ' (dry run)' : ''}`);
if (dry) { for (const w of work) console.log(`  ${w.entity.id} book ${w.book} (${w.beats.length} beats)`); process.exit(0); }
if (!opts.key) { console.error('OLLAMA_API_KEY is not set in .env'); process.exit(1); }

const failed = [];
let done = 0;
async function worker() {
  while (work.length) {
    const w = work.shift();
    const { text, problems } = await draftOne(recapMessages(w.entity, w.book, w.beats), t => screenRecap(t, w.entity, w.book, books), m => ask(m, opts));
    if (problems.length) { failed.push(`${w.entity.id} book ${w.book}: ${problems.join('; ')}`); }
    else { applyRecap(w.entity, w.book, text); }
    done++;
    if (done % 25 === 0) { save(); console.log(`  ${done} done, ${failed.length} failed`); }
  }
}
function save() {
  for (const f of files) writeFileSync(f.path, JSON.stringify(f.data, null, 2) + '\n');
}

await Promise.all(Array.from({ length: PARALLEL }, worker));
save();
console.log(`\n${done - failed.length} drafted, ${failed.length} failed`);
for (const f of failed) console.log(`  ✗ ${f}`);
console.log('\nNow: npm run content:build');
```

- [ ] **Step 3: `scripts/draft-gists.mjs`**

Same skeleton, with `gistWork`, `gistMessages`, `screenGist`, `applyGist`:

```js
#!/usr/bin/env node
/* npm run gists:draft [-- --entity carl --book 4 --redo --limit 20 --dry]
   One sentence per beat, drafted and screened like a recap; see draft-recaps.mjs. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadBooks } from './lib/books.mjs';
import { ask, readEnv } from './lib/ollama.mjs';
import { gistWork, gistMessages, screenGist, draftOne, applyGist } from './lib/recaps.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const only = flag('entity'), onlyBook = flag('book') && Number(flag('book'));
const limit = flag('limit') ? Number(flag('limit')) : Infinity;
const redo = args.includes('--redo'), dry = args.includes('--dry');
const PARALLEL = 4;

const env = readEnv(root);
const opts = { key: env.OLLAMA_API_KEY, host: env.OLLAMA_HOST, model: env.OLLAMA_MODEL };
const { books } = loadBooks(root);

const FILES = ['characters', 'items', 'mechanics', 'factions', 'places', 'threads'];
const files = FILES.map(f => ({ path: join(root, `data/entities/${f}.json`), data: JSON.parse(readFileSync(join(root, `data/entities/${f}.json`), 'utf8')) }));
const entities = files.flatMap(f => f.data.entities);

if (redo) for (const e of entities) for (const b of e.beats ?? []) { delete b.gist; delete b.gistDraft; }
let work = gistWork(entities);
if (only) work = work.filter(w => w.entity.id === only);
if (onlyBook) work = work.filter(w => w.beat.book === onlyBook);
work = work.slice(0, limit);
console.log(`${work.length} gist(s) to draft${dry ? ' (dry run)' : ''}`);
if (dry) process.exit(0);
if (!opts.key) { console.error('OLLAMA_API_KEY is not set in .env'); process.exit(1); }

const failed = [];
let done = 0;
async function worker() {
  while (work.length) {
    const w = work.shift();
    const { text, problems } = await draftOne(gistMessages(w.entity, w.beat), t => screenGist(t, w.entity, w.beat, books), m => ask(m, opts));
    if (problems.length) failed.push(`${w.entity.id} "${w.beat.headline}": ${problems.join('; ')}`);
    else applyGist(w.beat, text);
    done++;
    if (done % 100 === 0) { save(); console.log(`  ${done} done, ${failed.length} failed`); }
  }
}
function save() {
  for (const f of files) writeFileSync(f.path, JSON.stringify(f.data, null, 2) + '\n');
}

await Promise.all(Array.from({ length: PARALLEL }, worker));
save();
console.log(`\n${done - failed.length} drafted, ${failed.length} failed`);
for (const f of failed) console.log(`  ✗ ${f}`);
console.log('\nNow: npm run content:build');
```

Add to `package.json` scripts:

```json
"recaps:draft": "node scripts/draft-recaps.mjs",
"gists:draft": "node scripts/draft-gists.mjs",
```

- [ ] **Step 4: Dry runs**

```bash
npm run recaps:draft -- --dry | head -3
npm run gists:draft -- --dry | head -1
```
Expected: `900 recap step(s) to draft (dry run)` (or near it) and `3575 gist(s) to draft (dry run)`; no file is written (`git status --short data/` is empty).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/books.mjs scripts/build-content.mjs scripts/draft-recaps.mjs scripts/draft-gists.mjs package.json
git commit -m "recaps:draft and gists:draft — the missing prose, drafted and screened, written back as draft"
```

---

### Task 8: A trial of ten, then the pass

**Files:**
- Modify: `data/entities/*.json` (drafted text), `data/content.snapshot.json`
- Requires: `OLLAMA_API_KEY` in `.env` (the owner copies it from `/etc/dcc-companion.env` on the box). **Stop and ask if it is not there.**

- [ ] **Step 1: Ten recaps for Carl**

Run: `npm run recaps:draft -- --entity carl --limit 10`
Read the ten paragraphs in `data/entities/characters.json` against Carl's beats for those books. Judge: third person, present tense, nothing invented, nothing pointing forward, readable. If the voice is off, fix the examples or rules in `recaps.mjs` (the voice is shown, not described), `--redo --entity carl --limit 10`, and read again. Do not proceed until ten in a row read well.

- [ ] **Step 2: Twenty gists**

Run: `npm run gists:draft -- --entity carl --book 4 --limit 20` and read them against the beats the same way. Adjust the gist examples if needed.

- [ ] **Step 3: The full passes**

```bash
npm run recaps:draft 2>&1 | tail -15
npm run gists:draft 2>&1 | tail -15
```
Note every `✗` line. Expected: a handful of failures where the lint and the model could not agree in three tries; these are left blank (the page shows the headline for a missing gist, nothing for a missing recap) and listed for a hand-written line.

- [ ] **Step 4: Build and check**

```bash
npm run content:build 2>&1 | tail -3
node scripts/check-facts.mjs 2>&1 | tail -20
npm run test:gate 2>&1 | grep -E '^# (pass|fail)'
```
Expected: the build passes (every screened text passed the same lint); the summary shows ~900 recap steps and ~3,500 gists, all draft; `check-facts` lists any recap or gist naming something the edition has not printed at its gate — read each, reword or drop the text, rebuild.

- [ ] **Step 5: Commit the prose**

```bash
git add data/entities data/content.snapshot.json
git commit -m "Content: a recap paragraph per book for every entry and a gist for every beat, drafted and screened, all draft"
```

---

### Task 9: Reading the main cast

**Files:**
- Modify: `data/entities/*.json` (`confidence: "verified"` on read steps; reworded text where needed), `data/content.snapshot.json`

- [ ] **Step 1: The list**

Run: `node -e 'const s=JSON.parse(require("fs").readFileSync("data/content.snapshot.json"));const n={};for(const b of s.beats)n[b.entityId]=(n[b.entityId]||0)+1;console.log(Object.entries(n).sort((a,b)=>b[1]-a[1]).slice(0,24).map(x=>x.join(" ")).join("\n"))'`
Expected: Carl, Princess Donut, Mordecai, Katia and ~20 more, by beat count.

- [ ] **Step 2: Read each entity's recap steps against its beats**

For each of the 24: open the entity in `data/entities/*.json`, and for each recap step read it beside the beats of that book. Fix: a wrong fact, a wrong order, a sentence that summarises the voice rather than the events, a stiff phrase. Set `confidence: "verified"` on each step read. Keep the 80-word cap.

- [ ] **Step 3: Rebuild, commit**

```bash
npm run content:build 2>&1 | tail -2
git add data/entities data/content.snapshot.json
git commit -m "Content: the main cast's recaps read against their beats and verified"
```

---

### Task 10: Record it

**Files:**
- Modify: `CLAUDE.md` (a subsection after *A tagline is a summary, so it obeys the summary rule*; the Content pipeline's lint list; the Key files table; the Commands block)

- [ ] **Step 1: Write the subsection**

After the tagline subsection, add `### A recap per book, a gist per beat, and the rule that lets a model write here` covering: the two fields and their gates; why per-book not cumulative (the reader asked for a paragraph per book; no drift); the faithfulness rule and that it has no exemption list; that the screen is the lint itself, not a copy; `storySoFar()` as the one composition rule with the plugin's cut at the previous chapter; what the trial of ten taught about the prompt (write the actual lesson from Task 8); the review state (`gistDraft` separate from the beat's confidence) and the count still draft.

- [ ] **Step 2: Update the lists**

Lint bullets: add the recap-at-book's-end rule and faithfulness. Key files: `src/lib/story.ts`, `scripts/lib/recaps.mjs`, `scripts/lib/ollama.mjs`, `scripts/draft-recaps.mjs`, `scripts/draft-gists.mjs`, `scripts/lib/books.mjs`. Commands: `npm run recaps:draft`, `npm run gists:draft`.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "Record: the recap, the gist, and the faithfulness rule"
```

---

## Self-review

**Spec coverage.** Fields and gates → Tasks 1, 3. Seven lint errors → Tasks 1–2 (`at` form, duplicates/order, no-beat book, before entity, forward phrase, forward reference, faithfulness; plus no-text and confidence). `gistDraft` separate state → Tasks 1, 3, 4. Snapshot and DB → Task 3. `check-facts` → Task 3. `storySoFar` with `cut`, `max`, finished book, no current when the book's paragraph is reached → Task 4. Drafting scripts, screening with the lint's own functions, three tries, `--entity/--book/--redo`, four in flight, `.env` key → Tasks 6–7. Trial then pass → Task 8. Review of the main cast → Task 9. Entity page block with the chip and smoke → Task 5. App export untouched → Global Constraints (verified: `app-export.ts` picks fields). Not covered here by design: everything under Sub-project B (its own plan).

**Review Focus → tests.** 1 → Task 4 "a current book with no beat yet". 2, 3 → Task 2 possessive/hyphen and number tests. 4 → Task 1 blank gist. 5 → Task 6 `unwrap` test.

**Type consistency.** `RecapStep { sortKey, text, confidence }` is what Task 3 writes and Task 4 reads. `StoryBeat.gist: string | null` matches the snapshot's `gist: null`. Lint message prefixes `entity x recap N:` / `entity x beat "h" gist:` are what `screenRecap`/`screenGist` split on. `applyRecap` writes `{ at: "N:end", text, confidence: 'draft' }`, the shape Task 1 lints.

**Placeholders.** None; every step has its code or its exact command.
