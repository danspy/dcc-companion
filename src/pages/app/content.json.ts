/* The content itself, fetched only when the manifest names a version the app does
   not hold. See src/lib/app-feed.ts. */
import type { APIRoute } from 'astro';
import { appFeed, feedHeaders } from '../../lib/app-feed';

export const GET: APIRoute = () => {
  const { json, manifest } = appFeed();
  return new Response(json, { headers: feedHeaders(manifest.version) });
};
