import { Vox, rng, slab, disc, ring, banner } from '../vox.ts';
import { CARL, DONUT, PALETTE } from '../../maps/sprites.ts';
import type { VoxelMap } from './index.ts';

/* Floor 9's page map, composed as one diorama: Larracos, a funnel city of
   terraced rings stepping down to a lake with the castle under it, on a round
   island with grey cliffs, bastions with burning towers round its lip and red
   banners down its sides. Around it, once the war is drawn (7:14), the plain
   arrives as nine wedges of a pie, each its own floating slice at its own
   height, with a crack of air between them: the slices are the war.

   Ground and masonry are big blocks; houses, towers, tents and people are
   small ones. The tile (tiles/floor9.ts) is this same scene at its artAt, the
   city alone on its island, so the two cannot drift; the hero picture is this
   scene at the War Crime, with the paw. */

const C = [40, 40] as const;
const FR = 24, W = 4, H = 4, NT = 5;      // the funnel: five rings stand for the sixty-six
const LIP = 30;                           // the city's island
const P0 = 32, P1 = 41;                   // the plain's wedges
const BASIN_R = 6.5, BASIN = -24;         // the castle's pit at the bottom
const LAKE = -12, LAKE_R = 12;             // the water, over the two lowest rings
const deg = (a: number) => (a * Math.PI) / 180;
const at = (a: number, d: number): [number, number] => [Math.round(C[0] + Math.cos(deg(a)) * d), Math.round(C[1] + Math.sin(deg(a)) * d)];
const dist = (x: number, y: number) => Math.hypot(x - C[0], y - C[1]);
const angle = (x: number, y: number) => ((Math.atan2(y - C[1], x - C[0]) * 180) / Math.PI + 360) % 360;
const near = (a: number, b: number, w: number) => Math.abs(((a - b + 540) % 360) - 180) <= w;
const cell = (x: number, y: number, s: number) => { let h = ((x >> 1) * 73856093) ^ ((y >> 1) * 19349663) ^ s; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

const ringOf = (d: number) => (d >= FR ? 0 : Math.min(NT, Math.floor((FR - d) / W) + 1));
const floorAt = (x: number, y: number) => { const d = dist(x, y), t = ringOf(d); return !t ? 0 : d < BASIN_R ? BASIN : -H * t; };
const ringOuter = (t: number) => FR - (t - 1) * W;

/* Nine slices, numbered round the city; spot 1, the only mountain, on the left. */
const SPOT = (n: number) => (155 - (n - 1) * 40 + 360) % 360;
const SLICE_Z = [0, 4, 0, -4, -6, -2, 2, 4, 6, 4];          // each wedge's height, by spot: low at the front, rising to the back
const FALL = SPOT(1);                                       // the river comes over the lip from the mountain
const MT = at(SPOT(1), 36.5);
const FUPA = at(SPOT(3), 36);
const DS = 8;                                               // the Dream's slice, at the back
const DREAM = at(SPOT(DS) + 9, 36.5), BALL = at(SPOT(DS) - 6, 35);
const REAVER = at(SPOT(9), 36.5);
const NEST = at(15, 27);
const BASTIONS = [100, 200, 280, 345];
const onBastion = (x: number, y: number) => { const d = dist(x, y); return d > FR + 1.2 && d < LIP - 1 && BASTIONS.some(b => near(angle(x, y), b, 7)); };
const nearFall = (x: number, y: number, w = 1.6) => {
  const a = deg(FALL), dx = x - C[0], dy = y - C[1];
  return dx * Math.cos(a) + dy * Math.sin(a) > 0 && Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)) < w;
};
const sliceOf = (x: number, y: number) => { const a = angle(x, y); for (let n = 1; n <= 9; n++) if (near(a, SPOT(n), 20)) return n; return 1; };
const sliceZ = (x: number, y: number) => SLICE_Z[sliceOf(x, y)];
/* the crack of air between two wedges */
const onBorder = (x: number, y: number) => {
  for (let n = 1; n <= 9; n++) {
    const b = deg(SPOT(n) + 20), dx = x - C[0], dy = y - C[1];
    if (dx * Math.cos(b) + dy * Math.sin(b) > 0 && Math.abs(-dx * Math.sin(b) + dy * Math.cos(b)) < 1.6) return true;
  }
  return false;
};
const rim = (a: number) => P1 - (Math.floor(a / 9) % 4 === 0 ? 2 : Math.floor(a / 9) % 4 === 2 ? 1 : 0);
const inPlain = (x: number, y: number) => { const d = dist(x, y); return d >= P0 && d <= rim(angle(x, y)) && !onBorder(x, y); };
const lipEdge = (a: number) => LIP - (Math.floor(a / 14) % 3 === 0 ? 2 : 0);
/* The lip steps down a level at the front, so the eye gets over it into the funnel. */
const lipTop = (x: number, y: number) => { const a = angle((x & ~1) + 1, (y & ~1) + 1); return a >= 14 && a <= 78 ? -4 : 0; };

