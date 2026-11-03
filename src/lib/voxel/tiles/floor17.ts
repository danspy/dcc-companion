import { Vox, slab, torch } from '../vox.ts';
import { crate } from './common.ts';

/* Floor 17's homepage tile. The crawl has not reached it, so it has no page map. */

/* ---- 17. the Backstage Death Maze ----
   Drawn from what the books have said by 8:38: a small hand-built maze of
   traps, built long ago by two indentured crawlers and forgotten (8:38), that
   everyone who has tried to cross has been turned to mince (8:1); it ends in a
   floor boss, and attached to it is the only way into the Pineapple Cabaret
   (8:38). So: a stone keep in separate wings at different heights, joined by
   timber bridges. On the left a tight maze with spikes in its corridors; in
   the middle a courtyard; on the right, a step down, a trap hall with a
   crushing block hung from a gallows over a stain, and a pit of spikes; at the
   back, raised, two rooms: one with a plain wooden door under a pineapple, the
   other with the banded iron door the maze ends at. Torches, crates and timber
   everywhere, because it was built by hand. Nobody in it: the mobs and the boss
   are characters, and the people who train there (8:55) come later. */

type Room = { id: number; x0: number; y0: number; x1: number; y1: number; z: number };

/* in 2x2 cells, so every wall and floor is a big block */
const ROOMS: Room[] = [
  { id: 1, x0: 7, y0: 6, x1: 15, y1: 12, z: 0 },    // the courtyard
  { id: 2, x0: 5, y0: 0, x1: 10, y1: 3, z: 3 },     // the cabaret's door, raised
  { id: 3, x0: 12, y0: 0, x1: 17, y1: 3, z: 3 },    // the iron door, raised
  { id: 4, x0: 0, y0: 6, x1: 5, y1: 14, z: 0 },     // the maze
  { id: 5, x0: 17, y0: 5, x1: 23, y1: 11, z: -2 },  // the trap hall, a step down
];
/* where the bridges land, in cells */
const OPEN = new Set(['7,9', '7,10', '5,9', '5,10', '15,8', '15,9', '17,8', '17,9', '8,6', '9,6', '8,3', '9,3', '13,6', '14,6', '13,3', '14,3']);
/* the maze's own walls: thin lines, so the corridors between them read */
const MAZE: [number, number, number, number][] = [[4, 14, 4, 18], [2, 20, 6, 20], [7, 16, 9, 16], [8, 18, 8, 23], [6, 23, 6, 27], [2, 24, 4, 24], [9, 26, 9, 27]];
const roomOf = (cx: number, cy: number) => ROOMS.find(r => cx >= r.x0 && cx <= r.x1 && cy >= r.y0 && cy <= r.y1);

