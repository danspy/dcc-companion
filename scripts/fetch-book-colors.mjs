#!/usr/bin/env node
/* The official accent colour of each Dungeon Crawler Carl book, taken from
   mattdinniman.com/books/ and written to data/book-colors.json (committed, so
   builds need no network).

   The site states these outright: every book on that page carries a
   `.title-background` div whose colour is the book's own. Most are inline
   (`style="background-color:#f42bd0"`); books 1 and 3 instead use the theme
   palette classes `has-contrast-1-background-color` and `has-contrast-3-…`,
   which resolve against the WordPress custom properties on the same page. Both
   forms are handled, so nothing here is guessed from cover pixels.

   Fetched through the Wayback Machine because the live origin sits behind
   Cloudflare and returns 403 to anything scripted. */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'https://mattdinniman.com/books/';
const SNAPSHOT = `https://web.archive.org/web/2026/${SOURCE}`;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/* The floor number is set on top of this colour, so each accent needs a
   foreground that can actually be read on it rather than one fixed choice. */
const INK = [0x0e, 0x0e, 0x0e];
const PAPER = [0xff, 0xff, 0xff];
const MIN_CONTRAST = 4.5;

const toRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const srgb = c => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const res = await fetch(SNAPSHOT, { headers: { 'User-Agent': UA } });
if (!res.ok) throw new Error(`${res.status} fetching ${SNAPSHOT}`);
const html = (await res.text()).replace(/https:\/\/web\.archive\.org\/web\/\d+(?:im_)?\//g, '');

/* The theme's own palette, for the books that reference it by class. */
const palette = new Map();
for (const m of html.matchAll(/--wp--preset--color--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
  palette.set(m[1], m[2].toLowerCase());
}

const DCC = new Set([
  'dungeon-crawler-carl', 'carls-doomsday-scenario', 'the-dungeon-anarchists-cookbook',
  'the-gate-of-the-feral-gods', 'the-butchers-masquerade', 'the-eye-of-the-bedlam-bride',
  'this-inevitable-ruin', 'a-parade-of-horribles',
]);

const found = new Map();
// Each book is one `wp-block-group book` block; slicing on that keeps a book's
// colour from being read off its neighbour.
for (const block of html.split('<div class="wp-block-group book ').slice(1)) {
  const slug = block.match(/\/books\/([a-z0-9-]+)\//)?.[1];
  const num = block.match(/<p class="wp-block-paragraph">#(\d+)<\/p>/)?.[1];
  if (!slug || !num || !DCC.has(slug)) continue;

  const inline = block.match(/background-color:(#[0-9a-fA-F]{6})/)?.[1]?.toLowerCase();
  const viaClass = block.match(/has-([a-z0-9-]+?)-background-color/)?.[1];
  const accent = inline ?? (viaClass ? palette.get(viaClass) : null);
  if (!accent) throw new Error(`book ${num} (${slug}): no colour found`);

  const onInk = contrast(toRgb(accent), INK);
  const onPaper = contrast(toRgb(accent), PAPER);
  const ink = onInk >= onPaper;
  const best = Math.max(onInk, onPaper);
  if (best < MIN_CONTRAST) throw new Error(`book ${num}: ${accent} is unreadable either way (${best.toFixed(1)}:1)`);

  found.set(Number(num), {
    book: Number(num), slug, accent,
    ink: ink ? '#0e0e0e' : '#ffffff',
    contrast: Number(best.toFixed(2)),
    via: inline ? 'inline' : `palette:${viaClass}`,
  });
}

const books = [...found.values()].sort((a, b) => a.book - b.book);
if (books.length !== 8) throw new Error(`expected 8 books, parsed ${books.length}`);

for (const b of books) {
  console.log(
    `book ${b.book}: ${b.accent}  text ${b.ink}  ${String(b.contrast).padStart(5)}:1  ` +
    `${b.via.padEnd(20)} ${b.slug}`,
  );
}
writeFileSync(join(root, 'data/book-colors.json'),
  JSON.stringify({ source: SOURCE, books }, null, 2) + '\n');
console.log(`\nWrote data/book-colors.json — 8 official accents`);
