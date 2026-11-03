import type { Vox } from '../vox.ts';
import { buildFloor3, TILE_3_LAYERS, HERO_3_LAYERS } from '../maps/floor3.ts';

/* Floor 3's homepage tile is its page map as it stands when the picture opens
   (artAt 2:6): the small village on its slats, smoke through them and embers
   beneath, the road through the ruins and the circus in its park. One scene for both. */
export function tile3(): Vox {
  return buildFloor3(new Set(TILE_3_LAYERS));
}

/** Once the floor is finished: the Doomsday Scenario going off under the east stairs. */
export function hero3(): Vox {
  return buildFloor3(new Set(HERO_3_LAYERS));
}
