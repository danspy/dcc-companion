import { Vox, rng, torch, wall, line } from '../vox.ts';
import { CARL, DONUT, PALETTE } from '../../maps/sprites.ts';

/* Pieces several floor tiles share. */

export const crawlers = (v: Vox, x: number, y: number, z: number) => {
  v.sprite(x, y, z, CARL, PALETTE);
  v.sprite(x + 2, y, z, DONUT, PALETTE);
};

/** A room: tall back walls (north and west), knocked-down near walls, torches on the back. */
export function room(v: Vox, x0: number, y0: number, x1: number, y1: number, h: number, seed: number, mat = 'stone') {
  const r = rng(seed);
  wall(v, line(x0, y0, x1, y0), 1, h, mat);
  wall(v, line(x0, y0, x0, y1), 1, h, mat);
  for (const [x, y] of [...line(x0, y1, x1, y1), ...line(x1, y0, x1, y1)]) v.col(x, y, 1, r() < 0.3 ? 2 : 1, mat);
  for (let x = x0 + 3; x < x1 - 1; x += 5) torch(v, x, y0 + 1, 3);
}

/** A door set in a back wall, under a lintel. */
export const door = (v: Vox, x: number, y: number, w = 3) => {
  v.box(x, y, 1, x + w - 1, y, 3, 'woodDark'); v.set(x + Math.floor(w / 2), y, 2, 'metalDark'); v.box(x - 1, y, 4, x + w, y, 4, 'stoneDark');
};

/** A flight of stairs cut down into the floor, opening on the slab's near face. */
export function stairsDown(v: Vox, x0: number, x1: number, yNear: number, steps: number) {
  v.clear(x0, yNear - steps + 1, -steps, x1, yNear, 0);
  for (let i = 0; i < steps; i++) v.box(x0, yNear - i, -steps - 1, x1, yNear - i, -1 - i, (_x, _y, z) => (z === -1 - i ? 'stoneDark' : 'stone'));
  v.box(x0 - 1, yNear - steps, -steps - 1, x1 + 1, yNear - steps, 2, 'stone');
  v.box(x0, yNear - steps, -steps, x1, yNear - steps, 1, 'void');
}

export const crate = (v: Vox, x: number, y: number, z = 1, lid = 'wood') => { v.box(x, y, z, x + 1, y + 1, z, 'wood'); v.box(x, y, z + 1, x + 1, y + 1, z + 1, lid); };

