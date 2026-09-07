# Character Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Character pages read in the character's own voice (fates in the System's), and item pages open on the System's verbatim description before the usage log.

**Architecture:** Two new pieces of curation data (`voice`/`voiceNote` on characters and beats, `description` on any entity) are resolved in `scripts/build-content.mjs` into snapshot fields (`Entity.voice`, `Entity.descriptions`, `Beat.voice`) so views never compute defaults. A pure module `scripts/lib/voice.mjs` holds the default rules and is driven by `npm run test:gate`. The lint gains four rules. The entity page renders beats by voice and shows the latest reached description.

**Tech Stack:** Node 22 (`node --test`), Astro 6 SSR, Astro DB, TailwindCSS v4 tokens in `src/styles/global.css`.

**Spec:** `docs/superpowers/specs/2026-09-07-character-voice-design.md`

## Global Constraints

- Every new text field is gated by `sortKey = max(parseAt(at), parseAt(entity.revealedAt))`, computed in the build, never in a view.
- The forward-phrase and forward-reference checks apply to every beat and tagline in every voice. Only `description` entries skip the phrase heuristic; they keep the forward-reference check.
- No `kind` label is ever rendered. Sealed beats keep collapsing into one count line.
- `voiceNote` is committed in `data/entities/characters.json` and must not appear in `data/content.snapshot.json`.
- Prose is written from inside the crawl: never "the series", "the book(s)", "book 4", "the reader". Grep after every writing pass: `grep -nE "the series|the books?|books? (before|after)|the reader" data/entities/*.json`.
- Every rewritten beat and every quoted description is `confidence: draft`.
- Commit after every task. Work on branch `character-voice`; pushing `main` deploys.
- Build against a throwaway DB: `ASTRO_DATABASE_FILE=./.astro/build.db npm run build`.

---

### Task 1: Voice defaults as a pure module

**Files:**
- Create: `scripts/lib/voice.mjs`
- Test: `scripts/test-gate.mjs`

**Interfaces:**
- Produces: `VOICES: Set<'self'|'system'|'narrator'>`, `ENTITY_VOICES: Set<'self'|'system'>`, `entityVoice(e) => 'self'|'system'|'narrator'`, `beatVoice(e, b) => 'self'|'system'|'narrator'`.

- [ ] **Step 1: Write the failing tests** (append to `scripts/test-gate.mjs`; add the import at the top of the file next to the `lint` import)

```js
import { entityVoice, beatVoice, VOICES } from './lib/voice.mjs';
```

```js
test('a character speaks for itself unless told otherwise; nothing else does', () => {
  const carl = { id: 'carl', kind: 'character' };
  const dossier = { id: 'quasar', kind: 'character', voice: 'system' };
  const gate = { id: 'gate', kind: 'item' };
  assert.equal(entityVoice(carl), 'self');
  assert.equal(entityVoice(dossier), 'system');
  assert.equal(entityVoice(gate), 'narrator');
  assert.deepEqual([...VOICES].sort(), ['narrator', 'self', 'system']);
});

test('a fate is reported by the dungeon, everything else follows the entity', () => {
  const carl = { id: 'carl', kind: 'character' };
  const gate = { id: 'gate', kind: 'item' };
  assert.equal(beatVoice(carl, { kind: 'arc' }), 'self');
  assert.equal(beatVoice(carl, { kind: 'fate' }), 'system');
  assert.equal(beatVoice(carl, { kind: 'arc', voice: 'narrator' }), 'narrator');
  assert.equal(beatVoice(gate, { kind: 'use' }), 'narrator');
  assert.equal(beatVoice(gate, { kind: 'fate' }), 'narrator');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:gate 2>&1 | grep -E "^# (pass|fail)|Cannot find module"`
Expected: `Cannot find module .../voice.mjs`

- [ ] **Step 3: Write the module**

