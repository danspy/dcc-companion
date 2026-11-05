import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { lathe, chamfer } from './itemparts.ts';
import { scroll, tome, table } from './itemforms.ts';

/* ---- items, batch b1c ----
   Drawn like the anchor set in items.ts: one object, floating, three-quarter
   view, smooth (chunk 0), facing +y (the lit left face), z up. Each look from
   the edition's own words at its point; a colour the book leaves unsaid is a
   plain one. Shapes and colours only. */

const fresh = () => { const v = new Vox(); v.chunk = 0; return v; };

/** a straight bar of voxels from one point to another, stepped along its longest axis */
function bar(v: Vox, a: [number, number, number], b: [number, number, number], m: string) {
  const n = Math.max(...a.map((p, i) => Math.abs(b[i] - p)));
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0;
    v.set(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), m);
  }
}

/** a cross-section standing in the x-z plane at y: a rounded square of half-width r round (cx, cz), which may sit between voxels */
function section(v: Vox, y: number, cx: number, cz: number, r: number, m: string) {
  for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
    const dx = Math.abs(x - cx), dz = Math.abs(z - cz);
    if (dx <= r && dz <= r && dx + dz <= r * 1.5) v.set(x, y, z, m);
  }
}

/* 1:5 "It was literally a fireplace poker. A wrought iron stick with a
   screw-on point at the end." Nothing else is said, so it is the plain thing:
   a dark iron rod, a ring handle at its back end, a threaded collar where the
   point screws on, the point to the front (+y). It lies along y, like a blade. */
function poker(): Vox {
  const v = fresh();
  const iron = '#4a4d55', thread = '#2f3137', bright = '#6c717a';
  const L = 12;
  for (let y = 0; y <= L; y++) section(v, y, 4.5, 0.5, 1, iron);            // the rod
  // the ring handle, flat, round the rod's back end
  for (let x = 0; x <= 9; x++) for (let y = -7; y <= 0; y++) {
    const d = Math.hypot(x - 4.5, y + 3.3);
    if (d <= 3.9 && d >= 2.2) v.box(x, y, 0, x, y, 1, iron);
  }
  // the screw-on point: a collar, its threads in rings, then the taper
  for (let y = L + 1; y <= L + 3; y++) section(v, y, 4.5, 0.5, 1.5, (y - L) % 2 ? iron : thread);
  for (let y = L + 4; y <= L + 5; y++) section(v, y, 4.5, 0.5, 1, iron);
  v.box(4, L + 6, 0, 5, L + 6, 1, bright); v.box(4, L + 7, 0, 4, L + 7, 1, bright);
  v.set(4, L + 8, 1, bright);
  return v;
}

/* 1:5 "The 'toad cudgel' was a stick. It looked like a 3/4's length baseball
   bat shaped by someone who only had a vague idea of what baseball was." 1:10
   "The rounded edge of my weapon". A plain wooden stick, a crude knob, a thin
   grip swelling unevenly into a lumpy, round-ended barrel at the front (+y). */
function toadCudgel(): Vox {
  const v = fresh();
  const wood = '#8a5a32', knot = '#6b4325', grip = twin('#8a5a32');
  section(v, -1, 4.5, 2.5, 1.5, grip);                                  // the knob
  for (let y = 0; y <= 6; y++) section(v, y, 4.5, 2.5, 1, grip);       // the grip
  for (let y = 7; y <= 9; y++) section(v, y, 4.5, 2.5, 1.5, wood);
  for (let y = 10; y <= 12; y++) section(v, y, 4.5, 3, 2, wood);        // off true: it bulges up here
  for (let y = 13; y <= 17; y++) section(v, y, y < 15 ? 4 : 5, 3, 2.5, wood);   // and kinks sideways here
  section(v, 18, 5, 3, 2, wood);
  section(v, 19, 5, 3, 1.2, wood);                                       // the rounded end
  // knots in the grain where it was shaped badly
  for (const [x, y, z] of [[2, 14, 3], [7, 16, 4], [5, 11, 5], [6, 13, 5], [3, 17, 1]] as const) if (v.has(x, y, z)) v.set(x, y, z, knot);
  return v;
}