function build(shown: Set<string>): Vox {
  const v = new Vox();
  const has = (id: string) => shown.has(id);
  const T = (id: string) => { v.tag = id; return has(id); };
  const pit = has('pit');

  /* ---- the city's island: a stone lip with a ragged edge, grey cliffs over brown roots ---- */
  v.tag = '';
  slab(v, C[0] - LIP, C[1] - LIP, C[0] + LIP, C[1] + LIP, 0, { depth: 34, seed: 901, crust: 'stone',
    shape: (x, y) => dist(x, y) <= lipEdge(angle(x, y)),
    top: (x, y) => (cell(x, y, 1) < 0.3 ? 'stoneDark' : 'stone') });
  for (let x = C[0] - LIP; x <= C[0] + LIP; x++) for (let y = C[1] - LIP; y <= C[1] + LIP; y++)
    if (dist(x, y) >= FR && lipTop(x, y) < 0 && v.has(x, y, 0)) { const m = v.get(x, y, 0)!; v.chunk = 2; v.clear(x, y, -3, x, y, 0); v.set(x, y, -4, m); v.chunk = 1; }
  greyCliffs(v, 6);
  // a loose block of the lip drifting off the front, until the plain fills the air round the city
  if (!has('slices')) { const [x, y] = at(100, LIP + 4.5); slab(v, x - 3, y - 2, x + 2, y + 3, -5, { depth: 5, seed: 911, crust: 'stone', top: 'stone', under: ['stone', 'dirt'] }); v.set(x, y, -4, 'stone'); v.set(x - 1, y + 1, -4, 'woodDark'); }

  /* ---- the funnel: rings of pale paving on stone risers, mud low down, the pit at the bottom ---- */
  v.tag = 'funnel';
  v.chunk = 2;
  for (let x = C[0] - FR; x <= C[0] + FR; x++) for (let y = C[1] - FR; y <= C[1] + FR; y++) {
    const d = dist(x, y), t = ringOf(d); if (!t) continue;
    const f = floorAt(x, y);
    v.clear(x, y, f + 1, x, y, 0);
    for (let z = f - H - 2; z < f; z++) v.set(x, y, z, cell(x, y, z >> 1) < 0.35 ? 'stoneDark' : 'stone');
    const mud = t >= 4 || d < BASIN_R;
    v.set(x, y, f, pit ? 'stoneDark' : mud ? (cell(x, y, 7) < 0.4 ? 'dirt' : 'dirtDark') : cell(x, y, 3) < 0.25 ? 'stone' : 'tile');
  }
  v.chunk = 1;
  // a low parapet round the lip, broken where the water comes over
  for (let a = 0; a < 360; a += 1.2) {
    const [x, y] = at(a, FR + 0.6);
    if (nearFall(x, y, 2.2) || onBastion(x, y)) continue;
    if (Math.floor(a / 6) % 2 === 0) v.set(x, y, lipTop(x, y) + 1, 'stone');
  }
  // the bastions: raised blocks of the lip, in every state
  v.chunk = 2;
  for (let x = C[0] - LIP; x <= C[0] + LIP; x++) for (let y = C[1] - LIP; y <= C[1] + LIP; y++) if (onBastion(x, y) && v.has(x, y, 0)) v.box(x, y, 1, x, y, 2, cell(x, y, 5) < 0.3 ? 'stoneDark' : 'stone');
  v.chunk = 1;

  if (!pit) {
    city(v);
    // red banners down the island's face, the city's own
    for (const a of [8, 38, 62, 84]) hang(v, a, a > 45 ? 'x' : 'y');
  }

  /* ---- the rings: lit arches in the risers, and ramps from ring to ring ---- */
  if (T('rings') && !pit) {
    for (let x = C[0] - FR; x <= C[0] + FR; x++) for (let y = C[1] - FR; y <= C[1] + FR; y++) {
      const d = dist(x, y), t = ringOf(d); if (!t || t >= 4) continue;
      const inner = FR - t * W;                              // this ring's inner edge: its riser faces the next one down
      if (d > inner + 1) continue;
      const a = angle(x, y), k = Math.floor(a * (inner / 40));
      if (nearFall(x, y, 2.4)) continue;
      const z = floorAt(x, y) - 1;
      if (k % 4 === 0) v.box(x, y, z - 2, x, y, z - 1, 'window'); else if (k % 4 === 2) v.box(x, y, z - 2, x, y, z - 1, 'void');
    }
    for (let t = 1; t < NT; t++) for (const a0 of [40, 120, 230, 300]) {
      const a = a0 + t * 23, [x, y] = at(a, FR - t * W + 0.4);
      if (nearFall(x, y, 3)) continue;
      const f = floorAt(x, y);
      v.set(x, y, f + 1, 'tile'); const [x2, y2] = at(a, FR - t * W - 0.8); v.set(x2, y2, floorAt(x2, y2) + 1, 'tile');
    }
  }

  /* ---- the College of Magic: slender coloured towers on the far wall, like crystals ---- */
  if (T('college') && !pit) {
    const cols = ['white', 'glassTeal', 'pink', 'brick', 'purple', 'blue', 'white', 'red'];
    cols.forEach((m, i) => {
      const [x, y] = at(236 + i * 5, FR - 5.5 - (i % 3)), f = floorAt(x, y), top = f + 7 + ((i * 5) % 7);
      v.col(x, y, f + 1, top, m); v.set(x, y, top + 1, m === 'white' ? 'roofBlue' : 'white');
      if (i % 2 === 0) v.col(x + 1, y, f + 1, top - 3, m);
      if (m === 'white') for (let z = f + 2; z < top; z += 3) v.set(x, y + 1, z, 'leaf');
    });
  }

  /* ---- the jewelled towers on the bastions, and a few down the rings ---- */
  if (T('defense-towers') && !pit) {
    BASTIONS.forEach((b, i) => {
      const [x, y] = at(b, FR + 3); tower(v, x, y, 3, 9, i % 2 ? 'ember' : 'portal');
    });
    for (const a of [222, 245, 305, 168]) { const [x, y] = at(a, FR + 2.2); if (!nearFall(x, y, 3)) tower(v, x, y, 1, 6, 'ember'); }
    for (const [a, t] of [[262, 2], [300, 3], [180, 2]] as const) {
      const [x, y] = at(a, ringOuter(t) - 1.5); if (nearFall(x, y, 2.6)) continue;
      tower(v, x, y, floorAt(x, y) + 1, 7, 'ember');
    }
  }

  /* ---- the waterfall over the lip, stepping down the rings to the lake ---- */
  if (T('waterfall')) for (let x = C[0] - FR - 2; x <= C[0] + FR; x++) for (let y = C[1] - FR - 2; y <= C[1] + FR; y++) {
    if (!nearFall(x, y)) continue;
    const d = dist(x, y), t = ringOf(d); if (!t && d < LIP - 1) { if (d < FR + 1.5) v.set(x, y, 0, 'water'); continue; }
    if (!t || d < LAKE_R) continue;
    const f = floorAt(x, y);
    v.set(x, y, f, 'water');
    if (d > ringOuter(t) - 1.2) v.box(x, y, f + 1, x, y, f + H, (_x, _y, z) => (z === f + H ? 'white' : 'water'));
  }

  /* ---- the castle, under the lake: its highest tower just covered; jetties and lamps round the shore ---- */
  if (T('castle-sunken')) {
    castle(v, BASIN, false);
    v.chunk = 2;
    for (let x = C[0] - LAKE_R; x <= C[0] + LAKE_R; x++) for (let y = C[1] - LAKE_R; y <= C[1] + LAKE_R; y++) if (dist(x, y) < LAKE_R) {
      const f = floorAt(x, y); if (v.get(x, y, f) !== 'void') v.set(x, y, f, 'waterDeep');
      for (let z = f + 1; z < LAKE; z++) if (v.has(x, y, z) && v.get(x, y, z) !== 'white' && v.get(x, y, z) !== 'stone') v.set(x, y, z, 'waterDeep');
    }
    v.chunk = 1;
    for (let x = C[0] - LAKE_R; x <= C[0] + LAKE_R; x++) for (let y = C[1] - LAKE_R; y <= C[1] + LAKE_R; y++) if (dist(x, y) < LAKE_R) v.set(x, y, LAKE, 'glass');
    for (const a of [20, 80, 130, 210, 280, 330]) {
      for (let d = LAKE_R - 2.5; d <= LAKE_R + 0.5; d += 0.6) { const [x, y] = at(a, d); v.set(x, y, LAKE, 'wood'); }
      const [x, y] = at(a + 7, LAKE_R + 0.8); v.set(x, y, LAKE + 1, 'woodDark'); v.set(x, y, LAKE + 2, 'flame');
    }
  }
  /* ---- drained: the castle stands in its pit, the two lowest rings bare and wet ---- */
  if (T('castle')) {
    castle(v, BASIN, true);
    const r = rng(907);
    for (let i = 0; i < 26; i++) { const [x, y] = at(r() * 360, BASIN_R + r() * 5); if (!v.has(x, y, floorAt(x, y) + 1)) v.set(x, y, floorAt(x, y), 'slime'); }
  }

  /* ---- Shanty Town: hovels of wood and tin round the top of the city ---- */
  if (T('shanty-town')) {
    const r = rng(903);
    for (let a = 0; a < 360; a += 3.6) for (const dd of [FR + 3.2]) {
      const [x, y] = at(a + dd * 1.7, dd);
      const g = lipTop(x, y);
      if (nearFall(x, y, 2.4) || onBastion(x, y) || r() < 0.3 || !v.has(x, y, g) || v.has(x, y, g + 1)) continue;
      if (dist(x, y) > lipEdge(angle(x, y)) - 1) continue;
      v.set(x, y, g + 1, r() < 0.5 ? 'wood' : 'metal'); if (r() < 0.6) v.set(x, y, g + 2, r() < 0.5 ? 'woodDark' : 'metal');
      v.set(x, y, g + (r() < 0.6 ? 3 : 2), r() < 0.4 ? 'cloth' : r() < 0.5 ? 'metalDark' : 'roofRed');
      if (r() < 0.06) { v.set(x + 1, y, g + 1, 'flame'); }
    }
  }

  /* ---- the plain: nine wedges, each its own slice of ground ---- */
  if (T('slices')) {
    for (let n = 1; n <= 9; n++) {
      const z = SLICE_Z[n];
      slab(v, C[0] - P1, C[1] - P1, C[0] + P1, C[1] + P1, z, { depth: 9, seed: 950 + n, crust: 'stone',
        shape: (x, y) => inPlain(x, y) && sliceOf(x, y) === n,
        top: (x, y) => (cell(x, y, n) < 0.22 ? 'leafLight' : cell(x, y, n + 9) < 0.08 ? 'dirt' : 'grass') });
    }
    greyCliffs(v, 3, P0 - 1);
    // woods round the rim
    for (let a = 120; a < 340; a += 6.5) {
      const [x, y] = at(a, rim(a) - 1.8); if (!inPlain(x, y) || near(a, SPOT(1), 10) || near(a, SPOT(DS), 12)) continue;
      bush(v, x, y, sliceZ(x, y) + 1, 1 + (Math.floor(a) % 2), Math.floor(a / 6.5) % 3 ? 'leaf' : 'leafLight');
    }
  }

  /* ---- the King's Point: the one mountain, on spot 1 ---- */
  if (T('kings-point')) {
    const z0 = SLICE_Z[1], r = rng(908);
    v.chunk = 2;
    for (let z = 1; z <= 13; z++) disc(v, MT[0], MT[1], 6.6 - z * 0.45, 6 - z * 0.42, z0 + z, z0 + z, (x, y) => (cell(x, y, z >> 1) < 0.3 ? 'stoneDark' : 'stone'));
    v.chunk = 1;
    for (const [dx, dy] of [[5, 2], [-4, 4], [2, 5]]) v.set(MT[0] + dx, MT[1] + dy, z0 + 1, 'ember');
    v.box(MT[0] - 1, MT[1] - 1, z0 + 14, MT[0] + 1, MT[1] + 1, z0 + 15, 'stoneDark');
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) v.set(MT[0] + dx, MT[1] + dy, z0 + 16, 'stoneDark');
    void r;
  }
  /* ---- the river: off the mountain, across its wedge and the gap, over the lip ---- */
  if (T('river')) for (let d = FR + 0.5; d <= 33; d += 0.4) for (const w of [-0.6, 0.6]) {
    const [x, y] = at(FALL + (w * 40) / d, d);
    const z = d >= P0 ? SLICE_Z[1] : 0;
    if (d > LIP - 1 && d < P0) v.set(x, y, z - 1, 'stone');    // a stone sluice across the crack
    v.set(x, y, z, 'water'); v.clear(x, y, z + 1, x, y, z + 3);
  }
  if (T('river')) for (let d = 33; d <= 36; d += 0.4) { const [x, y] = at(FALL, d); v.set(x, y, SLICE_Z[1], 'water'); }

  /* ---- the FUPA: a stronghold on a hill round a bait shop by a lake, spot 3 ---- */
  if (T('fupa')) {
    const [x, y] = FUPA, z = SLICE_Z[3];
    v.chunk = 2; disc(v, x, y, 4.5, 4, z + 1, z + 2, 'grass'); v.chunk = 1;
    disc(v, x - 3, y + 5, 2.4, 1.8, z, z, 'water');
    v.box(x - 2, y - 2, z + 3, x + 2, y + 2, z + 4, 'stone');
    for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { v.col(x + dx, y + dy, z + 5, z + 6, 'stone'); v.set(x + dx, y + dy, z + 7, 'flame'); }
    v.box(x - 1, y + 2, z + 3, x, y + 2, z + 3, 'wood'); v.set(x - 1, y + 2, z + 4, 'roofRed'); v.set(x, y + 2, z + 4, 'roofRed');
    ring(v, x, y, 5.4, 1, z + 1, z + 3, (xx, yy, zz) => (zz === z + 3 && (xx + yy) % 2 ? null : (xx + yy) % 2 ? 'wood' : 'woodDark'));
    banner(v, x - 1, y + 6, z + 2, 3, { along: 'x', w: 3, cloth: 'pink', trim: 'accent' });
  }
  /* ---- trenches and no man's land on spot 3's borders ---- */
  if (T('trenches')) for (const side of [-1, 1]) for (let d = P0 + 1; d < P1 - 2; d++) {
    const a = SPOT(3) + side * (20 - (3.2 + (d % 3 === 0 ? 1.4 : 0)) * 40 / d);
    const [x, y] = at(a, d); if (!inPlain(x, y)) continue;
    const z = sliceZ(x, y);
    v.set(x, y, z, 'void');
    const [bx, by] = at(a - side * 2.4 * 40 / d, d); if (inPlain(bx, by) && d % 2) { v.set(bx, by, z + 1, 'woodDark'); }
  }
  if (T('camps')) { const r = rng(904); for (let i = 0; i < 26; i++) { const [x, y] = at(SPOT(2) - 12 + r() * 24, P0 + 2 + r() * 6); if (!inPlain(x, y)) continue; const z = sliceZ(x, y); v.set(x, y, z + 1, 'cloth'); if (r() < 0.5) v.set(x, y, z + 2, 'cloth'); if (i % 4 === 0) v.set(x + 1, y, z + 1, 'flame'); } }

  /* ---- every throne on the map: a keep in each slice, a red flag on it ---- */
  if (T('throne-rooms')) {
    for (const n of [2, 4, 5, 6, 7, 8, 9]) {
      const [x, y] = n === DS ? DREAM : n === 9 ? REAVER : at(SPOT(n), 36.5), z = SLICE_Z[n];
      if (n === DS && has('dream-ruin')) continue;
      if (n === 9) { if (has('reaver-blast')) continue; v.box(x - 2, y - 2, z + 1, x + 2, y + 1, z + 3, 'metalDark'); v.box(x - 1, y - 1, z + 4, x + 1, y, z + 4, 'stoneDark'); pin(v, x, y, z + 5); continue; }
      keep(v, x, y, z, n === DS ? 'white' : n % 2 ? 'stoneDark' : 'stone', n === DS);
      pin(v, x, y, z + (n === DS ? 10 : 7));
    }
    pin(v, MT[0], MT[1], SLICE_Z[1] + 17); pin(v, FUPA[0], FUPA[1], SLICE_Z[3] + 5);
  }

  /* ---- the Nest: the Posse's granite tower at the city's edge ---- */
  if (T('nest')) {
    const [x, y] = NEST;
    v.chunk = 2; v.box(x, y, -1, x + 1, y + 1, 22, (_x, _y, z) => ((z + 2) % 6 < 2 ? 'stoneDark' : 'stone')); v.chunk = 1;
    v.box(x - 1, y - 1, 23, x + 2, y + 2, 23, 'stone');
    for (const [dx, dy] of [[-1, -1], [2, -1], [-1, 2], [2, 2]]) v.set(x + dx, y + dy, 24, 'stone');
    v.set(x + 1, y + 2, 17, 'window'); v.set(x + 2, y + 1, 11, 'window');
  }

  /* ---- the war's later marks ---- */
  if (T('eruption')) {
    const z0 = SLICE_Z[1];
    disc(v, MT[0], MT[1], 1.6, 1.6, z0 + 17, z0 + 17, 'flame');
    for (let z = 13; z >= 1; z--) { const s = (13 - z) * 0.45; v.set(Math.round(MT[0] + 1 + s * 0.8), Math.round(MT[1] + s * 0.4), z0 + z, 'ember'); }
    if (has('river')) for (let d = FR + 0.5; d <= 36; d += 0.5) { const [x, y] = at(FALL, d); const z = d >= P0 ? SLICE_Z[1] : 0; v.set(x, y, z, 'ember'); }
  }
  if (T('dream-ruin')) { const [x, y] = DREAM, z = SLICE_Z[DS]; const r = rng(905); for (let i = 0; i < 22; i++) v.col(x - 3 + Math.floor(r() * 7), y - 3 + Math.floor(r() * 7), z + 1, z + 1 + Math.floor(r() * 3), r() < 0.6 ? 'white' : 'stone'); }
  if (T('the-ball')) {
    const [bx, by] = BALL, z = SLICE_Z[DS], R = 6, cz = z + 1 + R;
    for (let x = bx - 7; x <= bx + 7; x++) for (let y = by - 7; y <= by + 7; y++) for (let zz = z + 1; zz <= z + 14; zz++)
      if (Math.hypot(x - bx, y - by, zz - cz) <= R) v.set(x, y, zz, ['red', 'blue', 'plaster', 'redDark', 'slime', 'dirt', 'purple', 'white'][(x * 3 + y * 5 + zz * 2) % 8]);
  }
  if (T('lava-city')) for (let x = C[0] - FR - 2; x <= C[0] + FR; x++) for (let y = C[1] - FR - 2; y <= C[1] + FR; y++) {
    if (!nearFall(x, y, 2.4)) continue;
    const d = dist(x, y), t = ringOf(d); if (!t || t > 3) { if (!t && d < FR + 1.5) v.set(x, y, 0, 'ember'); continue; }
    const f = floorAt(x, y);
    v.set(x, y, f, 'ember'); if (d > ringOuter(t) - 1.2) v.box(x, y, f + 1, x, y, f + H, (_x, _y, z) => (z === f + H ? 'flame' : 'ember'));
  }
  if (T('reaver-blast')) { const [x, y] = REAVER, z = SLICE_Z[9]; v.box(x - 2, y - 2, z + 1, x + 2, y + 1, z + 1, 'stoneDark'); for (let k = 2; k <= 16; k++) disc(v, x, y, 1 + k / 5, 1 + k / 5, z + k, z + k, k < 9 ? (k % 2 ? 'flame' : 'ember') : 'stoneDark'); }
  if (T('pit')) {
    // the city carried off: bare rings, a bed of dead roots where the castle stood, the hole under it
    const r = rng(906);
    disc(v, C[0], C[1], BASIN_R - 0.5, BASIN_R - 0.5, BASIN + 1, BASIN + 1, (x, y) => ((x + y) % 3 === 0 || (x - y) % 4 === 0 ? (r() < 0.5 ? 'woodDark' : 'stoneDark') : null));
    disc(v, C[0], C[1], 1.8, 1.8, BASIN - 1, BASIN + 1, 'void');
    for (const a of [20, 110, 200, 290]) { const [x, y] = at(a, BASIN_R + 0.6); v.box(x, y, -9, x, y, -8, 'stone'); v.set(x, y, -9, 'void'); }
    for (const [a, d] of [[230, 14], [320, 11], [170, 17], [60, 19]]) { const [x, y] = at(a, d); v.set(x, y, floorAt(x, y) + 1, 'woodDark'); }
  }
  // Carl and Donut, face-first in the mud low in the funnel, between two crumbling blocks, a dead shark in the corner
  if (T('crawlers')) {
    const [x, y] = at(228, ringOuter(4) - 2), z = floorAt(x, y);
    mudAlley(v, x, y, z);
    v.sprite(x, y, z + 1, CARL, PALETTE); v.sprite(x + 2, y, z + 1, DONUT, PALETTE);
  }

  /* The hero picture only: the War Crime (7:77). From the top of the Nest,
     Donut brings a spectral paw the size of a district down on the ball of
     enemies, and the ball burns. */
  if (has('hero')) {
    v.tag = 'the-ball';
    const [bx, by] = BALL, z = SLICE_Z[DS];
    const r = rng(909);
    for (let i = 0; i < 34; i++) { const a = r() * Math.PI * 2, e = r() * 1.2; v.set(Math.round(bx + Math.cos(a) * 6.6 * Math.cos(e)), Math.round(by + Math.sin(a) * 6.6 * Math.cos(e)), Math.round(z + 7 + 6.6 * Math.sin(e)), 'flame'); }
    paw(v, bx, by, z + 19);
    v.tag = 'nest';
    v.sprite(NEST[0], NEST[1], 24, DONUT, PALETTE);
    // Lucia's net over the top of the tower
    for (const [dx, dy] of [[-1, 0], [0, -1], [2, 1], [1, 2], [0, 2], [2, 0]]) v.set(NEST[0] + dx, NEST[1] + dy, 25, 'rail');
  }
  return v;
}

