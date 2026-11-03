import type { Vox } from '../vox.ts';
import { buildFloor9, TILE_9_LAYERS, HERO_9_LAYERS } from '../maps/floor9.ts';

/* Floor 9's homepage tile is its page map, drawn as it stands when the picture
   opens (artAt 7:9): Larracos alone on its island, the castle under the lake,
   before the war's plain is drawn round it. One scene for both, so the preview
   and the map cannot drift apart. */

export function tile9(): Vox {
  return buildFloor9(new Set(TILE_9_LAYERS));
}

/** Once the floor is finished: the War Crime. */
export function hero9(): Vox {
  return buildFloor9(new Set(HERO_9_LAYERS));
}
