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
| 1 | 1:2 | 1:29 | | 7 | 5:end | 5:end |
| 2 | 1:30 | 1:end | | 8 | 6:1 | 6:end |
| 3 | 2:2 | 2:end | | 9 | 7:1 | 7:end |
| 4 | 3 | 3:end | | 10 | 8:1 | 8:87 |
| 5 | 4 | 4:end | | 11 | 8:88 | 8:end |
| 6 | 5:1 | 5:end | | | | |

The lint fails the build on a recap gated before its floor, and on a floor with no premise at all.

### The crawl so far is told a stretch at a time

The recap used to be one paragraph per floor, gated at the floor's end, which gave a reader in the
middle of a floor nothing, and gave everyone else three sentences where they wanted to relive it.
It is a list of parts now: `recap: [{ from, at, title, text }]`, four to ten per floor, each a
couple of hundred words covering a stretch of chapters, and **each gated at `at`, the end of its
own stretch** — the summary rule, applied a few chapters at a time. The front page shows every part
the reader has reached, stamped `Book 3 · Ch 8–13`, and one sealed line for the rest. `recapAt` is
the last part's `at`; the build resolves each part's `sortKey` and the page only compares.

The prose is written from the edition's own beats, in the narrator's present tense, and held to
the same two lint rules as a beat: **no forward phrase, no name the part's own point has not
reached**, titles included. That caught "the second floor" in a first-floor part and "Louis" (the
crawler, 5:11) in a sentence about Louis L'Amour westerns at 2:5. `check-facts.mjs` reads every
part too. The lint also fails a part that unseals before its floor, parts out of order, and a last
part that is not at `recapAt`; a floor with no recap at all is only a warning, because it leaks
nothing.

**The top of the page follows the reader.** With no book picked it is the start screen (see *A reader
who has told us nothing gets the start screen*): what the site is, the one rule, the way in, and the
back cover. With a position it is *Previously, on Dungeon Crawler
World*: the System's catch-up on everything before the floor the reader stands on, stored per floor
as `previously` and gated at the floor's own `revealedAt` (it only tells what came before
arrival, and the lint and `check-facts` read it like a part), then a line saying where they are and
linking the last stretch they have reached. Before the first floor, the back cover stands in.
The status line's own copy is static, so it names no floor: "the first floor" in it failed
`check-pages`, rightly.

The **premise** is the System's floor announcement now (`*** Now entering ***`, mono), and the
page's intro is the System too, a *Previously, on Dungeon Crawler World* that names only what the
back cover does. Floors are `<details>`: the one the reader stands on opens, the rest fold. Each head carries a gold
control that says what a click does (*Read · 4 parts* / *Close*, a chevron alone on a phone); a faint
`+` at the edge went unnoticed, and a fold nobody sees is a floor nobody opens. (For
a moment this looked like a page with no information on it, but that was a stale dev server whose
seed still held string recaps; the page now renders an old string as one part rather than
nothing.) A quick-find jump to `/#floor-N` opens its target and clears the sticky bar with
`scroll-margin-top`.
Floor 3's story now runs to 2:end (the epilogue's leaderboard and the veto) and floor 7's is told
entirely at 5:end, where the book tells it.

### A floor's name can arrive before the floor

The table above is where crawlers **arrive**, and it gates the premise. It used to gate the name as
well, and that was wrong six times over: the book prints floor names long before anyone stands on
them. The Maestro boasts about the Skull Clan's record in the **Faction Wars** at 1:43; Mordecai tells
Carl the next level down "is called the **Hunting Grounds**" at 2:3; the eleventh floor is announced
as "A Parade of Horribles" at 8:23, not 8:88. Gating those names at arrival retro-sealed words the
reader had already read and made "Faction Wars" unwritable in five books of prose.

So a floor may carry `nameAt`, which unseals **the name alone**: the front page shows it over a still-
sealed premise, and the lint and the `/achievement` screen gate the name there. Absent means the name
arrives with the floor. The lint fails a `nameAt` later than `revealedAt`.

| Floor | name printed | arrive |
|---|---|---|
| 3 The Over City | 1:44 | 2:2 |
| 6 The Hunting Grounds | 2:3 | 5:1 |
| 7 The Great Race | 5:56 | 5:end |
| 9 Faction Wars | 1:43 | 7:1 |
| 10 Don't Come in Last | 7:end | 8:1 |
| 11 The Parade of Horribles | 8:23 | 8:88 |

**The general rule: any field that summarises a span must be gated at the end of that span, not
the start.** If you add per-floor bosses, quests or events, they need the same treatment.

### A floor guide is a set of taglines, and a map is gated layer by layer

`/floor/N` is the guide to the ground the story happens on: *How the floor works*, *The lay of the
land*, *Who lives here*, *What will kill you*, then a map, every entry with a beat on the floor
(*Who turns up here*), links to the recap parts, and the floors above and below. Floor 5 is the
pilot; a floor with no `guide` redirects to `/#floor-N`, and the front page links only the ones
that have one.

- **`guide`** on a floor in `books.json` is `[{ id, title, steps: [{ at, text }] }]`. Steps
  **supersede**, like taglines: the page shows the latest step reached, stamped *As of Book 4 ·
  Ch 10*, so each step is a whole rewrite of the section as it stands at its own `at`. The lint
  holds every step to the forward-phrase and forward-name rules and fails a step before the floor
  or out of order.
- **`map`** is `{ title, layers: [{ id, at, until?, label }] }`. **A picture is content**: Floor 5
  at 4:1 is the dome, the bowl, Hump Town, a speck in the sky and hatched fog over everything below,
  because that is all Carl has seen; the island arrives with Gwen at 4:2, the flood at 4:10. A state
  that is replaced (a castle that falls) carries `until` and is not drawn from that point. The
  server renders only the layers reached, so a sealed layer is not hidden in the document: it was
  never drawn.
- **The words live in the data, the shapes in code.** A floor's page map is a voxel scene
  (`src/lib/voxel/maps/floorN.ts`): a `build(shown)` that adds voxels **only for the layers the
  reader has reached**, each tagged with its layer (`v.tag`), and an anchor point per layer for its
  callout. Shapes and hand-placed pixels only, no text, so `check-pages` reads it like any page
  source and the lint reads every label at its layer's own point. `scripts/test-maps.mjs` fails a
  floor with map layers and no voxel map, an anchor for a layer that does not exist, a labelled
  layer with no anchor, and any timeline state that does not render.
- **One renderer for tiles and maps** (`src/lib/voxel/vox.ts`, see *Tile pictures are voxel
  dioramas*). For a map it also returns which layer each pixel shows; `mapscene.ts` turns that into
  one SVG mask per layer, embeds the PNG as a data URI, projects each anchor into the picture, and
  caches per floor and layer set. `MapVoxel.astro` draws the picture, the numbered callouts and the
  masks with the same classes the highlighting script already used, so pointing at a key entry, a
  marker or the feature lights it and dims the rest exactly as before. The earlier flat pixel and
  section renderers are gone; the history has them.
- **Glass is see-through**, because floor 5 is a bubble: a material with `alpha` blends over what is
  behind it, shows only its outer skin (never every block inside a pane), never takes a seam, and
  over open air its silhouette gets a bright cyan rim instead of the dark outline. **A dome reads
  round only on a round base, about 1.4 radii high**: an oval base and a tall dome drew an egg.
- **The map can be rewound, never fast-forwarded.** Above it is a timeline of the points where the
  map changes (`mapSteps()`: every layer's `sortKey` and `untilKey` up to the reader's frontier),
  with Play and a line saying what each step added and took away. `?at=` picks a step and
  `pickStep()` clamps it to the frontier, so the address cannot look ahead either; a reader who has
  finished the book can walk back through every state. Each step is a server render of the same
  page, fetched and swapped into the figure (map, key, caption) with the slider left in place so it
  keeps focus; ticks are real links for no JavaScript. Two details: the slider's value is the
  *chapter*, snapped to the nearest change, because evenly spaced stops put the thumb nowhere near
  its tick; and arrow keys move one change, not one chapter. Only the map rewinds; the guide stays
  at the reader's position.
- **Under 640px the map is the whole floor at a glance, and Explore opens it full screen.** It used to
  keep a 640px width in a strip that scrolled sideways, so a phone saw a corner of the floor. Now it is
  fitted to the width, its numbered markers drawn 1.55× so they still read (each rect and number scales
  round its own centre, `transform-box: fill-box`), the key folded to its first six places behind *All N
  places*. **Explore** puts the same figure `position: fixed` over the screen at 1000px, scrolling both
  ways, the key a row of places along the bottom; lighting one scrolls the map to it on both axes. The
  state is classes on the figure (`phone-ready`, `is-explore`, `keys-open`), because the timeline swaps
  the figure's children and never the figure, so a rewind keeps it; the buttons are server-rendered
  and their clicks delegated for the same reason. A fixed bar of the page's sections (`#jump`) slides
  in under the header once the head has scrolled away, the section in view marked; it lives inside the
  head section so that `section + section` spacing, which counts hidden elements too, is unchanged on
  the desktop.
