import { Vox, rng, slab, house, disc, ring, tree, banner } from '../vox.ts';
import { CARL, DONUT, PALETTE } from '../../maps/sprites.ts';
import type { VoxelMap } from './index.ts';

/* Floor 5's page map: bubble 543 as one diorama under its glass, built layer by
   layer. The bubble stays round (in true isometric only a round base gives a
   round dome, and a hemisphere reads as one at about 1.4 radii high), and
   everything inside it is drawn big so it fills the glass: a green island in a
   ring of sea, the necropolis as a great brown mesa in stepped ledges with the
   air quadrant's bowl on top, the sandcastle terraced up its left flank, the
   tomb's stone porch cut into its front, a stream falling off the island's
   right edge, and the scrap castle hanging in the sky over it all.

   Only the layers the reader has reached are built at all, so a sealed one is
   not hidden in the picture: it was never there. The homepage tile is this
   same scene at its artAt (4:2), and the hero picture the same scene at the
   moment the floor is remembered for. Shapes only; every word is in data/. */

const C = 25, R = 24;            // the bubble's centre and radius, in blocks
const H = Math.round(R * 1.42);  // a dome reads round in this projection at about 1.4 radii
const M = [23, 23] as const;     // the mesa's axis, a little back so its front has room
const PZ = 4;                    // the island's plateau
const TOP = 14;                  // the bowl's floor, on top of the mesa
const TY = M[1] + 11;            // the tomb's porch faces +y here
const TX0 = M[0] + 2, TX1 = M[0] + 9;
const SX0 = M[0] - 12, SX1 = M[0] - 4;   // the sandcastle's terraces, left of the porch
const STREAM = [20, 21] as const;        // the stream's two rows, off the mesa's right foot

const ang = (x: number, y: number, c: readonly [number, number] = [C, C]) => Math.atan2(y - c[1], x - c[0]);
const rIsland = (a: number) => 19 + Math.sin(a * 5) * 1.1 + Math.sin(a * 3 + 1) * 0.7;
const inIsland = (x: number, y: number) => Math.hypot(x - C, y - C) <= rIsland(ang(x, y));
const onPlateau = (x: number, y: number) => Math.hypot(x - C, y - C) <= rIsland(ang(x, y)) - 2.6;
/* The mesa narrows in three steps and its rim is ragged. */
const rMesa = (a: number, z: number) => (z <= 6 ? 10.6 : z <= 10 ? 9.4 : 8.4) + Math.sin(a * 5) * 0.7 + Math.sin(a * 9 + 1) * 0.4;
const inMesa = (x: number, y: number, z: number) => Math.hypot(x - M[0], y - M[1]) <= rMesa(ang(x, y, M), z);

