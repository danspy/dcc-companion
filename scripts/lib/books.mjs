import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* books.json plus the chapter counts from chapters.json and the colours from
   book-colors.json — the merge build-content.mjs always did, lifted out so the
   drafting scripts lint against the same books the build does.

   Chapter counts come from data/chapters.json (npm run chapters:refresh), not
   from books.json — one source, refreshed on its own schedule. A book with no
   entry keeps a null count, which switches the chapter dial off for it. Each
   book's colour is the one published on mattdinniman.com (npm run
   colors:refresh), with the ink that is readable on it. */
export function loadBooks(root) {
  const read = p => JSON.parse(readFileSync(join(root, p), 'utf8'));
  const { books, floors } = read('data/books.json');
  const chapterIndex = new Map(read('data/chapters.json').books.map(b => [b.book, b]));
  for (const b of books) {
    const entry = chapterIndex.get(b.id);
    b.chapters = entry ? entry.count : null;
    b.divisions = entry ? entry.divisions : [];
    b.chapterTitles = entry ? entry.titles : [];
  }
  const colorIndex = new Map(read('data/book-colors.json').books.map(c => [c.book, c]));
  for (const b of books) {
    const c = colorIndex.get(b.id);
    if (!c) throw new Error(`book ${b.id} has no colour in data/book-colors.json`);
    b.accent = c.accent;
    b.ink = c.ink;
  }
  return { books, floors, colorIndex };
}
