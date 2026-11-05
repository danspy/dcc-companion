import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { lathe, chamfer } from './itemparts.ts';
import { potion, scroll, tome, ring } from './itemforms.ts';

/* ---- items, set b4c ----
   Drawn like the anchor set in items.ts: one object, floating, three-quarter
   view, smooth (chunk 0), facing +y (the lit left face), z up. Each look from
   the edition's own description at its point; a colour the book leaves unsaid
   is a plain one. Shapes and colours only. */

/** a straight bar of voxels from one point to another, stepped along its longest axis */
function bar(v: Vox, a: [number, number, number], b: [number, number, number], m: string) {
  const n = Math.max(...a.map((p, i) => Math.abs(b[i] - p)));
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0;
    v.set(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), m);
  }
}
/** a small seeded hash in [0, 1), so a ragged edge is the same every time */
const hash = (x: number, y: number, z: number) => ((((x + 64) * 73856093) ^ ((y + 64) * 19349663) ^ ((z + 64) * 83492791)) >>> 0) % 1000 / 1000;

/* ---- the platinum sharpening stone ----
   4:13 "a little black rock" out of the quest box, rubbed along the gauntlet's
   spikes. A rough lump, wider than it is tall, its faces broken at odd angles. */
function sharpeningStone(): Vox {
  const v = new Vox(); v.chunk = 0;
  const black = '#2e2e36', face = '#3f404a';
  chamfer(v, 2, 1, 0, 9, 6, 0, 2, black);
  chamfer(v, 0, 0, 1, 11, 7, 2, 3, black);
  chamfer(v, 1, 0, 3, 10, 7, 3, 3, black);
  chamfer(v, 1, 1, 4, 8, 6, 4, 3, face);
  chamfer(v, 2, 2, 5, 6, 5, 5, 2, face);
  // not a pebble: knocked about, a bite out of its rim here and there
  for (const [x, y, z] of [[11, 3, 2], [11, 4, 2], [10, 7, 3], [9, 7, 3], [0, 2, 1], [0, 3, 2], [4, 7, 3], [8, 6, 4], [7, 6, 4]] as const) v.set(x, y, z, null);
  return v;
}

/* ---- rapid detox ----
   4:5 not the regular alcohol cure: "white with little frothy bubbles". */
function rapidDetox(): Vox {
  const v = potion({ liquid: '#e9e6de' });
  const froth = '#ffffff', bubble = '#c9c4b8';
  for (const { p: [x, y, z], mat } of v.all()) {
    if (mat !== '#e9e6de') continue;
    if (z === 7 && (x + y) % 2 === 0) v.set(x, y, z, froth);
    else if (z < 7 && hash(x, y, z) < 0.12) v.set(x, y, z, bubble);
  }
  for (const [x, y] of [[4, 4], [6, 5], [5, 7], [3, 6]] as const) v.set(x, y, 8, froth);   // froth standing on the top
  return v;
}

/* ---- rockard's ring of sniping ----
   4:32 "This amber-stoned ring": the band is never described, so a plain one. */
function snipingRing(): Vox {
  const v = ring({ stone: '#d98a1c' });
  const glint = '#f6c25a';
  v.set(6, 2, 13, glint); v.set(5, 2, 14, glint);
  return v;
}

/* ---- the ring of water breathing ----
   4:28 "a glowing, blue ring that twinkled with little sparkles". */
function waterRing(): Vox {
  const v = ring({ metal: '#3b6fd6' });
  const light = '#7aa6f2';
  for (const { p: [x, y, z] } of v.all()) if (y === 2 && (x + z) % 3 === 0) v.set(x, y, z, light);
  for (const [x, z] of [[2, 9], [10, 4], [6, 1]] as const) if (v.has(x, 2, z)) v.set(x, 2, z, 'portal');
  // the sparkles, standing off it
  for (const [x, y, z] of [[-2, 3, 11], [14, 2, 9], [12, 3, 14], [0, 2, 1], [7, 4, 15], [15, 1, 2]] as const) v.set(x, y, z, 'white');
  for (const [x, y, z] of [[-1, 3, 12], [13, 2, 13]] as const) v.set(x, y, z, 'portal');
  return v;
}

/* ---- surefires ----
   4:2 "a case containing 25 small, black items, each about the size of a bottle
   cap". The case's make is never given: a plain grey one, open, its lid up at
   the back, the twenty-five in rows of five. */