function build(shown: Set<string>): Vox {
  const v = new Vox();
  const has = (id: string) => shown.has(id);
  const T = (id: string) => { v.tag = id; return has(id); };
  const inBubble = (x: number, y: number) => Math.hypot(x - C, y - C) <= R;

  /* ---- the ground under everything: sea once it is seen, a cloud bank before ---- */
  if (T('sea')) {
    slab(v, C - R, C - R, C + R, C + R, 0, { depth: 9, seed: 51, shape: inBubble, top: 'water', crust: 'waterDeep', under: ['dirt', 'stoneDark'] });
    // a darker channel round the island's foot
    for (let x = C - R; x <= C + R; x++) for (let y = C - R; y <= C + R; y++) {
      const d = Math.hypot(x - C, y - C);
      if (v.get(x, y, 0) === 'water' && d > rIsland(ang(x, y)) + 3.5 && ((x >> 1) + (y >> 1)) % 5 === 0) v.set(x, y, 0, 'waterDeep');
    }
  } else {
    v.tag = 'fog-below';
    slab(v, C - R, C - R, C + R, C + R, 0, { depth: 9, seed: 51, shape: inBubble, top: 'cloth', crust: 'white', under: ['dirt', 'stoneDark'] });
    const r = rng(56);
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (R - 3);
      const x = C + Math.cos(a) * d, y = C + Math.sin(a) * d, rr = 2.4 + r() * 3.4, hh = 1 + Math.floor(r() * 3);
      v.chunk = 2;
      for (let k = 0; k < hh; k++) disc(v, x, y, rr - k * 1.1, rr - k * 1.1, 1 + k, 1 + k, (_x, _y, z) => (z === hh ? 'white' : 'cloth'));
      v.chunk = 1;
    }
  }

  /* ---- the island: a sand beach, dirt cliffs, a grass plateau, trees ---- */
  if (T('island')) {
    v.chunk = 2;
    for (let x = C - R; x <= C + R; x++) for (let y = C - R; y <= C + R; y++) if (inIsland(x, y)) {
      v.set(x, y, 1, 'sand');
      if (onPlateau(x, y)) {
        for (let z = 2; z < PZ; z++) v.set(x, y, z, ((x >> 1) + (y >> 1)) % 3 ? 'dirt' : 'dirtDark');
        v.set(x, y, PZ, ((x >> 1) * 7 + (y >> 1) * 3) % 7 === 0 ? 'leafLight' : 'grass');
      }
    }
    v.chunk = 1;
    // the stream: off the mesa's right foot, along the plateau, over the cliff
    for (let x = M[0] + 8; x <= C + R; x++) for (const y of STREAM) {
      if (!inIsland(x, y)) continue;
      if (onPlateau(x, y)) v.set(x, y, PZ, 'water');
      else { v.set(x, y, 1, 'water'); if (onPlateau(x - 1, y) || onPlateau(x - 2, y)) for (let z = 1; z <= PZ; z++) v.set(x, y, z, z === 1 ? 'white' : 'water'); }
    }
    // the trees round the plateau, clear of the castle, the porch and the stream
    const r = rng(57);
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2, d = 11.5 + r() * 7, x = Math.round(C + Math.cos(a) * d), y = Math.round(C + Math.sin(a) * d);
      if (!onPlateau(x, y) || !['grass', 'leafLight'].includes(v.get(x, y, PZ) ?? '') || v.has(x, y, PZ + 1)) continue;
      if (Math.hypot(x - M[0], y - M[1]) < 12.5) continue;
      if (x >= SX0 - 1 && x <= SX1 + 1 && y >= M[1] + 2 && y <= M[1] + 17) continue;     // the sandcastle
      if (x >= TX0 && x <= TX1 && y >= TY - 1 && y <= TY + 7) continue;                 // the porch
      if (Math.abs(y - 20.5) < 3 && x > M[0]) continue;                                  // the stream
      if (Math.hypot(x - 34, y - 33) < 4 || Math.hypot(x - 32, y - 14) < 6) continue;   // where the house lands, where the puppy stands
      if (Math.hypot(x - 37, y - 37) < 3 || Math.hypot(x - 18, y - 9) < 3 || Math.hypot(x - 9, y - 18) < 3) continue;   // the villages
      tree(v, x, y, PZ + 1, 2 + Math.floor(r() * 2), 5700 + i, r() < 0.3 ? 'leafLight' : 'leaf');
    }
    for (const [x, y] of [[39, 27], [14, 31], [30, 9]]) { v.chunk = 2; v.box(x, y, PZ + 1, x + 1, y + 1, PZ + 2, 'stone'); v.chunk = 1; }
    // the three villages along its shore
    for (const [x, y] of [[36, 36], [17, 8], [8, 17]] as [number, number][]) for (let i = 0; i < 3; i++) house(v, x + (i % 2) * 3, y + Math.floor(i / 2) * 3 - (i % 2), PZ + 1, 2, 2, 2, i % 2 ? 'roofRed' : 'roofBlue');
  }
  if (T('reef')) {
    const r = rng(52);
    for (let a = 0; a < Math.PI * 2; a += 0.17) {
      const d = 21.6 + r() * 1.2, x = Math.round(C + Math.cos(a) * d), y = Math.round(C + Math.sin(a) * d);
      if (r() < 0.6 && v.has(x, y, 0)) { v.set(x, y, 1, r() < 0.5 ? 'roofRed' : 'pink'); if (r() < 0.3) v.set(x, y, 2, 'red'); }
    }
  }

  /* ---- the necropolis: a brown mesa in three ledges, tombs round its foot ---- */
  if (T('necropolis')) {
    v.chunk = 2;
    for (let x = M[0] - 12; x <= M[0] + 12; x++) for (let y = M[1] - 12; y <= M[1] + 12; y++) for (let z = 1; z <= TOP; z++) {
      if (!inMesa(x, y, z)) continue;
      const ledge = !inMesa(x, y, z + 1) && z < TOP;
      v.set(x, y, z, ledge ? 'sand' : ((x >> 1) * 3 + (y >> 1) * 5 + (z >> 2)) % 4 === 0 ? 'dirtDark' : 'dirt');
    }
    v.chunk = 1;
    // a ring of tomb doors round the foot, in carved stone, on the faces the eye sees
    for (let a = -0.9; a < Math.PI * 1.05; a += 0.42) {
      const rr = rMesa(a, 3), x = Math.round(M[0] + Math.cos(a) * (rr - 0.2)), y = Math.round(M[1] + Math.sin(a) * (rr - 0.2));
      if (x >= TX0 - 1 && x <= TX1 + 1 && y > M[1] + 4) continue;
      if (x >= SX0 - 1 && x <= SX1 + 1 && y > M[1] + 2) continue;
      v.box(x, y, PZ + 1, x, y, PZ + 3, 'void'); v.set(x, y, PZ + 4, 'stone');
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) if (!inMesa(x + dx, y + dy, PZ + 1) || true) { if (v.get(x + dx, y + dy, PZ + 1) && v.get(x + dx, y + dy, PZ + 1) !== 'void') v.box(x + dx, y + dy, PZ + 1, x + dx, y + dy, PZ + 3, 'stone'); }
    }
  }

  /* ---- the tomb: a stone porch cut into the mesa's front, a sunken court before it ---- */
  if (has('necropolis') && T('tomb')) {
    v.chunk = 2;
    v.box(TX0, TY - 6, 1, TX1, TY, 8, (x, _y, z) => ((x >> 1) + (z >> 1)) % 3 ? 'stone' : 'stoneDark');
    v.box(TX0 - 1, TY - 6, 9, TX1 + 1, TY + 1, 9, 'stoneDark');
    for (const x of [TX0 - 1, TX1]) v.box(x, TY + 1, 1, x + 1, TY + 2, 11, 'stone');
    v.chunk = 1;
    for (const x of [TX0 - 1, TX1]) v.box(x, TY + 1, 12, x + 1, TY + 2, 12, 'stoneDark');
    // the door, deep and dark, and the lit windows of the maze inside
    const mid = Math.round((TX0 + TX1) / 2);
    v.box(mid - 1, TY, 1, mid, TY, 5, 'void'); v.box(mid - 2, TY, 6, mid + 1, TY, 6, 'stoneDark');
    for (const x of [TX0 + 1, TX1 - 1]) v.box(x, TY, 4, x, TY, 5, 'window');
    v.box(mid - 1, TY, 8, mid, TY, 8, 'window');
    // the court: a pit in the plateau, stepped down to the door
    v.clear(TX0 + 1, TY + 1, 1, TX1 - 1, TY + 6, 12);
    v.chunk = 2;
    v.box(TX0 + 1, TY + 1, 0, TX1 - 1, TY + 6, 0, 'stoneDark');
    v.chunk = 1;
    for (let i = 0; i < 3; i++) v.box(mid - 2, TY + 6 - i, 1, mid + 2, TY + 6 - i, PZ - 1 - i, 'stone');
    for (const x of [TX0 + 1, TX1 - 1]) v.box(x, TY + 1, 1, x, TY + 6, PZ, 'stone');
  }
  if (has('necropolis') && has('tomb') && T('flood')) {
    const mid = Math.round((TX0 + TX1) / 2);
    for (let x = TX0 + 2; x <= TX1 - 2; x++) for (let y = TY; y <= TY + 6; y++) for (let z = 1; z <= 2; z++) if (!v.has(x, y, z) || v.get(x, y, z) === 'void') v.set(x, y, z, 'water');
    v.box(mid - 1, TY, 3, mid + 1, TY, 4, 'water');
    for (let y = TY + 7; y <= TY + 9; y++) for (const x of [mid, mid + 1]) if (v.has(x, y, PZ)) v.set(x, y, PZ, 'water');
  }

  /* ---- the bowl on top: a ragged crater rim, sand, two towns ---- */
  if (T('bowl')) {
    v.chunk = 2;
    for (let x = M[0] - 10; x <= M[0] + 10; x++) for (let y = M[1] - 10; y <= M[1] + 10; y++) {
      const d = Math.hypot(x - M[0], y - M[1]), a = ang(x, y, M), rr = rMesa(a, TOP);
      if (d > rr) continue;
      if (d > rr - 2) {
        const tooth = Math.floor((a + Math.PI) * 7 / Math.PI) % 2;
        v.box(x, y, TOP + 1, x, y, TOP + 1 + tooth, 'dirt');
      } else v.set(x, y, TOP, 'sand');
    }
    v.chunk = 1;
    for (const [x, y] of [[21, 25], [26, 21], [19, 20], [27, 27]]) { v.set(x, y, TOP + 1, 'dirt'); v.set(x + 1, y, TOP + 1, 'dirtDark'); }
  }
  if (T('hump-town')) {
    for (let i = 0; i < 4; i++) house(v, M[0] - 6 + (i % 2) * 3, M[1] - 5 + Math.floor(i / 2) * 3, TOP + 1, 2, 2, 2 + (i % 2), 'plaster', 'plaster');
    v.col(M[0] - 1, M[1] - 6, TOP + 1, TOP + 5, 'plaster'); v.set(M[0] - 1, M[1] - 6, TOP + 6, 'accent');
  }
  if (T('far-town')) for (let i = 0; i < 4; i++) house(v, M[0] + 2 + (i % 2) * 3, M[1] - 6 + Math.floor(i / 2) * 3, TOP + 1, 2, 2, 2 + (i % 2), 'plaster', 'plaster');
  if (T('far-ruin')) {
    const r = rng(53);
    for (let i = 0; i < 14; i++) v.col(M[0] + 2 + Math.floor(r() * 6), M[1] - 6 + Math.floor(r() * 6), TOP + 1, TOP + 1 + Math.floor(r() * 2), r() < 0.3 ? 'black' : 'stoneDark');
    v.set(M[0] + 4, M[1] - 4, TOP + 3, 'ember');
  }
  if (T('bowl-span')) {
    // rim to rim: a survey line across the bowl, a pole at either end
    for (let x = M[0] - 7; x <= M[0] + 7; x++) if (x % 2) v.set(x, M[1] + 1, TOP + 1, 'accent');
    for (const x of [M[0] - 8, M[0] + 8]) { v.col(x, M[1] + 1, TOP + 2, TOP + 4, 'woodDark'); v.set(x, M[1] + 1, TOP + 5, 'accent'); }
  }
  if (T('crawlers')) { v.sprite(M[0] + 1, M[1] + 3, TOP + 1, CARL, PALETTE); v.sprite(M[0] + 3, M[1] + 3, TOP + 1, DONUT, PALETTE); }

  /* ---- the land quadrant's sandcastle, terraced up the mesa's left flank ---- */
  if (T('sandcastle')) {
    const tiers = [[M[1] + 3, M[1] + 6, 12], [M[1] + 7, M[1] + 10, 9], [M[1] + 11, M[1] + 14, 6]] as const;
    for (const [y0, y1, top] of tiers) {
      v.chunk = 2;
      v.box(SX0, y0, 1, SX1, y1, top - 1, 'sand');
      v.chunk = 1;
      v.box(SX0, y0, top, SX1, y1, top, 'grass');
      // the front wall of each terrace, crenellated, with an arched door
      for (let x = SX0; x <= SX1; x++) { v.box(x, y1, top, x, y1, top + 1, 'sand'); if (x % 2 === 0) v.set(x, y1, top + 2, 'sand'); }
      const dx = Math.round((SX0 + SX1) / 2) + (top === 9 ? 3 : 0);
      v.box(dx, y1, top - 2, dx + 1, y1, top, 'void');
    }
    // the corner tower and its flag
    v.chunk = 2; v.box(SX0, M[1] + 2, 1, SX0 + 3, M[1] + 5, 17, 'sand'); v.chunk = 1;
    for (let x = SX0; x <= SX0 + 3; x++) if (x % 2 === 0) { v.set(x, M[1] + 5, 18, 'sand'); v.set(x, M[1] + 2, 18, 'sand'); }
    v.box(SX0 + 1, M[1] + 5, 14, SX0 + 2, M[1] + 5, 15, 'void');
    v.col(SX0 + 3, M[1] + 2, 18, 21, 'woodDark'); v.box(SX0 + 3, M[1] + 3, 20, SX0 + 3, M[1] + 4, 21, 'accent');
    banner(v, SX0 + 3, M[1] + 15, 5, 4, { along: 'x', w: 3, cloth: 'red', trim: 'accent' });
  }
  if (T('sandcastle-down')) {
    const r = rng(54);
    v.chunk = 2;
    for (let x = SX0; x <= SX1; x++) for (let y = M[1] + 2; y <= M[1] + 15; y++) {
      const h = Math.max(1, Math.round(3 - Math.hypot(x - (SX0 + SX1) / 2, y - M[1] - 6) * 0.25 + r() * 1.5));
      for (let z = 1; z <= PZ - 1 + h; z++) if (!v.has(x, y, z)) v.set(x, y, z, 'sand');
    }
    v.chunk = 1;
    for (let i = 0; i < 12; i++) v.set(SX0 + Math.floor(r() * 10), M[1] + 6 + Math.floor(r() * 9), PZ + 4, r() < 0.4 ? 'water' : 'sand');
  }

  /* ---- the sky castle, and what is left of it ---- */
  const [KX, KY, KZ] = [M[0] + 1, M[1] - 3, 25];
  const clod = (rx: number, ry: number) => {
    v.chunk = 2;
    for (let k = 0; k < 5; k++) disc(v, KX, KY, Math.max(0.8, rx - k * 1.3), Math.max(0.6, ry - k * 1), KZ - k, KZ - k, k === 0 ? 'dirt' : k % 2 ? 'dirtDark' : 'dirt');
    v.chunk = 1;
  };
  const balloons = (offs: number[][]) => { for (const [dx, dy] of offs) { v.col(KX + dx, KY + dy, KZ + 6, KZ + 7, 'woodDark'); disc(v, KX + dx, KY + dy, 1.4, 1, KZ + 8, KZ + 9, 'cloth'); } };
  if (T('speck')) { v.box(KX, KY, KZ + 4, KX + 1, KY + 1, KZ + 4, 'black'); v.set(KX, KY, KZ + 5, 'cloth'); }
  if (T('wasteland')) {
    clod(7, 4.5);
    // a dark castle of scrap on its clod, its windows lit, spires of junk
    v.chunk = 2; v.box(KX - 6, KY - 2, KZ + 1, KX + 5, KY + 3, KZ + 4, 'black'); v.chunk = 1;
    for (let x = KX - 5; x <= KX + 4; x += 2) { v.set(x, KY + 3, KZ + 2, 'window'); if (x % 4 === 0) v.set(x, KY + 3, KZ + 4, 'window'); }
    for (let y = KY - 1; y <= KY + 2; y += 2) v.set(KX + 5, y, KZ + 3, 'window');
    for (const [dx, dy, h] of [[-6, -2, 6], [-3, -2, 7], [0, -1, 6], [3, -2, 7], [5, 2, 5], [-5, 2, 5]]) { v.box(KX + dx, KY + dy, KZ + 5, KX + dx, KY + dy, KZ + h, 'stoneDark'); v.set(KX + dx, KY + dy, KZ + h + 1, 'metalDark'); }
    v.box(KX - 2, KY - 1, KZ + 5, KX + 1, KY + 1, KZ + 6, 'black'); v.set(KX - 1, KY + 1, KZ + 6, 'window');
    for (const [dx, dy] of [[-7, 2], [6, 3], [-2, 4]]) v.set(KX + dx, KY + dy, KZ + 1, 'metal');
  }
  if (T('house')) {
    clod(2.6, 2);
    v.box(KX - 1, KY - 1, KZ + 1, KX + 1, KY + 1, KZ + 3, 'black'); v.col(KX - 1, KY - 1, KZ + 4, KZ + 5, 'stoneDark'); v.set(KX, KY + 1, KZ + 2, 'window');
    balloons([[0, -1]]);
  }
  if (T('house-landed')) { const z = has('island') ? PZ + 1 : 2; v.box(33, 32, z, 35, 34, z + 1, 'black'); v.set(34, 34, z, 'window'); v.col(33, 32, z + 2, z + 3, 'stoneDark'); v.set(32, 34, z, 'dirtDark'); }
  if (T('crawlers-below')) { const z = has('island') ? PZ + 1 : 2; v.sprite(31, 35, z, CARL, PALETTE); v.sprite(33, 36, z, DONUT, PALETTE); }

  /* ---- the sea castle, the brood mother ---- */
  const sub = (x: number, y: number, flag: boolean) => {
    v.box(x, y, 1, x + 7, y + 1, 1, 'blue'); v.box(x + 1, y, 2, x + 6, y + 1, 2, 'blue');
    v.box(x + 3, y, 3, x + 4, y, 4, 'roofBlue'); for (let i = x + 1; i <= x + 6; i += 2) v.set(i, y + 1, 2, 'window');
    for (let i = x - 2; i <= x + 9; i += 3) v.set(i, y + 2, 1, 'white');
    if (flag) { v.col(x + 4, y, 5, 7, 'woodDark'); v.box(x + 5, y, 6, x + 6, y, 7, 'accent'); }
  };
  if (T('sub')) sub(14, 44, false);
  if (T('sub-taken')) sub(14, 44, true);
  if (T('lusca')) {
    const [LX, LY] = [45, 33];
    disc(v, LX, LY, 3.5, 2.6, 1, 3, 'red'); disc(v, LX, LY, 2.4, 1.6, 4, 5, 'red');
    v.box(LX - 2, LY + 2, 2, LX + 1, LY + 2, 2, 'void'); for (let x = LX - 2; x <= LX + 1; x += 2) v.set(x, LY + 2, 3, 'bone');
    v.set(LX - 1, LY + 2, 4, 'window'); v.col(LX + 1, LY - 1, 6, 8, 'red');
    for (const [dx, dy] of [[-3, -3], [0, -4], [2, 3]]) for (let i = 0; i < 4; i++) v.set(LX + dx + Math.sign(dx) * i, LY + dy + Math.sign(dy) * Math.floor(i / 2), 1 + Math.round(Math.abs(Math.sin(i))), 'redDark');
  }

  /* ---- the puppy, building-tall, on the island ---- */
  const puppy = (OX: number, OY: number, z0: number) => {
    // two heads, a long red body on four legs, a tail up
    v.chunk = 2; v.box(OX, OY, z0 + 6, OX + 9, OY + 4, z0 + 11, 'red'); v.chunk = 1;
    for (const [dx, dy] of [[0, 0], [8, 0], [0, 3], [8, 3]]) v.box(OX + dx, OY + dy, z0, OX + dx + 1, OY + dy + 1, z0 + 5, 'redDark');
    for (const [hy, hz] of [[-1, 12], [3, 13]]) {
      v.chunk = 2; v.box(OX + 6, OY + hy, z0 + hz, OX + 9, OY + hy + 3, z0 + hz + 3, 'red'); v.chunk = 1;
      v.box(OX + 10, OY + hy + 1, z0 + hz, OX + 11, OY + hy + 2, z0 + hz + 1, 'roofRed');   // the snout
      v.set(OX + 11, OY + hy + 1, z0 + hz + 1, 'black');
      v.set(OX + 10, OY + hy + 3, z0 + hz + 2, 'black'); v.set(OX + 9, OY + hy + 3, z0 + hz + 2, 'white');
      v.box(OX + 6, OY + hy, z0 + hz + 4, OX + 6, OY + hy, z0 + hz + 5, 'redDark'); v.box(OX + 6, OY + hy + 3, z0 + hz + 4, OX + 6, OY + hy + 3, z0 + hz + 5, 'redDark');
    }
    v.box(OX - 1, OY + 2, z0 + 11, OX - 1, OY + 2, z0 + 15, 'red');
  };
  if (T('orthrus')) puppy(26, 11, has('island') ? PZ + 1 : 1);

  /* ---- the sky: suns, clouds, and the glass over everything ---- */
  if (T('second-sun')) { v.chunk = 2; disc(v, 12, 16, 1.6, 1.6, 23, 24, 'window'); v.chunk = 1; }
  const popped = has('dome-popped');
  if (T(popped ? 'dome-popped' : 'dome')) {
    for (const [x, y] of [[9, 20], [30, 6], [42, 18], [10, 36], [22, 10]]) {
      // tucked under the glass: as high as the dome allows over that spot, less a margin
      const z = Math.min(26, Math.floor(H * Math.sqrt(Math.max(0, 1 - (Math.hypot(x - C, y - C) + 3) ** 2 / R ** 2))) - 3);
      v.chunk = 2; disc(v, x, y, 3, 1.8, z, z + 1, 'white'); v.chunk = 1; disc(v, x - 0.5, y, 1.8, 1, z + 2, z + 2, 'white'); disc(v, x + 1, y + 1, 2.4, 1.4, z - 1, z - 1, 'cloth');
    }
    const inDome = (x: number, y: number, z: number) => Math.hypot((x - C) / R, (y - C) / R, z / H) <= 1;
    const r = rng(55);
    for (let x = C - R - 1; x <= C + R + 1; x++) for (let y = C - R - 1; y <= C + R + 1; y++) for (let z = 1; z <= H; z++) {
      if (!inDome(x, y, z) || v.has(x, y, z)) continue;
      if (inDome(x + 1, y, z) && inDome(x - 1, y, z) && inDome(x, y + 1, z) && inDome(x, y - 1, z) && inDome(x, y, z + 1)) continue;
      // a popped dome has holes punched through its upper half
      if (popped && z > H * 0.4 && r() < 0.4) continue;
      const t = Math.atan2(y - C, x - C);
      const sheen = z > H * 0.3 && z < H * 0.72 && ((t > 1.95 && t < 2.2) || (t > 2.35 && t < 2.45));
      v.set(x, y, z, z <= 1 || sheen ? 'domeRim' : 'dome');
    }
  }

  /* ---- the hero picture only: the god arrives for his dog ----
     Emberus as a head the size of a city, burning over the popped bubble, and
     Carl and Donut in the gnome biplane in front of him (4:31). */
  if (shown.has('hero')) {
    v.tag = 'orthrus';
    const [EX, EY, EZ] = [C + 2, C - 27, 17];   // behind the bubble, his face turned to the island
    const HW = 11, HD = 7, HH = 22;
    v.chunk = 2;
    v.box(EX - HW, EY - HD, EZ, EX + HW, EY + HD, EZ + HH, (x, y, z) => {
      // a rounded block: shave the corners; a dark jaw, a lit brow
      const cx = Math.abs(x - EX) / (HW + 0.5), cy = Math.abs(y - EY) / (HD + 0.5), cz = Math.abs(z - EZ - HH / 2) / (HH / 2 + 0.5);
      if (cx ** 4 + cy ** 4 + cz ** 4 > 1) return null;
      return z < EZ + 8 ? 'redDark' : ((x >> 1) + (z >> 1)) % 5 === 0 ? 'roofRed' : 'red';
    });
    v.chunk = 1;
    const FY = EY + HD;                            // the face, on the +y side
    for (const sx of [-5, 3]) {
      v.box(EX + sx - 1, FY, EZ + 14, EX + sx + 2, FY, EZ + 16, 'black');
      v.box(EX + sx, FY, EZ + 14, EX + sx + 1, FY, EZ + 15, 'window');
      v.box(EX + sx - 2, FY, EZ + 18, EX + sx + 3, FY, EZ + 18, 'redDark');   // the brows
    }
    v.box(EX - 1, FY + 1, EZ + 10, EX + 1, FY + 1, EZ + 13, 'roofRed'); v.box(EX - 1, FY + 1, EZ + 10, EX + 1, FY + 1, EZ + 10, 'redDark');   // the nose
    v.box(EX - 5, FY, EZ + 6, EX + 5, FY, EZ + 8, 'black'); v.box(EX - 4, FY, EZ + 7, EX + 4, FY, EZ + 7, 'ember');   // the mouth, fire behind the teeth
    for (let x = EX - 4; x <= EX + 4; x += 2) v.set(x, FY, EZ + 8, 'bone');
    // hair of fire along the crown, and a beard of it under the jaw
    const r = rng(58);
    for (let x = EX - HW + 1; x <= EX + HW - 1; x += 2) for (let y = EY - HD + 1; y <= EY + HD - 1; y += 3) {
      let top = -1; for (let z = EZ + HH + 1; z >= EZ; z--) if (v.has(x, y, z)) { top = z; break; }
      if (top < 0 || r() < 0.35) continue;
      v.set(x, y, top + 1, 'flame');
    }
    for (let x = EX - 6; x <= EX + 6; x += 3) v.set(x, FY, EZ + 2, 'flame');
    // the biplane, spiralling down in front of him, smoke behind it
    const [BX, BY, BZ] = [C - 10, C + 6, 30];
    v.box(BX, BY - 4, BZ + 2, BX + 2, BY + 4, BZ + 2, 'accent'); v.box(BX, BY - 4, BZ, BX + 2, BY + 4, BZ, 'accent');
    v.box(BX - 3, BY, BZ, BX + 4, BY, BZ + 1, 'red'); v.set(BX + 5, BY, BZ + 1, 'metalDark'); v.box(BX + 6, BY - 1, BZ, BX + 6, BY + 1, BZ + 2, 'metal');
    v.box(BX - 4, BY - 1, BZ + 1, BX - 4, BY + 1, BZ + 1, 'accent'); v.set(BX - 4, BY, BZ + 2, 'red');
    for (const [dy] of [[-3], [3]]) v.col(BX + 1, BY + dy, BZ + 1, BZ + 1, 'woodDark');
    v.sprite(BX + 1, BY + 1, BZ + 3, CARL, PALETTE); v.sprite(BX + 1, BY + 3, BZ + 3, DONUT, PALETTE);
    for (let i = 1; i < 9; i++) v.set(BX - 4 - i, BY - Math.round(i * 0.4), BZ + 1 + Math.round(i * 0.6), i % 3 ? 'stoneDark' : 'cloth');
    v.set(BX - 2, BY, BZ + 2, 'flame');
  }
  return v;
}

