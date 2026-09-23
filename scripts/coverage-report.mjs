#!/usr/bin/env node
/* Which names earn a page, and where does each first appear?
   
   Counts every name in the Fandom wiki categories you name (--cat=, default
   Characters) against
   the chapter summaries in data/index/summaries.json, then reports the ones
   that come up often and have no entity yet. Frequency is a proxy for weight, so
   this is the queue: work down it, don't guess.
   
   Same spirit as a drift check — it is how the curated set grows on evidence
   rather than on whichever name happened to be on my mind.
   
   Needs `npm run chapters:refresh` first (summaries.json is gitignored). */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { aliasNames } from './lib/aliases.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://dungeon-crawler-carl.fandom.com/api.php';
const UA = 'dcc-companion/0.1 (personal reading companion; contact via repo)';

const summariesPath = join(root, 'data/index/summaries.json');
if (!existsSync(summariesPath)) {
  console.error('data/index/summaries.json is missing — run `npm run chapters:refresh` first.');
  process.exit(1);
}
const { books } = JSON.parse(readFileSync(summariesPath, 'utf8'));

async function categoryMembers(cat) {
  const out = [];
  let cont;
  do {
    const url = `${API}?${new URLSearchParams({
      format: 'json', action: 'query', list: 'categorymembers',
      cmtitle: `Category:${cat}`, cmlimit: '500', ...(cont ? { cmcontinue: cont } : {}),
    })}`;
    const j = await (await fetch(url, { headers: { 'User-Agent': UA } })).json();
    /* A misspelt category answers 200 with an empty list, which reads as "nothing
       to add" rather than "you asked for a category that isn't there". */
    if (!j.query?.categorymembers) throw new Error(`No such category: ${cat}`);
    out.push(...j.query.categorymembers.map(m => m.title).filter(t => !t.startsWith('Category:')));
    cont = j.continue?.cmcontinue;
  } while (cont);
  return out;
}

/* A name matches an existing entry loosely, because the wiki and the curation
   disagree about articles and disambiguators constantly: the wiki's "Maestro"
   is our "The Maestro", its "Gate of the Feral Gods" our "The Gate of the
   Feral Gods", its "Personal Space" our "Personal Spaces". Comparing the raw
   strings reported four entities that already existed as gaps, which is the
   one thing a work queue must not do — it sends you off to write a page that
   is already there. */
const normalise = n => n.toLowerCase()
  .replace(/\s*\([^)]*\)\s*$/, '')   // "Carl's Doomsday Scenario (Item)"
  .replace(/^the\s+/, '')
  .replace(/[’']/g, "'")
  .replace(/s$/, '')                 // singular/plural
  .trim();

const existing = new Set(
  ['characters', 'items', 'mechanics', 'factions', 'places', 'threads'].flatMap(f => {
    const d = JSON.parse(readFileSync(join(root, `data/entities/${f}.json`), 'utf8'));
    return d.entities.flatMap(e => [e.name, ...aliasNames(e)].map(normalise));
  }),
);

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function scan(name) {
  // Whole-name match, case sensitive for short names to avoid "Bin"/"Tin" noise.
  const flags = name.length <= 4 ? '' : 'i';
  const re = new RegExp(`\\b${escape(name)}\\b`, flags);
  let count = 0, first = null;
  const perBook = {};
  for (const { book, rows } of books) {
    for (const r of rows) {
      if (r.kind !== 'chapter' || !re.test(r.summary)) continue;
      count++;
      perBook[book] = (perBook[book] ?? 0) + 1;
      if (!first) first = `${book}:${r.chapter}`;
    }
  }
  return { count, first, books: Object.keys(perBook).length };
}

/* Which of the wiki's categories to sweep. Characters and Items were the only
   two for a long time, and the entities that fell outside them — NPCs, deities,
   spells, quests, locations — were swept by hand instead, which is not
   reproducible and quietly went stale. `--cat=Skills,Spells` names any category
   on the wiki, so the sweep that doubled the graph can be re-run rather than
   remembered. `--cat=all` is the whole list below. */
const SWEEPABLE = [
  'Characters', 'Items', 'NPCs', 'Bosses', 'Deities', 'Skills', 'Spells',
  'Classes', 'Races', 'Mob Types', 'Groups', 'Factions', 'Corporations',
  'Dungeon Locations', 'Dungeon Mechanics', 'Crawler Mechanics', 'Dungeon Lore',
  'Quests', 'Shows', 'Achievements', 'Status Effects', 'Personal Spaces',
  'Pets', 'Traps', 'Vehicles', 'Loot Boxes', 'Syndicate Organizations',
];

const catArg = process.argv.find(a => a.startsWith('--cat='))?.slice(6);
const kinds =
  catArg === 'all' ? SWEEPABLE :
  catArg ? catArg.split(',').map(s => s.trim()).filter(Boolean) :
  process.argv.includes('--items') ? ['Items'] :
  process.argv.includes('--all') ? ['Characters', 'Items'] : ['Characters'];
const min = Number(process.argv.find(a => a.startsWith('--min='))?.slice(6) ?? 4);

const rows = [];
for (const cat of kinds) {
  for (const name of await categoryMembers(cat)) {
    const { count, first, books: spread } = scan(name);
    if (count < min) continue;
    rows.push({ name, cat, count, spread, first, have: existing.has(normalise(name)) });
  }
}
rows.sort((a, b) => b.count - a.count || b.spread - a.spread);

const missing = rows.filter(r => !r.have);
console.log(`\n${rows.length} names mentioned in ${min}+ chapters · ${missing.length} with no entity yet\n`);
console.log('  mentions  books  first   category            name');
console.log('  --------  -----  -----   --------            ----');
for (const r of missing.slice(0, 80)) {
  console.log(
    `  ${String(r.count).padStart(8)}  ${String(r.spread).padStart(5)}  ${String(r.first).padStart(5)}   ${r.cat.padEnd(18)}  ${r.name}`,
  );
}
writeFileSync(join(root, 'data/index/coverage.json'), JSON.stringify(rows, null, 2) + '\n');
console.log(`\nFull ranking written to data/index/coverage.json (gitignored)`);
