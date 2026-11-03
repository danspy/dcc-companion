import { Vox, rng, slab, torch, line, disc, ring, banner } from '../vox.ts';
import { crate } from '../tiles/common.ts';
import type { VoxelMap } from './index.ts';

/* Floor 4's page map, composed as one diorama in the look the floor's reference
   art set: a broken island of big rock blocks at many heights, its edge notched
   and a chunk drifting off it, cliffs with arched tunnel mouths lit by torches,
   and lines that curve and cross over and under each other on braced wooden
   trestles at three levels. Station 83's green-roofed platform at the front
   left, the burning pit at the back right with the Nightmare Express's loop
   round it, Trainyard E down the right-hand end, the stairwell room in the back
   left cliffs. Built layer by layer; the tile is this scene at its artAt. */

const W = 57, D = 33;
const PIT = [41, 11] as const;
const YARD = { x0: 48, y0: 6, x1: 57, y1: 26 } as const;
const SR = [9, 8] as const;       // the stairwell room, in the back cliffs

type Cell = [number, number];

/* The island's outline: notched corners, a bite out of the front, and a chunk adrift. */
const inIsland = (x: number, y: number) =>
  x >= 0 && x <= W && y >= 0 && y <= D &&
  !(x <= 7 && y >= 28) && !(x >= 50 && y <= 3) && !(x >= 27 && x <= 33 && y >= 31) && !(x <= 3 && y <= 3) && !(x >= 54 && y >= 30);

/** A curve as a run of touching cells. */
function path(f: (t: number) => Cell, t0: number, t1: number, step = 1): Cell[] {
  const out: Cell[] = [];
  let prev: Cell | null = null;
  for (let t = t0; t <= t1 + 1e-9; t += step) {
    const p: Cell = f(t).map(Math.round) as Cell;
    if (prev) out.push(...line(prev[0], prev[1], p[0], p[1]).slice(1)); else out.push(p);
    prev = p;
  }
  return out;
}
const dirAt = (c: Cell[], i: number): 'x' | 'y' => { const a = c[Math.max(0, i - 2)], b = c[Math.min(c.length - 1, i + 2)]; return Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]) ? 'x' : 'y'; };
const side = (d: 'x' | 'y', x: number, y: number, k: number): Cell => (d === 'x' ? [x, y + k] : [x + k, y]);

/** The highest voxel in a column below z, or 0. */
function ground(v: Vox, x: number, y: number, z: number) { for (let g = z - 1; g > 0; g--) if (v.has(x, y, g)) return g; return 0; }

/** A line at height z: a cutting or tunnel through any rock in its way, brown sleepers and metal
    rails, and where the ground falls away, a wooden trestle with legs and cross-braces. */
function lay(v: Vox, cells: Cell[], z: number, clearH = 6) {
  cells.forEach(([x, y], i) => {
    const d = dirAt(cells, i);
    for (let k = -2; k <= 2; k++) { const [px, py] = side(d, x, y, k); for (let h = z; h <= z + clearH; h++) v.set(px, py, h, null); }
  });
  cells.forEach(([x, y], i) => {
    const d = dirAt(cells, i);
    for (let k = -1; k <= 1; k++) { const [px, py] = side(d, x, y, k); v.set(px, py, z, i % 2 ? 'woodDark' : 'wood'); }
    for (const k of [-1, 1]) {
      const [px, py] = side(d, x, y, k);
      v.set(px, py, z + 1, 'metal');
      if (z > 1 && !v.has(px, py, z - 1)) {
        v.set(px, py, z - 1, 'wood');                       // the stringer under the sleepers
        const g = ground(v, px, py, z - 1);
        if (i % 4 === 0) v.col(px, py, g + 1, z - 2, 'woodDark');
        else if (z - 1 - (i % 4) > g) v.set(px, py, z - 1 - (i % 4), 'wood');   // the brace
      }
    }
  });
}

