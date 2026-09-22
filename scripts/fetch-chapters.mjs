#!/usr/bin/env node
/* Pulls the per-book chapter tables from the Dungeon Crawler Carl Fandom wiki
   and derives the chapter spine.
   
   Two outputs, deliberately split:
   
     data/chapters.json           committed — counts, numbers, chapter titles and
                                  structural markers. Facts about the books.
     data/index/summaries.json    gitignored — the wiki's own summary prose, kept
                                  locally as a curation aid only.
   
   The wiki's summaries are someone else's writing. They are worth reading while
   deciding where a reveal belongs; they are not this site's content, and a
   deployed page must not republish them wholesale.
   
   Note: WebFetch-style HTML scraping gets a 402 from Fandom. The MediaWiki API
   does not, which is why this goes through api.php for raw wikitext. */

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { toEdition, editionCount, unsummarised } from './lib/edition.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://dungeon-crawler-carl.fandom.com/api.php';
const UA = 'dcc-companion/0.1 (personal reading companion; contact via repo)';
const BOOKS = 8;

async function wikitext(title) {
  const url = `${API}?${new URLSearchParams({
    format: 'json', action: 'query', prop: 'revisions',
    rvprop: 'content', rvslots: 'main', titles: title,
  })}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} fetching ${title}`);
  const pages = (await res.json()).query.pages;
  const page = Object.values(pages)[0];
  if (page.missing !== undefined) throw new Error(`no such page: ${title}`);
  return page.revisions[0].slots.main['*'];
}

/* Strip templates, refs, file links and markup down to plain prose. */
function clean(t) {
  let s = t;
  for (let i = 0; i < 8; i++) s = s.replace(/\{\{[^{}]*\}\}/g, '');
  return s
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[(?:File|Image|Category):[^\]]*\]\]/gi, '')
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .trim();
}

/* Rows are separated by "|-". The first cell is the chapter marker, which is
   either a bare number, a "3 - Royal Palace of Princess Donut" number+title
   (book 3), a named division (Prologue, Epilogue, Interlude: Chandra), or empty
   for a structural banner whose text lives in the second cell. */
export function parseChapters(text) {
  const rows = [];
  for (const block of clean(text).split(/^\|-\s*$/m)) {
    const cells = block.split(/^\|+/m).slice(1).map(c => c.trim()).filter(Boolean);
    if (!cells.length) continue;
    const [marker, ...rest] = cells;
    const summary = rest.join(' ').replace(/\s+/g, ' ').trim();

    const numbered = /^(\d+)\s*(?:[-–—]\s*(.+))?$/.exec(marker);
    if (numbered && summary) {
      rows.push({
        kind: 'chapter',
        chapter: Number(numbered[1]),
        title: numbered[2]?.trim() || null,
        summary,
      });
    } else if (summary) {
      // Either a named division, or a banner with an empty first cell.
      const label = /^\|*$/.test(marker) ? summary : marker;
      rows.push({ kind: 'division', label, summary: label === summary ? null : summary });
    }
  }
  return rows;
}

const chapters = [];
const summaries = [];

for (let book = 1; book <= BOOKS; book++) {
  /* Renumbered into the edition's chapters on the way in; the wiki's own number
     is kept on each summary row so a merged chapter still shows both halves. */
  const rows = parseChapters(await wikitext(`Book ${book} Chapter Summaries`))
    .map(r => r.kind === 'chapter' ? { ...r, wikiChapter: r.chapter, chapter: toEdition(book, r.chapter) } : r);
  const numbered = rows.filter(r => r.kind === 'chapter');
  const divisions = rows.filter(r => r.kind === 'division');
  if (!numbered.length) throw new Error(`book ${book}: parsed no chapters — the table format changed`);

  const nums = numbered.map(r => r.chapter);
  const count = editionCount(book, Math.max(...nums));
  const gaps = [];
  for (let c = 1; c <= count; c++) if (!nums.includes(c) && !unsummarised(book).includes(c)) gaps.push(c);

  chapters.push({
    book,
    count,
    gaps,
    divisions: divisions.map(d => d.label),
    titles: numbered.filter(r => r.title).map(r => ({ chapter: r.chapter, title: r.title })),
  });
  summaries.push({ book, rows });

  console.log(
    `book ${book}: ${count} chapters` +
    (gaps.length ? `  GAPS ${gaps.join(',')}` : '  no gaps') +
    `  · ${divisions.length} divisions` +
    (numbered.some(r => r.title) ? `  · titled` : ''),
  );
  await new Promise(r => setTimeout(r, 300));
}

mkdirSync(join(root, 'data/index'), { recursive: true });
writeFileSync(join(root, 'data/chapters.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), source:
    'https://dungeon-crawler-carl.fandom.com/wiki/Chapters',
    numbering: 'Ace/Penguin edition — see scripts/lib/edition.mjs', books: chapters }, null, 2) + '\n');
writeFileSync(join(root, 'data/index/summaries.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), books: summaries }, null, 2) + '\n');

const total = chapters.reduce((a, b) => a + b.count, 0);
console.log(`\nWrote data/chapters.json — ${total} chapters across ${BOOKS} books`);
console.log('Wrote data/index/summaries.json (gitignored, curation aid only)');
