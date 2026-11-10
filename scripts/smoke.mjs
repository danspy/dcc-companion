#!/usr/bin/env node
/* Does every page actually render?

   `astro check` type-checks and the lint reads the data, and both passed happily
   while `/when?view=braid` rendered nothing at all: a component used `AXIS_H`
   without importing it, threw at render, and Astro served the rest of the page
   around the hole. Nothing in the suite could see it.

   So this fetches each route and asserts the markers that prove the thing on it
   was built. It needs a server:

       npm run dev            # or the built server
       npm run smoke          # defaults to https://localhost:4321

   A reading position is sent as a cookie, because every gated surface is empty
   without one and an empty page would pass a naive check.  */

const base = process.argv.find(a => a.startsWith('--base='))?.slice(7)
  ?? 'https://localhost:4321';

/* Self-signed in dev; this script only ever talks to localhost. */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const position = encodeURIComponent(JSON.stringify({ book: 5, chapter: 40, spoilers: true }));
const headers = { cookie: `dcc_pos=${position}` };

/* Each route, and the markers that prove its content rendered. */
const ROUTES = [
  // The front page tells each floor in parts: at least one must reach the position.
  /* The homepage is the overview: eighteen tiles, the current floor featured,
     its picture served from the gated art route. */
  ['/', ['id="dungeon"', 'id="hud"', 'level level-reached', 'is-here', 'src="/art/floor-', 'src="/art/uncharted/', 'class="rail"', 'here-pin', 'Previously, on Dungeon Crawler World']],
  /* A floor picked on the descent renders open, beside it, with no script. */
  ['/art/cubes-4.bin', []],
  /* A floor with no picture to show stands as the uncharted island: every floor
     past the reader at 5:40 does, and the island and its blocks are served. */
  ['/art/uncharted/13-known.png', []],
  ['/art/uncharted/16-sealed.bin', []],
  ['/?floor=4', ['crawl is-detail', 'id="dcard"', 'class="peek"', 'Open the floor']],
  ['/floor/peek/4', ['class="peek"', 'Now entering']],
  /* The floor guide: its map drew layers (each is only rendered when reached),
     both art styles render, and the guide sections arrived. */
  ['/floor/1', ['id="crawl"', 'class="part"', 'class="gsec"', 'fmap-voxel', 'class="lineup"', 'src="/art/figure/']],
  ['/floor/2', ['id="crawl"', 'fmap-voxel', 'class="keyrow"']],
  ['/floor/3', ['id="crawl"', 'fmap-voxel', 'class="keyrow"']],
  ['/floor/4', ['id="crawl"', 'fmap-voxel', 'class="keyrow"']],
  /* Floors past the default position redirect, rightly; they are smoked as a
     reader who has finished book 8 (the third element is that reader). */
  ...[6, 7, 8, 9, 10, 11].map(n => [`/floor/${n}`, ['id="crawl"', 'fmap-voxel', 'class="keyrow"', 'class="gsec"'], { book: 8, chapter: 0 }]),
  ['/floor/5', ['id="crawl"', 'fmap-voxel', 'data:image/png;base64', 'class="px-hl"', 'class="gsec"', 'As of Book 4']],
  /* The rewind is rendered by the server: ?at= lands on that state of the map
     with the timeline, the changes line and the way back. */
  /* Floors ahead: a page of what is known, at the floor's own address. */
  ['/floor/12', ['Not reached yet', 'class="notes"', 'Halls of the Ascendency'], { book: 8, chapter: 0 }],
  ['/floor/9', ['Not reached yet', 'Faction Wars', 'Named · Book 1']],
  ['/floor/5?at=4012', ['id="scrubber"', 'Rewound to', 'data-layer="house"', 'Back to where you are']],
  ['/who', ['class="finder"', 'data-find', 'class="cell', 'class="cell-fig"', 'src="/art/figure/carl-']],
  ['/when?view=braid', ['class="stagehead', 'id="braid-svg"', 'class="lane"', 'entryrow']],
  ['/when?view=grid', ['class="stagehead', 'gridrow', 'class="mark', 'entryrow']],
  ['/when?view=downstream', ['class="stagehead', 'class="chain"', 'entryrow']],
  /* The filter is rendered by the server, not only by the script: a row that
     does not match arrives already stamped out. Without this the page can look
     right in a browser and still hand a reader all 243 rows the moment anything
     stops the script from re-applying. */
  ['/when?view=grid&q=kat&kinds=faction',
   /* ' shown' is only printed while a filter is active. It asserted '1 of ' until
      the Squim Conglomerate, which sponsors Katia, became a second match: a
      smoke test checks that the server stamped the filter, not how many
      entries the data happens to hold. */
   ['class="pickrow entryrow" hidden', 'class="stagerow gridrow" hidden', ' shown']],
  ['/progress', ['class="stats"', 'tbl-head']],
  ['/since', ['Since you were last here']],
  /* Quick-find answers per reader from the cookie; Carl is met at 1:1. */
  ['/find.json?q=car', ['"href":"/entity/carl"']],
  ['/entity/carl', ['class="log"', 'class="entry"', 'class="stamp"', 'class="sofar"', 'class="hero-fig"', 'src="/art/figure/carl-']],
  // a character stands as a voxel figure, gated look by look; the shadow figure is the same for everyone
  ['/art/figure/unpictured.png', []],
  // the start screen's picture: the way in on the first night, public like the uncharted island
  ['/art/entry.png', []],
  ['/art/figure/unpictured-item.png', []],
  /* The book filter is resolved on the server: ?book=3 arrives with the other
     books' entries already hidden and the Book 3 chip pressed. */
  ['/entity/carl?book=3', ['data-book="3" aria-pressed="true"', 'data-book="1" hidden']],
  /* The form and the empty state render with no model call; a POST is not
     smoked, because it would spend a real request on a real key. */
  ['/achievement', ['form class="finder deed"', 'id="grant"', 'id="case"', 'name="deed"',
                    'id="surprise"', 'class="log"', 'class="stamp"', 'rec-who']],
  /* The order is rendered by the server, not chosen by a script: a shared link
     and a reader with no JavaScript both have to land on the right one. */
  ['/achievement?sort=name', ['recsort', 'aria-current="true"', 'rec-who']],
  /* The filter is stamped by the server too: a row that does not match arrives
     already hidden, so a reader with no JavaScript never sees all 146 first. */
  ['/achievement?q=donut&box=Silver',
   ['recrow"', ' hidden data-find=', 'aria-pressed="true"', 'id="rectally"', ' shown']],
  /* The iOS app's feed: the manifest it asks for first, and the content behind it. */
  ['/app/manifest.json', ['"schema":2', '"version":"', '"counts":{']],
  ['/app/content.json', ['"schema":2', '"beats":[', '"awards":[']],
];

let failed = 0;
for (const [route, markers, reader] of ROUTES) {
  let res, html;
  try {
    const h = reader ? { cookie: `dcc_pos=${encodeURIComponent(JSON.stringify({ ...reader, spoilers: true }))}` } : headers;
    res = await fetch(base + route, { headers: h });
    html = await res.text();
  } catch (e) {
    console.error(`FAIL ${route}: ${e.message}`);
    failed++;
    continue;
  }
  const missing = markers.filter(m => !html.includes(m));
  if (res.status !== 200 || missing.length) {
    console.error(`FAIL ${route}  status ${res.status}` +
      (missing.length ? `  missing: ${missing.join(', ')}` : ''));
    failed++;
  } else {
    console.log(`ok   ${route}  ${String(Math.round(html.length / 1024)).padStart(4)} KB`);
  }
}

console.log(failed
  ? `\n${failed} route(s) did not render what they should.`
  : `\nOK — ${ROUTES.length} routes rendered.`);
process.exit(failed ? 1 : 0);
