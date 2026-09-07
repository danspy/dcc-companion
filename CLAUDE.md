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

### Three states, and the middle one is the point

| `spoilers` | Progress | Behaviour |
|---|---|---|
| off | — | everything shown |
| on | **none** (no cookie yet) | names and book titles show; every arc, use, fate and relation hidden |
| on | some | revealed up to the frontier |

The middle row exists because a first-time visitor opening the cast index must not have book 7
handed to them by a "Fate:" line. **A list of names is not a spoiler; what happens to them is.**
That is also why `/entity/[id]` *redirects* rather than rendering a redacted page for an entity
the reader has not met — the URL alone would confirm the name.

## Content pipeline

```
data/books.json              books, floors, the book<->floor map
data/entities/*.json         characters, items, mechanics, factions, threads
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
`#131313` with the show's gold `#ffc10a` and blood-red `#e81514`. The highlight ramp from the
same palette gives each floor its own accent, so a floor is identifiable by colour alone.

**Single-theme on purpose** — the show is broadcast out of a black box — so every colour is
painted explicitly and nothing borrows the host's ground.

Sealed content is **redacted, not blurred**: a blur invites squinting. It speaks in the
System's register (`*** Sealed *** That's above your pay grade, crawler.`), which is in
character rather than an apology.

## Commands

```bash
npm run dev             # https://localhost:4321 (self-signed — accept the warning)
npm run content:build   # rebuild data/content.snapshot.json after editing data/
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
| `scripts/fetch-chapters.mjs` | `npm run chapters:refresh` — pulls the chapter tables |
| `scripts/coverage-report.mjs` | `npm run content:coverage` — who earns a page next, by mention count |
| `data/entities/*.json` | The curated graph |
| `scripts/build-content.mjs` | Lint, resolve tags, inherit gates, write the snapshot |
| `scripts/lib/lint.mjs` | Every rule that stops the gate leaking |
| `src/components/GateBar.astro` | The position control |
| `src/pages/entity/[id].astro` | Usage log + arc + connections, each gated |

## Next

- `npm run content:coverage` ranks every name in the wiki's Characters and Items categories by how
  many chapters mention it, and flags the ones with no entity yet. That is the queue — work down
  it rather than guessing. **Read the surrounding summary before trusting an anchor**: the top hit
  for "Louis" is a stack of Louis L'Amour books, four floors before the crawler turns up.
- Chapter-accurate reveal points for the entities still tagged at book level
- A verification pass over the remaining `draft` beats (`npm run content:check` lists them)
- Books 3, 6 and 8 have the thinnest entity coverage relative to their chapter counts
- Deeper coverage: more items, per-floor mechanics, quotes with chapter anchors
- Accounts (`data/users.db` + sessions), so progress follows the reader across devices
- Search / command palette across entities and floors
