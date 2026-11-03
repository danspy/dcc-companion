import { Vox, rng, slab, torch, line, house, disc, ring, palm, banner } from '../vox.ts';
import { CARL, DONUT, PALETTE } from '../../maps/sprites.ts';
import type { VoxelMap } from './index.ts';

/* Floor 6's page map, composed as one diorama: a jungle island split by its
   river. The left bank stands a step higher, with the dryad settlement behind
   its palisade at the front and the high elves' corner at the back; the
   river runs down the middle under the covered bridge and falls off the front
   edge in two drops; Point Mongo's palisade is on the right bank and Zockau's
   walled grid behind it. Big canopy trees round the edges, vines down the
   island's sides, rock showing through the dirt. Built layer by layer from what
   the reader has reached; the tile is this scene at its artAt. */

const W = 56, D = 34;
const LZ = 2;                                       // the left bank's height
const ZK = [44, 9] as const, DV = [12, 23] as const, PM = [44, 24] as const, EC = [12, 8] as const;
const EZ = LZ;                                      // the elves' ground: the left bank
const riverX = (y: number) => 28 + Math.round(Math.sin(y / 5) * 2);
const BY = 21;                                      // the bridge's row
const leftBank = (x: number, y: number) => x < riverX(y) - 2;
const g = (x: number, y: number) => (leftBank(x, y) ? LZ : 0);
const inIsland = (x: number, y: number) =>
  !(x <= 3 && y >= 30) && !(x >= 52 && y <= 3) && !(x >= 50 && y >= 31) && !(x <= 2 && y <= 4) && !(x >= 36 && x <= 41 && y >= 33);

/* The village pieces, each standing on its own ground height z. */
const hut = (v: Vox, x: number, y: number, z: number, w = 6, d = 5) => {
  v.chunk = 2; v.box(x, y, z + 1, x + w - 1, y + d - 1, z + 3, 'wood'); v.chunk = 1;
  for (let i = 0; i < 3; i++) v.box(x - 1 + i, y - 1 + i, z + 4 + i, x + w - i, y + d - i, z + 4 + i, 'sand');
  v.box(x + Math.floor(w / 2) - 1, y + d - 1, z + 1, x + Math.floor(w / 2), y + d - 1, z + 2, 'void');
  torch(v, x + w, y + d, z + 1);
};
const stilts = (v: Vox, x: number, y: number, z: number) => {
  for (const [a, b] of [[0, 0], [4, 0], [0, 4], [4, 4]]) v.col(x + a, y + b, z + 1, z + 6, 'woodDark');
  v.box(x - 1, y - 1, z + 7, x + 5, y + 5, z + 9, 'wood'); v.box(x - 1, y - 1, z + 10, x + 5, y + 5, z + 10, 'sand'); v.box(x, y, z + 11, x + 4, y + 4, z + 11, 'sand'); v.box(x + 1, y + 1, z + 12, x + 3, y + 3, z + 12, 'sand');
  v.set(x + 2, y + 5, z + 8, 'window');
};
const stall = (v: Vox, x: number, y: number, z: number) => { v.box(x + 1, y + 1, z + 1, x + 4, y + 3, z + 2, 'cloth'); v.box(x, y, z + 3, x + 5, y + 4, z + 3, 'sand'); v.box(x + 1, y + 1, z + 3, x + 4, y + 3, z + 3, 'roofRed'); };
const palisade = (v: Vox, cx: number, cy: number, r: number, skip: (x: number, y: number) => boolean) => {
  for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d > r || d <= r - 1 || skip(x, y)) continue;
    const z = g(x, y), h = 3 + ((x + y) % 2);
    v.clear(x, y, z + 1, x, y, z + 14); v.col(x, y, z + 1, z + h, 'wood'); v.set(x, y, z + h + 1, 'woodDark');
  }
};
/** A canopy tree: a dark trunk and two big blocks of crown. */
const canopy = (v: Vox, x: number, y: number, z: number, h: number, light: boolean) => {
  v.col(x, y, z + 1, z + h, 'woodDark');
  v.chunk = 2;
  disc(v, x, y, 2.6, 2.6, z + h + 1, z + h + 2, light ? 'leafLight' : 'leaf');
  disc(v, x + 0.5, y + 0.5, 1.6, 1.6, z + h + 3, z + h + 4, 'leafLight');
  v.chunk = 1;
};

