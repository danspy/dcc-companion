/* The KOReader plugin's data, derived from the committed snapshot.

   Everything the plugin compares is a resolved integer `key` (the snapshot's `sortKey`), so
   the Lua side is one comparison and never parses a tag. Beside each key sits the `book` and
   `chapter` the thing is stamped with, which can be earlier than the key when inheritance has
   pushed the key later — the same distinction the achievements page draws between when a
   thing happened and when it may be shown.

   Two files: `index.json`, loaded once per document, holds everything needed to match a word
   and show a tagline; `entities/<id>.json`, loaded on a hit, holds the beats. Relations and
   achievements are not exported. */

import { parseAt, CHAPTER_STRIDE } from './gate.mjs';
import { WIKI_TO_EDITION } from './edition.mjs';

export const ALTERNATE_EDITIONS = WIKI_TO_EDITION;

const SITE = 'https://dcc.dev.innovativstud.io';

/* An integer key back to the stamp it carries. 999 is the end of the book and is left as
   is; the plugin renders it as "end". A book-level tag is chapter 0 for the same reason. */
export function stampOf(key) {
  return { book: Math.floor(key / CHAPTER_STRIDE), chapter: key % CHAPTER_STRIDE };
}

const keyed = (key, rest) => ({ key, ...stampOf(key), ...rest });

function exportEntity(e) {
  const revealedAt = parseAt(e.revealedAt);
  const aka = (e.aka ?? []).map(a => typeof a === 'string'
    ? { name: a, key: revealedAt }
    : { name: a.name, key: parseAt(a.at) });
  const taglines = (e.taglines ?? []).map(t => keyed(t.sortKey ?? parseAt(t.at), { text: t.text }));
  return {
    entry: { id: e.id, kind: e.kind, name: e.name, role: e.role ?? '', revealedAt, aka, taglines },
    file: {
      id: e.id,
      descriptions: (e.descriptions ?? []).map(d => keyed(d.sortKey ?? parseAt(d.at), { source: d.source ?? '', text: d.text })),
      beats: [],
    },
  };
}

/* A floor is an entry too. Its name may be printed before anyone stands on it (`nameAt`),
   the premise opens on arrival, and each recap part is a beat at the end of its own stretch. */
function exportFloor(f) {
  const arrive = f.sortKey ?? parseAt(f.revealedAt);
  const nameKey = f.nameAt ? parseAt(f.nameAt) : arrive;
  const parts = typeof f.recap === 'string'
    ? [{ title: 'What happened', text: f.recap, sortKey: f.recapSortKey ?? parseAt(f.recapAt) }]
    : (f.recap ?? []);
  return {
    entry: {
      id: `floor-${f.id}`, kind: 'floor', name: f.name, role: `Floor ${f.id}`,
      revealedAt: nameKey, aka: [],
      taglines: f.premise ? [keyed(arrive, { text: f.premise })] : [],
    },
    file: {
      id: `floor-${f.id}`,
      descriptions: [],
      beats: parts.map(p => keyed(p.sortKey ?? parseAt(p.at), { headline: p.title, text: p.text, voice: 'narrator' })),
    },
  };
}

function exportBooks(books) {
  return books.map(b => {
    const alt = ALTERNATE_EDITIONS[b.id];
    const alternates = alt
      ? [{ chapters: Math.max(...Object.keys(alt.map).map(Number)), map: alt.map }]
      : [];
    return { id: b.id, title: b.title, chapters: b.chapters ?? null, alternates };
  });
}

export function exportForKoreader(snapshot, { now = new Date() } = {}) {
  const entities = new Map();
  const entries = [];
  const add = ({ entry, file }) => { entries.push(entry); entities.set(entry.id, file); };

  for (const e of snapshot.entities) add(exportEntity(e));
  for (const f of snapshot.floors) add(exportFloor(f));

  for (const b of snapshot.beats) {
    const file = entities.get(b.entityId);
    if (!file) throw new Error(`beat for unknown entity ${b.entityId}`);
    /* The stamp is the beat's own tag, not its key: a "1:end" beat has no chapter number in
       the snapshot, and a book-level one has been floored to its entity by inheritance. */
    file.beats.push(keyed(parseAt(b.at), {
      headline: b.headline ?? '', text: b.text ?? '', voice: b.voice ?? 'narrator',
    }));
    file.beats[file.beats.length - 1].key = b.sortKey;
  }
  for (const file of entities.values()) file.beats.sort((a, b) => a.key - b.key);

  const index = {
    generatedAt: now.toISOString(),
    source: SITE,
    books: exportBooks(snapshot.books),
    entries,
  };
  return { index, entities };
}
