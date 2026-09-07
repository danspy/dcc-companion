import { parseAt, bookOf } from './gate.mjs';

/* ---------------------------------------------------------------------------
   The gate lint. Curated prose is written from knowledge, so this validates
   *structure* and never truth — but structure is where a spoiler gate actually
   leaks, and every rule here is a leak somebody would otherwise ship.
   --------------------------------------------------------------------------- */

const VALID_KINDS = new Set(['character', 'item', 'mechanic', 'faction', 'thread']);
const VALID_BEATS = new Set(['origin', 'arc', 'use', 'fate']);
const VALID_CONFIDENCE = new Set(['verified', 'draft']);

export function lint({ books, floors, entities }) {
  const errors = [];
  const warnings = [];
  const byId = new Map(entities.map(e => [e.id, e]));
  const bookIds = new Set(books.map(b => b.id));

  const at = (value, where) => {
    try { return parseAt(value); }
    catch (e) { errors.push(`${where}: ${e.message}`); return null; }
  };

  for (const floor of floors) {
    const f = at(floor.revealedAt, `floor ${floor.id}`);
    if (f !== null && !bookIds.has(bookOf(f))) {
      errors.push(`floor ${floor.id}: reveals in book ${bookOf(f)}, which is not published`);
    }
  }

  for (const e of entities) {
    const where = `entity ${e.id}`;
    if (!VALID_KINDS.has(e.kind)) errors.push(`${where}: unknown kind "${e.kind}"`);
    const entityAt = at(e.revealedAt, where);
    if (entityAt === null) continue;

    for (const b of e.beats ?? []) {
      const bw = `${where} beat "${b.headline}"`;
      if (!VALID_BEATS.has(b.kind)) errors.push(`${bw}: unknown beat kind "${b.kind}"`);
      if (!VALID_CONFIDENCE.has(b.confidence ?? 'draft')) {
        errors.push(`${bw}: confidence must be "verified" or "draft"`);
      }
      const beatAt = at(b.at, bw);
      if (beatAt === null) continue;

      /* A beat that unlocks before its own entity is a leak: the reader gets
         the fact without ever having been introduced to who it is about. */
      if (beatAt < entityAt) {
        errors.push(`${bw}: unlocks at "${b.at}" but ${e.id} is not revealed until "${e.revealedAt}"`);
      }
      if (b.book !== bookOf(beatAt)) {
        errors.push(`${bw}: declares book ${b.book} but its tag "${b.at}" resolves to book ${bookOf(beatAt)}`);
      }
      if (!bookIds.has(b.book)) errors.push(`${bw}: book ${b.book} is not published`);
      if (b.floor != null && !floors.some(f => f.id === b.floor)) {
        errors.push(`${bw}: floor ${b.floor} does not exist`);
      }
      if ((b.confidence ?? 'draft') === 'draft') {
        warnings.push(`draft — ${e.id}: ${b.headline}`);
      }
    }

    for (const r of e.relations ?? []) {
      const rw = `${where} -> ${r.to}`;
      const target = byId.get(r.to);
      if (!target) { errors.push(`${rw}: no such entity`); continue; }
      const relAt = at(r.at, rw);
      const targetAt = at(target.revealedAt, `entity ${target.id}`);
      if (relAt === null || targetAt === null) continue;

      /* Gate inheritance: an edge can never be looser than either endpoint.
         "Wielded by Carl" on an item Carl does not hold yet is a spoiler about
         the item, and "Katia: used the Orchid boon" leaks book 7 onto a page
         that opens in book 2. The resolved sortKey is what the app compares,
         so a too-loose tag is tightened rather than rejected — but say so. */
      const inherited = Math.max(relAt, entityAt, targetAt);
      if (inherited > relAt) {
        warnings.push(`${rw}: tag "${r.at}" tightened to match its endpoints`);
      }
    }
  }

  for (const b of books) {
    if (b.chapters == null) {
      warnings.push(`book ${b.id} (${b.title}): no chapter count — chapter-level gating and the % dial are unavailable for it`);
    }
  }

  return { errors, warnings };
}
