/* ---------------------------------------------------------------------------
   The frontier.

   Every gate in this app is one integer comparison. A reading position is a
   book plus a chapter within it; a piece of content declares the earliest
   position at which it is safe to read. Both collapse to the same scalar:

       frontier = book * 1000 + chapter

   Curation writes that as a short string, so the JSON stays readable:

       "4"       anywhere in book 4        -> 4000
       "4:12"    book 4, chapter 12        -> 4012
       "4:end"   once book 4 is finished   -> 4999

   Starting everything at book granularity is cheap and complete; refining a
   hot entity to "4:12" later costs nothing, because a book-level tag is just
   chapter 0 and lands in the same comparison.
   --------------------------------------------------------------------------- */

export const BOOK_COUNT = 8;
export const CHAPTER_STRIDE = 1000;
export const END_OF_BOOK = 999;

/** Reveals nothing that isn't safe for a reader who has not opened book 1. */
export const FRONTIER_NONE = 0;
/** Spoilers off — every gate passes. */
export const FRONTIER_ALL = (BOOK_COUNT + 1) * CHAPTER_STRIDE;

/** Book 0 is the opening state: the reader has told us nothing. */
export const BOOK_UNSET = 0;

export interface Position {
  /** 0 = not set. 1..BOOK_COUNT = how far they have read. */
  book: number;
  /** 0 means "no chapter given" — see frontierOf. */
  chapter: number;
}

/**
 * Nothing from any book. A first-time visitor gets the premise — which is back
 * cover material and lives in the page, not the gate — and every single gated
 * fact stays sealed until they say where they are. Defaulting to "finished book
 * one" would spoil book one for someone who has not read it.
 */
export const DEFAULT_POSITION: Position = { book: BOOK_UNSET, chapter: 0 };

/**
 * An unspecified chapter means the reader has *finished* this book, not that
 * they are on page one of it. "I'm on book 5" in normal speech means five books
 * read, and the opening default — book 1, no chapter — has to unseal all of
 * book 1 and nothing beyond it. Naming a chapter is how you say "actually, I'm
 * only partway", and it is also what makes `X:end` tags resolve correctly: the
 * last chapter of a book and "finished it" are the same position.
 */
export function frontierOf(pos: Position, chapters?: number | null): number {
  if (!pos.book) return FRONTIER_NONE;
  const asked = Math.max(0, pos.chapter | 0);
  const chapter =
    asked === 0 ? END_OF_BOOK
    : chapters && asked >= chapters ? END_OF_BOOK
    : asked;
  return clampBook(pos.book) * CHAPTER_STRIDE + chapter;
}

/** Parses a curation tag ("4", "4:12", "4:end") into a frontier value. */
export function parseAt(at: string | number): number {
  if (typeof at === 'number') return at;
  const raw = String(at).trim();
  if (raw === '' || raw === 'always') return FRONTIER_NONE;

  const [bookPart, chapterPart = '0'] = raw.split(':');
  const book = Number(bookPart);
  if (!Number.isFinite(book)) {
    throw new Error(`Unparseable reveal tag: ${JSON.stringify(at)}`);
  }
  const chapter =
    chapterPart === 'end' ? END_OF_BOOK
    : chapterPart === 'start' ? 0
    : Number(chapterPart);
  if (!Number.isFinite(chapter)) {
    throw new Error(`Unparseable chapter in reveal tag: ${JSON.stringify(at)}`);
  }
  return book * CHAPTER_STRIDE + chapter;
}

/** Renders a frontier value back as prose, for the "come back when…" copy. */
export function describeAt(value: number): string {
  const book = Math.floor(value / CHAPTER_STRIDE);
  const chapter = value % CHAPTER_STRIDE;
  if (chapter === END_OF_BOOK) return `you finish book ${book}`;
  if (chapter === 0) return `you reach book ${book}`;
  return `you reach book ${book}, chapter ${chapter}`;
}

/** Clamps to a real book, or to BOOK_UNSET when nothing valid was given. */
export const clampBook = (n: number) => {
  const b = Math.round(Number(n) || 0);
  return b >= 1 ? Math.min(BOOK_COUNT, b) : BOOK_UNSET;
};

/** Percentage through a book -> chapter, for readers who track by audiobook. */
export function chapterFromPercent(percent: number, chapters: number | null): number {
  if (!chapters || chapters <= 0) return 0;
  const pct = Math.min(100, Math.max(0, percent));
  return Math.max(1, Math.round((pct / 100) * chapters));
}

export function percentFromChapter(chapter: number, chapters: number | null): number {
  if (!chapters || chapters <= 0 || chapter <= 0) return 0;
  return Math.min(100, Math.round((chapter / chapters) * 100));
}