/* The city itself: on every ring, a row of small houses along its drop, the
   riser under them arched and lit, a walk behind them, plaster and stone under red and slate roofs, a lamp in the window
   that faces the middle, a tree here and there. The two lowest rings are mud. */
function city(v: Vox) {
  v.tag = 'funnel';
  for (let t = 1; t <= 3; t++) {
    const ro = FR - t * W + 1.6, step = 2.75 / ro;
    for (let a = (t * 0.41) % step, i = 0; a < Math.PI * 2; a += step, i++) {
      const x = Math.round(C[0] + Math.cos(a) * ro - 0.5), y = Math.round(C[1] + Math.sin(a) * ro - 0.5);
      const cells: [number, number][] = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
      if (cells.some(([cx, cy]) => ringOf(dist(cx, cy)) !== t || nearFall(cx, cy, 2.4))) continue;
      const f = floorAt(x, y);
      if (cells.some(([cx, cy]) => v.has(cx, cy, f + 1))) continue;
      const hr = rng(9000 + t * 977 + i * 31);
      if (hr() < 0.12) { v.set(x, y, f + 1, 'leaf'); v.set(x, y, f + 2, 'leafLight'); continue; }
      const tall = false, roof = hr() < 0.68 ? 'roofRed' : 'roofBlue', wallM = hr() < 0.78 ? 'plaster' : 'stone';
      const top = f + (tall ? 3 : 2);
      v.box(x, y, f + 1, x + 1, y + 1, top, wallM);
      v.box(x, y, top + 1, x + 1, y + 1, top + 1, roof);
      // the ridge runs along the ring
      const along = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? 'y' : 'x';
      if (hr() < 0.5) { if (along === 'y') v.box(x, y, top + 2, x, y + 1, top + 2, roof); else v.box(x, y, top + 2, x + 1, y, top + 2, roof); }
      // the lamp in the window that looks at the middle
      const ix = Math.cos(a) > 0.35 ? x : x + 1, iy = Math.sin(a) > 0.35 ? y : y + 1;
      if (hr() < 0.8) v.set(ix, iy, f + 1 + (tall && hr() < 0.5 ? 1 : 0), 'window');
    }
  }
  // the mud of the lowest rings: tumbled blocks, the odd post
  const r = rng(9200);
  for (let i = 0; i < 30; i++) {
    const [x, y] = at(r() * 360, BASIN_R + 1 + r() * (LAKE_R - BASIN_R - 2));
    const f = floorAt(x, y); if (nearFall(x, y, 2) || v.has(x, y, f + 1)) continue;
    v.set(x, y, f + 1, r() < 0.6 ? 'stone' : 'woodDark'); if (r() < 0.3) v.set(x, y, f + 2, 'stone');
  }
}

