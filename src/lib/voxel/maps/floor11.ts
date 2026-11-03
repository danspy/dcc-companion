import { Vox, rng, slab, disc, ring } from '../vox.ts';
import type { VoxelMap } from './index.ts';

/* Floor 11's page map, composed as one diorama rather than a board: a raised
   yellow-brick causeway on stone arches, flame-topped posts with red swags and
   flower garlands, the floats on it, the crowd and the fog on the ground either
   side, and at its end the gate and the round stone arena, banners inside, the
   fight on its sand. Everything is big on purpose: the road and the arena are
   the floor, so they fill the frame.

   The ground under the road is in every state; the arena's own ground arrives
   with the arena (8:92), so nothing before it says how the road ends. The tile
   is this same scene at its artAt, so the two cannot drift. */

const RX0 = 0, RX1 = 30;          // the causeway runs along x
const Y0 = 10, Y1 = 18;           // its parapets; the road is between them
const DECK = 6;                   // the road surface
const A = [46, 14] as const;      // the arena's centre
const AR = 13;                    // its outer wall
const PODIUM = 5;                 // the arena floor sits level with the road, on a stone drum
const FLOWERS = ['pink', 'white', 'pink', 'red', 'brick', 'pink', 'white', 'red'];

function build(shown: Set<string>): Vox {
  const v = new Vox();
  const has = (id: string) => shown.has(id);
  const T = (id: string) => { v.tag = id; return has(id); };
  const plain = has('yellow-brick-road');
  const inGate = (x: number, y: number) => x <= A[0] - AR + 3 && y > Y0 && y < Y1;

  /* ---- the ground under the road: dark stone, grass once the plain is seen ---- */
  v.tag = '';
  slab(v, RX0 - 3, Y0 - 7, RX1 + 3, Y1 + 3, 0, { depth: 8, seed: 1101, crust: 'stone', top: 'stoneDark' });
  if (T('yellow-brick-road')) {
    v.chunk = 2;
    const r = rng(1102);
    for (let x = RX0 - 3; x <= RX1 + 3; x++) for (let y = Y0 - 7; y <= Y1 + 3; y++) if (v.has(x, y, 0)) v.set(x, y, 0, x >= RX0 && x <= RX1 && y >= Y0 && y <= Y1 ? 'black' : ((x >> 1) * 7 + (y >> 1) * 13) % 5 === 0 ? 'leafLight' : 'grass');
    v.chunk = 1;
  }

  /* ---- the arena's own ground and its stone drum ---- */
  if (T('arena-gate')) {
    slab(v, A[0] - AR - 3, A[1] - AR - 3, A[0] + AR + 3, A[1] + AR + 3, 0, { depth: 9, seed: 1103, crust: 'stone', top: plain ? 'grass' : 'stoneDark',
      shape: (x, y) => Math.hypot(x - A[0], y - A[1]) <= AR + 3 });
    v.chunk = 2;
    disc(v, A[0], A[1], AR, AR, 1, PODIUM, () => 'stone');
    v.chunk = 1;
    // arched openings round the drum's near face
    for (let a = -0.3; a < Math.PI * 0.85; a += 0.32) {
      const x = Math.round(A[0] + Math.cos(a) * (AR - 0.4)), y = Math.round(A[1] + Math.sin(a) * (AR - 0.4));
      v.box(x, y, 1, x, y, 3, 'void'); v.set(x, y, 4, 'stoneDark');
    }
  }

  /* ---- the causeway: piers and arches, a deck, parapets, posts, swags ---- */
  if (T('yellow-brick-road')) {
    v.chunk = 2;
    for (let x = RX0; x <= RX1; x++) for (let y = Y0; y <= Y1; y++) {
      const p = ((x - RX0) % 7 + 7) % 7, nearPier = Math.min(p, 7 - p);
      for (let z = 1; z <= DECK - 1; z++) {
        // piers every seven, and between them an arch whose crown is the deck
        const solid = p <= 1 || z >= DECK - 1 || (z === DECK - 2 && nearPier <= 2) || (z === DECK - 3 && nearPier <= 1);
        if (solid) v.set(x, y, z, (x + z) % 4 ? 'stone' : 'stoneDark');
      }
      v.chunk = 1; v.set(x, y, DECK, y === Y0 || y === Y1 ? 'stone' : 'brick'); v.chunk = 2;
    }
    v.chunk = 1;
    for (const y of [Y0, Y1]) {
      for (let x = RX0; x <= RX1; x++) v.set(x, y, DECK + 1, 'stone');
      for (let x = RX0; x <= RX1; x += 5) {
        v.box(x, y, DECK + 1, x, y, DECK + 3, 'stone'); v.set(x, y, DECK + 4, 'stoneDark'); v.set(x, y, DECK + 5, 'flame');
        // a garland down the post's outer face
        const out = y === Y0 ? y - 1 : y + 1;
        for (let z = DECK; z <= DECK + 3; z++) v.set(x, out, z, FLOWERS[(x + z) % FLOWERS.length]);
      }
      // red swags between the posts, sagging in the middle, on the outer face
      const out = y === Y0 ? y - 1 : y + 1;
      for (let x = RX0 + 1; x < RX1; x++) if (x % 5) { const sag = Math.abs((x % 5) - 2.5) < 1.2 ? 1 : 0; v.set(x, out, DECK + 2 - sag, x % 5 === 2 || x % 5 === 3 ? 'red' : 'redDark'); }
    }
  }

  /* ---- the garage the floats start from, at the head of the road ---- */
  if (T('staging-garage')) {
    v.box(RX0, Y0 + 1, DECK + 1, RX0 + 6, Y1 - 1, DECK + 5, 'metal');
    v.clear(RX0 + 1, Y0 + 2, DECK + 1, RX0 + 5, Y1 - 2, DECK + 4);
    v.box(RX0, Y0 + 1, DECK + 6, RX0 + 6, Y1 - 1, DECK + 6, 'metalDark');
    for (let z = DECK + 1; z <= DECK + 4; z++) for (let y = Y0 + 2; y <= Y1 - 2; y++) v.set(RX0 + 6, y, z, z % 2 ? 'white' : 'metal');
    v.box(RX0 + 6, Y0 + 2, DECK + 5, RX0 + 6, Y1 - 2, DECK + 5, 'window');
  }

  /* ---- fog on the plain, knee high, never on the road ---- */
  if (T('fog')) {
    // one veil a block deep over the plain, ragged at its edge by the road
    const r = rng(1104);
    for (let x = RX0 - 3; x <= RX1 + 3; x++) for (let y = Y0 - 7; y <= Y1 + 3; y++) {
      if (y >= Y0 - 1 && y <= Y1 + 1 && x >= RX0 && x <= RX1) continue;
      if ((y === Y0 - 2 || y === Y1 + 2) && r() < 0.5) continue;
      if (!v.has(x, y, 0) || v.has(x, y, 1)) continue;
      v.set(x, y, 1, 'mist');
    }
  }

  /* ---- the crowd either side of the road: masked, then not ---- */
  const crowd = (masked: boolean) => {
    const r = rng(masked ? 1105 : 1106);
    for (const [ya, yb] of [[Y0 - 6, Y0 - 2]] as const)
      for (let x = RX0 - 1; x <= RX1 + 1; x += 2) for (let y = ya; y <= yb; y += 2) {
        if (x >= 18 && x <= 27) continue;                  // the judging stand
        if (r() < 0.25) continue;
        const xx = x + (r() < 0.5 ? 0 : 1);
        v.set(xx, y, 1, ['woodDark', 'dirtDark', 'roofBlue', 'redDark', 'purple'][Math.floor(r() * 5)]);
        v.set(xx, y, 2, ['woodDark', 'dirtDark', 'roofBlue', 'redDark', 'purple'][Math.floor(r() * 5)]);
        if (masked) { v.set(xx, y, 3, 'white'); if (r() < 0.5) v.set(xx, y, 4, r() < 0.5 ? 'red' : 'accent'); }
        else { v.set(xx, y, 3, ['slime', 'chitin', 'pink', 'lichen'][Math.floor(r() * 4)]); if (r() < 0.4) v.set(xx + 1, y, 1, 'white'); }
      }
  };
  if (T('masked-crowd')) crowd(true);
  if (T('unmasked-crowd')) crowd(false);

  /* ---- the floats: wooden carts heaped with dahlias ---- */
  const float = (x0: number, len: number, h: number, seed: number) => {
    const r = rng(seed);
    v.box(x0, Y0 + 2, DECK + 1, x0 + len, Y1 - 2, DECK + 1, 'woodDark');
    for (const x of [x0 + 1, x0 + len - 1]) for (const y of [Y0 + 1, Y1 - 1]) { v.box(x, y, DECK + 1, x, y, DECK + 2, 'black'); v.set(x, y, DECK + 2, 'wood'); }
    const cx = x0 + len / 2, cy = (Y0 + Y1) / 2;
    for (let x = x0; x <= x0 + len; x++) for (let y = Y0 + 2; y <= Y1 - 2; y++) {
      const d = Math.hypot((x - cx) / (len / 2 + 0.5), (y - cy) / 2.6);
      const top = Math.round(DECK + 2 + h * Math.max(0, 1 - d * d));
      for (let z = DECK + 2; z <= top; z++) v.set(x, y, z, z === top ? FLOWERS[Math.floor(r() * FLOWERS.length)] : 'leaf');
    }
  };
  if (T('floats')) {
    float(9, 7, 4, 1107); float(19, 4, 3, 1108);
    // the food truck's float last, under its magenta-and-white triangle
    float(2, 4, 2, 1109);
    for (let z = 0; z <= 5; z++) for (let y = Y0 + 4 - Math.floor((5 - z) / 2); y <= Y1 - 4 + Math.floor((5 - z) / 2); y++) v.set(4, y, DECK + 5 + z, (y + z) % 2 ? 'laser' : 'white');
  }

  /* ---- the judging stand on the plain, its banner across the road ---- */
  if (T('judging-stand')) {
    for (let i = 0; i < 3; i++) v.box(19, Y0 - 2 - i, 1, 27, Y0 - 2 - i, 2 + i, 'woodDark');
    for (let x = 19; x <= 27; x += 2) { v.set(x, Y0 - 3, 3, 'roofBlue'); v.set(x, Y0 - 3, 4, 'plaster'); }
    v.box(19, Y0 - 6, 1, 27, Y0 - 6, 6, 'wood'); v.box(19, Y0 - 6, 7, 27, Y0 - 2, 7, 'red');
    for (const y of [Y0, Y1]) v.box(25, y, DECK + 1, 25, y, DECK + 6, 'woodDark');
    for (let y = Y0; y <= Y1; y++) v.set(25, y, DECK + 7, y % 2 ? 'red' : 'accent');
  }

  /* ---- the Grand Master's donkey, in yellow and blue ---- */
  if (T('lamashtu')) {
    v.box(20, 13, DECK + 2, 22, 15, DECK + 3, 'stone'); for (const [x, y] of [[20, 13], [22, 13], [20, 15], [22, 15]]) v.set(x, y, DECK + 1, 'stoneDark');
    v.box(23, 14, DECK + 3, 23, 14, DECK + 5, 'stone'); v.set(23, 14, DECK + 6, 'stoneDark');
    v.box(20, 13, DECK + 4, 22, 15, DECK + 4, 'brick'); v.box(21, 13, DECK + 4, 21, 15, DECK + 4, 'blue');
  }

  /* ---- the gate: two flame-topped towers, red curtains, flowers, the screen ---- */
  const GX = A[0] - AR - 2;       // the gate stands just short of the arena wall
  if (T('arena-gate')) {
    for (let x = GX; x <= A[0] - AR + 1; x++) for (let y = Y0; y <= Y1; y++) v.set(x, y, DECK, 'stone');
    for (const [y0, y1] of [[Y0 - 2, Y0], [Y1, Y1 + 2]] as const) {
      v.box(GX, y0, 1, GX + 2, y1, DECK + 11, 'stone');
      v.box(GX, y0, DECK + 12, GX + 2, y1, DECK + 12, 'stoneDark');
      v.set(GX + 1, y0 + 1, DECK + 13, 'flame');
    }
    v.box(GX, Y0 + 1, DECK + 8, GX + 2, Y1 - 1, DECK + 10, 'stone');
    for (let y = Y0 + 1; y < Y1; y++) v.set(GX - 1, y, DECK + 9, FLOWERS[y % FLOWERS.length]);
    for (const y of [Y0 + 1, Y1 - 1]) v.box(GX - 1, y, DECK + 3, GX - 1, y, DECK + 8, 'red');
    // the jumbotron over the gate
    v.box(GX + 1, Y0 + 1, DECK + 11, GX + 1, Y1 - 1, DECK + 15, 'black');
    v.box(GX + 1, Y0 + 2, DECK + 12, GX + 1, Y1 - 2, DECK + 14, 'window');
    // the white door, shut until the arena opens
    if (!has('arena-floor')) v.box(GX + 2, Y0 + 1, DECK + 1, GX + 2, Y1 - 1, DECK + 7, 'white');

    /* the arena wall: a ring with tiers inside, pillars with fire, windows out, banners in */
    v.chunk = 2;
    ring(v, A[0], A[1], AR, 2, PODIUM + 1, PODIUM + 8, (x, y, z) => (inGate(x, y) && z <= PODIUM + 7 ? null : 'stone'));
    v.chunk = 1;
    ring(v, A[0], A[1], AR - 2, 2, PODIUM + 1, PODIUM + 2, (x, y) => (inGate(x, y) ? null : 'stoneDark'));
    ring(v, A[0], A[1], AR - 1, 1, PODIUM + 3, PODIUM + 3, (x, y) => (inGate(x, y) ? null : 'stoneDark'));
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 7) {
      const x = Math.round(A[0] + Math.cos(a) * (AR - 0.6)), y = Math.round(A[1] + Math.sin(a) * (AR - 0.6));
      if (inGate(x, y)) continue;
      v.box(x, y, PODIUM + 1, x, y, PODIUM + 10, 'stone'); v.set(x, y, PODIUM + 11, 'stoneDark'); v.set(x, y, PODIUM + 12, 'flame');
      // crenels between pillars
      const b = a + Math.PI / 14, cx = Math.round(A[0] + Math.cos(b) * (AR - 0.6)), cy = Math.round(A[1] + Math.sin(b) * (AR - 0.6));
      if (!inGate(cx, cy)) v.set(cx, cy, PODIUM + 9, 'stone');
    }
    for (let a = 0.15; a < Math.PI * 0.85; a += 0.3) {     // arched windows on the near face
      const x = Math.round(A[0] + Math.cos(a) * AR), y = Math.round(A[1] + Math.sin(a) * AR);
      v.box(x, y, PODIUM + 3, x, y, PODIUM + 5, 'void');
    }
    for (let a = Math.PI * 1.05; a < Math.PI * 1.95; a += 0.26) { // red banners on the far wall's inner face
      const x = Math.round(A[0] + Math.cos(a) * (AR - 2)), y = Math.round(A[1] + Math.sin(a) * (AR - 2));
      v.box(x, y, PODIUM + 3, x, y, PODIUM + 7, 'red'); v.set(x, y, PODIUM + 8, 'accent'); v.set(x, y, PODIUM + 3, 'redDark');
    }
  }

  /* ---- inside: the sand, the tree, the fight ---- */
  const IN = AR - 3;
  if (T('arena-floor')) {
    const r = rng(1110);
    disc(v, A[0], A[1], IN, IN, PODIUM, PODIUM, () => (r() < 0.07 ? 'redDark' : r() < 0.2 ? 'dirt' : 'sand'));
    v.box(A[0] - 1, A[1] + 4, PODIUM, A[0] + 1, A[1] + 6, PODIUM, 'metalDark');
  }
  if (T('white-tree')) {
    // a bare white tree: a trunk, and limbs that climb as they reach out
    v.box(A[0], A[1], PODIUM + 1, A[0] + 1, A[1] + 1, PODIUM + 11, 'white');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3, len = 4 + (i % 2), z0 = PODIUM + 8 + (i % 3);
      for (let t = 1; t <= len; t++) v.set(Math.round(A[0] + 0.5 + Math.cos(a) * t), Math.round(A[1] + 0.5 + Math.sin(a) * t), z0 + Math.round(t * 0.7), 'white');
    }
  }
  if (T('shattered-tree')) {
    v.box(A[0], A[1], PODIUM + 1, A[0] + 1, A[1] + 1, PODIUM + 4, 'white');
    v.set(A[0] + 1, A[1], PODIUM + 5, 'white');
    for (let x = A[0] + 2; x <= A[0] + 8; x++) v.set(x, A[1] - 1 + (x % 3 === 0 ? 1 : 0), PODIUM + 1, 'white');
    for (const [dx, dy] of [[-3, 2], [-2, -4], [3, 3], [5, -2]]) v.set(A[0] + dx, A[1] + dy, PODIUM + 1, 'bone');
  }
  if (T('monsters')) {
    const r = rng(1112);
    for (let a = 0; a < Math.PI * 2; a += 0.11) {
      if (Math.cos(a) < -0.85) continue;                    // the gate side stays clear
      for (const rr of [AR - 2.4, AR - 1.4]) if (r() < 0.75) {
        const x = Math.round(A[0] + Math.cos(a) * rr), y = Math.round(A[1] + Math.sin(a) * rr), z = rr < AR - 2 ? PODIUM + 3 : PODIUM + 4;
        v.set(x, y, z, ['slime', 'chitin', 'purple', 'dirtDark', 'pink', 'lichen'][Math.floor(r() * 6)]);
      }
    }
  }
  if (T('witnesses')) for (let a = Math.PI * 1.1; a < Math.PI * 1.9; a += 0.2) {
    const x = Math.round(A[0] + Math.cos(a) * (AR - 1)), y = Math.round(A[1] + Math.sin(a) * (AR - 1));
    v.set(x, y, PODIUM + 9, 'stoneDark'); v.set(x, y, PODIUM + 10, 'plaster');
  }
  if (T('scolopendra')) {
    // coiled round the tree, rising: brown and red plates, yellow legs, no face
    for (let t = 0; t < Math.PI * 3.2; t += 0.16) {
      const rr = 6.2 - t * 0.35, x = Math.round(A[0] + 0.5 + Math.cos(t) * rr), y = Math.round(A[1] + 0.5 + Math.sin(t) * rr), z = PODIUM + 1 + Math.round(t * 1.1);
      v.box(x, y, z, x, y, z + 1, Math.floor(t / 0.48) % 2 ? 'chitin' : 'redDark');
      const lx = Math.round(A[0] + 0.5 + Math.cos(t) * (rr + 1.2)), ly = Math.round(A[1] + 0.5 + Math.sin(t) * (rr + 1.2));
      if (Math.floor(t / 0.16) % 3 === 0) v.set(lx, ly, z, 'brick');
    }
    const t = Math.PI * 3.2, rr = 6.2 - t * 0.35, hx = Math.round(A[0] + 0.5 + Math.cos(t) * rr), hy = Math.round(A[1] + 0.5 + Math.sin(t) * rr), hz = PODIUM + 1 + Math.round(t * 1.1);
    v.box(hx, hy, hz, hx + 1, hy, hz + 2, 'chitin'); v.col(hx, hy - 1, hz + 3, hz + 5, 'black'); v.col(hx + 1, hy + 1, hz + 3, hz + 5, 'black');
  }
  /* The hero picture only: the centipede at full size, coiled round the tree
     and rearing out of the arena over its own gate, her head over the road. */
  if (shown.has('hero')) {
    v.tag = 'scolopendra';
    const pts: [number, number, number][] = [];
    for (let t = 0; t <= 1.0001; t += 0.006) {
      if (t < 0.35) { const a = t / 0.35 * Math.PI * 2.2, rr = 7.5 - t * 6; pts.push([A[0] + 0.5 + Math.cos(a) * rr, A[1] + 0.5 + Math.sin(a) * rr, PODIUM + 2 + t * 12]); }
      else {
        const u = (t - 0.35) / 0.65;                       // up out of the coil, over the wall, down towards the road
        const x = A[0] - 2 - u * 22, z = PODIUM + 6 + Math.sin(u * Math.PI * 0.85) * 22, y = A[1] + Math.sin(u * 5) * 1.5;
        pts.push([x, y, z]);
      }
    }
    pts.forEach(([x, y, z], i) => {
      const seg = Math.floor(i / 9), rad = i > pts.length - 14 ? 2.2 : 1.7;
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++)
        if (dx * dx + dy * dy + dz * dz <= rad * rad) v.set(Math.round(x + dx), Math.round(y + dy), Math.round(z + dz), seg % 2 ? 'chitin' : 'redDark');
      if (i % 9 === 4 && i < pts.length - 12) for (const sgn of [-1, 1]) for (let k = 2; k <= 4; k++) v.set(Math.round(x), Math.round(y + sgn * k), Math.round(z - (k - 2)), 'brick');
    });
    const [hx, hy, hz] = pts[pts.length - 1];
    for (const sgn of [-1, 1]) {
      for (let k = 1; k <= 6; k++) v.set(Math.round(hx - 1 - k * 0.6), Math.round(hy + sgn * (1 + k * 0.5)), Math.round(hz + 2 + k * 0.7), 'black');
      for (let k = 1; k <= 3; k++) v.set(Math.round(hx - 2 - k * 0.5), Math.round(hy + sgn * (1.5 - k * 0.3)), Math.round(hz - 2), 'bone');
    }
  }
  if (T('club')) for (let t = 1.2; t < Math.PI * 2.4; t += 0.9) {
    const rr = 6.2 - t * 0.35, x = Math.round(A[0] + 0.5 + Math.cos(t) * rr), y = Math.round(A[1] + 0.5 + Math.sin(t) * rr), z = PODIUM + 1 + Math.round(t * 1.1);
    v.set(x, y, z, 'laser'); v.set(x, y, z + 1, 'window');
  }
  if (T('krakaren-stands')) {
    const a = Math.PI * 1.55, x = Math.round(A[0] + Math.cos(a) * (AR - 2)), y = Math.round(A[1] + Math.sin(a) * (AR - 2));
    disc(v, x, y, 2.4, 2.4, PODIUM + 4, PODIUM + 7, 'pink');
    for (const [dx, dy] of [[3, 1], [2, 3], [-2, 3], [-3, 1], [0, 4]]) for (let k = 1; k <= 3; k++) v.set(x + Math.round(dx * k / 2), y + Math.round(dy * k / 2), PODIUM + 4 - Math.min(k, 2), 'pink');
  }
  if (T('wrecks')) for (const [a, c] of [[0.4, 'metalDark'], [0.9, 'red'], [1.5, 'blue'], [2.2, 'metal']] as const) {
    const x = Math.round(A[0] + Math.cos(a) * (IN - 1.5)), y = Math.round(A[1] + Math.sin(a) * (IN - 1.5));
    v.box(x - 1, y - 1, PODIUM + 1, x + 1, y, PODIUM + 2, c); v.set(x + 1, y - 1, PODIUM + 3, 'black'); v.set(x - 1, y, PODIUM + 1, 'black');
  }
  if (T('goo')) {
    const r = rng(1113);
    disc(v, A[0] - 2, A[1] + 1, 5, 4, PODIUM + 1, PODIUM + 1, () => (r() < 0.6 ? 'redDark' : r() < 0.6 ? 'dirtDark' : 'chitin'));
  }
  if (T('stairwells')) for (const [dx, dy] of [[-5, -4], [4, -5], [5, 3]]) {
    const x = A[0] + dx, y = A[1] + dy;
    v.box(x, y, PODIUM + 1, x + 2, y, PODIUM + 5, 'stoneDark'); v.box(x + 1, y, PODIUM + 1, x + 1, y, PODIUM + 4, 'portal');
  }
  return turn(v);
}

