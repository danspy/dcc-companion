import { Vox, slab } from '../vox.ts';

/* The court's standard: a gold rod, blue cloth with a gold
   sun in its middle, a gold fringe at a swallowtail foot. The engine's banner
   edges its cloth in trim, which at three blocks wide reads as a gold banner
   with a blue stripe; this one is blue first. */
function standard(v: Vox, x: number, y: number, zTop: number, len: number, along: 'x' | 'y', w = 3) {
  const at = (i: number, z: number, m: string) => (along === 'x' ? v.set(x + i, y, z, m) : v.set(x, y + i, z, m));
  for (let i = -1; i <= w; i++) at(i, zTop + 1, 'accent');
  for (let i = 0; i < w; i++) for (let k = 0; k < len; k++) {
    const foot = k === len - 1;
    if (foot && w >= 3 && i > 0 && i < w - 1) continue;              // the swallowtail's notch
    at(i, zTop - k, foot ? 'accent' : 'blue');
  }
  // the sun: a gold heart with four short rays, centred on the cloth
  const ez = zTop - Math.floor((len - 1) / 2), c = Math.floor(w / 2);
  if (w % 2) for (const [di, dz] of [[0, 0], [0, 1], [0, -1], [-1, 0], [1, 0]]) at(c + di, ez + dz, 'accent');
  else for (const [di, dz] of [[-1, 0], [0, 0], [-1, 1], [0, 1]]) at(c + di, ez + dz, 'accent');
}

/* Floor 12's homepage tile. The crawl has not reached it, so it has no page map. */

/* ---- 12. the court of the gods: a white-and-gold hall and a throne ----
   An island in steps rather than a slab: the hall on its main level, a terrace
   a step down on the right with the fire gate to the thirteenth (2:7), a loose
   chunk drifting off the corner. A gold band runs round the edge, blue rock
   below, and banners hang down the island's own sides. The hall: colonnades
   with arched windows and blue banners at the back, the throne on its dais
   under a sun arch, a blue runner and a sun rug, braziers either side. Nobody
   in it: by 6:19 the court has been described, not met. */
