/* The quick-find endpoint. Reads the reader's position from their own cookie
   and answers with the few matches they may see; see src/lib/quickfind.ts for
   why the index never leaves the server. */
import type { APIRoute } from 'astro';
import { readGate, getEntities, getFloors, getAllBeats } from '../lib/content';
import { quickFind } from '../lib/quickfind';

/* The content is re-seeded on every deploy and never changes while a process
   runs, so it is read once. Every request still gates it for its own reader. */
let corpus: Promise<[any[], any[], any[]]> | null = null;
const load = () => (corpus ??= Promise.all([getEntities(), getFloors(), getAllBeats()]));

export const GET: APIRoute = async ({ url, cookies }) => {
  const q = (url.searchParams.get('q') ?? '').slice(0, 80);
  const { gate } = await readGate(cookies);
  const [entities, floors, beats] = await load();
  const hits = quickFind(q, entities, floors, gate, 12, beats)
    .map(({ href, name, kind, detail, tier }) => ({ href, name, kind, detail, tier }));
  return new Response(JSON.stringify(hits), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Per reader, by cookie: never let a shared cache answer for someone else.
      'cache-control': 'private, no-store',
      vary: 'Cookie',
    },
  });
};
