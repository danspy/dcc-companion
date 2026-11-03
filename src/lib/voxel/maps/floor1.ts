import { Vox, rng, slab, torch, disc, banner } from '../vox.ts';
import { CARL, DONUT, PALETTE } from '../../maps/sprites.ts';
import type { VoxelMap } from './index.ts';

/* Floor 1's page map, composed as one diorama in the manner of floor 11: big
   grey blocks of masonry on lumps of floating rock, small things standing on
   them. The way in is a chunk of the dead surface hanging high at the back
   left, an iron stair dropping from its spotlit hole into a torchlit room with
   the fish-demon door; the main artery runs from there to the right, a lichen
   hall branching off it, and at its end the bay where the Murder Dozer waits.
   Everything later arrives on its own lump of ground round that spine: the
   guild's room behind it, the safe room and the gym a step down in front, the
   grid of blocks at the front left, the Hoarder's heap on a terrace at the back,
   the workshop off the bay, and the round spiral at the front right that
   becomes an arena and then a ramp down.

   The homepage tile is this scene at 1:2 (tiles/floor1.ts), so the two cannot
   drift; the hero is the arena at the end, with the Ball of Swine on the
   Speedbump. Shapes only; every word is in data/books.json. */

/* ---- pieces floors 1 to 3 share ---- */

/** A hash per 2x2 cell, so a surface varies by big block and never by voxel. */
export const cell = (x: number, y: number, s = 0) => rng((((x >> 1) * 73856093) ^ ((y >> 1) * 19349663) ^ (s * 83492791)) >>> 0)();
/** A tiled top: mostly `a`, a cell of `b` here and there. */
export const tiles = (a = 'tile', b = 'stone', p = 0.2, s = 0) => (x: number, y: number) => (cell(x, y, s) < p ? b : a);

/** A lump of floating rock with a flat top at `z`. */
export function isle(v: Vox, x0: number, y0: number, x1: number, y1: number, z: number, seed: number,
                     opts: Parameters<typeof slab>[6] = {}) {
  slab(v, x0, y0, x1, y1, z, { depth: 7, crust: 'stone', top: tiles(), ...opts, seed });
}

/**
 * A room's walls in big blocks, two thick: tall, crenellated back walls (along
 * y0 and x0), knocked-down near walls (along y1 and x1) with a stub here and
 * there. `skip` leaves a cell open (a doorway, a gap into the next room).
 */
export function chamber(v: Vox, x0: number, y0: number, x1: number, y1: number, z: number, h: number,
                        o: { mat?: string | ((x: number, y: number, z: number) => string); seed?: number; near?: number; skip?: (x: number, y: number, z: number) => boolean; back?: 'both' | 'y' | 'x' | 'none'; nearSides?: 'both' | 'y' | 'x' | 'none'; torches?: number } = {}) {
  const was = v.chunk; v.chunk = 2;
  const m = o.mat ?? 'stone', r = rng(o.seed ?? 1);
  const mat = (x: number, y: number, zz: number) => (typeof m === 'string' ? m : m(x, y, zz));
  const put = (x: number, y: number, zz: number) => { if (!o.skip?.(x, y, zz)) v.set(x, y, zz, mat(x, y, zz)); };
  const back = o.back ?? 'both', ns = o.nearSides ?? 'both';
  const tall = (x: number, y: number, crenel: boolean) => { for (let zz = z + 1; zz <= z + h; zz++) put(x, y, zz); if (crenel) for (let zz = z + h + 1; zz <= z + h + 2; zz++) put(x, y, zz); };
  if (back === 'both' || back === 'y') for (let x = x0; x <= x1; x++) for (const y of [y0, y0 + 1]) tall(x, y, ((x - x0) >> 1) % 2 === 0);
  if (back === 'both' || back === 'x') for (let y = y0; y <= y1; y++) for (const x of [x0, x0 + 1]) tall(x, y, ((y - y0) >> 1) % 2 === 0);
  const nh = o.near ?? 2;
  const low = (x: number, y: number, seg: number) => {
    const k = rng(seg * 7919 + (o.seed ?? 1))();
    const hh = k < 0.18 ? 0 : k < 0.36 ? nh + 2 : nh;
    for (let zz = z + 1; zz <= z + hh; zz++) put(x, y, zz);
  };
  if (ns === 'both' || ns === 'y') for (let x = x0 + 2; x <= x1; x++) for (const y of [y1 - 1, y1]) low(x, y, x >> 1);
  if (ns === 'both' || ns === 'x') for (let y = y0 + 2; y <= y1 - 2; y++) for (const x of [x1 - 1, x1]) low(x, y, 1000 + (y >> 1));
  // the near corner stands up as a post
  if (ns === 'both') for (const x of [x1 - 1, x1]) for (const y of [y1 - 1, y1]) for (let zz = z + 1; zz <= z + nh + 2; zz++) put(x, y, zz);
  v.chunk = 1;
  const step = o.torches ?? 6;
  if (step > 0) {
    if (back === 'both' || back === 'y') for (let x = x0 + 4; x < x1 - 1; x += step) if (v.has(x, y0 + 1, z + 3) && !v.has(x, y0 + 2, z + 3)) torch(v, x, y0 + 2, z + 3);
    if (back === 'both' || back === 'x') for (let y = y0 + 4; y < y1 - 1; y += step) if (v.has(x0 + 1, y, z + 3) && !v.has(x0 + 2, y, z + 3)) torch(v, x0 + 2, y, z + 3);
  }
  v.chunk = was;
  void r;
}

