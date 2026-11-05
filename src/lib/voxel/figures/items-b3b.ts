import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { lathe, chamfer } from './itemparts.ts';
import { potion, ticket, key, table } from './itemforms.ts';

/* ---- items, batch b3b (book 3) ----
   Drawn like the anchor set in items.ts: one object, floating, three-quarter
   view, smooth (chunk 0), facing +y (the lit left face), z up. Each look from
   the edition's own description at its point; a colour the book leaves unsaid
   is a plain one. Shapes and colours only. */

const fresh = () => { const v = new Vox(); v.chunk = 0; return v; };

/** rows of characters drawn onto the face at y, top row first, from (x0, z0 + rows - 1) */
function face(v: Vox, x0: number, y: number, z0: number, rows: string[], pick: (c: string) => string | null) {
  rows.forEach((row, j) => [...row].forEach((c, i) => { const m = pick(c); if (m) v.set(x0 + i, y, z0 + rows.length - 1 - j, m); }));
}
/** the frontmost voxel (largest y) at (x, z), or null */
function frontY(v: Vox, x: number, z: number, from = 24, to = -4): number | null {
  for (let y = from; y >= to; y--) if (v.has(x, y, z)) return y;
  return null;
}
/** rows of characters painted onto whatever surface faces +y, top row first */
function paintFront(v: Vox, x0: number, z0: number, rows: string[], pick: (c: string) => string | null) {
  rows.forEach((row, j) => [...row].forEach((c, i) => {
    const m = pick(c); if (!m) return;
    const x = x0 + i, z = z0 + rows.length - 1 - j, y = frontY(v, x, z);
    if (y != null) v.set(x, y, z, m);
  }));
}

/* ---- the engineer's key ----
   3:1 the gangway's service plate wants a Red Line Engineer's Key, and the key is
   never shown: the plain key. 3:14 the one the book does show, in the satchel in
   the Nightmare's cab: "a large, bronze key", the Steam Engineer's Key. Larger
   than the plain form, a thick bow and a heavy bit. */
function bronzeKey(): Vox {
  const v = fresh();
  const bronze = '#b07a3a', shine = '#d39a58', dark = twin('#b07a3a');
  // the bow, a thick ring on top
  for (let x = 0; x <= 10; x++) for (let z = 11; z <= 21; z++) {
    const d = Math.hypot(x - 5, z - 16);
    if (d <= 5.3 && d >= 2.5) v.box(x, 0, z, x, 2, z, bronze);
  }
  for (const [x, z] of [[1, 17], [1, 16]] as const) v.set(x, 2, z, shine);
  // a collar under the bow, the shaft, and a heavy toothed bit to the front
  v.box(3, 0, 10, 7, 2, 11, dark);
  v.box(4, 0, 0, 6, 2, 9, bronze);
  v.box(7, 0, 0, 10, 2, 2, bronze); v.box(7, 0, 4, 9, 2, 5, bronze); v.set(10, 1, 5, bronze);
  v.clear(9, 0, 1, 9, 2, 1);
  v.set(5, 2, 7, shine); v.set(5, 2, 4, shine);
  return v;
}

/* ---- the jelly bomb ----
   3:10 a landmine like a "tire-shaped" cross section of a spiked naval contact mine:
   a metal tube bent into a ring, its spikes the plungers, the top half "scored into
   triangle-shapes". The metal is never coloured: a plain grey, the scoring dark,
   the plungers a lighter steel. */
function jellyBomb(): Vox {
  const v = fresh();
  const shell = '#6b737c', score = '#454b52', steel = '#b3b7bd';
  const c = 7;
  // the ring, layer by layer, so its section reads round: [inner, outer] radius; low and
  // open enough in the middle that the hole shows through
  const L: [number, number][] = [[4.7, 6.0], [4.1, 6.8], [3.9, 7.2], [4.1, 6.8], [4.7, 6.0]];
  L.forEach(([ri, ro], z) => {
    for (let x = 0; x <= 14; x++) for (let y = 0; y <= 14; y++) {
      const d = Math.hypot(x - c, y - c);
      if (d <= ro && d >= ri) v.set(x, y, z, shell);
    }
  });
  // the top half scored into triangles: a groove zigzagging across its upper face,
  // from the inner edge to the outer and back, round the ring
  for (let k = 0; k < 900; k++) {
    const a = (k / 900) * Math.PI * 2, u = (k / 900) * 12;
    const r = 4.3 + Math.abs((u % 2) - 1) * 2.6;
    const x = Math.round(c + r * Math.cos(a)), y = Math.round(c + r * Math.sin(a));
    for (let z = 4; z >= 2; z--) if (v.has(x, y, z)) { v.set(x, y, z, score); break; }
  }
  // the plungers: short spikes out round its rim and up off its top
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + 0.3, x = (r: number) => Math.round(c + r * Math.cos(a)), y = (r: number) => Math.round(c + r * Math.sin(a));
    v.set(x(7.9), y(7.9), 2, steel); v.set(x(8.9), y(8.9), 2, steel);
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.5;
    const x = Math.round(c + 5.4 * Math.cos(a)), y = Math.round(c + 5.4 * Math.sin(a));
    v.set(x, y, 5, steel); v.set(x, y, 6, steel);
  }
  return v;
}

