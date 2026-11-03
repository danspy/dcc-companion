import type { Vox } from '../vox.ts';
import { buildFloor10, TILE_10_LAYERS, HERO_10_LAYERS } from '../maps/floor10.ts';

/* Floor 10's homepage tile is its page map, drawn as it stands when the
   picture opens (artAt 8:2): the cave, the garage, and the gun truck at the
   start line. One scene for both, so the preview and the map cannot drift. */

export function tile10(): Vox {
  return buildFloor10(new Set(TILE_10_LAYERS));
}

/** Once the floor is finished: the ceiling run over the molten steel. */
export function hero10(): Vox {
  return buildFloor10(new Set(HERO_10_LAYERS));
}
