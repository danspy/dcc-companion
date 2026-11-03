import { Vox, rng, slab, banner } from '../vox.ts';
import { CARL, DONUT, PALETTE } from '../../maps/sprites.ts';
import type { VoxelMap } from './index.ts';

/* Floor 7's page map, composed as one diorama: the starting end of the race.
   The island is the maze itself, a lattice of dark stone that only exists
   under the tunnels, with holes to the sky between the runs. On it the glass
   tunnels run node to node (big octagonal glass boxes, lit green inside), the
   pole-position chamber stands on its own terrace at the near right under its
   green roof, the spiral of the other pods climbs behind it, and at the far
   left the tunnels end in a stepped dais of stairwell portals.

   Once the floor has gone (6:1) the lattice is all that is left: glass in
   drifts along where the tunnels ran, shards in the air, and every crawler
   pulled into the portals. The ground and its banners carry no layer, because
   they are there in every state. The tile is this same scene at its artAt, and
   the hero picture is this scene at the moment it breaks. */

/* The maze's centrelines: every run is a tube four cells across, two big blocks. */
const H_RUNS: [number, number, number][] = [[4, 4, 28], [28, 4, 28], [16, -6, 4]];   // [y, x0, x1]
const V_RUNS: [number, number, number][] = [[4, 4, 28], [16, 4, 28], [28, 4, 28]];   // [x, y0, y1]
const CHUTE_RUN: [number, number, number] = [16, 28, 33];                            // the last run into the chamber
const NODES: [number, number][] = [[4, 4], [28, 4], [16, 16], [4, 28], [28, 28], [28, 16]];

/* The pole-position chamber, its floor corners, on the terrace at the near right. */
const P0 = [34, 10] as const, P1 = [46, 22] as const;
const PX = 40, PY = 16;
/* The spiral of the other pods, behind the chamber. */
const SC = [40, 1] as const, SH = 5;
/* The portals at the far end: three arches on a stepped dais, facing the maze. */
const GX = -8;
const GATES: [number, number, number, number][] = [[13, 19, 1, 13], [5, 10, -1, 9], [22, 27, -1, 9]];   // [y0, y1, z0, top]

/** Where the spiral's ramp is at t, from its foot (0) to its top (1): a square helix. */
const ramp = (t: number): [number, number, number] => {
  const L = SH * 8, s = (t * 1.5 * L) % L;
  const side = Math.floor(s / (SH * 2)), u = s % (SH * 2) - SH;
  const [x, y] = side === 0 ? [u, -SH] : side === 1 ? [SH, u] : side === 2 ? [-u, SH] : [-SH, -u];
  return [SC[0] + Math.round(x), SC[1] + Math.round(y), Math.round(3 + t * 22)];
};
const PODS = [0.14, 0.32, 0.5, 0.68, 0.86, 1];
const AGATHA = PODS[3];

/** Is (x, y) under the maze, or one of the terraces? The island's footprint. */
function ground(x: number, y: number) {
  for (const [c, a, b] of H_RUNS) if (y >= c - 4 && y <= c + 3 && x >= a - 4 && x <= b + 3) return true;
  for (const [c, a, b] of V_RUNS) if (x >= c - 4 && x <= c + 3 && y >= a - 4 && y <= b + 3) return true;
  if (x >= 28 && x <= 33 && y >= 12 && y <= 19) return true;               // the chute's run
  if (x >= 32 && x <= 47 && y >= 8 && y <= 25) return !(x >= 46 && y >= 24); // the chamber's terrace
  if (x >= 34 && x <= 47 && y >= -6 && y <= 7) return true;                // the spiral's yard
  return false;
}

