import type { Vox } from '../vox.ts';
import { buildFloor8, TILE_8_LAYERS, HERO_8_LAYERS } from '../maps/floor8.ts';

/* Floor 8's homepage tile is its page map, drawn as it stands when the picture
   opens (artAt 6:4): one scene for both, so the preview and the map cannot
   drift apart. */

export function tile8(): Vox {
  return buildFloor8(new Set(TILE_8_LAYERS));
}

/** Once the floor is finished: Amayon's spell over a burning Havana. */
export function hero8(): Vox {
  return buildFloor8(new Set(HERO_8_LAYERS));
}