/* The scene is written with the road along x, which is easy to think in, and
   turned a quarter at the end so the road runs from the near left corner up to
   the arena at the back right, the way the eye reads a procession. */
const K = 65;   // odd, so a big block on the even grid lands on the even grid once turned
const rot = ([x, y, z]: [number, number, number]): [number, number, number] => [y, K - x, z];
function turn(v: Vox): Vox {
  const out = new Vox();
  for (const { p, mat, tag, chunk } of v.all()) { out.tag = tag; out.chunk = chunk; const [x, y, z] = rot(p); out.set(x, y, z, mat); }
  return out;
}

const anchorsBefore: VoxelMap['anchors'] = {
  'staging-garage': [RX0 + 3, 14, DECK + 6], 'yellow-brick-road': [14, 14, DECK], fog: [6, Y1 + 2, 1],
  'masked-crowd': [12, Y0 - 5, 3], 'unmasked-crowd': [12, Y0 - 5, 3], floats: [12, 14, DECK + 6],
  lamashtu: [21, 14, DECK + 4], 'judging-stand': [23, Y0 - 4, 7], 'arena-gate': [A[0] - AR - 1, 14, DECK + 15],
  'white-tree': [A[0], A[1], PODIUM + 12], 'arena-floor': [A[0] + 2, A[1] + 5, PODIUM], monsters: [A[0] + 6, A[1] - 8, PODIUM + 4],
  witnesses: [A[0] - 4, A[1] - 11, PODIUM + 10], scolopendra: [A[0] + 5, A[1] + 2, PODIUM + 3], club: [A[0] - 2, A[1] + 4, PODIUM + 4],
  'shattered-tree': [A[0], A[1], PODIUM + 4], 'krakaren-stands': [A[0] - 1, A[1] - 11, PODIUM + 7],
  wrecks: [A[0] + 8, A[1] + 3, PODIUM + 2], goo: [A[0] - 2, A[1] + 1, PODIUM + 1], stairwells: [A[0] + 5, A[1] - 5, PODIUM + 5],
};

const anchors: VoxelMap['anchors'] = Object.fromEntries(Object.entries(anchorsBefore).map(([k, p]) => [k, rot(p)]));

export const FLOOR_11_VOXEL: VoxelMap = { build, anchors };

/** The tile: the same scene as it stands when its picture opens (8:93), with the
    floats and the masked crowd it has just passed, and nothing from later. */
export const TILE_11_LAYERS = ['yellow-brick-road', 'masked-crowd', 'floats', 'lamashtu', 'judging-stand', 'arena-gate', 'arena-floor', 'white-tree'];
export const buildFloor11 = build;
/** The hero picture, once the floor is finished: the centipede coiled round
    the white tree in the full arena, the monsters in the stands. */
export const HERO_11_LAYERS = ['yellow-brick-road', 'judging-stand', 'arena-gate', 'arena-floor', 'white-tree', 'monsters', 'witnesses', 'hero'];
