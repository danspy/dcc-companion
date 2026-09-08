import type { BookRow, FloorRow, EntityRow, BeatRow } from './content';
/* Explicit extensions: Vite resolves without them, plain node does not, and
   scripts/test-gate.mjs imports this module directly so the lane rules are
   tested rather than trusted. */
import { KIND_ORDER } from './kinds.ts';
import { reveals, type Gate } from './spoiler.ts';
import { BOOK_COUNT, CHAPTER_STRIDE, END_OF_BOOK } from './progress.ts';

/* ---------------------------------------------------------------------------
   The timeline's arithmetic, in one place, for the same reason progress.ts owns
   the frontier: three views draw the same picture and none of them may disagree
   about where a chapter sits or which lanes a reader has earned.

   Nothing here decides what is *visible* — that is the gate's job, and every
   function below takes an already-gated set or asks the gate itself.
   --------------------------------------------------------------------------- */

export const LANE_H = 28;
/* The stage head's height, and so the height the braid's axis is drawn to.
   It is `--head-h` in src/styles/global.css; keep the two the same. Tall enough
   for a book's title to wrap onto a second line, which the two shortest need. */
export const AXIS_H = 96;

/** Width of one floor column in the grid, head and body alike. */
export const FLOOR_COL = 150;
/* Wide enough that the shortest book still has room to say its name: book 2 is
   25 chapters, and at this scale that is 110px, which fits its title on two
   lines. Any narrower and the axis starts dropping names. */
export const PX_PER_CHAPTER = 4.4;
export const RIGHT_PAD = 34;

export interface BookSpan { book: BookRow; x: number; w: number }

export interface Scale {
  /** Total chapters across every book with a count. */
  chapters: number;
  width: number;
  /** Chapters from the start of book 1 to this frontier value. */
  offsetOf(sortKey: number): number;
  xOf(sortKey: number): number;
  bands: BookSpan[];
}

/**
 * x is cumulative chapters, so a book is as wide on the page as it is long.
 * Book 2 is a quarter the width of book 8 because it is a quarter the length,
 * and a reader who has felt that difference should see it.
 */
export function makeScale(books: BookRow[]): Scale {
  const counts = new Map(books.map(b => [b.id, b.chapters ?? 0]));
  const before = new Map<number, number>();
  let run = 0;
  for (const b of books) { before.set(b.id, run); run += b.chapters ?? 0; }

  const offsetOf = (sortKey: number) => {
    const book = Math.floor(sortKey / CHAPTER_STRIDE);
    if (book < 1) return 0;
    /* Spoilers off pushes the frontier past the last book; that is the whole
       width, not an overflow into a book that does not exist. */
    if (book > BOOK_COUNT) return run;
    const n = counts.get(book) ?? 0;
    const raw = sortKey % CHAPTER_STRIDE;
    const chapter = raw === END_OF_BOOK ? n : Math.min(raw, n);
    return (before.get(book) ?? 0) + chapter;
  };

  return {
    chapters: run,
    width: Math.max(run * PX_PER_CHAPTER + RIGHT_PAD, 640),
    offsetOf,
    xOf: (sortKey: number) => offsetOf(sortKey) * PX_PER_CHAPTER,
    bands: books.map(b => ({
      book: b,
      x: (before.get(b.id) ?? 0) * PX_PER_CHAPTER,
      w: (b.chapters ?? 0) * PX_PER_CHAPTER,
    })),
  };
}

export interface Lane { entity: EntityRow; beats: BeatRow[] }

/**
 * The lanes a reader has earned: entities they have met that have at least one
 * entry they have reached, ranked by how much of that entity they hold and then
 * settled into kind order so an item's line sits below the people who carry it.
 *
 * `met` is the number of entities with any reached entry — never the total,
 * because a total tells someone on book 1 how many people are still coming.
 */
