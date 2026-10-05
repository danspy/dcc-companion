# The recap: an entry's story so far, told short — design

A reader who long-presses *Carl* on a Kobo in book 4, chapter 6, gets today the last twelve of
his 119 beats, in full, in his own voice. That answers "what did he just say"; the reader asked
"who is this and what has happened to him". This design adds the answer as content — a short
paragraph per book and a one-line gist per beat — and gives the KOReader plugin two screens:
the recap a tap opens, and *the whole crawl so far* one button away, with connections that
navigate.

Two sub-projects, each its own plan:

- **A — the recap as content**, in `dcc-companion`: the fields, the lint, the build, the
  drafting scripts, the entity-page block.
- **B — the plugin's screens**, in `dcc-companion` (the export) and `dcc-companion-koreader`
  (the plugin). B needs A's *shape* on day one and A's *prose* only at release.

The iOS app is not in this design. Its export is untouched (the app ignores a field it does not
know), and wiring the recap into it is a task in that repo once A has shipped.

## What the reader gets

**Tap Carl at 4:6:**

```
Carl
Protagonist
I'm Carl. I'm twenty-seven, I did a stint in the Coast Guard, and I fix …   ← the tagline

Book 1
Carl goes out into the freezing dark after his ex's cat … (2–4 sentences)

Book 2
…

Book 3
…

Book 4 · so far
Ch 1 — The stairwell drops them into a sandstorm and an achievement.
Ch 2 — The Grull achievements pay out; being stepped on by a god earns a …
Ch 3 — …
Ch 4 — …
Ch 5 — …
and 1 entry in this chapter

*** Sealed *** 272 more entries. The next when you reach Book 4 · Ch 7.

[ The whole crawl for Carl so far ]   [ Close ]
```

**The whole crawl for Carl so far:** the System's description where there is one, then every
beat the reader has reached, in voice, with its stamp, chronological, then the sealed line.
Buttons: **Connections · N**, Back, Close.

**Connections:** one row per relation the reader has reached — `Princess Donut — partner`, the
stamp at the right, the relation's note under it. Tapping a row opens that entry's recap. Back
returns.

The site's entity page shows the same recap block, composed by the same rule, between the
description and the log.

## Sub-project A — the recap as content

### Two fields

**`recap`** on an entity, in `data/entities/*.json`: a list of steps, one per book the entry
has a beat in, each telling **that book only**.

```json
"recap": [
  { "at": "1:end", "text": "Carl goes out into the freezing dark after his ex-girlfriend's cat …", "confidence": "draft" },
  { "at": "3:end", "text": "…", "confidence": "draft" }
]
```

- `at` is always `N:end`. A paragraph about a book is a summary of a span, and the summary rule
  says it unseals at the end of that span. No other form is accepted.
- A step exists only for a book the entry has at least one beat in. No step, nothing to say.
- 2–4 sentences, at most 80 words. The narrator's third person, present tense — the voice the
  headlines and the floor recaps already use. It is a summary, and summaries here are the
  narrator's; a confessional summarising itself reads oddly and the model lapses out of voice.
- `confidence` is the existing `verified | draft`. A step is born `draft`.

**`gist`** on a beat: one sentence, at most 18 words, same voice, restating the beat.

```json
{ "at": "4:1", "kind": "arc", "headline": "Every bounty on me, doubled",
  "text": "The stairwell drops us into a sandstorm and an achievement. …",
  "gist": "The stairwell drops them into a sandstorm and a Quarry achievement; every bounty on Carl is doubled.",
  "confidence": "verified" }
```

A gist is gated by the beat's own `sortKey`, which already exists; it needs no gate of its own.
Its review state is separate from the beat's — a drafted gist on a verified beat must not make
the beat draft — so a beat gains two fields: `gist`, and `gistDraft: true` while the gist is
unread. The lint counts `gistDraft` beats in the work queue alongside draft beats; the page shows
the `unverified` chip on the gist line, not on the beat.

### The lint — all errors

| rule | catches |
|---|---|
| `recap[].at` is not `N:end` | a recap gated anywhere but a book's end |
| two steps for one book, or steps out of book order | a duplicated or shuffled list |
| a step for a book the entry has no beat in | a paragraph written from nothing |
| a step before the entity's own `revealedAt` | the story before the introduction |
| forward phrasing, in a recap or a gist | *"later"*, *"by the eighth"*, *"ends up"* — the existing heuristic, no exemption list |
| forward reference, in a recap or a gist | a name revealed after the text's own gate — the existing rule, floors and capitalised aliases included |
| **faithfulness** | see below |

**The faithfulness rule.** Model-written text enters a project where every sentence has been
read against the book. The rule that makes that tolerable: a text may name only what its
sources name.

- A **recap step's sources** are the entry's own beats in that book (headline and text), its
  taglines and descriptions at or below the step's gate, and its name and aliases.