/** A steam train on a line: carriages of `mat` under green roofs with lit windows, and an engine
    in the same colour with a black smokebox, a stack, a lamp and a puff of smoke. */
function train(v: Vox, cells: Cell[], start: number, z: number, mat: string, cars = 1, engine = mat) {
  const n = cars * 10 + 5;
  for (let j = 0; j < n && start + j < cells.length; j++) {
    const [x, y] = cells[start + j], d = dirAt(cells, start + j), u = j - cars * 10;
    if (u < 0 && (j % 10) === 9) continue;                 // the coupling gap
    for (let k = -1; k <= 1; k++) {
      const [px, py] = side(d, x, y, k);
      if (u < 0) {
        v.set(px, py, z + 2, (j % 10 === 1 || j % 10 === 7) ? 'black' : mat);
        v.set(px, py, z + 3, mat);
        v.set(px, py, z + 4, k !== 0 && j % 2 ? 'window' : mat);
        v.set(px, py, z + 5, 'roofGreen');
      } else {
        v.set(px, py, z + 2, 'black');
        v.set(px, py, z + 3, u === 4 ? 'black' : engine);
        v.set(px, py, z + 4, u <= 1 ? (k !== 0 ? 'window' : engine) : u === 4 ? 'black' : engine);
        if (u <= 1) v.set(px, py, z + 5, 'roofGreen');
        if (u === 4 && k === 0) v.set(px, py, z + 3, 'window');
      }
    }
    if (u === 3) { v.col(x, y, z + 5, z + 6, 'black'); v.set(x, y, z + 7, 'brick'); v.set(x, y, z + 8, 'white'); v.set(x - 1, y - 1, z + 9, 'white'); v.set(x - 1, y, z + 9, 'cloth'); v.set(x - 2, y - 1, z + 10, 'cloth'); }
  }
}

/** A green-roofed wooden shelter on a plank platform: posts, a bench, a lamp. */
function shelter(v: Vox, x0: number, x1: number, y0: number, y1: number, z: number) {
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [Math.round((x0 + x1) / 2), y1]]) v.col(x, y, z + 1, z + 4, 'woodDark');
  v.box(x0 - 1, y0 - 1, z + 5, x1 + 1, y1 + 1, z + 5, 'roofGreen'); v.box(x0, y0, z + 6, x1, Math.floor((y0 + y1) / 2), z + 6, 'roofGreen');
  v.box(x0 - 1, y1 + 1, z + 5, x1 + 1, y1 + 1, z + 5, 'leaf');
  v.box(x0 + 2, y0, z + 1, x0 + 4, y0, z + 1, 'wood'); v.box(x1 - 4, y0, z + 1, x1 - 2, y0, z + 1, 'wood');
}
const lamp = (v: Vox, x: number, y: number, z: number) => { v.col(x, y, z, z + 3, 'woodDark'); v.set(x + 1, y, z + 3, 'woodDark'); v.set(x + 1, y, z + 2, 'flame'); };

/* The three lines the reader meets first, and where they run. */
const RED: Cell[] = path(x => [x, 26 + 2 * Math.sin(x / 7)], 0, W);
const MID: Cell[] = path(x => [x, 15 + 3 * Math.sin(x / 8 + 1)], 0, 46);
const HIGH: Cell[] = path(y => [24 + 3 * Math.sin(y / 6), y], 0, D);

