/* A pure copy of the frontier arithmetic in src/lib/progress.ts, so the build
   scripts can lint reveal tags without importing through Astro. Kept tiny on
   purpose; scripts/test-gate.mjs drives both. */

export const CHAPTER_STRIDE = 1000;
export const END_OF_BOOK = 999;

export function parseAt(at) {
  if (typeof at === 'number') return at;
  const raw = String(at ?? '').trim();
  if (raw === '' || raw === 'always') return 0;
  const [bookPart, chapterPart = '0'] = raw.split(':');
  const book = Number(bookPart);
  if (!Number.isFinite(book)) throw new Error(`Unparseable reveal tag: ${JSON.stringify(at)}`);
  const chapter =
    chapterPart === 'end' ? END_OF_BOOK :
    chapterPart === 'start' ? 0 :
    Number(chapterPart);
  if (!Number.isFinite(chapter)) throw new Error(`Unparseable chapter: ${JSON.stringify(at)}`);
  return book * CHAPTER_STRIDE + chapter;
}

export const bookOf = value => Math.floor(value / CHAPTER_STRIDE);

export function describeAt(value) {
  const book = bookOf(value);
  const chapter = value % CHAPTER_STRIDE;
  if (chapter === END_OF_BOOK) return `you finish book ${book}`;
  if (chapter === 0) return `you reach book ${book}`;
  return `book ${book}, chapter ${chapter}`;
}