/** A banner hung down the island's own face at angle `a`, on the face that looks at the viewer. */
function hang(v: Vox, a: number, along: 'x' | 'y') {
  const [x, y] = at(a, LIP - 3), g = lipTop(x, y);
  if (along === 'x') { let yy = y; while (v.has(x, yy + 1, g) || v.has(x + 3, yy + 1, g)) yy++; banner(v, x, yy + 1, g - 1, 7, { along, w: 4, cloth: 'red', trim: 'redDark', emblem: 'brick' }); }
  else { let xx = x; while (v.has(xx + 1, y, g) || v.has(xx + 1, y + 3, g)) xx++; banner(v, xx + 1, y, g - 1, 7, { along, w: 4, cloth: 'red', trim: 'redDark', emblem: 'brick' }); }
}

/** Grey stone cliffs down an island's sides, the brown roots only below them. */
function greyCliffs(v: Vox, deep: number, minD = 0) {
  v.chunk = 2;
  for (const { p: [x, y, z], mat, tag } of v.all()) {
    if (z >= 0 || z < -deep - 6 || (mat !== 'dirt' && mat !== 'dirtDark')) continue;
    if (minD && dist(x, y) < minD) continue;
    if (z < -deep && cell(x, y, 11) < 0.5) continue;
    v.tag = tag; v.set(x, y, z, cell(x, y, z >> 1) < 0.3 ? 'stoneDark' : 'stone');
  }
  v.chunk = 1;
}

