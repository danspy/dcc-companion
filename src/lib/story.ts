/* The story so far, composed from what the reader has reached: one paragraph
   per finished book (the entity's recap steps), then the current book as one
   line per beat up to a cut. This is the only place that composition lives;
   cc_gate.lua in the KOReader plugin is a pure copy, held to the same cases. */
import { CHAPTER_STRIDE, END_OF_BOOK, FRONTIER_NONE } from './progress.ts';

export interface RecapStep { sortKey: number; text: string; confidence: string }
export interface StoryBeat {
  sortKey: number; book: number; chapter: number | null; headline: string; gist: string | null; gistDraft?: boolean;
}
export interface StoryLine { chapter: number | null; text: string; draft: boolean }
export interface StorySoFar {
  books: { book: number; text: string; draft: boolean }[];
  current: { book: number; lines: StoryLine[]; earlier: number; thisChapter: number } | null;
  sealed: { count: number; nextKey: number } | null;
}

/** How many lines of the current book are shown before the rest fold into a count. */
export const STORY_LINES = 8;

/* `cut` is the gate the current book's lines are listed to. On the site it is
   the frontier itself, because a position means "read up to and including". The
   KOReader plugin passes the previous chapter, because its position means
   "reading this chapter" and the reader asked for the one before; the beats in
   (cut, frontier] are counted as `thisChapter` and never shown. */
export function storySoFar(
  recap: RecapStep[], beats: StoryBeat[], frontier: number,
  { cut = frontier, max = STORY_LINES }: { cut?: number; max?: number } = {},
): StorySoFar {
  if (frontier <= FRONTIER_NONE) return { books: [], current: null, sealed: sealedOf(beats, frontier) };

  const books = recap.filter(r => r.sortKey <= frontier)
    .map(r => ({ book: Math.floor(r.sortKey / CHAPTER_STRIDE), text: r.text, draft: r.confidence !== 'verified' }));

  /* The current book: the frontier is inside it (not at its start, not past
     its end) and its own paragraph is not reached — a finished book is told by
     its paragraph, not its list. */
  const chapter = frontier % CHAPTER_STRIDE;
  const book = Math.floor(frontier / CHAPTER_STRIDE);
  let current: StorySoFar['current'] = null;
  if (chapter !== 0 && chapter !== END_OF_BOOK && !books.some(b => b.book === book)) {
    const inBook = beats.filter(b => b.book === book);
    const reached = inBook.filter(b => b.sortKey <= cut);
    const lines = reached.slice(Math.max(0, reached.length - max))
      .map(b => ({ chapter: b.chapter, text: b.gist ?? b.headline, draft: !!b.gistDraft }));
    current = {
      book, lines, earlier: reached.length - lines.length,
      thisChapter: inBook.filter(b => b.sortKey > cut && b.sortKey <= frontier).length,
    };
  }

  return { books, current, sealed: sealedOf(beats, frontier) };
}

function sealedOf(beats: StoryBeat[], frontier: number) {
  const hidden = beats.filter(b => b.sortKey > frontier);
  return hidden.length ? { count: hidden.length, nextKey: Math.min(...hidden.map(b => b.sortKey)) } : null;
}
