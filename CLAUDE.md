# Crawler's Companion — CLAUDE.md

## What this project is

A spoiler-gated reader's companion to Matt Dinniman's **Dungeon Crawler Carl**: the story so
far, every character, item, mechanic, faction and open thread — with each fact sealed until
the reader has actually read that far. Eight books, eleven floors published.

The gate is the product. Anything that leaks a fact ahead of the reader's position is a bug,
not a cosmetic issue.

## The frontier (the core idea)

A reading position is a **book plus a chapter inside it**, and both a position and a piece of
content collapse to the same scalar:

```
frontier = book * 1000 + chapter
visible  = frontier >= parseAt(content.revealedAt)
```

Curation writes reveal points as short tags so the JSON stays readable:

| Tag | Means | Value |
|---|---|---|
| `"4"` | anywhere in book 4 | 4000 |
| `"4:12"` | book 4, chapter 12 | 4012 |
| `"4:end"` | once book 4 is finished | 4999 |

**A book-level tag is just chapter 0**, so it lands in the same comparison as a chapter-level
one. That is what makes the curation incremental: tag everything at book granularity first
(cheap, complete), then refine hot entries to chapters later without rewriting the gate.

### An unspecified chapter means *finished*, not *just started*

`frontierOf` reads a reader position of "book 5, no chapter" as **book 5 finished**, and the
last chapter of a book resolves to the same value as `:end`. This is the one piece of the
arithmetic that is a product decision rather than a mechanical one, and it is load-bearing:
"I'm on book 5" in normal speech means five books read, and the opening default — book 1, no
chapter — has to unseal all of book 1 and nothing beyond it. Naming a chapter is how a reader
says "actually, I'm only partway".

Get this backwards and the first-visit page seals everything, because every entity is now
chapter-tagged. There is a test pinning it.

### Gate inheritance runs in the build, never in a view

`build-content.mjs` resolves each beat's `sortKey` to `max(beat.at, entity.revealedAt)` and each
relation's to `max(relation.at, from.revealedAt, to.revealedAt)`. **Views compare `sortKey`, not
the raw tag.** A book-level beat sitting under a chapter-level entity is therefore floored
automatically (a warning, not an error); a beat in an *earlier book* than its entity is a real
curation mistake and fails the build.

`src/lib/progress.ts` is the only place this arithmetic lives. `scripts/lib/gate.mjs` is a
deliberate pure copy for the build scripts, and `npm run test:gate` drives both.

### Books gate. Floors navigate.

**Floor 7 (The Great Race) straddles books 5 and 6** — it opens at the close of *The Butcher's
Masquerade* and resolves at the start of *The Eye of the Bedlam Bride*. A floor-based gate
would therefore leak. Floors are how the story is shaped and how the reader browses it; the
book is what a reader knows they have finished. Do not move the gate onto floors.

### A floor has two reveal points, not one

This is the trap the design walked into once already. A floor's **recap** — the account of what
actually happened on it — is a whole-book spoiler, so tagging it at the book's start hands a
reader the end of the book they have just started. Floor 9 tagged `"7"` showed Katia leaving, the
tenth faction and the Larracos flood to someone one chapter into *This Inevitable Ruin*.

So each floor carries:

| field | unseals at | contains |
|---|---|---|
| `premise` | `revealedAt` — where the crawlers **arrive** | back-cover level: what this floor is |
| `recap` | `recapAt` — where they **leave** | what happened, who died, what changed |

The boundaries come from the chapter summaries and are exact:

| Floor | Arrive | Leave | | Floor | Arrive | Leave |
|---|---|---|---|---|---|---|
| 1 | 1:2 | 1:29 | | 7 | 5:end | 6:1 |
| 2 | 1:30 | 1:end | | 8 | 6:1 | 6:end |
| 3 | 2:2 | 2:25 | | 9 | 7:1 | 7:end |
| 4 | 3 | 3:end | | 10 | 8:1 | 8:87 |
| 5 | 4 | 4:end | | 11 | 8:88 | 8:end |
| 6 | 5:1 | 5:end | | | | |

Floor 11 starting at **book 8 chapter 88** is why its name stays redacted for the first 87
chapters of that book. The lint fails the build on a recap gated before its floor, and on a floor
with no premise at all.

**The general rule: any field that summarises a span must be gated at the end of that span, not
the start.** If you add per-floor bosses, quests or events, they need the same treatment.

### Static copy in a page is ungated by construction

The other half of the same problem. However correct the data is, a sentence typed into an `.astro`
file is shown to everyone. The Position page once explained the gate with *"Floor 7 — the Great
Race — opens at the close of book 5"*, which handed a floor name to a reader on book 1.

`scripts/check-pages.mjs` (part of `npm run content:check`, so CI runs it) takes every entity and
floor name that is **not** safe at `1:1` and fails the build if it appears in page source. Three
details make it work rather than merely exist:

- **word boundaries** — without them "Tran" matches inside `transparent` and the check drowns in CSS
- **case-insensitive** — the copy that shipped said "the Great Race" against a floor named "The
  Great Race", and an exact match sailed past it
- **comments stripped first** — this codebase explains the gate in comments, which name gated
  things constantly and legitimately

Exemptions live in an `EXEMPT` array and each needs a written reason, because a strict check with
undocumented escape hatches is just the bug again.

**Keep implementation detail out of the app.** The Position page used to explain
`book × 1000 + chapter` and the reveal-tag syntax to readers. That belongs here, not in the
product; the page now says only enough to explain the numbers on it.

### The opening state reveals nothing

`DEFAULT_POSITION` is `{ book: 0 }` — **book 0 means the reader has told us nothing**, and
`frontierOf` short-circuits to `FRONTIER_NONE`. Every reveal tag in the data is at least `1:1`,
so a first-time visitor gets zero gated facts: no character names, no floor names, no arcs.

What they do get is the premise on the front page, which is back-cover material living in the
page rather than in the gate. That is the whole "general, nothing spoiler" surface.

Defaulting to book 1 (as this did) spoils book 1 for someone who has not read it. Clicking the
currently-selected book again clears back to unset, which is the only route home.

### A tagline is a summary, so it obeys the summary rule

This shipped badly. Taglines were written as whole-character one-liners and shown from the
entity's own reveal point, which meant Agatha's read *"Introduced as the mysterious one at Meadow
Lark. Nine floors later a warlord calls her an enemy to them all"* on a page that opens in **book
1, chapter 22**. Eighteen of eighty-nine were doing some version of this.

It is the same rule floors already follow — *a summary of a span must be gated at the end of that
span* — and taglines now work the same way. `tagline` is either a string (safe from `revealedAt`)
or a list of `{ at, text }` that supersede as the reader advances; `taglineFor()` picks the latest
one reached. Lucia Mar goes from *"Seen on the very first broadcast"* to *"…more than a hundred
thousand children in her body"* across four steps.

**Two lint rules now enforce it, both errors:**

- **Forward phrasing.** `"later"`, `"by the eighth"`, `"floors later"`, `"was killed"`, `"ends
  up"`, `"does not end well"` and friends, in a tagline or a beat, fail the build. It is a
  heuristic and it does produce false positives — three legitimate phrases had to be reworded.
  **That is the right trade and there is deliberately no exemption list**: this bug class has now
  shipped three times, and an escape hatch is how it ships a fourth.
- **Forward references.** Text may not name an entity revealed later than the text itself. This
  caught real ones the phrase check could not: a book-6 Donut beat naming Shi Maria (6:25), the
  Gate's operating notes naming the Nothing (4:24), and two book-1 beats naming *Dungeon Crawler
  World* three chapters before the text does.
  **Floor names and capitalised aliases are in the same list as entity names.** A floor's name is
  gated too, and "the Great Race" dropped into a book-4 beat leaks it exactly as a character's
  name would; the in-character rewrite made this urgent, because a speaker naturally names the
  ground under them. An alias leaks identically: "Katia" sat in Brynhild's Daughters' tagline
  from book 1 chapter 20, three chapters into book 2 before the reader meets her. Only
  *capitalised* aliases count — a lower-case one is a common noun phrase rather than a name, and
  gating *Dungeon Crawler World*'s alias "the show" would flag every honest sentence about the
  broadcast.

### Who speaks: three voices, resolved in the build

Character pages are written **in the character's own voice**, as a confessional to camera spoken
at the moment of the beat. A speaker at `1:7` knows nothing after `1:7`, which is the same
discipline the gate already demands, so the forward-phrase and forward-reference lints apply
unchanged and are easier to satisfy, not harder. Writing this way also surfaces beats that quietly
bundled later chapters into an earlier tag (a 5:1 beat that narrated 5:5); those get split.

`scripts/lib/voice.mjs` decides who speaks and `build-content.mjs` writes the answer into every
beat, so no view knows the defaults:

| voice | who | default for |
|---|---|---|
| `self` | the character, first person, present tense | every beat and tagline of a character who has a `voiceNote` |
| `system` | the AI, in the mono `*** ... ***` register the seals use | every `fate`; a whole page when a character has too few lines to voice honestly (`"voice": "system"` on the entity) |
| `narrator` | the wry third person | everything that is not a character |

A `fate` in `self` is a lint error: a dead crawler does not narrate their own death. Every
speaking character carries a `voiceNote` (register, tics, what they call people, what they never
say); it is committed as guidance and dropped from the snapshot. **A character without one stays in
the narrator's voice, fate included**, so the cast never shows third-person prose behind a
quotation mark while the rewrite is underway; the lint's "no voice note" warning is that queue,
and it is currently empty. Headlines are chrome and stay in the narrator's hand.

Every character carries a voice: of 143, **62 speak and 81 carry a dossier**. The dossier is the
honest answer when the books give someone almost no lines of their own — inventing a register for
them would be inventing character — and it is why a coverage sweep can add a bouncer, a conductor
and two racing drivers in one pass without inventing forty personalities. The first nine were
Agatha, Grimaldi, Ferdinand, Quan Ch, Bomo, Beatrice, Osvaldo, Firas and Vrah. Whole-page, never
mixed: a page that changes register halfway reads as a mistake.

**Items open on the System's own words.** `description` on an entity is the AI's verbatim text,
a string or a progressive `{ at, source, text }` list with exactly the tagline rules, shown above
the usage log with a `Bk b · c` stamp. Quotations skip the forward-phrase heuristic (the book's
own text says "eventually") and keep the forward-reference check. That is a rule about a category
of text; the deliberate absence of an exemption list for summaries stands. The Fandom wiki's item
pages carry these under an `AI Description` heading with chapter citations; quote the description
itself, short, never the narration around it.

### Finding things: the filter is safe because the page is

`/who` carries 243 entries, so it has a filter bar: a search box, six kind chips, and a
"met only" toggle. `/` focuses the box and Escape clears it. It is progressive enhancement —
with no JavaScript the page renders exactly as before.