- A **gist's sources** are its own beat's headline and text, and the entity's name and aliases.
- Every capitalised word in the text that is not at the start of a sentence, and every token
  containing a digit, must occur in the sources (as a whole word, case-sensitively for the
  capitalised ones). *"Carl"*, *"Quarry"*, *"doubled"* pass for the beat above; *"Donut"* in that
  gist fails, because that beat does not name her.
- Like the forward-phrase rule it will flag honest sentences (a sentence beginning with a
  name is unchecked; a mid-sentence "System" in a beat that said "the AI" fails). Those are
  reworded. **There is deliberately no exemption list**, for the same reason the phrase rule has
  none.

`check-facts.mjs` reads recap and gist text like a tagline, against the edition. The lint's
work queue lists `draft` recap steps and `gistDraft` beats.

### The build and the snapshot

`build-content.mjs` resolves each step's `sortKey = parseAt(at)` and writes
`entities[].recap: [{ at, sortKey, text, confidence }]` into the snapshot; `gist` and
`gistDraft` ride on the beat row. `db/config.ts`: `Entity.recap` is a JSON column like
`taglines`; `Beat.gist` is text, `Beat.gistDraft` a boolean. The seed inserts in batches as it
does today. The staleness guard in CI is unchanged: the drafted text is committed under `data/`
and the snapshot must match it.

### One composition rule, two implementations

`storySoFar(entity, beats, gate, opts)` in `src/lib/story.ts` (importing `./progress.ts` by
extension, as the other modules do), and a pure Lua copy in `cc_gate.lua`, return the same
structure:

```ts
{
  books: [{ book: 1, text: '…' }, { book: 2, text: '…' }],   // every recap step with sortKey <= frontier, in order
  current: {                                                   // only when the frontier is inside a book
    book: 4,
    lines: [{ chapter: 1, gist: '…' }, …],                     // beats of that book with sortKey <= cut, one per beat
    earlier: 0,                                                 // lines folded away above `max`
    thisChapter: 1,                                             // beats at sortKey in (cut, frontier], counted only
  } | null,
  sealed: { count: 272, nextKey: 4007 } | null,                 // as the entity page shows today
}
```

- `cut` is the gate the gists are listed to. On the site it is the frontier itself: the position
  means "read up to and including". In the plugin it is `frontier - 1` when the chapter is
  above 1, because the plugin's position means "reading this chapter" and the reader asked for
  the previous one; the beats in (cut, frontier] are counted as `thisChapter` and never shown.
- `max` lines are shown (eight); the rest fold into `earlier`. Carl has 65 beats in book 8.
- A finished book (chapter 0 or `end`) has no `current`: its own paragraph is reached.
- A beat without a gist (while drafting is in progress) is listed by its headline.

`scripts/test-gate.mjs` imports `story.ts` and pins: which steps show at which position, the
previous-chapter cut, the fold, no `current` on a finished book, the sealed count.

### Drafting

Two scripts, same shape, under `scripts/`:

- `npm run recaps:draft` — `draft-recaps.mjs`: for every entity and every book it has a beat in,
  where no step exists (or `--redo`), one call to the model.
- `npm run gists:draft` — `draft-gists.mjs`: for every beat with no `gist` (or `--redo`), one
  call.

Both: `--entity <id>` and `--book <n>` narrow the pass; four calls in flight; one `fetch` to
`${OLLAMA_HOST}/api/chat` with `OLLAMA_API_KEY` from `.env`, `OLLAMA_MODEL` defaulting to
`gemma4:31b` — the pattern `src/lib/achievement.ts` already uses, no SDK. The key comes from the
server's `/etc/dcc-companion.env`, copied into the local `.env` by the owner.

**The prompt shows the voice rather than describing it** (the lesson from `/achievement`): three
worked recaps and three gists in the assistant's own turn, written for this spec from real
beats, plus the rules as a list — third person, present tense, 2–4 sentences / one sentence,
the length cap, name only what the notes name, never *book*, *series*, *later*, *the reader*,
never a floor name or a character the notes do not name, retell first-person text in the third
person. The user turn carries the entry's name, kind, role and aliases, and the beats (stamp,
headline, text) — one book's for a recap, one beat's for a gist.