function build(shown: Set<string>): Vox {
  const v = new Vox();
  const has = (id: string) => shown.has(id);
  const T = (id: string) => { v.tag = id; return has(id); };
  const hero = has('hero');

  /* ---- the lattice and its terraces: dark stone, metal seams, in every state ---- */
  v.tag = '';
  const top = (x: number, y: number) => { const c = ((x >> 1) * 7 + (y >> 1) * 13) % 9; return c === 0 ? 'metalDark' : c === 4 ? 'stone' : 'stoneDark'; };
  slab(v, -6, -6, 47, 31, 0, { depth: 9, seed: 701, shape: ground, crust: 'metal', under: ['stoneDark', 'metalDark'], top });
  // the portal dais: a step down at the far end, and a lower step either side
  slab(v, -14, 8, -6, 23, 0, { depth: 7, seed: 702, crust: 'metal', under: ['stoneDark', 'metalDark'], top });
  slab(v, -14, 2, -6, 7, -2, { depth: 5, seed: 703, crust: 'metal', under: ['stoneDark', 'metalDark'], top });
  slab(v, -14, 24, -6, 29, -2, { depth: 5, seed: 704, crust: 'metal', under: ['stoneDark', 'metalDark'], top });
  // a loose chunk drifting off the near corner, and grit falling under the holes
  slab(v, 20, 34, 25, 37, -5, { depth: 3, seed: 705, crust: 'metal', under: ['stoneDark', 'metalDark'], top });
  // green-trimmed banners down the island's near faces: a sponsored race
  banner(v, 8, 32, -1, 6, { along: 'x', w: 3, cloth: 'black', trim: 'accent' });
  banner(v, 20, 32, -1, 5, { along: 'x', w: 3, cloth: 'black', trim: 'accent' });
  banner(v, 48, 12, -1, 6, { along: 'y', w: 3, cloth: 'black', trim: 'accent' });

  /* ---- the maze: glass tunnels, a dark road, metal collars ---- */
  const tube = (along: 'x' | 'y', c: number, a: number, b: number) => {
    for (let s = a - 2; s <= b + 1; s++) {
      const at = (d: number, z: number, m: string) => (along === 'x' ? v.set(s, c + d, z, m) : v.set(c + d, s, z, m));
      const k = ((s - a) % 8 + 8) % 8, collar = (k === 4 || k === 5) && s > a + 2 && s < b - 2;
      // a dark bed in big blocks, glass walls and a glass roof over it, a metal collar every few blocks
      v.chunk = 2; for (const d of [-2, -1, 0, 1]) at(d, 1, 'metalDark'); v.chunk = 1;
      for (const d of [-1, 0]) at(d, 1, 'black');
      for (const d of [-2, 1]) for (let z = 2; z <= 4; z++) at(d, z, collar ? 'metalDark' : 'glass');
      for (const d of [-1, 0]) at(d, 5, collar ? 'metalDark' : 'glass');
      if (collar) for (const d of [-2, 1]) at(d, 5, 'metal');
    }
  };
  if (T('maze')) {
    for (const [c, a, b] of H_RUNS) tube('x', c, a, b);
    for (const [c, a, b] of V_RUNS) tube('y', c, a, b);
    tube('x', ...CHUTE_RUN);
  }

  /* ---- the nodes: big glass boxes with the corners cut, a plate on top, lit inside ---- */
  if (T('nodes')) for (const [x, y] of NODES) {
    v.clear(x - 4, y - 4, 1, x + 3, y + 3, 7);
    v.chunk = 2; v.box(x - 4, y - 4, 1, x + 3, y + 3, 1, 'metalDark'); v.chunk = 1;
    for (let a = -4; a <= 3; a++) for (let b = -4; b <= 3; b++) {
      const ea = a === -4 || a === 3, eb = b === -4 || b === 3;
      if (ea && eb) continue;                                   // the corners are cut
      const corner = (ea && (b === -3 || b === 2)) || (eb && (a === -3 || a === 2));
      if (corner) { v.col(x + a, y + b, 2, 6, 'metalDark'); continue; }
      if (ea || eb) { v.box(x + a, y + b, 2, x + a, y + b, 5, 'glass'); v.set(x + a, y + b, 6, 'metalDark'); }
      else v.set(x + a, y + b, 6, Math.abs(a + 0.5) < 2 && Math.abs(b + 0.5) < 2 ? 'metal' : 'glass');
    }
    v.box(x - 1, y - 1, 2, x, y, 2, 'accentGlow');
  }

  /* ---- the stairwell portals: dark frames on the dais, a white glow ---- */
  if (T('portals')) for (const [y0, y1, z0, t] of GATES) {
    v.chunk = 2; v.box(GX - 1, y0, z0 + 1, GX, y0 + 1, t, 'metalDark'); v.box(GX - 1, y1 - 1, z0 + 1, GX, y1, t, 'metalDark');
    v.box(GX - 1, y0, t + 1, GX, y1, t + 2, 'metalDark'); v.chunk = 1;
    v.box(GX, y0 + 2, z0 + 1, GX, y1 - 2, t, 'portal');
    v.set(GX, Math.floor((y0 + y1) / 2), t + 3, 'accentGlow');
  }

  /* ---- the pole-position chamber: a glass room on a white floor, the green roof over its back ---- */
  const [x0, y0] = P0, [x1, y1] = P1;
  if (T('pod')) {
    v.chunk = 2; v.box(x0, y0, 1, x1 + 1, y1 + 1, 1, (x, y) => (((x >> 1) + (y >> 1)) % 2 ? 'white' : 'tile')); v.chunk = 1;
    for (const [a, b] of [[x0, y0], [x1 + 1, y0], [x0, y1 + 1], [x1 + 1, y1 + 1]]) v.col(a, b, 2, 11, 'metalDark');
    v.box(x0 + 1, y0, 2, x1, y0, 11, 'glass'); v.box(x0, y0 + 1, 2, x0, y1, 11, 'glass');
    v.box(x1 + 1, y0 + 1, 2, x1 + 1, y1, 11, 'glass'); v.box(x0 + 1, y1 + 1, 2, x1, y1 + 1, hero ? 11 : 3, 'glass');
    v.box(x0, y0, 11, x1 + 1, y0, 11, 'metalDark'); v.box(x1 + 1, y0, 11, x1 + 1, y1 + 1, 11, 'metalDark');
    v.chunk = 2; v.box(x0 - 2, y0 - 2, 12, x1 + 3, y0 + 5, 13, 'accent'); v.chunk = 1;
    v.box(x0, y0, 14, x1 + 1, y0 + 3, 14, 'accent');
  }
  if (T('bars') && !hero) for (let x = x0 + 2; x <= x1 - 1; x += 2) v.col(x, y1 + 1, 4, 11, 'rail');
  if (T('timer')) { v.box(PX - 3, y0 + 1, 7, PX + 3, y0 + 1, 10, 'black'); v.box(PX - 2, y0 + 1, 8, PX + 2, y0 + 1, 9, 'accentGlow'); }
  if (T('chute')) {
    // out through the chamber's left wall, a short lit run down into the maze
    v.box(x0, PY - 1, 2, x0, PY, 4, 'void');
    for (let x = 30; x < x0; x++) { v.set(x, PY - 1, 1, 'accentGlow'); v.set(x, PY, 1, 'accentGlow'); }
  }
  if (T('crack') && !hero) for (const [x, z] of [[PX + 3, 11], [PX + 4, 10], [PX + 3, 9], [PX + 5, 9], [PX + 4, 8], [PX + 6, 7], [PX + 5, 6], [PX + 4, 5]]) v.set(x, y0, z, 'white');
  if (T('hammer-stick') && !hero) { v.box(PX + 3, PY - 3, 2, PX + 3, PY - 3, 3, 'woodDark'); v.box(PX + 2, PY - 3, 4, PX + 4, PY - 3, 4, 'metal'); v.box(PX + 5, PY - 4, 2, PX + 5, PY - 1, 2, 'rail'); }
  if (T('crawlers') || has('carl-donut')) {
    v.tag = 'crawlers';
    if (hero) { v.sprite(PX - 4, PY + 4, 2, CARL, PALETTE); v.sprite(PX - 3, PY + 6, 2, DONUT, PALETTE); }
    else { v.sprite(PX - 3, PY + 3, 2, CARL, PALETTE); v.sprite(PX - 1, PY + 4, 2, DONUT, PALETTE); }
    if (has('crawlers') && !hero) {
      // Prepotente: a pale goat, horns back, no face
      v.box(PX + 2, PY + 1, 2, PX + 4, PY + 2, 4, 'white'); v.box(PX + 4, PY + 1, 5, PX + 4, PY + 2, 6, 'white');
      v.set(PX + 4, PY + 1, 7, 'woodDark'); v.set(PX + 4, PY + 2, 7, 'woodDark'); v.set(PX + 3, PY + 1, 7, 'woodDark');
    }
  }

  /* ---- the other pods, up a glass ramp behind the chamber ---- */
  if (T('spiral')) {
    for (let i = 0; i <= 360; i++) {
      const [x, y, z] = ramp(i / 360);
      const ox = x + Math.sign(x - SC[0]), oy = y + Math.sign(y - SC[1]);
      for (const [a, b] of [[x, y], [ox, oy]]) { v.set(a, b, z - 1, 'metal'); if (!v.has(a, b, z)) v.set(a, b, z, 'glass'); }
    }
    for (const [a, b] of [[-SH, -SH], [SH, -SH], [SH, SH], [-SH, SH]]) { v.chunk = 2; v.box(SC[0] + a - (a > 0 ? 0 : 1), SC[1] + b - (b > 0 ? 0 : 1), 1, SC[0] + a + (a > 0 ? 1 : 0), SC[1] + b + (b > 0 ? 1 : 0), 24, 'metalDark'); v.chunk = 1; }
    const r = rng(706);
    PODS.forEach(t => {
      const [x, y, z] = ramp(t);
      v.box(x - 1, y - 1, z, x + 1, y + 1, z, 'metalDark');
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) v.col(x + a, y + b, z + 1, z + 2, 'glass');
      v.box(x - 1, y - 1, z + 3, x + 1, y + 1, z + 3, 'accent');
      if (t !== AGATHA) { v.set(x, y, z + 1, r() < 0.5 ? 'red' : 'blue'); v.set(x, y, z + 2, 'plaster'); }
    });
  }
  if (T('agatha')) { const [x, y, z] = ramp(AGATHA); v.box(x - 1, y, z + 1, x, y + 1, z + 1, 'rail'); v.set(x - 1, y, z + 2, 'rail'); v.set(x, y + 1, z + 2, 'metal'); }

  /* ---- after: the tunnels in drifts of glass, shards in the air ---- */
  if (T('dust')) {
    const r = rng(707);
    const drift = (x: number, y: number) => { if (r() < 0.6) v.set(x, y, 1, r() < 0.75 ? 'glass' : 'white'); if (r() < 0.14) v.set(x, y, 2, 'glass'); };
    for (const [c, a, b] of [...H_RUNS, CHUTE_RUN]) for (let x = a - 2; x <= b + 1; x++) for (let d = -2; d <= 1; d++) drift(x, c + d);
    for (const [c, a, b] of V_RUNS) for (let y = a - 2; y <= b + 1; y++) for (let d = -2; d <= 1; d++) drift(c + d, y);
    for (let i = 0; i < 80; i++) {
      const x = -8 + Math.floor(r() * 54), y = -6 + Math.floor(r() * 36), z = 4 + Math.floor(r() * 18);
      v.set(x, y, z, 'glass'); if (r() < 0.4) v.set(x, y, z + 1, 'glass');
    }
  }
  if (T('sucked-in')) {
    const r = rng(708);
    for (let i = 0; i < 30; i++) {
      const t = r(), sx = 4 + r() * 40, sy = 0 + r() * 30;
      const x = Math.round(sx + (GX + 2 - sx) * t), y = Math.round(sy + (16 - sy) * t), z = Math.round(3 + t * 7 + r() * 3);
      v.set(x, y, z, r() < 0.5 ? 'red' : 'blue'); v.set(x, y, z + 1, 'plaster');
      for (let k = 1; k <= 2; k++) if (!v.has(x + k, y, z)) v.set(x + k, y, z + 1 - k, 'white');
    }
  }

  /* The hero picture only: the moment it goes. Prepotente at full size in the
     chamber, the hammer up, the stick against the glass, the front wall and the
     tunnel nearest him bursting outward in shards, the cracks racing on into
     the maze. Everything else is still whole, for a heartbeat. */
  if (hero) {
    v.tag = 'crack';
    const r = rng(709);
    const gx = 40, gy = 12;                                       // where Prepotente stands
    const B = [gx + 4, y1 + 1, 10] as const;                      // where the stick meets the glass
    v.clear(x0 - 2, y0 - 2, 12, x1 + 3, y0 + 5, 14);              // the roof he came through
    // the glass near the blow is gone, flung outwards, and the run nearest him with it
    for (const { p: [x, y, z], mat } of v.all()) {
      if (mat !== 'glass') continue;
      const d = Math.hypot((x - B[0]) * 0.7, y - B[1], (z - B[2]) * 0.8);
      if (d < 6.5 || (x >= 26 && x <= 33 && y >= 12 && y <= 19 && r() < 0.6)) {
        v.set(x, y, z, null);
        if (r() < 0.5) {
          const k = 2 + r() * 8;
          v.set(Math.round(x + (r() - 0.5) * 6), Math.round(y + k), Math.round(z + 1 + r() * 6), r() < 0.92 ? 'glass' : 'white');
        }
      }
    }
    // cracks racing on through the tunnels: white seams in the glass roofs
    for (const [x, y] of [[26, 16], [24, 15], [22, 16], [20, 15], [28, 13], [27, 11], [28, 9], [28, 20], [29, 22], [28, 24], [12, 28], [9, 27]]) v.set(x, y, 5, 'white');
    for (let z = 2; z <= 10; z++) for (let y = y0 + 1; y <= y1; y++) if (v.get(x1 + 1, y, z) === 'glass' && (z * 3 + y) % 7 === 0) v.set(x1 + 1, y, z, 'white');
    // a burst of shards out of the chamber's near face
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 0.9 + Math.PI * 0.05, k = 2 + r() * 13;
      v.set(Math.round(B[0] + Math.cos(a) * k * 1.1), Math.round(B[1] + 1 + Math.sin(a) * k), Math.round(B[2] + (r() - 0.35) * 12 + k * 0.2), r() < 0.9 ? 'glass' : 'white');
    }

    v.tag = 'crawlers';
    /* Prepotente at hero size, in big blocks: a white goat up on his hind legs
       in the wreck of his chamber, facing out, horns curled back, the hammer
       over his head and the stick against the glass. */
    const G = (px: number, py: number, pz: number, m: string) => { v.chunk = 2; v.box(gx + px * 2, gy + py * 2, 2 + pz * 2, gx + px * 2 + 1, gy + py * 2 + 1, 3 + pz * 2, m); v.chunk = 1; };
    for (const px of [-1, 1]) { G(px, 1, 0, 'black'); G(px, 1, 1, 'cloth'); G(px, 1, 2, 'cloth'); }
    for (let px = -1; px <= 1; px++) for (let py = 0; py <= 2; py++) for (let pz = 3; pz <= 6; pz++) G(px, py, pz, 'white');
    for (let px = -1; px <= 1; px++) for (const pz of [4, 5]) G(px, 3, pz, 'cloth');
    for (let px = -1; px <= 1; px++) for (let py = 1; py <= 3; py++) for (let pz = 7; pz <= 9; pz++) G(px, py, pz, 'white');
    G(0, 4, 7, 'white'); G(0, 4, 8, 'white'); G(0, 4, 6, 'cloth');
    v.box(gx, gy + 10, 16, gx + 1, gy + 10, 16, 'pink');                            // the nose
    for (const x of [gx - 2, gx + 3]) { v.box(x, gy + 8, 20, x, gy + 8, 21, 'black'); }   // the eyes
    for (const px of [-2, 2]) G(px, 2, 8, 'cloth');                                  // the ears
    for (const px of [-1, 1]) { G(px, 1, 10, 'woodDark'); G(px, 0, 10, 'woodDark'); G(px, -1, 9, 'woodDark'); G(px, -1, 8, 'wood'); }
    // the left arm up, the hammer over his head
    for (let pz = 5; pz <= 8; pz++) G(-2, 1, pz, 'white');
    v.box(gx - 4, gy + 3, 20, gx - 3, gy + 3, 27, 'woodDark');
    G(-4, 1, 13, 'metalDark'); G(-3, 1, 13, 'rail'); G(-2, 1, 13, 'metalDark'); G(-3, 1, 14, 'metalDark');
    // the right arm out, the stick against the glass
    G(2, 3, 5, 'white');
    for (let y = gy + 8; y <= y1 + 1; y++) v.set(gx + 4, y, 12, 'rail');
    // the green roof he came through, in pieces
    for (let i = 0; i < 14; i++) v.set(gx - 6 + Math.floor(r() * 14), gy - 6 + Math.floor(r() * 8), 15 + Math.floor(r() * 8), 'accent');
  }
  return v;
}

