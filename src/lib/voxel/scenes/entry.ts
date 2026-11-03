import { Vox, slab, rng } from '../vox.ts';
import { carl } from '../figures/cast.ts';

/* ---- the start screen: the way into the dungeon, as the first chapter has it ----
   Seattle, a January night, three in the morning. The buildings are simply
   gone, and the cars with them, leaving car-shaped dents of dirt torn through
   the asphalt; everything is gone but the trees, the bicycles in the rack, a
   moped still wearing its parking boot and a stop sign whose street sign has
   gone; a fire burns far off. Where a thrift store stood, a brightly lit hole
   in the ground throws warmth and a spotlight into the air, and an ornate
   wrought-iron staircase leads down into the light. At its rim, the man in the
   leather jacket, the boxers and the pink Crocs, the cat at his feet. Back-cover
   material and the opening pages, nothing past them: it is shown to a reader
   who has read nothing and served to anyone. The spotlight itself is drawn by
   the page, rising out of the hole into the dark over the picture (`ENTRY_HOLE`
   is where). Shapes and colours only, like every scene. */

const ASPHALT = '#2c2e33', ASPHALT_LINE = '#8f8a6a', KERB = '#7a7a80', WALK = '#9a9aa0';
export const ENTRY_Z = 4;
/** The hole, in the middle of the lot where the thrift store stood: x0, y0, x1, y1 on the ground at ENTRY_Z. */
export const ENTRY_HOLE = [19, 22, 33, 32] as const;
/** A figure drawn on its own patch of ground, copied in without the ground. */
function stand(dst: Vox, src: Vox, dx: number, dy: number) {
  const was = dst.chunk;
  for (const { p: [x, y, z], mat, chunk } of src.all()) if (z >= 5) { dst.chunk = chunk; dst.set(x + dx, y + dy, z, mat); }
  dst.chunk = was;
}

/* The cat, at a cat's size beside him: her own figure is drawn to stand alone
   and is as big as he is, so the scene has its own. The same tortoiseshell in
   big patches (ginger over the left cheek and haunch, black over the brow and
   the back), the flat Persian face with its copper eyes and pale muzzle, small
   low ears and a plume of a tail, sitting, about as high as his hips. */
function cat(v: Vox, ox: number, oy: number) {
  const choc = '#6a4630', black = '#2b1e18', ginger = '#d4873c', cream = '#e0bf98', z0 = ENTRY_Z + 1;
  const was = v.chunk; v.chunk = 1;
  // she sits on a slab of the gone building's concrete, where she shows
  for (let x = -2; x <= 8; x++) for (let y = -2; y <= 6; y++) if (Math.abs(x - 3) + Math.abs(y - 2) < 8) v.set(ox + x, oy + y, ENTRY_Z, (x + y) % 3 ? 'tile' : 'stone');
  v.chunk = 0;
  const put = (x: number, y: number, z: number, m: string) => v.set(ox + x, oy + y, z0 + z, m);
  // sitting: a round loaf, its corners off; ginger down the side that faces you, black over her back
  for (let x = 0; x <= 4; x++) for (let y = 0; y <= 3; y++) for (let z = 0; z <= 2; z++) {
    if ((x === 0 || x === 4) && (y === 0 || y === 3)) continue;
    put(x, y, z, x === 4 && y >= 1 ? ginger : y <= 1 && z === 2 ? black : x === 0 ? black : choc);
  }
  // the head, broad and forward over the chest: black over the brow, ginger on the near cheek
  for (let x = 0; x <= 4; x++) for (let y = 2; y <= 4; y++) for (let z = 3; z <= 5; z++) {
    if ((x === 0 || x === 4) && z === 5 && y === 2) continue;
    put(x, y, z, z === 5 && x <= 2 ? black : x === 4 || (x === 3 && z === 5) ? ginger : choc);
  }
  // the flat face: copper eyes set wide, a pushed-in nose, a pale muzzle
  put(1, 5, 4, '#f0b020'); put(3, 5, 4, '#f0b020'); put(2, 5, 4, black);
  put(2, 5, 3, '#b77d6c'); put(1, 5, 3, cream); put(3, 5, 3, cream);
  // small, low ears
  put(0, 3, 6, black); put(4, 3, 6, ginger);
  // front paws, and the plume of a tail curled round her right side
  put(1, 4, 0, cream); put(3, 4, 0, cream);
  for (const [x, y, z] of [[5, 0, 0], [5, 1, 0], [6, 2, 0], [6, 3, 1], [6, 4, 0], [5, 4, 0]] as const) put(x, y, z, y >= 3 ? ginger : black);
  v.chunk = was;
}

