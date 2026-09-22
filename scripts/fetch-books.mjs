#!/usr/bin/env node
/* Pulls the eight books from the owner's own Calibre library over OPDS and
   splits each into plain text, one file per section, in reading order.

     data/index/books/book<N>.epub          the edition itself
     data/index/books/text/b<N>/<NNN>-<slug>.txt
     data/index/books/index.json            every section, with its position

   All of it is under data/index/, which is gitignored. The books are a
   curation source — what `content:anchors` and a fact-checking pass read — and
   nothing here is this site's content. Never commit it, never ship it, and
   quote from it only as short as the item-description rule allows.

   Credentials come from .env (also gitignored):
     BOOKS_OPDS=http://host:port/opds        BOOKS_USER=…   BOOKS_PASS=…
   With --no-fetch, the epubs already on disk are re-split and nothing is
   downloaded.

   **Position** is the chapter a reader has reached once they have read the
   section, which is what a reveal tag means. A numbered chapter is its own
   number. Anything between two chapters — an interlude, a named POV section,
   a heat — is the *next* chapter's, because a reader "at chapter 12" may not
   have turned the page past it. A prologue is chapter 1, the epilogue is
   `end`, and everything after the epilogue is back matter (the author's notes,
   links, the newsletter) and is kept out of the index. */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join, posix } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'data/index/books');

/* Book number -> title as the library files it. The library ids are looked up
   by title, so a re-import there does not break this. */
const TITLES = {
  1: 'Dungeon Crawler Carl',
  2: "Carl's Doomsday Scenario",
  3: "The Dungeon Anarchist's Cookbook",
  4: 'The Gate of the Feral Gods',
  5: "The Butcher's Masquerade",
  6: 'The Eye of the Bedlam Bride',
  7: 'This Inevitable Ruin',
  8: 'A Parade of Horribles',
};

function env() {
  const e = { ...process.env };
  const p = join(root, '.env');
  if (existsSync(p)) for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !(m[1] in e)) e[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return e;
}

async function download() {
  const { BOOKS_OPDS, BOOKS_USER, BOOKS_PASS } = env();
  if (!BOOKS_OPDS) throw new Error('BOOKS_OPDS is not set in .env — or pass --no-fetch');
  const base = new URL(BOOKS_OPDS);
  const auth = 'Basic ' + Buffer.from(`${BOOKS_USER}:${BOOKS_PASS}`).toString('base64');
  const get = async path => {
    const res = await fetch(new URL(path, base), { headers: { Authorization: auth } });
    if (!res.ok) throw new Error(`${res.status} fetching ${path}`);
    return res;
  };
  const feed = await (await get(`${base.pathname.replace(/\/$/, '')}/search/Dinniman`)).text();
  const entries = [...feed.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => ({
    title: /<title>([\s\S]*?)<\/title>/.exec(m[1])?.[1].replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').trim(),
    href: /href="([^"]+\/epub\/?)"/.exec(m[1])?.[1],
  }));
  mkdirSync(dir, { recursive: true });
  for (const [n, title] of Object.entries(TITLES)) {
    const hit = entries.find(e => e.title === title && e.href);
    if (!hit) throw new Error(`book ${n}: "${title}" is not in the library`);
    const buf = Buffer.from(await (await get(hit.href)).arrayBuffer());
    writeFileSync(join(dir, `book${n}.epub`), buf);
    console.log(`book ${n}: ${(buf.length / 1024 / 1024).toFixed(1)} MB`);
  }
}

/* Just enough of a zip reader for an epub: the central directory, then stored
   or deflated entries. */
function unzip(buf) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extra = buf.readUInt16LE(p + 30), comment = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    files.set(name, () => (method === 8 ? inflateRawSync(raw) : raw).toString('utf8'));
    p += 46 + nameLen + extra + comment;
  }
  return files;
}

const decode = s => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

const toText = h => decode(h
  .replace(/<head[\s\S]*?<\/head>/i, '')
  .replace(/<\/(p|div|h\d|li|tr)>|<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ''))
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();

const FRONT = /(^(cover|title page|copyright|dedication|contents|epigraph|map of\b|definition)|title page$)/i;

