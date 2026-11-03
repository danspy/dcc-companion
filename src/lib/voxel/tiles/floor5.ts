import type { Vox } from '../vox.ts';
import { buildFloor5, TILE_5_LAYERS, HERO_5_LAYERS } from '../maps/floor5.ts';

/* Floor 5's homepage tile is its page map as it stands when the picture opens
   (artAt 4:2): one scene for both, so the preview and the map cannot drift. */

export function tile5(): Vox {
  return buildFloor5(new Set(TILE_5_LAYERS));
}

/** Once the floor is finished: the bubble popped and the god come for his dog. */
export function hero5(): Vox {
  return buildFloor5(new Set(HERO_5_LAYERS));
}
