/* Names in the text are links.

   A reader looking someone up wants the next name in the same sentence to be one
   tap away, not another trip through search. So every entity and floor named in
   a beat, a tagline, a description or a recap part links to its page, the first
   time it appears in that text.

   It cannot leak, and that is not this module's doing: the lint already fails
   any text that names something revealed after the text's own point, so every
   name a reader can see in a text is one they have reached. Each name here is
   still matched only from its own reveal point, as a second fence, and an alias
   from its own `at`.

   The matching rules are the lint's and leak.ts's, for the same reasons: a name
   of more than one word matches in any case ("the Great Race"), a one-word name
   only as written (the crawler Tally is not every "tally"), a lower-case alias
   never (it is a common noun phrase, "the show"), nothing under four letters,
   and the longest name first, so "Lucia Mar" is one link and not "Lucia" plus
   text. Words are found once and looked up by their first word, which keeps a
   page of a hundred beats against a thousand names cheap. */
import { aliasesOf } from './aliases.ts';
import { parseAt } from './progress.ts';

export interface Seg { t: string; href?: string }
interface Name { text: string; low: string; oneWord: boolean; key: number; href: string; id: string }

const WORD = /[\p{L}\p{N}]+/gu;
const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);
const firstWord = (s: string) => (s.match(/[\p{L}\p{N}]+/u)?.[0] ?? '').toLowerCase();

/* The names, by their first word, longest first. Pure, so the iOS export and its
   fixtures build the very same index from the snapshot. */
export type LinkIndex = Map<string, Name[]>;
export function buildLinkIndex(
  entities: { id: string; name: string; revealedAt: string; aka?: unknown }[],
  floors: { id: number; name: string; revealedAt: string; nameAt?: string | null }[],
): LinkIndex {
  const names: Name[] = [];
  const add = (text: string, at: string | null | undefined, href: string, id: string, isAlias: boolean) => {
    if (!text || text.length < 4 || !at) return;
    if (isAlias && text[0] === text[0].toLowerCase()) return;           // a lower-case alias is a noun phrase
    let key: number; try { key = parseAt(at); } catch { return; }
    names.push({ text, low: text.toLowerCase(), oneWord: !/\s/.test(text), key, href, id });
  };
  for (const e of entities) {
    const href = `/entity/${e.id}`;
    add(e.name, e.revealedAt, href, e.id, false);
    for (const a of aliasesOf(e as Parameters<typeof aliasesOf>[0])) add(a.name, a.at, href, e.id, true);
  }
  for (const f of floors) add(f.name, f.nameAt ?? f.revealedAt, `/floor/${f.id}`, `floor-${f.id}`, false);
  const byFirst: LinkIndex = new Map();
  for (const n of names) { const k = firstWord(n.text); if (!k) continue; (byFirst.get(k) ?? byFirst.set(k, []).get(k)!).push(n); }
  for (const list of byFirst.values()) list.sort((a, b) => b.text.length - a.text.length);
  return byFirst;
}

let built: Promise<LinkIndex> | null = null;
function index(): Promise<LinkIndex> {
  built ??= (async () => {
    const { getEntities, getFloors } = await import('./content');
    const [entities, floors] = await Promise.all([getEntities(), getFloors()]);
    return buildLinkIndex(entities as never, floors as never);
  })();
  return built;
}

/**
 * Split a text into plain runs and links. `at` is the text's own point (a beat's
 * sortKey, a tagline step's tag); `self` is the entity whose page this is, never
 * linked to itself.
 */
export async function linkify(text: string, at: number | string, self?: string): Promise<Seg[]> {
  if (!text) return [];
  return linkifyWith(await index(), text, at, self);
}

/** `linkify` over an index already built: pure. */
export function linkifyWith(byFirst: LinkIndex, text: string, at: number | string, self?: string): Seg[] {
  if (!text) return [];
  const point = typeof at === 'number' ? at : parseAt(at);
  const out: Seg[] = [];
  const seen = new Set<string>(self ? [self] : []);
  let last = 0;
  for (const m of text.matchAll(WORD)) {
    const i = m.index!;
    if (i < last || isWordChar(text[i - 1])) continue;
    const cands = byFirst.get(m[0].toLowerCase());
    if (!cands) continue;
    const hit = cands.find(n => {
      if (n.key > point) return false;
      const s = text.slice(i, i + n.text.length);
      if (isWordChar(text[i + n.text.length])) return false;
      return n.oneWord ? s === n.text : s.toLowerCase() === n.low;
    });
    if (!hit) continue;
    // a name already linked in this text is left as text, but still owns its span,
    // so the "Carl" inside a second "Carl's Doomsday Scenario" does not link either
    if (seen.has(hit.id)) { if (i > last) out.push({ t: text.slice(last, i) }); out.push({ t: text.slice(i, i + hit.text.length) }); last = i + hit.text.length; continue; }
    if (i > last) out.push({ t: text.slice(last, i) });
    out.push({ t: text.slice(i, i + hit.text.length), href: hit.href });
    seen.add(hit.id);
    last = i + hit.text.length;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}