function surefireCase(): Vox {
  const v = new Vox(); v.chunk = 0;
  const shell = '#7c848d', inside = '#a4abb3', lid = twin('#7c848d'), cap = '#25252b', rim = '#3c3d45';
  const N = 15;
  chamfer(v, 0, 0, 0, N, N, 3, 1, shell);
  v.clear(1, 1, 1, N - 1, N - 1, 3);
  v.box(1, 1, 1, N - 1, N - 1, 1, inside);
  // five by five, a little apart, each a squat cap with a lighter rim catching the light
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    const x = 1 + i * 3, y = 1 + j * 3;
    v.box(x, y, 2, x + 1, y + 1, 2, cap); v.set(x, y + 1, 2, rim);
  }
  // the lid, open and standing at the back
  v.box(0, -1, 4, N, -1, 8, lid);
  v.box(1, 0, 5, N - 1, 0, 7, inside);
  return v;
}

/* ---- the buzzsaw ----
   4:9 "a twenty-five-foot-long stick with ten spinning buzzsaws on it", "each
   blade the size of a truck tire", hung off the bird by "a pair of thick
   cables". A chibi of itself, lying along x as it sat on the sand: the blades
   alternate either side of the stick, front and back, so all ten show. Its
   metal is never coloured: plain greys.
   4:27 buried in the sea floor, "the whole thing broke apart, pieces flying
   every which way", one of the round saws shooting off on its own. */
const BLADE = '#b9bfc7', BLADE2 = '#9aa1aa', TOOTH = '#e6e9ee', HUB = '#4a4f57', STICK = '#5d646e', CASING = '#6b737c', CABLE = '#2a2a30';
/** one round saw standing in the x-z plane at y, an octagon with notched teeth round its rim and a dark arbor */
function blade(v: Vox, cx: number, cz: number, y: number, tone: string) {
  for (let x = cx - 3; x <= cx + 3; x++) for (let z = cz - 3; z <= cz + 3; z++) {
    const d = Math.abs(x - cx) + Math.abs(z - cz);
    if (d > 4) continue;
    const rim = d === 4 || Math.abs(x - cx) === 3 || Math.abs(z - cz) === 3;
    if (rim && (x + z) % 2 === 0) { v.set(x, y, z, TOOTH); continue; }
    v.set(x, y, z, rim ? tone : twin(tone));
  }
  v.set(cx, y, cz, HUB);
}
function buzzsaw(broken: boolean): Vox {
  const v = new Vox(); v.chunk = 0;
  const xs = Array.from({ length: 10 }, (_, i) => 2 + Math.round(i * 2.4));
  const cables = (n: number) => { for (const y of [-1, 1].slice(0, n)) { bar(v, [-1, y, 7], [-2, y, 9], CABLE); bar(v, [-2, y, 9], [-1, y, 11], CABLE); } };
  // the casing at the end the cables come into
  chamfer(v, -2, -1, 1, 0, 1, 6, 1, CASING);
  if (!broken) {
    v.box(1, 0, 3, 26, 0, 4, STICK);
    xs.forEach((x, i) => blade(v, x, 3, i % 2 ? -1 : 1, i % 2 ? BLADE2 : BLADE));
    cables(2);
    return v;
  }
  // broken: the stick snapped in two, the halves knocked askew, most of the blades gone
  const lz = (x: number) => 3 + Math.floor(x / 4), rz = (x: number) => 3 - Math.floor((x - 15) / 5);
  for (let x = 1; x <= 11; x++) v.box(x, 0, lz(x), x, 0, lz(x) + 1, STICK);
  for (const [i, x] of [[0, xs[0]], [1, xs[1]], [2, xs[2]]] as const) blade(v, x, lz(x), i % 2 ? -1 : 1, i % 2 ? BLADE2 : BLADE);
  for (let x = 15; x <= 26; x++) v.box(x, 0, rz(x), x, 0, rz(x) + 1, STICK);
  for (const [i, x] of [[6, xs[6]], [8, xs[8]], [9, xs[9]]] as const) blade(v, x, rz(x), i % 2 ? -1 : 1, i % 2 ? BLADE2 : BLADE);
  cables(1);
  // jagged ends where it snapped, and one round saw shooting off on its own
  v.set(12, 0, lz(11) + 1, STICK); v.set(14, 0, rz(15), STICK); v.set(14, 0, rz(15) - 1, STICK);
  blade(v, 14, 12, 0, BLADE);
  return v;
}

