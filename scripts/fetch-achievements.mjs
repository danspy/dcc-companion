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
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://dungeon-crawler-carl.fandom.com/api.php';
const UA = 'dcc-companion/0.1 (personal reading companion; contact via repo)';

/* A quotation, not a reproduction. Anything past this is trimmed at a sentence
   boundary and flagged — several awards wander off into a four-hundred-word
   digression about 1970s record clubs, which is very funny and is not ours to
   republish. */
const QUOTE_WORDS = 70;

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
    .replace(/'''?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const field = (block, name) => {
  const m = block.match(new RegExp(`\\|\\s*${name}\\s*=([^|}]*)`, 'i'));
  return m ? clean(m[1]) : '';
};

/** "[[First Floor]]" -> 1. The infobox writes floors as ordinals, not numbers. */
function floorOf(text) {
  const m = clean(text).match(/(\w+)\s+Floor/i);
  return m ? ORDINALS[m[1].toLowerCase()] ?? null : null;
}

/* The award proper, trimmed at a sentence boundary. The System's text opens
   with the award and only then wanders, so the opening is the part that both
   quotes honestly and shows the register. */
function excerpt(full) {
  const words = full.split(/\s+/);
  if (words.length <= QUOTE_WORDS) return { text: full, trimmed: false };
  const cut = words.slice(0, QUOTE_WORDS).join(' ');
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return { text: (end > 40 ? cut.slice(0, end + 1) : cut) + ' […]', trimmed: true };
}

/* "Reward: You've received a Gold Apparel Box!" is the System still talking, so
   it is split off rather than dropped — the reward line is where a good half of
   the jokes land. */
function splitReward(body) {
  const m = body.match(/\bReward:\s*([\s\S]*)$/i);
  if (!m) return { body: body.trim(), reward: '' };
  return { body: body.slice(0, m.index).trim(), reward: m[1].trim() };
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

  const at = cites(ai ?? '')[0] ?? cites(text)[0] ?? null;
  const whole = ai ? clean(ai.replace(/===[\s\S]*$/, '')) : '';
  const { body, reward } = splitReward(whole);
  const { text: quote, trimmed } = excerpt(body);

  if (!ai) problems.push(`${name}: no AI Description`);
  if (!at) problems.push(`${name}: no chapter citation`);

  rows.push({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name,
    at: at ? `${at.book}:${at.chapter}` : null,
    book: at?.book ?? null,
    chapter: at?.chapter ?? null,
    floor: floorOf(field(box, 'floor')),
    for: field(box, 'for'),
    boxReward: field(box, 'reward'),
    quote,
    reward,
    trimmed,
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
const floorEnds = new Map(
  JSON.parse(readFileSync(join(root, 'data/books.json'), 'utf8')).floors
    .map(f => [f.id, f.recapAt]),
);

for (const r of rows) {
  if (r.at) { r.confidence = 'verified'; continue; }
  const end = floorEnds.get(r.floor);
  r.at = end ?? null;
  r.confidence = 'draft';
  r.derived = end ? `floor ${r.floor} ends` : null;
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
    text: r.quote, reward: r.reward || null,
    trimmed: r.trimmed || undefined,
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
console.log(`trimmed to a quotation: ${usable.filter(r => r.trimmed).length}`);
if (problems.length) {
  console.log(`\n${problems.length} page(s) need a human:`);
  for (const p of problems.slice(0, 20)) console.log('  ' + p);
}
console.log(`\nWrote data/index/achievements.json (gitignored corpus, ${rows.length} rows)`);
console.log(`Wrote data/achievements.json (committed, ${curated.length} gated awards, ` +
  `${curated.filter(r => r.confidence === 'draft').length} at a floor's end pending a chapter)`);
