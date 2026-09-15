#!/usr/bin/env node
/* Pulls the achievement pages from the Dungeon Crawler Carl Fandom wiki.

   The wiki keeps the System's own award text under an `== AI Description ==`
   heading with `{{cite|book|chapter}}` footnotes — the same convention its item
   pages use, and the same one this project already quotes item descriptions
   from. That citation is what makes an achievement gateable: it is the chapter
   the award is read in, so it is the chapter the award may be shown at.

   Two outputs, split the way `fetch-chapters.mjs` splits its own:

     data/index/achievements.json   gitignored — every page in full, including
                                    the long ones. The corpus the voice work
                                    reads, not this site's content.
     data/achievements.json         committed — the curated, gated list. Short
                                    quotations only, in the item-description
                                    tradition: the award itself, never the
                                    wiki's narration around it.

   Fandom answers HTML scraping with a 402; api.php does not, which is why this
   goes through the API for raw wikitext.  */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseAt } from './lib/gate.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://dungeon-crawler-carl.fandom.com/api.php';
const UA = 'dcc-companion/0.1 (personal reading companion; contact via repo)';

const ORDINALS = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6,
  seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11,
};

const j = async url => {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return res.json();
};

async function categoryMembers(cat) {
  const out = [];
  let cont;
  do {
    const q = new URLSearchParams({
      format: 'json', action: 'query', list: 'categorymembers',
      cmtitle: `Category:${cat}`, cmlimit: '500', ...(cont ? { cmcontinue: cont } : {}),
    });
    const body = await j(`${API}?${q}`);
    out.push(...body.query.categorymembers.map(m => m.title));
    cont = body.continue?.cmcontinue;
  } while (cont);
  return out;
}

async function wikitexts(titles) {
  const pages = {};
  for (let i = 0; i < titles.length; i += 40) {
    const q = new URLSearchParams({
      format: 'json', action: 'query', prop: 'revisions',
      rvprop: 'content', rvslots: 'main', titles: titles.slice(i, i + 40).join('|'),
    });
    for (const p of Object.values((await j(`${API}?${q}`)).query.pages)) {
      const text = p.revisions?.[0]?.slots?.main?.['*'];
      if (text) pages[p.title] = text;
    }
  }
  return pages;
}

/* Markup down to prose. Citations are pulled out before the strip, because they
   are the only thing on the page that says when an award may be shown. */
const cites = t => [...t.matchAll(/\{\{(?:cite|ref)\|(\d+)\|(\d+)\}\}/g)]
  .map(m => ({ book: +m[1], chapter: +m[2] }));

