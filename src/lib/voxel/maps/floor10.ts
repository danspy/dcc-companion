import { Vox, rng, slab, line, house, disc, torch } from '../vox.ts';
import type { VoxelMap } from './index.ts';

/* Floor 10's page map, composed as one diorama: a cave on a floating island,
   ringed by rust-streaked stalagmites, the team garage at the back with its
   roll-up door up, and the gun truck nosed out of it onto black asphalt that
   winds away to a tunnel mouth in the cave wall. That island is the floor in
   every state; everything else arrives as its own island round it, each with
   its layer, so a layer not reached is simply air:

   - the left island is the course, and it changes heat by heat (the manatee
     caves, the hail hills, the descent, the jungle, the factory, the L'Engle
     building);
   - behind, the finish arch; to the right, home: the roundabout under its red
     sun, the portal and the neon village behind it; at the back left, the pit
     stop and the water park.

   The tile (tiles/floor10.ts) is this same scene at its artAt, and the hero
   picture is the cave and the factory at the ceiling run, the truck upside
   down over the molten steel. */

/* ---- the kit ---- */

const rib = (i: number) => (i % 3 ? 'metal' : 'metalDark');
const cell = (x: number, y: number, s: number) => { let h = ((x >> 1) * 73856093) ^ ((y >> 1) * 19349663) ^ s; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

type Put = (u: number, w: number, z: number, m: string) => void;
/** Draw something in its own frame: u runs back to front, w across, z up. */
export function placer(v: Vox, x: number, y: number, z: number, dir: 'x' | 'y' | '-y', flip = false): Put {
  const Z = (zz: number) => (flip ? z - zz : z + zz);
  if (dir === 'x') return (u, w, zz, m) => v.set(x + u, y + w, Z(zz), m);
  if (dir === 'y') return (u, w, zz, m) => v.set(x + w, y + u, Z(zz), m);
  return (u, w, zz, m) => v.set(x + w, y - u, Z(zz), m);
}
const block = (p: Put, u0: number, w0: number, z0: number, u1: number, w1: number, z1: number, m: string) => {
  for (let u = u0; u <= u1; u++) for (let w = w0; w <= w1; w++) for (let z = z0; z <= z1; z++) p(u, w, z, m);
};

/** The Big Shot Chicken food truck (8:2), drawn big: a purple-and-black box
    body with its serving hatch, a faux-1920s cab and long hood, a chrome grille
    and round headlamps, fat tyres, and the tommy gun on the roof. 15 x 7. */
export function foodTruck(p: Put) {
  const wheel = (u: number, w: number) => { for (let du = 0; du <= 2; du++) for (let dz = 0; dz <= 2; dz++) p(u + du, w, dz, 'black'); p(u + 1, w, 1, 'accent'); };
  for (const u of [0, 3, 11]) for (const w of [0, 6]) wheel(u, w);
  block(p, 0, 1, 1, 14, 5, 2, 'black');                                       // the chassis
  block(p, 0, 0, 3, 9, 6, 3, 'black'); block(p, 0, 0, 4, 9, 6, 9, 'accent');  // the box body
  block(p, 0, 0, 9, 9, 6, 9, 'accent');
  block(p, 3, 6, 5, 7, 6, 6, 'metalDark'); block(p, 2, 6, 7, 8, 6, 7, 'rail');  // the hatch and its awning
  p(4, 6, 5, 'window'); p(6, 6, 5, 'window');
  for (const w of [0, 6]) block(p, 0, w, 8, 9, w, 8, 'black');                 // a black stripe round the box
  block(p, 0, 0, 6, 0, 6, 7, 'metalDark');                                     // the back doors
  block(p, 10, 0, 3, 11, 6, 8, 'black'); block(p, 10, 0, 9, 11, 6, 9, 'black'); block(p, 10, 0, 6, 11, 0, 7, 'glass'); block(p, 10, 6, 6, 11, 6, 7, 'glass');
  block(p, 11, 1, 6, 11, 5, 7, 'glass');                                       // the windscreen
  block(p, 12, 1, 3, 14, 5, 5, 'black');                                       // the hood
  for (const w of [0, 6]) { block(p, 11, w, 2, 14, w, 3, 'black'); p(14, w, 4, 'rail'); }  // fenders, running boards
  block(p, 14, 2, 2, 14, 4, 5, 'rail'); p(14, 3, 6, 'rail');                   // the grille
  for (const w of [1, 5]) { p(14, w, 5, 'window'); p(15, w, 5, 'window'); }    // the headlamps
  // the tommy gun: a mount, the drum, a long barrel out over the cab, the stock
  block(p, 3, 2, 10, 6, 4, 10, 'metalDark');
  for (const [du, dz] of [[0, 1], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [3, 1]]) for (const w of [1, 5]) p(3 + du, w, 11 + dz, 'metal');  // the drum, side on
  block(p, 4, 2, 12, 5, 4, 13, 'metalDark');
  block(p, 6, 3, 13, 17, 3, 13, 'metal'); block(p, 6, 2, 12, 9, 4, 13, 'metalDark'); p(17, 3, 14, 'metal');
  block(p, 0, 3, 12, 2, 3, 13, 'wood'); p(8, 3, 11, 'wood'); p(9, 3, 11, 'wood'); p(9, 3, 10, 'wood');
}

/** Rust-streaked stalagmites: big blocks low down, a thin tip. */
export function spike(v: Vox, x: number, y: number, z: number, h: number, seed: number) {
  const r = rng(seed);
  const lo = Math.max(2, Math.floor(h * 0.55) & ~1);
  v.chunk = 2;
  for (let zz = 0; zz < lo; zz++) v.box(x, y, z + zz, x + 1, y + 1, z + zz, (((zz >> 1) + seed) % 3 === 0) ? 'dirt' : 'stone');
  v.chunk = 1;
  const tx = x + (r() < 0.5 ? 0 : 1), ty = y + (r() < 0.5 ? 0 : 1);
  for (let zz = lo; zz < h; zz++) v.set(tx, ty, z + zz, zz === h - 1 ? 'stone' : zz % 3 === 1 ? 'dirt' : 'stone');
}
/** A cave rim: a row of stalagmites along a run of cells, tall or short. */
function rim(v: Vox, cells: [number, number][], z: number, lo: number, hi: number, seed: number, step = 2) {
  const r = rng(seed);
  cells.forEach(([x, y], i) => { if (i % step === 0 && r() < 0.92) spike(v, x & ~1, y & ~1, z, lo + Math.floor(r() * (hi - lo + 1)), seed + i); });
}
/** A road: black asphalt `r` either side of the line, yellow dashes down the middle. */
export function road(v: Vox, pts: [number, number][], r: number, z = 0) {
  v.chunk = 2;
  pts.forEach(([x, y]) => { for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) if (v.get(x + dx, y + dy, z) !== 'brick' && v.has(x + dx, y + dy, z)) { v.set(x + dx, y + dy, z, 'black'); v.clear(x + dx, y + dy, z + 1, x + dx, y + dy, z + 14); } });
  v.chunk = 1;
  pts.forEach(([x, y], i) => { if (i % 5 < 2) v.set(x, y, z, 'brick'); });
}
/** A smooth road through control points: a Catmull-Rom curve, walked cell by cell. */
function curve(ctrl: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  const P = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  for (let i = 1; i < P.length - 2; i++) for (let t = 0; t < 1; t += 0.05) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]], t2 = t * t, t3 = t2 * t;
    const c = (k: 0 | 1) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
    const pt: [number, number] = [Math.round(c(0)), Math.round(c(1))];
    const last = out[out.length - 1];
    if (last && last[0] === pt[0] && last[1] === pt[1]) continue;
    if (last) out.push(...line(last[0], last[1], pt[0], pt[1]).slice(1)); else out.push(pt);
  }
  return out;
}
const ell = (v: Vox, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, m: string | ((x: number, y: number, z: number) => string)) => {
  for (let a = Math.floor(cx - rx); a <= cx + rx; a++) for (let b = Math.floor(cy - ry); b <= cy + ry; b++) for (let c = Math.floor(cz - rz); c <= cz + rz; c++)
    if (((a - cx) / rx) ** 2 + ((b - cy) / ry) ** 2 + ((c - cz) / rz) ** 2 <= 1) v.set(a, b, c, typeof m === 'string' ? m : m(a, b, c));
};