export function entry(): Vox {
  const v = new Vox(), r = rng(4401);
  const X1 = 52, Y1 = 42, Z = ENTRY_Z;
  // the block: a sidewalk at the back, the street, a sidewalk, and the lot where the thrift store stood, filling the front
  const rowOf = (y: number) => (y <= 3 ? 'walk' : y <= 13 ? 'street' : y <= 16 ? 'walk' : 'lot');
  slab(v, 0, 0, X1, Y1, Z, {
    depth: 9, seed: 4402, crust: 'stoneDark', under: ['dirt', 'dirtDark'],
    shape: (x, y) => Math.abs((x - X1 / 2) / (X1 / 2 + 0.6)) ** 3 + Math.abs((y - Y1 / 2) / (Y1 / 2 + 0.6)) ** 3 < 1,
    top: (x, y) => { const k = rowOf(y); return k === 'street' ? ASPHALT : k === 'walk' ? (y === 3 || y === 14 ? KERB : WALK) : (((x >> 1) + (y >> 1)) % 5 ? 'dirtDark' : 'dirt'); },
  });
  v.chunk = 1;
  // the street's centre line, dashed
  for (let x = 2; x <= X1 - 2; x++) if (x % 6 < 3) v.set(x, 8, Z, ASPHALT_LINE);
  // where the parked cars were: car-shaped dents of dirt, pulled down through the asphalt
  for (const [x0, y0] of [[3, 4], [14, 4], [31, 10], [42, 10]] as const) {
    v.box(x0, y0, Z, x0 + 8, y0 + 3, Z, 'dirt'); v.box(x0 + 1, y0 + 1, Z, x0 + 7, y0 + 2, Z, 'dirtDark'); v.box(x0 + 1, y0 + 1, Z - 1, x0 + 7, y0 + 2, Z - 1, 'dirtDark');
  }
  // the lot: bare dirt, a broken line of foundation where the store's walls were
  for (let x = 3; x <= X1 - 3; x++) if (r() < 0.55) v.set(x, 17, Z + 1, 'stoneDark');
  for (let y = 18; y <= Y1 - 4; y++) { if (r() < 0.5) v.set(3, y, Z + 1, 'stoneDark'); if (r() < 0.5) v.set(X1 - 3, y, Z + 1, 'stoneDark'); }

  // ---- the way in: the brightly lit hole, the wrought-iron staircase going down into the light ----
  const [H0, HY0, H1, HY1] = ENTRY_HOLE, D = 6;
  v.clear(H0, HY0, Z - D, H1, HY1, Z);
  for (let x = H0 - 1; x <= H1 + 1; x++) for (let y = HY0 - 1; y <= HY1 + 1; y++) if (x < H0 || x > H1 || y < HY0 || y > HY1) v.set(x, y, Z, (x + y) % 2 ? 'stone' : 'tile');   // a stone rim
  for (let x = H0; x <= H1; x++) for (let y = HY0; y <= HY1; y++) v.set(x, y, Z - D, 'window');                 // the light down there
  // its walls stone, lit from below: the light is down there, and comes up out of it
  for (const x of [H0 - 1, H1 + 1]) for (let y = HY0; y <= HY1; y++) for (let z = Z - D + 1; z < Z; z++) v.set(x, y, z, z <= Z - D + 2 ? 'window' : 'stone');
  for (const y of [HY0 - 1, HY1 + 1]) for (let x = H0; x <= H1; x++) for (let z = Z - D + 1; z < Z; z++) v.set(x, y, z, z <= Z - D + 2 ? 'window' : 'stone');
  // the staircase: wide, its steps going down from the near rim to the far side of the hole, a rail either side
  for (let i = 0; i <= HY1 - HY0; i++) {
    const y = HY1 - i, z = Z - 1 - i;
    if (z <= Z - D) break;
    v.box(H0 + 2, y, z, H1 - 2, y, z, i % 2 ? 'metalDark' : '#3a3f45');
    for (const x of [H0 + 1, H1 - 1]) { v.set(x, y, z + 1, 'metal'); if (i % 2 === 0) v.set(x, y, z, 'metalDark'); }
  }
  // its rails curl up out of the ground at the top, ornate
  for (const x of [H0 + 1, H1 - 1]) { v.col(x, HY1 + 1, Z + 1, Z + 3, 'metal'); v.set(x, HY1 + 2, Z + 3, 'metal'); v.set(x, HY1 + 2, Z + 2, 'metal'); }

  // ---- what is left: the tree, the bike rack, the booted moped, the stop sign, a fire far off ----
  // the tree between the sidewalk and the building, bare in January, that the cat went up
  v.chunk = 0;
  const TX = 6, TY = 15;
  for (let z = Z + 1; z <= Z + 20; z++) { v.set(TX, TY, z, 'woodDark'); if (z < Z + 8) v.set(TX + 1, TY, z, 'woodDark'); }
  for (const [dx, dy, z0, len] of [[1, 0, 11, 6], [-1, 0, 13, 5], [0, 1, 15, 5], [0, -1, 12, 5], [1, 1, 18, 4], [-1, -1, 17, 4], [1, -1, 20, 3], [-1, 1, 19, 3]] as const)
    for (let k = 1; k <= len; k++) v.set(TX + dx * k, TY + dy * k, Z + z0 + Math.floor(k / 2), k >= len - 1 ? 'wood' : 'woodDark');
  v.col(TX, TY, Z + 21, Z + 23, 'woodDark');
  // the bike rack on the far sidewalk and two bicycles in it
  v.chunk = 1;
  for (const x of [30, 34, 38]) v.col(x, 1, Z + 1, Z + 3, 'metal');
  v.box(30, 1, Z + 3, 38, 1, Z + 3, 'metal');
  for (const [x0, c] of [[30, '#2e6fb0'], [34, '#b0352e']] as const) {
    for (const x of [x0, x0 + 4]) v.col(x, 2, Z + 1, Z + 2, 'black');
    v.box(x0, 2, Z + 3, x0 + 4, 2, Z + 3, c); v.set(x0 + 1, 2, Z + 4, c); v.col(x0 + 3, 2, Z + 4, Z + 5, c); v.set(x0 + 1, 2, Z + 5, 'black');
  }
  // the moped at the kerb, still booted by parking enforcement
  v.box(13, 11, Z + 2, 17, 12, Z + 2, '#d8d2c4'); v.box(15, 11, Z + 3, 17, 12, Z + 4, '#d8d2c4'); v.col(13, 11, Z + 3, Z + 5, 'metal'); v.box(12, 11, Z + 6, 14, 11, Z + 6, 'black');
  for (const x of [13, 17]) v.col(x, 13, Z + 1, Z + 2, 'black');
  v.box(17, 13, Z + 1, 18, 13, Z + 3, '#f0c419');                              // the boot, yellow on the back wheel
  // the stop sign at the corner, and the pole beside it with its street sign gone
  v.col(48, 15, Z + 1, Z + 12, 'metal'); v.box(47, 16, Z + 10, 49, 16, Z + 13, 'red'); v.box(48, 16, Z + 11, 48, 16, Z + 12, 'white');
  v.col(50, 14, Z + 1, Z + 12, 'metal');
  // far off, a fire
  v.chunk = 0;
  v.box(44, 0, Z + 1, 49, 2, Z + 1, (x, y) => ((x * 3 + y) % 4 ? 'stoneDark' : 'dirtDark'));
  for (const [x, y, z] of [[46, 1, Z + 2], [47, 1, Z + 2], [46, 0, Z + 3], [45, 1, Z + 2], [48, 2, Z + 2]] as const) v.set(x, y, z, 'ember');
  for (const [x, y, z] of [[46, 1, Z + 3], [46, 0, Z + 4], [47, 1, Z + 3], [45, 1, Z + 3]] as const) v.set(x, y, z, 'flame');

  // ---- at the rim of the light: the man in the pink Crocs, and the cat sitting at his feet ----
  stand(v, carl('crocs'), 36, 19);
  cat(v, 46, 24);
  return v;
}
