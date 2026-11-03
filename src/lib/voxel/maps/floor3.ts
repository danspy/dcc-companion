import { Vox, rng, torch, line, disc, ring, banner } from '../vox.ts';
import { CARL, DONUT, PALETTE } from '../../maps/sprites.ts';
import { cell, tiles, isle, crate, barrel, crawlersAt } from './floor1.ts';
import type { VoxelMap } from './index.ts';

/* Floor 3's page map: one corner of the Over City as a single island in steps,
   under a red sun on its false ceiling. The small village at the front left on
   its wooden slats (2:2), smoke rising through them and embers glowing in the
   rock beneath; the main road out of its gate, diagonally back through mossy
   ruins (2:3); the circus in its park beside the road (2:6); and up a step at
   the back right, the walled skyfowl town with everything that happens in it,
   the pool in the slums west of it and the last stairwell east.

   The homepage tile is this scene at its artAt (2:6); the hero is the
   Doomsday Scenario going off at the bottom of the east stairs. Shapes only;
   every word is in data/books.json. */

const L = 1, TZ = L + 4;                                    // the ground, and the town's terrace
const VIL = { x0: 0, y0: 30, x1: 21, y1: 47 } as const;     // the small village
const GATE = [21, 36] as const;
const CIR = [33, 37] as const, CR = 9;                      // the circus park
const TOWN = { x0: 34, y0: 0, x1: 65, y1: 23 } as const;     // the skyfowl town, on its terrace
const TGATE = 12;                                           // the town gate's y, on its west wall
const ES = { x0: 54, y0: 34, x1: 61, y1: 41 } as const;     // the east stairs' building
const D = 49, W = 67;

const inVil = (x: number, y: number) => x >= VIL.x0 && x <= VIL.x1 && y >= VIL.y0 && y <= VIL.y1;
const inTown = (x: number, y: number) => x >= TOWN.x0 && x <= TOWN.x1 && y >= TOWN.y0 && y <= TOWN.y1;
const inPark = (x: number, y: number) => Math.hypot(x - CIR[0], y - CIR[1]) <= CR + 1;
const ROAD = [...line(GATE[0], GATE[1] - 1, 28, 26), ...line(28, 26, TOWN.x0, TGATE)];
const onRoad = (x: number, y: number, w = 2) => ROAD.some(([rx, ry]) => Math.abs(rx - x) <= w && Math.abs(ry - y) <= w);
/** The island's outline: notched corners, a bite out of the front edge. */
const ground = (x: number, y: number) => !(x <= 3 && y <= 5) && !(x >= 62 && y >= 44) && !(x >= 24 && x <= 29 && y >= 47) && !(x <= 1 && y >= 46) && !(x >= 64 && y >= 26 && y <= 29);

/** A shop: plaster walls in big blocks, a steep red roof in small tiles with a hole in it, a door, a lit window, vines. */
function shop(v: Vox, x: number, y: number, z: number, w: number, d: number, h: number, seed: number, roof = 'roofRed', wall = 'plaster', broken = true) {
  const r = rng(seed);
  v.chunk = 2; v.box(x, y, z + 1, x + w - 1, y + d - 1, z + h, wall); v.chunk = 1;
  for (let i = 0; i <= Math.floor(d / 2); i++) v.box(x - 1, y + i - 1 + (i === 0 ? 0 : 0), z + h + 1 + i, x + w, y + d - i, z + h + 1 + i, (xx, yy) => (i === 0 && (yy === y - 1) ? null : roof));
  if (broken && w >= 5) v.clear(x + 1, y + 1, z + h + 2, x + 2, y + 2, z + h + 3);
  const dx = x + Math.floor(w / 2);
  v.box(dx, y + d, z + 1, dx, y + d, z + 3, 'woodDark'); v.set(dx, y + d, z + 4, 'stoneDark');
  v.set(x + w, y + Math.floor(d / 2), z + 3, 'window'); torch(v, dx + 2, y + d, z + 3);
  for (let i = 0; i < 2; i++) { const vx = x + Math.floor(r() * w); for (let zz = z + 1; zz <= z + 1 + Math.floor(r() * h); zz++) v.set(vx, y + d, zz, zz % 2 ? 'leaf' : 'leafLight'); }
}

