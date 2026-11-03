import type { APIRoute } from 'astro';
import { getEntity, readGate } from '../../../lib/content';
import { reveals } from '../../../lib/spoiler';
import { figureArt, unpicturedArt, type FigureStep } from '../../../lib/voxel/art';

/* A character's figure, look n (`<id>-<n>.png`, `-s` for the small one), for a reader who has met the
   character and reached that look's own point; anyone else gets a 404, so a
   sealed look cannot be opened by typing its address. The shadow figure
   (`unpictured.png`) shows nothing and is the same for everyone. Addresses
   carry the picture's hash, so a redrawn figure is a new address. */

const png = (body: Uint8Array, cache: string, vary = false) => new Response(body as unknown as BodyInit, {
  headers: { 'Content-Type': 'image/png', 'Cache-Control': cache, ...(vary ? { Vary: 'Cookie' } : {}) },
});
const missing = () => new Response(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });

export const GET: APIRoute = async ({ params, cookies }) => {
  const file = params.file ?? '';
  const sm = /^unpictured(-s)?\.png$/.exec(file);
  if (sm) return png((await unpicturedArt(!!sm[1])).png, 'public, max-age=31536000, immutable');
  const m = /^([a-z0-9-]+?)-(\d{1,2})(-s)?\.png$/.exec(file);
  if (!m) return missing();
  const entity = await getEntity(m[1]);
  if (!entity || entity.kind !== 'character') return missing();
  const { gate } = await readGate(cookies);
  const step = ((entity.figures ?? []) as FigureStep[])[Number(m[2])];
  if (!step || !reveals(gate, entity.revealedAt) || !reveals(gate, step.sortKey)) return missing();
  const art = figureArt(entity.id, step.look, !!m[3]);
  if (!art) return missing();
  // private: whether it may be seen depends on the reader's own position
  return png((await art).png, 'private, max-age=86400', true);
};
