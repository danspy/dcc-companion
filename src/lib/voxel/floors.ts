import { Vox, rng, slab, torch, wall, line, house, disc, ring, tree, palm, banner } from './vox.ts';
import { CARL, DONUT, PALETTE } from '../maps/sprites.ts';

/* Each floor as a small floating voxel diorama, for its tile on the homepage.

   What a tile shows is gated by the floor's `artAt` in data/books.json: the
   point by which a reader has met everything in the picture. Drawn from the
   books, in the spirit of the floor rather than as a record of it, and in this
   site's own palette. Carl and Donut are on the back cover, so they may stand
   anywhere; nobody else appears, because a face is a spoiler. */

import * as TILES from './tiles/index.ts';
import { crawlers, room, door, stairsDown, crate } from './tiles/common.ts';

/* A floor's second picture: its hero moment, the scene the floor is remembered
   for. It replaces the tile once the reader has finished the floor (its last
   recap part, `recapSortKey`), because a hero moment is how the floor ends or
   turns, and the tile shown while reading must not give that away. */
const pick = (prefix: string) => Object.fromEntries(Object.entries(TILES)
  .filter(([k]) => new RegExp(`^${prefix}\\d+$`).test(k))
  .map(([k, f]) => [Number(k.slice(prefix.length)), f as () => Vox]));

/** A floor's tile: `tileN` in tiles/floorN.ts. */
export const VOXEL_FLOORS: Record<number, () => Vox> = pick('tile');
export const VOXEL_HEROES: Record<number, () => Vox> = pick('hero');