**Screened, not trusted.** Each answer goes through the faithfulness and forward-phrase checks in
the script (the lint's own functions, imported from `scripts/lib/lint.mjs`, not a copy). A failure
is sent back with what was wrong — *do not use: Donut, 2,145* — up to three times; a fourth
failure writes nothing and lists the entry in the script's summary. What passes is written into
the entity JSON as `draft` / `gistDraft`. Then `npm run content:build` runs the whole lint over the
result, and `check-facts.mjs` reads it against the edition.

Estimated: ~900 recap calls and ~3,575 gist calls at 2–4 s each, four in flight — about an hour
in all, re-runnable, and a changed beat redrafts one gist and one paragraph.

### Review

Recaps for the main cast and the entries with the most beats — Carl, Donut, Mordecai, Katia,
and roughly the twenty next — are read against their beats in this pass and flipped to
`verified`. Everything else stays `draft` and shows the `unverified` chip until read; the chip
is the honest state, not a defect. Gists are read as their beats are revisited.

### The entity page

Between the description and the book chips: a `.sect` heading **So far**, one paragraph per
reached book under a `Book N` label, then **Book N · so far** with the gist lines and the
`thisChapter` count (which is 0 on the site, since the cut is the frontier — the line is
omitted when 0), then nothing: the sealed line already exists at the end of the log. A draft
paragraph carries the `unverified` chip. `check-pages.mjs` is unaffected — nothing here is
static copy. `npm run smoke` asserts the block on an entity page at a position with a reached
recap.

## Sub-project B — the plugin's screens

### Export

`scripts/lib/koreader-export.mjs`, per entity file `entities/<id>.json`:

- `recap: [{ key, book, text }]` — `key` is the step's `sortKey`, `book` the stamp's book.
- each beat gains `gist` (absent when the beat has none).
- `relations: [{ other, kind, note, key }]` — **both directions written out**: a relation
  `carl → princess-donut · partner` appears in Carl's file with `other: "princess-donut"` and in
  Donut's with `other: "carl"`, the same `kind` on both sides, as the site shows it. `kind` is
  exported as the display form (`killed by`, not `killed-by`). `key` is the relation's
  `sortKey`, which already waits for both ends' reveal.

`index.json` does not change: it is loaded on every lookup, and the recap and relations are
only needed once an entry is opened. `scripts/test-export-koreader.mjs` gains: relations
appear on both sides, `key` is a number everywhere, no tag string anywhere, a relation's `key`
is at least both entities' `revealedAt`.

### The gate, in Lua

`cc_gate.lua` gains:

- `story_so_far(entry, file, frontier, cut, max)` — the Lua copy of `storySoFar()`, same
  structure, `cut` passed in rather than decided here.
- `relations_for(file, index, frontier)` — the file's relations with `key <= frontier`, each
  resolved to the other entry's record from the index (name, role, kind), in `key` order. An
  `other` not in the index is dropped, not shown.
- `recap_text(entry, file, frontier, cut)` — the Recap screen's text, built from the above.
- the existing `popup_text` becomes `crawl_text(entry, file, frontier)` — description, **every**
  reached beat (no `LIMIT`; the viewer paginates), sealed line.

`cc_position` gains `previous_chapter(p)`: `frontier - 1` when `p.chapter` is above 1 and not
`END_OF_BOOK`, else `frontier`. The plugin passes that as `cut`.

### The three screens

| screen | widget | opened by | text | buttons |
|---|---|---|---|---|
| **Recap** | `TextViewer`, title = name | a hit, a Connections row | `recap_text` | **The whole crawl for {name} so far** · Close |
| **The whole crawl** | `TextViewer`, title = "{name} · the whole crawl so far" | the Recap's button | `crawl_text` | **Connections · N** (disabled at 0) · Back · Close |
| **Connections** | `Menu`, title = "{name} · connections" | the crawl's button | one item per relation: `text = "{other name} — {kind}"`, `mandatory = stamp of key`, the note as the item's second line (`multilines_show_more_text`, present on v2026.03) | tap → that entry's Recap; the Menu's own Back / close |

`TextViewer` takes `buttons_table` on both KOReader versions in use; `Menu` paginates on its
own. A disambiguation (`"Carl" could be…`) stays a `ButtonDialog` and lands on the Recap.
"Back" closes the current widget; the one beneath is still on the stack, so nothing is rebuilt.
Opening a connection's Recap pushes a new viewer; Close on any screen closes that screen only.
A reader who dives five connections deep comes back the way they went.

### Tests

`tests/test_gate.lua` gains `story_so_far` (the same positions `test-gate.mjs` pins, against the
fixture data, so the two copies cannot disagree), `relations_for` both directions and gated,
`recap_text` and `crawl_text` shape. `tests/test_main.lua` gains: a hit opens a TextViewer whose
`buttons_table` carries the crawl button; the crawl button opens a viewer whose Connections
button is disabled with none reached and enabled with one; a Connections row opens the other
entry's Recap. `tests/fixtures/data/` gains a relation and a recap step. The self-test logs the
Recap text for the probe instead of today's popup text.

## Order of work

1. **A1** — fields, lint, build, snapshot, DB, `storySoFar()` and its tests. No prose yet.
2. **B1** — export with `recap`, `gist`, `relations`; Lua gate functions; the three screens;
   tests. Verified on the macOS nightly with the self-test and on the Kobo. Ships with empty
   recaps: the Recap screen shows the tagline and the gist-less lines by headline until A2 lands.
3. **A2** — the drafting scripts, the pass, the review of the main cast, the entity-page block.
4. **B2** — `sync-data.sh`, a release, the Kobo.

## Not in this design

- The iOS app (its own task once A ships; `APP_SCHEMA` bump and a recap block on its entry page).
- A recap for floors, items' usage logs or awards beyond what `gist` gives every beat.
- A cumulative "everything so far" paragraph. The reader asked for a paragraph per book.
- Any change to `index.json` or to quick-find.
- Changing the Floating Dictionary's single-letter labels: that is its card, configurable only
  in its own menu.