export function lanesFor(
  entities: EntityRow[],
  beats: BeatRow[],
  gate: Gate,
  /** Omit to draw every lane the reader has earned. The views scroll inside a
      fixed-height stage, so there is nothing to protect them from. */
  limit?: number,
): { lanes: Lane[]; met: number } {
  const byEntity = new Map<string, BeatRow[]>();
  for (const b of beats) {
    if (gate.frontier < b.sortKey) continue;
    const list = byEntity.get(b.entityId);
    if (list) list.push(b); else byEntity.set(b.entityId, [b]);
  }
  for (const list of byEntity.values()) list.sort((a, b) => a.sortKey - b.sortKey);

  const rows: Lane[] = [];
  for (const entity of entities) {
    if (!reveals(gate, entity.revealedAt)) continue;
    const beatsFor = byEntity.get(entity.id);
    if (beatsFor?.length) rows.push({ entity, beats: beatsFor });
  }

  const ranked = [...rows].sort(
    (a, b) => b.beats.length - a.beats.length || a.entity.name.localeCompare(b.entity.name),
  );
  const capped = limit === undefined ? ranked : ranked.slice(0, Math.max(1, limit));
  const lanes = capped.sort(
    (a, b) =>
      KIND_ORDER.indexOf(a.entity.kind) - KIND_ORDER.indexOf(b.entity.kind) ||
      a.beats[0].sortKey - b.beats[0].sortKey,
  );
  return { lanes, met: rows.length };
}

/** Only the floors the reader has arrived on. A column for one they have not
    reached would say how many are left, which is the leak the sealed beat
    stamps were. */
export const floorsReached = (floors: FloorRow[], gate: Gate) =>
  floors.filter(f => reveals(gate, f.revealedAt));

/** `Bk 4 · ch 12` — chrome, and the one place a view may talk about books. */
export function stampOf(sortKey: number): string {
  const book = Math.floor(sortKey / CHAPTER_STRIDE);
  const chapter = sortKey % CHAPTER_STRIDE;
  if (chapter === END_OF_BOOK) return `Bk ${book} · end`;
  if (chapter === 0) return `Bk ${book}`;
  return `Bk ${book} · ch ${chapter}`;
}

/** The searchable string for a lane, assembled only from what this reader may
    already see — the same construction `/who` uses, for the same reason. */
/* The filter itself, in one place, because the page is rendered filtered on the
   server and the script re-applies the same rule on the client. Two copies of
   this predicate would mean the first paint and the first keystroke could
   disagree about what matches. Word starts only: without a boundary "Tran"
   matches inside "transparent". */
export function findRe(q: string): RegExp | null {
  const trimmed = q.trim();
  if (!trimmed) return null;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try { return new RegExp(`\\b${escaped}`, 'i'); } catch { return null; }
}

/** Does this entry survive the search box and the kind chips? */
export const keeps = (
  find: string, kind: string, re: RegExp | null, kinds: Set<string>,
) => (kinds.size === 0 || kinds.has(kind)) && (!re || re.test(find));

export const findableOf = (entity: EntityRow, tagline: string) =>
  [entity.name, ...((entity.aka ?? []) as string[]), entity.role, tagline]
    .join(' ')
    .toLowerCase();

/** Centre-line of lane `i` inside the lanes drawing. The axis is a separate,
    pinned drawing above it, so lane 0 starts at the top of this one rather than
    below an axis it no longer contains. The braid re-stacks on the client when
    the filter hides a lane, so this is the one definition of where a lane sits:
    the server draws with it and the script redraws with it. */
export const laneY = (i: number) => i * LANE_H + LANE_H / 2;

/** An arc between two lanes, bowed to the right so crossings stay readable. */
export function arcPath(x: number, ya: number, yb: number): string {
  const bow = Math.min(30, Math.abs(yb - ya) * 0.42) + 5;
  return `M ${x} ${ya} Q ${x + bow} ${(ya + yb) / 2} ${x} ${yb}`;
}

/* Exactly the lanes, with nothing added: the name column ends at its last row,
   so any padding here leaves the chart hanging below the names. */
export const svgHeight = (laneCount: number) => Math.max(laneCount * LANE_H, LANE_H);
