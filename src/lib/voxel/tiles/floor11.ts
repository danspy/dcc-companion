import type { Vox } from '../vox.ts';
import { buildFloor11, TILE_11_LAYERS, HERO_11_LAYERS } from '../maps/floor11.ts';

/* Floor 11's homepage tile is its page map, drawn as it stands when the picture
   opens (artAt 8:93): one scene for both, so the preview and the map cannot
   drift apart. The pilot for composing a floor as one diorama. */

export function tile11(): Vox {
  return buildFloor11(new Set(TILE_11_LAYERS));
}

/** Once the floor is finished: the hero moment. */
export function hero11(): Vox {
  return buildFloor11(new Set(HERO_11_LAYERS));
}