function build(shown: Set<string>): Vox {
  const v = new Vox();
  const has = (id: string) => shown.has(id);
  const T = (id: string) => { v.tag = id; return has(id); };
  /** Clear a footprint of rock down to the floor, for something set into the landscape. */
  const site = (x0: number, y0: number, x1: number, y1: number, floor = 'stoneDark') => { v.clear(x0, y0, 1, x1, y1, 20); v.box(x0, y0, 0, x1, y1, 0, floor); };

  /* ---- the landscape: big rock blocks at many heights, and the lines through it ---- */
  if (T('noodles')) {
    slab(v, 0, 0, W, D, 0, { depth: 9, seed: 401, shape: inIsland, top: (x, y) => (((x >> 1) * 3 + (y >> 1) * 5) % 7 === 0 ? 'stone' : ((x >> 1) + (y >> 1)) % 4 === 0 ? 'wood' : 'tile'), crust: 'stone', under: ['stoneDark', 'stone'] });
    slab(v, 0, 30, 5, 34, -3, { depth: 4, seed: 404, top: 'stone', crust: 'stone', under: ['stoneDark', 'stone'] });   // a chunk adrift
    const r = rng(402);
    v.chunk = 2;
    for (let bx = 0; bx <= W; bx += 4) for (let by = 0; by <= D; by += 4) {
      if (!inIsland(bx + 1, by + 1)) continue;
      const back = by === 0 || bx === 0, front = by >= 24;
      const hs = front ? [0, 0, 0, 2] : back ? [8, 10, 12, 12] : bx >= W - 8 ? [0, 2, 4] : by < 12 ? [0, 2, 4, 8] : [0, 0, 2, 4];
      const h = hs[Math.floor(r() * hs.length)];
      if (!h) continue;
      const w = 3 + (r() < 0.5 ? 1 : 0), d = 3 + (r() < 0.5 ? 1 : 0);
      for (let x = bx; x <= Math.min(W, bx + w); x++) for (let y = by; y <= Math.min(D, by + d); y++) {
        if (!inIsland(x, y)) continue;
        for (let z = 1; z <= h; z++) v.set(x, y, z, ((x >> 1) + (y >> 1) + (z >> 1)) % 5 === 0 ? 'stone' : 'stoneDark');
        if (h >= 4 && h <= 8 && ((bx + by) >> 2) % 5 === 1) v.set(x, y, h, 'wood');   // a plank deck on top
      }
      if (h >= 6 && r() < 0.35) torch(v, Math.min(W, bx + w) + 1, by + 1, h - 2);
    }
    v.chunk = 1;
    lay(v, RED, 2); lay(v, MID, 6); lay(v, HIGH, 10);
    // arched mouths where a line runs into a cliff, lit either side
    for (const [cells, z] of [[RED, 2], [MID, 6], [HIGH, 10]] as const) cells.forEach(([x, y], i) => {
      if (i % 4 || !v.has(x, y, z + 7)) return;
      const d = dirAt(cells, i);
      for (const k of [-2, 2]) { const [px, py] = side(d, x, y, k); v.set(px, py, z + 6, 'stone'); v.set(px, py, z + 5, 'stone'); }
      const [tx, ty] = side(d, x, y, 3); if (v.has(tx, ty, z + 3)) v.set(...side(d, x, y, 2), z + 3, 'flame');
    });
    train(v, RED, 30, 2, 'red'); train(v, HIGH, 2, 10, 'blue');
    for (const [x, y] of [[18, 31], [44, 30], [33, 21]]) lamp(v, x, y, ground(v, x, y, 20) + 1);
    for (const [x, y] of [[36, 30], [22, 22]]) crate(v, x, y, ground(v, x, y, 20) + 1);
  }
  if (T('station-83')) {
    // a long platform with a yellow edge stripe, benches under a green-roofed shelter, the round room of shops behind
    site(4, 20, 19, 23, 'tile');
    v.chunk = 2; v.box(4, 20, 1, 19, 23, 2, 'stone'); v.chunk = 1; v.box(4, 20, 3, 19, 23, 3, 'wood');
    for (let x = 4; x <= 19; x++) v.set(x, 23, 3, 'brick');
    shelter(v, 6, 17, 20, 22, 3);
    crate(v, 4, 20, 4); lamp(v, 19, 20, 4);
    site(8, 14, 16, 19); v.chunk = 2; ring(v, 12, 16.5, 4, 2, 1, 6, 'stone'); v.chunk = 1;
    for (const [x, y] of [[9, 19], [12, 20], [15, 19]]) v.set(x, y, 4, 'window');
    v.box(11, 20, 1, 13, 20, 3, 'void');
    banner(v, 9, 21, 7, 3, { along: 'x', w: 2, cloth: 'red', trim: 'accent' });
  }
  if (T('nightmare-loop')) {
    // wider track, a figure eight of five stops, the upper loop round the pit
    const loop = (cx: number, cy: number, rx: number, ry: number) => path(t => [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry], 0, Math.PI * 2, 0.15);
    const a = loop(31, 9, 6, 4), b = loop(PIT[0], PIT[1], 8, 6);
    lay(v, a, 4); lay(v, b, 4);
    train(v, b, 10, 4, 'redDark', 2, 'black');
  }
  if (T('monster-stop')) {
    // an ordinary stop: a cave mouth off the line, slime inside, barn doors beside it
    v.chunk = 2; v.box(20, 21, 1, 25, 23, 8, 'stoneDark'); v.chunk = 1;
    v.box(21, 23, 1, 23, 23, 4, 'void'); v.box(20, 23, 5, 24, 23, 5, 'stone'); torch(v, 25, 24, 4);
    for (const [x, y] of [[21, 24], [23, 24]]) v.set(x, y, 1, 'slime');
    v.box(24, 23, 1, 25, 23, 3, 'woodDark');
  }
  if (T('pooka-door')) {
    v.chunk = 2; v.box(28, 21, 1, 33, 23, 8, 'stoneDark'); v.chunk = 1;
    v.box(30, 23, 1, 31, 23, 4, 'woodDark'); v.set(30, 23, 3, 'metalDark'); v.box(29, 23, 5, 32, 23, 5, 'stone');
    for (let x = 28; x <= 33; x++) v.set(x, 24, 1, x % 2 ? 'slime' : 'pink');
    v.col(33, 24, 1, 3, 'portal');
  }
  if (T('crew-portal')) { v.chunk = 2; v.box(36, 21, 1, 41, 23, 8, 'stoneDark'); v.chunk = 1; v.box(37, 23, 1, 40, 23, 5, 'portal'); v.box(36, 23, 6, 41, 23, 6, 'stone'); lamp(v, 42, 24, 1); }

  /* ---- the pit at the heart of the knot ---- */
  if (T('abyss')) {
    const r = rng(405);
    disc(v, PIT[0], PIT[1], 5.5, 4.5, -6, 20, () => null);
    ring(v, PIT[0], PIT[1], 6.5, 1.5, -7, 2, (_x, _y, z) => (z > -6 && r() < 0.1 ? 'portal' : 'stoneDark'));
    disc(v, PIT[0], PIT[1], 5.5, 4.5, -7, -7, () => (r() < 0.05 ? 'flame' : r() < 0.25 ? 'ember' : r() < 0.6 ? 'black' : 'redDark'));
    for (let i = 0; i < 4; i++) { const x = PIT[0] - 3 + Math.floor(r() * 5), y = PIT[1] - 2 + Math.floor(r() * 4); v.box(x, y, -6, x + 2, y + 1, -5, r() < 0.5 ? 'red' : 'blue'); }
    ring(v, PIT[0], PIT[1], 6.6, 1, 3, 3, (x, y) => ((x + y) % 3 ? 'metalDark' : 'metal'));   // the catwalk
    v.box(PIT[0] + 1, PIT[1] - 2, -2, PIT[0] + 3, PIT[1] - 1, 0, 'blue'); v.set(PIT[0] + 2, PIT[1] - 1, 0, 'window');   // a car tumbling out of a portal
  }

  /* ---- the trainyard, its substation, the mimic, the god ---- */
  if (T('trainyard-e')) {
    site(YARD.x0, YARD.y0, YARD.x1, YARD.y1, 'tile');
    for (const [x, y] of line(YARD.x0, YARD.y0, YARD.x1, YARD.y0)) v.col(x, y, 1, 2, 'metal');
    disc(v, 53, 16, 3.5, 3.5, 1, 1, 'metalDark'); lay(v, line(50, 16, 56, 16), 1);
    for (const x of [50, 56]) lay(v, line(x, YARD.y0 + 2, x, YARD.y1), 1);
    v.box(48, 6, 8, 57, 8, 8, 'roofGreen'); for (const x of [48, 57]) v.col(x, 8, 1, 7, 'woodDark');   // the service-bay awning
    train(v, line(56, 9, 56, 25), 1, 1, 'blue');
    for (const [x, y] of [[48, 13], [48, 22]]) { v.col(x, y, 1, 5, 'woodDark'); v.set(x, y, 6, 'flame'); }
    for (const x of [50, 55]) v.col(x, YARD.y1, 1, 9, 'metalDark');   // the pair of huge gates
  }
  if (T('substation')) { site(49, 27, 54, 30); v.chunk = 2; v.box(49, 27, 1, 53, 29, 6, 'stone'); v.chunk = 1; for (const [x, z] of [[50, 3], [52, 5], [51, 7]]) { v.set(x, 30, z, 'flame'); v.set(x, 30, z - 1, 'ember'); } }
  if (T('mimic-433')) { site(43, 25, 47, 29, 'wood'); v.chunk = 2; v.box(43, 25, 1, 46, 27, 6, 'red'); v.chunk = 1; v.box(44, 27, 2, 45, 27, 3, 'white'); v.set(44, 26, 7, 'flame'); }
  if (T('mimic-yard')) { disc(v, 53, 19, 3.5, 2.5, 2, 4, 'redDark'); disc(v, 53, 19, 2.4, 1.6, 5, 6, 'red'); for (const x of [51, 53, 55]) v.set(x, 21, 3, 'white'); }
  if (T('death-challenge')) {
    const [x0, y0] = [52, 22];
    v.box(x0 - 2, y0 - 1, 1, x0 + 2, y0 + 1, 5, 'metalDark');
    for (const [dx, dy] of [[-2, -1], [2, -1], [-2, 1], [2, 1]]) v.col(x0 + dx, y0 + dy, 1, 4, 'black');
    v.box(x0 - 2, y0 - 1, 6, x0, y0 + 1, 12, 'metalDark'); v.box(x0 - 2, y0 - 1, 13, x0 - 1, y0, 14, 'metal'); v.set(x0 - 1, y0 + 1, 13, 'ember');
    v.box(x0 - 4, y0, 9, x0 - 3, y0, 13, 'metal'); v.box(x0 - 5, y0, 13, x0 - 3, y0, 15, 'black');
  }

  /* ---- the stairwell room on the employee line, its sisters, the collapse ---- */
  if (T('employee-line')) lay(v, line(14, 3, YARD.x0 + 2, 3), 2, 4);
  if (T('stairwell-room')) {
    disc(v, SR[0], SR[1], 5.5, 4.5, 1, 20, () => null); disc(v, SR[0], SR[1], 5.5, 4.5, 0, 0, 'tile');
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2, x = Math.round(SR[0] + Math.cos(a) * 3.2), y = Math.round(SR[1] + Math.sin(a) * 2.6); v.set(x, y, 0, 'void'); for (let z = 1; z <= 11; z++) v.set(x, y, z, 'beam'); }
    torch(v, SR[0] + 5, SR[1] + 3, 1);
  }
  if (T('boss-stations')) for (const [x, y, k] of [[19, 7, 0], [32, 2, 1], [36, 28, 2]] as const) {
    v.clear(x - 2, y - 2, 1, x + 2, y + 2, 20); disc(v, x, y, 2.4, 2.4, 0, 0, 'tile'); ring(v, x, y, 2.6, 1, 1, 2, 'stone');
    if (k < 2) { v.set(x, y, 1, 'portal'); v.set(x, y, 2, 'accentGlow'); } else disc(v, x, y, 1.4, 1.2, 1, 2, 'redDark');
  }
  if (T('krakaren-24')) { const r = rng(403); for (let i = 0; i < 12; i++) v.col(17 + Math.floor(r() * 5), 6 + Math.floor(r() * 3), 1, 1 + Math.floor(r() * 3), r() < 0.5 ? 'pink' : 'red'); }
  if (T('collapse')) { disc(v, SR[0], SR[1], 3.2, 2.6, -5, 1, () => null); for (const [x, y] of [[SR[0] - 1, SR[1]], [SR[0] + 1, SR[1] + 1]]) v.col(x, y, -5, -3, 'stone'); }

  /* ---- seen from above, and the line below it ---- */
  if (T('logo')) for (const [r0, m] of [[17, 'accent'], [12, 'red'], [8, 'blue']] as const) for (let a = 0; a < Math.PI * 2; a += 0.01) {
    const x = Math.round(PIT[0] - 12 + Math.cos(a) * r0), y = Math.round(PIT[1] + 6 + Math.sin(a) * r0 * 0.75), g = ground(v, x, y, 24);
    const top = v.get(x, y, g);
    if (top && top.startsWith('stone')) v.set(x, y, g, m);
  }
  if (T('twin-line')) {
    // under the Red Line, the same line upside down: rails below the sleepers, a carriage hanging from them
    for (let x = 10; x <= 26; x++) { v.set(x, D - 3, -6, 'woodDark'); v.set(x, D - 4, -7, 'rail'); v.set(x, D - 2, -7, 'rail'); }
    v.box(13, D - 4, -11, 21, D - 2, -9, 'red'); v.box(13, D - 4, -8, 21, D - 2, -8, 'roofGreen');
    for (let x = 14; x < 21; x += 2) v.set(x, D - 2, -10, 'window');
  }

  /* ---- the hero picture only: the Death Challenge, and the Nightmare's last run ----
     Grull, four storeys of war god, stands in Trainyard E over the Mimic Rex he
     has split in two (3:33), and the jet-black Nightmare Express goes nose first
     into the burning pit to blow the generators (3:34). */
  if (shown.has('hero')) {
    v.tag = 'death-challenge';
    const [GX, GY] = [52, 15];
    // the mimic's two halves, either side of him
    for (const [dx, dy] of [[-4, 8], [2, -7]]) { disc(v, GX + dx, GY + dy, 2.6, 2.2, 1, 3, 'redDark'); disc(v, GX + dx, GY + dy, 1.8, 1.4, 4, 4, 'red'); v.set(GX + dx, GY + dy + 2, 2, 'white'); v.set(GX + dx + 1, GY + dy + 2, 3, 'white'); }
    // four storeys of war god in iron, gold at the edges, facing the yard's mouth
    v.chunk = 2;
    for (const dx of [-3, 1]) v.box(GX + dx, GY - 1, 1, GX + dx + 1, GY + 1, 11, 'metalDark');            // legs
    v.box(GX - 4, GY - 1, 1, GX - 3, GY + 2, 2, 'black'); v.box(GX + 1, GY - 1, 1, GX + 2, GY + 2, 2, 'black');   // boots
    v.box(GX - 4, GY - 2, 12, GX + 3, GY + 1, 13, 'woodDark');                                             // the belt
    v.box(GX - 4, GY - 2, 14, GX + 3, GY + 1, 23, 'metalDark');                                           // the chest
    v.box(GX - 7, GY - 2, 22, GX + 6, GY + 1, 25, 'metal');                                               // the shoulders
    v.chunk = 1;
    for (let x = GX - 4; x <= GX + 3; x++) v.set(x, GY + 2, 13, 'brick');
    for (let i = 0; i < 8; i++) v.set(GX - 4 + i, GY + 2, 15 + i, 'brick');   // a gold baldric across the iron
    for (const dx of [-7, 6]) v.box(GX + dx, GY - 1, 12, GX + dx + 1, GY + 1, 21, 'dirt');                   // bare arms
    v.box(GX + 6, GY - 1, 9, GX + 8, GY + 2, 11, 'black');                                                 // the spiked fist
    for (const [dx, dz] of [[9, 10], [7, 12], [8, 8]]) v.set(GX + dx, GY + 1, dz, 'metal');
    v.box(GX - 8, GY - 1, 9, GX - 6, GY + 1, 11, 'metalDark');
    v.box(GX - 2, GY - 2, 26, GX + 1, GY + 1, 30, 'stoneDark');                                            // the helm
    v.box(GX - 2, GY + 2, 27, GX + 1, GY + 2, 29, 'black'); v.set(GX - 1, GY + 2, 28, 'laser'); v.set(GX + 0, GY + 2, 28, 'laser');   // the eye slit
    for (const dx of [-3, 2]) { v.box(GX + dx, GY, 30, GX + dx, GY, 32, 'bone'); v.set(GX + dx + (dx < 0 ? -1 : 1), GY, 33, 'bone'); }   // horns
    // the Nightmare, diving into the pit: a black engine nose down, its cars tilting after it
    v.tag = 'abyss';
    for (let i = 0; i < 16; i++) {
      const x = PIT[0] - 4 + Math.round(i * 0.25), y = PIT[1] + Math.round(i * 0.5) - 3, z = -4 + Math.round(i * 0.9);
      v.box(x, y, z, x + 2, y + 1, z + 2, i < 5 ? 'black' : i % 5 === 4 ? 'black' : 'redDark');
      if (i >= 5 && i % 2) v.set(x + 2, y, z + 1, 'window');
    }
    v.set(PIT[0] - 3, PIT[1] - 4, -3, 'window');
    const r = rng(406);
    for (let i = 0; i < 7; i++) { const a = r() * Math.PI * 2, d = r() * 4.5; v.set(Math.round(PIT[0] + Math.cos(a) * d), Math.round(PIT[1] + Math.sin(a) * d * 0.8), -6 + Math.floor(r() * 9), r() < 0.6 ? 'flame' : 'ember'); }
  }
  return v;
}

