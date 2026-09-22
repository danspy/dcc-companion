#!/usr/bin/env node
/* Is each beat filed at the chapter that tells it?

   The dangerous curation error was never a wrong fact: it was a right fact
   under the wrong tag — a book-4 twist in a book-3 beat. check-facts.mjs
   catches that when the fact carries a name or a number. This catches it when
   it does not, by asking where in the book a beat's own vocabulary lives.

   Every section of the edition is scored against a beat's distinctive words
   (rarer words count more, the way a search engine weighs them). The score at
   the beat's gate is compared with the best score anywhere:

     LATER   the book's best match is after the gate, and much better than
             anything at or before it. The beat is probably telling a later
             chapter. This is a leak until a read says otherwise.
     WEAK    nothing in the book matches well. Paraphrase, or invention.

   A screen, not a verdict; always exits 0. Needs data/index/books/.

     --json   write data/index/placement.json      --top=<n>   rows to print */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseAt, bookOf, END_OF_BOOK } from './lib/gate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(readFileSync(join(root, p), 'utf8'));
const argv = process.argv.slice(2);
const top = Number(argv.find(a => a.startsWith('--top='))?.split('=')[1] ?? 40);
const indexPath = join(root, 'data/index/books/index.json');
if (!existsSync(indexPath)) { console.log('Run `node scripts/fetch-books.mjs` first.'); process.exit(0); }

/* Chapters, not sections: an interlude reads with the chapter it gates at. */
const chapters = new Map();
for (const b of JSON.parse(readFileSync(indexPath, 'utf8')).books) for (const s of b.sections) {
  const at = `${b.book}:${s.position}`;
  const text = readFileSync(join(root, `data/index/books/text/b${b.book}/${s.file}`), 'utf8');
  if (!chapters.has(at)) chapters.set(at, { at, value: parseAt(at), text: '' });
  chapters.get(at).text += '\n' + text;
}
const list = [...chapters.values()].sort((a, b) => a.value - b.value);

const STOP = new Set(('about above after again against because before being below between both could does doing down during each ' +
  'from further have having here into itself just more most other over same should some such than that their them then ' +
  'there these they this those through under until very were what when where which while whom will with would your yours ' +
  'still every never always nothing something anything everyone someone anyone thing things going being gets make makes ' +
  'made takes taken back first last next only even once tells told says said asks know knows want wants right left ' +
  'another around across without within whole whose again already enough little great really another other people ' +
  'crawler crawlers floor dungeon carl donut subject').split(' '));
const stem = w => w.toLowerCase().replace(/[’']s$/, '').replace(/(?:ing|ed|es|s)$/, '');
const tokens = t => (t.match(/[A-Za-z][A-Za-z’'-]{3,}/g) ?? []).map(w => w.toLowerCase()).filter(w => !STOP.has(w)).map(stem);

const sets = list.map(c => new Set(tokens(c.text)));
const df = new Map();
for (const s of sets) for (const w of s) df.set(w, (df.get(w) ?? 0) + 1);
const idf = w => Math.log(list.length / (df.get(w) ?? list.length));

const KINDS = ['characters', 'items', 'mechanics', 'factions', 'places', 'threads'];
const entities = KINDS.flatMap(f => read(`data/entities/${f}.json`).entities);
const show = v => (v % 1000 === END_OF_BOOK ? `${bookOf(v)}:end` : `${bookOf(v)}:${v % 1000}`);

const rows = [];
for (const e of entities) for (const b of e.beats ?? []) {
  const gate = Math.max(parseAt(b.at), parseAt(e.revealedAt));
  const words = [...new Set(tokens(`${b.headline} ${b.text}`))].filter(w => df.has(w) && idf(w) > 1.2);
  if (words.length < 4) continue;
  const score = sets.map(s => words.reduce((a, w) => a + (s.has(w) ? idf(w) : 0), 0));
  const total = words.reduce((a, w) => a + idf(w), 0);
  let best = 0;
  score.forEach((v, i) => { if (v > score[best]) best = i; });
  // The gate's own chapter and the two before it: a beat may lean on setup.
  const upto = list.findLastIndex(c => c.value <= gate);
  const near = Math.max(...score.slice(Math.max(0, upto - 2), upto + 1), 0);
  const before = Math.max(...score.slice(0, upto + 1), 0);
  const ratio = before ? score[best] / before : Infinity;
  let verdict = 'ok';
  if (list[best].value > gate && ratio >= 1.35) verdict = 'LATER';
  else if (score[best] / total < 0.25) verdict = 'WEAK';
  rows.push({ id: e.id, headline: b.headline, at: b.at, gate: show(gate), best: list[best].at,
    ratio: +ratio.toFixed(2), cover: +(score[best] / total).toFixed(2), nearCover: +(near / total).toFixed(2),
    confidence: b.confidence, verdict, text: b.text,
    bestWords: words.filter(w => sets[best].has(w) && !sets.slice(0, upto + 1).some(s => s.has(w))) });
}

const later = rows.filter(r => r.verdict === 'LATER').sort((a, b) => b.ratio - a.ratio);
const weak = rows.filter(r => r.verdict === 'WEAK').sort((a, b) => a.cover - b.cover);
console.log(`LATER — the book tells this after the gate  (${later.length})`);
for (const r of later.slice(0, top)) console.log(`  ${r.id} · "${r.headline}" · gate ${r.gate} → best ${r.best} ×${r.ratio}  new: ${r.bestWords.slice(0, 8).join(', ')}`);
console.log(`\nWEAK — little of this is in the book  (${weak.length})`);
for (const r of weak.slice(0, Math.min(top, 20))) console.log(`  ${r.id} · "${r.headline}" · gate ${r.gate} · cover ${r.cover}`);
console.log(`\n${rows.length} beats placed: ${rows.length - later.length - weak.length} ok · ${later.length} later · ${weak.length} weak`);
if (argv.includes('--json')) writeFileSync(join(root, 'data/index/placement.json'), JSON.stringify(rows, null, 1) + '\n');