- **Nothing on the picture may collide.** `MapVoxel.astro` places the title plate first, then each
  number on the first free spot round its target (outside and up first, never on another number, the
  title or the edge, preferring a leader that crosses no marker), then each name right of its number,
  else left, else above or below, inside the picture. Names and the title carry `textLength`, so a
  wider fallback font squeezes the text instead of running it out of its box. A first version put
  every number at a fixed offset and 80 map states had two numbers on top of each other; check any
  change by measuring every timeline state of every floor, not by looking at the last one.

### The homepage is the overview; a floor's page is its story

The homepage used to carry two lists of the same floors: an overview and the whole crawl, folded.
They are one now. The top follows the reader (*Welcome* or *Previously*), and under it is **The World
Dungeon**: eighteen tiles, one per floor. Eighteen is on the back cover, so the count is safe; what
fills each tile is not.

| tile | when | shows |
|---|---|---|
| reached | `revealedAt` passed | its book's colour, its picture once `artAt` is passed, a link to `/floor/N` |
| current | the last floor reached | spans two columns: the picture, the arrival, the last stretch reached |
| named | `nameAt` passed, not reached | the name and where it was printed; **no colour**, which would say which book it is in |
| foretold | a note or a name reached (floors 12–18) | what the books have said so far, note by note; "Not yet named" where no name exists |
| sealed | otherwise | its number on the rail and the uncharted island (below), dimmer, with a stone question mark |

Every reached floor has a page (`/floor/N`), and it is where the story lives: the map if one is
drawn, then **The crawl**, the recap a stretch at a time with the sealed tail, then the guide sections
if curated, then everyone met on the floor. Quick-find's floor hits and the *Previously* line link
there. The app fixtures accept both `/#floor-N` and `/floor/N` as a floor target.

### A reader who has told us nothing gets the start screen