export function tile12(): Vox {
  const v = new Vox();
  const main = (x: number, y: number) => !(x <= 3 && y >= 17) && !(x >= 27 && y <= 2) && !(x >= 25 && y >= 18);
  slab(v, 0, 0, 30, 20, 0, { depth: 8, seed: 121, shape: main, crust: 'accent', under: ['blue', 'roofBlue'],
    top: (x, y) => ((x >> 1) + (y >> 1)) % 2 ? 'white' : 'plaster' });
  slab(v, 31, 3, 41, 15, -2, { depth: 6, seed: 122, shape: (x, y) => !(x >= 39 && y >= 13), crust: 'accent', under: ['blue', 'roofBlue'],
    top: (x, y) => ((x >> 1) + (y >> 1)) % 2 ? 'white' : 'plaster' });
  slab(v, 6, 23, 11, 27, -5, { depth: 4, seed: 123, crust: 'accent', under: ['blue', 'roofBlue'], top: 'white' });

  /* the back colonnade: big white pillars with gold caps, arched windows and banners between */
  const pillar = (x: number, y: number, z: number, h: number) => {
    v.chunk = 2; v.box(x, y, z, x + 1, y + 1, z + h - 1, 'white'); v.chunk = 1;
    v.box(x, y, z + h, x + 1, y + 1, z + h, 'accent'); v.box(x, y, z, x + 1, y + 1, z, 'accent');
  };
  for (let x = 2; x <= 26; x += 6) pillar(x, 0, 1, 10);
  for (let y = 6; y <= 14; y += 8) pillar(0, y, 1, 10);
  for (let x = 4; x <= 24; x += 6) {
    v.box(x, 0, 1, x + 3, 0, 8, 'plaster');
    if (x === 10 || x === 16) continue;                     // the throne's arch stands here
    standard(v, x, 1, 8, 7, 'x', 3);
  }
  for (let y = 2; y <= 13; y++) if (y < 6 || y > 7) v.box(0, y, 1, 0, y, 8, 'plaster');
  v.box(0, 9, 3, 0, 11, 6, 'void'); v.set(0, 10, 7, 'void');
  standard(v, 1, 2, 8, 7, 'y', 3);

  /* the throne: a dais in steps, the seat, a tall arch with the sun on blue */
  for (let i = 0; i < 3; i++) v.box(11 - i, 1, 1 + i, 19 + i - 2 * i, 4 - i, 1 + i, i % 2 ? 'accent' : 'white');
  v.box(10, 0, 1, 20, 0, 12, 'white'); v.box(11, 0, 13, 19, 0, 13, 'accent'); v.box(13, 0, 14, 17, 0, 14, 'accent');
  v.box(12, 0, 4, 18, 0, 11, 'blue');
  for (const [dx, dz] of [[0, 0], [-1, 0], [1, 0], [0, 1], [0, -1], [-2, 2], [2, 2], [-2, -2], [2, -2]]) v.set(15 + dx, 0, 8 + dz, 'accent');
  v.box(14, 1, 4, 16, 2, 4, 'blue'); v.box(14, 1, 5, 16, 1, 8, 'accent'); v.box(14, 2, 5, 14, 2, 6, 'accent'); v.box(16, 2, 5, 16, 2, 6, 'accent');
  v.box(15, 1, 5, 15, 1, 7, 'blue');

  /* the runner from the throne to the front, gold-edged, with the sun rug on it */
  for (let y = 5; y <= 19; y++) for (let x = 13; x <= 17; x++) v.set(x, y, 0, x === 13 || x === 17 ? 'accent' : 'blue');
  for (let y = 11; y <= 16; y++) for (let x = 11; x <= 19; x++) {
    const d = Math.hypot(x - 15, y - 13.5);
    v.set(x, y, 0, x === 11 || x === 19 || y === 11 || y === 16 ? 'accent' : d < 1.3 ? 'accent' : (d < 2.6 && (x + y) % 2) ? 'accent' : 'blue');
  }

  /* braziers: gold bowls on white pedestals */
  const brazier = (x: number, y: number, z: number) => {
    v.chunk = 2; v.box(x, y, z, x + 1, y + 1, z + 1, 'white'); v.chunk = 1;
    v.box(x, y, z + 2, x + 1, y + 1, z + 2, 'accent'); v.set(x, y, z + 3, 'black'); v.set(x + 1, y + 1, z + 3, 'black');
    v.set(x, y + 1, z + 3, 'flame'); v.set(x + 1, y, z + 3, 'flame');
  };
  brazier(8, 4, 1); brazier(21, 4, 1); brazier(8, 14, 1); brazier(21, 14, 1);

  /* the front: gold-capped posts at the edge, no wall, and banners hanging over it */
  for (const [x, y] of [[4, 20], [10, 20], [20, 20], [24, 17], [30, 8], [30, 14], [5, 16]]) { v.col(x, y, 1, 2, 'white'); v.set(x, y, 3, 'accent'); }
  standard(v, 7, 21, -1, 8, 'x', 3);
  standard(v, 20, 21, -1, 7, 'x', 3);
  standard(v, 31, 16, -1, 7, 'y', 3);

  /* the terrace: a broken colonnade, and the fire gate to the thirteenth */
  pillar(32, 3, -1, 9); pillar(38, 3, -1, 9);
  v.box(34, 3, -1, 37, 3, 5, 'plaster'); v.box(35, 3, 1, 36, 3, 4, 'void'); standard(v, 34, 4, 6, 6, 'x', 3);
  v.box(36, 9, -1, 36, 13, 6, 'accent'); v.box(36, 10, -1, 36, 12, 4, 'ember'); v.box(36, 11, 0, 36, 11, 3, 'flame');
  v.set(36, 10, 5, 'flame'); v.set(36, 12, 5, 'flame');
  return v;
}
