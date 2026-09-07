import {
  frontierOf, parseAt, describeAt, FRONTIER_ALL, FRONTIER_NONE,
  type Position,
} from './progress';

/* ---------------------------------------------------------------------------
   Three states, and the middle one is the one that matters.

     spoilers off              -> everything shown
     spoilers on, no progress  -> names and book titles show; every arc, twist
                                  and relation hidden
     spoilers on, some         -> revealed up to the frontier

   The middle row exists because a first-time visitor opening a cast list must
   not have book 7 handed to them by a "Fate:" line. A list of names is not a
   spoiler; what happens to them is.
   --------------------------------------------------------------------------- */

export interface Gate {
  frontier: number;
  spoilers: boolean;
  /** true when the reader has told us nothing yet. */
  fresh: boolean;
}

export function gateFor(pos: Position, spoilers: boolean, fresh = false): Gate {
  return {
    frontier: spoilers ? frontierOf(pos) : FRONTIER_ALL,
    spoilers,
    fresh,
  };
}

export function reveals(gate: Gate, at: string | number | null | undefined): boolean {
  if (!gate.spoilers) return true;
  if (at == null) return true;
  return gate.frontier >= parseAt(at);
}

/** The copy shown in place of sealed content, in the dungeon's own register. */
export function sealCopy(at: string | number): string {
  return `That's above your pay grade, crawler. Come back when ${describeAt(parseAt(at))}.`;
}

export { FRONTIER_ALL, FRONTIER_NONE, describeAt, parseAt };