const anchors: VoxelMap['anchors'] = {
  noodles: [HIGH[14][0], HIGH[14][1], 11], 'station-83': [11, 21, 9], 'nightmare-loop': [31, 13, 5], 'monster-stop': [22, 23, 4],
  'pooka-door': [30, 23, 3], 'crew-portal': [38, 23, 4], abyss: [PIT[0], PIT[1], -6], 'trainyard-e': [53, 16, 2],
  substation: [51, 28, 6], 'mimic-433': [44, 26, 7], 'mimic-yard': [53, 19, 6],
  'stairwell-room': [SR[0], SR[1], 2], 'employee-line': [30, 3, 3], 'boss-stations': [32, 2, 2], 'krakaren-24': [19, 7, 3],
  logo: [PIT[0] - 12, PIT[1] + 6 + 12, 1], 'twin-line': [17, D - 2, -10], collapse: [SR[0], SR[1], -3], 'death-challenge': [50, 22, 14],
};

export const FLOOR_4_VOXEL: VoxelMap = { build, anchors };
export const buildFloor4 = build;

/** The tile: the knot as it stands when its picture opens (3:2): the rock, the
    three lines and their trains, and transfer station 83. */
export const TILE_4_LAYERS = ['noodles', 'station-83'];
/** The hero picture, once the floor is finished: the Death Challenge in Trainyard E
    and the Nightmare Express going into the pit (3:33-3:34). */
export const HERO_4_LAYERS = ['noodles', 'station-83', 'nightmare-loop', 'monster-stop', 'pooka-door', 'abyss', 'trainyard-e', 'substation', 'employee-line', 'boss-stations', 'collapse', 'hero'];
