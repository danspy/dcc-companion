#!/usr/bin/env node
/* `npm run ux` — the usability budget, against a running server.

   The site's pages grew with its content until a phone reader at book 4 was
   handed a Who & What page 250 screens tall and a 2.4 MB timeline it could not
   show. These are the budgets the reader's fastest paths were rebuilt to, read
   off the server's own HTML for a reader at book 4, chapter 12, on a phone, so
   no browser is needed:

   - Who & What shows at most a few dozen cards before the reader asks for more
   - a long life (Carl) opens on the reader's own book, with the Latest on top
   - the timeline sends a narrow screen its notice, not the chart
   - the picker offers "Read another" in one press
   - names in a beat are links
   - the homepage stays under its weight

   Usage: npm run ux [-- --base=https://localhost:4321] */
const arg = process.argv.find(a => a.startsWith('--base='));
const BASE = arg ? arg.slice(7) : 'https://localhost:4321';
if (BASE.startsWith('https://localhost')) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pos = encodeURIComponent(JSON.stringify({ book: 4, chapter: 12, spoilers: true }));
const phone = `dcc_pos=${pos}; dcc_vw=390`;
const get = async (path, cookie = phone) => {
  const r = await fetch(BASE + path, { headers: { cookie }, redirect: 'manual' });
  return { status: r.status, html: await r.text() };
};
const count = (html, re) => (html.match(re) ?? []).length;

const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok, detail });

{ // Who & What: met only, each kind folded
  const { html } = await get('/who');
  const cells = html.match(/<div class="cell(?:\s[^"]*)?"[^>]*>/g) ?? [];
  const open = cells.filter(c => !/\bhidden\b/.test(c) && !/\bfold-s\b/.test(c)).length;
  check('who: cards before "All …" on a phone', open <= 48, `${open} (budget 48)`);
  check('who: opens on met only', /id="metonly"[^>]*aria-pressed="true"/.test(html.replace(/\s+/g, ' ')), '');
}
{ // a long life
  const { html } = await get('/entity/carl');
  const shown = count(html, /<li class="entry" id="b\d+"[^>]*data-book="\d+"(?![^>]*hidden)/g);
  check('carl: entries open before a chip', shown <= 40, `${shown} (budget 40)`);
  check('carl: Latest on top', /<section class="latest"/.test(html), '');
  check('carl: names in beats are links', count(html, /class="nm"/g) > 20, `${count(html, /class="nm"/g)} links`);
}
{ // the timeline on a phone
  const { html } = await get('/when');
  check('when: a narrow screen gets the notice, not the chart', html.length < 300_000, `${Math.round(html.length / 1024)} KB (budget 300)`);
}
{ // read on in one press
  const { html } = await get('/progress');
  check('picker: Read another', /id="pick-next"[^>]*>Read another · ch 13</.test(html), '');
}
{ // the homepage's weight
  const { html } = await get('/');
  check('home: HTML under 400 KB', html.length < 400_000, `${Math.round(html.length / 1024)} KB`);
}

let bad = 0;
for (const c of checks) { if (!c.ok) bad++; console.log(`${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`); }
console.log(bad ? `\n${bad} over budget.` : `\nOK — ${checks.length} budgets held.`);
process.exit(bad ? 1 : 0);