/* ---- the twister ----
   4:15 the "castle" is "a square hunk of land with a two-story home sitting upon
   it", "any regular house", "a double garage, a porch, and even a little garden
   out front, though half of it was gone", "painted a dull beige and made of
   aluminum siding", "a basketball hoop attached above the garage", under "a
   massive, glowing balloon", "more than four times the size of the regular
   hot-air balloons", "attached to the house with a massive net", the net made
   fast "at the four corners of the lot". 4:20 "the top floor and the attic"
   ripped away "about six inches below the first floor's ceiling", "the tops of
   the walls were jagged and splintered", the chimney still "about five feet over
   the top of the walls", and from a severed pipe "water arced into the air from
   the middle of the house". A chibi of itself; the balloon's colour is never
   given, only its glow, and the brick and the rope are plain.
   4:29 "The net holding the house was ripped to pieces... The yard around the
   half house had literal holes in it. Water arced from a severed main."
   4:30 the net is mended, rope to rope, with tape. 5:8 a ballista, "a giant
   crossbow thing", affixed "to the side of the yard", made "out of the mechanism
   for the garage door opener". */
type HouseState = 'flying' | 'torn' | 'ballista';
function twister(state: HouseState): Vox {
  const v = new Vox(); v.chunk = 0;
  const dirt = '#8a6440', dirtDark = '#5e4028', garden = '#4f8a3a', siding = '#b9ab8c', siding2 = '#ab9d80', inner = '#7d7262';
  const brick = '#8a4a3a', door = '#6b4a32', pane = '#39434f', garage = '#e4e0d6', groove = '#8f8a80', rope = '#6e5638', tape = '#a9adb3';
  const glow = '#f6ebbf', glow2 = '#ecd99c';
  const N = 13;
  // the square hunk of land, its earth falling away underneath
  v.box(0, 0, 1, N, N, 2, dirt);
  chamfer(v, 1, 1, 0, N - 1, N - 1, 0, 2, dirtDark);
  // the little garden out front, half of it gone
  v.box(1, 10, 3, 3, 12, 3, garden); v.set(2, 11, 4, '#3f7a30'); v.set(1, 12, 4, '#6faa4a');
  // the house, cut off at the ground floor: walls of siding, jagged at the top, the rooms open
  const top = (x: number, y: number) => 5 + Math.floor(hash(x, y, 0) * 2.4);
  for (let x = 1; x <= 8; x++) for (let y = 2; y <= 8; y++) {
    const wall = x === 1 || x === 8 || y === 2 || y === 8 || (x === 5 && y >= 5);
    if (!wall) { v.set(x, y, 3, inner); continue; }
    for (let z = 3; z <= top(x, y); z++) v.set(x, y, z, z % 2 ? siding : siding2);
  }
  // the double garage beside it, its door to the front, the hoop over the door
  for (let x = 9; x <= 12; x++) for (let y = 3; y <= 8; y++) {
    const wall = x === 12 || y === 3 || y === 8;
    if (!wall) { v.set(x, y, 3, inner); continue; }
    for (let z = 3; z <= 5 + (hash(x, y, 1) < 0.4 ? 1 : 0); z++) v.set(x, y, z, z % 2 ? siding : siding2);
  }
  v.box(9, 8, 3, 12, 8, 5, (x, y, z) => (z === 4 ? groove : garage));
  v.box(10, 9, 6, 11, 9, 7, '#eeeae2'); v.set(10, 10, 6, '#d2642a'); v.set(11, 10, 6, '#d2642a');
  // the front door and the porch before it, a window either side
  v.box(3, 8, 3, 3, 8, 4, door); v.box(2, 9, 3, 4, 9, 3, 'wood');
  v.box(6, 8, 4, 7, 8, 5, pane); v.set(1, 6, 4, pane); v.set(1, 4, 4, pane);
  // the chimney stack, still standing well over the walls
  v.box(1, 3, 3, 2, 4, 9, brick); v.set(2, 4, 9, null);
  // the severed main, water arcing from the middle of the house over the front
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, x = Math.round(5 - 3 * t), y = Math.round(5 + 9 * t), z = Math.round(4 + 14 * t * (1 - t) * 1.2 - 3 * t);
    v.set(x, y, z, 'water'); if (i < 5) v.set(x, y, z + 1, 'water');
  }
  // the balloon: huge and glowing, a net of rope over it
  const cx = 6.5, cy = 6.5, z0 = 9;
  const R = (z: number) => [2.4, 3.5, 4.4, 5.1, 5.7, 6.1, 6.4, 6.4, 6.0, 5.0, 3.2][z - z0] ?? 0;
  lathe(v, cx, cy, z0, z0 + 10, R, (x, y, z) => {
    const a = (Math.atan2(y - cy, x - cx) + Math.PI) / (Math.PI * 2) * 12, g = Math.floor(a);
    const skin = hash(x, y, z) < 0.05 ? 'window' : g % 2 ? glow : glow2;
    const seam = Math.abs(a - Math.round(a)) < 0.16 || (z - z0) % 3 === 2;
    if (seam && Math.hypot(x - cx, y - cy) > R(z) - 1.2) {
      if (state === 'torn' && hash(x, y, z) < 0.5) return skin;
      if (state === 'ballista' && hash(x, y, z) < 0.08) return tape;
      return rope;
    }
    return skin;
  });
  // the net's lines down to the four corners of the lot
  const corners: [number, number][] = [[0, 0], [N, 0], [0, N], [N, N]];
  corners.forEach(([x, y], i) => {
    const hx = Math.round(cx + (x ? 2.5 : -2.5)), hy = Math.round(cy + (y ? 2.5 : -2.5));
    if (state === 'torn' && i % 2 === 1) { bar(v, [hx, hy, z0 + 1], [x ? hx + 1 : hx - 1, y ? hy + 1 : hy - 1, z0 - 3], rope); return; }   // snapped, hanging
    bar(v, [x, y, 3], [hx, hy, z0 + 1], rope);
  });
  if (state !== 'flying') {
    // holes knocked in the yard
    for (const [x, y] of [[8, 11], [5, 12], [12, 1], [0, 8]] as const) { v.set(x, y, 2, 'void'); v.set(x, y, 1, 'void'); }
    v.set(6, 12, 2, 'void');
  }
  if (state === 'ballista') {
    // the ballista, on the front edge of the yard: a stock on a post, the bow across it, the string drawn back
    const metal = '#7c858e', wood = '#8a5a32', line = '#e0dccf';
    v.box(11, 12, 3, 11, 12, 3, metal);
    v.box(11, 9, 4, 11, 14, 4, wood); v.set(11, 15, 4, metal);
    v.box(9, 13, 5, 13, 13, 5, metal); v.set(8, 12, 5, metal); v.set(14, 12, 5, metal);
    bar(v, [8, 12, 5], [11, 10, 5], line); bar(v, [14, 12, 5], [11, 10, 5], line);
  }
  return v;
}

