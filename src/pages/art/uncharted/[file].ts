import type { APIRoute } from 'astro';
import { unchartedArt } from '../../../lib/voxel/art';

/* The uncharted island for floor N, as a picture (`N-known.png`,
   `N-sealed.png`) or as its visible blocks (`.bin`, for the homepage's
   collapse). It shows nothing of the floor, so it is the same for every
   reader and may be cached anywhere; the page's address carries its hash. */

export const GET: APIRoute = async ({ params }) => {
  const m = /^(\d{1,2})-(known|sealed)\.(png|bin)$/.exec(params.file ?? '');
  const id = m ? Number(m[1]) : 0;
  if (!m || id < 1 || id > 18) return new Response(null, { status: 404 });
  const art = await unchartedArt(id, m[2] === 'known'), png = m[3] === 'png';
  return new Response((png ? art.png : art.cubes) as unknown as BodyInit, {
    headers: { 'Content-Type': png ? 'image/png' : 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
