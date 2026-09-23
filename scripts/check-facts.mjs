#!/usr/bin/env node
/* Does the book support what we say, at the point we say it?

   The lint checks that prose never names an *entity* before it is revealed. It
   cannot see the rest: a proper noun that is not an entity ("Shadow Boxer"), a
   number ("2,145 Celestial boxes"), a detail the wiki filed under the wrong
   chapter. Those are exactly what the reveal-point pass kept finding. This
   reads every curated sentence against the edition's full text
   (data/index/books/, gitignored — `node scripts/fetch-books.mjs`) and flags:

     FUTURE   a proper noun or number whose first appearance in the book is
              after the text's gate. The sentence is describing something the
              reader has not reached. This is a leak until a read says otherwise.
     ABSENT   a proper noun or number the book never prints. Could be our own
              phrasing; could be a wiki error or an invention. Read it.
     QUOTE    an item description (the System's own words) that cannot be found
              in the book, or is found only after its tag.

   It is a screen, not a verdict, and it always exits 0. It never reads for
   truth — a sentence can use only early words and still be wrong — so a clean
   entry is "nothing obviously late", not "verified".

   The gate is the one the reader sees: a beat's is max(its tag, its entity's),
   a relation's is max(its tag, both ends'), exactly as build-content.mjs
   resolves them.

     --json         write data/index/facts.json
     --entity=<id>  only this entity
     --all          print clean entries too */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseAt, bookOf, END_OF_BOOK } from './lib/gate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(readFileSync(join(root, p), 'utf8'));
const argv = process.argv.slice(2);
const flag = n => argv.includes(`--${n}`);
const only = argv.find(a => a.startsWith('--entity='))?.split('=')[1];

const indexPath = join(root, 'data/index/books/index.json');
if (!existsSync(indexPath)) {
  console.log('data/index/books/ is missing — run `node scripts/fetch-books.mjs` first.');
  process.exit(0);
}

/* ---------- the book, indexed ---------- */

const sections = JSON.parse(readFileSync(indexPath, 'utf8')).books.flatMap(b => b.sections.map(s => {
  const at = `${b.book}:${s.position}`;
  const text = readFileSync(join(root, `data/index/books/text/b${b.book}/${s.file}`), 'utf8')
    .replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/ /g, ' ');
  return { at, value: parseAt(at), text, label: s.label };
}));