/* ---- the vahana ----
   4:11 "a single, traditional-style hot-air balloon", "large, black and gold
   striped", "covered in ribbons and small flags", "decorated for a parade or to
   advertise a circus". "A large basket hung underneath, equally doused in ribbons
   and flags", "big enough to hold five or six regular humans", and "a wheel on the
   fire mechanism under the open balloon", "the box that radiated heat upward".
   The ribbons and flags are never coloured: plain cloth. A chibi of itself. */
function vahana(): Vox {
  const v = new Vox(); v.chunk = 0;
  const black = '#211f25', gold = '#d9a93a', wicker = '#b48a50', weave = '#9c7442', ribbon = '#e9e1cf', ribbon2 = '#d6ccb4';
  const rope = '#7a6446', box = '#5d646e', wheel = '#8a5a32';
  // the wicker basket, open on top, a band of ribbon round it
  chamfer(v, 3, 3, 0, 9, 9, 4, 1, wicker);
  v.clear(4, 4, 1, 8, 8, 4);
  v.box(4, 4, 1, 8, 8, 1, weave);
  for (let z = 0; z <= 4; z++) for (const { p: [x, y], mat } of v.all().filter(c => c.p[2] === z)) if (mat === wicker && (x + y + z) % 2) v.set(x, y, z, weave);
  for (const { p: [x, y, z], mat } of v.all()) if (z === 3 && (mat === wicker || mat === weave)) v.set(x, y, z, ribbon);
  // small flags on the basket's corners
  for (const [x, y] of [[3, 9], [9, 9], [9, 3]] as const) { v.box(x, y, 5, x, y, 6, rope); v.set(x, y + (y === 9 ? 1 : 0), 6, ribbon2); v.set(x + (x === 9 ? 1 : 0), y, 6, ribbon2); }
  // the fire box on a frame over the basket, radiating heat up into the balloon, the wheel at its side
  v.box(5, 5, 7, 7, 7, 8, box);
  v.box(5, 5, 9, 7, 7, 9, 'ember'); v.set(6, 6, 10, 'flame');
  v.box(8, 6, 7, 8, 6, 8, wheel); v.set(8, 7, 8, wheel); v.set(8, 5, 7, wheel);
  // the ropes from the basket's corners to the balloon's mouth
  for (const [x, y] of [[3, 3], [9, 3], [3, 9], [9, 9]] as const) bar(v, [x, y, 5], [x < 6 ? 4 : 8, y < 6 ? 4 : 8, 10], rope);
  // the balloon: open at the bottom, black and gold in stripes from its mouth to its crown,
  // a ribbon looped round it in swags, a small flag at each low point
  const cx = 6, cy = 6, z0 = 10;
  const R = (z: number) => [2.2, 3.0, 3.7, 4.3, 4.8, 5.2, 5.5, 5.6, 5.5, 5.1, 4.4, 3.2][z - z0] ?? 0;
  const swag = (x: number, y: number) => {
    const a = (Math.atan2(y - cy, x - cx) + Math.PI) / (Math.PI * 2) * 6;
    return z0 + 6 - Math.round(Math.sin((a % 1) * Math.PI) * 1.4);
  };
  lathe(v, cx, cy, z0, z0 + 11, R, (x, y, z) => {
    if (z <= z0 + 1 && Math.hypot(x - cx, y - cy) < R(z) - 1) return null;
    if (z === swag(x, y) && Math.hypot(x - cx, y - cy) > R(z) - 1.1) return ribbon;
    const a = (Math.atan2(y - cy, x - cx) + Math.PI) / (Math.PI * 2) * 10 + 0.5;
    return Math.floor(a) % 2 ? gold : black;
  });
  for (let k = 0; k < 6; k++) {
    const a = ((k + 0.5) / 6) * Math.PI * 2 - Math.PI, x = Math.round(cx + Math.cos(a) * 5.4), y = Math.round(cy + Math.sin(a) * 5.4);
    v.set(x, y, z0 + 4, ribbon2); v.set(x, y, z0 + 3, ribbon2);
  }
  for (const [x, y] of [[4, 7], [7, 8], [8, 5]] as const) { v.set(x, y, z0 - 1, ribbon); v.set(x, y, z0 - 2, ribbon2); }
  return v;
}

