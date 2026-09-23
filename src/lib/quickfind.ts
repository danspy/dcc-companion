/* Quick-find: type a few letters anywhere on the site, land on the page.

   The index is built on the server for one reader, from what that reader has
   already reached, every time it is asked — never shipped to the browser as a
   list. That is the same argument `/who` makes for filtering rendered rows: a
   second copy of the gated set in the document would be a second place to get
   the gate wrong. Here there is no copy at all; the browser only ever sees the
   handful of matches for what was typed, and a sealed name can never be one.

   Pure on purpose — no `astro:db` — so scripts/test-gate.mjs can import it. */
import { reveals, type Gate } from './spoiler.ts';
import { aliasesSeen } from './aliases.ts';
import { KIND_LABELS } from './kinds.ts';

export interface FindEntity {
  id: string; kind: string; name: string; aka?: unknown; role?: string | null; revealedAt: string;
  /** Resolved progressive taglines, as the snapshot stores them. */
  taglines?: unknown;
}
/** A beat as the snapshot stores it: `sortKey` is its resolved gate. */
export interface FindBeat { id: number; entityId: string; headline: string; text: string; sortKey: number; book: number; chapter?: number | null }
export interface FindFloor { id: number; name: string; revealedAt: string; nameAt?: string | null }

/** `tier` says why it matched: by what it is called, or because its story says so. */
export interface Hit { href: string; name: string; kind: string; detail: string; score: number; tier: 'name' | 'story' }

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9']+/).filter(Boolean);

/* How well does `name` answer `q`? Higher is better, 0 is no match. Word starts
   only, like every other filter here: without a boundary "ran" finds Tran. */
function score(name: string, q: string): number {
  const n = name.toLowerCase();
  if (n === q) return 100;
  if (n.startsWith(q)) return 80;
  const ws = words(name);
  if (ws.some(w => w.startsWith(q))) return 60;
  // Several words typed: every one has to start some word of the name.
  const qs = words(q);
  if (qs.length > 1 && qs.every(p => ws.some(w => w.startsWith(p)))) return 50;
  return 0;
}

/* Every typed word has to start some word of the text; the regexes are built
   once per query. */
const termsOf = (q: string) => words(q).map(w => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'));
const matchesAll = (text: string, terms: RegExp[]) => terms.length > 0 && terms.every(t => t.test(text));

/* A short window around the first term, so a hit found in the story shows why. */
function snippet(text: string, terms: RegExp[]): string {
  const m = terms[0].exec(text);
  const i = m ? m.index : 0;
  const from = Math.max(0, text.lastIndexOf(' ', Math.max(0, i - 50)));
  const to = Math.min(text.length, (text.indexOf(' ', i + 70) + 1 || text.length));
  return `${from > 0 ? '…' : ''}${text.slice(from, to).trim()}${to < text.length ? '…' : ''}`;
}

const taglineAt = (e: FindEntity, frontier: number) => {
  const rows = (Array.isArray(e.taglines) ? e.taglines : []) as { sortKey: number; text: string }[];
  let out = '';
  for (const t of rows) if (frontier >= t.sortKey) out = t.text;
  return out;
};

export function quickFind(
  q: string, entities: FindEntity[], floors: FindFloor[], gate: Gate, limit = 12,
  beats: FindBeat[] = [],
): Hit[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const hits: Hit[] = [];
  const terms = termsOf(query);
  const byEntity = new Map<string, FindEntity>();

  for (const e of entities) {
    if (!reveals(gate, e.revealedAt)) continue;
    byEntity.set(e.id, e);
    const own = score(e.name, query);
    let best = own;
    let via = '';
    for (const a of aliasesSeen(e, gate)) {
      const s = score(a, query) - 5;           // a name beats its nickname on a tie
      if (s > best) best = s;
      // Say "also X" only when the name itself did not answer: "Princess Donut,
      // also Donut" repeats what the row already shows.
      if (!own && s > 0 && !via) via = a;
    }
    if (!best && e.role) { const s = score(e.role, query) - 30; if (s > 0) best = s; }
    // The tagline the reader has reached, which is what the entry says about itself.
    let detail = via ? `also “${via}”` : (e.role ?? '');
    let tier: Hit['tier'] = 'name';
    if (!best) {
      const tag = taglineAt(e, gate.frontier);
      if (tag && matchesAll(tag, terms)) { best = 25; detail = snippet(tag, terms); tier = 'story'; }
    }
    if (!best) continue;
    const label = KIND_LABELS[e.kind] ?? e.kind;
    hits.push({
      href: `/entity/${e.id}`, name: e.name, kind: label.replace(/s( &.*)?$/, ''),
      detail, score: best, tier,
    });
  }

  /* Then the story itself: an entry whose reached beats say what was typed —
     "bride" finds the spider-demigod and Carl's eye long before either name.
     Only beats at or behind the frontier; one hit per entry, ranked below any
     name match, stronger when a headline says it or when it says it often. */
  if (beats.length && query.length >= 3) {
    const seen = new Set(hits.map(h => h.href));
    const found = new Map<string, { n: number; head: boolean; beat: FindBeat }>();
    for (const b of beats) {
      if (gate.frontier < b.sortKey) continue;
      const e = byEntity.get(b.entityId);
      if (!e || seen.has(`/entity/${e.id}`)) continue;
      const inHead = matchesAll(b.headline, terms);
      if (!inHead && !matchesAll(b.text, terms)) continue;
      const f = found.get(e.id);
      if (!f) found.set(e.id, { n: 1, head: inHead, beat: b });
      else { f.n++; if (inHead && !f.head) { f.head = true; f.beat = b; } }
    }
    for (const [id, f] of found) {
      const e = byEntity.get(id)!;
      const label = KIND_LABELS[e.kind] ?? e.kind;
      const where = `Book ${f.beat.book}${f.beat.chapter ? ` · Ch ${f.beat.chapter}` : ''}`;
      hits.push({
        // Straight to the line that matched, not the top of a long page.
        href: `/entity/${e.id}#b${f.beat.id}`, name: e.name, kind: label.replace(/s( &.*)?$/, ''),
        detail: `${where} — ${snippet(f.head ? f.beat.headline : f.beat.text, terms)}`,
        score: Math.min(20, (f.head ? 12 : 6) + f.n), tier: 'story',
      });
    }
  }

  for (const f of floors) {
    if (!reveals(gate, f.nameAt ?? f.revealedAt)) continue;
    const s = Math.max(score(f.name, query), score(`floor ${f.id}`, query));
    if (s) hits.push({ href: `/#floor-${f.id}`, name: f.name, kind: 'Floor', detail: `Floor ${f.id}`, score: s, tier: 'name' });
  }

  return hits.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, limit);
}
