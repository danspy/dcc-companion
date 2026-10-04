/* The achievement desk, for the iOS app. The same desk as /achievement — see
   src/lib/report.ts — reached with JSON instead of a form. The app has no cookie,
   so it says where the reader is in the body, and that goes through the same
   clamps a cookie does. */
import type { APIRoute } from 'astro';
import { gateFromPrefs } from '../../lib/content';
import { prefsFrom } from '../../lib/prefs';
import { fileReport } from '../../lib/report';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>;
  } catch { /* an unreadable body is an empty report, and is refused as one */ }

  const { gate } = await gateFromPrefs(prefsFrom(body));
  const out = await fileReport({
    deed: typeof body.deed === 'string' ? body.deed : '',
    surprise: body.surprise === true,
    gate,
    ip: clientAddress ?? 'unknown',
  });

  const payload = out.grant
    ? { grant: {
        title: out.grant.title, citation: out.grant.citation, reward: out.grant.reward,
        tier: out.grant.tier.name, accent: out.grant.tier.accent, ink: out.grant.tier.ink,
        deed: out.deed,
      } }
    : { problem: { head: out.problem!.head, body: out.problem!.body } };

  return new Response(JSON.stringify(payload), {
    status: out.grant ? 200 : out.problem!.status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
};
