/* What the app asks first: which content is current. See src/lib/app-feed.ts. */
import type { APIRoute } from 'astro';
import { appFeed, feedHeaders } from '../../lib/app-feed';

export const GET: APIRoute = () => {
  const { manifest } = appFeed();
  return new Response(JSON.stringify(manifest), { headers: feedHeaders(manifest.version) });
};