function build(shown: Set<string>): Vox {
  const v = new Vox();
  const has = (id: string) => shown.has(id);
  const T = (id: string) => { v.tag = id; return has(id); };
  const clearAbove = (x: number, y: number) => v.clear(x, y, g(x, y) + 1, x, y, g(x, y) + 16);

  if (T('jungle')) {
    slab(v, 0, 0, W, D, 0, { depth: 9, seed: 601, shape: inIsland, top: (x, y) => (((x >> 1) * 5 + (y >> 1) * 3) % 9 === 0 ? 'leafLight' : 'grass'), crust: 'dirt', under: ['dirt', 'stone'] });
    // the left bank, a step up, with its cliff facing the river
    v.chunk = 2;
    for (let x = 0; x <= W; x++) for (let y = 0; y <= D; y++) if (inIsland(x, y) && leftBank(x, y)) {
      v.set(x, y, 0, 'dirt'); v.set(x, y, 1, ((x >> 1) + (y >> 1)) % 3 ? 'dirt' : 'stone');
      v.set(x, y, LZ, ((x >> 1) * 5 + (y >> 1) * 3) % 9 === 0 ? 'leafLight' : 'grass');
    }
    v.chunk = 1;
    const r = rng(602);
    // the trails: east out of the settlement to the river, and paths of trodden dirt
    for (let x = DV[0] + 8; x < riverX(BY) - 2; x++) for (const d of [0, 1]) v.set(x, BY + d, LZ, 'dirt');
    for (let x = riverX(BY) + 3; x <= PM[0] - 6; x++) for (const d of [0, 1]) v.set(x, BY + d, 0, 'dirt');
    // big trees round the edges, palms between
    const busy = (x: number, y: number) => Math.hypot(x - DV[0], y - DV[1]) < 10 || Math.hypot(x - ZK[0], y - ZK[1]) < 9
      || Math.abs(x - riverX(y)) < 5 || Math.abs(y - BY - 0.5) < 3 && x > DV[0] && x < PM[0];
    for (let i = 0; i < 110; i++) {
      const x = Math.floor(r() * (W + 1)), y = Math.floor(r() * (D + 1));
      if (!inIsland(x, y) || busy(x, y) || v.has(x, y, g(x, y) + 1)) continue;
      if (r() < 0.25) palm(v, x, y, g(x, y) + 1, 5 + Math.floor(r() * 2)); else canopy(v, x, y, g(x, y), 3 + Math.floor(r() * 3), r() < 0.4);
    }
    for (let i = 0; i < 40; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * D); if (inIsland(x, y) && !busy(x, y) && !v.has(x, y, g(x, y) + 1)) v.set(x, y, g(x, y) + 1, r() < 0.5 ? 'leafLight' : 'leaf'); }
    // vines hanging down the island's near faces
    for (let x = 0; x <= W; x++) { let y = D; while (y > 0 && !v.has(x, y, 0)) y--; if (r() < 0.4 && Math.abs(x - riverX(y)) > 3) v.col(x, y + 1, -1 - Math.floor(r() * 5), g(x, y), r() < 0.5 ? 'leaf' : 'leafLight'); }
    for (let y = 0; y <= D; y++) { let x = W; while (x > 0 && !v.has(x, y, 0)) x--; if (r() < 0.4) v.col(x + 1, y, -1 - Math.floor(r() * 5), 0, r() < 0.5 ? 'leaf' : 'leafLight'); }
    // old ruins under the canopy: broken stone walls, moss on their tops
    for (const [x0, y0, x1, y1] of [[3, 14, 7, 14], [3, 14, 3, 17], [20, 4, 23, 4], [23, 4, 23, 7], [48, 30, 52, 30]]) line(x0, y0, x1, y1).forEach(([x, y], i) => {
      const z = g(x, y), h = 3 - (i % 3 === 2 ? 1 : 0);
      clearAbove(x, y); v.chunk = 2; v.col(x, y, z + 1, z + h, 'stone'); v.chunk = 1; if ((x + y) % 2) v.set(x, y, z + h + 1, 'leafLight');
    });
  }
  if (T('river')) {
    for (let y = 0; y <= D + 1; y++) for (let d = -2; d <= 2; d++) {
      const x = riverX(y) + d;
      if (!v.has(x, y, 0) && y <= D) continue;
      v.clear(x, y, 1, x, y, 16); v.set(x, y, 0, d === 0 ? 'waterDeep' : 'water'); v.set(x, y, -1, 'waterDeep');
    }
    // over the edge: a drop to a ledge of rock with a pool on it, and a second drop off that
    const fx = riverX(D);
    slab(v, fx - 4, D + 2, fx + 4, D + 6, -5, { depth: 5, seed: 604, crust: 'stone', under: ['stone', 'dirt'], top: (x) => (Math.abs(x - fx) <= 2 ? 'water' : 'grass') });
    for (let d = -2; d <= 2; d++) {
      const x = fx + d;
      v.box(x, D + 1, -4, x, D + 1, 0, 'water'); v.set(x, D + 2, -4, 'white');
      v.box(x, D + 7, -14, x, D + 7, -5, 'water'); v.set(x, D + 7, -15, 'white'); v.set(x + (d % 2), D + 8, -15, 'white');
    }
    for (const y of [7, 15, 28]) v.set(riverX(y) + (y % 2 ? 1 : -1), y, 1, 'leafLight');   // lily pads
  }
  if (T('dryad-village')) {
    // a ten-foot wall round a village of huts and a house up on stilts, the gate east onto the trail
    for (let x = DV[0] - 8; x <= DV[0] + 8; x++) for (let y = DV[1] - 8; y <= DV[1] + 8; y++) if (Math.hypot(x - DV[0], y - DV[1]) < 8.5) clearAbove(x, y);
    palisade(v, DV[0], DV[1], 9, (x, y) => !inIsland(x, y) || (x > DV[0] && Math.abs(y - BY - 0.5) <= 1.5) || !leftBank(x, y));
    hut(v, DV[0] - 7, DV[1] - 6, LZ); hut(v, DV[0] - 6, DV[1] + 2, LZ, 5, 4);
    stilts(v, DV[0] + 2, DV[1] - 7, LZ); stall(v, DV[0] + 2, DV[1] + 3, LZ);
    for (const [x, y] of [[DV[0] + 5, DV[1] + 6], [DV[0] - 1, DV[1] + 6]]) { v.chunk = 2; v.box(x, y, LZ + 1, x + 1, y + 1, LZ + 2, 'wood'); v.chunk = 1; }
    torch(v, DV[0] + 8, BY - 1, LZ + 1); torch(v, DV[0] + 8, BY + 2, LZ + 1);
    banner(v, DV[0] - 6, DV[1] + 6, LZ + 3, 3, { along: 'x', w: 2, cloth: 'red', trim: 'accent' });
    // the Club Vanquisher's spire against the back wall, its tip gold
    v.col(DV[0] - 1, DV[1] - 8, LZ + 1, LZ + 12, 'plaster'); v.col(DV[0] - 1, DV[1] - 8, LZ + 13, LZ + 14, 'brick');
  }
  if (T('zockau')) {
    // a black wall round a grid of white blocks, the park in its middle
    for (let x = ZK[0] - 7; x <= ZK[0] + 7; x++) for (let y = ZK[1] - 7; y <= ZK[1] + 7; y++) if (Math.hypot(x - ZK[0], y - ZK[1]) < 7.5) clearAbove(x, y);
    v.chunk = 2; ring(v, ZK[0], ZK[1], 8, 1.4, 1, 4, (x, y) => (inIsland(x, y) && !leftBank(x, y) ? 'stoneDark' : null)); v.chunk = 1;
    for (let x = ZK[0] - 6; x <= ZK[0] + 5; x += 3) for (let y = ZK[1] - 6; y <= ZK[1] + 5; y += 3) {
      const d = Math.hypot(x + 1 - ZK[0], y + 1 - ZK[1]);
      if (d < 2.6 || d > 6.5) continue;
      v.chunk = 2; v.box(x, y, 1, x + 1, y + 1, 2 + ((x + y) % 4), (x + y) % 3 ? 'plaster' : 'stone'); v.chunk = 1;
      v.set(x + 1, y + 1, 2, 'window');
    }
    disc(v, ZK[0], ZK[1], 2, 2, 0, 0, 'leafLight');
  }
  if (T('stairwell-park')) { ring(v, ZK[0], ZK[1], 1.8, 1, 1, 1, 'leaf'); v.set(ZK[0], ZK[1], 1, 'window'); for (let z = 2; z <= 11; z++) v.set(ZK[0], ZK[1], z, 'beam'); }
  if (T('desperado-down')) { v.box(ZK[0] + 3, ZK[1] + 3, 1, ZK[0] + 4, ZK[1] + 4, 1, 'black'); v.set(ZK[0] + 4, ZK[1] + 4, 2, 'stoneDark'); }
  if (T('valley')) { for (let x = 33; x <= 40; x++) for (let y = 0; y <= 2; y++) { if (!v.has(x, y, 0)) continue; clearAbove(x, y); v.set(x, y, 0, 'sand'); } for (const x of [34, 38]) v.set(x, 1, 1, 'redDark'); }
  if (T('elf-city')) for (let i = 0; i < 6; i++) { const x = EC[0] - 4 + (i % 3) * 4, y = EC[1] - 4 + Math.floor(i / 3) * 5; clearAbove(x, y); canopy(v, x, y, EZ, 7 + (i % 2) * 2, i % 2 === 0); v.set(x, y + 1, EZ + 5, 'window'); }
  if (T('main-road')) for (const [x, y] of line(ZK[0] - 5, ZK[1] + 7, riverX(BY) + 4, BY - 1)) for (const d of [0, 1]) { if (leftBank(x + d, y)) continue; clearAbove(x + d, y); v.set(x + d, y, 0, 'sand'); }
  if (T('bridge')) {
    // a covered bridge: plank deck on posts, cloth sides, a thatched roof
    const x = riverX(BY), y = BY;
    v.clear(x - 4, y - 1, 1, x + 4, y + 3, 14);
    v.box(x - 4, y, LZ, x + 4, y + 2, LZ, 'wood');
    for (const dx of [-4, 0, 4]) for (const dy of [0, 2]) { v.col(x + dx, y + dy, -1, LZ - 1, 'woodDark'); v.col(x + dx, y + dy, LZ + 1, LZ + 3, 'woodDark'); }
    for (const dy of [0, 2]) v.box(x - 3, y + dy, LZ + 1, x + 3, y + dy, LZ + 1, 'cloth');
    v.box(x - 5, y - 1, LZ + 4, x + 5, y + 3, LZ + 4, 'sand'); v.box(x - 5, y, LZ + 5, x + 5, y + 2, LZ + 5, 'sand'); v.box(x - 5, y + 1, LZ + 6, x + 5, y + 1, LZ + 6, 'sand');
    v.box(x + 5, y, 1, x + 6, y + 2, 1, 'dirt');   // the ramp down to the low bank
  }
  if (T('point-mongo')) {
    for (let x = PM[0] - 7; x <= PM[0] + 7; x++) for (let y = PM[1] - 7; y <= PM[1] + 7; y++) if (Math.hypot(x - PM[0], y - PM[1]) < 7) clearAbove(x, y);
    palisade(v, PM[0], PM[1], 7.5, (x, y) => !inIsland(x, y) || (x < PM[0] && Math.abs(y - BY - 0.5) <= 1.5));
    hut(v, PM[0] - 4, PM[1] - 5, 0, 4, 3); stall(v, PM[0] - 3, PM[1] + 2, 0);
    stilts(v, PM[0] + 1, PM[1] - 3, 0);
    for (const [dx, dy] of [[3, 4], [0, 5]]) house(v, PM[0] + dx, PM[1] + dy, 1, 2, 2, 2, dx % 2 ? 'roofRed' : 'roofBlue');
    torch(v, PM[0] - 8, BY - 1, 1); torch(v, PM[0] - 8, BY + 2, 1);
  }
  if (T('crawlers')) { v.sprite(DV[0] + 9, BY, LZ + 1, CARL, PALETTE); v.sprite(DV[0] + 11, BY, LZ + 1, DONUT, PALETTE); }
  if (T('crawlers-mongo')) { v.sprite(PM[0] - 9, BY, 1, CARL, PALETTE); v.sprite(PM[0] - 7, BY, 1, DONUT, PALETTE); }
  if (T('territories')) for (const [x, y, m] of [[6, 30, 'red'], [PM[0], PM[1], 'blue'], [EC[0], EC[1], 'pink'], [ZK[0] - 8, ZK[1] + 8, 'accent']] as const) {
    for (let a = 0; a < Math.PI * 2; a += 0.05) { const xx = Math.round(x + Math.cos(a) * 9), yy = Math.round(y + Math.sin(a) * 9); if (v.has(xx, yy, g(xx, yy)) && inIsland(xx, yy)) v.set(xx, yy, g(xx, yy), m); }
  }
  if (T('hot-springs')) for (const [x, y] of [[52, 27], [49, 29], [53, 24]]) { clearAbove(x, y); disc(v, x, y, 1.4, 1.1, 0, 0, 'water'); v.set(x + 1, y + 1, 0, 'ember'); v.set(x, y, 1, 'cloth'); }
  if (T('long-necks')) for (const [x, y] of [[54, 18], [55, 15]]) { v.col(x, y, 1, 10, 'grass'); v.box(x - 1, y, 10, x, y, 11, 'grass'); v.set(x - 1, y + 1, 11, 'black'); }
  if (T('fort-freedom')) { const x = riverX(4) + 4; v.clear(x - 2, 2, 1, x + 2, 6, 14); v.chunk = 2; v.box(x - 2, 2, 1, x + 1, 5, 6, 'stone'); v.chunk = 1; v.set(x, 6, 5, 'window'); v.set(x + 2, 3, 7, 'stone'); }
  if (T('creepers')) { const r = rng(603); for (let i = 0; i < 14; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * D); v.box(x, y, 7, x, y, 8, 'bone'); v.set(x, y, 9, 'accentGlow'); } }
  if (T('brambles')) for (let x = 0; x <= W; x++) for (let y = 0; y <= 7; y++) if ((x + y * 3) % 4 === 0 && inIsland(x, y) && Math.hypot(x - ZK[0], y - ZK[1]) > 8.5) v.col(x, y, g(x, y) + 1, g(x, y) + 3 + ((x * y) % 3), 'redDark');
  if (T('castle')) {
    // the Sugar Cube: a white cube of carved oak, towers at its corners
    for (let x = EC[0] - 6; x <= EC[0] + 6; x++) for (let y = EC[1] - 6; y <= EC[1] + 6; y++) v.clear(x, y, EZ + 1, x, y, 24);
    v.chunk = 2; v.box(EC[0] - 4, EC[1] - 4, EZ + 1, EC[0] + 3, EC[1] + 3, EZ + 8, 'white'); v.chunk = 1;
    for (const [dx, dy] of [[-4, -4], [3, -4], [-4, 3], [3, 3]]) v.box(EC[0] + dx, EC[1] + dy, EZ + 9, EC[0] + dx, EC[1] + dy, EZ + 12, 'white');
    for (let x = EC[0] - 3; x <= EC[0] + 2; x += 2) v.set(x, EC[1] + 3, EZ + 5, 'window');
  }
  if (T('bramble-dome')) {
    for (let x = -9; x <= 9; x++) for (let y = -9; y <= 9; y++) for (let z = 1; z <= 12; z++) {
      const d = Math.hypot(x / 9, y / 9, z / 12);
      if (d <= 1 && d > 0.8) v.clear(EC[0] + x, EC[1] + y, EZ + z, EC[0] + x, EC[1] + y, EZ + z);
      if (d <= 1 && d > 0.8 && (x + y + z) % 2 === 0) v.set(EC[0] + x, EC[1] + y, EZ + z, (x * y + z) % 6 === 0 ? 'window' : (x + z) % 3 ? 'redDark' : 'red');
    }
  }

  /* ---- the hero picture only: the cage fight under the dome (5:74) ----
     The brambles have filled the world; over the clearing they close into a
     dome lit by the pulsing yellow buds, cut open here so the fight shows:
     Carl and Donut, Mongo in his pink feathers, Kiwi the bear, and a swarm of
     mantis nymphs. */
  if (shown.has('hero')) {
    v.tag = 'bramble-dome';
    const r = rng(605);
    // the world choked: low tangles of thorn over everything outside the clearing
    for (let x = 0; x <= W; x++) for (let y = 0; y <= D; y++) {
      if (!inIsland(x, y) || Math.hypot(x - EC[0], y - EC[1]) < 12 || Math.abs(x - riverX(y)) < 3 || ((x * 7 + y * 13) % 3)) continue;
      const z = g(x, y); v.col(x, y, z + 1, z + 1 + ((x + y) % 2), r() < 0.3 ? 'red' : 'redDark'); if (r() < 0.06) v.set(x, y, z + 3, 'window');
    }
    // the clearing, and the great dome over it with its near quarter cut away
    for (let x = EC[0] - 11; x <= EC[0] + 11; x++) for (let y = EC[1] - 11; y <= EC[1] + 11; y++) {
      if (Math.hypot(x - EC[0], y - EC[1]) > 10.5) continue;
      v.clear(x, y, 1, x, y, 30);
      if (v.has(x, y, 0)) v.box(x, y, 1, x, y, EZ, ((x >> 1) + (y >> 1)) % 3 ? 'dirtDark' : 'dirt');
    }
    const R6 = 10.5, HH = 15;
    for (let x = -11; x <= 11; x++) for (let y = -11; y <= 11; y++) for (let z = 1; z <= HH; z++) {
      const d = Math.hypot(x / R6, y / R6, z / HH);
      if (d > 1 || d <= 0.84 || !v.has(EC[0] + x, EC[1] + y, 0)) continue;
      if (x > -1 && y > -1) continue;                               // the cutaway
      const k = (x * 3 + y * 5 + z * 7) % 11;
      if (k === 0 || k === 5) continue;                             // gaps between the thorns
      v.set(EC[0] + x, EC[1] + y, EZ + z, k === 3 ? 'window' : k % 2 ? 'redDark' : 'red');
    }
    for (let a = -0.1; a < Math.PI * 0.6; a += 0.35) { const x = Math.round(EC[0] + Math.cos(a) * 10), y = Math.round(EC[1] + Math.sin(a) * 10); if (!v.has(x, y, 0)) continue; v.col(x, y, EZ + 1, EZ + 3, 'redDark'); v.set(x, y, EZ + 4, 'window'); }
    const z0 = EZ + 1;
    // Mongo: a pink-feathered raptor, Donut on his back; Carl beside them
    const [MX, MY] = [EC[0] + 3, EC[1] + 3];
    v.box(MX - 2, MY, z0 + 2, MX + 2, MY + 1, z0 + 3, 'pink'); v.col(MX - 1, MY, z0, z0 + 1, 'dirtDark'); v.col(MX + 1, MY + 1, z0, z0 + 1, 'dirtDark');
    v.box(MX + 3, MY, z0 + 3, MX + 3, MY + 1, z0 + 5, 'pink'); v.box(MX + 4, MY, z0 + 5, MX + 5, MY + 1, z0 + 6, 'pink'); v.set(MX + 5, MY + 1, z0 + 6, 'black'); v.set(MX + 6, MY, z0 + 5, 'bone');
    for (let i = 1; i <= 4; i++) v.set(MX - 2 - i, MY, z0 + 3 + Math.floor(i / 2), i % 2 ? 'pink' : 'red');
    v.sprite(MX, MY + 1, z0 + 4, DONUT, PALETTE); v.sprite(MX + 2, MY + 4, z0, CARL, PALETTE);
    // Kiwi: a bear, big and brown
    const [KX, KY] = [EC[0] - 5, EC[1] + 4];
    v.chunk = 2; v.box(KX - 2, KY, z0, KX + 3, KY + 1, z0 + 3, 'dirtDark'); v.chunk = 1;
    v.box(KX + 3, KY, z0 + 4, KX + 4, KY + 1, z0 + 5, 'dirtDark'); v.set(KX + 5, KY + 1, z0 + 4, 'dirt'); v.set(KX + 4, KY + 1, z0 + 5, 'black'); v.set(KX + 3, KY, z0 + 6, 'dirtDark');
    // the nymphs, green and everywhere
    for (let i = 0; i < 22; i++) { const a = r() * Math.PI * 2, d = 3 + r() * 6; const x = Math.round(EC[0] + Math.cos(a) * d), y = Math.round(EC[1] + Math.sin(a) * d); if (v.has(x, y, z0) || !v.has(x, y, 0)) continue; v.set(x, y, z0, 'lichen'); v.set(x, y, z0 + 1, r() < 0.5 ? 'slime' : 'lichen'); if (r() < 0.5) v.set(x + 1, y, z0 + 2, 'leafLight'); }
  }
  return v;
}

