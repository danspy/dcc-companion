import { db, Book, Floor, Entity, Beat, Relation, asc, eq, or } from 'astro:db';
import type { AstroCookies } from 'astro';
import { readPrefs, type Prefs } from './prefs';
import { gateFor, type Gate } from './spoiler';

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

/** The latest tagline the reader has reached — see the note on Entity.taglines. */
export function taglineFor(entity: EntityRow, gate: Gate): string {
  const rows = (entity.taglines ?? []) as { sortKey: number; text: string }[];
  let out = rows[0]?.text ?? '';
  for (const t of rows) if (gate.frontier >= t.sortKey) out = t.text;
  return out;
}

/* The latest of the System's own descriptions the reader has reached, or null
   when there is none yet. Same rule as taglines: a description of an upgraded
   item supersedes the one before it. */
export function descriptionFor(entity: EntityRow, gate: Gate): { text: string; source: string } | null {
  const rows = (entity.descriptions ?? []) as { sortKey: number; text: string; source: string }[];
  let out: { text: string; source: string } | null = null;
  for (const d of rows) if (gate.frontier >= d.sortKey) out = { text: d.text, source: d.source };
  return out;
}

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
  const shown = beats.filter(b => gate.frontier >= b.sortKey).length;
  return { shown, total, complete: total > 0 && shown === total };
}


/**
 * The one place a request turns into a gate. Every page calls this instead of
 * assembling prefs + chapter count + gateFor itself, so "what does this reader
 * get to see" has a single answer.
 */
export async function readGate(cookies: AstroCookies): Promise<{ prefs: Prefs; gate: Gate; chapters: number | null }> {
  const prefs = readPrefs(cookies);
  const books = await getBooks();
  const chapters = books.find(b => b.id === prefs.book)?.chapters ?? null;
  return { prefs, gate: gateFor(prefs, prefs.spoilers, prefs.fresh, chapters), chapters };
}