**It filters the rendered rows rather than an index, and that is the whole security argument.**
A sealed row has no name, role or tagline in the document at all; it renders as blocks and
"Not yet met", so its `data-find` attribute is empty and no query can surface it. There is no
second copy of the data to gate and therefore no second place to get the gate wrong. A fresh
visitor has nothing to search, so the bar renders disabled.

Two details are deliberate rather than incidental:

- **Every count is of entries the reader has met.** "Characters 105" would tell someone on book 1
  how many people are still coming, which is the structural leak the sealed beat stamps were.
  The placeholder carries no total for the same reason.
- **Matching is at word starts.** `check-pages.mjs` learned this already: without a boundary
  "Tran" matches inside "transparent". So "ran" does not find Tran, which is correct — three
  letters means the start of a word.

### `/when` is the same set, laid along the crawl

`/who` answers *who and what*; `/when` answers *when, and with whom*. Same entities, same gate,
three layouts chosen with `?view=`:

| view | x | y | a mark is |
|---|---|---|---|
| `braid` | the crawl, in cumulative chapters | one lane per entry | a beat, in its book's colour |
| `grid` | floors reached | one row per entry | how many beats landed on that floor |
| `downstream` | — | the entry's relations, in the order they form | what happened at the other end |

**Arcs are relations, not co-location.** The xkcd narrative chart converges lines when characters
are together, and that is useless here: everyone descends together, so "same floor" is true of
almost everyone almost always. The relation graph is what actually carries *with whom*, so an arc
is a relation becoming true, drawn at the chapter it unseals. Downstream says in the page that a
relation is not a cause, because the data makes no causal claim and neither should the view.

**A book is as wide as it is long.** x is cumulative chapters, so book 2 is a quarter the width of
book 8. `src/lib/timeline.ts` owns that scale, the lane selection and the lane geometry, the way
`progress.ts` owns the frontier — three views draw the same picture and none may disagree about it.

**The view is in the URL and the SVG is server-rendered**, so the switch is three links and the
whole page works with no JavaScript. The script only *re-stacks*: hide a lane and the ones below
move up, and each arc is redrawn from `laneY` of its two lane ids. **There is no data island.**
That is deliberate — an embedded copy of the gated set would be exactly the second place to get
the gate wrong that `/who` is built to avoid.

**Only floors already arrived on get a column or a tick**, and every count is of entries with a
beat the reader has reached. A tick for floor 7 on a page opened in book 4 would say how many
floors are left.

### One component layer, or it stops looking like one site

`/when` was built with its own filter bar, its own tab strip and its own row
treatment, and it read as a different product bolted on. The fix was not to retune
its numbers but to move the shared pieces into `@layer components` in
`src/styles/global.css` and have every page use them:

| class | what it is | who uses it |
|---|---|---|
| `.finder` / `.finder-row` / `.finder-search` / `.chip-btn` / `.tally` | the search-and-chips panel | `/who`, `/when` |
| `.log` / `.entry` / `.stamp` / `.bk` / `.fl` / `.draft` | one beat, voice and all | `/entity/[id]`, `/when` |
| `.rels` / `.rel-kind` / `.rel-note` | the connections list | `/entity/[id]`, `/when` |
| `.pickrow` / `.kindtag` | one row of "pick this entry" | braid labels, grid rows, downstream picker |
| `.switch` | choose one of several views | `/when` |
| `.stage` | a chart beside a panel, split by a 1px rule | `/when` |
| `.floormark` | a floor's number on its book's colour | `/achievement` |

`src/components/BeatEntry.astro` is the same idea in markup: the entity page and
the `/when` panel render the *same object*, so a System beat is a `*** ... ***`
block and a character's own line carries the quote mark on both. Two renderings
of one row is how they drift.

**A view switch is the masthead's gesture, one level down** — mono, uppercase, a
border that appears when current — not a new tab system with a label under it.

**Two traps this pass actually fell into, both worth knowing:**

- **Generalising a rule loses the considered value.** `/who`'s search field is
  `--color-ink` *because* it sits inside a `--color-panel` box; moving it to a
  shared rule with `--color-panel` made the input vanish into the panel. When you
  lift a rule into the component layer, carry its reasons, not just its shape.
- **`flex-basis` is an axis, not a width.** `.finder` is a column on `/who`, so
  `flex: 1 1 300px` on the search made it 300px *tall*. Width belongs on
  `.finder-row .finder-search`, where the axis is horizontal.

**Check the pages you did not touch.** Both breakages above were on `/who`, which
this work had no business changing. `npm run check` will not catch a layout
regression; loading the other pages will.

### One type scale, because there were twenty-one sizes

`/when` alone had grown **21 font sizes and 6 letter-spacings**, most of them a
half-pixel apart and none of them meaning anything: 10, 10.5, 11, 11.5, 12, 13,
13.5, 14, 14.5, 15, 16, 16.5, 18, 19, 22, 27, 32… The scale in
`src/styles/global.css` replaces them with eight steps, each with one job:

| token | px | job |
|---|---|---|
| `--type-label` | 11 | mono labels, tags, stamps, column heads |
| `--type-ui` | 12.5 | mono chrome: the view switch, the masthead nav, counts |
| `--type-meta` | 13 | row names, notes, secondary prose |
| `--type-body` | 16 | reading text, long-form and in panels |
| `--type-lede` | 17 | standfirsts and taglines |
| `--type-entry` | 19 | a beat's headline |
| `--type-sect` | 22 | a section heading |
| `--type-title` | 28 | the subject of a panel |

Tracking is `--ls-wide` (.2em, the page eyebrow, used once per page) and
`--ls-label` (.1em, everything else). Two values, not six.

**The values are the site's own dominant ones, not new ones.** 16px prose and
22px section headings already existed on `/` and `/entity`; this makes them the
rule instead of one of five near-misses, so the pass is a consolidation rather
than a redesign of pages nobody asked about.

Three classes absorb what used to be copied:

- **`.sect`** — the gold section heading, which was written out three times
  (`/entity` h2, the `/when` panel h3, downstream h3).
- **`.label`** — a mono uppercase label. There were twenty-eight near-copies.
- **`.eyebrow`** — the page's own eyebrow, tracked wide, distinct from `.label`
  on purpose: one is page furniture, the other is component furniture.

Only one hard-coded size survives in the whole tree, the decorative quote glyph
in `.spoken::before`, which is an ornament rather than text. **If a new size
seems necessary, the element is usually wrong**; check what job it is doing
before adding a ninth step.

### One left-hand list and one head, three middles

The three `/when` views each grew their own chrome — three row heights, three
head treatments (the grid's was a `<thead>`, the braid's a panel-coloured strip,
downstream had none), and three ways of saying "this one is active". They ask the
same thing of the reader, so they share the same parts:

| part | file | used by |
|---|---|---|
| `StageHead.astro` | the pinned head: frozen "Entry" cell, slot for the rest | all three |
| `EntryRow.astro` | one row of "pick this entry" | all three |
| `EntryList.astro` | a column of those rows | braid, downstream |
| `.stagerow` / `.entrycell` | the frozen first column, in `global.css` | all three |

**This is why the grid is not a `<table>`.** A table brings its own head, and a
`<thead>` cannot be the same element as the braid's axis strip. Rows are flex
rows with an `.entrycell`, so the head and the frozen column are one
implementation rather than three that look similar on a good day.

