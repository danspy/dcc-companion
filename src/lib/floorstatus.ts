import { reveals } from './spoiler';
import type { ForetoldRow } from './content';

/* What the reader knows of each of the eighteen floors, in one place, because
   the homepage, a floor's page and the pages for floors ahead all ask it:

   - reached   the reader has arrived (`revealedAt` passed)
   - named     a floor of the published eight whose name has been printed, not yet stood on
   - foretold  a floor past the eleventh with a note or a name reached
   - sealed    nothing yet

   Every floor that is not sealed has a page. A sealed one has none, because a
   page that exists says there is something to say. */

export type FloorKind = 'reached' | 'named' | 'foretold' | 'sealed';
export interface Note { at: string; sortKey: number; text: string }
export interface FloorStatus { id: number; kind: FloorKind; name: string | null; nameAt: string | null; notes: Note[]; artKey: number | null; heroKey?: number | null }

type Gate = Parameters<typeof reveals>[0];
interface FloorLike { id: number; name: string; revealedAt: string; nameAt: string | null; artKey: number | null }

export function floorStatus(id: number, floors: FloorLike[], foretold: ForetoldRow[], gate: Gate): FloorStatus {
  const floor = floors.find(f => f.id === id);
  if (floor) {
    if (reveals(gate, floor.revealedAt)) return { id, kind: 'reached', name: floor.name, nameAt: null, notes: [], artKey: floor.artKey };
    const named = floor.nameAt != null && reveals(gate, floor.nameAt);
    return named ? { id, kind: 'named', name: floor.name, nameAt: floor.nameAt, notes: [], artKey: null }
      : { id, kind: 'sealed', name: null, nameAt: null, notes: [], artKey: null };
  }
  const f = foretold.find(x => x.id === id);
  const notes = ((f?.notes ?? []) as Note[]).filter(n => gate.frontier >= n.sortKey);
  const named = !!f?.name && f.nameKey != null && gate.frontier >= f.nameKey;
  if (!notes.length && !named) return { id, kind: 'sealed', name: null, nameAt: null, notes: [], artKey: null };
  return { id, kind: 'foretold', name: named ? f!.name! : null, nameAt: named ? f!.nameAt ?? null : null, notes, artKey: f?.artKey ?? null, heroKey: f?.heroKey ?? null };
}

/** The pages a reader may open, floor by floor. */
export const hasPage = (s: FloorStatus) => s.kind !== 'sealed';