/* 1:41 "each one was nothing more than a tiny black box the size of a dime
   with a long length of wire attached." A small flat black box, the wire (its
   colour never given, a plain grey) trailing off it in loose loops. */
function proximityTrigger(): Vox {
  const v = fresh();
  const black = '#2c2c33', lid = '#3a3a43', wire = '#9aa0a8';
  chamfer(v, 0, 3, 0, 7, 10, 2, 1, black);
  chamfer(v, 1, 4, 3, 6, 9, 3, 1, lid);
  // the wire, out of its right side, looping away and up
  const path: [number, number, number][] = [[8, 6, 1], [10, 6, 1], [12, 5, 2], [13, 3, 3], [13, 1, 5], [12, 0, 6], [10, 0, 7], [9, 1, 8], [9, 3, 9], [10, 4, 10], [12, 4, 11], [13, 2, 12], [13, 0, 13]];
  for (let i = 1; i < path.length; i++) { bar(v, path[i - 1], path[i], wire); bar(v, [path[i - 1][0], path[i - 1][1], path[i - 1][2] + 1], [path[i][0], path[i][1], path[i][2] + 1], wire); }
  return v;
}

/* 1:41 "A Sapper's table ... It was a table just like my engineering and
   alchemy table." Nothing more is said of it, so it is the plain crafting
   table. 5:32 the training copy is "identical to my own, though less
   scorched", and "didn't come away sticky": Carl's own is scorched, and tacky
   with the residue of a disco ball he set off. */
function sappersTable(scorched: boolean): Vox {
  const v = table();
  if (!scorched) return v;
  const char = '#2b211b', burnt = '#55361f', tack = '#6a4a2e';
  // scorch marks: black at the heart of each burn, brown round its edge, running over the front
  const burn = (cx: number, cy: number, r: number) => {
    for (let x = 0; x <= 15; x++) for (let y = 0; y <= 9; y++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.3) + ((x * 5 + y * 3) % 3) * 0.3;
      if (d <= r) v.set(x, y, 7, d <= r * 0.55 ? char : burnt);
    }
    for (let x = Math.ceil(cx - r); x <= cx + r; x++) if (cy + r / 1.3 >= 9 && Math.abs(x - cx) <= r * 0.6) v.set(x, 9, 6, Math.abs(x - cx) <= r * 0.3 ? char : burnt);
  };
  burn(4, 7, 3.4); burn(12, 3, 2.6);
  // the sticky residue, a dull tacky film over a stretch of the top
  for (const [x, y] of [[8, 2], [9, 2], [9, 3], [10, 3], [8, 3], [7, 6], [8, 6], [8, 7], [9, 7]] as const) v.set(x, y, 7, tack);
  return v;
}

/* 1:26 "the angled, four-foot-high structure looked like a lopsided tortoise
   shell": goblin workshop tables "of thick, hefty steel" laid on their sides
   at a low angle, "weight benches onto the sides of the tables, like attaching
   shutters", a roof "made of the cross bars of weight racks", and "the wide
   table we used for the front ... had a pitted wooden covering" with "black
   spikes" of thrown shuriken in it. The forward section is wider, at "a more
   gradual angle". A chibi of itself, the front to +y. Colours unsaid stay
   plain: grey steel, a plain dark bench, plain wood. */
