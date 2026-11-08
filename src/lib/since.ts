/* "Since you were last here."

   When a reader moves their position on, the picker remembers where they moved
   from (the `dcc_since` cookie, written in GateBar's `write()`). Everything that
   unsealed between that point and the new one is what they have just read, and
   coming back after a break it is the fastest way into the story again: the
   stretches of the crawl that opened and every entry that changed, grouped by
   who or what. Only a move forward has anything to show, and the upper bound is
   the reader's own frontier, so nothing here can be past them. */
import type { AstroCookies } from 'astro';
import { frontierOf } from './progress.ts';
import type { Gate } from './spoiler.ts';

export interface Since { key: number; book: number; chapter: number }

export function readSince(cookies: AstroCookies, gate: Gate, chapterCount: (book: number) => number | null): Since | null {
  if (!gate.spoilers || gate.fresh) return null;
  let v: { book?: unknown; chapter?: unknown };
  try { v = JSON.parse(cookies.get('dcc_since')?.value ?? 'null') ?? {}; } catch { return null; }
  const book = Number(v.book) | 0, chapter = Number(v.chapter) | 0;
  if (book < 1) return null;
  const key = frontierOf({ book, chapter }, chapterCount(book));
  return key < gate.frontier ? { key, book, chapter } : null;
}

/** "book 4, chapter 9" / "the end of book 3" */
export const sinceLabel = (s: Since) => (s.chapter ? `book ${s.book}, chapter ${s.chapter}` : `the end of book ${s.book}`);