function clean(t) {
  let s = t;
  for (let i = 0; i < 8; i++) s = s.replace(/\{\{[^{}]*\}\}/g, '');
  return s
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<\/?(p|blockquote|br\s*\/?)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[(?:File|Image|Category):[^\]]*\]\]/gi, '')
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    /* External links are SINGLE brackets — `[url label]` — and the internal-link
       rules above do not touch them. Missing these left a 460-character Etsy
       tracking URL in one award's quoted text, which no amount of wrapping can
       break and which pushed the whole document sideways on a phone. */
    .replace(/\[(?:https?:)?\/\/\S+?\s+([^\]]*)\]/g, '$1')
    .replace(/\[(?:https?:)?\/\/\S+?\]/g, '')
    .replace(/(?:https?:)?\/\/\S{30,}/g, '')
    .replace(/'''?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Infobox fields are separated by a newline-pipe, not by any pipe: splitting on
   every "|" truncates a value at its first piped link, which turned
   "[[Player Stats#Strength (STR)|Strength]]" into "[[Player Stats#Strength (STR)". */
const field = (block, name) => {
  const m = block.match(new RegExp(`\\n?\\|\\s*${name}\\s*=([\\s\\S]*?)(?=\\n\\s*\\||\\n?\\}\\}|$)`, 'i'));
  return m ? clean(m[1]) : '';
};

/** "[[First Floor]]" -> 1. The infobox writes floors as ordinals, not numbers. */
function floorOf(text) {
  const m = clean(text).match(/(\w+)\s+Floor/i);
  return m ? ORDINALS[m[1].toLowerCase()] ?? null : null;
}

/* The floor a position is on: the last floor arrived at by then. Floors are
   ordered and their spans touch at the edges — floor 7 leaves at 6:1 and floor
   8 arrives at 6:1 — so "the latest one you have reached" is the only reading
   that stays single-valued at a boundary.

   This is derived rather than read off the page because the infobox floor is
   not reliable: the wiki files the Loot achievement, awarded in book 1 chapter
   6, under the Ninth Floor. Same class of error as its Gate of the Feral Gods
   page filing three book-7 events under a "Book 4" heading — the citation is a
   direct page reference and the heading is somebody's filing decision, so the
   citation wins. A floor number attached to an award the reader can already see
   is also a structural leak in its own right. */
function floorAt(value, floors) {
  let found = null;
  for (const f of floors) if (parseAt(f.revealedAt) <= value) found = f.id;
  return found;
}

/* "Reward: You've received a Gold Apparel Box!" is the System still talking, so
   it is split off rather than dropped — the reward line is where a good half of
   the jokes land. */
function splitReward(body) {
  const m = body.match(/\bReward:\s*([\s\S]*)$/i);
  if (!m) return { body: body.trim(), reward: '' };
  return { body: body.slice(0, m.index).trim(), reward: m[1].trim() };
}

/* Who earned it. There is no `recipient` field — one page of 151 has one — but
   the lede sentence almost always says, and the Story section says when the
   lede does not: "Carl and Donut both receive this achievement after…",
   "awarded to Carl for killing the very last hunter".

   Matched against the curated cast rather than parsed as prose, so a recipient
   is an entity id this site already knows how to gate and link. Only sentences
   carrying a receive-verb are searched: the lede also says things like "It is
   distinct from the Trailblazing Crazy Cat Lady Achievement", and matching
   names across the whole page would attribute an award to whoever happens to
   be mentioned in it. */
const cast = ['characters']
  /* Each curation file is `{ $comment, entities: [...] }`, not a bare array. */
  .flatMap(f => JSON.parse(readFileSync(join(root, `data/entities/${f}.json`), 'utf8')).entities)
  .filter(e => e.kind === 'character')
  .flatMap(e => [e.name, ...(e.aka ?? []).filter(a => /^[A-Z]/.test(a))]
    .filter(n => n.length >= 4)
    .map(name => ({ id: e.id, name, re: new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`) })));

/* The first pass missed a third of these by listing too few verbs. The wiki
   says "Carl got the Molly Maguires achievement", "issued to Carl after fleeing",
   "distributed to crawlers who discover a City Boss" — all receive-verbs, none
   of them "receives". */
const RECEIVES =
  /\b(?:receives?|received|receiving|earns?|earned|gets?|got|unlocks?|unlocked|awarded|issued|distributed|given|granted)\b/i;

/* An award that belongs to nobody in particular. "awarded to all crawlers upon
   entering the Fourth Floor" is not missing a recipient — the answer is that
   there isn't one, and saying so is better than leaving the row blank. */
const EVERYONE = /\b(?:all crawlers|every crawler|any crawler|each crawler|all of the crawlers)\b/i;

function recipientsIn(text) {
  const found = new Map();
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (!RECEIVES.test(sentence)) continue;
    for (const c of cast) if (c.re.test(sentence)) found.set(c.id, c.name);
  }
  if (found.size) return { recipients: [...found.keys()], everyone: false };

  if (EVERYONE.test(text)) return { recipients: [], everyone: true };

  /* Nothing with a receive-verb attached. The page still describes the deed,
     and in English the person who did it is the subject — so take the FIRST
     cast name in the first sentence that names anyone. "Carl discovered the
     Level 85 Elite City Boss, Ringmaster Grimaldi" is Carl's award, not
     Grimaldi's; requiring a single name would decline it, and taking every
     name would credit the boss.

     Where the prose names nobody at all — "an achievement awarded for
     fumbling" — the answer is that the source does not say, and a blank row is
     the honest one. Nothing here is invented. */
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    let first = null;
    for (const c of cast) {
      const at = sentence.search(c.re);
      if (at !== -1 && (first === null || at < first.at)) first = { at, id: c.id };
    }
    if (first) return { recipients: [first.id], everyone: false };
  }

  return { recipients: [], everyone: false };
}

const titles = (await categoryMembers('Achievements'))
  .filter(t => !/^Floor \d+ Achievements$/.test(t) && t !== 'Achievement');
const pages = await wikitexts(titles);

const rows = [];
const problems = [];

for (const [title, text] of Object.entries(pages)) {
  const name = title.replace(/\s*Achievement$/, '');
  const box = text.match(/\{\{Achievement([\s\S]*?)\n\}\}/i)?.[1] ?? '';
  const ai = text.match(/==\s*AI Description\s*==([\s\S]*?)(?=\n==[^=]|$)/i)?.[1];
  /* Everything before the first heading, plus the Story section — the two
     places the page says who this happened to. */
  const lede = clean(text.replace(/\{\{Achievement[\s\S]*?\n\}\}/i, '').split(/\n==/)[0] ?? '');
  const story = clean(text.match(/==\s*Story\s*==([\s\S]*?)(?=\n==[^=]|$)/i)?.[1] ?? '');

  const at = cites(ai ?? '')[0] ?? cites(text)[0] ?? null;
  const whole = ai ? clean(ai.replace(/===[\s\S]*$/, '')) : '';
  const { body, reward } = splitReward(whole);
  /* The award in full. This was a 70-word excerpt once, on the reasoning that a
     quotation is not a reproduction — but half the comedy of these is the
     System wandering off for four hundred words about 1970s record clubs and
     arriving back at the achievement almost by accident, and an excerpt cuts
     exactly that. Every award carries a link to the page it came from instead,
     which is the attribution that makes quoting it whole defensible. */
  const quote = body;

  if (!ai) problems.push(`${name}: no AI Description`);
  if (!at) problems.push(`${name}: no chapter citation`);

  rows.push({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name,
    at: at ? `${at.book}:${at.chapter}` : null,
    book: at?.book ?? null,
    chapter: at?.chapter ?? null,
    boxFloor: floorOf(field(box, 'floor')),   // what the page claims; cross-check only
    ...(() => {
      const r = recipientsIn(`${lede} ${story}`);
      return { recipients: r.recipients, everyone: r.everyone };
    })(),
    for: field(box, 'for'),
    boxReward: field(box, 'reward'),
    quote,
    reward,
    words: body ? body.split(/\s+/).length : 0,
    source: `https://dungeon-crawler-carl.fandom.com/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
  });
}

/* An award with no citation still has a floor, and a floor has an end. Gating
   it there is the conservative reading — "somewhere on this floor" becomes
   "once this floor is behind you" — and it is the same rule the floors' own
   recaps follow: a summary of a span unseals at the end of that span, never the
   start. Tagging it at the book instead would unseal it at chapter zero and
   hand a reader an eightieth-chapter award one chapter in. */
const bookFloors = JSON.parse(readFileSync(join(root, 'data/books.json'), 'utf8')).floors;
const floorEnds = new Map(bookFloors.map(f => [f.id, f.recapAt]));

const overridden = [];
for (const r of rows) {
  if (r.at) {
    r.confidence = 'verified';
  } else {
    /* No citation: fall back to the floor the page claims, gated at its end. */
    const end = floorEnds.get(r.boxFloor);
    r.at = end ?? null;
    r.confidence = 'draft';
    r.derived = end ? `floor ${r.boxFloor} ends` : null;
  }
  if (!r.at) { r.floor = null; continue; }

  /* The page's floor is kept wherever it is *possible* — the wiki editors know
     which floor a feat belongs to, and at a boundary (an award cited at 1:30,
     the chapter floor 2 opens) their answer is better than arithmetic.

     It is overridden only where it would leak: a floor the reader has not
     arrived at by the time the award unseals. The wiki files Loot — book 1,
     chapter 6 — under the Ninth Floor, which put "Floor 9" on a stamp a
     book-1 reader can see. Same class of error as its Gate of the Feral Gods
     page filing book-7 events under a "Book 4" heading. */
  const value = parseAt(r.at);
  const claimed = bookFloors.find(f => f.id === r.boxFloor);
  if (claimed && parseAt(claimed.revealedAt) <= value) {
    r.floor = r.boxFloor;
  } else {
    r.floor = floorAt(value, bookFloors);
    if (r.boxFloor) {
      overridden.push(`${r.name} (${r.at}): page says floor ${r.boxFloor}, which is not reached yet — using ${r.floor}`);
    }
  }
}

rows.sort((a, b) => (a.book ?? 99) - (b.book ?? 99) || (a.chapter ?? 0) - (b.chapter ?? 0)
  || a.name.localeCompare(b.name));

mkdirSync(join(root, 'data/index'), { recursive: true });
writeFileSync(join(root, 'data/index/achievements.json'),
  JSON.stringify({ pulled: rows.length, rows }, null, 2) + '\n');

/* The committed half: only rows that have both a reveal point and words to
   show. Everything else stays in the corpus for a human to look at. */
const curated = rows
  .filter(r => r.at && r.quote)
  .map(r => ({
    id: r.id, name: r.name, at: r.at, floor: r.floor ?? null,
    for: r.for || null, box: r.boxReward || null,
    text: r.quote, reward: r.reward || null, source: r.source,
    recipients: r.recipients.length ? r.recipients : undefined,
    everyone: r.everyone || undefined,
    confidence: r.confidence,
    derived: r.derived || undefined,
  }));
writeFileSync(join(root, 'data/achievements.json'),
  JSON.stringify({ achievements: curated }, null, 2) + '\n');

const usable = rows.filter(r => r.at && r.quote);
console.log(`Pulled ${rows.length} achievement pages; ${usable.length} have both text and a chapter.`);
const byBook = {};
for (const r of usable) byBook[r.book] = (byBook[r.book] ?? 0) + 1;
console.log('by book: ' + Object.entries(byBook).sort().map(([b, n]) => `bk${b} ${n}`).join('  '));
const words = usable.map(r => r.quote.split(/\s+/).length).sort((a, b) => a - b);
console.log(`quoted in full — words: median ${words[words.length >> 1]}, longest ${words.at(-1)}`);
console.log(`with a named recipient: ${usable.filter(r => r.recipients.length).length}` +
  `, awarded to every crawler: ${usable.filter(r => r.everyone).length}` +
  `, still unattributed: ${usable.filter(r => !r.recipients.length && !r.everyone).length}`);
if (overridden.length) {
  console.log(`\n${overridden.length} page(s) claim a floor the reader has not reached; overridden:`);
  for (const d of overridden) console.log('  ' + d);
}
if (problems.length) {
  console.log(`\n${problems.length} page(s) need a human:`);
  for (const p of problems.slice(0, 20)) console.log('  ' + p);
}
console.log(`\nWrote data/index/achievements.json (gitignored corpus, ${rows.length} rows)`);
console.log(`Wrote data/achievements.json (committed, ${curated.length} gated awards, ` +
  `${curated.filter(r => r.confidence === 'draft').length} at a floor's end pending a chapter)`);
