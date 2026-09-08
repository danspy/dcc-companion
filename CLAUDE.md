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

All 47 characters are converted: **38 speak, 9 carry a dossier** (Agatha, Grimaldi, Ferdinand,
Quan Ch, Bomo, Beatrice, Osvaldo, Firas, Vrah). The dossier is the honest answer when the books
give someone almost no lines of their own — inventing a register for them would be inventing
character. Whole-page, never mixed: a page that changes register halfway reads as a mistake.

**Items open on the System's own words.** `description` on an entity is the AI's verbatim text,
a string or a progressive `{ at, source, text }` list with exactly the tagline rules, shown above
the usage log with a `Bk b · c` stamp. Quotations skip the forward-phrase heuristic (the book's
own text says "eventually") and keep the forward-reference check. That is a rule about a category
of text; the deliberate absence of an exemption list for summaries stands. The Fandom wiki's item
pages carry these under an `AI Description` heading with chapter citations; quote the description
itself, short, never the narration around it.

### Finding things: the filter is safe because the page is

`/who` carries 180 entries, so it has a filter bar: a search box, six kind chips, and a
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
book 4. The Nagas are bankrupt showrunners in a loot-box aside at 1:5 and a fleet in book 7.
Rosetta Thagra is a name in the front of the Cookbook at 3:8 and a presenter in book 6.

In every case the entity **reveals where the book gives the reader the word**, and everything
about what it *is* sits in beats at its own later tag. Tagging the entity at its substance instead
would retro-seal text the reader has already read, and the forward-reference check would fail the
build on the older entry — which is how each of these was found.

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

`chapters.json` is the chapter spine — **474 chapters across the eight books, no gaps** — pulled
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
npm run content:anchors # is any reveal tag earlier than the first chapter naming it?
npm run content:check   # lint only; prints the draft/chapter-count work queue
npm run test:gate       # frontier arithmetic + the lint rules

# Always build against a throwaway DB so data/dcc.db isn't half-written:
ASTRO_DATABASE_FILE=./.astro/build.db npm run build
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
committed snapshot on every build. So there is no backup/verify/restore dance around the build,
which is most of what `mcu-timeline`'s workflow does. If that changes — if accounts land — this
workflow has to grow that dance too, and `src/lib/prefs.ts` is where it would start.

### Server pieces

| Piece | Where |
|---|---|
| systemd unit | `deploy/dcc-companion.service`, installed at `/etc/systemd/system/` |
| working copy | `/srv/previews/dcc-companion` (a clone of `origin/main`) |
| reverse proxy | `dcc.dev.innovativstud.io` → `127.0.0.1:4336` in `/etc/caddy/Caddyfile` |
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
| `data/chapters.json` | The chapter spine: 474 chapters, counts and titles |
| `data/book-colors.json` | Each book's official colour and its readable ink |
| `scripts/fetch-book-colors.mjs` | `npm run colors:refresh` — scrapes those colours |
| `scripts/fetch-chapters.mjs` | `npm run chapters:refresh` — pulls the chapter tables |
| `scripts/coverage-report.mjs` | `npm run content:coverage` — who earns a page next, by mention count |
| `scripts/check-pages.mjs` | Fails the build if gated content is hardcoded into page source |
| `data/entities/*.json` | The curated graph; `tagline` may be one string or a progressive list |
| `data/entities/places.json` | Places: somewhere *on* a floor, never a floor itself |
| `scripts/build-content.mjs` | Lint, resolve tags, inherit gates, write the snapshot |
| `scripts/lib/lint.mjs` | Every rule that stops the gate leaking |
| `scripts/lib/voice.mjs` | Who speaks on a beat: self / system / narrator, resolved in the build |
| `scripts/check-anchors.mjs` | `npm run content:anchors` — advisory: a reveal tag earlier than the first chapter naming it |
| `src/components/GateBar.astro` | The position control |
| `src/pages/entity/[id].astro` | Usage log + arc + connections, each gated |

## Next

- `npm run content:coverage` ranks every name in the wiki's Characters and Items categories by how
  many chapters mention it, and flags the ones with no entity yet. That is the queue — work down
  it rather than guessing. **Read the surrounding summary before trusting an anchor**: the top hit
  for "Louis" is a stack of Louis L'Amour books, four floors before the crawler turns up, and the
  first "Bautista" is a corpse called Grace, five chapters before Daniel Bautista is met.
  It only scans two of the wiki's categories; NPCs, Deities, Groups, Dungeon Locations, Dungeon
  Mechanics, Quests, Shows and Bosses were swept by hand for the pass that doubled the graph, and
  a `--cat=` flag would make that reproducible.
- Chapter-accurate reveal points for the entities still tagged at book level
- **13 `draft` beats remain of 624**, each left draft for a stated reason rather than an unread
  one; `npm run content:check` lists them. The pass that cleared the other 174 found real errors,
  and the pattern is worth knowing: the dangerous ones were never wrong facts but **right facts
  under the wrong tag** — a book-4 twist in a book-3 beat, a book-8 reveal at the end of book 7,
  a dead woman narrating two floors after she was killed. Prose gets read for truth; tags do not.
- The Nothing is the one item with no `description`: no System text for it exists on the wiki
- Books 3, 6 and 8 have the thinnest entity coverage relative to their chapter counts
- Deeper coverage: more items, per-floor mechanics, quotes with chapter anchors
- Accounts (`data/users.db` + sessions), so progress follows the reader across devices
- Search / command palette across entities and floors
