# The Plugin's Screens — Implementation Plan (sub-project B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A tap on a name in KOReader opens a short recap — a paragraph per book, then this book to the previous chapter — with one button to the whole crawl so far, whose connections navigate to other entries.

**Architecture:** The KOReader export gains `recap`, `gist` and `relations` per entity file. `cc_gate.lua` gains `story_so_far` (a pure copy of `src/lib/story.ts`, held to the same cases), `relations_for`, `recap_text` and `crawl_text`. `main.lua` opens three widgets: a TextViewer for the recap, a TextViewer for the whole crawl, a Menu for connections whose rows open another entry's recap. Nothing new is held in `index.json`.

**Tech Stack:** Node ESM (`scripts/lib/koreader-export.mjs`, `node:test`); Lua 5.1 / LuaJIT (`tests/run.lua`, KOReader's `TextViewer` with `buttons_table`, `Menu` with `item_table` and `multilines_show_more_text`, both present on v2026.03 and the nightly).

**Spec:** `docs/superpowers/specs/2026-10-06-entity-recap-design.md` (section *Sub-project B*)

## Global Constraints

- Every comparison key in the export is a resolved integer; the export test fails on a tag string anywhere.
- `index.json` does not change shape.
- The plugin's `cut` is the previous chapter: `frontier - 1` for any chapter position, `frontier` when the book is finished.
- Only relations with `key <= frontier` are shown; an `other` missing from the index is dropped.
- Relation `kind` is exported in display form (`killed by`), the same on both sides.
- Module names in the plugin carry the `cc_` prefix.
- The site export is dated by the snapshot's commit (`contentDate`), so a sync with unchanged content writes no diff.
- Tests: `luajit tests/run.lua` (plugin), `npm run test:gate` (site). A screen is verified on the macOS nightly through the self-test before it is called working.

## Review Focus

1. **An entity file written before this export (no `recap`, `relations`)** — the plugin on a device with old data must not throw: `story_so_far` and `relations_for` treat a missing list as empty. (Task 2)
2. **A relation whose `other` is a floor entry** (`floor-3`) — floors are index entries, so the row resolves and opens the floor's recap; nothing special, but it must not be dropped. (Task 1 export test, Task 2)
3. **A reader at chapter 1** — `cut = frontier - 1` lands on the book's chapter 0; the current list is empty and `this_chapter` counts chapter 1's beats; the Recap must still read sensibly (role, tagline, paragraphs, "and N entries in this chapter"). (Task 2)
4. **The Floating Dictionary's harvested button** — it calls our `callback(dict_popup)`; the Recap opens on top of its card. No change needed, but the self-test must still log `crawlers_companion` in the popup's buttons after the rewrite. (Task 3)
5. **Connections for an entry with none reached** — the whole-crawl button is disabled, not missing, so the layout does not shift between entries. (Task 3)

---

### Task 1: The export — recap, gist, relations

**Files:**
- Modify: `scripts/lib/koreader-export.mjs` (`exportEntity`, the beats loop in `exportForKoreader`, a new relations pass)
- Test: `scripts/test-export-koreader.mjs`

**Interfaces:**
- Produces, per `entities/<id>.json`: `recap: [{ key, book, chapter, text }]` (via `keyed`), beats with `gist` when present, `relations: [{ other, kind, note, key, book, chapter }]` sorted by `key`. Floor files carry `recap: []` and `relations: []`.

- [ ] **Step 1: Failing tests** (append to `scripts/test-export-koreader.mjs`)

```js
test('an entity file carries its recap steps, gists and both sides of every relation', () => {
  const { index, entities } = exportForKoreader(snapshot);
  const ids = new Set(index.entries.map(e => e.id));
  let relations = 0;
  for (const [id, file] of entities) {
    assert.ok(Array.isArray(file.recap), `${id} recap`);
    assert.ok(Array.isArray(file.relations), `${id} relations`);
    for (const r of file.recap) {
      assert.ok(Number.isInteger(r.key) && r.key % 1000 === 999, `${id} recap key ${r.key}`);
      assert.equal(typeof r.text, 'string');
    }
    for (const r of file.relations) {
      assert.ok(Number.isInteger(r.key), `${id} relation key`);
      assert.ok(ids.has(r.other), `${id} -> ${r.other} is in the index`);
      assert.doesNotMatch(r.kind, /-/, 'kind is in display form');
      relations++;
    }
    for (let i = 1; i < file.relations.length; i++) assert.ok(file.relations[i - 1].key <= file.relations[i].key, `${id} relations in key order`);
    for (const b of file.beats) if ('gist' in b) assert.equal(typeof b.gist, 'string');
  }
  assert.equal(relations, snapshot.relations.length * 2, 'every relation appears on both sides');
  const carl = entities.get('carl');
  const donut = carl.relations.find(r => r.other === 'princess-donut');
  assert.ok(donut, 'Carl lists Donut');
  assert.ok(entities.get('princess-donut').relations.some(r => r.other === 'carl' && r.kind === donut.kind), 'Donut lists Carl with the same kind');
  for (const r of carl.relations) {
    const other = index.entries.find(e => e.id === r.other);
    assert.ok(r.key >= other.revealedAt && r.key >= index.entries.find(e => e.id === 'carl').revealedAt, 'a relation waits for both ends');
  }
});
```

- [ ] **Step 2: Run** `npm run test:gate 2>&1 | grep -E '✖|^ℹ (pass|fail)'` — Expected: the new test fails (`carl recap` is not an array).

- [ ] **Step 3: Implement**

In `exportEntity`, the `file` object gains:

```js
      /* The recap: a paragraph per book, keyed at that book's end. */
      recap: (e.recap ?? []).map(r => keyed(r.sortKey, { text: r.text })),
      relations: [],
```

In `exportFloor`, the `file` object gains `recap: [], relations: [],`.

In the beats loop, after `headline: …, text: …, voice: …`, add the gist only when present (a null would be a key the Lua side has to skip):

```js
      ...(b.gist ? { gist: b.gist } : {}),
```

After the beats loop and its sort, add the relations pass:

```js
  /* Relations, both sides written out so a page shows who it is connected to
     whichever side declared the edge — the same mirror the site's getRelations
     does at read time. The kind is in display form, as the site shows it, and
     the key is the relation's sortKey, which already waits for both ends. */
  for (const r of snapshot.relations ?? []) {
    const kind = r.kind.replace(/-/g, ' ');
    const a = entities.get(r.fromId), b = entities.get(r.toId);
    if (!a || !b) throw new Error(`relation ${r.fromId} -> ${r.toId} names an unknown entity`);
    a.relations.push(keyed(r.sortKey, { other: r.toId, kind, note: r.note ?? '' }));
    b.relations.push(keyed(r.sortKey, { other: r.fromId, kind, note: r.note ?? '' }));
  }
  for (const file of entities.values()) file.relations.sort((x, y) => x.key - y.key);
```

- [ ] **Step 4: Run** `npm run test:gate 2>&1 | grep -E '✖|^ℹ (pass|fail)'` — Expected: `fail 0`. Then `npm run export:koreader -- --out /tmp/ko-check | tail -2` and `node -e 'const c=require("/tmp/ko-check/entities/carl.json");console.log(c.relations.length, c.relations[0])'` — Expected: a count above 20 and a `{ key, book, chapter, other, kind, note }` row.

- [ ] **Step 5: Commit** (site repo)

```bash
git add scripts/lib/koreader-export.mjs scripts/test-export-koreader.mjs
git commit -m "KOReader export: recap steps, gists and both sides of every relation, per entity file"
```

---

### Task 2: The gate, in Lua

**Files:**
- Modify: `crawlerscompanion.koplugin/cc_gate.lua`
- Modify: `crawlerscompanion.koplugin/cc_position.lua` (add `previous_chapter`)
- Modify: `tests/fixtures/data/entities/carl.json`, `tests/fixtures/data/entities/princess-donut.json` (a recap step, gists, relations)
- Test: `tests/test_gate.lua`, `tests/test_position.lua`

**Interfaces:**
- `gate.story_so_far(file, frontier, cut, max)` → `{ books = {{ book, text }}, current = { book, lines = {{ chapter, text }}, earlier, this_chapter } | nil, sealed = { count, next_key } | nil }` — the Lua copy of `storySoFar`; `cut` defaults to `frontier`, `max` to `gate.STORY_LINES` (8).
- `gate.relations_for(file, index, frontier)` → list of `{ other = <index entry>, kind, note, key }` in key order, only `key <= frontier`, only `other` found in `index.entries`.
- `gate.recap_text(entry, file, frontier, cut)` → the Recap screen's text.
- `gate.crawl_text(entry, file, frontier)` → the whole crawl: description, every reached beat, sealed line (the old `popup_text` without a limit; `popup_text` is removed).
- `position.previous_chapter(p)` → `p.frontier` when `p.chapter == END_OF_BOOK`, else `p.frontier - 1`.

- [ ] **Step 1: Fixtures.** In `tests/fixtures/data/entities/carl.json` add after `"descriptions":[]`:

```json
"recap":[{"key":1999,"book":1,"chapter":999,"text":"Carl goes down the stairs after the cat."}],
"relations":[{"key":1001,"book":1,"chapter":1,"other":"princess-donut","kind":"partner","note":"Stuck together."},{"key":7012,"book":7,"chapter":12,"other":"hamed","kind":"enemy","note":"On a bay."}],
```

and give the beat at `1002` a `"gist":"Carl and the cat take the stairs."`. In `princess-donut.json` add `"recap":[],"relations":[{"key":1001,"book":1,"chapter":1,"other":"carl","kind":"partner","note":"Stuck together."}]`. Leave `carlos.json` and `hamed.json` without the new fields (Review Focus 1).

- [ ] **Step 2: Failing tests** (append to `tests/test_gate.lua`, before `return S`; `CARL` in that file is the carl fixture, `ENTRIES` the index entries — read the top of the file for both)

```lua
function S.story_so_far_lists_paragraphs_then_this_book_to_the_cut()
  local s = gate.story_so_far(CARL, 1005, 1004)
  T.eq(#s.books, 0, "book 1 is not finished at 1:5")
  T.eq(s.current.book, 1)
  T.eq(#s.current.lines, 2, "beats at 1:1 and 1:2 are below the cut")
  T.eq(s.current.lines[2].text, "Carl and the cat take the stairs.", "a gist when there is one")
  T.eq(s.current.lines[1].text, "Pink Crocs", "the headline when there is none")
  T.eq(s.current.this_chapter, 0)
  T.eq(s.sealed.count, 4)
  T.eq(s.sealed.next_key, 1999)
  s = gate.story_so_far(CARL, 1002, 1001)
  T.eq(#s.current.lines, 1)
  T.eq(s.current.this_chapter, 1, "the beat in the current chapter is counted, not shown")
end

function S.story_so_far_at_a_books_end_is_its_paragraph()
  local s = gate.story_so_far(CARL, 1999)
  T.eq(#s.books, 1)
  T.eq(s.books[1].text, "Carl goes down the stairs after the cat.")
  T.eq(s.current, nil)
  s = gate.story_so_far(CARL, 7012, 7011)
  T.eq(#s.books, 1, "book 1's paragraph still shows in book 7")
  T.eq(s.current.book, 7)
  T.eq(#s.current.lines, 0, "nothing in book 7 below the cut")
  T.eq(s.current.this_chapter, 1)
end

function S.story_so_far_folds_a_long_list_and_survives_old_data()
  local many = { beats = {} }
  for i = 1, 12 do many.beats[i] = { key = 5000 + i, book = 5, chapter = i, headline = "h" .. i } end
  local s = gate.story_so_far(many, 5020, 5020, 8)
  T.eq(#s.current.lines, 8)
  T.eq(s.current.earlier, 4)
  T.eq(s.current.lines[1].text, "h5")
  local old = gate.story_so_far({ beats = { { key = 1001, book = 1, chapter = 1, headline = "x" } } }, 1005, 1004)
  T.eq(#old.books, 0, "no recap field at all is an empty list")
  T.eq(gate.story_so_far(CARL, 0).current, nil, "no position, no story")
end

local function index_of(entries) return { entries = entries } end

function S.relations_are_gated_and_resolved_through_the_index()
  local rels = gate.relations_for(CARL, index_of(ENTRIES), 1005)
  T.eq(#rels, 1)
  T.eq(rels[1].other.id, "princess-donut")
  T.eq(rels[1].kind, "partner")
  rels = gate.relations_for(CARL, index_of(ENTRIES), 7012)
  T.eq(#rels, 2)
  T.eq(rels[2].other.id, "hamed")
  local orphan = gate.relations_for({ relations = { { key = 1001, other = "nobody", kind = "x", note = "" } } }, index_of(ENTRIES), 1005)
  T.eq(#orphan, 0, "an other not in the index is dropped")
  T.eq(#gate.relations_for({ beats = {} }, index_of(ENTRIES), 1005), 0, "old data has no relations")
end

function S.recap_text_reads_as_the_short_answer()
  local text = gate.recap_text(ENTRIES[1], CARL, 1005, 1004)
  T.contains(text, "Protagonist")
  T.contains(text, "I'm Carl.")
  T.contains(text, "Book 1 · so far")
  T.contains(text, "Ch 1 — Pink Crocs")
  T.contains(text, "Ch 2 — Carl and the cat take the stairs.")
  T.lacks(text, "Down we go.", "the beat's own text is for the whole crawl")
  T.lacks(text, "Footwear")
  T.contains(text, "*** Sealed *** 4 more entries")
  T.contains(text, "Book 1 · end")
  local late = gate.recap_text(ENTRIES[1], CARL, 7012, 7011)
  T.contains(late, "Book 1\nCarl goes down the stairs after the cat.")
  T.contains(late, "Book 7 · so far")
  T.contains(late, "and 1 entry in this chapter")
end

function S.crawl_text_is_every_reached_beat()
  local text = gate.crawl_text(ENTRIES[1], CARL, 8999)
  T.contains(text, "Pink Crocs")
  T.contains(text, "Down we go.")
  T.contains(text, "Book 4 · Ch 12 · Later")
  T.lacks(text, "earlier entries", "no limit")
  T.lacks(text, "Sealed")
  local early = gate.crawl_text(ENTRIES[1], CARL, 1005)
  T.contains(early, "*** Sealed ***")
  T.lacks(early, "Footwear")
end
```

Then in every existing test in `tests/test_gate.lua` that calls `gate.popup_text(x, y, z, limit)`, change the call to `gate.crawl_text(x, y, z)` — and in `popup_text_at_the_end_has_no_seal` delete the two lines about `short` (the limit is gone). In `tests/test_position.lua` append:

```lua
function S.previous_chapter_is_the_cut_the_plugin_reads_to()
  T.eq(position.previous_chapter({ chapter = 6, frontier = 4006 }), 4005)
  T.eq(position.previous_chapter({ chapter = 1, frontier = 4001 }), 4000, "chapter 1: nothing before it in this book")
  T.eq(position.previous_chapter({ chapter = position.END_OF_BOOK, frontier = 4999 }), 4999, "a finished book is told by its paragraph")
end
```

- [ ] **Step 3: Run** `~/Applications/KOReader.app/Contents/koreader/luajit tests/run.lua 2>&1 | tail -3` — Expected: failures naming `story_so_far`, `relations_for`, `recap_text`, `crawl_text`, `previous_chapter` as nil.

- [ ] **Step 4: Implement `cc_position.previous_chapter`** (after `M.frontier`):

```lua
-- The cut the Recap screen lists this book's entries to: the chapter before the one the
-- reader is on. A finished book is told by its paragraph, so there is no cut to make.
function M.previous_chapter(p)
  if p.chapter == M.END_OF_BOOK then return p.frontier end
  return p.frontier - 1
end
```

- [ ] **Step 5: Implement in `cc_gate.lua`.** Replace `M.LIMIT = 12 …` with `M.STORY_LINES = 8 -- lines of the current book shown on the Recap before the rest fold into a count`. Add after `beats_for`:

```lua
-- The story so far: a paragraph per finished book, then the current book one line per beat
-- up to `cut`. A pure copy of src/lib/story.ts in the site's repo, held to the same cases;
-- change one and change the other.
function M.story_so_far(file, frontier, cut, max)
  cut = cut or frontier
  max = max or M.STORY_LINES
  local beats = file and file.beats or {}
  local sealed = nil
  do
    local count, next_key = 0, nil
    for _, b in ipairs(beats) do
      if b.key > frontier then
        count = count + 1
        if not next_key or b.key < next_key then next_key = b.key end
      end
    end
    if count > 0 then sealed = { count = count, next_key = next_key } end
  end
  if frontier <= 0 then return { books = {}, current = nil, sealed = sealed } end

  local books, have = {}, {}
  for _, r in ipairs(file and file.recap or {}) do
    if r.key <= frontier then
      books[#books + 1] = { book = r.book, text = r.text }
      have[r.book] = true
    end
  end

  local chapter = frontier % position.STRIDE
  local book = math.floor(frontier / position.STRIDE)
  local current = nil
  if chapter ~= 0 and chapter ~= position.END_OF_BOOK and not have[book] then
    local reached, this_chapter = {}, 0
    for _, b in ipairs(beats) do
      if b.book == book then
        if b.key <= cut then reached[#reached + 1] = b
        elseif b.key <= frontier then this_chapter = this_chapter + 1 end
      end
    end
    local lines = {}
    for i = math.max(1, #reached - max + 1), #reached do
      local b = reached[i]
      lines[#lines + 1] = { chapter = b.chapter, text = b.gist or b.headline or "" }
    end
    current = { book = book, lines = lines, earlier = #reached - #lines, this_chapter = this_chapter }
  end
  return { books = books, current = current, sealed = sealed }
end

-- The connections reached, each resolved to the other entry's index record. An `other` the
-- index does not know is dropped: a row with no name is nothing to open.
function M.relations_for(file, index, frontier)
  local by_id = {}
  for _, e in ipairs(index and index.entries or {}) do by_id[e.id] = e end
  local out = {}
  for _, r in ipairs(file and file.relations or {}) do
    if r.key <= frontier and by_id[r.other] then
      out[#out + 1] = { other = by_id[r.other], kind = r.kind, note = r.note or "", key = r.key }
    end
  end
  table.sort(out, function(a, b) return a.key < b.key end)
  return out
end
```

Replace `popup_text` with the two builders:

```lua
local function chapter_label(ch)
  if ch == position.END_OF_BOOK then return "end" end
  return tostring(ch)
end

local function sealed_line(sealed)
  return "*** Sealed *** " .. sealed.count .. " more " .. entries(sealed.count) .. ". The next when you reach "
    .. position.stamp_key(sealed.next_key) .. "."
end

local function opening(entry, frontier, add)
  if entry.role and entry.role ~= "" then add(entry.role) end
  local tagline = M.tagline_for(entry, frontier)
  if tagline then
    add(tagline)
  else
    local first = entry.taglines and entry.taglines[1]
    if first then add("*** Sealed *** The rest when you reach " .. position.stamp_key(first.key) .. ".") end
  end
end

-- The Recap: role and tagline, a paragraph per finished book, this book one line per beat
-- to the cut, what is still sealed. The short answer a tap opens.
function M.recap_text(entry, file, frontier, cut)
  local lines = {}
  local function add(s) lines[#lines + 1] = s end
  opening(entry, frontier, add)
  local s = M.story_so_far(file, frontier, cut)
  for _, b in ipairs(s.books) do
    add("")
    add("Book " .. b.book)
    add(b.text)
  end
  if s.current and (#s.current.lines > 0 or s.current.this_chapter > 0) then
    add("")
    add("Book " .. s.current.book .. " · so far")
    if s.current.earlier > 0 then add("… " .. s.current.earlier .. " earlier this book") end
    for _, l in ipairs(s.current.lines) do add("Ch " .. chapter_label(l.chapter) .. " — " .. l.text) end
    if s.current.this_chapter > 0 then
      add("and " .. s.current.this_chapter .. " " .. entries(s.current.this_chapter) .. " in this chapter")
    end
  end
  if s.sealed then
    add("")
    add(sealed_line(s.sealed))
  end
  return table.concat(lines, "\n")
end

-- The whole crawl so far: the System's description where there is one, then every reached
-- beat in voice with its stamp, then what is still sealed.
function M.crawl_text(entry, file, frontier)
  local lines = {}
  local function add(s) lines[#lines + 1] = s end
  opening(entry, frontier, add)
  local d = M.description_for(file, frontier)
  if d then
    add("")
    add((d.source and d.source ~= "" and (d.source .. " · ") or "") .. position.stamp_key(d.key))
    add(d.text)
  end
  local r = M.beats_for(file, frontier, math.huge)
  if #r.shown > 0 or r.sealed > 0 then
    add("")
    add("The whole crawl so far · through " .. position.stamp_key(frontier))
    for _, b in ipairs(r.shown) do
      add("")
      add(position.stamp(b.book, b.chapter) .. " · " .. (b.headline or ""))
      add(b.text or "")
    end
    if r.sealed > 0 then
      add("")
      add(sealed_line({ count = r.sealed, next_key = r.next_key }))
    end
  end
  return table.concat(lines, "\n")
end
```

`beats_for` keeps its `limit` parameter (the whole crawl passes `math.huge`); drop the `M.LIMIT` default: `limit = limit or math.huge`. Check `position.STRIDE` and `position.END_OF_BOOK` exist in `cc_position.lua` (they do: `M.STRIDE`, `M.END_OF_BOOK`).

- [ ] **Step 6: Run** `luajit tests/run.lua 2>&1 | tail -1` — Expected: all pass. Fix a `T.contains` string against what the builder actually produces only if the builder is right and the test's expectation was misread; never weaken an assertion to pass.

- [ ] **Step 7: Commit** (plugin repo)

```bash
git add crawlerscompanion.koplugin/cc_gate.lua crawlerscompanion.koplugin/cc_position.lua tests/
git commit -m "Gate: the story so far, the connections reached, and two texts — the recap and the whole crawl"
```

---

### Task 3: Three screens

**Files:**
- Modify: `crawlerscompanion.koplugin/main.lua` (`showEntry` → `showRecap`, new `showCrawl`, `showConnections`; `selftest` logs `recap_text`)
- Test: `tests/test_main.lua` (stub `ui/widget/menu`; three new tests)

**Interfaces:**
- Consumes: `gate.recap_text`, `gate.crawl_text`, `gate.relations_for`, `position.previous_chapter` from Task 2.
- `Companion:showRecap(entry, p)` — TextViewer, title `entry.name`, `buttons_table = { { crawl, close } }`.
- `Companion:showCrawl(entry, p)` — TextViewer, title `entry.name .. " · the whole crawl so far"`, `buttons_table = { { connections (enabled = n > 0), back } }`.
- `Companion:showConnections(entry, p)` — Menu, title `entry.name .. " · connections"`, one item per relation: `text = other.name .. " — " .. kind`, `mandatory = position.stamp_key(key)`, the note on a second line via `multilines_show_more_text = true` with `text` carrying `"\n" .. note` when the note is not empty; `callback` opens `showRecap(other, p)`.

- [ ] **Step 1: Failing tests.** In `tests/test_main.lua`, add a Menu stub beside the other widget stubs:

```lua
stub("ui/widget/menu", widget("menu"))
```

Append before `return S`:

```lua
function S.a_hit_opens_the_recap_with_one_button_to_the_whole_crawl()
  local plugin, hooks = boot{ title = "Dungeon Crawler Carl", toc = TOC, index = 3 }
  hooks.button.fn(this_for(plugin.ui, "Donut")).callback()
  local w = last()
  T.eq(w.__kind, "textviewer")
  T.eq(w.title, "Princess Donut")
  T.contains(w.text, "A talking cat.")
  T.lacks(w.text, "I can talk now.", "the beat's text belongs to the whole crawl")
  T.eq(#w.buttons_table, 1)
  T.eq(w.buttons_table[1][1].text, "The whole crawl for Princess Donut so far")
  T.eq(w.buttons_table[1][2].text, "Close")
end

function S.the_whole_crawl_carries_every_beat_and_a_connections_button()
  local plugin, hooks = boot{ title = "Dungeon Crawler Carl", toc = TOC, index = 3 }
  hooks.button.fn(this_for(plugin.ui, "Donut")).callback()
  last().buttons_table[1][1].callback()
  local w = last()
  T.eq(w.__kind, "textviewer")
  T.eq(w.title, "Princess Donut · the whole crawl so far")
  T.contains(w.text, "I can talk now.")
  T.eq(w.buttons_table[1][1].text, "Connections · 1")
  T.eq(w.buttons_table[1][1].enabled, true)
  T.eq(w.buttons_table[1][2].text, "Back")
  -- Hamed has nothing reached at 1:3 and no relations: the button is there and disabled.
  settings = nil
  local p2, h2 = boot{ title = "Dungeon Crawler Carl", toc = TOC, index = 3 }
  h2.button.fn(this_for(p2.ui, "Carl")).callback()
  last().buttons[2][1].callback() -- Carlos, from the disambiguation
  last().buttons_table[1][1].callback()
  T.eq(last().buttons_table[1][1].text, "Connections · 0")
  T.eq(last().buttons_table[1][1].enabled, false)
end

function S.a_connection_row_opens_the_other_entrys_recap()
  local plugin, hooks = boot{ title = "Dungeon Crawler Carl", toc = TOC, index = 3 }
  hooks.button.fn(this_for(plugin.ui, "Donut")).callback()
  last().buttons_table[1][1].callback()
  last().buttons_table[1][1].callback()
  local menu = last()
  T.eq(menu.__kind, "menu")
  T.eq(menu.title, "Princess Donut · connections")
  T.eq(#menu.item_table, 1)
  T.contains(menu.item_table[1].text, "Carl — partner")
  T.contains(menu.item_table[1].text, "Stuck together.")
  T.eq(menu.item_table[1].mandatory, "Book 1 · Ch 1")
  menu.item_table[1].callback()
  T.eq(last().__kind, "textviewer")
  T.eq(last().title, "Carl")
end
```

(`boot` resets `shown`; the test for Carlos relies on the disambiguation `ButtonDialog` the existing test `the_sealed_tail_never_names_what_is_sealed` already exercises — Carlos is `buttons[2][1]` there.)

- [ ] **Step 2: Run** `luajit tests/run.lua 2>&1 | tail -4` — Expected: the three fail (`buttons_table` nil, `showCrawl` nil).

- [ ] **Step 3: Implement.** In `main.lua`: `local Menu = require("ui/widget/menu")` with the other requires. Replace `showEntry` with:

```lua
-- The Recap: what a tap opens. Role, tagline, a paragraph per finished book, this book to
-- the chapter before the one the reader is on, what is still sealed. One button on.
function Companion:showRecap(entry, p)
  local file = self.store:entity(entry.id)
  local viewer
  viewer = TextViewer:new{
    title = entry.name,
    text = gate.recap_text(entry, file, p.frontier, position.previous_chapter(p)),
    buttons_table = { {
      {
        text = string.format(_("The whole crawl for %s so far"), entry.name),
        callback = function() self:showCrawl(entry, p) end,
      },
      { text = _("Close"), id = "close", callback = function() UIManager:close(viewer) end },
    } },
  }
  UIManager:show(viewer)
end

-- The whole crawl: the System's description, every reached beat in voice, the sealed line.
-- Connections is disabled rather than missing when none are reached, so the row never shifts.
function Companion:showCrawl(entry, p)
  local file = self.store:entity(entry.id)
  local rels = gate.relations_for(file, self.store:load_index(), p.frontier)
  local viewer
  viewer = TextViewer:new{
    title = entry.name .. _(" · the whole crawl so far"),
    text = gate.crawl_text(entry, file, p.frontier),
    buttons_table = { {
      {
        text = string.format(_("Connections · %d"), #rels),
        enabled = #rels > 0,
        callback = function() self:showConnections(entry, p, rels) end,
      },
      { text = _("Back"), id = "close", callback = function() UIManager:close(viewer) end },
    } },
  }
  UIManager:show(viewer)
end

-- Connections: one row per relation reached, the other entry's name and the kind, the stamp
-- at the right, the note under it. A row opens that entry's Recap on top; the Menu's own
-- close returns here.
function Companion:showConnections(entry, p, rels)
  local items = {}
  for _, r in ipairs(rels) do
    local text = r.other.name .. " — " .. r.kind
    if r.note ~= "" then text = text .. "\n" .. r.note end
    items[#items + 1] = {
      text = text,
      mandatory = position.stamp_key(r.key),
      callback = function() self:showRecap(r.other, p) end,
    }
  end
  local menu
  menu = Menu:new{
    title = entry.name .. _(" · connections"),
    item_table = items,
    multilines_show_more_text = true,
    items_per_page = 8,
    is_popout = false,
    is_borderless = true,
    close_callback = function() UIManager:close(menu) end,
  }
  UIManager:show(menu)
end
```

Change the two callers of `showEntry` (`lookup`'s single-hit branch and the disambiguation dialog) to `showRecap`. In `selftest`, replace the `popup_text` log line with:

```lua
        logger.info("crawlerscompanion: selftest recap\n" .. gate.recap_text(hits[1], file, p.frontier, position.previous_chapter(p)))
```

Note on `Menu`: KOReader's `Menu:onMenuSelect` calls `item.callback()` and then `close_callback`, which closes the Menu after the row's Recap has opened on top — so the reader lands on the connection's Recap and Back/Close from there returns to the whole crawl. That is the spec's "comes back the way they went" with one fewer screen on the stack, which is the better reading experience; ledger it as a ruling.

- [ ] **Step 4: Run** `luajit tests/run.lua 2>&1 | tail -1` — Expected: all pass.

- [ ] **Step 5: The real thing.** Sync the data first so the nightly has recap/relations fields: `sh scripts/sync-data.sh` (the site's Task 1 export). Then:

```bash
cd ~/Applications/KOReader.app/Contents/koreader && KO_HOME="$HOME/Library/Application Support/koreader" CRAWLERS_COMPANION_SELFTEST=Donut LC_ALL=en_US.UTF-8 perl -e 'alarm 30; exec @ARGV' -- ./luajit reader.lua ~/Downloads/This-Inevitable-Ruin-Kindle-2024-11-01.epub 2>&1 | grep -A12 'selftest recap\|selftest dict popup\|traceback'
```

Expected: the recap text for Princess Donut at Book 7 · Ch 1 (role, tagline, "Book 7 · so far" with no lines and no "and N entries" since 7:1 has no cut below it — or paragraphs once A2 has landed), the popup button list still containing `crawlers_companion`, and no traceback.

- [ ] **Step 6: Commit** (plugin repo)

```bash
git add crawlerscompanion.koplugin/main.lua tests/test_main.lua crawlerscompanion.koplugin/data
git commit -m "Three screens: the recap a tap opens, the whole crawl one button on, connections that navigate"
```

---

### Task 4: Release and the Kobo (after sub-project A's prose has landed)

**Files:**
- Modify: `README.md` (the *Use* section describes the three screens), `scripts/package.sh` unchanged
- Site: `CLAUDE.md` (the KOReader section: the screens, `story_so_far` as a copy of `story.ts`, the previous-chapter cut)

- [ ] **Step 1:** `sh scripts/sync-data.sh && luajit tests/run.lua | tail -1 && git add -A && git commit -m "Data: recaps and gists from the site"` — once A2's prose is in the site's snapshot.
- [ ] **Step 2:** README *Use*: three short paragraphs — what a tap opens (a paragraph per book, this book to the previous chapter), the whole crawl button, connections that open other entries. Commit.
- [ ] **Step 3:** `sh scripts/package.sh && gh release create v0.2.0 crawlerscompanion.koplugin.zip --title v0.2.0 --notes "<the three screens, in two sentences; data date>"`.
- [ ] **Step 4:** Install on the Kobo: `cd /Volumes/KOBOeReader/.adds/koreader/plugins && unzip -q -o <zip> && dot_clean -m crawlerscompanion.koplugin && sync`; verify 373+ files and no `._*`.
- [ ] **Step 5:** Site `CLAUDE.md`: in the KOReader section add a paragraph on the three screens and the two copies of `storySoFar`; commit on the `recap` branch.

---

## Self-review

**Spec coverage.** Export fields and both-sides relations → Task 1. `story_so_far`, `relations_for`, `recap_text`, `crawl_text`, `previous_chapter` → Task 2. Three screens with their widgets and buttons → Task 3. Tests on both sides → Tasks 1–3. Self-test logs the recap → Task 3. Release, Kobo, README, record → Task 4. `index.json` unchanged → nothing touches it.

**Review Focus → tests.** 1 → Task 2 `survives_old_data` and `relations_for` on `{ beats = {} }`. 2 → Task 1's export test iterates every `other` against the index, floors included. 3 → Task 2 `previous_chapter` at chapter 1 and `story_so_far(CARL, 1002, 1001)`. 4 → Task 3 step 5 greps the popup buttons line. 5 → Task 3's Carlos case.

**Type consistency.** `relations_for` returns `other` as the index entry (has `.name`, `.id`) — `showConnections` reads `r.other.name` and `showRecap(r.other, p)` takes an index entry, as `lookup` does. `story_so_far` returns `this_chapter` (snake case, Lua) where `story.ts` returns `thisChapter`; the two are copies by behaviour, not by name — noted in both files' comments.

**Deviation from the spec, decided here:** the spec's whole-crawl screen listed *Back · Close* and the Connections Menu a *Back*; Back and Close would do the same thing (close that screen), so each screen has one closing button, and the Menu uses its own. Recorded as a ruling in the ledger.