/* ---- the layout ---- */

const CORE = [20, 16, 52, 47] as const;    // the cave island: x0 y0 x1 y1
const GA = [21, 17, 31, 28] as const;      // the garage, in the back corner
const DOOR = [23, 29] as const;            // its roll-up door, in the front wall
const TRUCK = [29, 38] as const;           // the truck's rear corner; it points +x
const GRID = 45;                           // the start line, across the road ahead of it
const TUN = [47, 16] as const;             // the tunnel mouth in the back wall
const ROAD = curve([[26, 30], [26, 36], [30, 41], [46, 41], [49, 36], [49, 26], [TUN[0], TUN[1] + 7]]);
const LEFT = [0, 22, 16, 52] as const;     // the course island, heat by heat
const PIT = [0, 3, 16, 19] as const;       // the pit stop island
const FIN = [26, 1, 48, 14] as const, FZ = 4, FA = [37, 8] as const;   // the finish island and its arch
const HOME = [54, 25, 73, 47] as const, HZ = -2, RB = [63.5, 37] as const;
const VIL = [55, 5, 72, 21] as const;      // the neon village

function build(shown: Set<string>): Vox {
  const v = new Vox();
  const has = (id: string) => shown.has(id);
  const T = (id: string) => { v.tag = id; return has(id); };

  /* ---- the cave, in every state: dark rock, a rim of stalagmites, torches ---- */
  v.tag = '';
  const [cx0, cy0, cx1, cy1] = CORE;
  slab(v, cx0, cy0, cx1, cy1, 0, { depth: 9, seed: 1001, crust: 'stoneDark', under: ['dirt', 'dirtDark'],
    shape: (x, y) => !(x >= cx1 - 3 && y >= cy1 - 3) && !(x <= cx0 + 1 && y >= cy1 - 4) && !(x >= cx1 - 1 && y <= cy0 + 5) && !(y >= cy1 - 1 && x >= 36 && x <= 41) && !(x >= cx1 - 1 && y >= 28 && y <= 31),
    top: (x, y) => (cell(x, y, 3) < 0.28 ? 'stone' : cell(x, y, 4) < 0.08 ? 'dirt' : 'stoneDark') });
  // a loose block drifting off the front corner
  slab(v, cx1 + 2, cy1 - 8, cx1 + 5, cy1 - 5, -5, { depth: 4, seed: 1002, crust: 'stoneDark', top: 'stoneDark' });
  spike(v, cx1 + 2, cy1 - 8, -4, 4, 77);
  rim(v, line(GA[2] + 1, cy0, TUN[0] - 4, cy0), 1, 9, 15, 1006);            // the back wall, tall
  rim(v, line(GA[2] + 1, cy0 + 2, TUN[0] - 4, cy0 + 2), 1, 4, 8, 1016, 4);
  rim(v, line(cx0, GA[3] + 2, cx0, cy1 - 5), 1, 7, 13, 1007);               // the left wall
  rim(v, line(cx0 + 2, GA[3] + 3, cx0 + 2, cy1 - 7), 1, 3, 6, 1017, 4);
  rim(v, line(cx1 - 1, cy0 + 6, cx1 - 1, cy1 - 5), 1, 3, 7, 1009, 3);       // the right edge, broken low
  rim(v, line(cx0 + 3, cy1 - 1, cx1 - 5, cy1 - 1).filter(([x]) => x < 26 || x > 47), 0, 2, 4, 1010, 3);
  // stalagmites standing in the middle of the cave, and torches on them
  for (const [x, y, h] of [[34, 22, 11], [38, 20, 8], [41, 25, 13], [36, 28, 7], [32, 32, 5], [44, 31, 9], [40, 34, 4], [45, 21, 6], [29, 33, 3], [33, 43, 4], [40, 44, 3], [47, 38, 5], [49, 28, 6], [26, 34, 4]] as const) spike(v, x, y, 1, h, x * 7 + y);
  for (const [x, y, z] of [[36, 17, 8], [42, 17, 9], [21, 33, 7], [21, 40, 6], [37, 30, 6], [46, 33, 6]] as const) torch(v, x, y, z);
  disc(v, 38.5, 31, 2.2, 1.6, 0, 0, 'waterDeep');
  // the tunnel mouth: a block of rock with a black arch, a torch either side
  v.chunk = 2; v.box(TUN[0] - 4, TUN[1], 1, TUN[0] + 3, TUN[1] + 3, 12, (x, _y, z) => (cell(x, z, 5) < 0.35 ? 'dirt' : 'stone')); v.chunk = 1;
  v.box(TUN[0] - 2, TUN[1] + 3, 1, TUN[0] + 1, TUN[1] + 3, 6, 'void'); v.box(TUN[0] - 1, TUN[1] + 3, 7, TUN[0], TUN[1] + 3, 7, 'void');
  torch(v, TUN[0] - 3, TUN[1] + 4, 4); torch(v, TUN[0] + 2, TUN[1] + 4, 4);

  if (T('caption')) {
    slab(v, cx0 - 1, cy1 + 1, cx0 + 8, cy1 + 4, -2, { depth: 3, seed: 1003, crust: 'stoneDark', top: (x, y) => ((x + y) % 2 ? 'white' : 'black'), chunk: 1 });
  }

  /* ---- the garage: checkered floor, corrugated walls cut down at the front, chain pulley, the door up ---- */
  if (T('garage')) {
    const [x0, y0, x1, y1] = GA, h = 9;
    v.box(x0, y0, 0, x1, y1, 0, (x, y) => ((x + y) % 2 ? 'white' : 'black'));
    for (let x = x0; x <= x1; x++) { v.col(x, y0, 1, h, rib(x)); v.set(x, y0, h + 1, 'stoneDark'); }
    for (let y = y0; y <= y1; y++) { v.col(x0, y, 1, h, rib(y)); v.set(x0, y, h + 1, 'stoneDark'); v.col(x1, y, 1, 2, rib(y)); }
    for (let x = x0; x <= x1; x++) v.col(x, y1, 1, 2, rib(x));
    for (let x = x0 + 2; x < x1 - 1; x += 4) v.set(x, y0 + 1, h - 1, 'window');
    for (let y = y0 + 3; y < y1; y += 4) v.set(x0 + 1, y, h - 1, 'window');
    for (const [x, y] of [...line(x0 + 1, y0 + 1, x1 - 1, y1 - 1), ...line(x1 - 1, y0 + 1, x0 + 1, y1 - 1)]) v.set(x, y, h, 'metalDark');
    v.col(x0 + 6, y0 + 5, 5, h - 1, 'metalDark'); v.set(x0 + 6, y0 + 5, 4, 'rail');
    // the door frame in the front wall, the roll-up door raised under its lintel
    const [d0, d1] = [DOOR[0], DOOR[0] + 6];
    for (const x of [d0 - 1, d1 + 1]) v.col(x, y1, 1, 8, 'stoneDark');
    v.box(d0 - 1, y1, 9, d1 + 1, y1, 9, 'stoneDark');
    v.clear(d0, y1, 1, d1, y1, 6);
    v.box(d0, y1, 7, d1, y1, 8, (_x, _y, z) => (z % 2 ? 'rail' : 'metal'));
    // a workbench and a tyre stack inside
    v.box(x0 + 1, y0 + 1, 1, x0 + 4, y0 + 1, 2, 'wood'); v.set(x0 + 2, y0 + 1, 3, 'metal');
    v.col(x1 - 2, y0 + 2, 1, 3, 'black');
  }

  /* ---- heat one's start: the road out of the garage, the line, the truck on it ---- */
  if (T('start-road')) {
    road(v, ROAD, 3);
    for (let y = 39; y <= 43; y++) for (const x of [GRID, GRID + 1]) v.set(x, y, 0, (x + y) % 2 ? 'white' : 'black');
    foodTruck(placer(v, TRUCK[0], TRUCK[1], 0, 'x'));
    // headlight beams on the asphalt ahead
    for (let k = 1; k <= 3; k++) for (const w of [1, 5]) v.set(TRUCK[0] + 15 + k, TRUCK[1] + w, 1, 'beam');
  }

  /* ---- the course island: whichever heat is running ---- */
  const course = ['manatee-caves', 'hail-hills', 'descent', 'jungle', 'factory', 'lengle'].find(has);
  if (course) {
    v.tag = course;
    const [x0, y0, x1, y1] = LEFT;
    slab(v, x0, y0, x1, y1, 0, { depth: 8, seed: 1020, crust: 'stoneDark', under: ['dirt', 'dirtDark'],
      shape: (x, y) => !(x <= x0 + 2 && y >= y1 - 3) && !(x >= x1 - 2 && y <= y0 + 2),
      top: course === 'hail-hills' || course === 'jungle' ? (x, y) => (cell(x, y, 4) < 0.3 ? 'leafLight' : 'grass') : (x, y) => (cell(x, y, 3) < 0.3 ? 'stone' : 'stoneDark') });
  }
  if (T('manatee-caves')) {
    rim(v, line(0, 22, 16, 22), 1, 7, 13, 1021); rim(v, line(0, 24, 0, 50), 1, 5, 11, 1022);
    // the cave the road dives into, at the back
    v.chunk = 2; v.box(8, 22, 1, 15, 25, 11, (x, _y, z) => (cell(x, z, 9) < 0.35 ? 'dirt' : 'stone')); v.chunk = 1;
    v.box(10, 25, 1, 13, 25, 6, 'void'); v.box(11, 25, 7, 12, 25, 7, 'void'); torch(v, 9, 26, 3); torch(v, 14, 26, 3);
    road(v, curve([[16, 37], [13, 34], [12, 29], [11.5, 26]]), 2);
    // a black pool, and a Screeching Death Manatee the size of a house bursting out of it
    disc(v, 6, 41, 6, 8.5, 0, 0, 'waterDeep'); disc(v, 6.5, 41, 4, 6.5, 0, 0, 'water');
    manatee(v, 3, 47, 1);
    const r = rng(1012); for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2; v.set(Math.round(7 + Math.cos(a) * (3 + r() * 4)), Math.round(42 + Math.sin(a) * (4 + r() * 5)), 1 + Math.floor(r() * 4), r() < 0.6 ? 'white' : 'glass'); }
  }
  if (T('hail-hills')) {
    const hz = (x: number, y: number) => Math.max(0, Math.round(1.6 * Math.sin(y / 4) + Math.cos(x / 3) + 1));
    v.chunk = 2; for (let x = 1; x <= 15; x++) for (let y = 23; y <= 51; y++) if (v.has(x, y, 0)) v.box(x, y, 1, x, y, hz(x, y), (_a, _b, z) => (z === hz(x, y) ? 'grass' : 'leaf')); v.chunk = 1;
    for (const x0 of [4, 11]) for (let y = 23; y <= 51; y++) { const x = x0 + Math.round(Math.sin(y / 5 + x0)); for (const d of [0, 1]) v.set(x + d, y, hz(x + d, y), y % 4 < 2 && d === 0 ? 'brick' : 'black'); }
    const r = rng(1003);
    for (let i = 0; i < 14; i++) { const x = 1 + Math.floor(r() * 14), y = 23 + Math.floor(r() * 28); v.set(x, y, hz(x, y) + 1 + Math.floor(r() * 7), 'white'); }
    for (let x = 0; x <= 16; x++) for (let y = 22; y <= 52; y++) if (r() < 0.3) v.set(x, y, 16 + Math.floor(r() * 2), 'stoneDark');
  }
  if (T('kangaroos')) for (const x of [4, 11]) {
    const y = 36, z = 4;
    v.box(x, y, z, x + 1, y + 2, z + 5, 'dirt'); v.box(x, y + 1, z + 6, x + 1, y + 2, z + 7, 'dirt'); v.set(x, y + 3, z + 6, 'dirtDark');
    for (let k = z + 1; k <= z + 6; k += 2) v.set(x - 1, y + 1, k, 'bone'); v.set(x, y + 2, z + 8, 'bone'); v.box(x, y - 3, z, x, y - 1, z, 'dirt');
  }
  if (T('descent')) {
    const dz = (y: number) => Math.max(1, Math.round((50 - y) / 2.4));
    for (let y = 23; y <= 50; y++) for (let x = 3; x <= 13; x++) { v.box(x, y, 1, x, y, dz(y) - 1, 'stoneDark'); v.set(x, y, dz(y), x === 8 && y % 4 < 2 ? 'brick' : x === 3 || x === 13 ? 'stone' : 'black'); }
    const r = rng(1004);
    for (let i = 0; i < 60; i++) { const y = 23 + Math.floor(r() * 26), x = 4 + Math.floor(r() * 9); v.set(x, y, dz(y) + 1, ['red', 'brick', 'blue', 'pink', 'glassTeal'][i % 5]); }
  }
  if (T('kaiju-skull')) {
    ell(v, 8, 48, 3, 5, 3.5, 3.5, 'blue'); ell(v, 8, 48, 6, 3.5, 2.6, 2, 'brick');
    for (const x of [6, 10]) { v.box(x, 51, 3, x, 51, 4, 'void'); v.set(x, 51, 5, 'brick'); }
    for (let x = 3; x <= 13; x += 2) v.set(x, 52, 1, 'white');
  }
  if (T('jungle')) {
    const r = rng(1005);
    for (const [x, y] of line(15, 37, 3, 24)) for (const d of [0, 1]) v.set(x, y + d, 0, 'dirt');
    for (let i = 0; i < 18; i++) { const x = 1 + Math.floor(r() * 14), y = 23 + Math.floor(r() * 28); if (v.get(x, y, 0) === 'dirt') continue; jungleTree(v, x, y, 1, 3 + Math.floor(r() * 5), i % 2 ? 'leaf' : 'lichen'); }
    disc(v, 9, 31, 2.5, 2.5, 1, 4, 'glass');
    for (let i = 0; i < 40; i++) v.set(Math.floor(r() * 16), 22 + Math.floor(r() * 30), 6 + Math.floor(r() * 10), r() < 0.5 ? 'beam' : 'mist');
  }
  if (T('factory')) {
    // a corrugated hall, open at the front, red inside: the melting vats, a conveyor climbing to them, heaps of metal spheres
    v.chunk = 2;
    v.box(0, 22, 1, 1, 52, 16, 'metalDark'); v.box(0, 22, 1, 16, 23, 16, 'metalDark');
    v.chunk = 1;
    for (let y = 24; y <= 52; y += 4) v.col(2, y, 1, 16, 'metal');
    for (let x = 2; x <= 16; x += 4) v.col(x, 24, 1, 16, 'metal');
    for (let y = 26; y <= 50; y += 8) { v.set(2, y + 2, 12, 'ember'); v.set(2, y + 2, 13, 'ember'); }
    for (const x of [5, 11]) { ell(v, x + 1.5, 26.5, 3, 2.4, 2.4, 2.6, 'metalDark'); disc(v, x + 1.5, 26.5, 1.8, 1.8, 6, 6, 'ember'); v.set(x + 1, 26, 7, 'flame'); v.set(x + 2, 27, 7, 'flame'); }
    for (let i = 0; i < 9; i++) { v.set(3, 36 - i, 1 + i, 'rail'); v.set(4, 36 - i, 1 + i, 'metalDark'); }   // the conveyor up the wall to the vats
    const r = rng(1015); for (let i = 0; i < 18; i++) { const x = 12 + Math.floor(r() * 4), y = 24 + Math.floor(r() * 6); v.set(x, y, 1 + (v.has(x, y, 1) ? 1 : 0), r() < 0.5 ? 'metal' : 'rail'); }
  }
  if (T('molten-river')) {
    // a river of molten steel down the hall, in a channel
    for (let y = 24; y <= 52; y++) for (let x = 5; x <= 9; x++) v.set(x, y, 0, (x * 5 + y * 3) % 11 ? 'ember' : 'flame');
    v.box(4, 24, 1, 4, 52, 1, 'metalDark'); v.box(10, 24, 1, 10, 52, 1, 'metalDark');
    // the ceiling track: two channels down the hall at the height of its roof, held off the wall by girders
    for (let y = 24; y <= 52; y++) { v.set(4, y, 17, 'rail'); v.set(10, y, 17, 'rail'); }
    for (const y of [25, 50]) v.box(0, y, 17, 12, y, 17, 'metal');
    for (let y = 29; y <= 47; y += 6) v.box(0, y, 17, 3, y, 17, 'metal');
    for (const [y, c] of [[25, 'pink']] as const) { block(placer(v, 6, y, 16, 'y', true), 0, 0, 1, 4, 2, 2, c); v.set(7, y + 4, 14, 'window'); }
  }
  if (T('lengle')) {
    // seven storeys cut open down the near sides: shrunken apartments, a lamp in each, the hallway along the front, the lift shaft
    const [x0, y0, x1, y1] = [2, 24, 14, 48];
    const rugs = ['roofRed', 'blue', 'leaf', 'pink', 'brick', 'purple'];
    for (let s = 0; s < 7; s++) {
      const z = 1 + s * 3;
      v.box(x0, y0, z - 1, x1, y1, z - 1, (x, y) => (x >= x1 - 2 ? 'tile' : rugs[(Math.floor((y - y0) / 6) + s) % rugs.length]));
      v.box(x0, y0, z, x0, y1, z + 1, 'plaster'); v.box(x0, y0, z, x1, y0, z + 1, 'plaster');
      for (let y = y0 + 6; y < y1; y += 6) v.box(x0, y, z, x1 - 3, y, z + 1, 'stone');
      for (let y = y0 + 3; y < y1; y += 6) { v.set(x0 + 1, y, z + 1, 'window'); v.set(x0 + 4, y - 1, z, 'wood'); }
      v.set(x1 - 1, y0 + 2 + ((s * 7) % 20), z, 'accent');                    // a toy-brick racer in the hallway
    }
    v.box(x0, y0, 21, x1, y1, 21, 'stoneDark');
    v.box(x0 + 1, y0 + 1, 0, x0 + 2, y0 + 2, 21, (_x, _y, z) => (z % 3 === 0 ? 'metalDark' : null));
    v.set(x0 + 1, y0 + 1, 10, 'pink');
  }
  if (T('roof-portals')) { for (const y of [29, 35, 41]) v.box(7, y, 22, 8, y + 1, 24, 'portal'); v.clear(7, 34, 12, 9, 37, 21); }

  /* ---- the pit stop island at the back left ---- */
  const pit = ['upano', 'water-park'].find(has);
  if (pit) {
    v.tag = pit;
    const [x0, y0, x1, y1] = PIT;
    slab(v, x0, y0, x1, y1, 2, { depth: 6, seed: 1030, crust: 'stoneDark', shape: (x, y) => !(x >= x1 - 3 && y >= y1 - 3), top: (x, y) => (cell(x, y, 2) < 0.4 ? 'leaf' : 'grass') });
  }
  if (T('upano')) {
    v.box(2, 4, 3, 15, 6, 3, 'black');
    v.col(5, 7, 3, 9, 'accentGlow'); v.col(12, 7, 3, 9, 'accentGlow'); v.box(5, 7, 10, 12, 7, 10, 'laser');
    for (let x = 2; x < 15; x += 4) { v.box(x, 8, 3, x + 2, 10, 5, (xx) => rib(xx)); v.box(x, 8, 6, x + 2, 10, 6, 'stoneDark'); v.box(x, 10, 3, x + 2, 10, 4, 'rail'); }
  }
  if (T('water-park')) {
    for (let z = 3; z <= 15; z++) for (const k of [0, 2.1, 4.2]) v.set(12 + Math.round(Math.cos(z * 0.7 + k) * 2), 14 + Math.round(Math.sin(z * 0.7 + k) * 2), z, 'black');
    v.box(11, 13, 16, 14, 16, 16, 'metalDark');
    disc(v, 6, 15, 4, 2.2, 2, 2, 'water'); v.set(9, 15, 3, 'laser'); v.set(3, 15, 3, 'portal');
  }

  /* ---- the finish: an island behind the cave, roads converging on a checkered arch ---- */
  if (T('finish-arch')) {
    const [x0, y0, x1, y1] = FIN;
    slab(v, x0, y0, x1, y1, FZ, { depth: 7, seed: 1040, crust: 'stoneDark', shape: (x, y) => !(x <= x0 + 2 && y <= y0 + 2) && !(x >= x1 - 3 && y >= y1 - 1), top: (x, y) => (cell(x, y, 6) < 0.3 ? 'stone' : 'stoneDark') });
    for (const sp of [curve([[28, 3], [33, 6], [FA[0], FA[1]]]), curve([[46, 2], [41, 6], [FA[0], FA[1]]]), curve([[FA[0], FA[1]], [FA[0] + 1, 13]])]) road(v, sp, 1, FZ);
    for (const x of [FA[0] - 4, FA[0] + 4]) v.box(x, FA[1], FZ + 1, x, FA[1], FZ + 10, (_x, _y, z) => (z % 2 ? 'white' : 'black'));
    v.box(FA[0] - 4, FA[1], FZ + 11, FA[0] + 4, FA[1], FZ + 12, (x, _y, z) => ((x + z) % 2 ? 'white' : 'black'));
    for (const [bx, s] of [[FA[0] - 7, -1], [FA[0] + 7, 1]] as const) for (let i = 0; i < 3; i++) v.box(bx + s * i, FA[1] - 3, FZ + 1, bx + s * i, FA[1] + 3, FZ + 1 + i * 2, 'metal');
    for (const [bx, s] of [[FA[0] - 10, -1], [FA[0] + 10, 1]] as const) { v.col(bx, FA[1] - 4, FZ + 1, FZ + 7, 'metalDark'); v.set(bx, FA[1] - 4, FZ + 8, 'window'); for (let i = 1; i <= 7; i++) { v.set(bx + s * Math.round(i * 0.5), FA[1] - 4 - i, FZ + 8 + i, 'beam'); v.set(bx + s * Math.round(i * 0.5), FA[1] - 5 - i, FZ + 8 + i, 'beam'); } }
  }

  /* ---- home: the roundabout of garages under a red sun, on its own island to the right ---- */
  const home = ['roundabout', 'roundabout-ten'].find(has);
  if (home) {
    v.tag = home;
    const [x0, y0, x1, y1] = HOME;
    slab(v, x0, y0, x1, y1, HZ, { depth: 7, seed: 1050, crust: 'stoneDark', shape: (x, y) => Math.hypot((x - RB[0]) / 10.5, (y - RB[1]) / 11.5) <= 1, top: (x, y) => (cell(x, y, 8) < 0.25 ? 'leafLight' : 'grass') });
  }
  const roundabout = (n: number, dark: number[]) => {
    disc(v, RB[0], RB[1], 5.6, 5.6, HZ, HZ, 'black'); disc(v, RB[0], RB[1], 2.2, 2.2, HZ, HZ, 'grass'); v.set(Math.round(RB[0]), Math.round(RB[1]), HZ + 1, 'leaf');
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 0.62 + (i / n) * Math.PI * 2, x = Math.round(RB[0] + Math.cos(a) * 8.2), y = Math.round(RB[1] + Math.sin(a) * 8.6);
      for (const [px, py] of line(x, y, Math.round(RB[0] + Math.cos(a) * 5), Math.round(RB[1] + Math.sin(a) * 5))) v.set(px, py, HZ, 'black');
      const off = dark.includes(i);
      house(v, x - 1, y - 1, HZ + 1, 3, 3, 2, off ? 'stoneDark' : i % 2 ? 'roofBlue' : 'roofRed', off ? 'stone' : 'plaster');
      for (let dx = -1; dx <= 1; dx++) v.set(x + dx, y + 1, HZ + 1, off ? 'metalDark' : i === n - 1 ? 'red' : 'rail');
      if (i === n - 1 && !off) { v.set(x, y + 1, HZ + 2, 'white'); v.set(x - 1, y + 2, HZ, 'red'); }
    }
    for (const [i, a] of [[0, 3.6], [1, 4.4], [2, 5.2], [3, 0.4], [4, 1.9]] as const) jungleTree(v, Math.round(RB[0] + Math.cos(a) * 9.8), Math.round(RB[1] + Math.sin(a) * 10.6), HZ + 1, 4 + (i % 2), i % 2 ? 'leaf' : 'leafLight');
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (dx * dx + dz * dz <= 5) v.set(RB[0] + 6 + dx, RB[1] - 14, 16 + dz, dx === 0 && dz === 0 ? 'ember' : 'red');
  };
  if (T('roundabout')) roundabout(9, []);
  if (T('roundabout-ten')) roundabout(10, [7, 8, 9]);
  if (T('portal')) {
    for (const [x, y] of line(Math.round(RB[0]), Math.round(RB[1]) - 6, Math.round(RB[0]), HOME[1] + 1)) v.set(x, y, HZ, 'tile');
    const [px, py] = [Math.round(RB[0]), HOME[1] + 1];
    for (const dx of [-2, 2]) v.col(px + dx, py, HZ + 1, HZ + 5, 'glass');
    v.box(px - 1, py, HZ + 6, px + 1, py, HZ + 6, 'glass'); v.box(px - 1, py, HZ + 1, px + 1, py, HZ + 5, 'portal');
  }

  /* ---- Hungry Eyes: night and neon, an island behind home ---- */
  if (T('village')) {
    const [x0, y0, x1, y1] = VIL, r = rng(1002);
    slab(v, x0, y0, x1, y1, 0, { depth: 6, seed: 1060, crust: 'stoneDark', shape: (x, y) => !(x >= x1 - 2 && y <= y0 + 2) && !(x <= x0 + 2 && y >= y1 - 1), top: 'black' });
    const neon = ['laser', 'accentGlow', 'portal'];
    for (let i = 0; i < 8; i++) {
      const x = x0 + 1 + (i % 4) * 4, y = y0 + 1 + Math.floor(i / 4) * 9, hgt = 4 + Math.floor(r() * 5);
      v.box(x, y, 1, x + 2, y + 4, hgt, i % 3 ? 'purple' : 'black');
      for (let xx = x; xx <= x + 2; xx++) v.set(xx, y + 4, hgt, neon[i % 3]);
      for (let yy = y; yy <= y + 4; yy += 2) v.set(x + 2, yy, hgt, neon[i % 3]);
      v.set(x + 1, y + 4, 1, 'window'); v.set(x + 2, y + 2, 2, ['pink', 'glassTeal', 'window'][i % 3]);
    }
    for (let i = 0; i < 4; i++) v.box(x0 + 4 + i, y0 + 7, 1 + i * 2, x0 + 12 - i, y0 + 7, 2 + i * 2, i % 2 ? 'accentGlow' : 'purple');
    for (const x of [x0 + 3, x0 + 8, x0 + 13]) { v.box(x, y0 + 8, 1, x + 1, y0 + 8, 1, 'wood'); v.set(x, y0 + 8, 2, 'laser'); }
  }
  if (T('hairpin')) {
    const [x, y] = [VIL[0] + 6, VIL[3] - 1];
    v.col(x + 1, y, 1, 8, 'metalDark'); v.col(x + 6, y, 1, 8, 'metalDark');
    v.box(x, y, 9, x + 7, y, 9, 'laser'); v.box(x + 2, y, 10, x + 5, y, 10, 'laser'); v.set(x + 1, y, 8, 'accentGlow'); v.set(x + 6, y, 8, 'accentGlow');
    v.col(VIL[2] - 2, y, 1, 6, 'metalDark'); v.box(VIL[2] - 3, y, 7, VIL[2] - 1, y, 8, 'pink'); v.box(VIL[2] - 3, y, 5, VIL[2] - 1, y, 5, 'portal');
  }

  /* The hero picture only: the ceiling run (8:67). The truck upside down on
     the factory's ceiling track over the molten steel, and out of its back two
     figures going together, Corcunda whole again and Dong with his lance. */
  if (has('hero')) {
    v.tag = 'molten-river';
    const put = placer(v, 4, 46, 16, '-y', true);
    foodTruck((u, w, z, m) => put(u, w, z, m === 'black' && z <= 3 && w > 0 && w < 6 ? 'accent' : m));   // seen from above, its underside
    // out of the back doors, together: Corcunda, a mantaur whole again, and Dong with his lance
    const figure = (x: number, y: number, z: number, skin: string, body: string, horns: boolean) => {
      v.box(x, y, z, x + 1, y, z + 1, body); v.box(x, y, z + 2, x + 1, y, z + 3, body); v.box(x, y, z + 4, x + 1, y, z + 5, skin);
      v.set(x - 1, y, z + 3, skin); v.set(x + 2, y, z + 4, skin);
      if (horns) { v.set(x - 1, y, z + 6, 'bone'); v.set(x + 2, y, z + 6, 'bone'); v.set(x, y + 1, z + 4, 'black'); }
      else v.set(x + 1, y + 1, z + 5, 'black');
    };
    figure(4, 49, 5, 'dirt', 'dirtDark', true); figure(8, 50, 6, 'plaster', 'redDark', false);
    v.box(6, 49, 8, 7, 50, 8, 'plaster');                                       // hand in hand
    for (let k = 0; k <= 7; k++) v.set(10 + Math.round(k * 0.3), 50, 8 + k, 'rail');    // Dong's lance, the magnet on it
    v.set(12, 50, 16, 'accentGlow');
    // every screw in the factory flying after the magnet
    const r = rng(1099); for (let i = 0; i < 22; i++) { const t = r(); v.set(Math.round(14 - t * 3 + r() * 3), Math.round(36 + t * 13 + r() * 2), Math.round(2 + t * 13 + r() * 2), r() < 0.5 ? 'rail' : 'metal'); }
  }
  return v;
}

