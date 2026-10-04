/* The iOS app's update feed.

   The app ships with a copy of the content and asks here whether there is a newer
   one: a manifest of a few hundred bytes first, the content only when the hash in
   it differs. Both are the same export the app was bundled from, built once per
   process — the content only changes on a deploy.

   This hands out the whole dataset ungated, which is not a new exposure: "Show
   everything" already gives the same content to anyone as pages. The gate keeps a
   reader from spoilers; it was never access control. The routes are unlisted and
   marked noindex all the same. */
import raw from '../../data/content.snapshot.json?raw';
import { packForApp, type AppManifest } from './app-export.ts';

let pack: { json: string; manifest: AppManifest } | null = null;

export function appFeed(): { json: string; manifest: AppManifest } {
  if (!pack) {
    const { json, manifest } = packForApp(JSON.parse(raw));
    pack = { json, manifest };
  }
  return pack;
}

export const feedHeaders = (version: string): Record<string, string> => ({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=300',
  etag: `"${version}"`,
  'x-robots-tag': 'noindex',
});
