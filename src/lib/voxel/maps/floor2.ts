import { Vox, rng, slab, torch, disc, ring } from '../vox.ts';
import { CARL, DONUT, PALETTE } from '../../maps/sprites.ts';
import { cell, tiles, isle, chamber, opening, archway, barrel, crate, crawlersAt, dropLooseTorches } from './floor1.ts';
import type { VoxelMap } from './index.ts';

/* Floor 2's page map, one diorama in floor 1's big-block masonry: grey
   cinderblock blotched with lichen, white floors, each quadrant on its own lump
   of rock. The main hallway runs across the middle; in front of it the storm
   shelter a step down at the left, the arrival quadrant, the clurichauns'
   filling room and the Krakaren's lair; behind it the Mind Horrors, the dogs'
   curved hall and Big Shot Chicken; on a high terrace at the very back the
   kobolds' pound and the fighting pit; and at the back right, raised, the
   stairwell, first as fog with an icon in it, then as a round chamber with a
   shaft of light. The guild sits at the hallway's east end, just beyond.

   The homepage tile is this scene at its artAt (1:37); the hero is the rage
   elemental dragged into the stairwell. Shapes only; every word is in
   data/books.json. */

const L = 1;
const HALL = { x0: 0, y0: 14, x1: 47, y1: 21 } as const;
const ST = [51, 4] as const, SR = 7, SZ = L + 2;     // the stairwell's chamber, back right, raised
const H = 7;
const KX = 46, KY = 22;                             // the Krakaren's lair

/** Cinderblock with lichen on it, varied per big block. */
const block = (s: number) => (x: number, y: number, z: number) => { const k = cell(x, y + z * 3, s); return k < 0.07 ? 'dirt' : k < 0.25 ? 'stoneDark' : 'stone'; };
const floorTop = (s: number) => tiles('white', 'tile', 0.3, s);

/** A Mind Horror: a pink brain hanging in the air, its folds dark, tentacles under it. */
function brain(v: Vox, x: number, y: number, z: number, r = 2.2) {
  for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) for (let dz = -2; dz <= 3; dz++) {
    const d = Math.hypot(dx / r, dy / r, dz / (r * 0.85)); if (d > 1) continue;
    v.set(x + dx, y + dy, z + dz, (dx * 3 + dy * 5 + dz * 7 + 40) % 5 === 0 && d > 0.6 ? 'redDark' : 'pink');
  }
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1], [1, 1]]) for (let k = 1; k <= 3; k++) v.set(x + dx + (k === 3 ? dx : 0), y + dy, z - Math.ceil(r) - k + 1, 'redDark');
}

/** A grub: a pale segmented worm with a brown head, lying along x. */
function grub(v: Vox, x: number, y: number, z: number, big = false) {
  if (!big) { v.set(x, y, z, 'bone'); v.set(x + 1, y, z, 'dirt'); return; }
  for (let i = 0; i < 6; i++) { const h = i === 0 || i === 5 ? 1 : 2; v.box(x + i, y, z, x + i, y + 2, z + h - 1, i % 2 ? 'bone' : 'cloth'); }
  v.box(x + 6, y, z, x + 7, y + 2, z + 1, 'dirt'); v.set(x + 8, y, z, 'dirtDark'); v.set(x + 8, y + 2, z, 'dirtDark');
  v.set(x + 7, y, z + 2, 'black'); v.set(x + 7, y + 2, z + 2, 'black');
}

