import type { APIRoute } from 'astro';
import { entryArt } from '../../lib/voxel/art';

/* The start screen's picture: the way into the dungeon on the first night. It
   shows only what the back cover and the opening pages do, so it is the same for
   every reader and may be cached anywhere; the page's address carries its hash. */
export const GET: APIRoute = async () => {
  const art = await entryArt();
  return new Response(art.png as unknown as BodyInit, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