function split(n) {
  const zip = unzip(readFileSync(join(dir, `book${n}.epub`)));
  const read = name => zip.get(name)?.() ?? '';
  const opfPath = /full-path="([^"]+)"/.exec(read('META-INF/container.xml'))[1];
  const opf = read(opfPath), base = posix.dirname(opfPath);
  const manifest = new Map([...opf.matchAll(/<item\b[^>]*>/g)].map(([tag]) => [
    /\bid="([^"]+)"/.exec(tag)[1], posix.join(base, /\bhref="([^"]+)"/.exec(tag)[1])]));
  const spine = [...opf.matchAll(/<itemref\b[^>]*idref="([^"]+)"/g)].map(m => manifest.get(m[1]));
  const ncxPath = [...zip.keys()].find(k => k.endsWith('.ncx'));
  const nav = [...read(ncxPath).matchAll(/<text>([\s\S]*?)<\/text>\s*<\/navLabel>\s*<content src="([^"]+)"/g)]
    .map(m => {
      const [file, anchor] = m[2].split('#');
      return { label: decode(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim(),
               file: posix.join(posix.dirname(ncxPath), decodeURIComponent(file)), anchor };
    })
    .filter(p => spine.includes(p.file));

  /* A section runs from its nav point to the next one, across spine files; two
     nav points in one file split at the second one's anchor. */
  const html = spine.map(read);
  const offset = p => {
    const h = html[spine.indexOf(p.file)];
    if (!p.anchor) return 0;
    const i = h.search(new RegExp(`id="${p.anchor}"`));
    return i < 0 ? 0 : h.lastIndexOf('<', i);
  };
  const at = nav.map(p => ({ ...p, si: spine.indexOf(p.file), off: offset(p) }));

  const out = join(dir, 'text', `b${n}`);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const sections = [];
  let chapter = 0, seq = 0, ended = false;
  for (let k = 0; k < at.length && !ended; k++) {
    const a = at[k], b = at[k + 1] ?? { si: spine.length - 1, off: Infinity };
    let h = '';
    for (let s = a.si; s <= b.si; s++) {
      const from = s === a.si ? a.off : 0, to = s === b.si ? b.off : Infinity;
      if (s === b.si && b.off === 0 && s !== a.si) break;
      h += html[s].slice(from, to === Infinity ? undefined : to);
    }
    const label = a.label;
    const num = /^Chapter (\d+)$/i.exec(label)?.[1];
    let position;
    if (num) position = chapter = +num;
    else if (/^epilogue$/i.test(label)) { position = 'end'; ended = true; }
    else if (FRONT.test(label) || label === TITLES[n] || /^(.+): Dungeon Crawler Carl Book \d$/.test(label)) continue;
    else position = chapter === 0 ? 1 : chapter + 1;

    const text = toText(h);
    if (!text) continue;
    const file = `${String(++seq).padStart(3, '0')}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}.txt`;
    writeFileSync(join(out, file), text + '\n');
    sections.push({ label, position, file, words: text.split(/\s+/).length });
  }
  const chapters = sections.filter(s => /^Chapter \d+$/i.test(s.label)).length;
  return { book: n, chapters, words: sections.reduce((a, s) => a + s.words, 0), sections };
}

if (!process.argv.includes('--no-fetch')) await download();
const books = Object.keys(TITLES).map(n => split(+n));
writeFileSync(join(dir, 'index.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  numbering: 'Ace/Penguin edition — see scripts/lib/edition.mjs',
  books,
}, null, 1) + '\n');

const spine = JSON.parse(readFileSync(join(root, 'data/chapters.json'), 'utf8')).books;
for (const b of books) {
  const want = spine.find(s => s.book === b.book)?.count;
  const extra = b.sections.filter(s => !/^Chapter \d+$/i.test(s.label)).map(s => `${s.label}@${s.position}`);
  console.log(`book ${b.book}: ${b.chapters} chapters${b.chapters === want ? '' : `  ≠ spine ${want}`}` +
    ` · ${b.words.toLocaleString()} words · also ${extra.join(', ')}`);
}