/* ---- the ugly-ass backpack ----
   3:13 a "large, metal box" (its stand is not drawn) with "dingo-hide straps" and a
   set of waist straps; like "an oversized laundry hamper" or "a giant quiver", open at
   the top with "a slight lip". Loaded: "a dozen metal poles of various lengths"
   sticking out of it, tiny metal balls poured into the gaps. The straps face +y,
   where they are seen; the metal is a plain grey, the hide a plain brown.
   3:21 Katia has made it wider, with more metal, and "added rubber" in with it.
   4:28 out of her boss box: "pretty much the same backpack", adjustable, with
   "retractable stilts". New, so empty; the adjustable walls a band round its middle. */
function backpack(o: { wide?: boolean; load?: boolean; rubber?: boolean; stilts?: boolean }): Vox {
  const v = fresh();
  const metal = '#6f7780', lip = '#848c95', hide = '#7a5030', buckle = '#b3b7bd', inside = '#33373c';
  const pole = '#b3b7bd', pole2 = twin('#b3b7bd'), ball = '#8d949c', ballLit = '#c9ccd1', rubber = '#2b2b30';
  const W = o.wide ? 12 : 9, D = 7, z0 = o.stilts ? 6 : 0, top = z0 + 12;
  // the box, its upright edges rounded off, hollow
  chamfer(v, 0, 0, z0, W - 1, D - 1, top - 1, 1, metal);
  v.clear(1, 1, z0 + 1, W - 2, D - 2, top - 1);
  v.box(1, 1, z0, W - 2, D - 2, z0, inside);
  // the slight lip round the open top
  chamfer(v, -1, -1, top, W, D, top, 2, lip);
  v.clear(1, 1, top, W - 2, D - 2, top);
  // the straps on the face that goes against her back: two shoulder loops and the waist straps, tied
  for (const x of [1, W - 2]) {
    v.box(x, D, top - 1, x, D, top - 1, hide);
    v.box(x, D + 1, z0 + 5, x, D + 1, top - 2, hide);
    v.box(x, D, z0 + 4, x, D, z0 + 4, hide);
  }
  v.box(-1, D, z0 + 2, W, D, z0 + 2, hide);
  v.set(Math.floor(W / 2), D + 1, z0 + 2, buckle);
  v.set(Math.floor(W / 2) - 1, D + 1, z0 + 1, hide); v.set(Math.floor(W / 2) + 1, D + 1, z0 + 1, hide);
  v.set(Math.floor(W / 2) - 1, D + 1, z0, hide);
  if (o.load) {
    // the balls poured into the gaps, up near the rim
    for (let x = 1; x <= W - 2; x++) for (let y = 1; y <= D - 2; y++) {
      v.set(x, y, top - 2, inside);
      v.set(x, y, top - 1, (x + y) % 2 ? ball : ballLit);
    }
    // a dozen poles of different lengths standing up out of it, one or two leaning
    const P: [number, number, number, number][] = o.wide
      ? [[1, 1, 21, 0], [3, 2, 17, 0], [5, 1, 20, 1], [7, 3, 15, 0], [9, 1, 19, 0], [10, 4, 16, -1], [2, 4, 18, 0], [4, 4, 15, 0], [6, 2, 21, 0], [8, 4, 19, 1], [10, 2, 17, 0], [3, 3, 20, -1], [7, 1, 16, 0], [5, 4, 18, 0]]
      : [[1, 1, 21, 0], [3, 2, 17, 0], [5, 1, 20, 1], [7, 3, 16, 0], [2, 4, 18, 0], [4, 4, 15, 0], [6, 2, 21, 0], [7, 1, 18, 0], [1, 3, 16, -1], [5, 4, 19, 0], [3, 1, 15, 0], [6, 4, 17, 0]];
    P.forEach(([x, y, h, lean], i) => {
      const m = i % 2 ? pole : pole2;
      for (let z = top - 1; z <= h - 5 + z0; z++) v.set(x, y, z, m);
      for (let z = h - 4 + z0; z <= h - 3 + z0; z++) v.set(x + (lean > 0 ? 1 : lean < 0 ? -1 : 0) * (z >= h - 3 + z0 ? 1 : 0), y, z, m);
    });
    if (o.rubber) {
      // rubber sheets packed in among the metal, standing up proud of the rim
      v.box(2, 1, top - 1, 4, 1, top + 3, rubber);
      v.box(7, 3, top - 1, 9, 3, top + 2, rubber);
      v.box(1, 4, top - 1, 3, 4, top + 1, rubber);
      v.box(W - 2, 2, top - 1, W - 2, 4, top + 2, rubber);
    }
  }
  if (o.stilts) {
    // the adjustable walls: a band where the upper part slides over the lower
    chamfer(v, -1, -1, z0 + 6, W, D, z0 + 6, 2, lip);
    v.clear(0, 0, z0 + 6, W - 1, D - 1, z0 + 6);
    chamfer(v, 0, 0, z0 + 6, W - 1, D - 1, z0 + 6, 1, metal);
    v.clear(1, 1, z0 + 6, W - 2, D - 2, z0 + 6);
    // four stilts let down from the corners, a sleeve, a leg and a foot
    for (const [x, y] of [[0, 0], [W - 2, 0], [0, D - 2], [W - 2, D - 2]] as const) {
      v.box(x, y, z0 - 2, x + 1, y + 1, z0 - 1, 'metalDark');
      v.box(x + (x ? 1 : 0), y + (y ? 1 : 0), 1, x + (x ? 1 : 0), y + (y ? 1 : 0), z0 - 3, buckle);
      v.box(x, y, 0, x + 1, y + 1, 0, 'metalDark');
    }
  }
  return v;
}