```js
/* Who speaks on a page. A character speaks for themself in the present tense of
   the beat they are in; a dead crawler does not narrate their own death, so a
   fate is the dungeon's notice; everything that is not a character keeps the
   narrator. Resolved in the build so no view has to know these defaults. */

export const VOICES = new Set(['self', 'system', 'narrator']);
/* At the entity level only these two make sense: a character either speaks or
   gets the showrunner's dossier. `narrator` is what non-characters get. */
export const ENTITY_VOICES = new Set(['self', 'system']);

export function entityVoice(e) {
  if (e.kind !== 'character') return 'narrator';
  return e.voice ?? 'self';
}

export function beatVoice(e, b) {
  if (b.voice) return b.voice;
  if (e.kind === 'character' && b.kind === 'fate') return 'system';
  return entityVoice(e);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:gate 2>&1 | grep -E "^# (pass|fail)"`
Expected: `# pass 19`, `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/voice.mjs scripts/test-gate.mjs
git commit -m "Voice defaults as a pure module: self, system, narrator"
```

---

### Task 2: Lint rules for voice and descriptions

**Files:**
- Modify: `scripts/lib/lint.mjs` (imports at top; `checkForward`; the entity loop; the beat loop)
- Test: `scripts/test-gate.mjs`

**Interfaces:**
- Consumes: `VOICES`, `ENTITY_VOICES`, `entityVoice`, `beatVoice` from Task 1.
- Produces: `lint()` accepts `e.voice`, `e.voiceNote`, `e.description` (string or `[{ at, source?, text }]`), `b.voice`.

- [ ] **Step 1: Write the failing tests** (append to `scripts/test-gate.mjs`)

```js
const one = { id: 1, title: 'One', chapters: 47 };
const mk = (over) => ({ id: 'x', kind: 'item', name: 'Thing', role: 'r', tagline: 't', revealedAt: '1:5', beats: [], relations: [], ...over });

test('only a character may speak for itself', () => {
  const { errors } = lint({ books: [one], floors: [], entities: [
    mk({ voice: 'self' }),
    mk({ id: 'y', beats: [{ kind: 'use', book: 1, at: '1:5', voice: 'self', headline: 'h', text: '' }] }),
  ] });
  assert.equal(errors.filter(e => e.includes('only a character')).length, 2);
});

test('a fate in the character\'s own voice is an error', () => {
  const { errors } = lint({ books: [one], floors: [], entities: [
    mk({ kind: 'character', voiceNote: 'n', beats: [
      { kind: 'fate', book: 1, at: '1:20', voice: 'self', headline: 'h', text: '' },
      { kind: 'fate', book: 1, at: '1:21', headline: 'default is fine', text: '' },
    ] }),
  ] });
  assert.equal(errors.filter(e => e.includes('a fate')).length, 1);
});

test('an unknown voice is an error at either level', () => {
  const { errors } = lint({ books: [one], floors: [], entities: [
    mk({ kind: 'character', voice: 'shouting', voiceNote: 'n' }),
    mk({ id: 'y', kind: 'character', voice: 'narrator', voiceNote: 'n' }),
    mk({ id: 'z', beats: [{ kind: 'use', book: 1, at: '1:5', voice: 'loud', headline: 'h', text: '' }] }),
  ] });
  assert.equal(errors.filter(e => e.includes('voice')).length, 3);
});

test('a speaking character without a voice note is a warning', () => {
  const { errors, warnings } = lint({ books: [one], floors: [], entities: [
    mk({ kind: 'character' }),
    mk({ id: 'y', kind: 'character', voice: 'system' }),
  ] });
  assert.equal(errors.length, 0);
  assert.equal(warnings.filter(w => w.includes('voice note')).length, 1);
});

test('a quoted description may say "later"; a summary may not; neither may name the unmet', () => {
  const { errors } = lint({ books: [one], floors: [], entities: [
    mk({ description: 'Feed it to your pet. Later you will wish you had not.' }),
    mk({ id: 'y', tagline: 'Later it all goes wrong.' }),
    mk({ id: 'z', description: 'Katia will love this.' }),
    mk({ id: 'katia', kind: 'character', name: 'Katia', revealedAt: '1:30', voiceNote: 'n' }),
  ] });
  assert.equal(errors.filter(e => e.includes('entity x')).length, 0);
  assert.ok(errors.some(e => e.includes('entity y') && e.includes('later')));
  assert.ok(errors.some(e => e.includes('entity z') && e.includes('Katia')));
});

test('descriptions are a list in reading order, floored to the entity', () => {
  const { errors, warnings } = lint({ books: [one], floors: [], entities: [
    mk({ description: [{ at: '1:5', text: 'a' }, { at: '1:4', text: 'b' }] }),
    mk({ id: 'y', description: [{ at: '1:2', text: 'early' }] }),
  ] });
  assert.ok(errors.some(e => e.includes('entity x description 2')));
  assert.ok(warnings.some(w => w.includes('y: description 1')));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:gate 2>&1 | grep -E "^# (pass|fail)"`