Three numbers are shared and must move together: `--entry-col` (the left column),
`--head-h` / `AXIS_H` (the head, which the braid's axis is drawn to), and
`LANE_H` / `.pickrow` height (28px — the braid draws its lines against those
rows). Each pair is one number written twice; changing one alone bends the chart
out of line with its own labels.

### `npm run smoke` — because a green suite proved nothing

`astro check` reported **0 errors while `/when?view=braid` rendered nothing at
all**: a component used `AXIS_H` without importing it, threw at render, and Astro
served the rest of the page around the hole. The gate tests read data, the lint
reads data, `check-pages` reads source. None of them opens a page.

`scripts/smoke.mjs` fetches every route against a running server and asserts the
markers that prove its content was built — the braid's `<svg>`, the grid's rows,
downstream's chain. It sends a `dcc_pos` cookie, because every gated surface is
empty without one and an empty page would sail past a naive check.

```bash
npm run dev  &&  npm run smoke                    # https://localhost:4321
# or against the real build, which is what actually ships:
ASTRO_DATABASE_FILE=./.astro/build.db npm run build
ASTRO_DATABASE_FILE=./.astro/build.db PORT=4360 node dist/server/entry.mjs
npm run smoke -- --base=http://127.0.0.1:4360
```

**Verify layout against the built server, not the dev server.** `vite-plugin-basic-ssl`
mints a new certificate on every restart, so a browser has to re-accept the dev
origin each time; worse, the dev server will happily serve a *stale stylesheet*
after an edit, and this session twice diagnosed a layout bug that existed only in
that cache. The built server runs over plain HTTP and serves exactly what ships.

Verified red-green: remove that one import and `/when?view=braid` fails; restore
it and all seven routes pass. **Run it after any change to a view**, and never
report a page as working on the strength of a type-check.

### Two intrinsic-width traps, and they bit twice

- **An absolutely positioned child contributes nothing to its parent's intrinsic
  width.** Both the braid's axis and the grid's floor row started as
  `position: absolute; inset: 0` inside a `width: max-content` head. The head
  then stopped at the viewport while the rows below ran to their real width, so
  every column past the fold lost its heading and the head's ground ran out
  mid-table. Both are `position: relative` with an explicit width now. I fixed
  the braid and did not think to check the grid; look for the second one.
- **A row is the entry column plus the content columns.** `.gridbody` was sized
  to the floor columns alone, so every row overflowed its own body by
  `--entry-col`, and the head and the cells disagreed about where a column was.
  It is `width: max-content` now.

### Two flex traps the braid fell into

- **An SVG with a `viewBox` is a shrinkable flex item.** Without `flex: none` the
  chart is squeezed below its own width, and the SVG answers by *scaling itself
  down and centring the result* — which reads as a chart floating in the middle
  of an empty column, not as a sizing bug.
- **A sticky head must be `width: max-content`.** At `100%` it stops at the
  viewport while the chart under it runs to its full width, and the two x-scales
  drift apart: floor ticks stop sitting over the columns they name.

### Every view goes through the same wrapper

`/when` renders one `<div class="stage slab">` for all three views, with the
detail panel beside it for braid and grid and `data-panel="none"` for downstream,
whose middle is its own detail. **Downstream once rendered outside that wrapper**,
and so had no top gap, no fixed height, no border and no place for the reset
strip: one missing wrapper produced four separate-looking bugs. If you add a
fourth view, add it inside that branch, not beside it.

`EmptyState.astro` is the same idea for "nothing here yet": the panel and
downstream both use it, so the invitation reads the same in both.

**Delegate document-level listeners, don't bind to a wrapper.** Renaming
`.gridwrap` during a refactor silently unhooked every grid cell, and nothing in
`astro check` or the tests could notice. The cell handler is delegated on
`document` now.

**A selector for a class that does not exist fails silently too**, and it is the
same refactor doing it. `refresh()` collected the grid's rows with `.grid-row`
while the markup renders `.gridrow`, so the grid's filter list came out empty:
typing in the box hid nothing, the tally said `0 of 243 shown`, and clicking a
row closed its own card because the row counted as filtered away. Nothing threw.
When a class is renamed, grep the scripts as well as the styles.

### A swapped fragment is markup, and only markup

The detail panel showed **all 243 cards at once, invitation and all**, the moment
the reader switched view. It took four passes to find because every measurement
said the page was right: the correct card carried `.on`, the rows were filtered,
the URL was intact. The other 242 cards were simply also visible.

`DetailPanel.astro` set the class its own CSS keyed off — `one-at-a-time` — from
an inline script. **A script inside HTML parsed by `DOMParser` never executes**,
so the class arrived on the first load and never again.

The obvious repair introduced the second half of the lesson. Making the collapse
the CSS default and keeping the no-JavaScript fallback in a `<noscript>` *in the
same component* broke it differently: **`DOMParser` parses with scripting
disabled, so `<noscript>` contents are parsed as real elements**, and
`replaceChildren` then adopted that fallback `<style>` into the live document —
`.dcard { display: block !important }` switching itself on in exactly the
browsers it existed to sit out. Proven rather than guessed: after a swap,
`#stage style` held the rule and a plain card computed `display: block`.

**So a component the stage renders may reach its working state only through
markup and the page's own stylesheet.** Anything it needs doing on arrival goes
in `refresh()`, which runs on load and after every swap; anything conditional on
JavaScript goes outside `#stage`, where a swap cannot reach it.
`scripts/check-stage.mjs` fails the build on a `<script>` or a `<noscript>` in
any of the nine in-stage components, and runs in `npm run content:check` so CI
sees it.

### The filter is rendered, not just scripted

`/who`'s filter is pure progressive enhancement, and `/when` copied that — which
was wrong for a page whose own navigation is a fetch. The rows were always
rendered complete and hidden by the script afterwards, so **every route back into
the page painted all 243 rows**, and anything that stopped the script from
re-applying left the reader looking at the whole cast with a filter still showing
in the box. A reload, a shared link, a browser that refused a history write, a
fallback navigation: same result, and each one looks like "the filter broke".

So `when.astro` reads `?q` and `?kinds` on the server and stamps `hidden` on the
rows that do not match. The search box arrives carrying its value and the chips
arrive pressed. The first paint is correct with **no JavaScript at all** — which
is now a route in `npm run smoke`, asserting the stamps rather than trusting
them.

Three details make it hold together:

- **One predicate.** `findRe()` and `keeps()` live in `src/lib/timeline.ts`, and
  the page and the script both import them. Two copies would let the first paint
  and the first keystroke disagree about what matches.
- **Everything is still rendered.** Hiding, never omitting — the script un-hides
  when the reader clears the box, so a row that was never written could not come
  back. Same for the braid's arcs: an arc whose ends are filtered out is drawn
  and hidden, because `partnersOf()` reads connections off the arcs themselves
  and a missing arc would under-count what an entry is connected to for the rest
  of the session.
- **The braid is stacked server-side too**, with the same `laneY` the script's
  `restack()` uses, so the chart matches its own labels before the script runs
  rather than jumping when it lands.

`data-met` on the tally is an attribute now. The script used to read the total
back out of the tally's text, which broke the moment the server started
rendering "1 of 243 shown" into it.

### Nothing is open until the reader opens it

The panel starts empty with a line saying what to do, and the braid follows
nothing. Opening on the first entry put a page of somebody's life in front of a
question nobody had asked. **The open entry lives in the URL** (`?id=`), so
switching view keeps it, the view links carry it, and a link to what you are
reading is a link worth sending.

### One left-hand list, three middles

The three `/when` views each grew their own left column — different row heights,
different padding, three different ways of saying "this one is active". They all
ask the same thing (*here are the entries you have reached, pick one*), so they
share `src/components/EntryList.astro`: one row, one height, one active state.
A row is a `<button>` where the view handles the click in place and an `<a>` in
downstream, where the chain is rendered on the server; `.pickrow` styles
`aria-pressed` and `aria-current` identically, so they are indistinguishable.

**One row list, two things to hide.** The braid and downstream filter the row
itself; the grid's row is a whole strip of floor marks with the name as its first
cell, so hiding the name alone leaves a nameless bar of numbers behind. The data
stays on the row (`data-lane` / `data-kind` / `data-find`, written once in
`EntryRow.astro`) and `hideTarget()` walks up to the `.gridrow` when there is
one. Copying those attributes onto the wrapper instead would be the same three
strings in two files, drifting.

**`.pickrow` is 28px because `LANE_H` is 28.** The braid draws its lines against
those rows, so the two numbers are one number. Change either and the names drift
out of line with the chart. There is a test that would not catch this; the
alignment is checked by eye against `getBoundingClientRect`.

### Arcs answer a question, they do not decorate

Drawing all 300 relations at once buries every dot under a curtain of gold and
tells nobody anything, and this gets worse as coverage grows. So arcs are drawn
only for the entry being followed, and **following narrows the chart** to that
entry and the ones it connects to. Two consequences worth keeping:

- **The connected lanes are ordered by when each connection forms**, not by the
  list's usual order. An entry with twenty-six connections is a star, and every
  arc leaves the same row; in time order they fan out down the page and the shape
  of that entry's crawl becomes the thing you are reading.
- **The narrowing has to say so.** A strip above the chart names what is being
  followed and offers Clear, because a chart that silently hides 216 of 243 rows
  is a bug wearing a feature's clothes.
- **Each view arrives differently, on purpose.** The braid *narrows*; the grid
  *scrolls to the row*; downstream *stays at the top*. Downstream's list and its
  reading share one scroller, so scrolling to a name 200 rows down would carry
  the reading past its own opening, and the reading is the point of that view.
  Splitting it into two scrollers fixed that and broke something worse: the chain
  is most of the width, and with nothing open it had no overflow, so the wheel
  did nothing across almost the whole view. One scroller, and `revealRow` returns
  early when a `.chain` is present.
- **Where it does scroll, it scrolls the box and not the page.** `revealRow` sets
  the scroller's `scrollTop` rather than calling `scrollIntoView`, which scrolls
  every ancestor scrollport and would drag the whole document; it offsets by the
  pinned head, or the row lands underneath it.

The braid opens with nothing followed: 153 clean lines, no arcs. The panel opens
on the first entry so the page is never a blank shell.

### Strips scroll themselves; the page never does

The masthead nav wrapped on a phone and left "Position" orphaned on a second
line, which reads as a mistake rather than a menu. It is one row that scrolls
itself now, and so is the gate bar's row of book numbers. Three details make
that work rather than merely exist:

- **`min-width: 0`** on the strip. A flex item will not shrink below its content
  without it, so `overflow-x` has nothing to do and the content pushes the
  document wide instead.
- **`overscroll-behavior-x: contain`**, or a sideways swipe at the end of the
  strip turns into the browser's back gesture.
- **The scroll lives on the strip and nowhere else.** `overflow-x: hidden` on the
  page would hide the symptom while silently clipping everything else that
  overflows, and it would break the gate bar's `position: sticky`.

**A fixed grid minimum is a floor the page cannot go under.** `.grid-cells` asked
for `minmax(300px, 1fr)` inside a 272px column at 320px wide, and the document
itself scrolled sideways by 5px — the exact thing the strips were added to avoid.
`minmax(min(300px, 100%), 1fr)` keeps the intent and lets the last column
collapse to the room that exists. `.stats` on /progress had the same shape.

Checked by measuring `document.documentElement.scrollWidth - window.innerWidth`
on every route at 320, 390 and 768: zero everywhere. Do that after any layout
change; a 5px overflow is invisible until someone drags the page sideways.

**Two selectors named `.bk`.** The gate bar's book buttons and a beat's book
stamp. Both are scoped so nothing leaks, but a probe written against `.bk`
measures the wrong elements and reports a bug that is not there.

### Under 900px the chart says so instead of shrinking

The chart is a frozen 224px name column plus a drawing as wide as the story is
long. There is no honest small-screen version of that, so below 900px `/when`
renders the notice — *Eleven floors will not fit through a porthole, crawler* —
and a way to Who & What, and the entity pages stop offering **Trace … along the
crawl**. Both sides read the breakpoint from `.wide-only` / `.narrow-only` in the
component layer, written once: if the two disagreed, one of them would send a
phone to a page that tells it to go away.

Between 900 and 1180 the panel **narrows to 340px; it does not move**. Dropping
it under the chart made the stage two stacked scrollers inside a 60dvh box, so
the chart got half a view and the card you had just opened sat below the fold.
`[data-panel="none"]` outranks that rule, so downstream stays one column.

`!important` on `.wide-only` is deliberate. It has to beat a component's own
`display`, and an unlayered scoped rule outranks the whole component layer
whatever the specificity — the trap `.stage.is-full` already fell into.

**The markup is still sent.** SSR cannot know the viewport, so a phone downloads
the whole chart (1.2MB raw, 218KB gzipped) and hides it. Client hints or a
width cookie would fix it and cost a moving part; that trade has not been made
yet. `/who` is 185KB raw, 29KB gzipped, which is the page a phone is being sent
to anyway.

### The two pages point at each other

`/entity/[id]` offers **Trace {name} along the crawl**, landing on
`/when?view=braid&id=…` with that entry followed; the panel's *Open the full
page* is the return leg. One loop, both directions.

**The button is only drawn when there is a line waiting.** `lanesFor` draws an
entry that is revealed *and* has at least one beat the reader has reached — the
entity page already guarantees the first half, so it tests the second. Without
that check, someone whose entries are all still sealed lands on a chart with
nothing selected: a dead end wearing a button. At book 1 chapter 2, Carl gets
the button and Princess Donut does not.

### A connection is a move within the chart

In `/when`'s panel a connection switches to that entry **in the view the reader
is already in**: the braid re-follows and narrows to it, the grid scrolls to its
row, and the panel opens its card. The same link on `/entity/[id]` still goes to
the full page, because there is no chart there to move — `DetailPanel.astro` is
only rendered by `/when`, so the two behaviours cannot be confused for one
another and the entity page needed no change at all.

Four things keep it honest:

- **It is still a real `<a href="/entity/…">`.** Only a plain left-click is
  intercepted, so cmd-click, middle-click and no JavaScript open the full page
  exactly as before. Verified: a meta-click leaves the open card untouched.
- **Only when the entry has a line here.** A connection can name an entity the
  reader has met but has no reached entry for, so it has no lane to select; that
  link is left alone and navigates. This is why the handler looks the target up
  in `entryRows` before it calls `preventDefault`.
- **It picks by clicking the row.** `pickEntry()` calls `row.click()` rather than
  re-implementing what picking means — each view already defines that, and a
  second implementation would drift from it within a week. It then calls
  `revealRow`, so the row is somewhere the reader can see.
- **A filter that hides the target is cleared.** Asking for an entry the search
  currently excludes would otherwise close the card and look like a dead click.
  The explicit request wins over the filter.

### Nothing on this page reloads it

A page load to change one panel loses the picker's scroll position, the search
box and full screen, and it interrupts reading. Both navigations on this page are
therefore **a fetch of the same server-rendered HTML and a swap of one fragment**:

| gesture | fetched | replaced |
|---|---|---|
| a downstream pick | `/when?view=downstream&id=…` | `.chain` and the head note |
| a view switch | `/when?view=…` | the contents of `#stage` |

The URL is updated with `history.replaceState`, and nothing else moves.

The chain stays on the server on purpose. Rendering it on the client would need
the graph in the document — the data island this project keeps out — and
rendering all 243 chains server-side and hiding them is O(relations × beats) of
markup. Fetching one fragment costs a request and keeps the gate where it is.

**Both are still real `<a href>`.** The handler only intercepts a plain
left-click, so no JavaScript, a middle-click or a cmd-click all navigate exactly
as before. A failed fetch falls back to following the link. Proven by a sentinel
on `window`: after a pick or a view switch it is still there, so the document was
never replaced.

**The address bar is best-effort; a navigation is not.** `remember()` wrote
`history.replaceState` on every keystroke and wrote it *before* rewriting the
link hrefs — and Safari throws `SecurityError` past 100 history writes in 30
seconds (Chrome silently drops them). Once that tripped, the throw aborted the
rest of `remember()`, so the switch links were left at a bare `?view=grid`;
`swapView`'s `replaceState` then threw inside its own try, whose catch did
`location.href = link.href`, and the reader got a **full page load of the
unfiltered view — every entry, starting with Carl**, with the search box and
chips cleared. Three rules came out of it, and the third is the general one:

- **Every history write goes through `setUrl()`**, which swallows the throw. The
  view is already correct; the address bar is a convenience.
- **Links are rewritten first, then the address**, because links are what a
  click, a middle-click and a no-JavaScript reader actually follow. The address
  write is also coalesced (200ms) so typing cannot approach the quota.
- **Only a failed fetch may fall back to a page load.** The DOM work used to sit
  inside the same `try` as the fetch, which turned any small error into a reload
  that threw away everything the reader had set up. A reload is a worse outcome
  than the error it was insuring against — the fetch is in its own `try` now,
  and the swap runs outside it. `openChain` had the same shape and the same fix.

Verified by overriding `history.replaceState` to throw: with the old shape the
switch reloads and lands on 243 rows from Carl with an empty box; with the new
one the filter, chips and open entry survive all three switches.

**A view swap replaces the stage, so nothing may hold a node from inside it.**
Every collection the script works with — the rows, the cards, the arcs, the
panel, the strip, the Close button — is re-queried by `refresh()` after the swap,
and every listener is delegated on `document`. Two bugs came from getting this
half-right: the filter was not re-applied to the freshly rendered view, and
`#following` / `#exitfull` were destroyed by the swap because they live *inside*
the stage. The finder does not: it is lifted out first when full screen has moved
it in, then put back.

And **a stage swap re-runs the whole setup, in order**: `refresh()`, restore full
screen, `apply()` the filter, then re-open `chosen` and reveal its row. Skipping
`apply()` because the view "looks the same" is how the grid arrived unfiltered.

### The whole of the reader's setup travels in the address

`?view`, `?id`, `?full`, `?q`, `?kinds`. These are swaps rather than page loads
now, but the address still has to carry all of it: a reload, a copied link and a
no-JavaScript click are all real navigations, and anything held only in a
variable is thrown away by them — which is how full screen used to end the moment
you picked another entry.

Two rules keep it honest:

- **Every link that reloads this page carries the state**, not just the view
  switch: `remember()` rewrites `.switch a` *and* `a.entryrow`, because
  downstream's picker links were rendered server-side before the reader touched
  anything. A picker link keeps its own `id` and takes the rest.
- **Full screen is server-rendered from `?full=1`**, with an inline script
  locking the page before paint, so a reload does not flash out of it.

### Chosen is not the same as shown

A search that hides the open entry closes its card — but it must not *un-choose*
it, or clearing the search would not bring it back and the address would quietly
forget where you were. `chosen` is what the reader picked; the card and the
braid's narrowing are what can currently be displayed. Only Escape, Clear, or
picking something else changes `chosen`.

This also fixed a subtler bug: the strip read the open card while the chart
narrowed on a separate `focus`, so a filter could close the card and leave the
braid narrowed with nothing naming what it was narrowed to.

### Full screen moves the controls, it does not draw new ones

Entering full screen relocates the real `.finder-wrap` node into `.stagemain` and
puts it back on exit. Same element, same listeners, same state — a second copy
of the search and the view switch would be two things to keep in step, and they
would drift within a week.

### The stage is 60dvh, and full screen is the deep dive

`.stage` is `60dvh` — it is one section of a page, not the page — and sits in the
site's own `.wrap` column so it does not read as a foreign wide slab. **Full
screen** takes the same component to `100dvw × 100dvh` (`position: fixed`,
`.is-full`), locks the page behind it so closing lands you where you were, and
closes on the Close button or Escape. The control is pushed away from the view
names with `.push-end`: it is not a fourth view, it is what size the current one
is.

**A scoped rule beats a layered one, whatever the specificity.** `.is-full`
originally failed to reach the top of the window because `when.astro`'s scoped
`.stage { margin-top: 22px }` is *unlayered* and so outranked
`@layer components .stage.is-full { margin: 0 }`. The stage's height, spacing and
full-screen override now live together in the layer; the page only sets its
column split. If a component-layer rule mysteriously does nothing, look for a
scoped rule on the same class.

### One head, whether it names books or floors

The braid's axis names books and the grid's head names floors, and they had
drifted apart: a 13px stamp against a 19px one, a mono name against a body one.
They are the same object — a number on its own colour with a name under it — so
they share `.headstamp`, and only the alignment differs, because a braid band is
as wide as its book is long while a grid column centres.

`--head-h` (96px) and `AXIS_H` in `src/lib/timeline.ts` are one number written
twice: the head has to fit the stamp plus **two** lines of `--type-meta`, because
the two shortest book titles need the second line. At 84px they clipped mid-word.

### The stage scrolls inside itself

`.stage` is a fixed box — 60dvh, or the window in full screen — and every part of
it scrolls internally: the chart both ways, the panel vertically. Nothing about
the view is allowed to scroll the document.

The braid's axis is a **separate, pinned SVG** above the lanes drawing, and the
name column is `position: sticky; left: 0` — the same frozen-header pattern the
grid's first column already used. That is why `laneY` no longer adds `AXIS_H`:
lane 0 starts at the top of a drawing that no longer contains the axis.

The grid sizes to its content (`width: max-content`) and scrolls, rather than
stretching eleven columns to fill the stage and crushing the floor names.

### The reading column is the site's, the chart is wider

The masthead and footer are `.wrap` (1080px). `/when`'s head, switch and finder
match them; only `.stage` bleeds out to `.wrap-wide`. A page whose *heading* starts
180px left of the brand above it reads as broken rather than wide.

### `src/lib` imports name the `.ts` extension

`scripts/test-gate.mjs` imports `src/lib/timeline.ts` directly under `--experimental-strip-types`,
so the lane rules are tested rather than trusted. Plain node ESM will not resolve an extensionless
specifier, which is why `timeline.ts` and `spoiler.ts` write `./progress.ts`. Keep new imports in
`src/lib` that way. `KIND_ORDER` moved to `src/lib/kinds.ts` for the same reason: the ordering is
needed without dragging in `astro:db`. This is also the road out of `scripts/lib/gate.mjs`, which
exists only because the build scripts could not import the real thing.

### Structure leaks, not just prose

A sealed entry used to render its own stamp: `Bk 7 · Fate · Floor 9`. That tells you the
character dies on the ninth floor without opening anything, and four of them tells you the shape
of the rest of their story. Two rules came out of it:

- **No `kind` label on a beat.** `origin` / `arc` / `use` / `fate` still exist in the data and
  still decide which section a beat lands in, but "Fate" is never rendered. The word itself is a
  spoiler.
- **Sealed beats collapse into one line.** Beats arrive sorted by `sortKey`, so everything still
  sealed sits at the end; the page shows a single "N more entries, the next when you reach X"
  instead of a stack of stamped placeholders. The count is all a reader needs.

The same reasoning already applies to relations, which have always been summarised as a count.

### `astro check`, not just `tsc`

`tsc --noEmit` does not look inside `.astro` files. When `npm run check` was first added it found
three real errors sitting in the tree — including a `prefs.finished` reference left behind when
that field was removed, which had been silently evaluating to `undefined`. It runs in CI now.

### Three states, and the middle one is the point

| `spoilers` | Progress | Behaviour |
|---|---|---|
| off | — | everything shown |
| on | **none** (book 0) | nothing gated at all; only the front-page premise |
| on | some | revealed up to the frontier |

**A list of names is not a spoiler; what happens to them is** — but that only holds once the
reader has said where they are. With no position recorded, even the names stay shut, because a
name is a spoiler to someone who has not started. That is also why `/entity/[id]` *redirects*
rather than rendering a redacted page for an entity the reader has not met: the URL alone would
confirm the name.

### Places are not floors, and a name is not its substance

`place` is a kind of its own: a city, a castle, a district, a dimension — somewhere **on** a
floor. Floors are the spine, live in `books.json`, are numbered, and carry a premise and a recap.
Larracos earned the kind by being named in four beats with nowhere to point.

Adding an entity late in a project surfaces a specific problem: **a name often reaches the reader
long before its substance does.** Sheol is a component in a bomb's description at 2:25 and a demon
realm in book 6. Changeling is one word of Mordecai's at 1:29 and a population under torture in
book 4. The Nagas are a word in an insult at 1:43, bankrupt showrunners in book 2's epilogue and a
fleet in book 7. Rosetta Thagra is a note in the Cookbook's bomb chapter at 3:13 and a presenter in
book 6.

In every case the entity **reveals where the book gives the reader the word**, and everything
about what it *is* sits in beats at its own later tag. Tagging the entity at its substance instead
would retro-seal text the reader has already read, and the forward-reference check would fail the
build on the older entry — which is how each of these was found.

### The first mention is read off the book, not the wiki

`npm run content:anchors` reads the edition's full text when `data/index/books/` is on disk
(`node scripts/fetch-books.mjs`) and falls back to the wiki's summaries when it is not. The first
full-text pass found **sixteen entities tagged before the book names them**, and the pattern is
the thing worth knowing: the wiki names people *retrospectively*. Its summary of 1:14 says "Kevin"
where the page says "the orange, four-eyed, lizard-like creature"; he is "the recap guy, whose name
was apparently Kevin" at **4:26**. Florin is "a guy with an alligator head" at 2:14 and named on the
2:end leaderboard; Bianca is a goat on a recap in book 2 and named in book 5. Hekla and Brynhild's
Daughters are not in this edition's 1:20 recap at all — they arrive at 1:39.

The same pass found **wiki facts filed under the wrong chapter**, which the forward-reference lint
then chased into other entities: the Nagas' failed season and the 2,145 Celestial boxes are Odette
in book 2's epilogue, not a 1:5 aside; the Cookbook's 3:8 beat said Rosetta "turns up hosting Shadow
Boxer", a book-6 fact; a 1:36 beat listed Shadow Boxer (6:7) and the Blood Hunter (book 7) as shows
Zev arranges. And a character is spelled **Menerva** in the edition, not Minerva.

Moving a tag *earlier* is not free: a plain-string tagline is shown from `revealedAt`, so pulling
an entity back to its first passing mention needs a first tagline written for that mention. The
checker's LATE list is that queue. Its `REVIEWED` map holds tags read and settled, each with a
reason, keyed on the tag so moving it re-opens the question.

### A sentence nobody wrote still has to pass the gate

`/achievement` is the one page whose text no curator wrote and no lint read: a
reader types what they have just done — *burned the lasagna and blamed the dog* —
and the System grants them an achievement for it, in the mono register the seals
already speak in. It is a joke generator, and it is also the only surface here
where a spoiler can be *composed at request time*.

So the gate is applied twice, on both sides of the call:

- **Going out**, the prompt is built from entities at or below the frontier,
  each with the tagline the reader has reached (`taglineFor`), and the System is
  told it may name those and nothing else. A book-8 reader gets *"Even Ferdinand
  would find your performance lacking"*; a book-1 reader asking the same thing
  gets *"a pedigreed tortoiseshell"* and no name at all.
- **Coming back**, `src/lib/leak.ts` screens the reply and a candidate naming
  anything sealed is thrown away and asked for again. Asking a model nicely is
  not a gate. The screen is.

**`revealedAt` is a tag, not a number.** `gate.frontier >= e.revealedAt` compares
a number to `"4:12"`, which is `false` for every entity, forever — the System
would have been handed an empty world and nobody would have seen an error. Use
`reveals(gate, …)`, which parses it. This one was caught by `astro check` only
because the column type disagreed; the arithmetic itself would have run silently.

#### The screen's three matching rules are each a bug already paid for

| rule | why |
|---|---|
| multi-word names match **case-insensitively** | "the Great Race" against a floor named "The Great Race" — the leak `check-pages.mjs` was written for |
| single-word names match **case-sensitively** | Milk, Rust, Ruby, Ping, Feral, Justice and Guilds are all entity names *and* ordinary English words. "burnt the milk" is not a reveal of Milk (3:27) |
| lower-case aliases are **skipped** | straight from the lint: a lower-case alias is a common noun phrase. Screening "the show" rejects every honest sentence about the broadcast |

Word boundaries throughout, or "Tran" matches inside "transparent" and every
candidate is rejected forever. Names under four characters are left alone, the
same line `check-pages.mjs` draws.

Two exceptions are deliberate. **The premise names are never a leak** — Carl,
Donut, Borant, the Syndicate — because the front page prints them to everyone as
back-cover material, which is the same argument as the documented exemption in
`check-pages.mjs`. And **a name the reader typed themselves is not a reveal**:
without that, anyone who writes "I drank milk" or "I met Signet" can never be
granted anything, because every candidate echoes their own words back and is
refused.

#### Two screens, two severities, and they must not share a consequence

Two more screens catch what the prompt bans and the model does anyway. One is
the citation naming the box printed beside it — *"a Gold Box level of
insignificance"* — where only the full `<tier> Box` form is screened, because a
silver lining and a gold star are ordinary English. The other is the tic: the
System narrating its own paperwork — *"the dungeon logs this"*, *"your audacity is
noted"* — which is the System talking about itself in the third person.

It is **not** treated like a leak. A sealed name can never be shown, so running
out of attempts fails the request; a graceless draft is only a flat joke, so the
loop keeps the first clean-but-blemished candidate and returns it rather than
refusing the reader an achievement. Collapsing the two into one `continue` is how
a cosmetic rule starts costing people the feature.

#### The model is chosen, not assumed

Benched across every model the key reaches, on the one thing that is actually
hard here — holding a voice for three sentences. `gpt-oss:120b` and
`nemotron-3-super` both kept lapsing into the third person (2/5 and 1/5);
**`gemma4:31b` did not do it once and was the fastest of the three**, at ~1.8s.
It is the default for that reason and `OLLAMA_MODEL` overrides it.

Worth knowing for any future pass: **describing a register gets a description of
a register back.** The first prompt explained the System's voice at length and
produced five identical citations, all of the form "The dungeon notes this as
trivial". Adding three worked examples in the assistant's own turn is what
produced *"a single, very organized peppercorn"*. Show the voice; do not
characterise it.

**The house sets the odds.** The box tier is drawn server-side and handed to the
model, never chosen by it — ask a model to pick a rarity and everything is
Legendary by Thursday. Celestial sits at 0.3% because the books put 2,145 of them
in the whole history of the show.

#### The foot thing is a voice trait, so it needs no gate

The AI's interest in bare feet is one of the show's oldest running gags, and it
is the one piece of characterisation here that fires on the *reader's* words
rather than on the curation: a report mentioning feet, toes, socks or shoes gets
one short aside the System plainly should not have said with the cameras running,
and then it collects itself and finishes the citation. It reveals no event and
names nobody, so it works at every position including none.

Three things keep it a joke rather than a tic:

- **It is added per request, never standing.** Told to be interested in feet at
  all times, the model works them into reports about spreadsheets. The whole
  gag is that it cannot help itself when they come up.
- **Word boundaries, again.** `\bfoot\b` must not fire on *football* or
  *footage*, and `\bheels\b` must not fire on *wheels*. There is a test.
- **It is screened, not requested.** Asking lands it about one time in three
  when the mention is idiomatic — *"went to the bakery on foot"* came back with
  no lapse at all, twice running. `showsTheLapse()` requires two signals: foot
  vocabulary **after the idioms are stripped out** (otherwise the crawler's own
  *"on foot"* echoed back counts as a lapse), and a first person or a
  self-interruption, because a lapse is the System talking about *itself* in a
  paragraph otherwise addressed entirely to the crawler. Failing it is a
  blemish, not a leak, so it costs a draft and never the achievement.

The instruction rides with two worked examples, one of them deliberately
idiomatic, for the same reason the other three exist: describing a lapse in
composure gets a description of one back. Awkward and thirsty, never explicit —
the comedy is a galaxy-spanning intelligence that cannot be professional about
toes.

**An example close to something a reader might plausibly type gets handed back
verbatim.** The idiomatic example was *"went to the bakery on foot"*, and a
reader typing very nearly that got the example's own citation returned word for
word, two times in three. Examples must be reports nobody would actually file —
the current one is a cancelled dentist appointment — and the prompt says in as
many words never to reuse their wording, titles or rewards.

#### Length follows the report

Every citation came back the same short shape, because the brief said "two or
three short sentences, under 45 words" and a model reads that as a target rather
than a ceiling. It now scales: a thin report gets two sentences and about forty
words — saying there is nothing there, briefly, *is* the joke — and a report with
detail in it earns four or five sentences and up to a hundred, taking the
specifics apart one at a time with the verdict last. Explicitly: never pad a thin
one to reach a length, never compress a rich one to escape one.

#### It is a page first and an enhancement second

The form is a real `POST` to `/achievement` and the card is server-rendered
either way; the script only saves a page load and keeps the trophy case. **With
JavaScript off the whole feature works** — verified, not assumed — and the case
is the only part that is nobody's loss without it. The same rule as `/when`
applies: only a failed fetch may fall back to a navigation.

**A scoped style does not reach markup a script built.** The trophy-case rows are
created in JavaScript, so they never carry the `data-astro-cid-…` attribute Astro
stamps on elements written in the template, and every scoped rule missed them:
the rows rendered as run-together text with no gap, no padding and the wrong
face. They are `:global(...)` now. Scoped styling only reaches markup the page
actually wrote — the same shape of trap as the `<noscript>` in a swapped
fragment, one layer down.

The card is in `check-stage.mjs`'s list for exactly that reason: it arrives
through `DOMParser` like every in-stage component, so it may not carry a
`<script>` or a `<noscript>` of its own.

#### The voice was researched, not guessed

The first version of this prompt was written from memory and it was wrong in a
specific, measurable way. `npm run achievements:refresh` pulls the wiki's 151
achievement pages, 148 of which carry the System's verbatim award text under an
`== AI Description ==` heading with `{{cite|book|chapter}}` footnotes — the same
convention, and the same quoting rule, as an item's description. Reading the
corpus said:

| | corpus |
|---|---|
| second person | 100% |
| first person — the System says "I" | 34% |
| profanity | 39% |
| exclamation marks | 88% |
| a question aimed at the crawler | 32% |
| words | median **46**, p90 133, max 667 |
| opens "New Achievement! …" | 107 of 148 |
| reward is a joke or a refusal rather than a box | 50 of 148 |

Against which the shipped prose was formal, clean, uniformly medium-length, and
paid out "+1 Grip, -2 Charisma" every time. Four corrections came out of it:

- **The register is a foul-mouthed game-show host, not a bureaucrat.** *"You
  entered the dungeon wearing no pants. Dude. Seriously?"* — not *"a blatant
  disregard for ocular health"*.
- **Short is the default.** Median 46 words. But the p90 is 133 and the tail
  runs to 667, so roughly one in five should chase a tangent and come back to
  the award almost by accident. Uniform length was the actual problem, not
  short length.
- **The reward is where a third of the jokes live.** *"Bitches don't get
  rewards."* *"Yeah, no."* *"Your reward is that you're alive to read this."*
- **The foot gag is unashamed.** Podophilia!, verbatim: *"You've used your bare
  feet to crush and kill an opponent! Hey! That's my fetish. Seriously. Keep
  doing it, and you'll be rewarded."* The System does not get caught looking and
  recover its composure — it says it out loud on air and carries on. The
  earlier "— ahem" version was a politer joke than the books tell.

**The worked examples stay everyday, not dungeon.** `REGISTER` quotes four real
awards to set the voice; the few-shot pairs are ordinary reports, because
examples taken from the books teach the model to answer "I did the washing up"
with a citation about goblins.

#### The books' own awards are data, and they gate like everything else

`data/achievements.json` is committed — 146 awards with a reveal tag, a floor,
what earns them, the payout, who earned it and the System's own words **in
full**. 9,227 words, median 46 per award, longest 666.

It was a 70-word excerpt first, on the item-description rule that a quotation
should be short. That was wrong for these: **half the comedy is the System
wandering off** for four hundred words about 1970s record clubs and arriving
back at the achievement almost by accident, and an excerpt cuts exactly the
part worth reading. Every award carries a **link to the page it came from**
instead — attribution is what makes quoting whole defensible where trimming
was doing the work before. The gitignored corpus in `data/index/` still holds
everything the pull saw, including the five pages with no usable text.

Three gate decisions:

- **An award's name is a spoiler on its own.** "Apex Predator" says how a floor
  ends. So the name is screened alongside the body, and a sealed award is never
  listed by name — the tail collapses to *"133 more on record, the next when you
  reach book 1, chapter 6"*, exactly as sealed beats do on an entity page.
- **An uncited award gates at its floor's end.** 22 pages give a floor but no
  chapter. `"<book>"` would unseal them at chapter zero and hand a reader an
  eightieth-chapter award one chapter in, so the fallback is the floor's
  `recapAt` — the same "a summary of a span unseals at the end of that span"
  rule the floors themselves follow. They carry `confidence: "draft"` and the
  lint lists them.
- **A quotation that names someone unmet is tightened, not rejected.** Six do:
  a book-1 award whose reward line mentions Guilds (5:8), two naming Skyfowl,
  two naming a Fan Box. The award and our entity tag simply disagree about when
  a word first reaches the reader, so the award waits for it — `sortKey =
  max(own tag, everything it names)`, which is the rule relations already
  follow. The phrase heuristic stays off, because the book's own text is allowed
  to say "eventually".

A fresh reader sees none of it and **is not told how many exist**, which is the
same count rule `/who` follows.

**A floor number on the stamp is structure, and structure leaks.** This shipped:
the wiki files the *Loot* achievement — earned in **book 1, chapter 6** — under
the Ninth Floor, so a book-1 reader got `Bk 1 · Floor 9` and was told the ninth
floor exists. Exactly the bug the sealed beat stamps had when they read
`Bk 7 · Fate · Floor 9`, arriving from the other direction.

The fix is narrower than the first attempt, which is the part worth keeping.
Deriving every floor from the citation "fixed" it and overrode the page **42**
times, most of them boundary cases where the wiki was right — an award cited at
`1:30` is the chapter floor 2 opens, and the editors' answer that it belongs to
floor 1 beats the arithmetic. So the page's floor is kept wherever it is
*possible*, and overridden only where it would leak: four awards claiming a
floor the reader has not arrived at. **A lint rule now fails the build on any
floor stamp that outruns its own award**, and on a floor that does not exist.

That derivation is also why every award now has a floor at all: the ones showing
only a book had an infobox with no floor field, and the citation supplies it.

#### An unbreakable token drags the whole document sideways

Reported from a phone, and it was real: `/achievement` overflowed by **381px at
320 wide**, 311 at 390, and nothing at 768 — every other route was clean. The
probe that found it is worth repeating, because two obvious ones lied:

- **No element was wider than the viewport.** A text node overflowing its block
  does not widen the block's border box, so hunting for `rect.right > innerWidth`
  found only the masthead's navlinks, which live in their own scroll strip and
  were a red herring.
- **What actually showed it** was `scrollWidth > clientWidth` on every element:
  `.log` was 342 wide and scrolled to 676 while every child measured 340. That
  gap *is* the signature of text overflowing rather than layout being too wide.

The cause was a **460-character Etsy tracking URL** sitting in one award's
quoted text. MediaWiki writes external links as **single** brackets —
`[url label]` — and `clean()` only stripped double-bracket internal links, so
the URL rode straight through the pull into committed data.

Two fixes, and the second is the general one:

- **`clean()` strips external links**, and a lint rule now **fails the build on
  a URL in any award field**. A URL is never the System talking.
- **Every block rendering text this site did not author wraps defensively**
  (`overflow-wrap: anywhere`): the quoted award, the generated citation, the
  reward, and the reader's own filed report. **`anywhere`, not `break-word`** —
  only `anywhere` reduces the element's min-content contribution, so a single
  long token cannot force the column wide. `break-word` would still have left
  the parent stretched.

That second fix matters beyond the data, because `.grant-deed` renders **the
reader's own words**: 170 unbroken characters typed into the box was a layout
bug anyone could trigger. Verified at 320/360/390/430/768/1024/1280/1440 with a
book-8 position, so all 146 awards render — zero everywhere, including after
filing that 170-character word.

#### Who earned it, when, and in what order

A list of 146 awards in one fixed order is a wall. Three things fix it, and all
three come out of the same pull:

- **When** is the award's own tag, rendered `Bk 1 · Ch 2` — **not** its
  `sortKey`, which may have been pushed later so the award waits for somebody it
  names. When it happened and when you may see it are different numbers.
- **Who** comes from the page's lede and Story sections, which say it in prose —
  *"Carl and Donut both receive this achievement after…"* — because there is no
  `recipient` field: one page of 151 has one. The prose is matched against the
  curated cast, so a recipient is an **entity id** this site already knows how
  to gate and link, not a scraped string. Only sentences carrying a receive-verb
  are searched; matching names across the whole page would attribute an award to
  whoever happens to be mentioned in it, and the lede also says things like *"it
  is distinct from the Trailblazing Crazy Cat Lady Achievement"*. 131 of 146 get
  a name that way — Carl 130, Donut 22, then a long tail.
- **Sort** — When, Latest, Name, Floor, Box — using the `.switch` component the
  `/when` view picker already uses, because it is the same gesture.

The first pass found 131 of 146 and the gap was **my verb list, not the
source**: the wiki says *"Carl got the Molly Maguires achievement"*, *"issued to
Carl after fleeing"*, *"distributed to crawlers who discover a City Boss"* —
all receive-verbs, none of them "receives". Widened, plus two more readings:

- **Some awards belong to nobody in particular.** *"awarded to all crawlers upon
  entering the Fourth Floor"* is an answer, not a gap; three render as
  **Every crawler**.
- **Where no verb attaches, the subject of the sentence is the recipient.**
  *"Carl discovered the Level 85 Elite City Boss, Ringmaster Grimaldi"* is
  Carl's award, not Grimaldi's — so it takes the **first** cast name in the
  first sentence naming anyone. Requiring a single name declines it; taking
  every name credits the boss.

That is 137 named + 3 everyone. **The remaining six stay blank on purpose**: the
source genuinely does not say who earned them, and inventing a recipient is the
one thing the curation rules here forbid.

Two rules this inherits rather than reinvents:

- **An award waits for whoever earned it.** The name is printed on the row, so
  the award cannot surface before the reader has met them — the same inheritance
  a beat gets from its own entity, matched by id rather than regex so it is
  exact. A recipient who is not an entity is a build error, like a relation
  pointing at nobody.
- **The order is rendered, never only scripted.** `?sort=` is a real link
  resolved on the server, so a reload, a shared link and a reader with no
  JavaScript all land on the right order — the lesson `/when`'s filter already
  paid for. `npm run smoke` asserts it.

**The sealed tail is always computed from the gate's order, never the displayed
one.** Sorting by name and then taking the last row as "the next one you will
reach" would be nonsense; the count and the *"next when you reach…"* line come
from `sortKey` whatever the reader is sorting by.

#### One number orders the row, and the same number labels it

Reported as "the achievements are not in timeline order, floors 3 and 4 mixed",
and it was two bugs wearing one coat.

**The first: the list sorted by `sortKey` while the row was stamped with its own
`at`.** Those are different numbers for eleven awards — `sortKey` is pushed
later when an award names somebody the reader has not met, so it waits for them.
A floor-1 award therefore sat in the middle of the floor-2 ones, stamped `Bk 1`.
Ordering `reached` by `at` leaks nothing, because every row in it is already
past the gate; `sortKey` still decides what is *sealed*, which is the only
question it answers.

**The second is not a bug at all, which is why it needed a design answer rather
than a fix.** The page's floor and the chapter citation disagree for **42**
awards — almost all by exactly one floor, and always the same direction: the
award is earned at the close of a floor and written about in the chapter the
next one opens. The wiki's floor is right about *where*; the citation is right
about *when*. A flat chronological list shows both and reads as a shuffled deck.

So **"When" bands by floor** — the floor's number on its book's colour, the
`.floormark` `/` and `/when` already use — and runs chronologically inside each
band. Nothing is reordered dishonestly and the wobble disappears, because the
two facts are now on different axes. There is no separate "Floor" sort any
more; that is what "When" is.

A band whose rows are all filtered out is hidden, on the server and again in
`refresh`, or a heading stands over an empty stretch.

#### Two inconsistencies this page introduced, and where they came from

Both were reported by eye, and both are the same shape: a component-layer class
used in a context it had not met before.

- **A chip may be an anchor.** `/achievement`'s tier chips are links so they
  work with no JavaScript, and `.chip-btn` had only ever dressed a `<button>` —
  so they picked up the base layer's hover underline while the identical chips
  on `/who` and `/when` did not. `.chip-btn` now opts out of underlining
  whatever element it is on, exactly as `.switch a` already did. Fixing it on
  the page would have left the next anchor chip to rediscover it.

- **`.floormark` was never finished.** It carried the display face, weight and
  line-height and nothing else — no size, no padding, no box — so it rendered at
  whatever size it happened to inherit, and this page was its first real user
  (the table above claimed `/` and `/when`, which was never true: `/` uses its
  own `.floorno` and `/when` uses `.headstamp`). It now takes its size, padding
  and minimum from `.headstamp b`, which is the same object drawn at the top of
  `/when`'s grid — verified identical at 19px in a 30×24 box.

**A related thing worth knowing rather than fixing:** the type-scale rule above
says only `.spoken::before` keeps a hard-coded size. That is no longer true —
`/progress`, `/who`, `/` and `GateBar` between them carry about twenty. They
predate this work and are left alone; the claim is the stale part, not the
pages.

#### A floor is a section you can shut

Ten floors of awards in one column is a scroll, so each floor is a `<details>`
— open by default, collapsible, with the floor's number on its book's colour
and a count. `<details>` for the third time in this page, and for the third
time because the browser already knows how to do it: click, keyboard, screen
readers and Find in Page all come free.

**The row treatment did not change, and nearly did.** Nesting the list inside a
section, I overrode `.log` with `background: transparent` — and that background
is not decoration: `.log` paints `--color-line` behind a `gap: 1px`, so **the
gaps are the divider lines between awards**. Setting it transparent silently
deleted every rule in the list. Only the doubled outer border needed removing,
because the section already draws one. When you nest a component-layer list,
override the one thing that is actually duplicated and nothing else.

Two things the filter has to do that are easy to miss:

- **A section with nothing left under it is hidden**, on the server's first
  paint and again in the script, or a heading stands over an empty stretch.
- **A search opens a section the reader had collapsed.** Otherwise the hit is
  invisible and the tally says two when the page shows none. Collapsing is only
  respected while nothing is being filtered.

#### The award filter is `/who`'s, and safe for the same reason

A search box, six box-tier chips and a tally, in the same `.finder` panel
`/who` and `/when` use. `/` focuses the box, Escape clears it.

**A sealed award is not in the document at all** — it has no row, no name and no
`data-find` — so no query can surface one. There is no second copy of the data
to gate and therefore no second place to get the gate wrong.

Four details carried over rather than rediscovered:

- **One predicate.** `findRe()` and `keeps()` live in `src/lib/awards.ts`, and
  the page and its script both import them. Two copies would let the first paint
  and the first keystroke disagree about what matches.
- **Rendered, not only scripted.** `?q=` and `?box=` are read on the server and
  the rows arrive already stamped `hidden`, the box carrying its value and the
  chips pressed. `npm run smoke` asserts the stamps rather than trusting them.
- **Hiding, never omitting**, so clearing the box brings a row back.
- **Every count is of awards the reader has reached.** A chip reading
  "Celestial 9" on a book-1 page would say how many are still coming.

The chips are real links that work with no JavaScript and toggle in place with
it; the address write is best-effort and wrapped, because the view is already
correct and the address bar is a convenience. And **every link that reloads this
page carries the whole setup** — sort, query and chips — or switching sort would
silently drop the filter.

#### The blank box is the hard part, so there is a button

Most people cannot produce a thing they did today on demand, and the placeholder
was doing all the work. **Surprise me** fills the report from
`src/lib/deeds.ts` — fifty everyday, deliberately specific things, because "did
some cleaning" gets a shrug back and "rearranged the dishwasher after someone
else loaded it" gets a citation.

Three decisions worth keeping:

- **The server picks, not the script.** One source of randomness, no copy of the
  list in the document, and the button works with **no JavaScript** — which a
  client-side filler would not. With the script running, the field catches up
  afterwards from the card's own `data-grant`, or the box and the card disagree
  about what was just filed and a second press re-files the old one.
- **`formnovalidate` on the button**, or the `required` input blocks a submit
  that the server is about to supply a deed for.
- **Suggestions are about the reader's world, never the crawl.** That is what
  keeps them ungated: a suggestion is static copy shown to everyone at every
  position. Mind the vocabulary — Milk, Rust, Ruby, Ping, Feral and Justice are
  all entity names and `check-pages.mjs` matches case-insensitively, so "bought
  milk" in that file fails the build. A handful mention feet on purpose, so the
  running gag finds a reader who would never think to type *barefoot*.

**Achievements from the books are a different proposition and are deliberately
not here.** They are story facts: an award earned on the ninth floor is a
ninth-floor spoiler, so they would need curating into `data/` with reveal tags
like everything else, and most of them would be sealed for the reader most
likely to press the button. Writing them from memory would be inventing content,
which is the one thing the curation rules here forbid.

#### The case is an index that opens

Each filed award is a `<details>`: closed it is the tier, the name and what you
claimed to have done; open it gives back the citation and the reward in full.
It was a `title` tooltip first, which is unreachable on a phone and unreadable
everywhere else.

`<details>` rather than a button and an `aria-expanded` pair **because the
browser already knows how to do this** — click, keyboard, screen readers and
Find in Page all come free, and a script that is already rebuilding these rows
from storage has no business reimplementing a disclosure widget. The default
triangle is removed with `list-style: none` plus the WebKit pseudo-element, and
the `+` / `−` is drawn by the summary's own `::after` so it can sit at the right
edge.

These rows are built by the script, so **every rule here is `:global(...)`** for
the reason above: a scoped rule reaches only markup the page itself wrote.

#### The headline carries a beta tag

`/achievement` is the only page whose text nobody wrote and nobody read before
it shipped, and it is the only one that can be wrong in a way the lint cannot
catch. The tag says so. It is **blood, not gold** — gold on this site marks
things that worked — and it is sized off `--type-ui` and lifted onto the cap
line, because a label pinned to an 84px word cannot sit on the baseline.

#### There is no user data, and this does not add any

The trophy case is `localStorage`, capped at twelve, rendered with `textContent`
and never `innerHTML`. Nothing filed is written to the server, so the deploy
keeps its "nothing here is worth preserving" property and `prefs.ts` is still the
only seam where accounts would land. The endpoint is rate-limited in memory —
fifteen per ten minutes per address — which is all a single process needs.

## Content pipeline

```
data/books.json              books, floors, the book<->floor map
data/entities/*.json         characters, items, mechanics, factions, places, threads
data/chapters.json           chapter counts + titles   <- npm run chapters:refresh
        |  npm run content:build   (scripts/build-content.mjs — no network)
data/content.snapshot.json   reveal tags resolved to integers, committed
        |  db/seed.ts
data/dcc.db
```

`chapters.json` is the chapter spine — **472 chapters across the eight books, no gaps** — pulled
by `npm run chapters:refresh` from the Fandom wiki's per-book chapter tables. `books.json` does
not carry counts; `build-content.mjs` merges them in, so there is one source. A book missing from
`chapters.json` keeps a null count, which switches the chapter dial off for it.

The same refresh writes `data/index/summaries.json`, which is **gitignored on purpose**. Those are
the wiki's own summary sentences, kept locally as a curation aid for deciding where a reveal
belongs. They are not this site's content and a deployed page must not republish them.

The snapshot is committed, so a build is reproducible and a deploy needs no network. Re-run
`npm run content:build` after editing anything under `data/`, and commit both.

### The lint is what keeps the gate honest

`scripts/lib/lint.mjs` **fails the build** on:

- a beat that unlocks before its own entity (the reader gets the fact without the introduction)
- a beat whose declared `book` disagrees with its own reveal tag
- a relation pointing at an entity that doesn't exist
- an unknown entity kind, beat kind or confidence value
- a floor or beat referencing an unpublished book

and **warns** on draft content and missing chapter counts, which is the curation work queue.

**Gate inheritance** is applied in `build-content.mjs`, not in the views: a relation's
`sortKey` is `max(relation.at, from.revealedAt, to.revealedAt)`. So "Katia — used the Orchid
boon" cannot surface on a page a reader opens in book 2, whatever the edge itself says. No
view has to remember this.

### Beats are one table on purpose

A character's arc, an item's usage log and a mechanic's evolution are all `Beat` rows with a
different `kind` (`origin` / `arc` / `use` / `fate`). One query helper, one renderer, one
ordering path — instead of three near-identical sets. `use` beats are what make an item page
answer *where is this used, and when*; an item with only a description is a glossary entry,
not a companion.

### Voice: written from inside the crawl

Content describes events as events, in the dungeon's own vocabulary. It never says "in book 4
Carl does X", never "the series", never "four books later", and never addresses the reader. The
reader's position is the **gate's** job; the prose just tells them what happened.

That distinction is easy to lose, because curation notes and commit messages talk about books
constantly. The app's chrome may too — `Bk 4 · Floor 5` on a beat stamp is navigation. The body
text may not.

`npm run content:check` does not catch this; grep for `the series|the books?|books? (before|after)|
the reader` after a writing pass.

### confidence: verified | draft

`verified` means corroborated against a source during curation. `draft` means written from
reading knowledge and awaiting a pass against the book — it renders with an `unverified` chip
and is listed by `npm run content:check`. **Most of the current content is draft.** Curated
prose is written from knowledge, so the lint validates structure and never truth.

### Sourcing

The **Dungeon Crawler Carl Fandom wiki** is the one usable secondary source, and it is only
reachable through its MediaWiki API — `WebFetch` gets a 402, so pull raw wikitext with
`curl 'https://dungeon-crawler-carl.fandom.com/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&titles=...'`.

**`dcc.nospoilers.wiki` is a checklist, never a source.** It is a live spoiler-gated companion to
this same series, and it says of itself that it is AI-generated and may contain errors. Its numbers
bear that out: it puts book 2 at 61 chapters where the book has 25, and files entities at
coordinates like `2:57` in a book that ends at 25. What it is genuinely good for is a list of
**names** to go looking for — 7,154 of them, which is how the graph grew from 180 entities to 243.
Every name it surfaces gets verified against Fandom, and its reveal points are discarded entirely.

**`crawlerscookbook.com` and `dungeoncrawlercarlwiki.com` are not usable.** The first is openly
AI-generated with incomplete book 8 coverage; the second gave demonstrably wrong
character-introduction books. Curating from them produced four errors that the Fandom pull later
corrected — Katia's race and class (she is a **Doppelgänger / Monster Truck Driver**, not a
Changeling), Signet's book (**5**, not 4), the Crown of the Sepsis Whore's acquisition (**book 1**,
not 6), and the floor on which Carl and Donut pick classes (**3**, not 1).