/* ---- the makeup table ----
   3:10 a crafting table that can "superimpose the face" she wants to copy "on the
   glass". Nothing else of its look is given: the plain table with a pane of glass
   standing up at its back in a sill. (The full-sized mirror comes at level five,
   which it never reaches here.) */
function makeupTable(): Vox {
  const v = table();
  v.box(2, 0, 8, 13, 2, 8, twin('#8a5a35'));
  v.box(3, 1, 9, 12, 1, 17, 'glass');
  return v;
}

/* ---- the dirty little phased bolt ----
   3:22 pulled out of Katia's leg, "the shaft was splintered", and the System says it
   is broken and "invisible". So it is drawn in glass, only its edges catching the
   light, a crossbow bolt splintered halfway down its shaft. It lies along y, the
   point to +y.
   3:24 dipped in blood, "its shape appeared for a moment" before the blood ran off:
   the same bolt, blood over it and running off it. */
function phasedBolt(bloody: boolean): Vox {
  const v = fresh();
  const g = 'glass', blood = '#7d1b17', wet = '#a3221b';
  const L = 21;
  // the shaft, the back half and the front half, splintered where they meet
  v.box(4, 1, 4, 5, 7, 5, g);
  v.box(4, 11, 4, 5, L - 7, 5, g);
  v.set(4, 8, 4, g); v.set(5, 9, 5, g); v.set(4, 10, 5, g); v.set(5, 10, 4, g);
  for (const [x, y, z] of [[3, 8, 5], [6, 9, 4], [5, 8, 6], [3, 10, 3], [6, 11, 6]] as const) v.set(x, y, z, g);
  // the nock, the head barbed at the back and tapering to the point
  v.box(4, 0, 4, 5, 0, 5, g);
  v.box(4, L - 6, 4, 5, L - 6, 5, g);
  v.box(2, L - 5, 4, 7, L - 4, 5, g);
  v.box(3, L - 3, 4, 6, L - 2, 5, g);
  v.box(4, L - 1, 4, 5, L, 5, g);
  // the fletching
  [3, 2, 2, 1].forEach((h, i) => {
    const y = i + 1;
    v.box(6, y, 5, 5 + h, y, 5, g); v.box(4 - h, y, 5, 3, y, 5, g);
    if (i < 3) v.box(4, y, 6, 5, y, 6 + (i < 1 ? 1 : 0), g);
  });
  if (!bloody) return v;
  // dipped: blood over its top and down its front, its shape showing in it, a little
  // glass still showing where it has run off
  for (const { p: [x, y, z] } of v.all()) {
    const up = !v.has(x, y, z + 1), front = !v.has(x, y + 1, z) || !v.has(x + 1, y, z);
    if (!(up || front)) continue;
    if (y % 5 === 2 && !up) continue;
    v.set(x, y, z, up && (x + y) % 4 === 0 ? wet : blood);
  }
  // and flowing off it: drips hanging under it, a few already falling
  for (const [x, y, n] of [[4, 3, 2], [5, 6, 3], [4, 12, 2], [5, 14, 1], [2, L - 5, 2], [7, L - 4, 3], [5, L, 2]] as const) {
    for (let k = 1; k <= n; k++) v.set(x, y, 4 - k, blood);
  }
  for (const [x, y, z] of [[5, 6, -1], [7, L - 4, -1], [4, 12, 0]] as const) v.set(x, y, z - 1, wet);
  return v;
}

