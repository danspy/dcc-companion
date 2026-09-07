# Crawler's Companion

A spoiler-gated reader's companion to Matt Dinniman's **Dungeon Crawler Carl**.

Every fact — a character's arc, where an item gets used, what a floor turns out to be — is
sealed until you have actually read that far. Tell it where you are (book, and optionally
chapter) and it shows you exactly that much and nothing more.

Unofficial and non-commercial. All rights in the books belong to Matt Dinniman.

## Run it

```bash
npm install
npm run dev     # https://localhost:4321 — self-signed cert, accept the warning
```

## How the gate works

A reading position and a piece of content both collapse to one integer:

```
frontier = book * 1000 + chapter
```

Content declares the earliest safe position as `"4"` (anywhere in book 4), `"4:12"` (book 4,
chapter 12) or `"4:end"` (once book 4 is finished). Showing something is one comparison.

Leaving the chapter blank means you **finished** that book — so the opening default, book 1 with
no chapter, shows all of book 1 and nothing beyond it. Type a chapter number if you are partway.

**Books gate, floors navigate** — floor 7 straddles books 5 and 6, so a floor-based gate
would leak.

## Working on the content

```bash
npm run chapters:refresh  # re-pull the chapter spine (474 chapters, 8 books)
npm run content:check   # lint + the work queue (draft beats, floored tags)
npm run content:build   # rebuild the committed snapshot after editing data/
npm run test:gate       # frontier arithmetic and every lint rule
```

Most content is currently marked `draft` — written from reading knowledge and awaiting a pass
against the books. See `CLAUDE.md` for why the fan wikis are not a usable source.