/** A small tree: a trunk and a 3x3 crown, so a wood reads as trees and not as a hedge. */
function bush(v: Vox, x: number, y: number, z: number, h: number, leaf: string) {
  v.col(x, y, z, z + h - 1, 'woodDark');
  v.box(x - 1, y - 1, z + h, x + 1, y + 1, z + h + 1, (xx, yy, zz) => (zz === z + h + 1 && (xx !== x && yy !== y) ? null : zz === z + h + 1 ? 'leafLight' : leaf));
}

/** A jewelled tower: a 2x2 stone shaft, a dark cap, a burning jewel on top. */
function tower(v: Vox, x: number, y: number, z: number, h: number, jewel: string) {
  v.chunk = 2; v.box(x, y, z, x + 1, y + 1, z + h - 1, 'stone'); v.chunk = 1;
  v.box(x, y, z + h, x + 1, y + 1, z + h, 'stoneDark');
  for (const [dx, dy] of [[0, 0], [1, 1]]) v.set(x + dx, y + dy, z + h + 1, 'stoneDark');
  v.set(x + 1, y, z + h + 1, jewel); v.set(x + 1, y, z + h + 2, 'flame');
  v.set(x + 1, y + 1, z + h - 3, 'window');
}

/** The castle of Larracos in its pit: white walls, four towers, a keep and its spire, teal caps, gate lit. */
function castle(v: Vox, z0: number, standing: boolean) {
  const cap = standing ? 'accent' : 'stone';
  const [cx, cy] = C;
  ring(v, cx, cy, 5.4, 1.2, z0 + 1, z0 + 4, (x, y, z) => (z === z0 + 4 && (x + y) % 2 ? null : 'white'));
  for (const [dx, dy, h] of [[-4, -4, 7], [4, -4, 6], [-4, 4, 6], [4, 4, 5]] as const) {
    v.box(cx + dx - (dx < 0 ? 0 : 1), cy + dy - (dy < 0 ? 0 : 1), z0 + 1, cx + dx + (dx < 0 ? 1 : 0), cy + dy + (dy < 0 ? 1 : 0), z0 + h, 'white');
    v.set(cx + dx, cy + dy, z0 + h + 1, cap);
  }
  v.box(cx - 2, cy - 2, z0 + 1, cx + 1, cy + 1, z0 + 6, 'white');
  v.box(cx - 2, cy - 2, z0 + 7, cx + 1, cy + 1, z0 + 7, cap);
  v.box(cx - 1, cy - 1, z0 + 8, cx, cy, z0 + 7 + (LAKE - z0 - 8), 'white');
  v.set(cx - 1, cy - 1, LAKE - 1, cap);
  for (const [x, y, z] of [[cx + 1, cy - 1, z0 + 4], [cx - 1, cy + 1, z0 + 4], [cx + 1, cy, z0 + 2], [cx, cy + 1, z0 + 2]]) v.set(x, y, z, 'window');
  v.set(cx, cy + 5, z0 + 1, 'void'); v.set(cx, cy + 5, z0 + 2, 'void');
}

