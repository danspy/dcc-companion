import type { Vox } from '../vox.ts';
import { buildFloor1, TILE_1_LAYERS, HERO_1_LAYERS } from '../maps/floor1.ts';

/* Floor 1's homepage tile is its page map as it stands when the picture opens
   (artAt 1:2): the surface's hole, the iron stair, the fish-demon door, the
   artery and the Murder Dozer in its bay. One scene for both, so they cannot drift. */
export function tile1(): Vox {
  return buildFloor1(new Set(TILE_1_LAYERS));
}

/** Once the floor is finished: the Ball of Swine on the Speedbump in the arena. */
export function hero1(): Vox {
  return buildFloor1(new Set(HERO_1_LAYERS));
}
