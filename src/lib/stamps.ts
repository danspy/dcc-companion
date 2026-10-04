/* How a reveal tag is printed. The front page, the entity page and the app export
   all stamp the same things, so the two renderings live here once; pure, with no
   imports, so a script can read it under --experimental-strip-types. */

/* "Book 3 · Ch 20–25", "Book 3 · Ch 31 to the end", "Book 5 · The end". */
export function span(from: string, at: string): string {
  const [fb, fc = ''] = from.split(':');
  const [ab, ac = ''] = at.split(':');
  const ch = (c: string, first: boolean) => (c === 'end' ? 'the end' : c || (first ? '1' : 'the end'));
  if (fb !== ab) return `Book ${fb} · Ch ${ch(fc, true)} to book ${ab} · Ch ${ch(ac, false)}`;
  if (fc === 'end' && ac === 'end') return `Book ${fb} · The end`;
  const a = ch(fc, true), b = ch(ac, false);
  return b === 'the end' ? `Book ${fb} · Ch ${a} to the end` : `Book ${fb} · Ch ${a}–${b}`;
}

/* Source tags read "1:5"; the stamp shows "Book 1 · Ch 5", or just the book for an
   end-of-book tag. */
export const stampOf = (tag: string): string => {
  const [book, chapter] = tag.split(':');
  return chapter && chapter !== 'end' ? `Book ${book} · Ch ${chapter}` : `Book ${book}`;
};