function keep(v: Vox, x: number, y: number, z: number, mat: string, big = false) {
  const s = big ? 2 : 1, h = big ? 6 : 3;
  v.chunk = 2; v.box(x - s, y - s, z + 1, x + s, y + s, z + h, mat); v.chunk = 1;
  for (const [dx, dy] of [[-s, -s], [s, -s], [-s, s], [s, s]]) { v.col(x + dx, y + dy, z + h + 1, z + h + (big ? 3 : 1), mat); if (big) v.set(x + dx, y + dy, z + h + 4, 'accent'); }
  v.set(x, y + s, z + 1, 'void'); v.set(x + s, y, z + 2, 'window');
}
const pin = (v: Vox, x: number, y: number, z: number) => { v.set(x, y, z, 'metal'); v.col(x, y, z + 1, z + 2, 'red'); };

/** The muddy alley the crawlers land in: mud, two crumbling stone blocks, a dead shark curled in the corner. */
function mudAlley(v: Vox, x: number, y: number, z: number) {
  v.box(x - 1, y - 1, z, x + 3, y + 1, z, (xx, yy) => ((xx + yy) % 3 ? 'dirtDark' : 'dirt'));
  v.box(x - 2, y - 2, z + 1, x - 1, y + 1, z + 3, (xx, yy, zz) => (zz === z + 3 && (xx + yy) % 2 ? null : 'stone'));
  v.box(x + 4, y - 2, z + 1, x + 5, y + 1, z + 2, (xx, _yy, zz) => (zz === z + 2 && xx === x + 5 ? null : 'stone'));
  v.set(x + 3, y - 1, z + 1, 'metal'); v.set(x + 2, y - 1, z + 1, 'metal'); v.set(x + 3, y, z + 1, 'metalDark');
}