/** The manatee: a grey body breaching out of the pool in an arc, a pale belly,
    a flipper, the tail fin down in the water, the mouth open and screeching. */
function manatee(v: Vox, x: number, y: number, z: number) {
  for (let t = 0; t <= 1.001; t += 0.05) {
    const cx = x + t * 7, cy = y - t * 8, cz = z + 1 + t * 12, r = 2.8 + Math.sin(t * Math.PI) * 1.6;
    ell(v, cx, cy, cz, r, r, r, (a, b, c) => (c < cz - r * 0.2 && a + 0.5 > cx ? 'cloth' : 'rail'));
  }
  const hx = x + 8, hy = y - 9.5, hz = z + 14;
  ell(v, hx, hy, hz, 3.6, 3.4, 3.2, 'rail');
  ell(v, hx + 3, hy + 0.5, hz - 0.5, 2, 2.6, 2, 'cloth');                      // the snout
  v.box(Math.round(hx + 3), Math.round(hy - 1), Math.round(hz - 2), Math.round(hx + 5), Math.round(hy + 2), Math.round(hz - 1), 'redDark');
  for (const yy of [Math.round(hy - 1), Math.round(hy + 1)]) { v.set(Math.round(hx + 5), yy, Math.round(hz), 'white'); v.set(Math.round(hx + 5), yy, Math.round(hz - 3), 'white'); }
  v.set(Math.round(hx + 2), Math.round(hy + 3), Math.round(hz + 1), 'black'); v.set(Math.round(hx + 2), Math.round(hy - 3), Math.round(hz + 1), 'black');
  ell(v, x + 7, y - 4, z + 7, 1.2, 3, 1.2, 'rail');                            // a flipper
  ell(v, x - 1.5, y + 2, z + 1, 2.6, 1.4, 0.8, 'rail');                         // the tail fin
}