/** A ruin: big grey blocks slumping in on themselves, moss on the tops, windows punched out. */
function ruin(v: Vox, x: number, y: number, z: number, w: number, d: number, h: number, seed: number) {
  const r = rng(seed);
  v.chunk = 2;
  for (let i = x; i < x + w; i++) for (let j = y; j < y + d; j++) {
    const edge = i - x < 2 || j - y < 2 || i >= x + w - 2 || j >= y + d - 2;
    if (!edge) { if (cell(i, j, seed + 4) < 0.35) v.set(i, j, z + 1, cell(i, j, seed + 5) < 0.5 ? 'stone' : 'leaf'); continue; }
    const top = Math.max(3, h - Math.floor(cell(i, j, seed) * cell(i, j, seed + 1) * h * 1.1));
    for (let zz = z + 1; zz <= z + top; zz++) {
      if (zz > z + 2 && zz < z + top - 1 && ((zz >> 1) % 2 === 0) && ((i >> 1) + (j >> 1)) % 2 === 0) continue;   // a broken window
      v.set(i, j, zz, zz >= z + top - 1 && cell(i, j, seed + 2) < 0.4 ? 'leaf' : cell(i, j + zz, seed + 3) < 0.2 ? 'stoneDark' : 'stone');
    }
  }
  v.chunk = 1;
  for (let k = 0; k < 3; k++) { const vx = x + Math.floor(r() * w), vy = y + d; for (let zz = z + 1; zz <= z + 1 + Math.floor(r() * h); zz++) v.set(vx, vy, zz, zz % 2 ? 'leaf' : 'leafLight'); }
}

/** A big top: a striped wall, a stepped striped cone, gold trim, a dark doorway, a pole and a pennant. */
function bigTop(v: Vox, cx: number, cy: number, z: number, r0: number, door: 'x' | 'y' = 'y') {
  const stripe = (x: number, y: number) => (Math.floor((Math.atan2(y - cy, x - cx) + 4) * (r0 > 4 ? 2.6 : 1.8)) % 2 ? 'red' : 'white');
  let top = z;
  for (let k = 1; k <= r0 + 8; k++) {
    const rr = r0 - Math.max(0, k - 4) * 0.8;
    if (rr < 0.6) break;
    ring(v, cx, cy, rr, k <= 4 ? 1 : rr, z + k, z + k, k === 4 ? () => 'brick' : stripe); top = z + k;
  }
  const R = Math.round(r0);
  if (door === 'y') { v.clear(cx - 1, cy + R - 1, z + 1, cx + 1, cy + R, z + 3); v.box(cx - 1, cy + R - 1, z + 1, cx + 1, cy + R - 1, z + 3, 'void'); }
  else { v.clear(cx + R - 1, cy - 1, z + 1, cx + R, cy + 1, z + 3); v.box(cx + R - 1, cy - 1, z + 1, cx + R - 1, cy + 1, z + 3, 'void'); }
  v.col(cx, cy, top + 1, top + 3, 'woodDark'); v.box(cx + 1, cy, top + 3, cx + 2, cy, top + 3, 'red'); v.set(cx + 1, cy, top + 2, 'red');
  if (r0 > 4) for (const [dx, dy] of [[-R, 0], [0, -R], [R, 0]]) { v.col(cx + dx, cy + dy, z + 1, z + 6, 'woodDark'); v.set(cx + dx + 1, cy + dy, z + 6, 'red'); v.set(cx + dx + 1, cy + dy, z + 5, 'red'); }
}

/** A circus wagon: a wooden box on dark wheels under a red roof; a cage if it holds something. */
function wagon(v: Vox, x: number, y: number, z: number, cage = false) {
  for (const dx of [0, 3]) for (const dy of [0, 2]) v.set(x + dx, y + dy, z + 1, 'black');
  v.box(x, y, z + 2, x + 3, y + 2, z + 4, cage ? (xx, yy) => ((xx + yy) % 2 ? 'metalDark' : 'void') : (xx) => (xx % 2 ? 'wood' : 'red'));
  v.box(x, y, z + 5, x + 3, y + 2, z + 5, 'red');
}

/** Smoke drifting up through the slats. */
const wisp = (v: Vox, x: number, y: number, z: number, h = 5) => { for (let k = 1; k <= h; k++) if ((x + k) % 2) v.set(x + (k > 2 ? 1 : 0) + (k > 4 ? 1 : 0), y, z + k, 'stoneDark'); };

