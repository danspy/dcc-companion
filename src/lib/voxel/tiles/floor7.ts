import type { Vox } from '../vox.ts';
import { buildFloor7, TILE_7_LAYERS, HERO_7_LAYERS } from '../maps/floor7.ts';

/* Floor 7's homepage tile is its page map, drawn as it stands when the picture
   opens (artAt 5:end): one scene for both, so the preview and the map cannot
   drift apart. */

export function tile7(): Vox {
  return buildFloor7(new Set(TILE_7_LAYERS));
}

/** Once the floor is finished: Prepotente brings the maze down. */
export function hero7(): Vox {
  return buildFloor7(new Set(HERO_7_LAYERS));
}