function speedbump(): Vox {
  const v = fresh();
  const steel = '#7c858e', steelLow = '#69717a', bench = '#3b3f46', wood = '#8a5a32', pit = '#64401f', spike = '#1b1714', rack = '#959ca5', dark = '#24262a';
  const X = 15, Y = 16, TOP = 6;
  // a heightfield: each column rises to where the first of four slopes caps it
  const slopes = (x: number, y: number) => ({
    front: Math.floor((Y - y) * 0.7),                    // the wide front, a long low ramp
    side: Math.floor(Math.min(x, X - x) * 1.6) + 1,      // the tables on the sides, steeper
    back: Math.floor(y * 1.8) + 1,                       // and the back, steepest: lopsided
    top: TOP,
  });
  for (let x = 0; x <= X; x++) for (let y = 0; y <= Y; y++) {
    if (Math.min(x, X - x) + Math.min(y, Y - y) < 2) continue;   // the corners rounded off
    const s = slopes(x, y), h = Math.min(s.front, s.side, s.back, s.top);
    if (h < 0) continue;
    const region = h === s.top ? 'top' : h === s.front ? 'front' : h === s.side ? 'side' : 'back';
    // the benches, bolted along the seams where the front ramp meets the side tables
    const seam = region !== 'top' && Math.abs(s.front - s.side) <= 0 && y > Y / 2;
    for (let z = 0; z <= h; z++) {
      let m: string;
      if (seam) m = bench;
      else if (region === 'front') m = (x * 7 + y * 3) % 6 === 0 ? pit : wood;
      else if (region === 'top') m = z < h ? dark : x % 3 === 1 || y % 3 === 1 ? rack : dark;   // the rack bars' lattice, dark between
      else m = Math.floor((region === 'side' ? y : x) / 4) % 2 ? steel : steelLow;            // each table its own tone
      v.set(x, y, z, m);
    }
    // black shuriken driven into the wooden front, their points standing out of it
    if (region === 'front' && !seam && (x * 5 + y * 11) % 13 === 0 && x > 2 && x < X - 2) v.set(x, y, h + 1, spike);
  }
  return v;
}
/* 2:8 "I started pulling the last of the redoubt pieces from my inventory. I
   had multiple pieces of wood and metal ... an ugly, quick and dirty shelter
   ... like a pyramid": "the neck-high, haphazard pyramid", with "the jagged
   hole in the top". Panels of wood and steel leaned together, off true. */
function speedbumpPyramid(): Vox {
  const v = fresh();
  const steel = '#7c858e', steelLow = '#69717a', wood = '#8a5a32', woodLow = '#6e4527', dark = '#1e1f23';
  const N = 13, H = 12;
  for (let z = 0; z <= H; z++) {
    const r = (N / 2) * (1 - z / (H + 1.5));
    const c = N / 2 + (z > 6 ? 0.5 : 0);              // it leans a little
    for (let x = 0; x <= N; x++) for (let y = 0; y <= N; y++) {
      const dx = Math.abs(x - c), dy = Math.abs(y - N / 2);
      if (Math.max(dx, dy) > r) continue;
      const shell = Math.max(dx, dy) > r - 1.2;
      if (!shell) { v.set(x, y, z, dark); continue; }
      // which piece: panels in bands, wood and steel, each face its own patchwork
      const face = dx >= dy ? (x > c ? 0 : 1) : (y > N / 2 ? 2 : 3);
      const band = Math.floor((z + (face === 2 ? (x > 6 ? 2 : 0) : face === 1 ? 1 : (y > 7 ? 3 : 0))) / 3) + face;
      const m = band % 2 ? (z % 3 === 2 ? woodLow : wood) : (z % 3 === 2 ? steelLow : steel);
      v.set(x, y, z, m);
    }
  }
  // the jagged hole in the top, opening onto the dark inside
  v.clear(5, 5, 9, 8, 8, H);
  for (const [x, y, z] of [[5, 5, 9], [8, 5, 10], [6, 8, 9], [8, 8, 9]] as const) v.set(x, y, z, steel);
  v.box(6, 6, 7, 7, 7, 8, dark);
  // a plank's end poking out of it, off true
  v.box(13, 9, 3, 14, 9, 3, wood); v.box(9, 13, 1, 10, 14, 1, woodLow);
  return v;
}

/* 3:1 "Each of them were tiny cubes about the size of a pair of dice." Nothing
   else: a small rounded cube in a plain grey. */