function build(shown: Set<string>): Vox {
  const v = new Vox();
  const has = (id: string) => shown.has(id);
  const T = (id: string) => { v.tag = id; return has(id); };

  /* ---- the ground: one island, the town a step up at the back right ---- */
  v.tag = has('ruins') ? 'ruins' : 'small-village';
  isle(v, 0, 0, W, D, L, 301, { depth: 10, shape: (x, y) => ground(x, y) && !inTown(x, y), top: tiles('tile', 'grass', 0.22, 1), under: ['dirt', 'dirtDark'] });
  // the village's wooden slats, two wide, with gaps here and there
  for (let x = VIL.x0; x <= VIL.x1; x++) for (let y = VIL.y0; y <= VIL.y1; y++) if (v.has(x, y, L)) {
    v.chunk = 2; v.set(x, y, L, ((y >> 1) % 3 === 2) ? (cell(x, y, 2) < 0.3 ? 'void' : 'woodDark') : 'wood'); v.chunk = 1;
  }
  // the town's terrace, its own rock under it
  v.tag = has('skyfowl-town') ? 'skyfowl-town' : v.tag;
  isle(v, TOWN.x0, TOWN.y0, TOWN.x1, TOWN.y1, TZ, 302, { depth: 14, shape: (x, y) => !(x >= 62 && y <= 3) && !(x >= TOWN.x0 && x <= 37 && y >= 20), top: tiles('tile', 'stone', 0.3, 3), under: ['dirt', 'dirtDark'] });
  if (!has('skyfowl-town')) {                                 // before the town is reached the terrace is fog
    v.tag = has('ruins') ? 'ruins' : 'small-village';
    for (let x = TOWN.x0; x <= TOWN.x1; x++) for (let y = TOWN.y0; y <= TOWN.y1; y++) if (v.has(x, y, TZ)) { v.set(x, y, TZ + 1, 'mist'); if (cell(x, y, 4) < 0.5) v.set(x, y, TZ + 2, 'mist'); }
  }

  /* ---- the ruins: every height, moss on them, filling everything that is not a place ---- */
  if (T('ruins')) {
    const busy = new Set<string>();
    const free = (x0: number, y0: number, x1: number, y1: number) => {
      for (let x = x0 - 1; x <= x1 + 1; x++) for (let y = y0 - 1; y <= y1 + 1; y++) {
        if (!ground(x, y) || x < 0 || y < 0 || x > W || y > D || inVil(x, y) || inPark(x, y) || onRoad(x, y) || busy.has(`${x},${y}`)) return false;
        if (inTown(x, y) !== inTown(x0, y0) || (inTown(x, y) && (has('skyfowl-town') || x - TOWN.x0 < 2 || y - TOWN.y0 < 2 || !v.has(x, y, TZ)))) return false;
        if (has('east-stairs') && x >= ES.x0 - 1 && x <= ES.x1 + 1 && y >= ES.y0 - 1 && y <= ES.y1 + 1) return false;
        if (x >= 4 && x <= 15 && y >= 4 && y <= 13) return false;          // the pool's lot
      }
      return true;
    };
    const r = rng(303);
    let i = 0;
    for (let y = 0; y <= D; y += 2) for (let x = 0; x <= W; x += 2) {
      i++;
      if (r() < 0.3) continue;                                   // a yard, a square, a gap in the rubble
      let w = 4 + 2 * Math.floor(r() * 2), d = 4 + 2 * Math.floor(r() * 2);
      const h = 6 + 2 * Math.floor(r() * (y < 22 ? 5 : 3));
      if (!free(x, y, x + w - 1, y + d - 1)) { w = 4; d = 4; if (!free(x, y, x + 3, y + 3)) continue; }
      ruin(v, x, y, inTown(x, y) ? TZ : L, w, d, h, 3000 + i);
      for (let a = x; a < x + w; a++) for (let b = y; b < y + d; b++) busy.add(`${a},${b}`);
    }
  }
  if (!has('ruins')) {                                        // before the ruins are walked the city is fog beyond the fence
    v.tag = 'small-village';
    for (let x = 0; x <= W; x++) for (let y = 0; y <= D; y++) if (v.has(x, y, L) && !v.has(x, y, L + 1) && !inVil(x, y) && !inTown(x, y) && x > VIL.x1 + 2 - (y < VIL.y0 - 2 ? 99 : 0)) {
      v.set(x, y, L + 1, 'mist'); if (cell(x, y, 6) < 0.6) v.set(x, y, L + 2, 'mist');
    }
  }
  if (T('road')) for (const [x, y] of ROAD) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (v.get(x + dx, y + dy, L) && !inVil(x + dx, y + dy)) v.set(x + dx, y + dy, L, dx === 0 && dy === 0 ? 'stone' : 'stoneDark');

  /* ---- the small village, its fence, its smoke ---- */
  if (T('small-village')) {
    shop(v, 2, 31, L, 7, 5, 5, 311); shop(v, 12, 31, L, 6, 5, 6, 312);
    shop(v, 2, 40, L, 6, 5, 4, 313); shop(v, 11, 40, L, 7, 5, 5, 314);
    crate(v, 9, 37, L + 1); barrel(v, 19, 44, L + 1); crate(v, 4, 46, L + 1, 'accent');
    banner(v, 9, 37, L + 5, 3, { along: 'x', w: 2, cloth: 'red', trim: 'brick' });
  }
  if (T('village-fence')) {
    const posts = [...line(VIL.x0, VIL.y0 - 1, VIL.x1 + 1, VIL.y0 - 1), ...line(VIL.x1 + 1, VIL.y0 - 1, VIL.x1 + 1, VIL.y1)];
    for (const [x, y] of posts) if (!(x === VIL.x1 + 1 && Math.abs(y - GATE[1]) <= 1)) { v.set(x, y, L + 1, 'wood'); if ((x + y) % 3 === 0) v.set(x, y, L + 2, 'woodDark'); }
    for (const y of [GATE[1] - 2, GATE[1] + 2]) { v.col(GATE[0] + 1, y, L + 1, L + 3, 'metal'); v.set(GATE[0] + 1, y, L + 4, 'metalDark'); }   // the two guards in plate
  }
  if (T('smoke')) {
    for (const [x, y] of [[9, 38], [15, 38], [20, 33], [6, 47], [16, 46], [20, 40]]) wisp(v, x, y, L);
    // what smoulders beneath: seams of embers in the island's underside
    const r = rng(306);
    for (let x = 2; x < 30; x++) for (let z = L - 8; z <= L - 2; z++) if (v.has(x, D, z) && r() < 0.5) v.set(x, D, z, r() < 0.55 ? 'ember' : 'black');
    for (let y = 26; y < 46; y++) for (let z = L - 8; z <= L - 3; z++) if (v.has(W, y, z) && r() < 0.35) v.set(W, y, z, r() < 0.55 ? 'ember' : 'black');
    for (let x = 6; x < 22; x++) for (let z = L - 9; z <= L - 4; z++) if (v.has(x, D - 1, z) && !v.has(x, D, z) && r() < 0.4) v.set(x, D - 1, z, 'ember');
  }
  if (T('signpost')) {
    v.chunk = 2; v.box(GATE[0] + 2, GATE[1] + 2, L + 1, GATE[0] + 3, GATE[1] + 3, L + 2, 'stoneDark'); v.chunk = 1;
    v.col(GATE[0] + 3, GATE[1] + 3, L + 3, L + 6, 'portal'); v.set(GATE[0] + 4, GATE[1] + 3, L + 6, 'portal'); v.set(GATE[0] + 3, GATE[1] + 2, L + 6, 'portal'); v.set(GATE[0] + 5, GATE[1] + 3, L + 5, 'portal');
  }
  if (T('crawlers')) crawlersAt(v, 13, 37, L + 1);

  /* ---- the circus in its park; the vine; the bare park and its stairs ---- */
  const park = () => disc(v, CIR[0], CIR[1], CR, CR, L, L, (x, y) => (cell(x, y, 5) < 0.2 ? 'leafLight' : 'grass'));
  if (T('circus')) {
    park();
    const r = rng(304);
    for (let i = 0; i < 64; i++) {           // the low wall of rock, wood and bone
      const a = (i / 64) * Math.PI * 2, x = Math.round(CIR[0] + Math.cos(a) * CR), y = Math.round(CIR[1] + Math.sin(a) * CR);
      if (Math.abs(a - Math.PI * 1.25) < 0.2) continue;
      v.set(x, y, L + 1, i % 4 === 0 ? 'woodDark' : r() < 0.15 ? 'bone' : r() < 0.4 ? 'wood' : 'stone');
      if (i % 4 === 0) { v.set(x, y, L + 2, 'woodDark'); v.set(x, y, L + 3, i % 8 ? 'red' : 'white'); }
    }
    bigTop(v, CIR[0], CIR[1] - 1, L, 7); bigTop(v, CIR[0] - 5, CIR[1] - 5, L, 3.2, 'x'); bigTop(v, CIR[0] + 5, CIR[1] + 4, L, 3, 'x');
    wagon(v, CIR[0] - 8, CIR[1] + 1, L); wagon(v, CIR[0] - 6, CIR[1] + 5, L, true); wagon(v, CIR[0] + 3, CIR[1] - 8, L, true);
    crate(v, CIR[0] + 6, CIR[1] - 3, L + 1); barrel(v, CIR[0] - 2, CIR[1] + 7, L + 1);
    for (let i = 0; i < 7; i++) { const x = CIR[0] - 3 + i, y = CIR[1] + 8; v.set(x, y, L + 4 - (i === 3 ? 1 : 0), i % 2 ? 'red' : 'white'); }   // bunting
    v.col(CIR[0] - 3, CIR[1] + 8, L + 1, L + 4, 'woodDark'); v.col(CIR[0] + 3, CIR[1] + 8, L + 1, L + 4, 'woodDark');
  }
  if (T('vine')) {
    v.clear(CIR[0] - 2, CIR[1] - 3, L + 6, CIR[0] + 2, CIR[1] + 1, L + 16);
    for (let k = 0; k < 18; k++) { const a = k * 0.7; v.box(Math.round(CIR[0] + Math.cos(a) * 1.5), Math.round(CIR[1] - 1 + Math.sin(a) * 1.5), L + 5 + k, Math.round(CIR[0] + Math.cos(a) * 1.5), Math.round(CIR[1] - 1 + Math.sin(a) * 1.5), L + 5 + k, k % 3 ? 'leaf' : 'leafLight'); }
    for (const [dx, dy, dz] of [[2, 0, 14], [-2, 1, 17], [1, -2, 20], [-1, -1, 23]]) v.box(CIR[0] + dx, CIR[1] - 1 + dy, L + dz, CIR[0] + dx + 1, CIR[1] - 1 + dy, L + dz, 'leafLight');
  }
  if (T('park-stairs')) {
    park();
    v.chunk = 2; v.box(CIR[0] - 2, CIR[1] - 2, L + 1, CIR[0] + 3, CIR[1] - 1, L + 4, 'stone'); v.box(CIR[0] - 2, CIR[1], L + 1, CIR[0] - 1, CIR[1] + 3, L + 4, 'stone'); v.chunk = 1;
    for (let i = 0; i < 3; i++) v.box(CIR[0], CIR[1] + i, L - i, CIR[0] + 3, CIR[1] + i, L - i, i === 2 ? 'void' : 'stoneDark');
    v.clear(CIR[0], CIR[1], L, CIR[0] + 3, CIR[1] + 1, L);
    v.set(CIR[0] + 1, CIR[1] - 1, L + 5, 'window');
  }

  /* ---- the skyfowl town on its terrace: walled, tall, open-windowed ---- */
  const tx = (n: number) => TOWN.x0 + n, ty = (n: number) => TOWN.y0 + n;
  const MAG = { x0: tx(12), y0: ty(6), x1: tx(19), y1: ty(13) };
  const DEP = { x0: tx(12), y0: ty(16), x1: tx(19), y1: ty(21) };
  const CLUB = { x0: tx(4), y0: ty(14), x1: tx(9), y1: ty(19) };
  if (T('skyfowl-town')) {
    v.chunk = 2;
    for (let x = TOWN.x0; x <= TOWN.x1; x++) for (let y = TOWN.y0; y <= TOWN.y1; y++) {
      if (!v.has(x, y, TZ)) continue;
      const wallCell = x - TOWN.x0 < 2 || y - TOWN.y0 < 2 || !v.has(x + 2, y, TZ) || !v.has(x, y + 2, TZ);
      if (!wallCell) continue;
      if (x - TOWN.x0 < 2 && Math.abs(y - TGATE) <= 2) continue;          // the gate
      const back = x - TOWN.x0 < 2 || y - TOWN.y0 < 2;
      v.box(x, y, TZ + 1, x, y, TZ + (back ? 6 : 2) + (((x >> 1) + (y >> 1)) % 2 ? 2 : 0), 'stone');
    }
    for (const y of [TGATE - 4, TGATE + 3]) v.box(TOWN.x0, y, TZ + 1, TOWN.x0 + 1, y + 1, TZ + 10, 'stoneDark');
    v.chunk = 1;
    banner(v, TOWN.x0 - 1, TGATE - 4, TZ + 8, 5, { along: 'y', w: 2, cloth: 'red', trim: 'brick' });
    banner(v, TOWN.x0 - 1, TGATE + 3, TZ + 8, 5, { along: 'y', w: 2, cloth: 'red', trim: 'brick' });
    for (let k = 0; k <= 4; k++) v.box(TOWN.x0 - 2 - k, TGATE - 1, TZ - k, TOWN.x0 - 1 - k, TGATE + 1, TZ - k, 'stone');   // steps down to the road
    const r = rng(305), busy = new Set<string>();
    const mark = (a: { x0: number; y0: number; x1: number; y1: number }) => { for (let x = a.x0 - 1; x <= a.x1 + 1; x++) for (let y = a.y0 - 1; y <= a.y1 + 1; y++) busy.add(`${x},${y}`); };
    mark(MAG); mark(DEP); mark(CLUB); mark({ x0: tx(23), y0: ty(14), x1: tx(28), y1: ty(19) }); mark({ x0: TOWN.x0, y0: TGATE - 2, x1: tx(8), y1: TGATE + 2 });
    const lots: [number, number, number, number, number, string][] = [
      [38, 2, 4, 4, 10, 'roofRed'], [43, 2, 4, 3, 8, 'roofBlue'], [48, 2, 4, 3, 12, 'roofRed'], [54, 2, 5, 3, 9, 'roofRed'],
      [38, 7, 4, 3, 6, 'roofBlue'], [58, 6, 5, 4, 10, 'roofRed'], [55, 9, 3, 4, 14, 'roofRed'], [60, 1 + 10, 3, 2, 7, 'roofBlue'],
    ];
    lots.forEach(([x, y, w, d, h, roof], i) => {
      shop(v, x, y, TZ, w, d, h, 3100 + i, roof, 'plaster', false);
      for (let z = TZ + 4; z < TZ + h; z += 3) { v.set(x + 1, y + d - 1, z, 'void'); v.set(x + w - 1, y + 1, z, 'void'); }   // open windows for the fliers
    });
    void busy; void mark; void r;
    // eagle folk circling under the ceiling
    for (const [x, y, z] of [[44, 4, TZ + 22], [56, 2, TZ + 25], [60, 12, TZ + 20]]) { v.set(x, y, z, 'woodDark'); v.set(x - 1, y, z + 1, 'woodDark'); v.set(x + 1, y, z + 1, 'woodDark'); v.set(x, y, z + 1, 'white'); }
  }
  if (T('desperado')) { v.chunk = 2; v.box(CLUB.x0 + 2, CLUB.y0 + 2, TZ + 1, CLUB.x0 + 3, CLUB.y0 + 3, TZ + 14, 'plaster'); v.chunk = 1; v.box(CLUB.x0 + 1, CLUB.y0 + 3, TZ + 15, CLUB.x0 + 4, CLUB.y0 + 3, TZ + 15, 'accentGlow'); v.col(CLUB.x0 + 2, CLUB.y0 + 3, TZ + 15, TZ + 18, 'accentGlow'); }
  if (T('desperado-club')) {
    const { x0, y0, x1, y1 } = CLUB;
    v.chunk = 2; v.box(x0, y0, TZ + 1, x1, y1, TZ + 14, 'plaster'); v.chunk = 1;
    for (let z = TZ + 3; z <= TZ + 13; z += 2) { v.box(x0, y1 + 1, z, x1, y1 + 1, z, (x) => (x % 2 ? 'window' : 'black')); v.box(x1 + 1, y0, z, x1 + 1, y1, z, (_x, y) => (y % 2 ? 'window' : 'black')); }
    for (let x = x0; x <= x1; x += 2) v.col(x, y1 + 1, TZ + 1, TZ + 14, 'white');
    for (let y = y0; y <= y1; y += 2) v.col(x1 + 1, y, TZ + 1, TZ + 14, 'white');
    v.box(x0 + 2, y1 + 1, TZ + 1, x0 + 3, y1 + 1, TZ + 3, 'void'); for (const [dx, dz] of [[1, 4], [2, 5], [3, 5], [4, 4]]) v.set(x0 + dx, y1 + 1, TZ + dz, 'accent');
    v.box(x0 + 1, y0 + 1, TZ + 15, x1 - 1, y1 - 1, TZ + 16, 'stone'); v.box(x0 + 2, y0 + 2, TZ + 17, x1 - 2, y1 - 2, TZ + 18, 'white');
    v.box(x0 + 1, y0 + 3, TZ + 21, x1 - 1, y0 + 3, TZ + 21, 'accentGlow'); v.col(x0 + 3, y0 + 3, TZ + 19, TZ + 24, 'accentGlow');   // the spinning knife
  }
  if (T('magistrate')) {
    for (const [x, y] of [[MAG.x0, MAG.y0], [MAG.x1 - 1, MAG.y0], [MAG.x0, MAG.y1 - 1], [MAG.x1 - 1, MAG.y1 - 1]]) { v.chunk = 2; v.box(x, y, TZ + 1, x + 1, y + 1, TZ + 6, 'stoneDark'); v.chunk = 1; }
    v.chunk = 2; v.box(MAG.x0, MAG.y0, TZ + 7, MAG.x1, MAG.y1, TZ + 12, 'plaster'); v.chunk = 1;
    for (let x = MAG.x0 + 1; x < MAG.x1; x += 2) { v.box(x, MAG.y1 + 1, TZ + 8, x, MAG.y1 + 1, TZ + 9, 'void'); v.set(x, MAG.y1 + 1, TZ + 11, 'window'); }
    for (let y = MAG.y0 + 1; y < MAG.y1; y += 2) { v.box(MAG.x1 + 1, y, TZ + 8, MAG.x1 + 1, y, TZ + 9, 'void'); v.set(MAG.x1 + 1, y, TZ + 11, 'window'); }
    v.box(MAG.x0 - 1, MAG.y0 - 1, TZ + 13, MAG.x1 + 1, MAG.y1 + 1, TZ + 13, 'stone');
    for (let i = 0; i <= 4; i++) v.box(MAG.x0, MAG.y0 + i, TZ + 14 + i, MAG.x1, MAG.y1 - i, TZ + 14 + i, 'roofRed');
    v.col(MAG.x0 + 4, MAG.y0 + 4, TZ + 19, TZ + 21, 'woodDark'); v.box(MAG.x0 + 5, MAG.y0 + 4, TZ + 21, MAG.x0 + 6, MAG.y0 + 4, TZ + 21, 'red');
  }
  if (T('magistrate-ruin')) {
    const r = rng(307);
    for (let x = MAG.x0 - 1; x <= MAG.x1 + 1; x++) for (let y = MAG.y0 - 1; y <= MAG.y1 + 1; y++) {
      const h = Math.max(1, Math.round(5 - Math.hypot(x - (MAG.x0 + MAG.x1) / 2, y - (MAG.y0 + MAG.y1) / 2) * 0.8 + r() * 2));
      for (let z = 1; z <= h; z++) v.set(x, y, TZ + z, r() < 0.3 ? 'stoneDark' : r() < 0.3 ? 'roofRed' : 'plaster');
    }
    for (let z = 7; z <= 14; z++) v.set(MAG.x0 + 4 + (z % 2), MAG.y0 + 3, TZ + z, z % 2 ? 'stoneDark' : 'black');
  }
  if (T('depot')) {
    v.chunk = 2; v.box(DEP.x0, DEP.y0, TZ + 1, DEP.x1, DEP.y1, TZ + 6, 'stone'); v.chunk = 1;
    v.box(DEP.x0, DEP.y0, TZ + 7, DEP.x1, DEP.y1, TZ + 7, 'stoneDark'); v.box(DEP.x0 + 3, DEP.y1 + 1, TZ + 1, DEP.x0 + 5, DEP.y1 + 1, TZ + 4, 'woodDark');
    for (let x = DEP.x0 + 1; x < DEP.x1; x += 2) v.set(x, DEP.y1 + 1, TZ + 5, 'metal');
  }
  if (T('depot-crystal')) {
    v.clear(DEP.x0 + 2, DEP.y0 + 1, TZ + 4, DEP.x1 - 2, DEP.y1, TZ + 7);
    v.col(DEP.x0 + 4, DEP.y0 + 3, TZ + 2, TZ + 7, 'portal'); v.col(DEP.x0 + 5, DEP.y0 + 3, TZ + 3, TZ + 6, 'portal'); v.set(DEP.x0 + 4, DEP.y0 + 2, TZ + 4, 'portal');
  }
  if (T('temple')) {
    shop(v, tx(23), ty(14), TZ, 5, 5, 5, 308, 'black', 'stoneDark');
    for (const [dx, dz] of [[1, 3], [3, 4], [2, 7]]) v.set(tx(23) + dx, ty(19), TZ + dz, 'black');
    v.set(tx(25), ty(16), TZ + 10, 'stoneDark'); v.set(tx(26), ty(16), TZ + 12, 'stoneDark');
  }
  if (T('blast')) for (let a = 0; a < Math.PI * 2; a += 0.01) {          // forty-five square kilometres, drawn as a ring on the ground
    const x = Math.round(DEP.x0 + 4 + Math.cos(a) * 30), y = Math.round(DEP.y0 + 3 + Math.sin(a) * 30);
    for (const z of [L, TZ]) if (v.has(x, y, z) && !v.has(x, y, z + 1)) v.set(x, y, z + 1, 'force');
  }
  if (T('pool')) {
    // west of town in the slum ruins: a half-open swimming pool with a carcass in it
    v.box(4, 4, L, 15, 13, L, 'tile');
    v.clear(6, 6, L - 1, 13, 11, L); v.box(6, 6, L - 2, 13, 11, L - 2, 'stoneDark');
    v.box(6, 6, L - 1, 9, 11, L - 1, 'water'); v.box(10, 7, L - 1, 13, 10, L - 1, 'redDark'); v.box(11, 8, L, 13, 9, L, 'bone'); v.set(12, 8, L + 1, 'bone');
    v.chunk = 2; for (let x = 4; x <= 15; x++) if ((x >> 1) % 2) v.box(x, 4, L + 1, x, 5, L + 4, 'stone'); v.chunk = 1;
    v.col(14, 12, L + 1, L + 3, 'rail'); v.box(14, 11, L + 3, 14, 11, L + 3, 'rail');
  }
  if (T('east-stairs')) {
    shop(v, ES.x0 + 1, ES.y0 + 1, L, 6, 5, 4, 309, 'roofGreen', 'stone');
    v.box(ES.x0 + 3, ES.y0 + 6, L + 1, ES.x0 + 4, ES.y0 + 6, L + 3, 'void');
    for (let i = 0; i < 2; i++) v.box(ES.x0 + 3, ES.y0 + 7 + i, L - i, ES.x0 + 4, ES.y0 + 7 + i, L - i, 'stoneDark');
  }

  /* ---- the false ceiling and its red sun ---- */
  if (T('sky')) {
    disc(v, 2, 4, 3.2, 3.2, 20, 21, 'ember'); disc(v, 2, 4, 2.2, 2.2, 22, 22, 'window'); v.set(2, 4, 23, 'flame');
    for (const [x, y, z] of [[14, -2, 22], [24, -4, 23], [-4, 12, 19]]) { v.chunk = 2; v.box(x, y, z, x + 3, y + 1, z + 1, 'stoneDark'); v.chunk = 1; }
  }

  /* ---- the hero picture only: the Doomsday Scenario going off under the east stairs ---- */
  if (shown.has('hero')) {
    // the crystal is in Carl's inventory by now: the depot stands gutted
    v.tag = 'depot-crystal';
    for (let x = DEP.x0; x <= DEP.x1; x++) for (let y = DEP.y0; y <= DEP.y1; y++) for (let z = TZ; z <= TZ + 8; z++) if (v.get(x, y, z) === 'portal') v.set(x, y, z, null);
    v.tag = 'east-stairs';
    const cx = ES.x0 + 4, cy = ES.y0 + 4, r = rng(3201);
    // the column of fire out of the stairwell, and the cap rolling over it
    const ball = (bx: number, by: number, bz: number, R: number, hollow = false) => {
      for (let dx = -Math.ceil(R); dx <= R; dx++) for (let dy = -Math.ceil(R); dy <= R; dy++) for (let dz = -Math.ceil(R); dz <= R; dz++) {
        const d = Math.hypot(dx, dy, dz * 1.15); if (d > R || (hollow && d < R - 2)) continue;
        const k = r(), out = d > R - 1.3;
        v.set(bx + dx, by + dy, bz + dz, out ? (k < 0.35 ? 'stoneDark' : k < 0.7 ? 'ember' : 'redDark') : k < 0.5 ? 'window' : 'ember');
      }
    };
    for (let z = L + 1; z <= L + 22; z++) {
      const rr = 2.4 + (z < L + 5 ? (L + 5 - z) * 0.9 : 0) + Math.sin(z * 0.9) * 0.4;
      for (let dx = -6; dx <= 6; dx++) for (let dy = -6; dy <= 6; dy++) { const d = Math.hypot(dx, dy); if (d <= rr) { const k = r(); v.set(cx + dx, cy + dy, z, d > rr - 1 ? (k < 0.5 ? 'ember' : 'redDark') : k < 0.6 ? 'window' : 'ember'); } }
    }
    ball(cx, cy, L + 25, 7.5, true);
    for (const [dx, dy, dz, R] of [[-5, 2, 23, 4], [4, -4, 24, 4], [2, 5, 27, 4], [-3, -4, 28, 3.5]] as const) ball(cx + dx, cy + dy, L + dz, R, true);
    for (const [dx, dy, dz] of [[0, 0, 33], [-3, 2, 31], [3, -2, 32], [0, 0, 24], [1, 1, 14], [-1, 0, 8]]) v.set(cx + dx, cy + dy, L + dz, 'flame');
    for (let a = 0; a < Math.PI * 2; a += 0.18) for (const rr of [9, 12]) {   // the shock ring along the ground
      const x = Math.round(cx + Math.cos(a) * rr), y = Math.round(cy + Math.sin(a) * rr);
      if (v.has(x, y, L) && !v.has(x, y, L + 1)) v.set(x, y, L + 1, rr === 9 ? 'ember' : 'stoneDark');
    }
    v.tag = 'crawlers';
    crawlersAt(v, ES.x0 - 8, ES.y0 + 8, L + 1);
  }
  return v;
}

