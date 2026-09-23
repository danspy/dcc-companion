#!/usr/bin/env node
/* Static copy in a page is ungated by construction. If it names something the
   gate is supposed to withhold, the gate is bypassed — no matter how correct
   the data is.

   This has shipped twice already: a floor recap tagged at book-start, and the
   Position page explaining the gate with "Floor 7 — the Great Race — opens at
   the close of book 5", which handed a floor name to anyone on book 1.

   So: take every entity and floor name from the built snapshot, keep the ones
   that are NOT safe at the very start of book 1, and fail if any of them appear
   literally in page or component source. Names safe from 1:1 (Carl, Donut, the
   Transformation) are fine — that is the premise, and the front page says it. */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseAt } from './lib/gate.mjs';
import { aliasesOf } from './lib/aliases.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const snap = JSON.parse(readFileSync(join(root, 'data/content.snapshot.json'), 'utf8'));

const START = parseAt('1:1');

/* Whole words; case-blind for a name of more than one word, as written for a
   name of one. Each part is load-bearing: the leak that shipped read "the Great
   Race" while the floor is named "The Great Race", so an exact match sailed past
   it — and without word boundaries "Tran" matches inside "transparent" and the
   check drowns in CSS. A one-word name matched case-blind fails in the other
   direction: the crawler Tally made every `tally` counter in the page source a
   leak. The lint and src/lib/leak.ts draw the same line. */
const escape = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matcher = name => new RegExp(`\\b${escape(name)}\\b`, /\s/.test(name) ? 'i' : '');

const gated = [];
for (const e of snap.entities) {
  // Each name at its own point: an alias can open chapters after its entity.
  for (const { name: n, at } of [{ name: e.name, at: e.revealedAt }, ...aliasesOf(e)]) {
    if (parseAt(at) <= START) continue;
    if (n.length >= 4) gated.push({ name: n, re: matcher(n), at, id: e.id });
  }
}
for (const f of snap.floors) {
  if (parseAt(f.revealedAt) <= START) continue;
  gated.push({ name: f.name, re: matcher(f.name), at: f.revealedAt, id: `floor ${f.id}` });
}

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(astro|ts|tsx)$/.test(p)) files.push(p);
  }
})(join(root, 'src'));

/* Deliberate exemptions. Each needs a reason, because the whole value of this
   check is that it is strict — an exemption without an argument behind it is
   just the bug again. */
const EXEMPT = [
  {
    file: 'src/pages/index.astro',
    name: 'Dungeon Crawler World',
    reason:
      "The show's name is the masthead eyebrow, and it is on the back cover of book 1. The " +
      'premise block under it is deliberately ungated blurb content for exactly the same reason. ' +
      'The entity is tagged 1:4 because that is where the text names it, not because it is secret.',
  },
];
const exempt = (file, name) =>
  EXEMPT.some(e => e.file === file && e.name.toLowerCase() === name.toLowerCase());

const hits = [];
for (const file of files) {
  /* Blank out comments before scanning, keeping newlines so line numbers stay
     true. Comments are where this codebase explains the gate, so they name
     gated things constantly and legitimately — only what a reader can actually
     see counts. Expressions are fine too: `{floor.name}` is the gate doing its
     job, `Floor 7 — the Great Race` in literal copy is not. */
  const src = readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));

  const lines = src.split('\n');
  lines.forEach((line, i) => {
    for (const g of gated) {
      if (!g.re.test(line)) continue;
      const rel = file.replace(root + '/', '');
      if (exempt(rel, g.name)) continue;
      hits.push({ file: rel, line: i + 1, ...g, text: line.trim().slice(0, 90) });
    }
  });
}

if (hits.length) {
  console.error('\nStory content hardcoded in page source — this bypasses the gate:\n');
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}`);
    console.error(`    "${h.name}" (${h.id}) is gated at ${h.at}, but appears in static copy`);
    console.error(`    ${h.text}`);
  }
  console.error(`\n${hits.length} occurrence(s). Move it into data/, or into a comment.`);
  process.exit(1);
}
console.log(
  `OK — no gated name (of ${gated.length} checked) appears in page source` +
  `${EXEMPT.length ? `, ${EXEMPT.length} documented exemption(s)` : ''}.`,
);