/* ---- the robot toy ----
   4:13 "A toy, robot Donut": "about ¾'s the size of the real deal, and her fur
   was wrong, like she was made out of rat hair"; she "took a few steps out onto
   the table and started licking her paw in a stilted, mechanical manner". Her
   own figure's tortoiseshell Persian, standing, gone to the dull, coarse greys
   of rat hair with tufts sticking out of it, one front paw up and stiff.
   4:15 a sturdier one, but "the head was now scarred from Mongo teeth".
   4:17 the newest "weighed about three times as much... slightly bigger, too",
   with "a small panel on the back of the head that was held closed with a cheap,
   little tab". The body runs along x, the head at +x turned to look out at +y. */
type RobotState = 'toy' | 'scarred' | 'sturdy';
function robotCat(state: RobotState): Vox {
  const v = new Vox(); v.chunk = 0;
  const k = state === 'sturdy' ? 1 : 0;
  const choc = '#6b5a4c', black = '#3a3430', ginger = '#a07a52', cream = '#b8a690', grey = '#877c72';
  // tortoiseshell in big patches, like hers, and the wrong, coarse grey hairs all through it
  const coat = (x: number, y: number, z: number) => {
    const p = x <= 3 && z >= 5 ? ginger : x >= 5 && x <= 8 && y <= 1 ? black : z <= 3 && x >= 6 ? cream : choc;
    return hash(x, y, z) < 0.08 ? grey : p;
  };
  /** a block with its edges rounded off, in the coat */
  const round = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m?: (x: number, y: number, z: number) => string) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const ex = x === x0 || x === x1, ey = y === y0 || y === y1, ez = z === z0 || z === z1;
      if ((ex && ey) || (ex && ez) || (ey && ez)) continue;
      v.set(x, y, z, (m ?? coat)(x, y, z));
    }
  };
  // the body, a fluffy barrel on four stiff legs
  round(0, 9 + k, 0, 5 + k, 3, 8 + k);
  for (const [x, y] of [[1, 0], [1, 4 + k], [7 + k, 0]] as const) v.box(x, y, 0, x + 1, y + 1, 2, (x2, y2, z2) => (z2 === 0 ? black : coat(x2, y2, z2)));
  // the front paw nearest us lifted, stiffly, to be licked
  v.box(7 + k, 5 + k, 2, 8 + k, 6 + k, 3, coat); v.box(8 + k, 7 + k, 3, 9 + k, 7 + k, 4, cream);
  // the head at the front, broad and round, turned to look out
  const hx = 8 + k, top = 14 + k * 2;
  round(hx, hx + 6 + k, -1, 6 + k, 7 + k, top);
  const f = 6 + k, m = hx + 3 + (k ? 1 : 0);
  // the flat Persian face: a dark mask, copper eyes set wide, a pushed-in nose, a pale muzzle
  v.box(hx + 1, f, 9 + k, hx + 5 + k, f, 11 + k, black);
  v.box(hx + 1, f, 10 + k, hx + 2, f, 11 + k, '#c89a3a'); v.box(hx + 4 + k, f, 10 + k, hx + 5 + k, f, 11 + k, '#c89a3a');
  v.set(hx + 2, f, 10 + k, '#140d0a'); v.set(hx + 4 + k, f, 10 + k, '#140d0a');
  v.set(m, f, 9 + k, '#9a786c'); v.box(hx + 2, f, 8 + k, hx + 4 + k, f, 8 + k, cream);
  // small low ears
  v.box(hx, 1, top + 1, hx + 1, 2, top + 1, ginger); v.box(hx + 5 + k, 1, top + 1, hx + 6 + k, 2, top + 1, choc);
  // the tail, up off the back end and curling over
  for (const [x, z] of [[-1, 7], [-2, 8], [-2, 9], [-2, 10], [-1, 11], [0, 12], [1, 12]] as const) v.box(x, 2, z, x, 3, z, z >= 10 ? black : ginger);
  // the rat-hair tufts, sticking out of the coat here and there
  for (const [x, y, z] of [[1, 2, 9 + k], [3, 3, 9 + k], [4, 1, 9 + k], [6, 2, 9 + k], [7, 4, 9 + k], [4, -1, 5], [6, -1, 4], [2, 6 + k, 6], [5, 6 + k, 7], [3, 6 + k, 3], [hx + 7 + k, 3, 12], [hx + 7 + k, 1, 9 + k], [hx + 3, 3, top + 1], [hx + 1, 4, top + 1], [5, 3, 2]] as const) v.set(x, y, z, (x + z) % 2 ? grey : choc);
  if (state === 'scarred') {
    // rows of tooth marks over the crown and down the cheek
    const gouge = '#211c19', scrape = '#a99a8a';
    for (let x = hx + 1; x <= hx + 5; x += 2) { v.set(x, 1, top, gouge); v.set(x, 4, top, gouge); v.set(x + 1, f, 13, gouge); }
    for (const [x, y, z] of [[hx + 2, 2, top], [hx + 4, 3, top], [hx, f - 1, 12]] as const) v.set(x, y, z, scrape);
  }
  if (state === 'sturdy') {
    // the panel on the back of the head, its seam, and the cheap little tab that keeps it shut
    const seam = '#2a2622', plastic = '#d8d4c8';
    for (let x = hx + 2; x <= hx + 5; x++) for (let y = 0; y <= 2; y++) if (x === hx + 2 || x === hx + 5 || y === 0 || y === 2) v.set(x, y, top, seam);
    v.set(hx + 3, -1, top, plastic); v.set(hx + 4, -1, top, plastic); v.set(hx + 3, -1, top + 1, plastic);
  }
  return v;
}

export const ITEMS_B4C: Record<string, Record<string, () => Vox>> = {
  'platinum-sharpening-stone': { rock: sharpeningStone },
  'potion-of-dinosaur-repellent': { plain: () => potion() },
  'potion-of-bloodlust': { plain: () => potion() },
  'rapid-detox': { white: rapidDetox },
  'rockards-ring-of-sniping': { amber: snipingRing },
  'ruckus-buzzsaw': { saw: () => buzzsaw(false), broken: () => buzzsaw(true) },
  'surefire': { case: surefireCase },
  'tome-of-twinkle-toes': { plain: () => tome() },
  'twister': { flying: () => twister('flying'), torn: () => twister('torn'), ballista: () => twister('ballista') },
  'vahana': { legate: vahana },
  'veriluxx-realpet-companion': { toy: () => robotCat('toy'), scarred: () => robotCat('scarred'), sturdy: () => robotCat('sturdy') },
  'wall-of-fire-tome': { plain: () => tome() },
  'scroll-of-water-breathing': { plain: () => scroll() },
  'ring-of-water-breathing': { glowing: waterRing },
};
