import type { APIRoute } from 'astro';
import { getFloors, getForetold, readGate } from '../../lib/content';
import { floorArt, showsHero, FALLBACK_ACCENT } from '../../lib/voxel/art';

/* A floor picture's visible blocks, for the homepage to rebuild the picture
   from as it scrolls into view. The blocks of exactly the picture
   /art/floor-N.png answers this reader with, and gated the same way: 404
   before the picture's own point. */

export const GET: APIRoute = async ({ params, cookies }) => {
  const id = Number(params.id);
  const { gate } = await readGate(cookies);
  const [floors, foretold] = await Promise.all([getFloors(), getForetold()]);
  const floor = floors.find(f => f.id === id);
  const fore = foretold.find(f => f.id === id);
  const key = floor ? floor.artKey : fore?.artKey;
  const hero = showsHero(id, gate.frontier, floor ? floor.recapSortKey : fore?.heroKey);
  const art = await floorArt(id, floor?.accent ?? FALLBACK_ACCENT, hero);
  if (!art || key == null || gate.frontier < key) return new Response(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  return new Response(art.cubes as unknown as BodyInit, {
    headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'private, max-age=86400', Vary: 'Cookie' },
  });
};
