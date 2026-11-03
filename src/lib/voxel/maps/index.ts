import type { Vox } from '../vox.ts';
import { FLOOR_1_VOXEL } from './floor1.ts';
import { FLOOR_2_VOXEL } from './floor2.ts';
import { FLOOR_3_VOXEL } from './floor3.ts';
import { FLOOR_4_VOXEL } from './floor4.ts';
import { FLOOR_5_VOXEL } from './floor5.ts';
import { FLOOR_6_VOXEL } from './floor6.ts';
import { FLOOR_7_VOXEL } from './floor7.ts';
import { FLOOR_8_VOXEL } from './floor8.ts';
import { FLOOR_9_VOXEL } from './floor9.ts';
import { FLOOR_10_VOXEL } from './floor10.ts';
import { FLOOR_11_VOXEL } from './floor11.ts';

/* A floor page's map: a scene built from the layers the reader has reached,
   and the point in the scene each layer's callout points at. */
export interface VoxelMap {
  build: (shown: Set<string>) => Vox;
  anchors: Record<string, [number, number, number]>;
}

export const VOXEL_MAPS: Record<number, VoxelMap> = { 1: FLOOR_1_VOXEL, 2: FLOOR_2_VOXEL, 3: FLOOR_3_VOXEL, 4: FLOOR_4_VOXEL, 5: FLOOR_5_VOXEL, 6: FLOOR_6_VOXEL, 7: FLOOR_7_VOXEL, 8: FLOOR_8_VOXEL, 9: FLOOR_9_VOXEL, 10: FLOOR_10_VOXEL, 11: FLOOR_11_VOXEL };