const anchors: VoxelMap['anchors'] = {
  jungle: [20, 32, LZ + 5], 'dryad-village': [DV[0] - 1, DV[1] - 8, LZ + 14], crawlers: [DV[0] + 10, BY, LZ + 4], zockau: [ZK[0] - 5, ZK[1] + 5, 4],
  'stairwell-park': [ZK[0], ZK[1], 11], 'desperado-down': [ZK[0] + 4, ZK[1] + 4, 2], valley: [36, 1, 1], river: [riverX(28), 28, 0],
  'elf-city': [EC[0], EC[1], EZ + 12], 'main-road': [36, 18, 0], bridge: [riverX(BY), BY + 1, LZ + 6], 'point-mongo': [PM[0] + 3, PM[1] - 1, 13],
  'crawlers-mongo': [PM[0] - 8, BY, 4], territories: [6, 30, LZ], 'hot-springs': [52, 27, 1], 'long-necks': [54, 12, 11],
  'fort-freedom': [riverX(4) + 4, 4, 7], creepers: [30, 12, 9], brambles: [30, 3, 4], castle: [EC[0], EC[1], EZ + 12], 'bramble-dome': [EC[0], EC[1], EZ + 12],
};

export const FLOOR_6_VOXEL: VoxelMap = { build, anchors };
export const buildFloor6 = build;

/** The tile: the jungle as it stands when its picture opens (5:10): the
    settlement, Zockau, the river and its covered bridge, the elves' trees. */
export const TILE_6_LAYERS = ['jungle', 'river', 'dryad-village', 'zockau', 'stairwell-park', 'desperado-down', 'valley', 'elf-city', 'main-road', 'bridge'];
/** The hero picture, once the floor is finished: the cage fight under the dome of thorns (5:74). */
export const HERO_6_LAYERS = ['jungle', 'river', 'zockau', 'stairwell-park', 'main-road', 'bridge', 'hero'];
