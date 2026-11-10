#!/usr/bin/env node
/* node --experimental-strip-types scripts/story-fixtures.mjs --out <file>

   What storySoFar() answers at a set of positions, written as JSON for the KOReader plugin's
   Lua copy (cc_gate.lua story_so_far) to replay — the same idea as scripts/lib/app-fixtures.mjs
   for the iOS gate. The cases are the ones scripts/test-gate.mjs pins, plus the plugin's own
   fixture entity, so the two copies cannot drift unnoticed: change story.ts and the fixture
   changes with it; change story_so_far alone and its test fails. */
import { writeFileSync } from 'node:fs';
import { storySoFar } from '../src/lib/story.ts';

const args = process.argv.slice(2);
const out = args[args.indexOf('--out') + 1];
if (!out) { console.error('usage: story-fixtures.mjs --out <file>'); process.exit(1); }

const beat = (sortKey, headline, gist) => ({
  sortKey, book: Math.floor(sortKey / 1000), chapter: sortKey % 1000, headline, gist: gist ?? null,
});

/* The plugin's fixture Carl (tests/fixtures/data/entities/carl.json) and the site test's steps. */
const carlRecap = [{ sortKey: 1999, text: 'Carl goes down the stairs after the cat.', confidence: 'verified' }];
const carlBeats = [beat(1001, 'Pink Crocs'), beat(1002, 'The stairs', 'Carl and the cat take the stairs.'), beat(1999, 'Footwear'), beat(7012, 'Larracos')];
const steps = [{ sortKey: 1999, text: 'Book one.', confidence: 'verified' }, { sortKey: 3999, text: 'Book three.', confidence: 'draft' }];
const sbeats = [beat(1003, 'h1', 'Gist one.'), beat(3002, 'h3'), beat(4001, 'h4a', 'Four a.'), beat(4002, 'h4b', 'Four b.'),
  beat(4005, 'h4e', 'Four e.'), beat(4006, 'h4f', 'Four f.'), beat(4009, 'h4i', 'Four i.')];
const many = Array.from({ length: 12 }, (_, i) => beat(5001 + i, `h${i}`, `g${i}`));

const CASES = [
  ['no position', carlRecap, carlBeats, 0],
  ['carl 1:1', carlRecap, carlBeats, 1001],
  ['carl 1:2 cut 1:1', carlRecap, carlBeats, 1002, 1001],
  ['carl 1:4 cut 1:3', carlRecap, carlBeats, 1004, 1003],
  ['carl 1:5', carlRecap, carlBeats, 1005],
  ['carl 1:end', carlRecap, carlBeats, 1999],
  ['carl 2:1 cut 2:0', carlRecap, carlBeats, 2001, 2000],
  ['carl 7:12 cut 7:11', carlRecap, carlBeats, 7012, 7011],
  ['carl 7:12', carlRecap, carlBeats, 7012],
  ['carl 8:end', carlRecap, carlBeats, 8999],
  ['steps 4:6 cut 4:5', steps, sbeats, 4006, 4005],
  ['steps 4:6', steps, sbeats, 4006],
  ['steps 3:end', steps, sbeats, 3999],
  ['steps 1:5', steps, sbeats, 1005],
  ['steps 4:1 (no beat yet)', steps, [beat(1003, 'h1', 'g'), beat(4009, 'h4i', 'g')], 4001],
  ['fold 12 to 8', [], many, 5020, 5020, 8],
  ['fold 12 to 3', [], many, 5020, 5020, 3],
  ['no recap field', [], [beat(1001, 'x')], 1005, 1004],
];

const cases = CASES.map(([label, recap, beats, frontier, cut, max]) => ({
  label,
  /* Inputs in the export's shape, which is what the Lua reads: `key`, not `sortKey`. */
  recap: recap.map(r => ({ key: r.sortKey, book: Math.floor(r.sortKey / 1000), text: r.text })),
  beats: beats.map(b => ({ key: b.sortKey, book: b.book, chapter: b.chapter, headline: b.headline, ...(b.gist ? { gist: b.gist } : {}) })),
  frontier, cut: cut ?? null, max: max ?? null,
  expected: storySoFar(recap, beats, frontier, { ...(cut != null ? { cut } : {}), ...(max != null ? { max } : {}) }),
}));

writeFileSync(out, JSON.stringify(cases, null, 1) + '\n');
console.log(`story fixtures -> ${out}: ${cases.length} cases`);