**Even the Fandom wiki files events under the wrong book.** Its *Gate of the Feral Gods* page puts
the Larracos flood, the Syndicate lawsuit and Juice Box — all book 7 — under a "Book 4" heading.
Copying a wiki section's heading as a reveal tag would have leaked three books early. Read what the
prose actually describes, not the heading above it.

### Chapters are the edition's, not the wiki's

Chapter numbers follow the **Ace/Penguin edition** — the print and ebook most readers hold —
and the full text of all eight books sits in `data/index/books/` (gitignored, one plain-text file
per chapter, extracted from the owner's own library). It is a curation source, exactly like the
wiki summaries: **never committed, never deployed, never quoted beyond the short-quotation rule.**

The edition and the wiki agree everywhere but the end of book 5: the wiki numbers *The Butcher's
Masquerade* to 77, the edition to 75, because twice it runs as one chapter what the wiki splits in
two. `scripts/lib/edition.mjs` holds the map, found by reading the text against the summaries
event by event, and both wiki pulls (`chapters:refresh`, `achievements:refresh`) renumber through
it on the way in. A wiki chapter straddling two edition chapters maps to the **later** one. Edition
chapter 63 has no summary row of its own on the wiki, which the map declares rather than hides.

So a `5:NN` anywhere in `data/` is an edition chapter. A reveal point read off a wiki page for late
book 5 must be converted before it is written down.

The wiki's **per-book chapter summary tables** are the most valuable thing on it: they gave exact
chapter counts for all eight books and the anchors that turned book-level reveals into
chapter-level ones. Beware that **first mention in a summary is not first appearance** — the
Sepsis Crown's earliest hit is book 2 chapter 25, where it is *destroyed*, four books after Donut
puts it on. Treat an anchor as a proposal and read the surrounding summary before trusting it.

## Tech stack

- **Astro 6** — SSR (`output: 'server'`) + `@astrojs/node` standalone
- **Astro DB** (`astro:db`) — content only, re-seeded from the committed snapshot every build
- **TailwindCSS v4** via `@tailwindcss/vite`; tokens + component layer in `src/styles/global.css`
- **HTTPS in dev** — `basicSsl` + `security: { checkOrigin: false }` (both, always — the origin
  check rejects cross-site POSTs from the self-signed dev origin)
- **Ollama** for `/achievement`, and nothing else — one `fetch` to `/api/chat`, no SDK.
  `OLLAMA_API_KEY` in `.env` locally and in `/etc/dcc-companion.env` on the box; the key is
  the only secret this project has. Without it every other page is unaffected and that one
  degrades in character.
- Fonts self-hosted via `@fontsource`

There is **no user data in the database**. Reading position lives in one cookie (`dcc_pos`),
read by `src/lib/prefs.ts`. When accounts land, that module is the only thing that changes:
signed-in readers read from a separate persistent DB and guests keep the cookie, the same
two-database split `mcu-timeline` uses so a content deploy never touches a reader's progress.

Because the position is a cookie the *server* reads, the gate bar writes it client-side and
reloads. It is not an Astro Action — there is no mutation to validate yet.

## Design

Palette and typefaces are lifted from **mattdinniman.com**, which was the brief: Barlow
Condensed for display, Inconsolata for anything the System says, Open Sans for prose, on
`#131313` with the show's gold `#ffc10a` and blood-red `#e81514`.

### Book colours are the official ones, stated not guessed

`npm run colors:refresh` reads `mattdinniman.com/books/`, where **every book carries its own
colour**: a `.title-background` div, inline for most of them and via the theme palette classes
`has-contrast-1-background-color` / `has-contrast-3-…` for books 1 and 3. Both forms resolve
against the WordPress custom properties on the same page.

| Book | | Book | |
|---|---|---|---|
| 1 | `#ffc10a` | 5 | `#43ed1a` |
| 2 | `#f42bd0` | 6 | `#ed6f1a` |
| 3 | `#e81514` | 7 | `#1aedc2` |
| 4 | `#eaed19` | 8 | `#991aed` |

**A floor takes the colour of the book it is told in.** Floors 1 and 2 therefore match, as do 10
and 11 — that is the truth about them, not a collision to design around. Floor 7 is book 5's
green, because that is the book it opens in.

The script also picks each accent's **ink** (`#0e0e0e` or `#ffffff`) by contrast and refuses to
emit anything below 4.5:1, which is why the floor numbers on the red and the purple are white.
That is stored per book; nothing in the CSS assumes a light accent.

An earlier attempt extracted these from the cover art by decoding the PNGs and clustering hues.
It produced plausible colours and two collisions, and was entirely unnecessary — the values were
written in the markup the whole time. Look for the stated answer before computing one.

**Single-theme on purpose** — the show is broadcast out of a black box — so every colour is
painted explicitly and nothing borrows the host's ground.

Sealed content is **redacted, not blurred**: a blur invites squinting. It speaks in the
System's register (`*** Sealed *** That's above your pay grade, crawler.`), which is in
character rather than an apology.

## Commands

```bash
npm run dev             # https://localhost:4321 (self-signed — accept the warning)
npm run content:build   # rebuild data/content.snapshot.json after editing data/
npm run content:anchors # is every reveal tag where the book first names it? (full text if present)
node scripts/fetch-books.mjs [--no-fetch]  # the edition from the OPDS library in .env -> data/index/books/
npm run content:check   # lint only; prints the draft/chapter-count work queue
npm run achievements:refresh  # re-pull the awards + the voice corpus from the wiki
npm run test:gate       # frontier arithmetic + the lint rules

# Always build against a throwaway DB so data/dcc.db isn't half-written:
ASTRO_DATABASE_FILE=./.astro/build.db npm run build

# /achievement needs a key in the process environment, not just in .env — the
# built server reads process.env and does not load a dotenv file of its own:
set -a && . ./.env && set +a
```

> A schema change needs a full restart, and only one dev server may run against
> `data/dcc.db` — `astro:db` resolves its virtual module once at boot.

## Deploy

Live at **https://dcc.dev.innovativstud.io** on port 4336, the next slot after mcu-timeline.

Push to `main` deploys. `.github/workflows/deploy.yml` runs two jobs:

1. **check** — `test:gate`, `content:check`, and a **staleness guard**: it re-runs
   `content:build` and fails if `data/content.snapshot.json` comes back different, because a
   committed snapshot that no longer matches the curation would deploy content nobody wrote.
2. **deploy** — SSH to the box, `git reset --hard origin/main`, `npm ci`, stop the service,
   build, start, then poll `127.0.0.1:4336` for 30s before calling it green.

`git clean` is deliberately **not** run: `data/index/` holds the gitignored curation aids
(chapter summaries, the coverage ranking) which are expensive to re-fetch.

### Why this deploy is simpler than the other apps here

**Nothing on the server is worth preserving.** There is no user database — reading position lives
in the reader's own `dcc_pos` cookie, and `data/dcc.db` holds only content, re-seeded from the
committed snapshot on every build. The one thing on the box that is not in the repo is
`/etc/dcc-companion.env`, which holds the Ollama key; it sits outside the working copy precisely
so `git reset --hard` cannot take it. So there is no backup/verify/restore dance around the build,
which is most of what `mcu-timeline`'s workflow does. If that changes — if accounts land — this
workflow has to grow that dance too, and `src/lib/prefs.ts` is where it would start.

### Server pieces

| Piece | Where |
|---|---|
| systemd unit | `deploy/dcc-companion.service`, installed at `/etc/systemd/system/` |
| working copy | `/srv/previews/dcc-companion` (a clone of `origin/main`) |
| reverse proxy | `dcc.dev.innovativstud.io` → `127.0.0.1:4336` in `/etc/caddy/Caddyfile` |
| Ollama key | `/etc/dcc-companion.env`, read by the unit's `EnvironmentFile=-` (optional by design) |
| deploy key | `~/.ssh/dcc-companion-deploy`, public half in `authorized_keys` |
| repo secrets | `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY` |

`preview.innovativstud.io` is a **different thing**: it proxies port 4321, i.e. whichever project
currently has a dev server running. It is not this deployment, and only one project can hold it.

## Key files

| File | Purpose |
|------|---------|
| `src/lib/progress.ts` | **The frontier** — the only place the arithmetic lives |
| `src/lib/spoiler.ts` | The three gate states and the seal copy |
| `src/lib/prefs.ts` | The `dcc_pos` cookie; the seam where accounts will land |
| `src/lib/content.ts` | DB reads; relations mirrored at read time |
| `db/config.ts` | `Book`, `Floor`, `Entity`, `Beat`, `Relation` |
| `data/books.json` | Books, floors, the book↔floor map |
| `data/chapters.json` | The chapter spine: 472 chapters, counts and titles |
| `data/book-colors.json` | Each book's official colour and its readable ink |
| `scripts/fetch-book-colors.mjs` | `npm run colors:refresh` — scrapes those colours |
| `scripts/fetch-chapters.mjs` | `npm run chapters:refresh` — pulls the chapter tables |
| `scripts/fetch-achievements.mjs` | `npm run achievements:refresh` — the 148 real awards, and the voice corpus |
| `data/achievements.json` | The books' own awards, gated; the corpus behind it is gitignored |
| `scripts/coverage-report.mjs` | `npm run content:coverage` — who earns a page next, by mention count |
| `scripts/check-pages.mjs` | Fails the build if gated content is hardcoded into page source |
| `data/entities/*.json` | The curated graph; `tagline` may be one string or a progressive list |
| `data/entities/places.json` | Places: somewhere *on* a floor, never a floor itself |
| `scripts/build-content.mjs` | Lint, resolve tags, inherit gates, write the snapshot |
| `scripts/lib/lint.mjs` | Every rule that stops the gate leaking |
| `scripts/lib/voice.mjs` | Who speaks on a beat: self / system / narrator, resolved in the build |
| `scripts/smoke.mjs` | `npm run smoke` — does every route actually render? |
| `scripts/check-stage.mjs` | No `<script>` or `<noscript>` in a component the view swap replaces |
| `scripts/check-anchors.mjs` | `npm run content:anchors` — advisory: each reveal tag against the first chapter naming it |
| `scripts/fetch-books.mjs` | The edition's full text, one file per section with its reading position; gitignored |
| `scripts/lib/edition.mjs` | Wiki chapter numbers -> the edition's (book 5 differs) |
| `src/lib/achievement.ts` | Tiers, the prompt, the model call, and the screen-and-retry loop |
| `src/lib/leak.ts` | **The forward-name screen** — the runtime half of the lint's rule |
| `src/pages/achievement.astro` | The form, the grant, the trophy case; rate limit lives here |
| `src/components/AchievementCard.astro` | One grant, the one way this site renders a grant |
| `src/lib/timeline.ts` | The x scale, lane selection and lane geometry the three `/when` views share |
| `src/lib/kinds.ts` | Kind labels and order, clear of `astro:db` so it can be imported anywhere |
| `src/pages/when.astro` | Braid, grid and downstream over the same gated set |
| `src/components/BeatEntry.astro` | One beat, rendered the one way this site renders a beat |
| `src/components/DetailPanel.astro` | The card beside the chart: tagline, entries, connections |
| `src/components/{Braid,Grid,Downstream}View.astro` | The three layouts, all server-rendered |
| `src/components/EntryRow.astro` | One entry row: same height, same active state, every view |
| `src/components/EntryList.astro` | A column of those rows |
| `src/components/StageHead.astro` | The pinned head, shared by all three views |
| `src/styles/global.css` | Tokens, and the component layer every page shares |
| `src/components/GateBar.astro` | The position control |
| `src/pages/entity/[id].astro` | Usage log + arc + connections, each gated |

## Next

- `npm run content:coverage` ranks every name in the wiki's Characters and Items categories by how
  many chapters mention it, and flags the ones with no entity yet. That is the queue — work down
  it rather than guessing. **Read the surrounding summary before trusting an anchor**: the top hit
  for "Louis" is a stack of Louis L'Amour books, four floors before the crawler turns up, and the
  first "Bautista" is a corpse called Grace, five chapters before Daniel Bautista is met.
  `--cat=Skills,Spells` sweeps any category on the wiki and `--cat=all` sweeps the twenty-seven
  worth sweeping, so the passes that used to be done by hand — NPCs, Deities, Groups, Dungeon
  Locations, Dungeon Mechanics, Quests, Shows, Bosses — are now re-runnable rather than remembered.
  Watch for generic nouns: a category page called "Party" or "Boss" matches almost every summary
  and tells you nothing.
- Chapter-accurate reveal points for the entities still tagged at book level
- **31 `draft` beats remain of 687**; `npm run content:check` lists them. Sixteen are the newest
  entities, whose reveal point rests on a wiki infobox alone rather than on a chapter summary
  agreeing with it — that split is what `verified` means here. The pass that cleared 174 found real errors,
  and the pattern is worth knowing: the dangerous ones were never wrong facts but **right facts
  under the wrong tag** — a book-4 twist in a book-3 beat, a book-8 reveal at the end of book 7,
  a dead woman narrating two floors after she was killed. Prose gets read for truth; tags do not.
- The Nothing is the one item with no `description`: no System text for it exists on the wiki
- Books 3, 6 and 8 have the thinnest entity coverage relative to their chapter counts
- Deeper coverage: more items, per-floor mechanics, quotes with chapter anchors
- Accounts (`data/users.db` + sessions), so progress follows the reader across devices
- Search / command palette across entities and floors