/** The spectral paw, coming down: a broad pad, four toes on its leading edge
    with the claws out, the leg rising out of the sky behind it, banded where
    the spell glows through. */
function paw(v: Vox, x: number, y: number, z: number) {
  const ell = (cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, m: string) => {
    for (let a = Math.floor(cx - rx); a <= cx + rx; a++) for (let b = Math.floor(cy - ry); b <= cy + ry; b++) for (let c = Math.floor(cz - rz); c <= cz + rz; c++)
      if (((a - cx) / rx) ** 2 + ((b - cy) / ry) ** 2 + ((c - cz) / rz) ** 2 <= 1) v.set(a, b, c, m);
  };
  // the leg, in from the sky on the right, fading to glass as it goes
  for (let k = 0; k <= 22; k++) { const r = k < 4 ? 3.8 : 4.9 - k * 0.05; ell(x + 1.5 + k * 0.85, y - 1.5 - k * 0.85, z + 2 + k * 0.75, r, r, 1.5, k < 9 ? 'glassTeal' : 'glass'); }
  ell(x, y, z, 7.2, 7.2, 2.4, 'glassTeal');
  ell(x - 0.8, y + 0.8, z - 2.2, 3.4, 3.4, 0.9, 'pink');
  // the toes along the leading edge, to the left, claws hooked down
  for (const t of [-62, -21, 21, 62]) {
    const a = ((135 + t) * Math.PI) / 180, tx = x + Math.cos(a) * 8, ty = y + Math.sin(a) * 8;
    ell(tx, ty, z + 0.8, 2.9, 2.9, 2.8, 'accent');
    v.set(Math.round(tx), Math.round(ty), Math.round(z + 3.4), 'accentGlow');
    ell(tx, ty, z - 2.4, 1.3, 1.3, 0.6, 'pink');
    for (let k = 0; k <= 2; k++) v.set(Math.round(x + Math.cos(a) * (10 + k * 0.7)), Math.round(y + Math.sin(a) * (10 + k * 0.7)), Math.round(z - 1 - k * 1.3), 'white');
  }
}

