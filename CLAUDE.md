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

`src/lib/progress.ts` is the only place this arithmetic lives. `scripts/lib/gate.mjs` is a
deliberate pure copy for the build scripts, and `npm run test:gate` drives both.

### Books gate. Floors navigate.

**Floor 7 (The Great Race) straddles books 5 and 6** — it opens at the close of *The Butcher's
Masquerade* and resolves at the start of *The Eye of the Bedlam Bride*. A floor-based gate
would therefore leak. Floors are how the story is shaped and how the reader browses it; the
book is what a reader knows they have finished. Do not move the gate onto floors.

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
data/books.json              books, floors, chapter counts, the book<->floor map
data/entities/*.json         characters, items, mechanics, factions, threads
        |  npm run content:build   (scripts/build-content.mjs — no network)
data/content.snapshot.json   reveal tags resolved to integers, committed
        |  db/seed.ts
data/dcc.db
```

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

For chapter counts and chapter-level reveal points, **the books themselves are the only source**.

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

## Key files

| File | Purpose |
|------|---------|
| `src/lib/progress.ts` | **The frontier** — the only place the arithmetic lives |
| `src/lib/spoiler.ts` | The three gate states and the seal copy |
| `src/lib/prefs.ts` | The `dcc_pos` cookie; the seam where accounts will land |
| `src/lib/content.ts` | DB reads; relations mirrored at read time |
| `db/config.ts` | `Book`, `Floor`, `Entity`, `Beat`, `Relation` |
| `data/books.json` | Books, floors, chapter counts, the book↔floor map |
| `data/entities/*.json` | The curated graph |
| `scripts/build-content.mjs` | Lint, resolve tags, inherit gates, write the snapshot |
| `scripts/lib/lint.mjs` | Every rule that stops the gate leaking |
| `src/components/GateBar.astro` | The position control |
| `src/pages/entity/[id].astro` | Usage log + arc + connections, each gated |

## Next

- Chapter counts for books 2–8, taken from the books, to switch the chapter dial on
- A verification pass over the remaining 18 `draft` beats (`npm run content:check` lists them)
- Books 6 and 8 are the thinnest — book 8 has almost no reliable secondary coverage yet
- Deeper coverage: more items, per-floor mechanics, quotes with chapter anchors
- Accounts (`data/users.db` + sessions), so progress follows the reader across devices
- Search / command palette across entities and floors
