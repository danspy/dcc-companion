import type { Vox } from '../vox.ts';
import { buildFloor6, TILE_6_LAYERS, HERO_6_LAYERS } from '../maps/floor6.ts';

/* Floor 6's homepage tile is its page map as it stands when the picture opens
   (artAt 5:10): one scene for both, so the preview and the map cannot drift. */

export function tile6(): Vox {
  return buildFloor6(new Set(TILE_6_LAYERS));
}

/** Once the floor is finished: the cage fight under the dome of thorns. */
export function hero6(): Vox {
  return buildFloor6(new Set(HERO_6_LAYERS));
}
