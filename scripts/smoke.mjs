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
  ['/', ['class="slab floor"', 'floorno']],
  ['/who', ['class="finder"', 'data-find', 'class="cell']],
  ['/when?view=braid', ['class="stagehead', 'id="braid-svg"', 'class="lane"', 'entryrow']],
  ['/when?view=grid', ['class="stagehead', 'gridrow', 'class="mark', 'entryrow']],
  ['/when?view=downstream', ['class="stagehead', 'class="chain"', 'entryrow']],
  /* The filter is rendered by the server, not only by the script: a row that
     does not match arrives already stamped out. Without this the page can look
     right in a browser and still hand a reader all 243 rows the moment anything
     stops the script from re-applying. */
  ['/when?view=grid&q=kat&kinds=faction',
   ['class="pickrow entryrow" hidden', 'class="stagerow gridrow" hidden', '1 of ']],
  ['/progress', ['class="stats"', 'tbl-head']],
  ['/entity/carl', ['class="log"', 'class="entry"', 'class="stamp"']],
  /* The form and the empty state render with no model call; a POST is not
     smoked, because it would spend a real request on a real key. */
  ['/achievement', ['form class="finder deed"', 'id="grant"', 'id="case"', 'name="deed"',
                    'id="surprise"', 'class="onrecord"', 'class="log"', 'class="stamp"']],
];

let failed = 0;
for (const [route, markers] of ROUTES) {
  let res, html;
  try {
    res = await fetch(base + route, { headers });
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