/** An opening through walls: everything above the floor at `z` in the box goes. */
export const opening = (v: Vox, x0: number, y0: number, x1: number, y1: number, z: number, top = z + 20) => v.clear(x0, y0, z + 1, x1, y1, top);

/** An arched doorway in a wall face: a dark recess under a stone arch. */
export function archway(v: Vox, along: 'x' | 'y', a: number, b: number, z: number, w = 2, h = 3, mat = 'void') {
  const at = (i: number, zz: number, m: string) => (along === 'x' ? v.set(a + i, b, zz, m) : v.set(b, a + i, zz, m));
  for (let i = 0; i < w; i++) for (let zz = z + 1; zz <= z + h; zz++) at(i, zz, mat);
  for (let i = -1; i <= w; i++) at(i, z + h + 1, 'stoneDark');
}

export const barrel = (v: Vox, x: number, y: number, z: number) => { v.col(x, y, z, z + 1, 'wood'); v.set(x, y, z + 2, 'woodDark'); };
export const crate = (v: Vox, x: number, y: number, z: number, lid = 'wood') => { v.box(x, y, z, x + 1, y + 1, z, 'woodDark'); v.box(x, y, z + 1, x + 1, y + 1, z + 1, lid); };
export const crawlersAt = (v: Vox, x: number, y: number, z: number) => { v.sprite(x, y, z, CARL, PALETTE); v.sprite(x + 2, y, z, DONUT, PALETTE); };

/** A torch left hanging in the air (its wall was opened up later) is taken down. */
export function dropLooseTorches(v: Vox) {
  for (const { p: [x, y, z], mat } of v.all()) {
    if (mat !== 'woodDark' || v.get(x, y, z + 1) !== 'flame') continue;
    if (v.has(x, y - 1, z) || v.has(x - 1, y, z) || v.has(x, y, z - 1)) continue;
    v.set(x, y, z, null); v.set(x, y, z + 1, null);
  }
}

/* ---- floor 1 ---- */

const L = 1;                                // the main level's floor
const ENT = { x0: 0, y0: 0, x1: 13, y1: 15 } as const;
const COR = { x0: 14, y0: 4, x1: 37, y1: 13 } as const;
const BAY = { x0: 38, y0: 0, x1: 53, y1: 17 } as const;
const SP = [48, 32] as const, SR = 11;      // the spiral
const WS = { x0: 54, y0: 0, x1: 65, y1: 13 } as const;
const H = 8;                                // a back wall's height