function alarmCube(): Vox {
  const v = fresh();
  const grey = '#8c939b';
  chamfer(v, 1, 1, 0, 7, 7, 0, 1, grey);
  chamfer(v, 0, 0, 1, 8, 8, 7, 1, grey);
  chamfer(v, 1, 1, 8, 7, 7, 8, 1, grey);
  return v;
}
/* 4:22 "a hollow banger sphere with an impact-detonated alarm trap inside of
   it", "the alarm module had been sealed inside a metal ball": a banger sphere
   is one of Carl's baseball-sized balls of dwarven robot scrap metal (3:16).
   A plain grey metal ball, the seam where it was sealed round its middle. */
function alarmBall(): Vox {
  const v = fresh();
  const metal = '#7c858e', seam = '#69717a', shine = '#b3b7bd';
  // chamfered layers, narrowing a step at a time above and below the middle, so it reads round
  chamfer(v, 3, 3, 0, 7, 7, 0, 2, metal);
  chamfer(v, 1, 1, 1, 9, 9, 1, 4, metal);
  chamfer(v, 0, 0, 2, 10, 10, 2, 4, metal);
  chamfer(v, 0, 0, 3, 10, 10, 6, 3, metal);
  chamfer(v, 0, 0, 7, 10, 10, 7, 4, metal);
  chamfer(v, 1, 1, 8, 9, 9, 8, 4, metal);
  chamfer(v, 3, 3, 9, 7, 7, 9, 2, metal);
  // the seam it was sealed along, round its middle
  for (let x = 0; x <= 10; x++) for (let y = 0; y <= 10; y++) if (v.has(x, y, 5) && (!v.has(x + 1, y, 5) || !v.has(x, y + 1, 5) || !v.has(x - 1, y, 5) || !v.has(x, y - 1, 5))) v.set(x, y, 5, seam);
  // one catch of light on its upper left
  for (const [x, z] of [[2, 7], [3, 7], [2, 8], [3, 6]] as const) for (let y = 10; y >= 0; y--) if (v.has(x, y, z)) { v.set(x, y, z, shine); break; }
  return v;
}

/* 1:9 "The charm was a little silver butterfly ... It even had a little ring
   on it so it'd easily attach to her collar." Standing face on to +y, its
   wings open, the body proud of them, the ring over its head. */
const BUTTERFLY = [
  '.###.........###.',
  '#####.......#####',
  '######.....######',
  '.######...######.',
  '..######.######..',
  '...#####.#####...',
  '....####.####....',
  '...#####.#####...',
  '..######.######..',
  '..#####...#####..',
  '...###.....###...',
];
function butterflyCharm(): Vox {
  const v = fresh();
  const silver = '#a3aab4', rim = '#d3d7dd', inner = '#7f8792', body = '#8e959f';
  const H = BUTTERFLY.length;
  const on = (i: number, j: number) => j >= 0 && j < H && BUTTERFLY[j]?.[i] === '#';
  BUTTERFLY.forEach((row, j) => [...row].forEach((c, i) => {
    if (c !== '#') return;
    const edge = !on(i + 1, j) || !on(i - 1, j) || !on(i, j + 1) || !on(i, j - 1);
    const z = H - 1 - j;
    // a raised silver rim round each wing, the wing recessed inside it
    v.set(i, 0, z, twin(silver)); v.set(i, 1, z, edge ? rim : inner);
  }));
  // the body down the middle, proud of the wings, its head at the top
  v.box(8, 0, 0, 8, 2, 9, body);
  v.box(7, 1, 9, 9, 2, 10, body);
  // the antennae, and the little ring over the head
  v.set(6, 2, 11, rim); v.set(5, 2, 12, rim); v.set(10, 2, 11, rim); v.set(11, 2, 12, rim);
  for (const [x, z] of [[7, 12], [9, 12], [7, 13], [9, 13], [7, 14], [8, 14], [9, 14], [8, 11]] as const) v.set(x, 2, z, silver);
  return v;
}

