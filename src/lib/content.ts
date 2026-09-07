import { db, Book, Floor, Entity, Beat, Relation, asc, eq, or } from 'astro:db';
import { parseAt } from './progress';
import type { Gate } from './spoiler';

/* Reads. The catalogue is small enough (8 books, 11 floors, a few dozen
   entities) that every list is fetched whole and filtered in memory — which
   is also what keeps the gate in one place instead of smeared across SQL. */

export type BookRow = typeof Book.$inferSelect;
export type FloorRow = typeof Floor.$inferSelect;
export type EntityRow = typeof Entity.$inferSelect;
export type BeatRow = typeof Beat.$inferSelect;

export const getBooks = () => db.select().from(Book).orderBy(asc(Book.id));
export const getFloors = () => db.select().from(Floor).orderBy(asc(Floor.id));

export const getEntities = () =>
  db.select().from(Entity).orderBy(asc(Entity.kind), asc(Entity.sort), asc(Entity.name));

export const getEntity = async (id: string) =>
  (await db.select().from(Entity).where(eq(Entity.id, id)))[0] ?? null;

export const getBeats = (entityId: string) =>
  db.select().from(Beat).where(eq(Beat.entityId, entityId)).orderBy(asc(Beat.sortKey), asc(Beat.id));

/** Relations are declared one way and mirrored here, so a page shows both sides. */
export async function getRelations(entityId: string) {
  const rows = await db
    .select().from(Relation)
    .where(or(eq(Relation.fromId, entityId), eq(Relation.toId, entityId)))
    .orderBy(asc(Relation.sortKey));
  return rows.map(r => ({
    ...r,
    otherId: r.fromId === entityId ? r.toId : r.fromId,
    outgoing: r.fromId === entityId,
  }));
}

/** Every beat in the book, newest last — the spine of the reading-position view. */
export const getAllBeats = () => db.select().from(Beat).orderBy(asc(Beat.sortKey), asc(Beat.id));

export const KIND_LABELS: Record<string, string> = {
  character: 'Characters',
  item: 'Items & artifacts',
  mechanic: 'Mechanics',
  faction: 'Factions',
  thread: 'Open threads',
};

export const KIND_ORDER = ['character', 'item', 'mechanic', 'faction', 'thread'];

export const BEAT_LABELS: Record<string, string> = {
  origin: 'First seen',
  arc: 'Arc',
  use: 'Used',
  fate: 'Fate',
};

/** How much of an entity a reader can currently see — drives the index badges. */
export function coverage(beats: BeatRow[], gate: Gate) {
  const total = beats.length;
  const shown = beats.filter(b => gate.frontier >= parseAt(b.at)).length;
  return { shown, total, complete: total > 0 && shown === total };
}