Expected: `# fail 6` (or fewer passing by accident; at least the four voice tests must fail)

- [ ] **Step 3: Implement the rules**

At the top of `scripts/lib/lint.mjs`, next to the existing `gate.mjs` import:

```js
import { VOICES, ENTITY_VOICES, entityVoice, beatVoice } from './voice.mjs';
```

Replace the `checkForward` definition with one that can skip the phrase heuristic for quotations:

```js
  /* One text, one reveal point: does it point past itself? A verbatim quotation
     of something the reader has already seen in the book cannot point forward
     by construction, and the book's own text does say "eventually" — so a
     quotation skips the phrase heuristic and keeps the name check. That is a
     rule about a category of text, not an exemption list for entries. */
  const checkForward = (text, atValue, where, { quotation = false } = {}) => {
    if (!text) return;
    const phrase = quotation ? null : text.match(FORWARD_PHRASE);
    if (phrase) {
      errors.push(`${where}: "${phrase[0]}" points past its own reveal point — split it, or gate it later`);
    }
    for (const n of gatedNames) {
      if (n.at > atValue && n.re.test(text)) {
        errors.push(`${where}: names "${n.name}", which is not revealed until later`);
      }
    }
  };
```

In the entity loop, directly after `if (entityAt === null) continue;`:

```js
    /* Voice. A character speaks for themself unless marked as a dossier; nothing
       else has a voice of its own. */
    if (e.voice != null) {
      if (e.kind !== 'character') errors.push(`${where}: voice "${e.voice}" — only a character speaks for itself`);
      else if (!ENTITY_VOICES.has(e.voice)) errors.push(`${where}: voice must be "self" or "system", not "${e.voice}"`);
    }
    if (e.kind === 'character' && entityVoice(e) === 'self' && !e.voiceNote) {
      warnings.push(`no voice note — ${e.id}: who writes the next beat in this voice needs one`);
    }

    /* Descriptions: the System's own words, quoted. A string is "safe from
       revealedAt"; a list supersedes as the reader advances, like taglines. */
    const descriptions = e.description == null ? []
      : typeof e.description === 'string' ? [{ at: e.revealedAt, text: e.description }]
      : e.description;
    if (!Array.isArray(descriptions)) {
      errors.push(`${where}: description must be a string or a list of { at, text }`);
    } else {
      let prevD = -1;
      descriptions.forEach((d, i) => {
        const dw = `${where} description ${i + 1}`;
        const dAt = at(d.at, dw);
        if (dAt === null) return;
        if (!d.text) errors.push(`${dw}: no text`);
        if (dAt < entityAt) warnings.push(`floored — ${e.id}: description ${i + 1} tag "${d.at}" raised to "${e.revealedAt}"`);
        if (dAt <= prevD) errors.push(`${dw}: does not come after the one before it`);
        prevD = dAt;
        checkForward(d.text, Math.max(dAt, entityAt), dw, { quotation: true });
      });
    }
```

In the beat loop, directly after the `VALID_CONFIDENCE` check:

