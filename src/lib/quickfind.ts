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
}
export interface FindFloor { id: number; name: string; revealedAt: string; nameAt?: string | null }

export interface Hit { href: string; name: string; kind: string; detail: string; score: number }

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

export function quickFind(
  q: string, entities: FindEntity[], floors: FindFloor[], gate: Gate, limit = 12,
): Hit[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const hits: Hit[] = [];

  for (const e of entities) {
    if (!reveals(gate, e.revealedAt)) continue;
    let best = score(e.name, query);
    let via = '';
    for (const a of aliasesSeen(e, gate)) {
      const s = score(a, query) - 5;           // a name beats its nickname on a tie
      if (s > best) { best = s; via = a; }
    }
    if (!best && e.role) { const s = score(e.role, query) - 30; if (s > 0) best = s; }
    if (!best) continue;
    const label = KIND_LABELS[e.kind] ?? e.kind;
    hits.push({
      href: `/entity/${e.id}`, name: e.name, kind: label.replace(/s( &.*)?$/, ''),
      detail: via ? `also “${via}”` : (e.role ?? ''), score: best,
    });
  }

  for (const f of floors) {
    if (!reveals(gate, f.nameAt ?? f.revealedAt)) continue;
    const s = Math.max(score(f.name, query), score(`floor ${f.id}`, query));
    if (s) hits.push({ href: `/#floor-${f.id}`, name: f.name, kind: 'Floor', detail: `Floor ${f.id}`, score: s });
  }

  return hits.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, limit);
}
