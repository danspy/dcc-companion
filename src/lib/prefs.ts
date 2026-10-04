import type { AstroCookies } from 'astro';
import { DEFAULT_POSITION, clampBook, type Position } from './progress';

/* Reading position lives in one cookie today. When accounts land this module
   is the only place that changes: signed-in readers read from the user DB and
   guests keep the cookie, exactly as the other apps here do it. */

const COOKIE = 'dcc_pos';
const YEAR = 60 * 60 * 24 * 365;

export interface Prefs extends Position {
  spoilers: boolean;
  /** No position recorded — either no cookie, or the reader cleared it. */
  fresh: boolean;
}

export const DEFAULT_PREFS: Prefs = { ...DEFAULT_POSITION, spoilers: true, fresh: true };

/** The clamps a position goes through, whatever carried it here: a cookie or a request body. */
export function prefsFrom(v: any): Prefs {
  const book = clampBook(v?.book);
  return {
    book,
    chapter: Math.max(0, Number(v?.chapter) || 0),
    spoilers: v?.spoilers !== false,
    fresh: book === 0,
  };
}

export function readPrefs(cookies: AstroCookies): Prefs {
  const raw = cookies.get(COOKIE)?.value;
  if (!raw) return { ...DEFAULT_PREFS };
  try {
    return prefsFrom(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function writePrefs(cookies: AstroCookies, prefs: Prefs): void {
  const { book, chapter, spoilers } = prefs;
  cookies.set(COOKIE, encodeURIComponent(JSON.stringify({ book, chapter, spoilers })), {
    path: '/',
    maxAge: YEAR,
    sameSite: 'lax',
    httpOnly: false,
  });
}
