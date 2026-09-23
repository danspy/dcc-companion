#!/usr/bin/env node
/* Is every reveal point where the book first gives the reader the name?

   A reveal tag that is too *early* is a leak: the gate shows the entry to a
   reader who has not reached the chapter that introduces it. A tag that is too
   *late* retro-seals a name the reader has already read, and CLAUDE.md's rule is
   that an entity reveals where the book gives the reader the word.

   Two sources, best first:

     data/index/books/     the edition's full text   (`node scripts/fetch-books.mjs`)
     data/index/summaries.json   the wiki's summaries  (`npm run chapters:refresh`)

   Both are gitignored curation aids, so this is advisory and always exits 0.
   With the full text a first mention is a fact about the book rather than about
   a paraphrase of it, and the old caveat — a summary saying "a very interesting
   biscuit" instead of "Enhanced Pet Biscuit" — goes away. What does not go away
   is that a name can be a word before it is a character: the first "Louis" is a
   stack of Louis L'Amour paperbacks. Read the context line before believing it.

   Matching follows src/lib/leak.ts: single-word names are case-sensitive (Milk
   is a crawler, milk is a drink), multi-word names are not, word boundaries
   throughout.

     --json      write data/index/anchors.json for a curation pass
     --all       also list entities whose tag matches their first mention */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseAt, bookOf, END_OF_BOOK } from './lib/gate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(readFileSync(join(root, p), 'utf8'));
const args = new Set(process.argv.slice(2));

const entities = ['characters', 'items', 'mechanics', 'factions', 'places', 'threads']
  .flatMap(f => read(`data/entities/${f}.json`).entities);

/* Sections in reading order: { value, at, text }. */
function fromBooks() {
  const p = join(root, 'data/index/books/index.json');
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8')).books.flatMap(b => b.sections.map(s => {
    const at = `${b.book}:${s.position}`;
    return { at, value: parseAt(at), text: readFileSync(join(root, `data/index/books/text/b${b.book}/${s.file}`), 'utf8') };
  }));
}
function fromSummaries() {
  const p = join(root, 'data/index/summaries.json');
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8')).books.flatMap(({ book, rows }) => rows
    .filter(r => r.kind === 'chapter')
    .map(r => ({ at: `${book}:${r.chapter}`, value: parseAt(`${book}:${r.chapter}`), text: r.summary })));
}

const sections = fromBooks() ?? fromSummaries();
const source = fromBooks() ? 'the edition\'s full text' : 'the wiki\'s chapter summaries';
if (!sections) {
  console.log('No source on disk — run `node scripts/fetch-books.mjs` or `npm run chapters:refresh` first.');
  process.exit(0);
}

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* Curly apostrophes in the text, straight ones in the data. */
const pattern = n => esc(n).replace(/'/g, "['’]").replace(/ /g, '\\s+');
/* A plural and a possessive count: the first "Naga" is "the Nagas", the first
   "Grimaldi" is his circus — but a person is never plural, or "Bodi" matches
   "Bodies" and "Tran" matches "Trans Tunnel". A space is any whitespace, because the text puts a
   non-breaking one inside "Lemig Sortion". Only a person or a group has to
   match in its own case — Milk and Ruby are words as well as names — while an
   item, a mechanic or a place is named in title case by the System and in
   lower case by Carl ("a xistera", "the recap episode") and is the same thing
   either way. */
const matcher = (n, anyCase, plural) =>
  new RegExp(`(?<![\\w’'])${pattern(n)}${plural ? '(?:e?s)?' : ''}(?:['’]s)?(?![\\w’])`, anyCase || /\s/.test(n) ? 'i' : '');

function firstMention(names, anyCase, plural) {
  const res = names.filter(n => n && n.length >= 3).map(n => ({ n, re: matcher(n, anyCase, plural) }));
  for (const s of sections) {
    for (const { n, re } of res) {
      const m = re.exec(s.text);
      if (m) {
        const ctx = s.text.slice(Math.max(0, m.index - 70), m.index + n.length + 70).replace(/\s+/g, ' ');
        return { at: s.at, value: s.value, name: n, context: ctx };
      }
    }
  }
  return null;
}

/* Read and settled: the thing is on the page at its tag, under words no alias
   can honestly carry. Each needs a reason, for the same reason check-pages.mjs's
   exemptions do — an unexplained escape hatch is how a leak gets waved through.
   Keyed on the tag, so moving the tag re-opens the question. */
