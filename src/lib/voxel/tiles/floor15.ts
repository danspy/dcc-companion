import { Vox, rng, slab } from '../vox.ts';

/* Floor 15's homepage tile. The crawl has not reached it, so it has no page map. */

/* ---- 15. Sheol: black rock over rivers of fire ----
   Drawn from what the books have said by 2:24: the fifteenth level is Sheol,
   a place of fire, and Reaper cases are forged there (2:24). So: two shelves of
   black basalt either side of a river of fire, the river spilling over the
   island's lip, spires veined with fire, braziers, and a forge with a glowing
   mouth and an anvil on the high shelf. Nobody in it: its demons (6:2) and the
   minions who carry the cases up (2:24) are characters, and Sheol Bricks (3:14)
   come later. */

/** Basalt: dark per 2x2 cell, never per voxel, so a big block keeps one stone. */
const basalt = (x: number, y: number) => {
  const h = ((x >> 1) * 73 + (y >> 1) * 151) % 7;
  return h === 0 || h === 4 ? 'black' : 'stoneDark';
};

/** Fire: hot veins through a cooler crust, per 2x2 cell. Every hot block lights
    its neighbours, so a whole river of them washes out to white. */
const lava = (x: number, y: number) => {
  const h = ((x >> 1) * 37 + (y >> 1) * 91 + ((x + y) >> 2) * 11) % 6;
  return h < 2 ? 'ember' : h < 5 ? 'brick' : 'red';
};