const norm = w => w.replace(/'s$/, '');
const first = new Map();          // word -> index of the first section printing it
const where = new Map();          // word -> Set of section indexes
sections.forEach((s, i) => {
  for (const m of s.text.matchAll(/[A-Za-z][A-Za-z'-]*|\d[\d,]*\d|\d/g)) {
    /* "Gore-Gore", "Kua-Tin" and "Half-Garbage" are also their parts; and a
       word is also its lower case, kept separately so a game term the System
       capitalises ("Debuff", "Tattoo") can be matched either way. */
    const w = norm(m[0].replace(/,/g, ''));
    const parts = [w, ...w.split('-').filter(Boolean)];
    const lowers = parts.flatMap(k => [k.toLowerCase(), k.toLowerCase().replace(/(?:es|s)$/, ''), k.toLowerCase().replace(/s$/, '')]);
    for (const v of new Set([...parts, ...lowers.map(l => `~${l}`)])) {
      if (!first.has(v)) first.set(v, i);
      let set = where.get(v); if (!set) where.set(v, set = new Set()); set.add(i);
    }
  }
});

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* First section printing a phrase: intersect the sections holding each word,
   then confirm the phrase in order. Case-sensitive on purpose — these are
   proper nouns. */
function firstPhrase(words) {
  const sets = words.map(w => where.get(w));
  if (sets.some(s => !s)) return -1;
  const re = new RegExp(`\\b${words.map(esc).join("(?:'s)?\\s+")}\\b`);
  const [smallest, ...rest] = [...sets].sort((a, b) => a.size - b.size);
  const cands = [...smallest].filter(i => rest.every(s => s.has(i))).sort((a, b) => a - b);
  for (const i of cands) if (re.test(sections[i].text)) return i;
  return -1;
}

function firstPhraseLower(words) {
  const sets = words.map(w => where.get(`~${w.toLowerCase()}`));
  if (sets.some(s => !s)) return -1;
  const re = new RegExp(`\\b${words.map(esc).join("(?:'s)?[\\s-]+")}(?:e?s)?\\b`, 'i');
  const [smallest, ...rest] = [...sets].sort((a, b) => a.size - b.size);
  const cands = [...smallest].filter(i => rest.every(s => s.has(i))).sort((a, b) => a - b);
  for (const i of cands) if (re.test(sections[i].text)) return i;
  return -1;
}

/* ---------- what counts as a checkable claim ---------- */

/* Capitalised words that carry no claim: sentence furniture, and the
   vocabulary of the site's own chrome. */
const STOP = new Set(`I I'm I've I'd I'll A An The This That These Those It It's He She They We You
  His Her Their Our My Your Its Me Us Him Them Then There Here When While After Before Once Now
  And But Or So Yet If Not No Yes Also Only Just Even Still Again Every Each All Some Any One Two
  Three Four Five Six Seven Eight Nine Ten Subject Crawler Crawlers Floor Floors Level Book
  Chapter System AI What Who Why How Where Which Whatever Whoever Nothing Everyone Someone
  Anyone Nobody Somebody Everything Something Anything Today Tonight Tomorrow Afterwards Later
  Mr Mrs Ms Dr Doctor Lord Lady King Queen Prince Princess Sir Miss Captain General Warlord
  First Second Third Fourth Fifth Sixth Seventh Eighth Ninth Tenth Eleventh Twelfth
  Monday Tuesday Wednesday Thursday Friday Saturday Sunday Earth Note Notes Reward New Warning
  Achievement Quest Box Boxes Gold Silver Bronze Platinum Legendary Celestial Fan Benefactor
  Boss Bosses Stairwell Saferoom Safe Room Recap Show Syndicate Borant`.split(/\s+/));

function claims(text) {
  const out = [];
  const t = text.replace(/[’‘]/g, "'");
  // Proper-noun runs, not at the start of a sentence.
  for (const m of t.matchAll(/(?<![.!?:"]\s|^)(?<!\*\*\*\s)\b([A-Z][A-Za-z'-]+(?:\s+(?:of\s+the\s+|of\s+|the\s+)?[A-Z][A-Za-z'-]+){0,3})\b/g)) {
    /* Trim furniture off both ends: "Crawler Louis" is a claim about Louis. */
    const words = m[1].split(/\s+/).map(norm).filter(w => w.length > 1);
    while (words.length && (STOP.has(words[0]) || /^(of|the)$/.test(words[0]))) words.shift();
    while (words.length && (STOP.has(words.at(-1)) || /^(of|the)$/.test(words.at(-1)))) words.pop();
    const content = words.filter(w => !STOP.has(w) && !/^(of|the)$/.test(w));
    if (!content.length) continue;
    // Shouting is not a name: Mongo's "TWO BIG THINGS".
    if (content.length > 1 && content.every(w => w === w.toUpperCase())) continue;
    m[1] = words.join(' ');
    out.push({ kind: 'name', text: m[1], words: words.filter(w => !/^(of|the)$/.test(w) || words.length > 1) });
  }
  // Numbers of two or more digits; single digits are too common to mean anything.
  for (const m of t.matchAll(/\b\d[\d,]*\d\b/g)) out.push({ kind: 'number', text: m[0], words: [m[0].replace(/,/g, '')] });
  return out;
}

/* ---------- what we wrote ---------- */

const KINDS = ['characters', 'items', 'mechanics', 'factions', 'places', 'threads'];
const entities = KINDS.flatMap(f => read(`data/entities/${f}.json`).entities);
const byId = new Map(entities.map(e => [e.id, e]));
const max = (...tags) => Math.max(...tags.map(parseAt));

const units = [];
for (const e of entities) {
  if (only && e.id !== only) continue;
  const tl = Array.isArray(e.tagline) ? e.tagline : e.tagline ? [{ at: e.revealedAt, text: e.tagline }] : [];
  tl.forEach((t, i) => units.push({ id: e.id, where: `tagline ${i + 1}`, gate: max(t.at, e.revealedAt), text: t.text }));
  for (const b of e.beats ?? [])
    units.push({ id: e.id, where: `beat "${b.headline}"`, gate: max(b.at, e.revealedAt), text: `${b.headline}. ${b.text}`, confidence: b.confidence });
  for (const r of e.relations ?? []) {
    const to = byId.get(r.to);
    if (r.note && to) units.push({ id: e.id, where: `relation → ${r.to}`, gate: max(r.at, e.revealedAt, to.revealedAt), text: r.note });
  }
  const desc = Array.isArray(e.description) ? e.description : e.description ? [{ at: e.revealedAt, text: e.description }] : [];
  desc.forEach((d, i) => units.push({ id: e.id, where: `description ${i + 1}`, gate: max(d.at, e.revealedAt), text: d.text, quote: true }));
}
if (!only) for (const f of read('data/books.json').floors) {
  units.push({ id: `floor-${f.id}`, where: 'premise', gate: parseAt(f.revealedAt), text: f.premise });
  if (f.previously) units.push({ id: `floor-${f.id}`, where: 'previously', gate: parseAt(f.revealedAt), text: f.previously });
  (Array.isArray(f.recap) ? f.recap : []).forEach((p, i) =>
    units.push({ id: `floor-${f.id}`, where: `recap ${i + 1}`, gate: parseAt(p.at), text: p.text }));
}

/* ---------- the screen ---------- */

const show = v => (v % 1000 === END_OF_BOOK ? `${bookOf(v)}:end` : `${bookOf(v)}:${v % 1000}`);

/* A quotation is found if a run of eight consecutive words from it is in the
   book; the earliest such run is where the reader first sees it. */
function findQuote(text) {
  const words = text.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').split(/\s+/).filter(Boolean);
  let best = -1;
  /* A quotation shorter than the window is searched whole. */
  if (words.length < 8) {
    const re = new RegExp(words.map(w => esc(w.replace(/[.,!?;:"]+$/, ''))).join('[\\s\\S]{0,6}?'));
    return sections.findIndex(s => re.test(s.text));
  }
  for (let k = 0; k + 8 <= words.length; k += 4) {
    const re = new RegExp(words.slice(k, k + 8).map(w => esc(w.replace(/[.,!?;:"]+$/, ''))).join('[\\s\\S]{0,6}?'));
    const i = sections.findIndex(s => re.test(s.text));
    if (i >= 0 && (best < 0 || i < best)) best = i;
  }
  return best;
}

/* Read and settled. Each needs a reason, for the reason check-pages.mjs's
   exemptions do. Keyed on the entity, the text and the claim, so rewording the
   text re-opens it. */
const REVIEWED = {
  'carl|beat "January 3rd, 2:23 in the morning"|Zippo': 'true at 1:1 — it is in his pocket from the window on; the book mentions it at 1:8',
  'carl|beat "January 3rd, 2:23 in the morning"|Marlboro Reds': 'as above: the half pack he went out to smoke',
  'carl|beat "Dressed for nothing, and stuck that way"|Goblin Pass Tattoo': 'the Goblin Pass comes out of a box at 1:5 and takes the form of a tattoo; the book never runs the three words together',
  'floor-1|recap|Goblin Pass Tattoo': 'as above',
  'desperado-club|beat "Entry is a tattoo"|Tattoo': 'the Desperado Pass is a tattoo in the text at 1:19; "Tattoo" is only capitalised here',
  'katia|tagline 2|Reykjav': 'Reykjavík with its accent; the book prints "Reykjavik" at 3:21, the tagline\'s own gate',
  'elle-mcgibbons|beat "Carl gets her inside"|Rage Elementals': 'the book prints "Rage Elemental" from 1:31; the plural is ours',
  'signet|beat "Blood magic, cast on a loser"|Ink Elementals': 'the book\'s "Blood and Ink Elemental" (2:9), pluralised',
  'justice-light|beat "In the Princess Posse"|HQ': 'our shorthand for the Posse\'s headquarters',
  'tipid|beat "Doctor Hu, and the Crawler Project"|HQ': 'as above',
  'crawler-project|beat "Tipid fills him in"|Posse HQ': 'as above',
  'chiyome|beat "Meeting the neighbours"|Razor Foxes': 'Chiyome, the foxes and the Wild Hunt are all in 8:12; the screen\'s plural handling misses it',
  'personal-spaces|beat "Lucia hands out Doggy Doors"|Doggy Doors': 'the item is a doggy door; the plural is ours',
  'no-respawns|beat "Thirty days, nine armies, one castle"|32,000': '"roughly" — the notification at 7:1 reads Remaining Crawlers: 32,429',
  'floor-9|recap|32,000': 'as above',
  'reavers|tagline 1|Dumplins': 'the book\'s "Dumplin\'", pluralised',
  'reavers|beat "Dumplins with the Gurgles"|Dumplins': 'as above',
  'floor-4|premise|Iron Tangle': 'a floor tagged at book level arrives with the book; the name is on the first page of 3:1',
};

const results = [];
for (const u of units) {
  const flags = [];
  const seen = new Set();
  for (const c of claims(u.text)) {
    const key = c.words.join(' ');
    if (seen.has(key)) continue; seen.add(key);
    /* Case-sensitive first, because these are names. Only when the book never
       prints the name in this case does the lower case count — that is how the
       System's capitalised game terms ("Tattoo", "Transformation") read, and a
       real name is always printed capitalised somewhere. */
    let i = c.words.length > 1 ? firstPhrase(c.words) : (first.get(c.words[0]) ?? -1);
    const lower = c.words.length > 1 ? firstPhraseLower(c.words) : (first.get(`~${c.words[0].toLowerCase()}`) ?? -1);
    if (lower >= 0 && (i < 0 || sections[lower].value <= u.gate && sections[i].value > u.gate) && !c.words.some(w => first.has(w) && first.get(w) === first.get(`~${w.toLowerCase()}`) && sections[first.get(w)].value > u.gate)) i = lower;
    if (i < 0) {
      // A multi-word run the book never prints as a phrase may still be two
      // separate names; only the words the book never prints at all count.
      const missing = c.words.filter(w => !first.has(w) && !STOP.has(w));
      if (missing.length) flags.push({ type: 'ABSENT', claim: c.text });
      else if (c.words.length > 1) {
        const late = c.words.filter(w => !STOP.has(w) && sections[first.get(w)].value > u.gate);
        if (late.length) flags.push({ type: 'FUTURE', claim: late.join(' '), at: show(Math.min(...late.map(w => sections[first.get(w)].value))) });
      }
    } else if (sections[i].value > u.gate) {
      flags.push({ type: 'FUTURE', claim: c.text, at: sections[i].at });
    }
  }
  if (u.quote) {
    const i = findQuote(u.text);
    if (i < 0) flags.push({ type: 'QUOTE', claim: 'not found in the book' });
    else if (sections[i].value > u.gate) flags.push({ type: 'QUOTE', claim: 'first printed after its tag', at: sections[i].at });
  }
  const open = flags.filter(f => !REVIEWED[`${u.id}|${u.where}|${f.claim}`]);
  results.push({ ...u, gate: show(u.gate), flags: open, reviewed: flags.length - open.length });
}

const flagged = results.filter(r => r.flags.length);
const rank = r => r.flags.reduce((a, f) => a + ({ FUTURE: 10, QUOTE: 5, ABSENT: 1 })[f.type], 0);
flagged.sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id));
for (const r of flagged) {
  console.log(`${r.id} · ${r.where} · gate ${r.gate}${r.confidence === 'draft' ? ' · draft' : ''}`);
  for (const f of r.flags) console.log(`   ${f.type.padEnd(6)} ${f.claim}${f.at ? ` (first at ${f.at})` : ''}`);
}
if (flag('all')) for (const r of results.filter(r => !r.flags.length)) console.log(`clean  ${r.id} · ${r.where}`);

const count = t => flagged.filter(r => r.flags.some(f => f.type === t)).length;
console.log(`\n${units.length} texts read against the edition: ${units.length - flagged.length} with nothing obviously late · ` +
  `${count('FUTURE')} naming something the reader has not reached · ${count('QUOTE')} quotations not found in place · ` +
  `${count('ABSENT')} naming something the book never prints · ${results.reduce((a, r) => a + r.reviewed, 0)} reviewed`);
if (flag('json')) {
  writeFileSync(join(root, 'data/index/facts.json'), JSON.stringify(results, null, 1) + '\n');
  console.log('Wrote data/index/facts.json');
}
