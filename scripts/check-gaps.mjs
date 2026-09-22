#!/usr/bin/env node
/* Where is there nothing to read?

   Every other check here asks whether what is written is right. None asks
   whether anything is missing, and that is how Carl and Princess Donut came to
   have no beats in the whole of book 8, Mordecai none after 6:1, and forty of
   book 8's chapters none at all — while the lint stayed green. Coverage grew by
   adding entities (`content:coverage` ranks names without a page), and each new
   one got a few beats around its introduction; nothing ever asked what the main
   cast did next.

   Two tables:

     chapters   per book: how many chapters carry no beat, and which
     cast       the first N characters by `sort` (the curated order of
                importance): beats per book, so a column of zeros is visible

   Advisory: always exits 0.

     --cast=N   how many characters to list (default 16)
     --book=B   list the empty chapters of book B only */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const castN = +arg('cast', 16);
const onlyBook = arg('book', null);

const spine = JSON.parse(readFileSync(join(root, 'data/chapters.json'), 'utf8')).books;
const dir = join(root, 'data/entities');
const ents = readdirSync(dir).flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')).entities);

const hit = new Map(); // book -> Set(chapter)
for (const e of ents) for (const b of e.beats ?? []) {
  if (!b.chapter) continue; // book-level and :end beats cover no one chapter
  if (!hit.has(b.book)) hit.set(b.book, new Set());
  hit.get(b.book).add(b.chapter);
}

console.log('chapters with no beat');
for (const { book, count } of spine) {
  if (onlyBook && +onlyBook !== book) continue;
  const have = hit.get(book) ?? new Set();
  const empty = [];
  for (let c = 1; c <= count; c++) if (!have.has(c)) empty.push(c);
  console.log(`  book ${book}  ${String(empty.length).padStart(3)} of ${String(count).padStart(3)}  ${empty.join(',')}`);
}

const books = spine.map((s) => s.book);
const cast = ents.filter((e) => e.kind === 'character').sort((a, b) => (a.sort ?? 1e9) - (b.sort ?? 1e9)).slice(0, castN);
console.log(`\nbeats per book, first ${castN} characters by sort`);
console.log(`  ${''.padEnd(18)}${books.map((b) => String(b).padStart(4)).join('')}`);
for (const e of cast) {
  const per = books.map((bk) => (e.beats ?? []).filter((b) => b.book === bk).length);
  console.log(`  ${e.id.padEnd(18)}${per.map((n) => String(n || '·').padStart(4)).join('')}`);
}