/** The rage elemental: a mass of purple-black smoke on six legs under a horned badger skull. */
function elemental(v: Vox, x: number, y: number, z: number, s = 1) {
  const r = rng(2201);
  const R = 2.2 * s, Hh = Math.round(5 * s);
  for (let dz = 0; dz <= Hh; dz++) {
    const rr = R * (0.75 + 0.35 * Math.sin((dz / Hh) * Math.PI));
    for (let dx = -Math.ceil(rr); dx <= Math.ceil(rr); dx++) for (let dy = -Math.ceil(rr); dy <= Math.ceil(rr); dy++)
      if (Math.hypot(dx, dy) <= rr && r() < 0.92) v.set(x + dx, y + dy, z + Math.round(2 * s) + dz, r() < 0.3 ? 'black' : 'purple');
  }
  for (let i = 0; i < 6; i++) {          // the legs
    const a = (i / 6) * Math.PI * 2 + 0.3;
    for (let k = 0; k <= Math.round(2 * s); k++) v.set(Math.round(x + Math.cos(a) * (R + k * 0.5)), Math.round(y + Math.sin(a) * (R + k * 0.5)), z + Math.round(2 * s) - k, 'purple');
  }
  const top = z + Math.round(2 * s) + Hh + 1, w = Math.max(1, Math.round(s));
  v.box(x - w, y - w, top, x + w, y + w, top + w, 'bone');                     // the skull
  v.set(x + w, y - 1, top + Math.ceil(w / 2), 'black'); v.set(x + w, y + 1, top + Math.ceil(w / 2), 'black');
  for (const sgn of [-1, 1]) for (let k = 1; k <= 2 * w; k++) v.set(x - Math.floor(k / 2), y + sgn * (w + Math.ceil(k / 2)), top + w + k, 'bone');   // horns
}