export function tile17(): Vox {
  const v = new Vox();
  const floorTop = (x: number, y: number) => (((x >> 1) + (y >> 1)) % 3 === 0 ? 'stone' : 'tile');

  /* one slab per wing, so each steps and hangs its own rock */
  for (const r of ROOMS) slab(v, r.x0 * 2, r.y0 * 2, r.x1 * 2 + 1, r.y1 * 2 + 1, r.z, { depth: r.z > 0 ? 10 : 7, seed: 170 + r.id, crust: 'stone', under: ['dirt', 'dirtDark'], top: r.id === 4 ? 'plaster' : floorTop });

  /* walls round every wing: tall and crenellated at the back, knocked low at the
     front to let the eye in, with a post now and then */
  v.chunk = 2;
  for (const r of ROOMS) for (let cx = r.x0; cx <= r.x1; cx++) for (let cy = r.y0; cy <= r.y1; cy++) {
    if (OPEN.has(`${cx},${cy}`)) continue;
    const front = cx === r.x1 || cy === r.y1;
    // a back wall stands tall only where nothing lies behind it, or it would hide the wing behind
    const open = (dx: number, dy: number) => [1, 2, 3].every(k => !roomOf(cx - dx * k, cy - dy * k));
    const back = (cx === r.x0 || cy === r.y0) && !front;
    const tall = back && ((cx === r.x0 && open(1, 0)) || (cy === r.y0 && open(0, 1)));
    if (!back && !front) continue;
    const x = cx * 2, y = cy * 2, z = r.z + 1;
    const h = tall ? (r.id === 4 ? 4 : 6) + ((cx + cy) % 2 ? 0 : 2) : 2 + (r.id !== 4 && (cx + cy) % 3 === 0 ? 2 : 0);
    v.box(x, y, z, x + 1, y + 1, z + h - 1, (_x, _y, zz) => (((zz >> 1) + cx * 3 + cy) % 5 === 0 ? 'stoneDark' : 'stone'));
  }
  v.chunk = 1;

  /* timber bridges between the wings, stepping where the levels differ */
  const plank = (x: number, y: number, z: number) => v.set(x, y, z, (x + y) % 3 ? 'wood' : 'woodDark');
  for (const x0 of [16, 26]) for (let y = 8; y <= 11; y++) for (let x = x0; x <= x0 + 3; x++) plank(x, y, y < 10 ? 2 : 1);
  for (const x0 of [16, 26]) for (const x of [x0 - 1, x0 + 4]) { v.col(x, 8, 0, 4, 'woodDark'); v.col(x, 11, 0, 3, 'woodDark'); }
  for (let x = 12; x <= 13; x++) for (let y = 18; y <= 21; y++) plank(x, y, 0);
  for (let x = 32; x <= 33; x++) for (let y = 16; y <= 19; y++) plank(x, y, x === 32 ? 0 : -1);

  /* the cabaret's door: plain timber in a stone arch, a gold pineapple over it */
  const door = (x: number, z: number, w: number, h: number, mat: string) => {
    v.box(x - 1, 1, z, x + w, 1, z + h, 'stoneDark'); v.box(x, 2, z, x + w - 1, 2, z + h - 1, mat);
    v.set(x, 2, z + h - 1, 'stoneDark'); v.set(x + w - 1, 2, z + h - 1, 'stoneDark');
  };
  door(15, 4, 4, 5, 'wood'); v.set(17, 3, 6, 'accent');
  for (const [dx, dz, m] of [[1, 0, 'brick'], [2, 0, 'brick'], [0, 1, 'brick'], [1, 1, 'woodDark'], [2, 1, 'brick'], [3, 1, 'brick'], [0, 2, 'brick'], [1, 2, 'brick'], [2, 2, 'woodDark'], [3, 2, 'brick'],
    [1, 3, 'brick'], [2, 3, 'brick'], [0, 4, 'leaf'], [1, 4, 'leafLight'], [2, 4, 'leafLight'], [3, 4, 'leaf'], [1, 5, 'leafLight'], [2, 5, 'leaf']] as const)
    v.set(15 + dx, 2, 10 + dz, m);
  torch(v, 13, 2, 7); torch(v, 20, 2, 7);
  crate(v, 12, 4, 4);

  /* the iron door the maze ends at: banded, a red glow under it, fire either side */
  door(27, 4, 6, 7, 'metalDark');
  for (const z of [5, 8]) v.box(27, 3, z, 32, 3, z, 'metal');
  v.box(29, 3, 4, 30, 3, 9, 'black'); v.box(27, 3, 4, 32, 3, 4, 'ember');
  for (const x of [25, 34]) { v.box(x, 3, 4, x, 3, 5, 'stoneDark'); v.set(x, 3, 6, 'flame'); }

  /* the maze: thin walls, spikes in its corridors, a stain where someone did not make it */
  for (const [x0, y0, x1, y1] of MAZE) v.box(x0, y0, 1, x1, y1, 2, (x, y, z) => (z === 2 ? 'stone' : (x + y + z) % 4 ? 'stoneDark' : 'stone'));
  for (const [x, y] of [[2, 17], [3, 17], [6, 18], [7, 21], [3, 26], [4, 26], [9, 20]]) v.set(x, y, 1, 'rail');
  for (const [x, y] of [[2, 18], [7, 22], [6, 21], [4, 25]]) v.set(x, y, 0, 'redDark');
  torch(v, 2, 13, 4); torch(v, 6, 13, 4);

  /* the courtyard: crates and timber the builders left, torches on the back wall */
  crate(v, 14, 15); crate(v, 14, 17); v.set(15, 16, 3, 'wood');
  crate(v, 27, 22); crate(v, 25, 23, 1, 'woodDark');
  v.box(18, 20, 1, 22, 20, 1, 'rail');                                      // a strip of spikes across the walk
  torch(v, 18, 13, 4); torch(v, 24, 13, 4); torch(v, 13, 18, 4);

  /* the trap hall: a crushing block on a gallows over its own stain, and a pit of spikes */
  const F = -1;
  v.col(37, 13, F, F + 10, 'woodDark'); v.box(37, 13, F + 11, 42, 13, F + 11, 'wood'); v.set(38, 13, F + 10, 'woodDark');
  v.col(41, 14, F + 9, F + 10, 'metalDark');
  v.chunk = 2; v.box(40, 14, 4, 43, 15, 7, 'metalDark'); v.chunk = 1;
  for (let x = 40; x <= 43; x++) for (let y = 14; y <= 15; y++) v.set(x, y, 3, (x + y) % 2 ? 'rail' : 'metal');
  v.box(40, 14, 8, 43, 15, 8, 'metal');
  for (const [x, y] of [[40, 14], [41, 14], [42, 15], [41, 15], [43, 14], [39, 15], [42, 16], [40, 13], [44, 15]]) v.set(x, y, F - 1, (x + y) % 3 ? 'redDark' : 'red');
  v.clear(36, 16, -4, 39, 19, -2);
  v.box(36, 16, -5, 39, 19, -5, 'void');
  for (let x = 36; x <= 39; x++) for (let y = 16; y <= 19; y++) if ((x + y) % 2 === 0) v.col(x, y, -4, -3, 'rail');
  torch(v, 36, 11, 2); torch(v, 44, 11, 2);
  return v;
}