const anchors: VoxelMap['anchors'] = {
  sky: [2, 4, 23], crawlers: [14, 37, L + 4], 'small-village': [14, 33, L + 9], 'village-fence': [VIL.x1 + 1, VIL.y1, L + 1], smoke: [15, 38, L + 4],
  ruins: [6, 20, L + 6], signpost: [GATE[0] + 3, GATE[1] + 3, L + 6], road: [28, 26, L], circus: [CIR[0], CIR[1] - 1, L + 14], vine: [CIR[0], CIR[1] - 1, L + 22],
  'park-stairs': [CIR[0] + 1, CIR[1], L], 'skyfowl-town': [TOWN.x0 + 26, TOWN.y0 + 4, TZ + 10], desperado: [TOWN.x0 + 6, TOWN.y0 + 17, TZ + 17], 'desperado-club': [TOWN.x0 + 7, TOWN.y0 + 17, TZ + 24],
  pool: [9, 8, L], magistrate: [TOWN.x0 + 16, TOWN.y0 + 9, TZ + 19], 'magistrate-ruin': [TOWN.x0 + 16, TOWN.y0 + 9, TZ + 6], temple: [TOWN.x0 + 25, TOWN.y0 + 16, TZ + 8],
  depot: [TOWN.x0 + 16, TOWN.y0 + 18, TZ + 7], 'depot-crystal': [TOWN.x0 + 16, TOWN.y0 + 19, TZ + 6], blast: [30, 30, L + 1], 'east-stairs': [ES.x0 + 4, ES.y0 + 3, L + 8],
};

export const FLOOR_3_VOXEL: VoxelMap = { build, anchors };
export const buildFloor3 = build;

/** The tile: the scene at 2:6, the village, the road through the ruins and the circus in its park. */
export const TILE_3_LAYERS = ['sky', 'crawlers', 'small-village', 'village-fence', 'smoke', 'ruins', 'signpost', 'road', 'circus'];
/** The hero, once the floor is finished: the Doomsday Scenario going off under the east stairs, the town behind. */
export const HERO_3_LAYERS = ['sky', 'small-village', 'village-fence', 'smoke', 'ruins', 'signpost', 'road', 'park-stairs', 'skyfowl-town', 'desperado-club', 'pool', 'magistrate-ruin', 'temple', 'depot-crystal', 'east-stairs', 'hero'];