function build(shown: Set<string>): Vox {
  const v = new Vox();
  const has = (id: string) => shown.has(id);
  const T = (id: string) => { v.tag = id; return has(id); };

  /* ---- the main hallway, the arrival quadrant in front of it, the dogs' curved hall behind ---- */
  if (T('halls')) {
    isle(v, HALL.x0, HALL.y0, HALL.x1, HALL.y1, L, 201, { depth: 7, top: floorTop(1) });
    chamber(v, HALL.x0, HALL.y0, HALL.x1, HALL.y1, L, H - 1, { back: 'y', nearSides: 'none', seed: 202, mat: block(2), torches: 7 });
    isle(v, 16, 22, 31, 33, L, 203, { depth: 8, top: floorTop(3), shape: (x, y) => !(x >= 30 && y >= 32) });
    chamber(v, 16, 22, 31, 33, L, 3, { back: 'none', seed: 204, mat: block(4), near: 2 });
    const r = rng(205);
    for (let i = 0; i < 14; i++) v.set(18 + Math.floor(r() * 12), 24 + Math.floor(r() * 8), L + 1, r() < 0.5 ? 'stone' : 'stoneDark');   // rubble
    crate(v, 28, 23, L + 1); barrel(v, 17, 30, L + 1);
  }

  /* ---- the guild at the hallway's end; the stairwell's corner in the fog ---- */
  if (T('guild')) {
    isle(v, 48, 14, 57, 23, L, 206, { depth: 6, top: floorTop(5) });
    chamber(v, 48, 14, 57, 23, L, H - 1, { back: 'y', seed: 207, mat: block(6), torches: 0 });
    for (let x = 51; x <= 53; x++) for (let z = L + 1; z <= L + 4; z++) v.set(x, 15, z, x === 52 && z === L + 2 ? 'metalDark' : 'woodDark');
    v.box(50, 16, L + 5, 54, 16, L + 5, 'accent'); torch(v, 55, 16, L + 3); crate(v, 55, 19, L + 1);
    opening(v, 46, 16, 49, 19, L);
  }
  if (T('fog')) {
    slab(v, ST[0] - SR, ST[1] - SR, ST[0] + SR, ST[1] + SR, SZ, { depth: 6, seed: 208, crust: 'stoneDark', top: tiles('stoneDark', 'black', 0.4, 7), under: ['stoneDark', 'dirtDark'],
      shape: (x, y) => Math.hypot(x - ST[0], y - ST[1]) <= SR + 0.5 });
    for (let x = ST[0] - SR; x <= ST[0] + SR; x++) for (let y = ST[1] - SR; y <= ST[1] + SR; y++) {
      const d = Math.hypot(x - ST[0], y - ST[1]); if (d > SR + 0.5) continue;
      for (let z = SZ + 1; z <= SZ + (d < SR - 2 ? 3 : 2); z++) v.set(x, y, z, 'mist');
    }
    // the icon over it: a little flight of stairs, lit
    for (let i = 0; i < 3; i++) v.box(ST[0] - 1 + i, ST[1], SZ + 5 + i, ST[0] + 1, ST[1] + 1, SZ + 5 + i, 'window');
  }
  if (T('stair-chamber')) {
    isle(v, ST[0] - SR, ST[1] - SR, ST[0] + SR, ST[1] + SR + 4, SZ, 209, { depth: 8, top: floorTop(8),
      shape: (x, y) => Math.hypot(x - ST[0], y - ST[1]) <= SR + 0.5 || (y > ST[1] && Math.abs(x - ST[0] - 0.5) <= 2.5) });
    v.chunk = 2;
    for (let x = ST[0] - SR; x <= ST[0] + SR; x++) for (let y = ST[1] - SR; y <= ST[1] + SR; y++) {
      const d = Math.hypot(x - ST[0] + 0.5, y - ST[1] + 0.5); if (d > SR || d <= SR - 2) continue;
      if (y > ST[1] && Math.abs(x - ST[0] - 0.5) <= 2.5) continue;
      const back = x - ST[0] + y - ST[1] < 0;
      v.box(x, y, SZ + 1, x, y, SZ + (back ? H + 1 : 2) + (back && ((x >> 1) + (y >> 1)) % 2 ? 2 : 0), block(9)(x, y, 0));
    }
    v.chunk = 1;
    for (let y = ST[1] + 3; y <= ST[1] + SR + 4; y++) for (let x = ST[0] - 2; x <= ST[0] + 3; x++) if (v.has(x, y, SZ)) v.set(x, y, SZ, cell(x, y, 12) < 0.6 ? 'black' : 'stoneDark');   // scorched
    for (let i = 0; i < 4; i++) v.box(ST[0] - 2, ST[1] + SR + 1 + i, SZ - 1 - i, ST[0] + 3, ST[1] + SR + 1 + i, SZ - 1 - i, 'stone');   // steps down to the hallway
    v.clear(ST[0] - 1, ST[1] - 1, SZ - 2, ST[0] + 2, ST[1] + 2, SZ);
    v.box(ST[0] - 1, ST[1] - 1, SZ - 3, ST[0] + 2, ST[1] + 2, SZ - 3, 'void');
    for (let z = SZ + 1; z <= SZ + 20; z++) v.box(ST[0], ST[1], z, ST[0] + 1, ST[1] + 1, z, 'beam');
    torch(v, ST[0] - 4, ST[1] - 4, SZ + 3); torch(v, ST[0] + 3, ST[1] - 5, SZ + 3);
  }

  /* ---- the storm shelter, a step down at the front left ---- */
  const LO = L - 4;
  if (T('storm-shelter')) {
    isle(v, 0, 22, 15, 37, LO, 210, { depth: 7, top: floorTop(10), shape: (x, y) => !(x <= 1 && y >= 36) });
    chamber(v, 0, 22, 15, 37, LO, H, { seed: 211, mat: block(11), torches: 0, back: 'x' });
    for (let i = 0; i < 4; i++) v.box(6 + 0, 20 - 0 + i, L - i, 9, 21 + i, L - i, 'stone');
    opening(v, 6, 22, 9, 23, LO);
    for (let y = 25; y <= 35; y += 3) { v.box(4, y, LO + 1, 6, y + 1, LO + 1, 'cloth'); v.set(4, y, LO + 2, 'white'); }   // cots against one wall
    for (const y of [26, 31]) { v.box(2, y, LO + 3, 2, y + 2, LO + 5, 'black'); v.box(2, y + 1, LO + 4, 2, y + 1, LO + 4, 'window'); }  // screens
    v.col(11, 32, LO + 1, LO + 4, 'metalDark'); v.box(10, 32, LO + 5, 12, 32, LO + 6, 'metal'); v.set(12, 32, LO + 7, 'red');         // the mailbox on its pole
  }

  /* ---- behind the hallway: the Mind Horrors, the dogs' curved hall ---- */
  if (T('mind-horrors')) {
    isle(v, 0, 0, 13, 13, L, 212, { depth: 6, top: floorTop(13) });
    chamber(v, 0, 0, 13, 13, L, H, { seed: 213, mat: block(14), nearSides: 'x', torches: 5 });
    opening(v, 4, 12, 7, HALL.y0 + 1, L);
    brain(v, 5, 5, L + 9, 2.9); brain(v, 10, 9, L + 7, 2);
    crate(v, 10, 2, L + 1); barrel(v, 3, 10, L + 1);
  }
  /* the dogs' curved hall is architecture, there in every state; the patrols come and go */
  v.tag = 'halls';
  if (has('halls')) {
    const C = [16, 14] as const;
    const onArc = (x: number, y: number) => { const d = Math.hypot(x - C[0], y - C[1]); return d >= 4 && d <= 13 && x >= 16 && y <= 13; };
    isle(v, 16, 0, 29, 13, L, 214, { depth: 6, top: floorTop(15), shape: onArc });
    v.chunk = 2;
    for (let x = 16; x <= 30; x++) for (let y = 0; y <= 13; y++) {
      const d = Math.hypot(x - C[0], y - C[1]);
      if (x >= 16 && y <= 13 && d > 11 && d <= 13 && v.has(x, y, L)) v.box(x, y, L + 1, x, y, L + H - 1, block(16)(x, y, 0));
      if (x >= 16 && y <= 13 && d >= 4 && d < 6 && v.has(x, y, L)) v.box(x, y, L + 1, x, y, L + 2, block(16)(x, y, 0));
    }
    v.chunk = 1;
  }
  if (T('dingo-patrols')) {
    for (const [x, y] of [[21, 5], [25, 9]]) { v.box(x, y, L + 1, x + 2, y, L + 2, 'plaster'); v.set(x + 3, y, L + 3, 'plaster'); v.set(x, y, L + 3, 'woodDark'); v.set(x + 3, y, L + 2, 'plaster'); }  // dingoes on patrol
  }

  /* ---- the back terrace: the kobolds' pound and the fighting pit ---- */
  const HI = L + 4;
  if (T('kobold-pound')) {
    isle(v, 16, -14, 31, -1, HI, 215, { depth: 7, top: tiles('dirt', 'dirtDark', 0.3, 17) });
    chamber(v, 16, -14, 31, -1, HI, H, { seed: 216, mat: block(18), torches: 5 });
    for (const y of [-11, -7, -3]) for (let x = 18; x <= 26; x++) { v.set(x, y, HI + 1, 'stone'); if (x % 2 === 0) v.col(x, y - 1, HI + 1, HI + 3, 'metalDark'); }
    v.box(28, -11, HI + 1, 28, -4, HI + 5, 'wood'); v.box(28, -8, HI + 1, 28, -7, HI + 4, 'woodDark');   // the barn doors
  }
  if (T('arena')) {
    isle(v, 0, -14, 15, -1, HI, 217, { depth: 7, top: tiles('stone', 'stoneDark', 0.3, 19) });
    chamber(v, 0, -14, 15, -1, HI, H, { seed: 218, mat: block(20), torches: 5 });
    disc(v, 8, -7, 4.5, 4.5, HI, HI, (x, y) => (cell(x, y, 21) < 0.25 ? 'redDark' : 'red'));
    ring(v, 8, -7, 5.2, 1, HI + 1, HI + 1, 'wood');
    v.box(3, -12, HI + 1, 4, -11, HI + 3, 'bone');
    for (let x = 6; x <= 13; x += 2) { v.box(x, -13, HI + 1, x + 1, -12, HI + 2, (xx) => (xx % 2 ? 'void' : 'metalDark')); v.box(x, -13, HI + 3, x + 1, -12, HI + 3, 'metalDark'); }   // the pet cages
  }

  /* ---- the front right: the clurichauns' filling room, the Krakaren's lair beside it ---- */
  if (T('clurichauns')) {
    isle(v, 32, 22, 45, 35, L, 219, { depth: 8, top: floorTop(22) });
    chamber(v, 32, 22, 45, 35, L, 4, { back: 'none', seed: 220, mat: block(23) });
    v.box(33, 23, L + 6, 43, 23, L + 6, 'metal'); v.box(43, 23, L + 3, 43, 23, L + 5, 'metal');             // the tube from the ceiling
    v.box(40, 24, L + 1, 44, 27, L + 2, 'metal'); v.clear(41, 25, L + 2, 43, 26, L + 2); v.box(41, 25, L + 1, 43, 26, L + 1, 'dirt');   // the tin bathtub of moonshine
    for (const [x, y] of [[34, 26], [37, 31], [42, 31], [35, 30]]) { v.box(x, y, L + 1, x + 1, y + 1, L + 1, 'dirt'); v.set(x, y, L + 2, 'dirtDark'); v.set(x + 1, y + 1, L + 2, 'dirt'); }   // jugs
    torch(v, 33, 28, L + 3);
  }
  const lair = (seed: number, top: string | ((x: number, y: number) => string)) => {
    isle(v, KX, KY, KX + 11, KY + 13, L, seed, { depth: 9, top, shape: (x, y) => !(x >= KX + 10 && y >= KY + 12) });
    chamber(v, KX, KY, KX + 11, KY + 13, L, H, { back: 'x', seed: seed + 1, mat: block(24), torches: 0 });
  };
  const krakaren = (x: number, y: number, z: number) => {
    disc(v, x, y, 3, 3, z, z + 3, 'pink'); disc(v, x, y, 2, 2, z + 4, z + 5, 'pink');
    v.set(x + 3, y - 1, z + 3, 'black'); v.set(x + 3, y + 1, z + 3, 'black');
    for (const [dx, dy] of [[4, 2], [4, -2], [2, 4], [-2, 4], [-4, 1]]) for (let k = 1; k <= 3; k++) v.set(x + Math.round(dx * k / 2), y + Math.round(dy * k / 2), z, 'pink');
  };
  if (T('krakaren')) {
    lair(221, floorTop(25));
    v.box(KX + 1, KY + 5, L + 1, KX + 1, KY + 7, L + 4, 'woodDark'); v.box(KX + 2, KY + 4, L + 5, KX + 2, KY + 8, L + 5, 'blue');   // the community-center door
    krakaren(KX + 6, KY + 7, L + 1);
  }
  if (T('krakaren-breach')) {
    lair(221, floorTop(25));
    krakaren(KX + 6, KY + 7, L + 1);
    opening(v, KX, KY + 3, KX + 1, KY + 4, L); opening(v, KX, KY + 9, KX + 1, KY + 10, L);
    for (const y of [KY + 3, KY + 9]) for (let i = 0; i < 5; i++) v.set(KX + 1 - i, y + (i % 2), L + 1 + (i % 2), 'pink');
  }
  if (T('krakaren-burned')) {
    lair(221, tiles('black', 'stoneDark', 0.3, 26));
    for (let x = KX; x <= KX + 11; x++) for (let y = KY; y <= KY + 13; y++) for (let z = L + 1; z <= L + H + 2; z++) if (v.has(x, y, z) && cell(x, y + z, 27) < 0.6 && (v.get(x, y, z) === 'stone' || v.get(x, y, z) === 'dirt')) v.set(x, y, z, cell(x, y + z, 28) < 0.5 ? 'black' : 'stoneDark');
    disc(v, KX + 6, KY + 8, 4, 3, L + 1, L + 1, 'pink'); disc(v, KX + 6, KY + 8, 3, 2, L + 2, L + 2, 'redDark'); v.set(KX + 7, KY + 8, L + 3, 'redDark');   // the slumped corpse
    for (let x = KX + 3; x <= KX + 8; x++) for (let y = KY + 1; y <= KY + 4; y++) for (let z = L + 1; z <= L + 4; z++) {           // the cage of fried grubs
      const edge = x === KX + 3 || x === KX + 8 || y === KY + 1 || y === KY + 4 || z === L + 4;
      if (edge && (x + y + z) % 2 === 0) v.set(x, y, z, 'metalDark'); else if (!edge && z === L + 1) v.set(x, y, z, 'black');
    }
    v.col(KX + 10, KY + 3, L + 1, L + 3, 'dirt'); v.box(KX + 9, KY + 3, L + 4, KX + 10, KY + 3, L + 4, 'dirt');   // the little still
  }

  /* ---- the swarm, the chicken, the elemental at its door, the pupae, the hornets ---- */
  if (T('grub-swarm')) {
    const r = rng(229);
    for (let i = 0; i < 40; i++) { const x = Math.floor(r() * 46), y = 16 + Math.floor(r() * 20); if (v.has(x, y, L) && !v.has(x, y, L + 1) && !v.has(x + 1, y, L + 1) && v.has(x + 1, y, L)) grub(v, x, y, L + 1); }
    grub(v, 20, 26, L + 1, true); grub(v, 8, 17, L + 1, true); grub(v, 34, 28, L + 1, true);
  }
  if (T('big-shot-chicken')) {
    isle(v, 32, 2, 43, 13, L, 230, { depth: 6, top: (x, y) => (((x >> 1) + (y >> 1)) % 2 ? 'white' : 'red') });
    chamber(v, 32, 2, 43, 13, L, H - 2, { seed: 231, mat: (_x, _y, z) => (z >= L + 4 ? 'red' : 'white'), torches: 0, nearSides: 'x' });
    for (const [x, y] of [[35, 6], [38, 6], [35, 9]]) { v.box(x, y, L + 1, x + 1, y, L + 2, 'wood'); v.set(x, y + 1, L + 1, 'red'); }
    v.box(40, 5, L + 1, 41, 6, L + 3, 'white'); v.set(41, 5, L + 4, 'window');
    opening(v, 36, 12, 39, HALL.y0 + 1, L);
  }
  if (T('rage-elemental')) elemental(v, 38, 17, L + 1, 1);
  if (T('pupae')) for (const [x, y, z] of [[47, 18, L], [44, 24, L], [28, 18, L], [ST[0] + 3, ST[1] + 8, SZ]] as const) {
    v.box(x, y, z + 1, x + 1, y + 1, z + 4, 'dirt'); v.set(x, y + 1, z + 2, 'ember'); v.set(x + 1, y + 1, z + 3, 'window'); v.set(x, y, z + 5, 'dirtDark');
  }
  if (T('vespas')) for (const [x, y, z] of [[44, 20, L + 9], [26, 18, L + 10]]) {
    v.box(x, y, z, x + 3, y, z, 'accent'); v.set(x + 1, y, z, 'black'); v.set(x + 3, y, z, 'black'); v.set(x + 4, y, z + 1, 'black');
    v.box(x + 1, y - 2, z + 1, x + 2, y - 1, z + 1, 'glass'); v.box(x + 1, y + 1, z + 1, x + 2, y + 2, z + 1, 'glass');
    v.set(x + 3, y, z - 1, 'black');
  }

  /* ---- the crawlers: where they arrive, and with Mongo at the stairs ---- */
  if (T('crawlers')) crawlersAt(v, 24, 29, L + 1);
  if (T('crawlers-mongo')) { v.sprite(ST[0] - 2, ST[1] + 9, SZ + 1, CARL, PALETTE); v.sprite(ST[0], ST[1] + 9, SZ + 1, DONUT, PALETTE); v.box(ST[0] + 3, ST[1] + 9, SZ + 1, ST[0] + 3, ST[1] + 9, SZ + 2, 'pink'); v.set(ST[0] + 4, ST[1] + 9, SZ + 3, 'pink'); }

  /* ---- the hero picture only: the elemental dragged across the oil to the stairwell ---- */
  if (shown.has('hero')) {
    v.tag = 'rage-elemental';
    elemental(v, ST[0] + 1, ST[1] + 1, SZ - 2, 2.2);
    v.tag = 'stair-chamber';
    const r = rng(2202);
    for (let i = 0; i < 40; i++) { const x = 44 + Math.floor(r() * 14), y = 12 + Math.floor(r() * 10); for (const z of [L, SZ]) if (v.has(x, y, z) && !v.has(x, y, z + 1)) v.set(x, y, z, 'black'); }
    // the Chopper and the Bomb Chicken's trailer, racing off down the hallway
    const cx = 52, cy = 18; const ZC = L;
    v.box(cx, cy, ZC + 1, cx, cy, ZC + 2, 'black'); v.box(cx + 4, cy, ZC + 1, cx + 4, cy, ZC + 2, 'black');
    v.box(cx, cy, ZC + 3, cx + 4, cy, ZC + 3, 'dirt'); v.box(cx + 1, cy, ZC + 4, cx + 3, cy, ZC + 4, 'metal'); v.col(cx + 4, cy, ZC + 4, ZC + 5, 'metalDark');
    v.box(cx + 1, cy + 1, ZC + 2, cx + 3, cy + 2, ZC + 3, 'bone'); v.set(cx + 2, cy + 2, ZC + 4, 'black');   // the skull sidecar
    v.box(cx - 6, cy, ZC + 1, cx - 2, cy + 2, ZC + 2, 'woodDark'); v.box(cx - 5, cy, ZC + 3, cx - 3, cy + 2, ZC + 5, 'white'); v.set(cx - 3, cy + 1, ZC + 6, 'red'); v.set(cx - 2, cy + 1, ZC + 5, 'accent');
    v.sprite(cx + 2, cy, ZC + 5, CARL, PALETTE); v.sprite(cx + 3, cy + 2, ZC + 5, DONUT, PALETTE);
  }
  dropLooseTorches(v);
  return v;
}