```js
      if (b.voice != null && !VOICES.has(b.voice)) errors.push(`${bw}: unknown voice "${b.voice}"`);
      if (b.voice === 'self' && e.kind !== 'character') {
        errors.push(`${bw}: voice "self" — only a character speaks for itself`);
      }
      if (b.kind === 'fate' && beatVoice(e, b) === 'self') {
        errors.push(`${bw}: a fate cannot be in the character's own voice — the dungeon reports a death`);
      }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:gate 2>&1 | grep -E "^# (pass|fail)"`
Expected: `# pass 25`, `# fail 0`

- [ ] **Step 5: Run the real content through it**

Run: `npm run content:check 2>&1 | tail -4`
Expected: `OK — ...` with new warnings `no voice note — <id>` for all 47 characters (they are all `self` by default and none has a note yet). No errors.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/lint.mjs scripts/test-gate.mjs
git commit -m "Lint: voice rules, and quoted descriptions"
```

---

### Task 3: Resolve voice and descriptions into the snapshot

**Files:**
- Modify: `scripts/build-content.mjs` (imports; the `for (const e of entities)` loop)
- Modify: `db/config.ts` (`Entity`, `Beat`)
- Modify: `db/seed.ts` (no change needed if the snapshot shape matches columns exactly; verify)

**Interfaces:**
- Produces snapshot fields: `entities[].voice: string`, `entities[].descriptions: { at, source, sortKey, text }[]` (sorted ascending), `beats[].voice: string`. `voiceNote` is dropped.

- [ ] **Step 1: Add the import**

```js
import { entityVoice, beatVoice } from './lib/voice.mjs';
```

- [ ] **Step 2: Resolve descriptions and voice in the entity loop**

Replace the `resolvedEntities.push({...})` call and the `resolvedBeats.push({...})` call with:

```js
  /* The System's own words, quoted. Same shape and same rule as taglines: a
     string is safe from revealedAt, a list supersedes as the reader advances,
     and every entry is floored to the entity's own reveal point. */
  const descriptions = (e.description == null ? []
    : typeof e.description === 'string' ? [{ at: e.revealedAt, text: e.description }]
    : e.description
  ).map(d => ({ at: d.at, source: d.source ?? d.at, sortKey: Math.max(parseAt(d.at), entityAt), text: d.text }))
   .sort((a, b) => a.sortKey - b.sortKey);

  resolvedEntities.push({
    id: e.id, kind: e.kind, name: e.name, aka: e.aka ?? [],
    role: e.role, taglines, revealedAt: e.revealedAt, sort: e.sort ?? 0,
    // voiceNote stays in the curation file: it is guidance, not content.
    voice: entityVoice(e), descriptions,
  });

  for (const b of e.beats ?? []) {
    resolvedBeats.push({
      entityId: e.id, kind: b.kind, book: b.book, chapter: b.chapter ?? null,
      floor: b.floor ?? null, at: b.at,
      // Gate inheritance: a beat can never surface before its own entity.
      sortKey: Math.max(parseAt(b.at), entityAt),
      headline: b.headline, text: b.text, confidence: b.confidence ?? 'draft',
      // Who speaks, already decided, so no view has to know the defaults.
      voice: beatVoice(e, b),
    });
  }
```

- [ ] **Step 3: Add the columns**

In `db/config.ts`, inside `Entity.columns` after `sort`:

```ts
    /* Who speaks on this page: self | system | narrator. Resolved in the build
       (scripts/lib/voice.mjs); characters default to self, everything else to
       narrator. */
    voice: column.text({ default: 'narrator' }),
    /* The System's own words about this thing, quoted verbatim and gated like
       taglines: [{ at, source, sortKey, text }], ascending. Items carry these
       ahead of their usage log. */
    descriptions: column.json({ default: [] }),
```

Inside `Beat.columns` after `confidence`:

```ts
    voice: column.text({ default: 'narrator' }),  // self | system | narrator, resolved in the build