/** The goblins' Murder Dozer, facing -x: big tracks, a riveted body, a copper boiler and stack, a spiked roller. */
function dozerLocal(v: Vox, x: number, y: number, z: number) {
  for (const yy of [y, y + 1, y + 7, y + 8]) for (let xx = x + 5; xx <= x + 15; xx++) for (let zz = z; zz <= z + 3; zz++) {
    const edge = zz === z || zz === z + 3 || xx === x + 5 || xx === x + 15;
    v.set(xx, yy, zz, edge ? 'black' : (xx + zz) % 3 ? 'metalDark' : 'rail');
  }
  v.box(x + 6, y + 2, z + 1, x + 14, y + 6, z + 5, 'metal');
  v.box(x + 5, y, z + 4, x + 15, y + 8, z + 4, 'metalDark');
  for (let xx = x + 6; xx <= x + 14; xx += 2) { v.set(xx, y, z + 5, 'rail'); v.set(xx, y + 8, z + 5, 'rail'); }
  // the boiler: a copper drum lying along x, banded
  for (let xx = x + 6; xx <= x + 11; xx++) for (let yy = y + 1; yy <= y + 7; yy++) for (let zz = z + 5; zz <= z + 11; zz++)
    if (Math.hypot(yy - (y + 4), zz - (z + 8)) <= 2.9) v.set(xx, yy, zz, xx === x + 6 || xx === x + 9 ? 'woodDark' : 'dirt');
  // the cab at the back, a lit slit for the driver
  v.box(x + 12, y + 2, z + 5, x + 15, y + 6, z + 10, 'woodDark'); v.box(x + 11, y + 1, z + 11, x + 15, y + 7, z + 11, 'metalDark');
  v.box(x + 13, y + 7, z + 8, x + 14, y + 7, z + 9, 'window'); v.box(x + 11, y + 3, z + 8, x + 11, y + 5, z + 9, 'window');
  // the stack, and its smoke
  v.box(x + 8, y + 3, z + 12, x + 9, y + 4, z + 16, 'metalDark'); v.box(x + 8, y + 3, z + 17, x + 9, y + 4, z + 17, 'black');
  for (const [dx, dy, dz] of [[0, 0, 19], [1, 1, 20], [-1, 0, 21], [1, -1, 23], [2, 0, 24], [3, 1, 26], [2, 1, 22], [4, 0, 28]]) v.box(x + 8 + dx, y + 3 + dy, z + dz, x + 9 + dx, y + 3 + dy, z + dz, 'cloth');
  // the arms, and the roller: a drum of black iron bristling with spikes
  for (const yy of [y + 1, y + 7]) v.box(x + 2, yy, z + 4, x + 6, yy, z + 5, 'wood');
  const cx = x + 1.5, cz = z + 3.5;
  for (let yy = y - 1; yy <= y + 9; yy++) for (let xx = x - 4; xx <= x + 7; xx++) for (let zz = z - 1; zz <= z + 8; zz++) {
    const d = Math.hypot(xx - cx, zz - cz);
    const cap = yy === y - 1 || yy === y + 9;
    if (d <= 3.4) v.set(xx, yy, zz, cap ? (d < 1.2 ? 'rail' : 'metalDark') : 'black');
    else if (!cap && d <= 4.6 && (xx * 2 + yy * 3 + zz * 5) % 7 === 0) v.set(xx, yy, zz, 'rail');
  }
}

/** The dozer turned to face +y, out of the bay towards the eye, so its roller is seen. (X, Y) is its near-left corner. */
function dozer(v: Vox, X: number, Y: number, z: number) {
  const t = new Vox(); dozerLocal(t, 4, 1, z);
  for (const { p: [lx, ly, lz], mat } of t.all()) v.set(X + ly, Y - lx, lz, mat);
}

/** A Speedbump: a redoubt of goblin tables and weight benches, heaped. */
function speedbump(v: Vox, cx: number, cy: number, z: number) {
  const r = rng(171);
  for (let x = cx - 5; x <= cx + 5; x++) for (let y = cy - 4; y <= cy + 4; y++) {
    const d = Math.hypot((x - cx) / 5.5, (y - cy) / 4.5); if (d > 1) continue;
    const h = Math.round(4 * (1 - d * d)) + (r() < 0.3 ? 1 : 0);
    for (let zz = z; zz <= z + h; zz++) v.set(x, y, zz, zz === z + h ? (r() < 0.5 ? 'wood' : r() < 0.5 ? 'metal' : 'woodDark') : r() < 0.5 ? 'woodDark' : 'metalDark');
  }
  for (const [dx, dy] of [[-4, -2], [3, 3], [-2, 4], [4, -3]]) { v.box(cx + dx, cy + dy, z + 3, cx + dx + 2, cy + dy, z + 3, 'wood'); v.set(cx + dx, cy + dy, z + 2, 'woodDark'); v.set(cx + dx + 2, cy + dy, z + 2, 'woodDark'); }
  for (const [dx, dy] of [[-5, 1], [5, 0]]) { v.box(cx + dx, cy + dy - 1, z + 2, cx + dx, cy + dy + 1, z + 2, 'rail'); v.set(cx + dx, cy + dy - 1, z + 3, 'black'); v.set(cx + dx, cy + dy + 1, z + 3, 'black'); }
}