const anchors: VoxelMap['anchors'] = {
  halls: [22, 18, L], fog: [ST[0], ST[1], SZ + 7], crawlers: [25, 29, L + 4], 'storm-shelter': [8, 30, LO2()], 'mind-horrors': [5, 5, L + 9],
  'dingo-patrols': [23, 6, L + 3], clurichauns: [42, 26, L + 2], guild: [52, 15, L + 5], krakaren: [KX + 6, KY + 7, L + 5], 'krakaren-breach': [KX, KY + 3, L + 2],
  'krakaren-burned': [KX + 6, KY + 8, L + 2], 'grub-swarm': [24, 26, L + 2], 'big-shot-chicken': [38, 7, L + 3], 'rage-elemental': [38, 17, L + 9],
  pupae: [44, 24, L + 5], vespas: [45, 20, L + 10], 'stair-chamber': [ST[0], ST[1], SZ + 4], 'kobold-pound': [22, -7, L + 6], arena: [8, -7, L + 4],
  'crawlers-mongo': [ST[0], ST[1] + 9, SZ + 4],
};
function LO2() { return L - 4; }

export const FLOOR_2_VOXEL: VoxelMap = { build, anchors };
export const buildFloor2 = build;

/** The tile: the scene at 1:37, the lair burned out and the grubs coming. */
export const TILE_2_LAYERS = ['halls', 'fog', 'crawlers', 'storm-shelter', 'mind-horrors', 'dingo-patrols', 'clurichauns', 'guild', 'krakaren-burned', 'grub-swarm'];
/** The hero, once the floor is finished: the rage elemental dragged to the stairwell, the Chopper and the Bomb Chicken racing away. */
export const HERO_2_LAYERS = ['halls', 'storm-shelter', 'mind-horrors', 'dingo-patrols', 'clurichauns', 'guild', 'krakaren-burned', 'grub-swarm', 'big-shot-chicken', 'pupae', 'vespas', 'stair-chamber', 'hero'];