```

- [ ] **Step 4: Rebuild the snapshot and confirm the shape**

Run: `npm run content:build 2>&1 | tail -2 && node -e "const s=require('./data/content.snapshot.json'); const e=s.entities.find(x=>x.id==='carl'); console.log(e.voice, JSON.stringify(e.descriptions)); console.log(s.beats.filter(b=>b.entityId==='carl').map(b=>b.kind+':'+b.voice).join(' ')); console.log('voiceNote leaked:', JSON.stringify(s).includes('voiceNote'))"`
Expected: `self []`, carl's beats as `origin:self arc:self ... fate:system` (fates system, everything else self), `voiceNote leaked: false`. Items show `narrator`.

- [ ] **Step 5: Build against a throwaway DB**

Run: `ASTRO_DATABASE_FILE=./.astro/build.db npm run build 2>&1 | tail -3 && npm run check 2>&1 | tail -4`
Expected: `Complete!` and `0 errors`. (`db/seed.ts` inserts `snapshot.entities` and `snapshot.beats` whole, so the new fields flow through without a change there.)

- [ ] **Step 6: Commit**

```bash
git add scripts/build-content.mjs db/config.ts data/content.snapshot.json
git commit -m "Resolve voice and descriptions into the snapshot"
```

---

### Task 4: Render by voice, and the description block

**Files:**
- Modify: `src/lib/content.ts` (add `descriptionFor` next to `taglineFor`)
- Modify: `src/pages/entity/[id].astro`
- Modify: `src/pages/who.astro`
- Modify: `src/styles/global.css` (add `.spoken`, `.src`)

**Interfaces:**
- Consumes: `EntityRow.voice`, `EntityRow.descriptions`, `BeatRow.voice` from Task 3.
- Produces: `descriptionFor(entity: EntityRow, gate: Gate): { text: string; source: string } | null`.

- [ ] **Step 1: `descriptionFor` in `src/lib/content.ts`**, directly after `taglineFor`:

```ts
/* The latest of the System's own descriptions the reader has reached, or null
   when there is none yet. Same rule as taglines: a description of an upgraded
   item supersedes the one before it. */
export function descriptionFor(entity: EntityRow, gate: Gate): { text: string; source: string } | null {
  const rows = (entity.descriptions ?? []) as { sortKey: number; text: string; source: string }[];
  let out: { text: string; source: string } | null = null;
  for (const d of rows) if (gate.frontier >= d.sortKey) out = { text: d.text, source: d.source };
  return out;
}
```

- [ ] **Step 2: Styles in `src/styles/global.css`**, after the `.sys` rules:

```css
  /* A character speaking to camera. Body face, not mono: the mono register is
     the System's. The opening mark is the only ornament. */
  .spoken { position: relative; padding-left: 22px; color: var(--color-grey-100); }
  .spoken::before {
    content: '\201C'; position: absolute; left: 0; top: -6px;
    font-family: var(--font-display); font-size: 34px; line-height: 1; color: var(--color-gold);
  }
  .src { display: block; margin-top: 8px; font-family: var(--font-mono); font-size: 11px;
         letter-spacing: .1em; text-transform: uppercase; color: var(--color-grey-500); }
```

- [ ] **Step 3: The entity page**

In the frontmatter of `src/pages/entity/[id].astro`, add `descriptionFor` to the `content` import list and, after `const visibleRelations = ...`, add:

```ts
const description = descriptionFor(entity, gate);
/* Source tags read "1:5"; the stamp shows "Bk 1 · 5", or just the book for an
   end-of-book tag. */
const stampOf = (tag: string) => {
  const [book, chapter] = tag.split(':');
  return chapter && chapter !== 'end' ? `Bk ${book} · ${chapter}` : `Bk ${book}`;
};
```

Immediately inside `<div class="main">`, before the `uses.length > 0` block:

```astro
        {description && (
          <section>
            <div class="sys">
              <b>*** Description ***</b>{description.text}
              <span class="src">{stampOf(description.source)}</span>
            </div>
          </section>
        )}