/** The Ball of Swine: a sphere of fused pink tusklings, eyes and tusks all over it. */
function ballOfSwine(v: Vox, cx: number, cy: number, cz: number, R: number) {
  const r = rng(172);
  for (let x = Math.floor(cx - R); x <= cx + R; x++) for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let z = Math.floor(cz - R); z <= cz + R; z++) {
    const d = Math.hypot(x - cx, y - cy, z - cz); if (d > R) continue;
    if (d < R - 1.5) { v.set(x, y, z, 'pink'); continue; }
    const k = r();
    v.set(x, y, z, k < 0.05 ? 'black' : k < 0.1 ? 'bone' : k < 0.22 ? 'redDark' : 'pink');
  }
  for (let i = 0; i < 18; i++) {
    const a = r() * Math.PI * 2, b = (r() - 0.3) * Math.PI * 0.8;
    const x = Math.round(cx + Math.cos(a) * Math.cos(b) * (R + 0.8)), y = Math.round(cy + Math.sin(a) * Math.cos(b) * (R + 0.8)), z = Math.round(cz + Math.sin(b) * (R + 0.8));
    v.set(x, y, z, i % 3 ? 'bone' : 'pink');
  }
}

function build(shown: Set<string>): Vox {
  const v = new Vox();
  const has = (id: string) => shown.has(id);
  const T = (id: string) => { v.tag = id; return has(id); };

  /* ---- the main artery and the lichen hall off it ---- */
  if (T('arteries')) {
    isle(v, COR.x0, COR.y0, COR.x1, COR.y1, L, 101, { depth: 6 });
    isle(v, BAY.x0, BAY.y0, BAY.x1, BAY.y1, L, 102, { depth: 9, shape: (x, y) => !(x >= 50 && y <= 1) && !(x <= 39 && y >= 16) });
    chamber(v, COR.x0, COR.y0, COR.x1, COR.y1, L, H - 2, { back: 'y', seed: 103, nearSides: 'y' });
    chamber(v, BAY.x0, BAY.y0, BAY.x1, BAY.y1, L, H, { seed: 104, torches: 5, near: 1 });
    opening(v, COR.x1 - 1, COR.y0 + 2, BAY.x0 + 1, COR.y1 - 2, L);   // the artery runs into the bay
    // the lichen hall: a long passage back, its walls blotched green
    isle(v, 20, -12, 27, 3, L, 105, { depth: 5 });
    chamber(v, 20, -12, 27, 3, L, H - 2, { seed: 106, near: 4, nearSides: 'x', mat: (x, y, z) => (cell(x, y + z * 3, 7) < 0.3 ? 'lichen' : 'stone'), torches: 7 });
    opening(v, 22, COR.y0, 25, COR.y0 + 1, L);
    v.chunk = 2; v.box(26, 2, L + 1, 27, 3, L + H - 2, 'stone'); v.chunk = 1;
    for (const [x, y] of [[23, -4], [24, -9]]) { v.set(x, y, L + 1, 'lichen'); v.set(x, y, L + 2, 'leafLight'); }
    barrel(v, 40, 3, L + 1); crate(v, 41, 14, L + 1); crate(v, 15, 6, L + 1, 'accent');
  }

  /* ---- the way in: the dead surface, its spotlit hole, the iron stair, the door ---- */
  if (T('surface')) {
    slab(v, 0, -14, 11, -5, 15, { depth: 5, seed: 107, crust: 'stoneDark', under: ['stoneDark', 'dirtDark'], top: tiles('dirtDark', 'stoneDark', 0.35, 3) });
    v.clear(4, -12, 15, 7, -9, 15); v.box(4, -12, 13, 7, -9, 14, 'void');
    for (let z = 16; z <= 30; z++) for (let x = 5; x <= 6; x++) for (let y = -11; y <= -10; y++) v.set(x, y, z, 'beam');
    for (const [x, y] of [[1, -13], [9, -6], [10, -12]]) { v.col(x, y, 16, 17, 'stoneDark'); }
  }
  if (T('entrance')) {
    isle(v, ENT.x0, ENT.y0, ENT.x1, ENT.y1, L, 108, { depth: 9, shape: (x, y) => !(x <= 1 && y >= 14) });
    chamber(v, ENT.x0, ENT.y0, ENT.x1, ENT.y1, L, H, { seed: 109, nearSides: 'y', torches: 0 });
    // the iron stair, dropping out of the hole above and through the back wall
    for (let i = 0; i <= 13; i++) {
      const y = -4 + i, z = 15 - i;
      v.box(4, y, z, 7, y, z, 'metalDark');
      for (const x of [3, 8]) { v.set(x, y, z + 1, 'metal'); if (i % 3 === 0) v.col(x, y, z - 1, z, 'metal'); }
      if (y >= 0 && y <= 1) v.clear(3, y, z + 1, 8, y, L + H + 2);
    }
    v.set(3, 10, L + 2, 'metal'); v.set(8, 10, L + 2, 'metal');
    // the fish-demon door in the left wall: tall, carved, banded in iron
    for (let y = 6; y <= 10; y++) for (let z = L + 1; z <= L + 7; z++) v.set(1, y, z, z === L + 3 || z === L + 6 ? 'metalDark' : 'woodDark');
    for (let y = 5; y <= 11; y++) v.set(2, y, L + 8, 'stoneDark');
    v.col(2, 5, L + 1, L + 8, 'stoneDark'); v.col(2, 11, L + 1, L + 8, 'stoneDark');
    v.set(2, 7, L + 7, 'glassTeal'); v.set(2, 9, L + 7, 'glassTeal'); v.set(2, 8, L + 9, 'accent');
    for (const y of [6, 10]) v.set(2, y, L + 9, 'stoneDark');
    torch(v, 2, 3, L + 4); torch(v, 2, 13, L + 4); torch(v, 11, 2, L + 4);
    // the red rug at the stair's foot
    for (let x = 4; x <= 9; x++) for (let y = 11; y <= 14; y++) v.set(x, y, L, x === 4 || x === 9 || y === 11 || y === 14 ? 'accent' : 'red');
    barrel(v, 10, 2, L + 1); crate(v, 11, 4, L + 1);
    opening(v, ENT.x1 - 1, COR.y0 + 2, COR.x0 + 1, COR.y1 - 2, L);
  }

  /* ---- the guild's door on the artery; the room behind it ---- */
  if (T('guild')) {
    for (let x = 30; x <= 32; x++) for (let z = L + 1; z <= L + 4; z++) v.set(x, COR.y0 + 1, z, x === 31 && z === L + 2 ? 'metalDark' : 'woodDark');
    v.box(29, COR.y0 + 1, L + 5, 33, COR.y0 + 1, L + 5, 'stoneDark');
    v.box(30, COR.y0 + 2, L + 6, 32, COR.y0 + 2, L + 6, 'accent'); v.set(31, COR.y0 + 2, L + 7, 'woodDark');
  }
  if (T('guild-room')) {
    isle(v, 28, -10, 37, 3, L, 110, { depth: 5, top: tiles('wood', 'woodDark', 0.3, 4) });
    chamber(v, 28, -10, 37, 3, L, H - 2, { seed: 111, near: 0, nearSides: 'x', torches: 0 });
    v.box(31, -9, L + 1, 34, -9, L + 3, 'stoneDark'); v.box(32, -9, L + 1, 33, -9, L + 2, 'ember'); v.set(32, -8, L + 1, 'flame'); v.set(33, -8, L + 1, 'flame');
    v.box(35, -7, L + 1, 36, -4, L + 1, 'red'); v.box(35, -7, L + 2, 36, -7, L + 2, 'cloth');
    disc(v, 32, -3, 2.6, 1.8, L, L, 'stoneDark');
    v.box(30, -6, L + 1, 30, -2, L + 4, 'woodDark'); crate(v, 34, 0, L + 1);
  }

  /* ---- the dozer in the bay, and the crawlers it is coming for ---- */
  if (T('dozer')) dozer(v, 41, 16, L + 1);
  if (T('crawlers')) crawlersAt(v, 22, 9, L + 1);

  /* ---- a step down in front: the first safe room, the gym ---- */
  const LO = L - 4;
  if (T('safe-room-1')) {
    isle(v, 14, 16, 27, 27, LO, 112, { depth: 6, top: (x, y) => (((x >> 1) + (y >> 1)) % 2 ? 'white' : 'red') });
    chamber(v, 14, 16, 27, 27, LO, 6, { seed: 113, mat: (_x, _y, z) => (z === LO + 5 || z === LO + 6 ? 'blue' : 'white'), torches: 0 });
    for (let i = 0; i < 4; i++) v.box(18 + i, 14, L - i, 19 + i, 15, L - i, 'stone');                // steps down from the artery
    opening(v, 18, 16, 21, 17, LO);
    v.box(23, 18, LO + 1, 25, 18, LO + 5, 'red'); v.box(23, 19, LO + 4, 25, 22, LO + 4, 'accent');  // the slide
    disc(v, 24, 24, 2.2, 2.2, LO + 1, LO + 1, (x, y) => ['red', 'accent', 'blue', 'white'][(x * 3 + y) % 4]);
    for (const [x, y] of [[17, 21], [17, 24], [20, 24]]) { v.box(x, y, LO + 1, x + 1, y, LO + 2, 'wood'); v.set(x, y + 1, LO + 1, 'red'); }
    v.box(16, 18, LO + 4, 18, 18, LO + 5, 'black'); v.box(16, 18, LO + 5, 17, 18, LO + 5, 'window');  // the screen that counts
  }
  if (T('gym')) {
    isle(v, 28, 16, 37, 25, LO, 114, { depth: 6, top: tiles('stoneDark', 'black', 0.25, 5) });
    chamber(v, 28, 16, 37, 25, LO, 6, { seed: 115, torches: 5 });
    opening(v, 28, 19, 29, 22, LO);
    for (const [x, y] of [[31, 19], [34, 19], [31, 22]]) { v.box(x, y, LO + 1, x + 1, y, LO + 1, 'black'); v.box(x - 1, y, LO + 2, x + 2, y, LO + 2, 'metal'); }
    v.box(34, 22, LO + 1, 35, 23, LO + 1, 'red');
  }

  /* ---- the grid of blocks at the front left ---- */
  if (T('grid')) {
    const GL = L - 2;
    isle(v, 0, 18, 13, 33, GL, 116, { depth: 7, top: tiles('stone', 'stoneDark', 0.3, 6) });
    v.chunk = 2;
    for (const [x, y, h] of [[0, 18, 8], [8, 18, 6], [0, 26, 6], [8, 26, 4]] as const) v.box(x, y, GL + 1, x + 5, y + 5, GL + h, (xx, yy, z) => (cell(xx, yy + z * 5, 8) < 0.3 ? 'stoneDark' : 'stone'));
    v.chunk = 1;
    for (const [x, y] of [[2, 23], [10, 23], [5, 31]]) archway(v, 'x', x, y, GL, 2, 2);
    torch(v, 6, 20, GL + 3);
  }

  /* ---- the Hoarder's heap, on a terrace at the back ---- */
  if (T('hoarder-lair')) {
    const C = [46, -9] as const, R = 7, Z = L + 4;
    isle(v, C[0] - R, C[1] - R, C[0] + R, C[1] + R, Z, 117, { depth: 8, shape: (x, y) => Math.hypot(x - C[0], y - C[1]) <= R + 0.3 });
    v.chunk = 2;
    for (let x = C[0] - R; x <= C[0] + R; x++) for (let y = C[1] - R; y <= C[1] + R; y++) {
      const d = Math.hypot(x - C[0], y - C[1]); if (d > R || d <= R - 2) continue;
      const back = x - C[0] + y - C[1] < 2; v.box(x, y, Z + 1, x, y, Z + (back ? 6 : 2), 'stone');
    }
    v.chunk = 1;
    const r = rng(118);
    for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = r() * 4.5; const x = Math.round(C[0] + Math.cos(a) * d), y = Math.round(C[1] + Math.sin(a) * d); v.col(x, y, Z + 1, Z + 1 + Math.round((5 - d) * 0.9 * r()), ['black', 'metalDark', 'wood', 'cloth', 'dirtDark'][Math.floor(r() * 5)]); }
    torch(v, C[0] - 4, C[1] - 4, Z + 4);
  }

  /* ---- the goblins' workshop off the bay, and what was left of it ---- */
  if (T('workshop')) {
    isle(v, WS.x0, WS.y0, WS.x1, WS.y1, L, 119, { depth: 7, top: tiles('stoneDark', 'dirtDark', 0.3, 9) });
    chamber(v, WS.x0, WS.y0, WS.x1, WS.y1, L, H, { seed: 120, back: 'y', torches: 5 });
    v.box(56, 3, L + 1, 59, 6, L + 5, 'metal'); v.box(56, 3, L + 6, 59, 6, L + 6, 'metalDark');
    v.col(58, 4, L + 7, L + 11, 'metalDark'); v.set(58, 4, L + 13, 'cloth'); v.set(59, 4, L + 15, 'cloth');
    for (let x = 56; x <= 59; x++) v.set(x, 7, L + 3, 'window');
    for (const [x, y] of [[61, 3], [61, 8], [57, 10]]) { v.box(x, y, L + 1, x + 2, y + 1, L + 1, 'metalDark'); v.set(x, y, L + 2, 'rail'); }
    disc(v, 63, 6, 1.4, 1.4, L + 1, L + 2, 'black');
    crate(v, 62, 11, L + 1); barrel(v, 55, 11, L + 1);
  }
  if (T('workshop-ruin')) {
    isle(v, WS.x0, WS.y0, WS.x1, WS.y1, L, 119, { depth: 7, top: 'water' });
    chamber(v, WS.x0, WS.y0, WS.x1, WS.y1, L, 4, { seed: 121, back: 'y', near: 0, torches: 0, mat: (x, y, z) => (cell(x, y + z, 10) < 0.5 ? 'black' : 'stoneDark') });
    const r = rng(122);
    for (let i = 0; i < 16; i++) v.col(56 + Math.floor(r() * 9), 3 + Math.floor(r() * 9), L + 1, L + 1 + Math.floor(r() * 2), r() < 0.5 ? 'black' : 'metalDark');
    for (let y = 2; y <= 13; y++) { v.set(WS.x0, y, L + 1, 'ember'); v.set(WS.x0, y, L + 2, 'flame'); }   // the wall of fire
  }

  /* ---- the spiral at the front right: ring walls, a drawbridge, the stairs at its heart ---- */
  const spiralIsle = (seed: number, top: string | ((x: number, y: number) => string)) =>
    isle(v, SP[0] - SR, SP[1] - SR, SP[0] + SR, SP[1] + SR, L, seed, { depth: 11, top, shape: (x, y) => Math.hypot(x - SP[0], y - SP[1]) <= SR + 0.4 });
  const ringWall = (r: number, h: number, gapAt: number, nearLow = true) => {
    v.chunk = 2;
    for (let x = SP[0] - SR; x <= SP[0] + SR; x++) for (let y = SP[1] - SR; y <= SP[1] + SR; y++) {
      const d = Math.hypot(x - SP[0] + 0.5, y - SP[1] + 0.5); if (d > r || d <= r - 2) continue;
      const a = Math.atan2(y - SP[1], x - SP[0]);
      if (Math.abs(((a - gapAt + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.32) continue;
      const back = x - SP[0] + y - SP[1] < 0;
      const hh = back || !nearLow ? h : 2;
      v.box(x, y, L + 1, x, y, L + hh + (back && ((x >> 1) + (y >> 1)) % 2 ? 2 : 0), 'stone');
    }
    v.chunk = 1;
  };
  const drawbridge = () => { v.chunk = 2; v.box(48, 18, L, 49, 22, L, 'wood'); v.chunk = 1; for (const x of [47, 50]) v.col(x, 21, L + 1, L + 5, 'metalDark'); };
  if (T('spiral')) {
    spiralIsle(123, tiles('tile', 'stone', 0.25, 11));
    ringWall(SR, 6, -Math.PI / 2); ringWall(8, 5, 0.6); ringWall(5, 4, 3.4);
    for (let a = 3.3; a < 6.0; a += 0.5) { const x = Math.round(SP[0] + Math.cos(a) * (SR - 1)), y = Math.round(SP[1] + Math.sin(a) * (SR - 1)); v.box(x, y, L + 2, x, y, L + 4, 'metalDark'); }
    drawbridge();
    opening(v, 46, 16, 51, 17, L);
  }
  if (T('rolling-thing')) disc(v, SP[0] + 6, SP[1] - 4, 1.6, 1.6, L + 1, L + 3, 'pink');
  if (T('stairwell')) { v.box(SP[0], SP[1], L, SP[0] + 1, SP[1] + 1, L, 'window'); v.set(SP[0], SP[1], L + 1, 'flame'); }
  if (T('arena')) {
    spiralIsle(124, (x, y) => (Math.round(Math.hypot(x - SP[0], y - SP[1]) / 2) % 2 ? 'stoneDark' : 'purple'));
    ringWall(SR, 3, -Math.PI / 2);
    const r = rng(125);
    for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, d = 4 + r() * 5; v.set(Math.round(SP[0] + Math.cos(a) * d), Math.round(SP[1] + Math.sin(a) * d), L + 1, r() < 0.5 ? 'stone' : 'stoneDark'); }
    drawbridge();
    opening(v, 46, 16, 51, 17, L);
  }
  if (T('forcefield')) {
    v.box(SP[0], SP[1], L, SP[0] + 1, SP[1] + 1, L, 'window');
    for (let x = -4; x <= 5; x++) for (let y = -4; y <= 5; y++) for (let z = 1; z <= 5; z++) {
      const d = Math.hypot((x - 0.5) / 4, (y - 0.5) / 4, z / 5); if (d <= 1 && d > 0.78) v.set(SP[0] + x, SP[1] + y, L + z, 'force');
    }
  }
  if (T('ramp')) {
    v.clear(SP[0] - 1, SP[1] - 1, L - 6, SP[0] + 2, SP[1] + 6, L);
    for (let i = 0; i < 7; i++) v.box(SP[0] - 1, SP[1] - 1 + i, L - 7, SP[0] + 2, SP[1] - 1 + i, L - 1 - i, (_x, _y, z) => (z === L - 1 - i ? 'stoneDark' : 'stone'));
    v.box(SP[0] - 1, SP[1] - 1, L + 1, SP[0] + 2, SP[1] - 1, L + 3, 'stoneDark'); v.box(SP[0], SP[1] - 1, L + 1, SP[0] + 1, SP[1] - 1, L + 2, 'void');
  }

  /* ---- the camp at the drawbridge ---- */
  if (T('camp')) {
    for (const [x, y, m] of [[42, 12, 'red'], [44, 14, 'blue'], [40, 10, 'cloth'], [52, 10, 'red']] as const) v.box(x, y, L + 1, x + 1, y, L + 1, m);
    for (const [x, y] of [[46, 11], [48, 13], [51, 13], [44, 10]]) { v.col(x, y, L + 1, L + 2, 'metal'); v.set(x + 1, y, L + 1, 'black'); }
    crate(v, 50, 6, L + 1); barrel(v, 47, 5, L + 1);
  }

  /* ---- the hero picture only: the Speedbump in the arena, the Ball of Swine on it ---- */
  if (shown.has('hero')) {
    v.tag = 'arena';
    speedbump(v, SP[0], SP[1] + 1, L + 1);
    ballOfSwine(v, SP[0] - 1, SP[1], L + 10, 5.2);
    const r = rng(173);
    for (let i = 0; i < 9; i++) {           // tusklings in tuxedos raining down
      const x = SP[0] - 9 + Math.floor(r() * 18), y = SP[1] - 8 + Math.floor(r() * 16), z = L + 4 + Math.floor(r() * 14);
      v.box(x, y, z, x + 1, y + 1, z + 1, 'pink'); v.box(x, y, z - 1, x + 1, y + 1, z - 1, 'black'); v.set(x + 1, y + 1, z, 'white'); v.set(x + 1, y + 1, z + 2, 'bone');
    }
    crawlersAt(v, SP[0] + 3, SP[1] + 7, L + 1);
  }
  dropLooseTorches(v);
  return v;
}

const anchors: VoxelMap['anchors'] = {
  surface: [5, -10, 16], entrance: [2, 8, L + 6], arteries: [24, 9, L], guild: [31, COR.y0 + 1, L + 4], 'guild-room': [32, -4, L + 1],
  dozer: [46, 5, L + 10], crawlers: [23, 9, L + 4], 'safe-room-1': [21, 22, LO1()], 'hoarder-lair': [46, -9, L + 6], grid: [6, 24, L + 4],
  workshop: [58, 5, L + 7], 'workshop-ruin': [60, 7, L + 1], spiral: [SP[0], SP[1] - SR, L + 6], 'rolling-thing': [SP[0] + 6, SP[1] - 4, L + 3],
  camp: [45, 12, L + 2], gym: [32, 20, LO1() + 2], arena: [SP[0] - 6, SP[1] + 3, L], stairwell: [SP[0], SP[1], L + 1], forcefield: [SP[0], SP[1], L + 5], ramp: [SP[0], SP[1] + 3, L - 3],
};
function LO1() { return L - 4; }

export const FLOOR_1_VOXEL: VoxelMap = { build, anchors };
export const buildFloor1 = build;

/** The tile: the scene at 1:2, the way in, the artery and the dozer coming down it. */
export const TILE_1_LAYERS = ['surface', 'entrance', 'arteries', 'guild', 'dozer', 'crawlers'];
/** The hero, once the floor is finished: the arena with the walls down, the Speedbump and the Ball of Swine on it. */
export const HERO_1_LAYERS = ['surface', 'entrance', 'arteries', 'guild', 'guild-room', 'safe-room-1', 'hoarder-lair', 'grid', 'workshop-ruin', 'camp', 'gym', 'arena', 'hero'];