/* ---- neural enhancer #544 ----
   3:13 out of a glowing bronze box: "a regular sized, blue and yellow capsule". The
   pill alone (the box is how it came). It lies along x, the two halves meeting in
   the middle, its ends rounded off in steps. */
function capsule(): Vox {
  const v = fresh();
  const yellow = '#e9c43b', yellowLit = '#f6df86', blue = '#2e4f9c', blueLit = '#5d7fca';
  const L = 17;
  /** one slice of the pill across x: a square of side n centred in y-z, its corners cut */
  const slice = (x: number, n: number, cut: number) => {
    const a = (6 - n) / 2, m = x >= Math.floor(L / 2), lit = m ? blueLit : yellowLit, base = m ? blue : yellow;
    for (let y = a; y < a + n; y++) for (let z = a; z < a + n; z++) {
      const dy = Math.min(y - a, a + n - 1 - y), dz = Math.min(z - a, a + n - 1 - z);
      if (dy + dz < cut) continue;
      v.set(x, y, z, n === 6 && z === a + n - 1 && y >= 3 ? lit : base);   // a shine along its top, to the front
    }
  };
  slice(0, 2, 0); slice(1, 4, 1); slice(L - 2, 4, 1); slice(L - 1, 2, 0);
  for (let x = 2; x <= L - 3; x++) slice(x, 6, 2);
  return v;
}

/* ---- the PVP coupon ----
   3:18 "a little slip of paper", "a black ticket" with a "gold leaf skull" embossed on
   it. The plain ticket in black, the gold skull on its face. The crawler's number and
   name are printed on the back, which faces away. */
const SKULL = ['.#####.', '#######', '#..#..#', '###.###', '.#####.', '.#.#.#.'];
function pvpCoupon(): Vox {
  const black = '#26252b';
  const v = ticket({ paper: black, stub: black, ink: twin(black) });
  face(v, 6, 1, 1, SKULL, c => (c === '#' ? '#d9a93a' : null));     // set flush in the face, so it reads at this size
  return v;
}

/* ---- seize the day toothpaste ----
   3:15 "a tiny, travel-sized tube", "red with a black skull on it" and two words written
   on it: standing on its cap, the crimped end up, the skull on its face and a line of
   writing under it. The cap's colour is never given: a plain white. (The plain
   toothbrush it came with is not drawn.) */
function toothpaste(): Vox {
  const v = fresh();
  const red = '#c22a22', crimp = twin('#c22a22'), cap = '#e4e0d8', ink = '#1b1714';
  const cx = 4, cy = 3;
  lathe(v, cx, cy, 0, 2, z => (z === 2 ? 1.6 : 2.2), () => cap);
  lathe(v, cx, cy, 3, 3, () => 2.7, () => red);
  for (let z = 4; z <= 14; z++) {
    const ax = 3 + (z - 4) * 0.13, by = 3 - (z - 4) * 0.2;
    for (let x = -1; x <= 9; x++) for (let y = 0; y <= 6; y++) if (((x - cx) / ax) ** 2 + ((y - cy) / by) ** 2 <= 1) v.set(x, y, z, red);
  }
  // the crimped end, flat and ridged
  v.box(cx - 5, cy, 15, cx + 5, cy, 16, crimp);
  for (let x = cx - 5; x <= cx + 5; x += 2) v.set(x, cy, 16, red);
  // the skull, and the writing under it
  paintFront(v, cx - 2, 9, ['.###.', '#####', '#.#.#', '#####', '.#.#.'], c => (c === '#' ? ink : null));
  paintFront(v, cx - 3, 6, ['##.#.##'], c => (c === '#' ? ink : null));
  return v;
}