```

Then replace **both** copies of the `entry-body` div (the one in the use log and the one in the story log) with this, so a beat renders by its voice:

```astro
                    <div class="entry-body">
                      {b.voice === 'system'
                        ? <div class="sys"><b>*** {b.headline} ***</b>{b.text}</div>
                        : <>
                            <h3>{b.headline}</h3>
                            <p class={b.voice === 'self' ? 'spoken' : undefined}>{b.text}</p>
                          </>}
                      {b.confidence === 'draft' && <span class="draft">unverified</span>}
                    </div>
```

Also give the tagline its voice. Replace `<p class="tagline">{taglineFor(entity, gate)}</p>` with:

```astro
      <p class={`tagline${entity.voice === 'self' ? ' spoken' : ''}`}>{taglineFor(entity, gate)}</p>
```

- [ ] **Step 4: The cast list**

In `src/pages/who.astro`, replace `<p class="tagline">{taglineFor(e, gate)}</p>` (inside the `known ?` branch) with:

```astro
<p class={`tagline${e.voice === 'self' ? ' spoken' : ''}`}>{taglineFor(e, gate)}</p>
```

and delete the unused `import { parseAt } from '../lib/progress';` line and the unused `prefs` and `chapters: currentChapters` destructured names that `astro check` hints at (`const { gate } = await readGate(Astro.cookies);`).

- [ ] **Step 5: Check and build**

Run: `npm run check 2>&1 | tail -4 && ASTRO_DATABASE_FILE=./.astro/build.db npm run build 2>&1 | tail -2 && npm run content:check 2>&1 | tail -1`
Expected: `0 errors`, `Complete!`, and the page-source check still reports no gated name (the new copy is "Description", which is not a name).

- [ ] **Step 6: Commit**

```bash
git add src/lib/content.ts src/pages/entity/[id].astro src/pages/who.astro src/styles/global.css
git commit -m "Render beats by voice, and the System's description first"
```

---

### Task 5: Proof batch, the Royal Court

**Files:**
- Modify: `data/entities/characters.json` (entries `carl`, `princess-donut`, `mordecai`, `katia`, `mongo`)
- Modify: `data/entities/items.json` (entries `enhanced-pet-biscuit`, `ring-of-divine-suffering`, `tiara-of-a-thousand-lights`)
- Regenerate: `data/content.snapshot.json`

**Interfaces:**
- Consumes: the JSON shapes from the spec section 3.

- [ ] **Step 1: Voice sheets.** Add `voiceNote` to each of the five. Two or three lines: register, tics, what they call people, what they never say. Written before any beat so the beats follow it.

- [ ] **Step 2: Rewrite each beat's `text`** for the five characters as the character speaking to camera **at the beat's `at`**, first person, present tense. Rules:
  - The speaker knows nothing after `at`. No "later", no outcomes, no names not yet met (the lint enforces both; write to it).
  - Fates keep their default `system` voice: rewrite them as the dungeon's notice, mono register, dry. Do not add a `voice` key; the default does it.
  - Mongo's beats are written in Mongo's register, which is short.
  - Headlines stay as they are.
  - Set `"confidence": "draft"` on every rewritten beat.
  - Keep every fact that was in the narrator text; the voice changes, the record does not.

  Target register, Donut at `1:7` ("She equips a crown with an ominous description"), so the writer hears it before starting:

  > Mordecai says read the description first. Mordecai says a great many things. It is a crown, it is dark and smoky and exactly my colour, and it came out of *my* box, which has the word Legendary on it. It says something about a line of succession, eight floors down. I am already a princess. I do not see how being in line for anything could be a demotion. Carl is making his face.

- [ ] **Step 3: Taglines in voice.** Each of the five gets their tagline(s) rewritten as an opening line spoken to camera, obeying the same rules per entry `at`.

- [ ] **Step 4: Three item descriptions**, quoted verbatim from the System's text, each with `at` and `source` set to the chapter the description is read in. The Enhanced Pet Biscuit's is read at `1:5`; the Ring of Divine Suffering's at `3:19` (both cited on the Fandom wiki's item pages); confirm the Tiara's chapter on its wiki page before writing it. Quote only the description itself, not surrounding narration. Where an item's text changes on upgrade, add a second entry rather than merging.

- [ ] **Step 5: Lint, grep, build**

Run:
```bash
npm run content:build 2>&1 | grep -E "ERROR|OK|Wrote" ; \
grep -nE "the series|the books?|books? (before|after)|the reader" data/entities/*.json ; \
ASTRO_DATABASE_FILE=./.astro/build.db npm run build 2>&1 | tail -1
```
Expected: no `ERROR`, `Wrote data/content.snapshot.json`, the grep prints nothing, `Complete!`.

- [ ] **Step 6: Look at the pages.** Start `npm run dev`, then at these positions confirm the behaviour (set the position with the gate bar, or the `dcc_pos` cookie):
  - book unset: `/entity/princess-donut` redirects to `/who`.
  - `1:6`: Donut's page shows the tagline in the spoken style and the origin beat; the `1:7` beats sit inside the sealed count.
  - `1:7`: the crown beat appears, spoken.
  - `1:end`: the whole of book 1 is open; any fate stays sealed and the sealed line names the next unlock.
  - `/entity/enhanced-pet-biscuit` at `1:5`: the description block sits above "Where it's used" with the stamp `Bk 1 · 5`; at `1:4` the entity redirects.

- [ ] **Step 7: Commit**

```bash
git add data/entities/characters.json data/entities/items.json data/content.snapshot.json
git commit -m "Proof batch: the Royal Court in their own voices, three items in the System's"
```

**Stop here for the owner's review of the five voices before Task 6 is started.**

---

### Task 6: Documentation and housekeeping

**Files:**
- Modify: `CLAUDE.md` (a new subsection under "The frontier" after "A tagline is a summary…", and the Key files table)
- Modify: `.gitignore`

- [ ] **Step 1: CLAUDE.md.** Add after the tagline subsection:

```markdown
### Who speaks: three voices, resolved in the build

Character pages are written **in the character's own voice**, as a confessional to camera spoken
at the moment of the beat. A speaker at `1:7` knows nothing after `1:7`, which is the same
discipline the gate already demands, so the forward-phrase and forward-reference lints apply
unchanged and are easier to satisfy, not harder.

`scripts/lib/voice.mjs` decides who speaks and `build-content.mjs` writes the answer into every
beat, so no view knows the defaults:

| voice | who | default for |
|---|---|---|
| `self` | the character, first person, present tense | every character beat and tagline |
| `system` | the AI, in the mono `*** ... ***` register the seals use | every `fate`; a whole page when a character has too few lines to voice honestly (`"voice": "system"` on the entity) |
| `narrator` | the wry third person | everything that is not a character |

A `fate` in `self` is a lint error: a dead crawler does not narrate their own death. Every
speaking character carries a `voiceNote` (register, tics, what they call people, what they never
say); it is committed as guidance and dropped from the snapshot. Headlines are chrome and stay in
the narrator's hand.

**Items open on the System's own words.** `description` on an entity is the AI's verbatim text,
a string or a progressive `{ at, source, text }` list with exactly the tagline rules, shown above
the usage log with a `Bk b · c` stamp. Quotations skip the forward-phrase heuristic (the book's
own text says "eventually") and keep the forward-reference check. That is a rule about a category
of text; the deliberate absence of an exemption list for summaries stands.
```

Add to the Key files table:

```markdown
| `scripts/lib/voice.mjs` | Who speaks on a beat: self / system / narrator, resolved in the build |
```

- [ ] **Step 2: `.gitignore`.** Append `.serena/`.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md .gitignore
git commit -m "Document the three voices and the System's descriptions"
```

---

## Later (not in this plan)

The remaining 42 characters in book order, one book per commit, each following its `voiceNote`;
the remaining 8 item descriptions (the Crown has no wiki quotation and needs the book); the
System-card visuals, as their own design.