/** A jungle tree: a tall trunk and a broad, flat-topped crown. */
function jungleTree(v: Vox, x: number, y: number, z: number, h: number, leaf: string) {
  v.col(x, y, z, z + h - 1, 'woodDark');
  v.box(x - 1, y - 1, z + h, x + 1, y + 1, z + h + 1, (xx, yy, zz) => (zz === z + h + 1 && xx !== x && yy !== y ? null : zz === z + h + 1 ? 'leafLight' : leaf));
}

const anchors: VoxelMap['anchors'] = {
  caption: [CORE[0] + 3, CORE[3] + 2, -2], garage: [GA[0] + 5, GA[1], 10], 'start-road': [TRUCK[0] + 6, TRUCK[1] + 3, 13],
  'manatee-caves': [11, 38, 16], 'finish-arch': [FA[0], FA[1], FZ + 12],
  roundabout: [RB[0], RB[1] - 8, HZ + 4], 'roundabout-ten': [RB[0], RB[1] - 8, HZ + 4], portal: [RB[0], HOME[1] + 1, HZ + 6], village: [VIL[0] + 5, VIL[1] + 4, 8],
  hairpin: [VIL[0] + 9, VIL[3] - 1, 10], 'hail-hills': [8, 30, 4], kangaroos: [4, 37, 11], descent: [8, 30, 9], 'kaiju-skull': [8, 48, 8],
  jungle: [6, 40, 7], upano: [8, 7, 10], 'water-park': [12, 14, 16], factory: [6, 23, 16], 'molten-river': [7, 44, 1], lengle: [8, 24, 21], 'roof-portals': [7, 35, 24],
};

export const FLOOR_10_VOXEL: VoxelMap = { build, anchors };
export const buildFloor10 = build;

/** The tile: the cave as it stands when its picture opens (8:2), the garage
    door up and the truck at the line, before any heat is run. */
export const TILE_10_LAYERS = ['caption', 'garage', 'start-road'];
/** The hero picture, once the floor is finished: the cave, and the factory at
    the ceiling run. */
export const HERO_10_LAYERS = ['garage', 'finish-arch', 'roundabout-ten', 'portal', 'village', 'hairpin', 'factory', 'molten-river', 'hero'];
