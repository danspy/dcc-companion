/* The build scripts' copy of src/lib/aliases.ts, for the same reason gate.mjs
   copies progress.ts: plain node cannot import the TypeScript module. An alias
   is a plain string (reveals with its entity) or { name, at } (reveals at its
   own tag); every script reading `aka` goes through here. */
export function aliasesOf(e) {
  return (Array.isArray(e.aka) ? e.aka : []).flatMap(a =>
    typeof a === 'string' ? (a ? [{ name: a, at: e.revealedAt, own: false }] : [])
    : a && typeof a.name === 'string' && a.name ? [{ name: a.name, at: a.at ?? e.revealedAt, own: a.at != null }]
    : []);
}

export const aliasNames = e => aliasesOf(e).map(a => a.name);
