import type { Vox } from '../vox.ts';
import { buildFloor4, TILE_4_LAYERS, HERO_4_LAYERS } from '../maps/floor4.ts';

/* Floor 4's homepage tile is its page map as it stands when the picture opens
   (artAt 3:2): one scene for both, so the preview and the map cannot drift. */

export function tile4(): Vox {
  return buildFloor4(new Set(TILE_4_LAYERS));
}

/** Once the floor is finished: the Death Challenge, and the Nightmare's last run. */
export function hero4(): Vox {
  return buildFloor4(new Set(HERO_4_LAYERS));
}