/* ---- the riot shield ----
   3:29 "about six feet high", curved "like a half cylinder", with loops to hold it, "a
   small, plastic-like window" at the top and two words on the front "in white, blocky
   letters". A chibi of itself, standing, the curve bowed out to +y. The loops are on
   its inside, out of sight; its own colour is never given: a plain grey. The lettering
   is the System's own script, not ours, so it is blocky white marks in two words. */
function riotShield(): Vox {
  const v = fresh();
  const body = '#5d646e', rim = '#454b52', white = '#eeeae2';
  const R = 6.4, cx = 6, H = 20;
  for (let x = 0; x <= 12; x++) for (let y = 0; y <= 8; y++) {
    const d = Math.hypot(x - cx, y);
    if (d <= R + 0.5 && d >= R - 0.8) v.box(x, y, 0, x, y, H - 1, body);
  }
  // a rim round its top and bottom edges
  for (const { p: [x, y, z] } of v.all()) if (z === 0 || z === H - 1) v.set(x, y, z, rim);
  // the small window near the top
  for (let x = 4; x <= 8; x++) for (let z = 15; z <= 17; z++) { const y = frontY(v, x, z); if (y != null) v.set(x, y, z, 'glass'); }
  // the two blocky words across the front
  paintFront(v, 2, 10, ['##.#..##.', '#..##.#..', '##.#..##.'], c => (c === '#' ? white : null));
  paintFront(v, 1, 5, ['##.#.##.##', '#..###..#.', '##.#.#.##.'], c => (c === '#' ? white : null));
  return v;
}

/* ---- the telescoping baton ----
   3:29 it looks like a baseball bat and is "actually a police baton", with "the slight
   glow of enchantment", its length adjustable from 25 centimetres to 3 metres. Drawn
   part way out: the grip and pommel, then two telescoping sections, each thinner, and
   the knob at its end, a faint glow where the sections meet. Its colour is never given:
   plain grey steel, the grip darker. It lies along y, the end it strikes with to +y. */
function baton(): Vox {
  const v = fresh();
  const grip = '#3a3d42', pommel = '#2b2e32', steel = '#8d949c', steel2 = '#a4abb6', knob = '#7c858e';
  /** a section along y: a square of side n centred on (2.5, 2.5) in x-z, corners cut */
  const sect = (y0: number, y1: number, n: number, cut: number, m: string) => {
    const a = (6 - n) / 2;
    for (let x = a; x < a + n; x++) for (let z = a; z < a + n; z++) {
      const dx = Math.min(x - a, a + n - 1 - x), dz = Math.min(z - a, a + n - 1 - z);
      if (dx + dz >= cut) v.box(x, y0, z, x, y1, z, m);
    }
  };
  sect(-1, -1, 6, 2, pommel);
  sect(0, 6, 6, 2, grip);
  sect(7, 12, 4, 1, steel);
  sect(13, 18, 2, 0, steel2);
  sect(19, 20, 4, 1, knob);
  // the slight glow of enchantment, where the sections slide into each other
  for (const [x, y, z] of [[1, 7, 3], [2, 7, 4], [3, 7, 4], [4, 7, 3], [2, 13, 3], [3, 13, 3], [3, 13, 2]] as const) v.set(x, y, z, 'window');
  return v;
}

/* ---- the sheol brick ----
   3:14 out of the box in the cab, "a black chunk", which burns hotter and longer than
   coal. A rough black lump, a few facets catching the light.
   3:31 Carl takes "several hundred still-burning pieces": the same lump alight, the
   fire showing in its cracks and standing up off its top. */