/* Where each layer's callout points, as a point in the scene. */
const anchors: VoxelMap['anchors'] = {
  dome: [C - 17, C - 17, 22], 'dome-popped': [C - 17, C - 17, 22], 'second-sun': [12, 16, 24],
  'fog-below': [40, 42, 2], sea: [44, 40, 0], island: [40, 30, PZ], reef: [C + 3, C + 22, 1],
  necropolis: [M[0] + 7, M[1] - 7, 12], tomb: [Math.round((TX0 + TX1) / 2), TY, 8], flood: [Math.round((TX0 + TX1) / 2), TY + 4, 2],
  bowl: [M[0], M[1], TOP], 'bowl-span': [M[0] + 8, M[1] + 1, TOP + 5], 'hump-town': [M[0] - 5, M[1] - 4, TOP + 3],
  'far-town': [M[0] + 4, M[1] - 5, TOP + 3], 'far-ruin': [M[0] + 4, M[1] - 5, TOP + 2],
  crawlers: [M[0] + 2, M[1] + 3, TOP + 4], 'crawlers-below': [32, 35, PZ + 4],
  sandcastle: [SX0 + 2, M[1] + 4, 20], 'sandcastle-down': [(SX0 + SX1) / 2, M[1] + 9, PZ + 3],
  speck: [M[0] + 1, M[1] - 3, 30], wasteland: [M[0] + 1, M[1] - 3, 32], house: [M[0] + 1, M[1] - 3, 30], 'house-landed': [34, 33, PZ + 3],
  sub: [17, 45, 3], 'sub-taken': [18, 44, 7], lusca: [45, 33, 6], orthrus: [33, 13, PZ + 18],
};

export const FLOOR_5_VOXEL: VoxelMap = { build, anchors };
export const buildFloor5 = build;

/** The tile: the bubble as it stands when its picture opens (4:2), the whole
    bubble seen for the first time: island, sea, reef, the mesa and its bowl,
    the tomb, the sandcastle and the scrap castle in the sky. */
export const TILE_5_LAYERS = ['dome', 'sea', 'island', 'reef', 'necropolis', 'tomb', 'bowl', 'hump-town', 'far-town', 'bowl-span', 'crawlers', 'wasteland', 'sandcastle'];
/** The hero picture, once the floor is finished: the bubble popped, Orthrus on
    the island, and Emberus come for him (4:31). */
export const HERO_5_LAYERS = ['dome-popped', 'second-sun', 'sea', 'island', 'reef', 'necropolis', 'tomb', 'flood', 'bowl', 'hump-town', 'far-ruin', 'sandcastle-down', 'house-landed', 'sub-taken', 'orthrus', 'hero'];