const REVIEWED = {
  'system-ai@1:1': 'introduces itself at 1:1 as "a Syndicate neutral observer AI"; "the AI" comes a chapter later',
  'recap-episodes@1:14': 'the first recap airs at 1:14 ("a recap of last season"); "the recap" as a phrase is 1:20',
  'stairwell@1:2': 'the stairs down are on the page at 1:2; the word "stairwell" is 1:14',
  "louis@4:3": "first hit is Louis L'Amour paperbacks at 2:5 (also 2:17, 3:4, 3:14, 3:15); the crawler Louis Santiago 2 is first named at 4:3",
  "bautista@2:18": "first hit is the corpse of Grace Bautista 3 at 2:6, a different crawler; Daniel Bautista 2 is first named at 2:18 on The Divider's corpse",
  "apothecary@3:30": "first hit is \"collective\" the pooled personal space at 3:2; 3:27 calls her \"an apothecary\" as a common noun; Mordecai first gives the name \"the Apothecary\" at 3:30",
  "linus@8:15": "first hit at 7:5 is Linus from the Peanuts comic, a simile for a goblin; the soother tourist Linus is named at 8:15",
  "protections@5:75": "'protections' before 5:75 is the ordinary noun (Mordecai on Borant at 1:36, gear, saferooms, the goodwill ballrooms); the Safety Protections for Faction Sponsors are named by the action item at 5:75",
  "frank-and-maggie@1:20": "Frank Q is a kill credit on a corpse at 1:13, but the page is titled 'Frank Q & Maggie My' and Maggie is first named at 1:20; moving would leak her name",
  "gate-of-the-feral-gods@4:9": "first hit is the idiom 'right out the gate' at 1:4; 'The Gate of the Feral Gods' is first printed in Chaindrive's text at 4:9",
  "cascadia@5:62": "4:34 is Donut's nickname 'the kill, kill, kill lady', which never gives the name; the name first reaches the reader in the item 'Enchanted Stick of Cascadia's Screams' at 5:62",
  "geraldo@6:6": "the 2:11 hit is Geraldo Rivera and Al Capone's vault; the monk seal is first named at 6:6",
  "feral@4:3": "the 1:20 hit is the 'Feral Rabies' debuff; the concept arrives at 4:3 with the Feral Goose and Mordecai's 'anything with feral in the name'",
  "guilds@3:32": "the 1:1 hit is 'tutorial guilds'; the guild system as a thing is first named at 3:32 in the cookbook",
  "ping@4:32": "the 1:19 hit is an 8-bit 'ping' sound; the spell is learned and named at 4:32",
  "trainyard@3:5": "at 3:5 the engineer calls station 10 'really just the yard'; the word 'trainyard' is 3:14",
  "demon-eviction@6:54": "6:54 prints 'Demon Eviction is commencing' without the article the name carries",
  "carls-father@1:3": "never named; he is 'my dad' from 1:3, and the phrase 'Carl's father' is only the checker's handle, first in print at 8:1",
  "hamed@3:19": "'Enchanted Night Wyrm's Ring of Divine Suffering' at 3:19 prints the name without the article",
  "viscount-fog@5:46": "the 1:5 hit is 'fog of war'; the Viscount is first named in Sierra's description at 5:46",
  "asher@6:45": "the 1:3 hit is ash from Mordecai's mother's urn; Asher is named at 6:45",
  "york@3:15": "the 2:15 hit is New York City; the crawler York is first named in the cookbook at 3:15",
  "containment-interface@7:1": "the 2:16 hit is a dynamite fuse; the Containment Interface is named at 7:1",
  "the-madness@6:21": "the 4:34 hit is 'eons in the madness', a phrase; the team is first named at 6:21",
  "shanty-town@7:1": "the 1:14 hit is 'shanty towns' on Earth; the ring is first named at 7:1",
};

const report = [];
for (const e of entities) {
  const hit = firstMention([e.name, ...(e.aka ?? [])], !['character', 'faction'].includes(e.kind), e.kind !== 'character');
  const declared = parseAt(e.revealedAt);
  if (!hit) { report.push({ id: e.id, kind: e.kind, revealedAt: e.revealedAt, verdict: 'unnamed' }); continue; }
  const bookLevel = declared % 1000 === 0;
  let verdict;
  if (bookOf(declared) < bookOf(hit.value)) verdict = 'early';
  else if (bookLevel && bookOf(declared) === bookOf(hit.value)) verdict = 'book-level';
  else if (declared < hit.value) verdict = 'early';
  else if (declared > hit.value) verdict = 'late';
  else verdict = 'exact';
  if ((verdict === 'early' || verdict === 'late') && REVIEWED[`${e.id}@${e.revealedAt}`]) verdict = 'reviewed';
  report.push({ id: e.id, kind: e.kind, name: e.name, revealedAt: e.revealedAt, first: hit.at, matched: hit.name, verdict, context: hit.context });
}

const show = v => (v % 1000 === END_OF_BOOK ? `${bookOf(v)}:end` : `${bookOf(v)}:${v % 1000}`);
const groups = {
  early: 'EARLY — tagged before the book names it. A leak unless the context says the name is someone else.',
  'book-level': 'BOOK — tagged at book level; the text proposes a chapter.',
  late: 'LATE — the book names it before the tag. Retro-seals a name already read, unless the first hit is a different thing.',
};
for (const [v, title] of Object.entries(groups)) {
  const rows = report.filter(r => r.verdict === v);
  if (!rows.length) continue;
  console.log(`\n${title}  (${rows.length})`);
  for (const r of rows) {
    console.log(`  ${r.id.padEnd(28)} ${String(r.revealedAt).padEnd(7)} → ${show(parseAt(r.first)).padEnd(7)} "${r.matched}"`);
    console.log(`  ${''.padEnd(28)} …${r.context}…`);
  }
}
if (args.has('--all')) for (const r of report.filter(r => r.verdict === 'exact')) console.log(`  exact ${r.id} ${r.revealedAt}`);

const n = v => report.filter(r => r.verdict === v).length;
console.log(`\n${entities.length} entities against ${source}: ${n('exact')} exact · ${n('early')} early · ` +
  `${n('late')} late · ${n('book-level')} at book level · ${n('unnamed')} never named in the text · ${n('reviewed')} reviewed`);
if (args.has('--json')) {
  writeFileSync(join(root, 'data/index/anchors.json'), JSON.stringify(report, null, 1) + '\n');
  console.log('Wrote data/index/anchors.json');
}
