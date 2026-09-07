#!/usr/bin/env node
/* Is every reveal point late enough?

   A reveal tag that is too *late* is merely cautious. A reveal tag that is too
   *early* is a leak: the gate shows the entry to a reader who has not reached
   the chapter that introduces it. This checks the direction that can hurt, by
   comparing each entity's `revealedAt` against the first chapter summary that
   names it (or any of its `aka`).

   It is a curation aid, not a build rule, because data/index/summaries.json is
   gitignored — the wiki's own sentences are not this site's content. Run it
   after `npm run chapters:refresh`, and read the summary before believing it:
   the first "Bautista" in book 2 is a corpse called Grace, five chapters before
   Daniel Bautista is met, and the first "Louis" is a stack of Louis L'Amour
   paperbacks four floors early. An anchor is a proposal.

   Names the summaries never mention are skipped: curated thread names like
   "The crown's bill" are ours, not the wiki's, and cannot be corroborated.

   **It is advisory, and it always exits 0.** A summary paraphrases: chapter 1:5
   says Carl opens his boxes and finds "a very interesting biscuit" without ever
   typing "Enhanced Pet Biscuit", so the item looks 88 chapters early here and is
   in fact tagged exactly right. Twelve of the hand-curated entries flag for that
   reason. The signal is sharp in one direction only: for an entity found *in*
   these summaries in the first place — which is how the coverage queue works — an
   EARLY line means the tag really is too early, and that is a leak. */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseAt, bookOf } from './lib/gate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(readFileSync(join(root, p), 'utf8'));

const summariesPath = join(root, 'data/index/summaries.json');
if (!existsSync(summariesPath)) {
  console.log('data/index/summaries.json is missing — run `npm run chapters:refresh` first.');
  process.exit(0);
}
const { books } = JSON.parse(readFileSync(summariesPath, 'utf8'));
const entities = ['characters', 'items', 'mechanics', 'factions', 'places', 'threads']
  .flatMap(f => read(`data/entities/${f}.json`).entities);

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* Earliest chapter naming any of these strings. Short names stay case-sensitive:
   "Bomo" inside "bombs" and "Eva" inside "evacuate" are the usual false hits. */
function firstMention(names) {
  const res = names.filter(n => n && n.length >= 3)
    .map(n => new RegExp(`\\b${esc(n)}\\b`, n.length <= 4 ? '' : 'i'));
  if (!res.length) return null;
  for (const { book, rows } of books) {
    for (const r of rows) {
      if (r.kind !== 'chapter') continue;
      if (res.some(re => re.test(r.summary))) return { at: `${book}:${r.chapter}`, value: parseAt(`${book}:${r.chapter}`), summary: r.summary };
    }
  }
  return null;
}

let early = 0, unseen = 0, ok = 0;
const rows = [];
for (const e of entities) {
  const hit = firstMention([e.name, ...(e.aka ?? [])]);
  if (!hit) { unseen++; continue; }
  const declared = parseAt(e.revealedAt);
  /* Compare at book granularity when the entity is tagged at book level: "4"
     means "anywhere in book 4", which is chapter 0, and would otherwise look
     early against any chapter in that book. */
  const tooEarly = bookOf(declared) < bookOf(hit.value)
    || (bookOf(declared) === bookOf(hit.value) && declared % 1000 !== 0 && declared < hit.value);
  if (tooEarly) { early++; rows.push({ e, hit }); } else ok++;
}

for (const { e, hit } of rows) {
  console.log(`  EARLY  ${e.id} (${e.kind}) reveals at "${e.revealedAt}" but is first named at ${hit.at}`);
  console.log(`         ${hit.summary.replace(/\s+/g, ' ').slice(0, 200)}`);
}
console.log(`\n${entities.length} entities · ${ok} anchored · ${early} earlier than their first mention · ${unseen} not named in any summary`);
if (early) {
  console.log('An EARLY line is a question, not a verdict: read the chapter it points at.\n' +
              'It is decisive only for an entity that was found in these summaries to begin with.');
}