With no position (book 0, `mode === 'welcome'`) the homepage is not the descent: with nothing read it
would be eighteen sealed islands, which says nothing. It is `StartScreen.astro`: the homepage's masthead
(*The Crawl So Far*), the System's one rule, **Enter the dungeon**, which opens the position picker in the
header (its click kept from the document, or the panel's close-on-click-outside shuts it at once), and
the back cover below. Beside them is the way in as the first chapter has it (`scenes/entry.ts`): a
January night in Seattle, every building simply gone, the cars' car-shaped dents of dirt in the asphalt,
the bare tree, the bikes in the rack, the moped still in its parking boot, the stop sign with its street
sign gone, a fire far off, and in the lot where the thrift store stood the brightly lit hole with its
wrought-iron staircase going down into the light, Carl in his pink Crocs at its rim and the cat at his
feet. She is drawn for the scene at a cat's size, on a slab of the gone building's concrete so her
tortoiseshell shows against the dirt: her own figure is made to stand alone and is as big as he is.
It is back-cover and opening-page material and nothing past it, so `/art/entry.png` is public and
immutable like the uncharted island, and the figures are copied in without their gated addresses (a
fresh reader's `/art/figure/carl-0.png` is a 404). The spotlight is the page's, not the picture's: a
blurred cone raised from the hole's mouth (`entryArt().beam`, projected from `ENTRY_HOLE`) into the dark
over it, cut inside its element and blurred outside it, because a filter on the clipped element runs
before the clip and left hard edges. Drawn in voxels it read as a beige pillar. On a phone it stacks,
title, picture, rule, and the button pinned in reach at the foot (`position: sticky`, so the section
clips with `overflow: clip`: `hidden` would make it the button's scroll container and unpin it). The
eyebrow names *Dungeon Crawler World*, tagged 1:4, under the same documented exemption as the
homepage's. Picking a book reloads the page, and the page is then the descent.

### The homepage is a descent, and a floor opens in place

The eighteen floors hang one below the other down a shaft (`src/pages/index.astro`), zig-zagging,
joined by stairwells the page script draws in SVG from each floor's way down to the top of the next.
The stairs are measured from **layout boxes** (`offsetLeft/Top`), not painted ones, so the islands'
float and the rise-in do not drag them. A finished floor's stairwell leaves from its real stairs
(`STAIRS` in `src/lib/voxel/art.ts`, a map anchor projected into its picture); an unfinished one
leaves from the island's underside, because a shaft from the stairs would say where the stairs are.
Lit only between reached floors, dashed fog after.

**The homepage is the crawl, and the crawl is a descent.** The System's box (the HUD) sits in the
left column, as tall as what it says (the script measures every card and eases the box's height
itself, up to the room there is), pinned with its middle on the middle of the view under the header.
**The focus line** is the middle of that box, and the floor in view is centred on it. The descent's
top padding (`lead()`) puts floor 1 on it at scroll 0 beside its own card, which is why there is no
intro block above the first floor. **On a phone the box is a bar docked at the foot of the
screen** (`--sheet-h`, 96px) and the focus line is the middle of the room between the header (and the
title's band, at home) and the bar. The bar says only the floor in view, by number in its book's colour
and name, and one button on the same middle, **What happened**, that opens the floor's card (*What is
known* for a floor only heard of, nothing for a sealed one); a first visit's bar is taller (`.is-welcome`,
158px, 180 under 360px) and gives the one rule in a sentence over **Pick your book**, which opens the
header's panel. The depth rail is a gauge of eighteen segments along the bar's top edge, and the card is
the whole screen with *Above · Close · Below* along its foot. Everything else the desktop's box says (the
*Previously*, the last stretch, the status) is left to the card: the phone markup carries a short label
beside the long one (`.go-short` / `.go-long`) and a `.hud-lede`, both hidden on the desktop. It began as a
122px strip of 11px text pinned under the header, clipped mid-sentence, which with the title over it left
the floor low in dead space, and a reader called it wrong and wonky; then a 240px console of the whole
catch-up that a phone scrolled inside, and a reader asked whether a phone needed it at all. All of it is
inside `max-width: 999px` and the script's
`narrow` branches; desktop screenshots diff to zero against the version before.
**On a phone a swipe is one floor.** Scrolled freely under a finger the page fought the pin the way a
mouse wheel did (held, then caught up at twice the finger's speed, then a glide that waited out the
browser's own momentum), and a reader called it glitchy. Now the descent is a vertical slider: the
finger drags it one to one with the pin off (`dragging`), and letting go travels to the next stop or
back to this one, handing the mover the finger's speed (`travel(to, { v })`). Which way is read off the
finger alone (its speed, else how far it moved since the touch began), never off where the view
stands: measured from the stop a glide was heading for, a swipe begun mid-glide read as a swipe back.
That stop is taken on `pointerdown`, because a touch's pointerdown comes before its touchstart and an
older handler stops the glide there. A second swipe during a glide goes one on from where it was going.
Native scrolling stays wherever something scrolls by itself (the console's long text), for a sideways
or two-finger touch, and in the header and the position panel. To test it, drive it with
CDP `Input.dispatchTouchEvent`: in headless Chrome each synthetic "100ms" swipe takes about 600ms, so it is a slow
drag, decided by distance.
***You are here* is lifted over the blur, on every width.** Inside its island it sat under the tilt-shift
(the levels are transformed, so nothing in them can rise above it), and even at home its label stands in
the soft band over the floor. So the script moves it into the crawl as `position: fixed`, z-index 5 (over
the tilt at 4, under the card at 6, the console and the title), stands it on the island's top every frame
from the level's box and the island's own offset in it (the transformed level may itself be the island's
`offsetParent`), scales it with the island round the island's own `transform-origin` (its outer edge on
the desktop, its middle on a phone), runs the island's `bob` in step by copying its `currentTime`, and
fades it when its floor collapses or a card opens. It was lifted on the phone first and left inside on the
desktop, and a reader asked why it was still under the blur there. **The card's
picture is made by the script (`lend()`), so a scoped rule never reaches it**: on a phone it is sized
by a `:global(.isle-img)` rule, or a tall floor's picture ran 50 to 120px out of its row (and 650px
in landscape).

**Home is the reader's own floor, and the title stands over it.** The page opens on the reader's
floor, so that view is the homepage: *The Crawl So Far* full size over the box, the box under it, the
floor beside them. Moving off toward the next floor or the one above, the title shrinks into a small
title over the box by a little over halfway there (`homeAt()`, `kAt()`), tied to the scroll like
everything else, and grows again on the way back; with nothing read, home is the top. On a phone it
is a band over the strip at home that slides away under the header elsewhere. It used to sit at the
top of the page in the flow, so a reader opened on floor 11 never saw it, and a reader called the
page "no longer home". Once the script runs the title is out of the flow (`.pinned-title`: a sticky
line of no height, scaled on its own compositor layer, or every scroll frame repaints 72px text), so
the box's place is worked out in `boxTopFor()`: centred, unless the title over it needs the room.
The focus line therefore depends on the title, and `restOn()` puts each floor on the line with its
own card in the box and the title at the size it has there (full only over home). At home the box
takes the room left under the full title and its text scrolls if the card is longer, which a first
visit's welcome is. The title hides while a card is open.

**One header on every page, pinned** (`Layout.astro`): the DCC mark (home), the five sections, search
and the reader's position as a chip, in one row of 57px (53 on a phone); the position's panel drops
over the page from under it and never changes its height, which the homepage measures its room from
(an in-flow panel once grew the header to 330px and the descent relaid itself for it). It replaced a
pinned gate bar with the masthead scrolling away under it, which left a reader on the homepage with
no way to another page and cost a phone 263px of chrome. Under 980px the sections fold into a menu
that names the section the reader is in (a floor's page is Floors); under 360px it is an icon,
because "FLOO…" reads as broken. Check a header change at 320, 390 and 1440 in every reader state:
the chip's text is longest for a first visit.
The header marks the section a page lives under, not only its own page: `aria-current="page"` on the
page itself, `"true"` on the parent (`PARENTS` in `Layout.astro`: `/floor/…` is Floors, `/entity/…` is
Who & What), styled the same.

**Moving between pages is a view transition, and only a real pair travels.** `@view-transition
{ navigation: auto }` (global.css) sinks the old page and raises the new one, and a floor's picture
and name (`floor-art-N`, `floor-name-N`) travel between the homepage and `/floor/N`. Every element
that keeps a name and has no partner becomes a piece of its own that ignores the page's sink and
rise, and the homepage names all eighteen islands, most of them off screen or collapsed: that is
what made the map's transition go wrong now and then. So an inline script in `Layout.astro`'s head
strips names on `pageswap` down to the pair the next page shares, and only if it is on screen,
hands the list over in `sessionStorage`, and on `pagereveal` the next page strips any name not on
it; names come back afterwards and on a back-forward restore. A homepage freshly loaded rises like every
page (the new view is live, so the floors appear in it as the script places them), but it has not
put the reader's floor in view when its first frame is taken (`window.__descentPlaced`), so none of
its floors pairs. Skipping its transition instead made the floors just pop up, and a reader called it
out: keeping the header out of the animation was the whole request. **The header is a layer of its own** (`#top`,
`view-transition-name: site-header`) that never animates, the new page's shown at once, so the
section marked in it changes and nothing else does; sinking with the page it looked like a glitch.
To see what a transition animates, read `document.getAnimations()`' pseudo-elements once
`viewTransition.ready` resolves in `pagereveal`.


The sequence, every part tied to the scroll and so reversible, and true to the book (a floor left
behind collapses):
1. The floor on the focus line is whole and lit; the next waits below, dark but solid (a filter,
   never opacity, or the stairs behind it would show through) and soft in the tilt-shift; the
   floors above are gone.
2. Scrolling down, the stairwell builds out of the floor step by step (`.stp` / `.stp.on`, a few
   already at rest as the way down), to the next floor.
3. The next floor **clicks onto the focus line and is pinned there**: within `PIN` of the line its
   drawn distance from it is 0, beyond `PIN + LEAP` it is its laid-out distance, and between them
   a Hermite curve that starts at rest and ends at the page's own speed, so the floor catches up at
   up to about 2.4× the scroll for a moment and stops dead, with no jump. `PIN` is about one wheel
   notch (100px; 64 on a phone), so a notch never shakes a floor loose and the second releases it.
   The first version eased with `tanh` over 220px and a reader called it loose: a floor that is
   always drifting a little is never anywhere. The layout leaves `--dwell` between floors for the
   pin, and the steps follow the two floors they join through it.
   **The wheel and the keys step; they never scroll.** Scrolled freely, a mouse wheel fought the
   pin: a notch inside it moved nothing, the next flung the floor off at twice the page's speed, and
   the glide to rest started in the pause between notches only to be cut off by the next one. So a
   wheel gesture (a run of events with no pause of 180ms, read off the events' own `timeStamp`) is
   one floor: it steps as soon as it has moved 30px, and steps again only if it keeps coming at
   full strength once that step is 60% done, which a wheel rolled on does and a trackpad's momentum,
   dying away, does not; turning back answers at once. ↓ ↑, Page Down / Page Up and Space /
   Shift+Space step too, Home and End go to the top and the bottom, Enter opens the floor in view,
   and keyboard focus on a floor's link follows the view. The stops are each floor on the line (the
   first at scroll 0), and the bottom of the page past the last. Left alone: zoom, a sideways
   scroll, an open dialog, the card, anything that scrolls by itself (`scrollsItself()`), typing,
   and Space or Enter on a control. A key hint sits under the rail on a fine pointer.
   **One mover** (`travel()`) runs every step, the rail, the card's moves and the rest glide: a
   cubic Hermite from where the view is, at the speed it already has, to the stop, arriving at rest,
   so a step asked for mid-step carries its speed into the next and never hitches. A fresh one
   leaves at 2.6× its average speed (an ease-out; above 3× it would overshoot). **The pin is off
   while a step runs** (`pinW`), so the floors move as one and the curve is the snap; ridden through
   the pin, a step held the floor for its first notch and then flung it. The pin eases back in over
   about 90ms if the reader takes over halfway. A finger or a button on the page, or the page moved
   by anything else, stops a move where it is. Past the last floor there is no pin: it scrolls away
   to the bottom. Headless Chrome delivers real wheel events hundreds of milliseconds apart, so the
   tests dispatch synthetic ones on a timed plan; `page.mouse.wheel` there proves nothing about
   gestures.
   **Scrolled freely** (a finger, the scrollbar), the view always comes to rest on a floor, never
   between two: 170ms after the last scroll (never while a finger or a button is down or a card is
   open, never at the very bottom) it glides, pin on, to the next floor in the direction of travel
   if the one left has moved past its pin, otherwise back onto it, which inside its pin never moved
   on screen, so that correction is invisible.
4. Behind, the floor left collapses: from a little before halfway to the next floor it cracks,
   its underside and rim give first, its chunks sink, tip over their outer edge and fade into the
   dark with crumbs and dust, the middle of the surface last (see below), and its stairs crumble
   top first. Without WebGL, or before its blocks have arrived, a floor sinks and fades whole. The
   reader's pin goes with it.
5. Scrolling up rewinds it.

**Every floor is as wide as the stage** between the box and the rail: 88% of the shaft, so the
floor in view (scaled 1.14) reaches its edges exactly, whatever its picture's proportions. Its
height follows the picture, up to `--maxh` (72% of the view under the header, 640px at most; on a
phone 54% of what the strip leaves). The first rule capped every picture at 320px tall, so a wide
one (floor 7) filled the stage and a tall one (floors 1, 5, 9, the uncharted islands) came out half
as wide, and a reader called it ridiculous. Check a sizing change on every floor side by side, at
1440×900, 1366×768 and a phone, not on the floor in front of you.

The box speaks of the floor in view: its number in its book colour, its name, its *Previously*,
where the reader is, or what is known (a visitor with nothing read keeps the welcome). The floor in
view also grows a little (`scale`; the float is `translate`, so the two never override each other —
a `transform` float once silently cancelled the zoom). **Tilt-shift**: a sticky layer over the
descent blurs above and below the focus line in three backdrop-filter steps, placed from where the
layer actually is (at the very top it has not reached its pinned place yet). The reader's floor
carries a gold *You are here* pin; a depth rail on the right shows all eighteen floors (colour only
where reached), lights the one in view, rings the reader's, and takes you to a floor on click.

**The page always opens on the reader's floor** — on a reload too. Only *Back* (to the floor left
from, `sessionStorage` `dcc-descent`) and a `#floor-N` link open elsewhere. The browser's own scroll
restore is switched off in an inline script before it can act (set from the module script, it came
too late and restored the old position over the reader's floor), the fonts are waited for before the
floor is placed, and it is placed again on `load` unless the reader has started to scroll.

**A floor collapses as its own cubes.** `render()` reports every opaque block that shows at least
one pixel in the picture, with the colour its faces are lit from; `/art/cubes-N.bin` serves them
packed (count, int16 x/y/z, rgb + flags; 1–5k cubes, 12–54 KB a floor), gated exactly like the
picture they come from. A floor about to go gets a WebGL2 canvas at the picture's own resolution,
reaching well below it for the fall, and three passes a frame:

- **The picture itself**, less every chunk that has broken away. An id buffer, drawn once by
  rendering every block at rest, says per pixel which chunk owns it and how deep it sits (pixels
  next to a block, the outline, a flame, a banner's edge, are dilated onto it); the picture pass
  writes that depth, so a chunk falling behind the part still standing is hidden by it.
- **The chunks that have broken**, as cubes, their visible faces coloured from the picture at their
  place of rest (a face the picture hid gets its block's own tone). So a chunk looks exactly like
  the picture when it starts to move and carries its own pixels down with it.
- **Crumbs and dust** as points, born where a chunk breaks.

Chunks are irregular: a jittered grid of column seeds in the plane, each block to the nearest
(measured from its 2×2 cell so a big block stays whole), cut into bands four deep. Each cracks and
settles (`LEAD`), then drops (`DUR`, gravity, a tilt over its outer edge, a little drift), darkening
and fading to nothing. **Nothing is still visible when the floor counts as gone**, which is what
made the first version pop: its cubes were opaque to the last frame and the canvas was then
removed. The picture fades over the canvas across the first `HAND` of the collapse rather than
swapping in one frame, because a browser places two scaled images a sub-pixel apart and the swap
showed as a shimmer; nothing cracks before that. Whether a floor falls as cubes or sinks whole is
decided once as it starts to go, so it never switches halfway.

**Building a rig never costs a frame.** It is a generator resumed in idle time (prepare chunks,
compile with `KHR_parallel_shader_compile` where there is one, upload, id pass, dilate), started
while the floor is still on the focus line so it is ready before it is needed, paused while a card
is open or has just moved, and given one slice a second on a page that never idles. Rigs live from
the floor on the focus line to the one just left and are released beyond that. The rules for the
canvas are `:global` because the script makes it. Earlier tries, all gone: the next floor
*building* as it rose (backwards for the book), opaque cubes flung outward and spinning (read as an
explosion, not a collapse), gated sheets of height cuts, and 16px tiles of the picture flying in.

**The card's picture is a fresh `<img>`, never a clone of the island's.** A clone carried the
island's own state: half faded mid-collapse, or `opacity: 0`, which is why stepping *down* in the
card showed nothing while stepping up (to whole floors) worked.

**Details** widens the box into one card across the column: text left, the floor's picture flown in
on the right, ▲ ▼ ✕ beside it (↑ ↓ and Escape too). The page is held still while it is open
(`html:has(.crawl.is-detail)`); ▲ ▼ move the descent behind the card so closing lands on that floor.
The card's panel is its own layer grown with a transform, never a clip-path, and nothing animates a
blur: both repainted every frame. `?floor=N` renders the card open on the server. The box, the
descent and the card are placed in the grid explicitly: auto-placed, the card pushed the other two a
row down and the whole descent jumped 692px on every open. Floor positions are measured from layout
boxes when the layout changes, never read per frame, and every island's box is fixed by its
picture's aspect ratio before it loads. The reader asked for this exact shape after an overlay, a
sidebar and an in-row card; do not swap it for another. Everything stays inside the 1080px column;
only the debris behind it runs full width.

### A floor ahead has a page too

Every floor that is not sealed has a page at `/floor/N`. For one the reader has reached it is the
floor's own; for one they have only heard of, `/floor/N` rewrites to `src/pages/floor/ahead/[id].astro`:
the name if printed (with where), the picture once its `artAt` is passed, and every foretold note
reached, as a timeline. The homepage tile links there instead of folding the notes into an
accordion. `src/lib/floorstatus.ts` is the one place that decides reached / named / foretold / sealed,
for the homepage, both pages and the up/down links. The page says nothing about **when** the floor
arrives or **how many** notes are still sealed: the first would name its book, the second would say
how much the books have left to tell. A sealed floor still redirects home.

### Floors the crawl has not reached: `foretold`

`books.json` carries `foretold: [{ id, name?, nameAt?, artAt?, notes: [{ at, text }] }]` for floors
12–18: what the books say about a floor before anyone stands on it. Notes **accumulate** (each adds a
fact at its own `at`), unlike guide steps, which supersede. The lint reads every note against its own
point, puts each foretold name in the same forward-reference list as entity and floor names, and
`check-pages` treats it as gated too. A floor the books describe but never title has no name, and the
tile says so rather than drawing a redaction bar that suggests one is hidden.

### Tile pictures are voxel dioramas, gated by `artAt`

Each tile's picture is a small floating voxel diorama (`src/lib/voxel/`): a scene built in code from
cubes, rendered in true 2:1 isometric with a lit top, a mid left face, a dark right face, a seam
between blocks, a hard outline round the silhouette and warm light round anything that burns, then
written as a PNG and scaled with `image-rendering: pixelated`. Pictures are drawn at `ART_SCALE` (2):
at scale 1 a block is a 4px cube and a scene reads as Lego noise; at 2 every block is bevelled (lit upper
edges, shaded lower ones), carries a three-step grain, and a flame is a four-heat teardrop drawn over
everything. The page keeps its coordinates at scale 1 (mapscene divides), so callouts did not move. At
that size an RGBA PNG of a map was 350-450KB, so the site encodes a 256-colour palette PNG with `sharp`
(`encodePalettePng`, a third of the bytes); `encodePng` stays for the scripts.
The look was set by the reader pointing at manatoastmedia.com's floor art: **take each floor's essence,
not its pixels**, in this site's own palette. Their character sprites are left out (a face is a
spoiler); only Carl and Donut, who are on the back cover, appear.

**The look runs one way: manatoast's art → the tile → the page map.** Each floor's tile is
`src/lib/voxel/tiles/floorN.ts` (floors 12–18 still live in `floors.ts`), and its page map
(`maps/floorN.ts`) is drawn in the tile's materials, building style and props, scaled up to the whole
floor. A pass that "corrected" the tiles for book accuracy made them worse in the reader's eyes and
was reverted: accuracy decides what a map layer depicts and when, never the look. When a tile shows
something before its point, move `artAt` later rather than redraw the tile; that is why floors 2, 4,
6, 8, 9, 10 and 11 open their pictures a few chapters after arrival.

**Big blocks and small ones.** `v.chunk = 2` (or 3) before drawing groups each aligned 2×2×2 cell
of one material into a single block with one bevel and one tone; `slab()` builds every island that
way by default, so ground and masonry read big and whatever stands on them reads small. Vary a
surface per cell, not per voxel, or neighbours differ in material and the big block falls apart.
`banner()` hangs cloth down any face, including an island's own side; `slab()` takes `under` for
the colour of its rock. Floor 12 is the model for a dynamic island: stepped levels, a terrace, a
loose chunk, banners over the edge.

**A floor can have two pictures.** `VOXEL_HEROES` in `floors.ts` holds a floor's hero moment, and
`/art/floor-N.png` answers with it once the reader has passed the floor's `recapSortKey` (the end
of its story), at the same address with a different `?v=`. While reading, the tile stays the
spoiler-free one. Floor 11 is the pilot: the arena while reading, Scolopendra rearing over the gate
once it is done. A hero picture may show what the floor's own story shows, faces included, because
only a reader who has finished it is sent one.

A picture is a summary of a floor in one image, so it obeys the summary rule: **`artAt` on a floor or a
foretold floor is the point by which everything in the picture has been read** (floor 1's dozer at
1:2, floor 5's sky castle at 4:2, Sheol's fire at 2:24). `/art/floor-N.png` checks the reader's own
cookie against it and answers **404** before that point, so a sealed picture cannot be fetched by
typing its address; past it the PNG is drawn once per process and served `private`, `Vary: Cookie`.
The lint fails an `artAt` before its floor; `test-maps.mjs` fails a picture with no `artAt` and one
that does not render. Floors 13 and 14 have no picture of their own: the books give nothing to draw.

**A floor with no picture to show still gets one in the house style: the uncharted island.**
Floors 13 and 14 always, every floor a reader has not reached the picture of, and all eighteen for
a first visit. It used to be a CSS slab with a number on it, which was the one thing on the page
not drawn in voxels, and a reader called it out. `tiles/uncharted.ts` draws a rounded oblong of
dark rock in big blocks with a dirt underside, a terrace and a loose chunk, rock spires standing in
it, banks of cloud in big 2×2×2 blocks piled over the floor so whatever is there is lost in them, a
thin veil spilling over the rim, and the System's question mark floating over it: **gold** with
sparks where the books have said something (foretold, named, or reached before its `artAt`),
**stone** over night cloud where the reader has been told nothing. **It is as big as the drawn floors
beside it** (12, 15–18) and at least 0.9 as wide as it is tall, which `test-maps.mjs` asserts: the
first island was two thirds their size and an oval, which in the iso comes out narrow because the
corners are what make an island wide, and on a page where every floor is drawn as wide as the stage
it read as a smaller floor. A see-through fog (the `mist` material over the whole top) read as frosted
glass over a tiled floor, and an opaque bank stepped per 2×2 cell read as gravel; puffs of cloud in
big blocks read as cloud. The shape is seeded by the floor number
(`test-maps.mjs` fails two floors drawing the same island), so the descent is not eighteen copies,
and nothing in it is a fact, so `/art/uncharted/N-known.png` and `-sealed.png` (and `.bin`, its
blocks, so it collapses like any floor) are served to anyone, `public, immutable`. `pictureFor()`
in `art.ts` is the one place that decides own picture or island, for the homepage, the card and
`/floor/ahead/N`; the gate stays with the caller. Mind the iso when placing anything over a heap:
whatever stands in front covers what is higher up behind it, which is why the mark stands near the
front and well above the cloud, or its foot and its dot vanish.

### A character is a voxel figure, gated look by look

Every character stands beside their name on their page as a small voxel figure on a patch of
ground (`src/lib/voxel/figures/`), drawn in the floors' renderer. The look comes from the reader
pointing at manatoastmedia.com's character portraits: a chibi, a big head on a short body, dot eyes,
one or two things that make the character who they are. Like the tiles, **take the essence, not the
pixels**, and draw each look from the edition's own description at its point, not from the
reference: the reference gives Donut a gold crown where the book's is smoky dark gems round a purple
stone, and Zev a grey mech where the book's is a white mesh 1950s spacesuit.

- **A figure is a summary of how someone looks, so it obeys the summary rule.** `figure` on a
  character in `data/entities/characters.json` is `[{ at, look }]`, superseding like taglines; the
  build writes `figures: [{ look, at, sortKey }]` (the `figures` column), and the page shows the
  latest look reached, stamped *As of Book 1 · Ch 35* when the look changes over the story. Carl is
  the model: the pink Crocs at 1:1, barefoot at 1:2 (they went flying), the jacket's right arm gone at
  1:15, the heart-covered BigBoi boxers at 1:35. The lint fails a look before its character, looks
  out of order, and a figure on anything but a character; `test-maps.mjs` fails a look named in the
  data and not drawn, or one that does not render.
- **`/art/figure/<id>-<n>.png` is gated like a floor's picture**: 404 short of the character's reveal
  or of look n's own point, `private`, `Vary: Cookie`, the address carrying the picture's hash. A
  character not drawn yet, or whose first look the reader has not reached (Zev is named at 1:35 and
  described at 1:36), gets the shadow figure with the System's question mark, `unpictured.png`,
  public: a placeholder in the house style, as the uncharted island is.
- **Drawn smooth.** `v.chunk = 0` makes every voxel of a material one piece, bevelled only where it
  meets another, or a figure reads as a pile of bricks; a part that touches another of the same skin
  uses `twin()` (the colour one step off) to keep its edge. A colour can be a material (`'#e3a77c'`).
  The figure faces +y, the lit left face of the iso, with +x its right side.
- **Shapes and colours only** in `cast.ts`, keyed by entity id: `check-pages` reads it like any page.
- **Where a figure stands:** beside the name on the character's page (the page's size), in every
  character's cell on `/who` and in the line-up of characters under *Who turns up here* on a floor's
  page (the small size, `-s.png`, drawn at scale 1 rather than scaled down, which smears the
  blocks). A sealed cell on `/who` gets the shadow figure, which says nothing. A floor's line-up shows
  each character **as they looked on that floor**: the latest look by the floor's `recapSortKey`, never
  past the reader, or their first look if the book only describes them later. Showing the reader's
  latest look put Mordecai on the sixth floor's page as the crafting table he is by 8:89. The line-up stands
  every figure on one ground line so the names under them align, whatever a figure's height.
  A `/who` character cell is a **portrait card** at every width: a stage of one height (188px, the
  tallest small figure) across the top, the figure standing on its floor at its own pixels, the name,
  role and tagline under it at the card's full width, and the whole card one link. Beside the text,
  figures from 72 to 132px wide started every name somewhere else, and a reader asked for the boxes to
  be restyled; it is now the same shape as a floor's line-up. On a character's own page the figure
  stands beside the name, and under 560px over it, centred: beside it, a phone squeezed the tagline
  into a third of the screen and a reader called it cramped.
- **Most of the cast are people**, so `person()` in `parts.ts` draws one from a short spec (skin,
  hair and how it is worn, what they wear and on their feet, a beard, glasses, a hat, a cape, what
  they carry); a non-human gets a builder of its own in `cast.ts`. Research a look by reading the
  character's first description in the edition (`data/index/books/text`), never from memory.
- **The whole cast is drawn where the books allow**: 192 of 218 characters, 310 looks, each at the
  chapter the edition describes it, researched from the text and drawn from that research. Book 1's
  cast is in `cast.ts`; books 2 to 8 each have a file (`book2.ts` … `book8.ts`, exporting
  `BOOKn_FIGURES`), spread into `VOXEL_FIGURES`. The main cast changes most: Carl gets the
  nightgaunt cloak at 1:6 (the first pass missed it) and twelve more looks through the kangaroo
  suit; Mordecai is a new creature on almost every floor and the crafting table from 8:89; Mongo
  grows up; Katia's fighting form, crossbow and riot shield arrive in book 3. A character the books
  never describe (26 of them: Yvette, Mukta, Menerva, Theia, the Night Wyrm…) stays a shadow, and one
  described only much later starts there, because an early look would be invented. Where the book
  leaves a colour unsaid, a figure takes a plain one (`PLAIN_*` in `parts.ts`). The System AI has no
  body, so its figure is one of its own message boxes; a god seen only as a symbol is the symbol.
  A look name may appear once per character: a return to an earlier look is a new name on the same
  builder (Bomo's `unarmored`, Carl's `unsuited`).
- After changing figure data, `npm run content:build` **and restart the dev server**: the seed runs
  at boot, so a running server keeps serving the old looks (a shadow where a figure now is).

### Static copy in a page is ungated by construction

The other half of the same problem. However correct the data is, a sentence typed into an `.astro`
file is shown to everyone. The Position page once explained the gate with *"Floor 7 — the Great
Race — opens at the close of book 5"*, which handed a floor name to a reader on book 1.

`scripts/check-pages.mjs` (part of `npm run content:check`, so CI runs it) takes every entity and
floor name that is **not** safe at `1:1` and fails the build if it appears in page source. Three
details make it work rather than merely exist:

- **word boundaries** — without them "Tran" matches inside `transparent` and the check drowns in CSS
- **case-insensitive for a name of more than one word** — the copy that shipped said "the Great
  Race" against a floor named "The Great Race", and an exact match sailed past it. A one-word name
  matches as written, the line the lint and `leak.ts` also draw: the crawler Tally would otherwise
  have made every `tally` counter in the page source a leak
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

Defaulting to book 1 (as this did) spoils book 1 for someone who has not read it.

**Choosing a book opens a picker; it does not commit.** A tap on a book number used to mean *I have
finished this book* on the spot, so a reader who had just started book 3 unsealed all of it with one
click. The position is a chip in the header now (*I've read up to · Book 5 · ch 40*, *Pick your book*
in blood for a first visit) that opens a panel under the header: the eight books and *Show
everything*, and for the chosen book (the saved one when it opens) its title, *Where are you in it?*,
a chapter slider that starts at chapter 1 (or where the reader left off, for the saved book), and
three explicit commits: **Save · up to ch N**, **I finished book N**, and **Clear my progress**.
Cancel, Escape or a click outside writes nothing. The cookie shape is unchanged — chapter 0 still
means finished, and that reading now only ever comes from the button that says so. The panel's
selectors are scoped to `#pick`: a beat's book stamp is a `.bk` too, and the old bare `.bk` handler
caught clicks on stamps.

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

**A tagline is written in whole sentences.** The first set read like telegrams — *"Twenty-seven.
Coast Guard, marine technician."*, *"Art history professor, Reykjavík."* — and a reader called it
rushed, rightly. Every step now has a subject and a verb and is read against the book at its own
`at`: the rewrite caught *"even a bronze one beats a plain gold box"* wrongly doubted and then
restored (Mordecai says exactly that at 1:4), Jurgen's pregnant wife one chapter early, and a
Quetzalcoatlus beat that killed Gwen at 4:29 when the notice only hails her.

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

### Quick-find: every page, one keystroke, nothing held in the page

`/who` could filter, but only once you were on `/who`. Now a **Search** button sits in the masthead of
every page, and Ctrl/⌘-K (or `/`, where the page has no filter of its own) opens it. Type a few
letters, pick with the arrows, Enter goes straight to the entry — or to a floor on the front page.

**The index never leaves the server.** Each keystroke asks `/find.json?q=`, which reads the reader's
own `dcc_pos` cookie, ranks only entities and floors they have reached (`src/lib/quickfind.ts`), and
answers with at most twelve. That is the `/who` argument taken one step further: there is no list in
the document to gate, only the handful of hits for what was typed, so a sealed name cannot be one of
them. Aliases go through `aliasesSeen`, floors through `nameAt`; the response is `private, no-store`
and varies on the cookie. Word starts only, like every other filter here. Without JavaScript the
button is a link to `/who`. `npm run test:gate` pins the gate; `npm run smoke` asks it for Carl.

**It searches the story, not just the names.** The first version matched names, aliases and roles,
and a reader typed "bride" and got nothing — "the Bedlam Bride" was not an alias of anyone, and
the phrase lived in beats. Now a name or alias hit ranks first, then an entry whose *reached*
tagline says it, then an entry whose *reached* beats do, one row per entry with the chapter and a
snippet of the line. Every typed word has to start a word of the text. Beats past the frontier are
never read: the corpus is loaded once per process (content only changes on deploy) and gated per
request. **A story hit lands on its own line**, not the top of the page: its href is
`/entity/<id>#b<beat id>`, the entity page gives every entry that id, and the page script centres
it and marks it in gold (`.is-hit`, and `:target` without JavaScript, with a `scroll-margin-top`
that clears the gate bar). A book filter hiding the line is cleared, because the explicit request
wins over the filter. The dialog closes on a pick, because a hit on the page already open only
changes the hash. The id is the database row, stable within a deploy, so a stale shared link just
lands at the top. A title the book gives a character is still worth an alias — Shi Maria is "The Bedlam
Bride" from 6:8 — because a name hit says *who*, where a beat hit only says *where it came up*.

**How it looks, and why.** The first version shipped with its rows unstyled — name, kind and
snippet run together as one gold line — because its CSS sat in Layout.astro's scoped `<style>` and
the rows are built by a script. It is the same trap as the trophy case, and the fix is the same: the
quick-find styles live in `@layer components` in `global.css`. The dialog reads as the System being
queried: a gold `›` prompt before a display-size query line, results split into **Names** and **In
the story** (why each matched), the typed words lit in gold, the active row marked with a gold bar,
and "*** No record ***" in blood when nothing answers. On a phone it is a full-width sheet and the
masthead trigger is an icon. A result says "also X" only when the name itself did not match — so
"don" shows Princess Donut's role, not "also Donut".

**The static-copy check caught the placeholder.** It read "Carl, the Bedlam Bride, a floor…" — a
gated alias in page source, shown to a reader on book 1. It names only premise names now.

### Plain words for the chrome

A reader asked why a character page said **"Where it's used"**. It was the usage-log heading for
items, shown for any entity with `use` beats — and 109 character beats are the character *using*
something, so Carl's page opened with a stray block above his own life. Only items and mechanics
get that section now; everything else is one timeline, **"Story so far"** for a character.

Once a page runs past a dozen reached entries across more than one book it gets a row of **book
filter chips** above both sections — *All books* and one per book, each with its count of reached
entries. They filter, they do not jump: a reader asked to see one book, not to scroll to it.
`?book=3` is resolved on the server (rows arrive `hidden`, the chip pressed, an emptied section
hidden, the sealed tail hidden too), so a reload, a shared link and a reader with no JavaScript all
land on book 3; the page script only saves the round trip. `BeatEntry` carries `data-book` for it.
`hidden` needs `display: none !important` because the component layer sets a row's display. And
`.chip-btn[aria-pressed="true"]` now wins over hover, or the chosen chip went grey under the mouse.

The same pass renamed chrome that only made sense to whoever built it: *The Descent* is **Floors**,
*When* is **Timeline**, *Position* is **Progress**, the gate bar reads **"I've read up to —"**, *Spoil
me* is **Show everything**, the entity page's *Trace … along the crawl* is **See … on the timeline**,
and a beat stamp reads **Book 3 · Ch 13**, not *Bk 3·13*. Voice belongs in the content; the controls
should say what they do.

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
line, which reads as a mistake rather than a menu. On a narrow screen the
sections are a menu now; the row of book numbers in the position panel still
scrolls itself. Three details make
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

**An entity page's book chips are a strip on a phone too.** Nine of them wrapped into three rows and
pushed the log off the screen; under 560px they scroll themselves. That only works because `.cols`
is `minmax(0, 1fr)` in its one-column form as well: a bare `1fr` sizes to the unwrapped strip's
min-content and pushed the whole document 319px wide.

**A description box sat flush against the chips below it**, because the column's rhythm was
`section + section` and the chips are a `nav`. `.main > * + *` spaces whatever follows what.

**Two selectors named `.bk`.** The gate bar's book buttons and a beat's book
stamp. Both are scoped so nothing leaks, but a probe written against `.bk`
measures the wrong elements and reports a bug that is not there.

### Under 900px the chart says so instead of shrinking

The chart is a frozen 224px name column plus a drawing as wide as the story is
long. There is no honest small-screen version of that, so below 900px `/when`
renders the notice — *Eleven floors will not fit through a porthole, crawler* —
and a way to Who & What, and the entity pages stop offering **See … on the
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

`/entity/[id]` offers **See {name} on the timeline**, landing on
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

### An alias can have its own reveal point

Most aliases arrive with their entity: "Katia" and "Katia Grim" are one first mention. Some do not.
The Night Wyrm is on a ring at 3:19 and his own name, **Hamed**, is not printed until 6:32; D'nadia is
a princess until her father retires at 5:64; Yarilo is not a *feral* god until 7:63. An alias that
revealed with its entity put those on pages chapters early — "Also known as" on the entity page, and
worse, the hidden `data-find` search text on `/who` and `/when`.

So `aka` takes either a plain string, which reveals with the entity, or `{ "name", "at" }`, which
reveals at its own tag. `src/lib/aliases.ts` (and its script copy `scripts/lib/aliases.mjs`) is the one
reader of both shapes: `aliasesSeen(e, gate)` is what a view shows and searches; the lint,
`leak.ts` and `check-pages` gate each alias at its own point; the lint fails an alias that opens
before its entity; `check-anchors` reads a timed alias as its own row, `id~alias`. Twenty-one aliases
carry their own point now. The first build with them caught a 5:75 beat calling the Operatic
Collective "the Operatics", a nickname the book first prints at 7:12.

**A short alias inside an open full name is not a leak.** "Lucia" is first printed alone at 2:7,
but "Lucia Mar" is open from book 1, and a 1:14 beat saying "Lucia Mar" does not name "Lucia"
early. The lint, `leak.ts` and `check-anchors` each mask the longer open names that contain a gated
one before testing it. Without that, timing "Miriam", "Quan" or "Lucia" failed the build on every
correct use of the full name.

A sweep of all 355 entities for names the book uses that the site did not know added 30 more:
Shi Maria's six epithets (the Screamer, the Reviled, MaeMae…), Sledgie, Harpo, Dr. Hu, Eva Sigrid,
Britney Proskurina, Prince Maestro, Lord of Blight, and the short forms Frank, Maggie, Huanxin,
Quan, Miriam, Gluteus and Lucia. It also moved the Lemig Sortion to 5:75, where the book first lists
it (as "the Lemig Sortition"), and timed "Dr. Porthus Hu" to 7:11, where it is printed.

A title that only adds a rank to a name already open ("Crawler Carl", "Sergeant Toyotomi") stays a
plain string. Timing an alias is for a name, or a fact, the reader has not been given.

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
checker's LATE list is that queue, and it is empty: 88 tags moved in one pass, each with a first
tagline for the passing mention prepended to what was there. Its `REVIEWED` map holds tags read and
settled in either direction, each with a reason, keyed on the tag so moving it re-opens the question
— a "late" hit that is really a different thing (the ping of a level-up, Geraldo Rivera) goes there
rather than dragging the tag back to it.

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

### The KOReader plugin reads the position off the book

The site has to be told where a reader is. An e-reader already knows, which is why the
companion also exists as a KOReader plugin, in its own repo (`../dcc-companion-koreader`,
`crawlerscompanion.koplugin/`). Long-press a name, tap **Crawler's Companion**, get the entry
sealed past the chapter the book is open at. The design is in
`docs/superpowers/specs/2026-10-01-koreader-plugin-design.md`.

**The data is exported from here, never edited there.** `npm run export:koreader -- --out <dir>`
(`scripts/lib/koreader-export.mjs`) reads the committed snapshot and writes `index.json` (every
entry with its names, aliases and taglines, plus the books) and `entities/<id>.json` (descriptions
and beats). Every comparison key is the resolved integer `sortKey`, so the Lua side never parses a
tag; the stamp beside it is the beat's *own* tag, because a `1:end` beat has no chapter number and a
book-level one has been floored to its entity by inheritance. Floors are entries of kind `floor`:
the name opens at `nameAt`, the premise is a tagline at arrival, each recap part a beat at its own
end. `scripts/test-export-koreader.mjs` runs under `test:gate` and fails on a tag string anywhere in
the export. The plugin repo's `scripts/sync-data.sh` calls the export and commits the result.

**Where the reader is, in two numbers.** The book is matched in the document title — books 2–8 by
their titles, book 1 only when nothing else matched because "Dungeon Crawler Carl" is in every
title, and a `Book N` / `Book VII` / `#N` suffix wins. The chapter is the table-of-contents entry
the reader is inside: walk back to the first `Chapter N`; N if that is the current entry, N + 1 if
the current one is an interlude after it, `Epilogue` first means finished, nothing found means
chapter 1 — the rule `fetch-books.mjs` already applies to the same files. The real tables of
contents of books 7 and 8 are test fixtures; the book 8 one has a **non-breaking space** in "Also by
Matt Dinniman", so the parser treats one as a space. The edition is detected by counting chapters
(book 5: 75 Ace, 77 original) and renumbered through the same map `edition.mjs` holds.

**The gate sits at the current chapter, not the previous one**, so a fact from a few pages ahead
in the same chapter can already answer. The alternative fails "who is this?" on the name just met.
The popup prints the position it used, and the menu offers `7:12` / `7:end` as a per-document
override for a copy with an odd table of contents.

**An unreached name and an unknown word get the same reply.** Only entries at or below the
frontier are searched, and only aliases whose own key is reached; matching is at word starts and
case-insensitive because the reader chose the word. The site's one-word case rule is for
unprompted screening; this is prompted.

Four things about the plugin runtime worth knowing before touching it:

- **A held word lands in the dictionary popup, not the highlight menu.** The first build on the
  Kobo showed *Carl* → "No definition found" and no button anywhere: KOReader's default sends a
  single-word long-press straight to the dictionary, and the highlight menu — the only place the
  plugin had registered — opens for a two-word selection or with that default off. The button is
  in both now, and KOReader has had two hooks for the popup: `addToDictButtons` from v2026.07, the
  `DictButtonsReady` event before it (v2026.03 on the Kobo). Only one exists on any version; the
  event handler steps aside where the spec is registered. The stubbed suite was green throughout,
  so the self-test (`CRAWLERS_COMPANION_SELFTEST=<name>`, with `KO_HOME` pointing at the user data
  dir or the user plugin folder is never searched) now opens a real lookup and logs the popup's
  button ids — proven red-green on the nightly.
- **Module names carry a `cc_` prefix** (`cc_gate`, `cc_position`, `cc_store`, `cc_json`). The
  plugin loader puts the plugin root on `package.path`, so a sibling `gate.lua` would load — and
  so would any other plugin's, first come first served. `cc_json` is vendored rxi/json.lua, so the
  data path is identical under the test runner and on the device.
- **KOReader publishes no macOS build in its stable releases.** The `ota` release on GitHub has
  `koreader-macos-11.0-arm64-*.7z` nightlies; that app's bundled `luajit` runs the plugin's tests
  (`luajit tests/run.lua`, no busted), and the app itself runs the plugin from
  `~/Library/Application Support/koreader/plugins/` — a symlink to the repo works. On a Kobo the
  path is `.adds/koreader/plugins/`.
- **The wiring is tested under stubs.** `tests/test_main.lua` preloads fake `ui/*` modules and a
  fake `ui` (title, ToC, settings, a dictionary in both of KOReader's shapes) and asserts the button
  is registered as `12_crawlers_companion` and in the popup, what a reached, an unreached and a
  no-book lookup show, and that an override beats detection. `astro check` cannot see any of this;
  the Lua suite and the self-test above are the only checks there are.

### The iOS app holds the whole companion, and gates it on the device

The site can gate on the server because every page is rendered for one reader. A native app that
works with no network cannot: the whole dataset is on the phone. So the app
(`../dcc-companion-ios`, SwiftUI, iPhone and iPad) is a second place the gate runs, and the design
is built around making that second place unable to drift from the first. The spec is
`docs/superpowers/specs/2026-10-04-ios-app-design.md`.

**The data is exported from here, never edited there.** `npm run export:app -- --out <dir>`
(`src/lib/app-export.ts`) writes `content.json` — books, floors, entities, beats, relations and
awards, every gate a resolved integer `key`, no reveal tag anywhere — and `manifest.json`, whose
`version` is the SHA-256 of those bytes. The snapshot is committed and the export is deterministic,
so the version moves only when content does. **`generatedAt` is the commit date of the snapshot**
(`scripts/lib/content-date.mjs`, fixed into the server at build time by `astro.config.mjs`), not
the moment an export ran or a process started: the app refuses content older than its own by
comparing the two dates, and with wall-clock stamps any server restart made old content look new
and an app built ahead of a deploy would download a downgrade. A book's `blurb` is not exported:
it is prose that names things, no page renders it, and nothing would gate it. A beat's `kind` is left behind (the word *fate* is a
spoiler); only `use` survives. Beats are numbered in gate order, so the beats a reader has reached
are always a prefix. `span()` and `stampOf()` moved to `src/lib/stamps.ts` so the pages and the
export print a tag the same way.

**The Swift gate is held to this one by fixtures.** The same command writes `gate-fixtures.json`
(`scripts/lib/app-fixtures.mjs`): at eighteen positions — none, a first chapter, mid-book, a
finished book, a last chapter, a chapter past the end, the windows where a floor is named and not
yet reached, everything shown — what `progress.ts`, `spoiler.ts`, `aliases.ts` and `quickfind.ts`
themselves reveal, and quick-find's answers to seventeen queries. The app's tests must reproduce
every one from the export. That file decides nothing; it only asks the modules the pages use.
**It gates on the snapshot's own `sortKey` and never on the export's keys**: the export is the
thing under test, and a fixture computed from it would agree with any bug in it. The first version
did exactly that for beats, relations and awards, and a review caught it.

**The feed.** `/app/manifest.json` and `/app/content.json` (`src/lib/app-feed.ts`) serve the same
export, built once per process. The app asks for the manifest and downloads the content only when
the hash differs. This is the whole dataset ungated at a URL, which is not a new exposure: *Show
everything* already hands the same content to anyone as pages. The gate keeps a reader from
spoilers; it was never access control. The routes are unlisted and `noindex` all the same.

**The achievement desk has two doors.** `POST /app/achievement.json` takes
`{ deed, surprise, book, chapter, spoilers }` and answers `{ grant }` or `{ problem }`. It and the
form on `/achievement` both go through `fileReport()` in `src/lib/report.ts`, so there is one
limiter, one prompt and one leak screen. **That move switched the limiter on for the first time**:
its `Map` used to sit in the page's frontmatter, which Astro runs per request, so it was born
empty every time and never refused anyone. As a module it works — and behind Caddy every socket is
loopback, so keyed on `clientAddress` it would have been one bucket for the whole world. It is
keyed with `clientKey()` (`src/lib/client-address.ts`): the last hop of `X-Forwarded-For` when the
peer is local, the peer itself when it is not. The app's position goes through `prefsFrom()`, the same
clamps a cookie does. The Ollama key never leaves the server.

`APP_SCHEMA` and the app's `Library.schema` are one number written twice. Changing the export's
shape means bumping both; an older build then says it needs updating instead of misreading.

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

**Neither the wiki's headings nor this file's own claims are the book.** This paragraph used to say
the Fandom wiki's *Gate of the Feral Gods* page misfiled the Larracos flood, the Syndicate lawsuit and
Juice Box under "Book 4" when they were book 7. The edition says the opposite: the lawsuit is 4:28,
the flood through the faction market 4:34, and floor 9's recap had been carrying all three as ninth-floor
events on the strength of that note. Read what the text at the chapter actually says, not a heading
above it and not a remembered correction.

### Every sentence is read against its own page

`scripts/check-facts.mjs` reads all ~1,240 curated texts against the edition and flags a proper
noun or number the book has not yet printed at the text's gate, one it never prints, and a System
quotation not found in place. `scripts/check-placement.mjs` asks the vaguer question — which
chapter's vocabulary does this beat use? — and is how "right fact, wrong tag" gets caught when the
fact carries no name. Both are advisory and read the gitignored text; each keeps a `REVIEWED` map
with a reason per entry, keyed so a rewording re-opens it.

What the first pass found, because the pattern will recur:

- **Detail from later folded into an earlier entry.** Tserendolgor's Mongolia (6:11) at 3:31;
  Jamal's fear of heights (8:44) at 7:15; Drakea's race (7:18) at 4:28; a buyer named in the
  epilogue at 6:29. A character's entry accretes everything the wiki knows about them and then
  shows it from their first appearance.
- **Wiki claims the book does not make.** Sledgey. A habitat company. An "Ascension game". Brindle
  grubs spawning one to fifteen per corpse. Protections that bank your health and lift you out,
  where a search of the text turns up only an action item and a vote.
- **The lint's blind spots are real.** Eva is three letters, under the forward-reference floor,
  and sat in five texts five chapters before she is named.
- **A quotation has to be the book's, typos and all.** A System description had corrected the
  System's own "Alpha Centari". Quote it as printed.

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
node scripts/check-facts.mjs      # every name/number/quotation against the page it is shown on
node scripts/check-placement.mjs  # is each beat filed at the chapter whose vocabulary it uses?
npm run content:gaps    # chapters with no beat, and the main cast's beats per book
node scripts/fetch-books.mjs [--no-fetch]  # the edition from the OPDS library in .env -> data/index/books/
npm run content:check   # lint only; prints the draft/chapter-count work queue
npm run achievements:refresh  # re-pull the awards + the voice corpus from the wiki
npm run test:gate       # frontier arithmetic + the lint rules
npm run export:app -- --out <dir>   # the iOS app's content, manifest and gate fixtures

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
| `scripts/export-koreader.mjs` | `npm run export:koreader` — the KOReader plugin's data, written from the snapshot |
| `src/lib/app-export.ts` | `npm run export:app` — the iOS app's content: integer keys, no tags, a hash for a version |
| `scripts/lib/app-fixtures.mjs` | What this site's gate reveals at eleven positions, for the app's Swift gate to reproduce |
| `src/lib/app-feed.ts`, `src/pages/app/*` | The app's update feed and its JSON door onto the achievement desk |
| `src/lib/report.ts` | `fileReport()` — the limiter, the lore and the grant, shared by the page and the app |
| `src/lib/client-address.ts` | `clientKey()` — who the limiter counts, behind the reverse proxy |
| `scripts/lib/content-date.mjs` | The content's own date: the snapshot's last commit |
| `src/lib/stamps.ts` | How a reveal tag is printed: `span()` and `stampOf()` |
| `scripts/lib/koreader-export.mjs` | The export itself: integer keys, own-tag stamps, floors as entries |
| `data/entities/*.json` | The curated graph; `tagline` may be one string or a progressive list |
| `data/entities/places.json` | Places: somewhere *on* a floor, never a floor itself |
| `scripts/build-content.mjs` | Lint, resolve tags, inherit gates, write the snapshot |
| `scripts/lib/lint.mjs` | Every rule that stops the gate leaking |
| `scripts/lib/voice.mjs` | Who speaks on a beat: self / system / narrator, resolved in the build |
| `scripts/smoke.mjs` | `npm run smoke` — does every route actually render? |
| `scripts/check-stage.mjs` | No `<script>` or `<noscript>` in a component the view swap replaces |
| `scripts/check-anchors.mjs` | `npm run content:anchors` — advisory: each reveal tag against the first chapter naming it |
| `scripts/check-facts.mjs` | Advisory: a name, number or quotation shown before the book prints it, or never printed |
| `scripts/check-placement.mjs` | Advisory: a beat whose vocabulary lives in a later chapter than its gate |
| `scripts/check-gaps.mjs` | `npm run content:gaps` — advisory: what is *missing*, not what is wrong |
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
- **2 `draft` beats remain of 692** (Frank Q's "safe rooms" confession, which the book implies
  rather than states, and the cracking-order thread, which is our framing). `verified` now means
  **read against the edition's text at its own chapter**, not "a wiki summary agreed".
- **Every beat has now been read against its own chapter** — all 692, in two passes. The second
  half changed far more than the first (about 280 of 432, against one in six), and almost none of it
  was catchable by a screen: who did what (Katia opens the Gate, not Carl; Donut picks Hedy, not
  Carl), the opposite of the book (Mordecai's verdict on Zockau; Growler Gary's forgiving avatar),
  detail from nowhere (a family shop, a vote that widens the
  field), and floor 9's recap carrying three book-4 events.
- **Every tagline has now been read against the book too**, and they were worse, as predicted: 200
  of 532 changed, more than one in three, against about one in six for beats. A tagline is a summary,
  and a summary written with the whole life in view keeps reaching past its own `at` — Larracos's
  sixty-six rings at 4:23, Big Tina's level-80 city-boss title at 5:28, a feral god walking through
  the Gate in a 4:9 tagline about a man who had been hunting it for twenty years. The other big class
  is confident detail from nowhere: Grull "put down", Bonnie's father commanding a flying castle,
  Prepotente singing opera (in his voice note, too). Two findings about the book itself: Ferdinand is
  Gravy Boat, Marjory's tomcat, not Bea's; and the edition calls Ifechi "a man… He was a healer" at 3:3
  and 4:4 and Florin's girlfriend with a twin sister from 5:63, so text about Ifechi avoids a pronoun
  where it can. The two reveal tags it questioned are fixed: the tenth faction opens at 6:22, where
  Carl proposes it, and system glitches at 8:6, where Donut first remarks on the voice.
- **Every book is filled chapter by chapter** — the gap between "what is written is right" and "what
  happened is written" is closed for now. Content grew by adding entities, so each got a few beats at its
  introduction and the main cast was never followed: Carl had no beat in book 8, Donut none in books 3–5
  or 8, Mordecai none after 6:1, while every check stayed green. `npm run content:gaps` shows it and
  should stay at zero empty chapters. All eight books went from 692 beats with 160 empty chapters to
  2,692 with none, every new beat written from its chapter's text with the main cast first and then read
  against that chapter a second time by a separate pass. That pass changed about one in six, and always
  for the same five things: an invented closing line, the wrong speaker, events out of order within the
  chapter, a rounded-up number, an inference stated as fact. It also caught older beats that had been
  wrong since the first curation — Quan Ch's "fate" at 4:31 (he dies at 6:58), Louis on a trip he never
  took, Henrik as the changeling principal (that is Svern), Emberus handing out quests the System gave.
- **Every reveal tag now sits where the book first prints the name** — `content:anchors` reads 214
  exact, 17 reviewed, none early and none late. 88 entities moved earlier, each with a new first
  tagline that says only what the passing mention gives (Faction Wars at 1:43, Grull at 1:25, Eris at
  1:34, Skyfowl at 1:3, Mantaur at 3:11, Ping at 4:32, the Princess Posse at 3:20). The `REVIEWED`
  map covers both directions now, and seven of its entries are false first hits: "ping" the sound,
  "tutorial guilds", Geraldo Rivera, the Feral Rabies debuff. Floors got `nameAt` for the same reason.
  The lint matches a one-word name only as written, as `leak.ts` always did, so "justice" is English
  again.
- **Sixty entities the fill kept tripping over now exist** — 303 in all. Each was built from the
  edition's text: reveal at the first printing of its name, a progressive tagline, beats across its
  whole life, relations. Chris Andrews, Brandon, Yolanda, Gwen, Princess Formidable, the Night Wyrm,
  Paz, Uzzi, Carl's father and Asher, Architect Houston, Princess Chandra, Grigori, the Pineapple
  Cabaret, the Ascendency, the Eulogist and forty more. New characters are System dossiers; nobody
  has written them a voice note, and inventing a register would be inventing character. The review
  pass changed 77 of their 467 beats and 8 of 187 taglines. **The seed now inserts in batches**: one insert of
  3,159 beats × 11 columns passed SQLite's 32,766-variable limit and failed the build with nothing
  wrong in the content.
- **A second pass added the rest: 52 more, 355 in all** — everything a reader flagged that plays a
  part across more than one chapter, from Mukta, Manasa and Heather the Bear to Minus, the Kyryap and
  Dong's sock. One-line walk-ons stay out (Buster, Samantha's robot dog, has three passing lines). The
  review changed 52 of their 414 beats and 14 of 149 taglines. A few are honestly thin — Edict, Sierra,
  Widget, Levi the Seventh and the Big Six live in a single scene — and are built anyway, because a
  reader meeting the name has somewhere to look. **Name an entity so it does not swallow ordinary
  words**: "The Arena" would have gated every "the arena" in the text, so the eleventh floor's is
  "The 11th Floor Arena", the book's own phrase at 8:67. Scolopendra as a crawler from 8:98 lives in
  the existing Scolopendra entry rather than a second one. The Night Wyrm's own name "Hamed" is an alias
  with its own reveal point at 6:32; see *An alias can have its own reveal point*.
- Coverage gaps it noticed: the Gate in book 7 (waiting in a mailbox at 7:1, taken from Elle by Akuma
  at 7:61); `no-respawns` as a name, which 7:8 contradicts for outworlders; Rishi's death is only
  confirmed at 8:10 while his fate beat sits at 7:58.
- The Nothing is the one item with no `description`: no System text for it exists on the wiki
- Books 3, 6 and 8 have the thinnest entity coverage relative to their chapter counts
- Deeper coverage: more items, per-floor mechanics, quotes with chapter anchors
- Accounts (`data/users.db` + sessions), so progress follows the reader across devices