/* ---- the chain ----
   1:37 "attached to one another by a set of glowing metal chains", one chain
   "about 300 feet long". A link is a little ring standing face on, each joined
   to the next by a link seen edge on. The glow's colour is never given, so it
   is the warm enchanted glow the site gives any magic thing that glows. */
function chainAlong(v: Vox, pts: [number, number, number][], metal: string, flat = false) {
  // walk the polyline, dropping a ring every three steps and an edge-on link between
  const path: [number, number, number][] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], n = Math.max(...a.map((p, k) => Math.abs(b[k] - p)));
    for (let s = i === 1 ? 0 : 1; s <= n; s++) path.push([0, 1, 2].map(k => Math.round(a[k] + ((b[k] - a[k]) * s) / n)) as [number, number, number]);
  }
  path.forEach(([x, y, z], i) => {
    if (i % 3 === 0) {
      // a ring, three by three with its hole: face on in the x-z plane, or lying flat
      for (let p = -1; p <= 1; p++) for (let q = -1; q <= 1; q++) if (p || q) flat ? v.set(x + p, y + q, z, metal) : v.set(x + p, y, z + q, metal);
      v.set(x, y, z, null);
    } else if (i % 3 === 2 || i % 3 === 1) {
      if (!v.has(x, y, z)) v.set(x, y, z, 'window');        // the joining link, edge on, glowing
      if (flat) v.set(x, y, z + 1, 'window'); else v.set(x, y + 1, z, 'window');
    }
  });
}
/* 1:40 "the long, 300 foot length of glittering, magical chain", and "Imani's
   chain, with heavy weights at either end": a bola. The weights are never
   described, so they are plain dark iron blocks. */
function chainBola(): Vox {
  const v = fresh();
  const metal = '#d6d2c4', iron = '#4f535b';
  chainAlong(v, [[3, 1, 15], [4, 1, 10], [7, 1, 6], [11, 1, 4], [15, 1, 6], [17, 1, 10]], metal);
  // the weights, rounded iron lumps
  const weight = (x: number, z: number) => { chamfer(v, x, 0, z, x + 4, 3, z, 1, iron); chamfer(v, x - 1, -1, z + 1, x + 5, 4, z + 3, 2, iron); chamfer(v, x, 0, z + 4, x + 4, 3, z + 4, 1, iron); };
  weight(1, 16); weight(15, 11);
  return v;
}
/* 3:31 "Several piles of the magical chain sat coiled and ready." */
function chainCoil(): Vox {
  const v = fresh();
  const metal = '#d6d2c4', shade = '#a9a597';
  // coiled like a rope: three turns stacked on one another, each a little narrower,
  // its links in turn light and dark metal with a glowing one between
  for (let t = 0; t < 3; t++) {
    const r = 6.2 - t * 1.3, z0 = t * 2;
    for (let x = -1; x <= 15; x++) for (let y = -1; y <= 15; y++) {
      const d = Math.hypot(x - 7, y - 7);
      if (d > r + 0.5 || d < r - 1.3) continue;
      const seg = Math.floor(((Math.atan2(y - 7, x - 7) + Math.PI) / (Math.PI * 2)) * (14 - t * 3));
      const m = seg % 4 === 3 && (x + y) % 2 ? 'window' : seg % 2 ? shade : metal;
      v.box(x, y, z0, x, y, z0 + 1, m);
    }
  }
  // the loose end, off the top turn and down over the front
  [[11, 9, 5], [12, 11, 4], [12, 13, 2], [12, 15, 0]].forEach(([x, y, z], i) => { v.box(x, y, z, x + 1, y + 1, z + 1, i % 2 ? shade : metal); });
  return v;
}

/* 1:32 "a clay jug of something called toilet-grade moonshine", "The bottles
   had 'Rev-Up' written on the side of them", "the little round handle". The jug
   the anchor's lit one is made from, the writing a dark mark on its face, its
   neck open. 1:34 "I pulled the cork with my teeth": now it is corked. */