function sheolBrick(lit: boolean): Vox {
  const v = fresh();
  const coal = '#2e2d34', facet = '#45444f', glint = '#676676';
  chamfer(v, 0, 1, 0, 9, 8, 3, 2, coal);
  chamfer(v, 1, 0, 2, 8, 7, 5, 2, coal);
  chamfer(v, 2, 2, 6, 7, 7, 7, 2, coal);
  chamfer(v, 7, 3, 1, 11, 7, 4, 1, coal);
  v.clear(0, 1, 3, 1, 3, 3);                               // a bite out of one corner
  // flat facets, each a patch of one lighter tone
  for (const [x, y, z] of [[3, 8, 1], [4, 8, 1], [3, 8, 2], [4, 8, 2], [5, 8, 2], [5, 6, 7], [6, 6, 7], [5, 5, 7], [11, 5, 2], [11, 5, 3], [11, 6, 3]] as const) if (v.has(x, y, z)) v.set(x, y, z, facet);
  for (const [x, y, z] of [[2, 8, 3], [6, 7, 7], [10, 7, 4]] as const) if (v.has(x, y, z)) v.set(x, y, z, glint);
  if (!lit) return v;
  // burning: the fire in its cracks, and up off it
  for (const [x, y, z] of [[2, 6, 5], [3, 7, 5], [4, 7, 5], [5, 7, 6], [6, 8, 3], [6, 8, 2], [7, 8, 1], [9, 7, 4], [3, 4, 7], [4, 3, 7], [7, 6, 4]] as const) v.set(x, y, z, 'ember');
  v.set(4, 5, 8, 'flame'); v.set(5, 4, 8, 'flame'); v.set(4, 4, 9, 'flame');
  v.set(9, 5, 5, 'flame'); v.set(9, 5, 6, 'flame');
  v.set(2, 5, 6, 'ember');
  return v;
}

/* ---- superb constitution buff potion ----
   3:7 the next potion is "orange and bubbly": the plain potion, the liquid orange,
   bubbles rising through it. */
function constitutionPotion(): Vox {
  const v = potion({ liquid: '#e0560c' });
  for (const [x, y, z] of [[4, 8, 2], [6, 8, 4], [3, 7, 5], [5, 8, 6], [7, 7, 7], [4, 7, 7]] as const) v.set(x, y, z, '#ffa245');
  v.set(5, 6, 8, '#ffa245');
  return v;
}

/* ---- the train conductor's souvenir hat ----
   3:1 not magical, "a simple, blue and white hat" of the kind a toddler wears, with
   words embroidered on it. A conductor's cap in the two colours and no others: a blue
   crown over a white band, the embroidery a line of stitching across the band's front,
   a short visor. */
function souvenirHat(): Vox {
  const v = fresh();
  const blue = '#2e5aa8', white = '#eeeae2', visor = '#1f3f7a', stitch = '#2e5aa8';
  const c = 5.5;
  // the white band, and the blue crown puffing out over it to a flat top
  chamfer(v, 1, 1, 0, 10, 10, 2, 3, white);
  chamfer(v, 1, 1, 3, 10, 10, 3, 3, blue);
  chamfer(v, 0, 0, 4, 11, 11, 6, 4, blue);
  chamfer(v, 0, 0, 7, 11, 11, 7, 5, blue);
  chamfer(v, 2, 2, 8, 9, 9, 8, 3, blue);
  // the visor out to the front corner, the one facing us, and the embroidery: a line of
  // blue stitching across the band over it
  for (let x = 0; x <= 15; x++) for (let y = 0; y <= 15; y++) {
    const u = (x - c + y - c) / Math.SQRT2, w = (x - y) / Math.SQRT2;
    if (u > 3.2 && (u / 8.4) ** 2 + (w / 5.2) ** 2 <= 1 && !v.has(x, y, 0)) v.set(x, y, 0, visor);
    if (v.get(x, y, 1) === white && u > 3.4 && Math.abs(w) < 3.2 && (x + y) % 2 === 0) v.set(x, y, 1, stitch);
  }
  return v;
}

export const ITEMS_B3B: Record<string, Record<string, () => Vox>> = {
  'engineers-key': { plain: () => key(), bronze: bronzeKey },
  'jelly-bomb': { mine: jellyBomb },
  'ugly-ass-backpack': {
    loaded: () => backpack({ load: true }),
    widened: () => backpack({ wide: true, load: true, rubber: true }),
    stilted: () => backpack({ stilts: true }),
  },
  'makeup-table': { pane: makeupTable },
  'mordecais-special-brew': { plain: () => potion() },
  'dirty-little-phased-bolt': { phased: () => phasedBolt(false), bloodied: () => phasedBolt(true) },
  'neural-enhancer-544': { capsule },
  'pvp-coupon': { ticket: pvpCoupon },
  'seize-day-toothpaste': { tube: toothpaste },
  'shade-gnoll-crowd-control-shield': { shield: riotShield },
  'shade-gnoll-crowd-control-baton': { baton },
  'sheol-bricks': { chunk: () => sheolBrick(false), burning: () => sheolBrick(true) },
  'superb-constitution-buff-potion': { orange: constitutionPotion },
  'train-conductors-souvenir-hat': { cap: souvenirHat },
};