export function tile15(): Vox {
  const v = new Vox();
  const r = rng(151);
  const UNDER: [string, string] = ['dirtDark', 'redDark'];

  /* the river's bed: a lower channel between the shelves, running front to back */
  const river = (x: number, y: number) => Math.abs(x - 22 - Math.sin(y / 3) * 1.5) <= 4.2;
  slab(v, 16, 0, 28, 19, -2, { depth: 6, seed: 152, crust: 'redDark', under: UNDER, shape: river,
    top: lava });

  /* the high shelf on the left: notched, a step down at its near corner */
  const left = (x: number, y: number) => !river(x, y) && x < 22 && !(x <= 2 && y >= 15) && !(x >= 14 && y >= 18);
  slab(v, 0, 0, 20, 19, 1, { depth: 9, seed: 153, crust: 'black', under: UNDER, shape: (x, y) => left(x, y) && !(x >= 6 && x <= 13 && y >= 14), top: basalt });
  slab(v, 6, 14, 13, 21, -1, { depth: 6, seed: 154, crust: 'black', under: UNDER, top: basalt });

  /* the low shelf on the right, cut back at the far corner */
  const right = (x: number, y: number) => !river(x, y) && x > 22 && !(x >= 40 && y <= 3) && !(x >= 37 && y >= 15);
  slab(v, 23, 0, 43, 17, -1, { depth: 8, seed: 155, crust: 'black', under: UNDER, shape: right, top: basalt });

  /* the fire spills over the island's lip and falls away */
  for (let y = 15; y <= 21; y++) for (let x = 18; x <= 26; x++) {
    if (!river(x, y) || v.has(x, y + 1, -2)) continue;
    const fall = 5 + Math.floor(r() * 5);
    for (let z = -3; z >= -2 - fall; z--) v.set(x, y + 1, z, (x + (z >> 1)) % 3 === 0 ? 'ember' : z < -2 - fall + 2 ? 'red' : 'brick');
  }
  v.set(21, 23, -11, 'ember'); v.set(23, 22, -13, 'ember');

  /* stepping stones of basalt standing in the river */
  v.chunk = 2;
  for (const [x, y, h] of [[20, 2, 1], [24, 6, 2], [20, 10, 1], [22, 14, 0]] as const) v.box(x, y, -1, x + 1, y + 1, -1 + h, 'stoneDark');
  v.chunk = 1;

  /* a ragged rim of basalt blocks along every edge, as a lava field breaks up at its lip */
  v.chunk = 2;
  for (let x = -2; x <= 44; x += 2) for (let y = -2; y <= 22; y += 2) {
    let top = -99;
    for (let z = 2; z >= -2; z--) if (v.has(x, y, z) && v.has(x + 1, y + 1, z)) { top = z; break; }
    if (top === -99 || v.get(x, y, top) === 'ember' || v.get(x, y, top) === 'brick' || v.get(x, y, top) === 'red') continue;
    const edge = !v.has(x, y + 2, top) || !v.has(x + 2, y, top) || !v.has(x - 1, y, top) || !v.has(x, y - 1, top);
    if (!edge || r() < 0.4) continue;
    const h = r() < 0.35 ? 4 : 2;
    v.box(x, y, top + 1, x + 1, y + 1, top + h, (_x, _y, z) => (z > top + 2 ? 'black' : 'stoneDark'));
  }
  v.chunk = 1;

  /* basalt blocks and broken columns: big blocks, taller at the back */
  v.chunk = 2;
  const blocks: [number, number, number, number][] = [
    [0, 0, 2, 6], [2, 0, 2, 4], [0, 4, 2, 3], [10, 0, 2, 5], [16, 0, 2, 3], [0, 10, 2, 2],
    [12, 8, 2, 1], [2, 12, 2, 1],
    [26, 0, 2, 4], [32, 0, 2, 6], [34, 0, 2, 3], [40, 4, 2, 5], [40, 8, 2, 3], [28, 12, 2, 1], [34, 12, 2, 2],
  ];
  for (const [x, y, z0, h] of blocks) {
    const z = x > 22 ? 0 : z0;
    v.box(x, y, z, x + 1, y + 1, z + h - 1, (_x, _y, zz) => (zz - z) % 4 === 3 ? 'black' : 'stoneDark');
  }
  v.chunk = 1;

  /* spires: tall, thin, tapering, veined with fire down their faces */
  const spire = (x: number, y: number, z: number, h: number) => {
    v.chunk = 2; v.box(x, y, z, x + 1, y + 1, z + Math.floor(h / 2) - 1, 'black'); v.chunk = 1;
    v.box(x, y, z + Math.floor(h / 2), x, y, z + h - 2, 'black'); v.set(x, y, z + h - 1, 'stoneDark');
    // a crack zigzags down the face the eye sees, inside the column, never bulging out of it
    for (let zz = z + 1; zz < z + Math.floor(h / 2); zz++) if ((zz - z) % 4 !== 0) v.set(x + ((zz >> 1) % 2), y + 1, zz, 'ember');
    v.set(x, y, z + Math.floor(h / 2) + 1, 'ember');
  };
  spire(4, 1, 2, 15); spire(6, 0, 2, 11); spire(2, 6, 2, 9);
  spire(30, 1, 0, 14); spire(37, 1, 0, 10); spire(41, 6, 0, 12);
  spire(15, 3, 2, 6); spire(27, 9, 0, 5);

  /* braziers: a basalt post and a fire on it */
  const brazier = (x: number, y: number, z: number) => { v.chunk = 2; v.box(x, y, z, x + 1, y + 1, z + 1, 'stoneDark'); v.chunk = 1; v.box(x, y, z + 2, x + 1, y + 1, z + 2, 'black'); v.set(x, y + 1, z + 3, 'flame'); v.set(x + 1, y, z + 3, 'flame'); };
  brazier(4, 10, 2); brazier(38, 12, 0);

  /* the forge on the high shelf: a basalt furnace with a glowing mouth, a chimney, an anvil */
  v.chunk = 2; v.box(8, 2, 2, 13, 7, 7, 'stoneDark'); v.box(10, 4, 8, 11, 5, 11, 'black'); v.chunk = 1;
  v.box(9, 7, 3, 12, 7, 6, 'void'); v.box(10, 7, 3, 11, 7, 5, 'ember'); v.box(9, 8, 2, 12, 8, 2, 'ember');
  v.set(10, 7, 6, 'void'); v.set(11, 7, 6, 'void');
  v.set(10, 4, 12, 'flame'); v.set(11, 5, 12, 'flame');
  v.box(10, 11, 2, 11, 11, 2, 'metalDark'); v.box(9, 11, 3, 12, 11, 3, 'metal'); v.set(12, 11, 4, 'ember');
  v.box(14, 11, 2, 15, 12, 2, 'metalDark'); v.set(14, 11, 3, 'ember'); v.set(15, 12, 3, 'ember');

  /* loose chunks drifting off the corners */
  v.chunk = 2;
  v.box(-4, 12, -4, -3, 13, -3, 'stoneDark'); v.box(44, 14, -6, 45, 15, -5, 'black'); v.set(46, 12, -3, 'ember');
  v.chunk = 1;
  return v;
}
