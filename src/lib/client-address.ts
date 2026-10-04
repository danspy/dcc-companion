/* Who is asking, for the achievement desk's limiter.

   The site runs behind a reverse proxy on the same box, so the socket's peer is
   always loopback, and Astro only reads X-Forwarded-For when a list of allowed
   domains is configured. Keying the limiter on that peer makes one bucket for the
   whole world: fifteen reports from anyone, and everyone is throttled.

   So when the peer is local, the reader is the last hop of X-Forwarded-For — the
   address our own proxy saw. Anything before that hop is the client's own claim.
   When the peer is not local the request did not come through the proxy, and the
   header is not believed at all. Pure, so the gate tests can read it. */
export function clientKey(peer: string | null | undefined, forwarded: string | null | undefined): string {
  const address = (peer ?? '').trim();
  const local = address === '' || address === '::1'
    || address.startsWith('127.') || address.startsWith('::ffff:127.');
  if (!local) return address;
  const hops = (forwarded ?? '').split(',').map(hop => hop.trim()).filter(Boolean);
  return hops.at(-1) ?? (address || 'unknown');
}