const anchors: VoxelMap['anchors'] = {
  pod: [PX, P0[1] + 2, 14], bars: [PX, P1[1] + 1, 8], timer: [PX, P0[1] + 1, 10], chute: [31, PY, 2],
  spiral: ramp(0.55), agatha: ramp(AGATHA), portals: [GX, 16, 14], maze: [10, 28, 4], nodes: [16, 16, 7],
  'hammer-stick': [PX + 3, PY - 3, 4], crack: [PX + 4, P0[1], 9], crawlers: [PX - 2, PY + 3, 4],
  dust: [16, 28, 1], 'sucked-in': [GX + 6, 16, 9],
};

export const FLOOR_7_VOXEL: VoxelMap = { build, anchors };
export const buildFloor7 = build;

/** The tile: the race the moment before it starts (artAt 5:end), with Carl and
    Donut in the chamber and nobody else, and nothing of how it ends. */
export const TILE_7_LAYERS = ['pod', 'bars', 'timer', 'chute', 'spiral', 'portals', 'maze', 'nodes', 'carl-donut'];
/** The hero picture, once the floor is finished: Prepotente cracks it. */
export const HERO_7_LAYERS = ['pod', 'timer', 'chute', 'spiral', 'agatha', 'portals', 'maze', 'nodes', 'crawlers', 'hero'];