function moonshineJug(corked: boolean): Vox {
  const v = fresh();
  const clay = '#a8683f', rim = '#7a4527', handle = twin('#a8683f'), cork = '#b08758', ink = '#3a2216';
  chamfer(v, 1, 1, 0, 8, 8, 0, 2, clay);
  chamfer(v, 0, 0, 1, 9, 9, 6, 2, clay);
  chamfer(v, 1, 1, 7, 8, 8, 7, 2, clay);
  chamfer(v, 2, 2, 8, 7, 7, 8, 2, clay);
  v.box(4, 4, 9, 5, 5, 10, rim);
  if (corked) { v.box(4, 4, 11, 5, 5, 12, cork); v.box(3, 4, 12, 6, 5, 12, cork); }
  else { v.box(3, 3, 10, 6, 6, 10, rim); v.box(4, 4, 10, 5, 5, 10, 'void'); }   // the open mouth, a lip round it
  v.box(10, 4, 3, 10, 5, 3, handle); v.box(11, 4, 3, 11, 5, 8, handle); v.box(10, 4, 8, 10, 5, 8, handle);
  // the writing on its side: two short rows of dark strokes on the belly, no letters
  for (const x of [2, 3, 5, 6, 7]) v.set(x, 9, 4, ink);
  for (const x of [2, 4, 5, 7]) v.set(x, 9, 5, ink);
  return v;
}

/* 1:33 "empty, clinking glass containers with screw-on lids", "another,
   similar black lid with little blades": an empty glass tube, its black lid
   screwed on. 1:34 "it had a little line on the glass", and the smoothie
   inside, "first green, then red, and then pink. After a moment, it started
   to sparkle": pink to the top, sparkles in it, the fill line on the glass. */
function smoothie(blended: boolean): Vox {
  const v = fresh();
  const pink = '#e0508e', spark = '#ffe0ee', lid = '#1f1d22', thread = '#38353c', line = '#f4f7fa';
  const c = 4;
  const R = (z: number) => (z === 0 ? 3.2 : z <= 12 ? 3.8 : 0);
  lathe(v, c, c, 0, 12, R, (x, y, z) => {
    const inside = Math.hypot(x - c, y - c) <= R(z) - 1 && z >= 1;
    if (!inside) return blended && z === 4 && y === c + 4 && x >= c - 1 && x <= c ? line : 'glass';
    return blended && z <= 11 ? pink : null;
  });
  if (blended) for (const [x, y, z] of [[3, 6, 9], [5, 5, 6], [2, 4, 3], [6, 3, 10], [4, 6, 2], [3, 3, 7]] as const) v.set(x, y, z, spark);
  lathe(v, c, c, 13, 14, () => 3.9, (_x, _y, z) => (z === 13 ? thread : lid));
  return v;
}

export const ITEMS_B1C: Record<string, Record<string, () => Vox>> = {
  'poker': { plain: poker },
  'toad-cudgel': { plain: toadCudgel },
  'proximity-trigger': { plain: proximityTrigger },
  'puddle-jumper-tome': { plain: () => tome() },
  'torch-tome': { plain: () => tome() },
  'second-chance-tome': { plain: () => tome() },
  'tome-of-wisp-armor': { plain: () => tome() },
  'sappers-table': { plain: () => sappersTable(false), scorched: () => sappersTable(true) },
  'speedbump': { fortress: speedbump, pyramid: speedbumpPyramid },
  'alarm-module': { cube: alarmCube, ball: alarmBall },
  'talisman-of-slate-butterfly': { charm: butterflyCharm },
  'yogs-special-chain': { scroll: () => scroll(), bola: chainBola, coiled: chainCoil },
  'rev-up-moonshine': { jug: () => moonshineJug(false), corked: () => moonshineJug(true) },
  'rev-up-immunity-smoothie': { empty: () => smoothie(false), blended: () => smoothie(true) },
};
