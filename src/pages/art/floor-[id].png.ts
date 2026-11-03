import type { APIRoute } from 'astro';
import { getFloors, getForetold, readGate } from '../../lib/content';
import { floorArt, showsHero, FALLBACK_ACCENT } from '../../lib/voxel/art';

/* A floor's tile picture, as a PNG, for a reader who has reached it.

   The picture is gated like anything else: it opens at the floor's `artKey`,
   the point by which everything it shows has been read. A reader short of that
   gets a 404 rather than the image, so a sealed tile cannot be opened by
   typing its address. The address carries the picture's own hash (`?v=`), so a
   redrawn picture is a new address and the browser may keep this one a day. */

export const GET: APIRoute = async ({ params, cookies }) => {
  const id = Number(params.id);
  const { gate } = await readGate(cookies);
  const [floors, foretold] = await Promise.all([getFloors(), getForetold()]);
  const floor = floors.find(f => f.id === id);
  const fore = foretold.find(f => f.id === id);
  const key = floor ? floor.artKey : fore?.artKey;
  /* Past the floor's end the tile becomes its hero picture: the same address,
     answered for the reader's own position. */
  const hero = showsHero(id, gate.frontier, floor ? floor.recapSortKey : fore?.heroKey);
  const art = await floorArt(id, floor?.accent ?? FALLBACK_ACCENT, hero);
  if (!art || key == null || gate.frontier < key) return new Response(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  return new Response(art.png as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      // private: whether it may be seen depends on the reader's own position
      'Cache-Control': 'private, max-age=86400',
      Vary: 'Cookie',
    },
  });
};
