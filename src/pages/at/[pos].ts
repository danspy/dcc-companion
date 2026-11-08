/* A position as an address: /at/4:12 (book 4, chapter 12), /at/4 or /at/4:end
   (book 4 finished). It sets the reader's position and opens their floor, so an
   e-reader, a bookmark or a note can jump straight to "where I am". The move is
   remembered as the picker's is, so "what's new since" works from here too.
   Nothing is shown here; the homepage that follows is gated as always. */
import type { APIRoute } from 'astro';
import { getBooks } from '../../lib/content';
import { readPrefs } from '../../lib/prefs';
import { BOOK_COUNT } from '../../lib/progress';

const YEAR = 60 * 60 * 24 * 365;
const set = (cookies: Parameters<APIRoute>[0]['cookies'], name: string, value: object) =>
  // the browser's script writes these as encodeURIComponent(JSON) and reads them back the same way
  cookies.set(name, encodeURIComponent(JSON.stringify(value)), { path: '/', maxAge: YEAR, sameSite: 'lax', httpOnly: false, encode: v => v });

export const GET: APIRoute = async ({ params, cookies, redirect }) => {
  const m = /^(\d+)(?::(\d+|end))?$/.exec(decodeURIComponent(params.pos ?? ''));
  const book = m ? Number(m[1]) : 0;
  if (!m || book < 1 || book > BOOK_COUNT) return redirect('/', 302);
  const count = (await getBooks()).find(b => b.id === book)?.chapters ?? 0;
  const chapter = !m[2] || m[2] === 'end' ? 0 : Math.min(Math.max(1, Number(m[2])), count || Number(m[2]));
  const prev = readPrefs(cookies);
  if (prev.spoilers && prev.book && (prev.book !== book || prev.chapter !== chapter)) {
    // the same session rule as the picker's: moves under eight hours apart keep their starting point
    let old: { book?: number; chapter?: number; t?: number } | null = null;
    try { old = JSON.parse(decodeURIComponent(cookies.get('dcc_since')?.value ?? 'null')); } catch { /* none */ }
    const keep = old && Date.now() - (Number(old.t) || 0) < 8 * 3600e3;
    set(cookies, 'dcc_since', keep ? { book: old!.book, chapter: old!.chapter, t: Date.now() } : { book: prev.book, chapter: prev.chapter, t: Date.now() });
  }
  set(cookies, 'dcc_pos', { book, chapter, spoilers: true });
  return redirect('/', 302);
};