const anchors: VoxelMap['anchors'] = {
  funnel: [...at(60, 13), -6] as [number, number, number], rings: [...at(250, 17), -3] as [number, number, number],
  college: [...at(250, FR - 6), 8] as [number, number, number], 'defense-towers': [...at(BASTIONS[2], FR + 3), 13] as [number, number, number],
  waterfall: [...at(FALL, 16), -3] as [number, number, number], 'castle-sunken': [C[0], C[1], LAKE], castle: [C[0], C[1], LAKE + 1],
  'shanty-town': [...at(120, FR + 3), 2] as [number, number, number], slices: [...at(SPOT(5), 37), SLICE_Z[5]] as [number, number, number],
  'kings-point': [MT[0], MT[1], SLICE_Z[1] + 16], river: [...at(FALL, 31), 0] as [number, number, number], fupa: [FUPA[0], FUPA[1], SLICE_Z[3] + 7],
  trenches: [...at(SPOT(3) - 16, 37), SLICE_Z[3]] as [number, number, number], camps: [...at(SPOT(2), 35), SLICE_Z[2] + 2] as [number, number, number],
  'throne-rooms': [...at(SPOT(6), 36.5), SLICE_Z[6] + 9] as [number, number, number], nest: [NEST[0], NEST[1], 24],
  eruption: [MT[0], MT[1], SLICE_Z[1] + 17], 'dream-ruin': [DREAM[0], DREAM[1], SLICE_Z[DS] + 2], 'the-ball': [BALL[0], BALL[1], SLICE_Z[DS] + 13],
  'lava-city': [...at(FALL, 20), -1] as [number, number, number], crawlers: [...at(228, ringOuter(4) - 2), -H * 4 + 4] as [number, number, number],
  'reaver-blast': [REAVER[0], REAVER[1], SLICE_Z[9] + 16], pit: [C[0], C[1], BASIN + 1],
};

export const FLOOR_9_VOXEL: VoxelMap = { build, anchors };
export const buildFloor9 = build;

/** The tile: the city as it stands when its picture opens (7:9), on its own
    island, before the plain is drawn round it. */
export const TILE_9_LAYERS = ['funnel', 'rings', 'college', 'defense-towers', 'waterfall', 'castle-sunken', 'shanty-town'];
/** The hero picture, once the floor is finished: the War Crime. The ball of
    enemies beside the Dream's ruin, the castle drained, the mountain burning,
    and from the top of the Nest the paw coming down. */
export const HERO_9_LAYERS = ['funnel', 'rings', 'college', 'defense-towers', 'castle', 'shanty-town', 'slices', 'kings-point', 'river', 'fupa',
  'trenches', 'throne-rooms', 'nest', 'eruption', 'dream-ruin', 'the-ball', 'lava-city', 'hero'];
