import type { Vox } from '../vox.ts';
import { buildFloor2, TILE_2_LAYERS, HERO_2_LAYERS } from '../maps/floor2.ts';

/* Floor 2's homepage tile is its page map as it stands when the picture opens
   (artAt 1:37): the hallway and its quadrants, the Mind Horrors, the burned-out
   lair, the grubs, the stairwell still an icon in the fog. One scene for both. */
export function tile2(): Vox {
  return buildFloor2(new Set(TILE_2_LAYERS));
}

/** Once the floor is finished: the rage elemental dragged into the stairwell. */
export function hero2(): Vox {
  return buildFloor2(new Set(HERO_2_LAYERS));
}
