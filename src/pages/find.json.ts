/* The quick-find endpoint. Reads the reader's position from their own cookie
   and answers with the few matches they may see; see src/lib/quickfind.ts for
   why the index never leaves the server. */
import type { APIRoute } from 'astro';
import { readGate, getEntities, getFloors } from '../lib/content';
import { quickFind } from '../lib/quickfind';

export const GET: APIRoute = async ({ url, cookies }) => {
  const q = (url.searchParams.get('q') ?? '').slice(0, 80);
  const { gate } = await readGate(cookies);
  const [entities, floors] = await Promise.all([getEntities(), getFloors()]);
  const hits = quickFind(q, entities as any, floors as any, gate)
    .map(({ href, name, kind, detail }) => ({ href, name, kind, detail }));
  return new Response(JSON.stringify(hits), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Per reader, by cookie: never let a shared cache answer for someone else.
      'cache-control': 'private, no-store',
      vary: 'Cookie',
    },
  });
};
