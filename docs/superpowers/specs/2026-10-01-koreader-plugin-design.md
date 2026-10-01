# Crawler's Companion for KOReader — design

A KOReader plugin that answers *who is this?* from inside the book. Long-press a name,
tap **Crawler's Companion**, and get the entry as the site would show it — gated at the
chapter the reader is actually on, which the device knows and the site has to be told.

## What it is

- A separate repo, `dcc-companion-koreader`, holding one plugin folder,
  `crawlerscompanion.koplugin/`, that a reader copies into KOReader's `plugins/` directory.
- The plugin's data is **exported from this repo**: `npm run export:koreader -- --out <dir>`
  reads `data/content.snapshot.json` and writes a slim, pre-resolved set of JSON files.
  The plugin repo commits that export per release. There is one source of truth and it is
  here.
- Offline by construction. Nothing on the device talks to the site.

## The position is read off the open book

Every reveal is still `book * 1000 + chapter`, and the plugin copies that arithmetic into
Lua. What changes is where the two numbers come from:

| number | source | rule |
|---|---|---|
| book | `self.ui.doc_props.title` | each book's title is searched for in the document title, books 2–8 first, book 1 only if no other matched, because "Dungeon Crawler Carl" is inside every title. A `Book N` / `Book VII` suffix, when present, wins. No match: the plugin stays inert for that document and the button is not shown. |
| chapter | the ToC entry the reader is inside, `self.ui.toc:getTocIndexByPage(pageno)` | walk the flat ToC backwards from that entry. The first `Chapter N` found is the chapter; if the current entry *is* that chapter, N, otherwise N + 1 (an interlude after chapter 4 is chapter 5's text — the rule `fetch-books.mjs` already applies). Hitting `Epilogue` first means the book is finished (999). Hitting the start means chapter 1. |

**The gate is at the current chapter, not the previous one.** A reader partway through chapter
12 may be shown a 12-tagged fact a few pages early. The alternative makes "who is this?" fail
on the name they just met, which is the whole point. The popup prints the position it used.

**The edition is detected, not asked for.** Book 5 has 75 chapters in the Ace edition and 77 in
the original self-published one. The export carries, per book, the chapter count and any
alternative edition's count with its chapter map (`scripts/lib/edition.mjs`). The plugin counts
`Chapter N` entries in the ToC; a count matching an alternative applies that map. A count
matching nothing is used as is.

**A manual override exists** for a converted book with a flat ToC: the plugin's menu shows the
detected position and accepts `book:chapter` or `book:end`. The override is per document,
stored in the document's own KOReader settings, and "Use detected position" clears it. When
neither detection nor an override gives a book, nothing is shown.

## What gets exported

`index.json` — one file, loaded once per document open:

```
{ generatedAt, books: [{ id, title, chapters, alternates: [{ chapters, map }] }],
  entries: [{ id, kind, name, role, revealedAt,
              aka: [{ name, key }],
              taglines: [{ key, book, chapter, text }] }] }
```

`entities/<id>.json` — one per entry, loaded on a hit:

```
{ id, descriptions: [{ key, book, chapter, source, text }],
  beats: [{ key, book, chapter, headline, text, voice }] }
```

- `key` is always the resolved integer (`sortKey`), so the Lua side is one comparison. `book`
  and `chapter` are the beat's own, for the stamp — the same distinction the achievements
  page draws between when a thing happened and when it may be shown.
- Floors are entries of kind `floor`: `revealedAt` is the floor's `nameAt` (or `revealedAt`
  when absent), the premise is a tagline at the floor's `revealedAt`, and each recap part is a
  beat at its own `at`. The name may therefore be confirmed before the premise opens, exactly
  as on the front page.
- Relations and achievements are not exported. Not for a first version.
- Nothing in the export is a reveal tag string. The export test fails on one.

## Matching, and what a miss looks like

- The selected text is trimmed, lower-cased, stripped of a trailing possessive (`'s`, `’s`) and
  punctuation. It matches an entry when it starts a word of the entry's name or of an alias the
  reader has reached (`key <= frontier`). Case-insensitive throughout, because the reader
  chose the word; the site's one-word case rule exists for *unprompted* screening.
- Only entries with `revealedAt <= frontier` are searched at all. **An unreached entry and an
  unknown word produce the same reply**, `*** No record ***`, so the plugin cannot confirm
  a name exists.
- Exact name first, exact alias second, prefix matches after, at most eight. One hit opens
  the entry; several open a `ButtonDialog` to pick from.

## The popup

A `TextViewer` titled with the entry's name. Body, in order:

1. the role, when there is one
2. `taglineFor` — the latest tagline reached
3. the latest description reached, stamped `Book b · Ch c` (items and mechanics mostly)
4. **Story so far · through Book b · Ch c** — the beats reached, chronological, each as
   `Book b · Ch c · Headline` and its text. Only the **latest twelve** are shown, with a line
   `… N earlier entries` above them when there are more; a hundred beats of Carl on e-ink is
   a wall, and the question is "where did I last see this?"
5. `*** Sealed *** N more entries. The next when you reach Book b · Ch c.` — the count and
   next key come from `key`, as on the entity page.

No `kind` label on a beat, ever. Plain text, no voice styling in a first version.

## The plugin's menu

Under Tools → *Crawler's Companion*:

- the detected position for this document, or the override, or "not a Dungeon Crawler Carl
  book";
- *Set position…* (an `InputDialog` taking `7:12` or `7:end`); *Use detected position*;
- *About*, naming the site and the export date.

## Plugin shape

```
crawlerscompanion.koplugin/
  _meta.lua         name + description
  main.lua          KOReader wiring only: menu, highlight button, popup
  gate.lua          pure: frontier, reached, taglineFor, match, beatsFor
  position.lua      pure: bookOf(title, books), chapterOf(toc, index), edition detection
  data/index.json
  data/entities/*.json
tests/              run with KOReader's own luajit; stubs for the ui modules main.lua needs
README.md           install steps, what it does, what it never does
```

The highlight button is registered as `12_crawlers_companion` so it sorts before KOReader's
own `12_search` and shows only when the plugin has a position. The handler follows
`qrclipboard.koplugin`: `highlightFromHoldPos()`, `util.cleanupSelectedText`, then close.

## Testing, in order

1. `gate.lua` and `position.lua` have unit tests run by the bundled `luajit`, including the
   ToC of the two real EPUBs in Downloads (books 7 and 8), copied in as fixtures.
2. `main.lua` runs under stubbed `ui/*` modules, asserting the button is registered, the
   position resolves from a fake `doc_props` + `toc`, and the assembled popup text for a
   reached and an unreached name.
3. The export has a node test: every `key` is an integer, no tag strings survive, every index
   entry has its entity file, floors carry the right keys.
4. Live: the KOReader macOS nightly in the scratchpad, the plugin in
   `~/Library/Application Support/koreader/plugins/`, book 7 open, long-press a name.

## Links

- The Progress page gets a short section pointing at the plugin repo.
- This repo's CLAUDE.md gets a section recording the export and the position rules above.

## Not in this version

Relations, achievements, the dictionary-popup hook, syncing the device position to the
site's cookie, voice styling in the popup, and any network use.
