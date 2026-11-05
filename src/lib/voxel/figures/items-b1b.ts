import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { lathe, chamfer } from './itemparts.ts';
import { potion, tome, ring, key } from './itemforms.ts';

/* ---- items, batch b1b ----
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
/** a block standing in the x-z plane with its corners cut back: a panel seen face on */
function panel(v: Vox, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, cut: number, m: string | null) {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const dx = Math.min(x - x0, x1 - x), dz = Math.min(z - z0, z1 - z);
    if (dx + dz >= cut) for (let y = y0; y <= y1; y++) v.set(x, y, z, m);
  }
}
/** a block rounded in the y-z plane: something seen side on from +x, a track's ends, a stick's section */
function sideYZ(v: Vox, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, cut: number, m: string | ((x: number, y: number, z: number) => string)) {
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const dy = Math.min(y - y0, y1 - y), dz = Math.min(z - z0, z1 - z);
    if (dy + dz >= cut) for (let x = x0; x <= x1; x++) v.set(x, y, z, typeof m === 'string' ? m : m(x, y, z));
  }
}
/** a disc standing in the x-z plane, y0..y1 thick: an octagon, which reads round */
function disc(v: Vox, cx: number, cz: number, y0: number, y1: number, r: number, m: string) {
  for (let x = cx - r; x <= cx + r; x++) for (let z = cz - r; z <= cz + r; z++) {
    if (Math.abs(x - cx) + Math.abs(z - cz) <= r + Math.floor(r / 2)) v.box(x, y0, z, x, y1, z, m);
  }
}
/** rows of characters drawn onto the face at y, top row first */
function face(v: Vox, x0: number, y: number, z0: number, rows: string[], pick: (c: string) => string | null) {
  rows.forEach((row, j) => [...row].forEach((c, i) => { const m = pick(c); if (m) v.set(x0 + i, y, z0 + rows.length - 1 - j, m); }));
}

/* 1:12 "Made of skin and fur and the spiky things from the back of" a monster:
   "built like slip on knee bracers", the spikes "thin, needle-like", "about
   eight inches long", popping out "when needed", so the knees are "cosplaying
   as hedgehogs". One pad of the pair, spikes out: a sleeve of fur for the leg,
   a domed cap of skin over the knee to the front (+y), the needles bristling
   off it. No colour is given: a plain grey-brown fur, a plain tan skin, pale
   needles. */
function kneepad(): Vox {
  const v = fresh();
  const skin = '#9a8166', edge = '#7d6750', fur = '#5a4e44', tuft = '#6e6153', inner = '#2f2822', needle = '#d9d3c3', tip = '#f3efe6';
  const cx = 4.5, cy = 3.5;
  // the sleeve, open top and bottom, bound with skin at either end
  lathe(v, cx, cy, 0, 10, () => 4.3, (x, y, z) => (Math.hypot(x - cx, y - cy) <= 2.7 ? null : z === 0 || z === 10 ? edge : (x + y * 2 + z * 3) % 11 === 0 ? tuft : fur));
  lathe(v, cx, cy, 1, 1, () => 2.7, () => inner);
  // the cap over the knee, domed, standing off the front
  panel(v, 0, 7, 1, 9, 7, 9, 3, edge);
  panel(v, 1, 8, 2, 8, 8, 8, 3, skin);
  panel(v, 3, 9, 3, 6, 9, 7, 2, skin);
  // the needles, out of the cap, fanning like a hedgehog's back, and a crest up off the top
  const spike = (p: [number, number, number], d: [number, number, number], n: number) => {
    const k = Math.max(...d.map(Math.abs));
    for (let i = 1; i <= n; i++) v.set(Math.round(p[0] + (d[0] / k) * i), Math.round(p[1] + (d[1] / k) * i), Math.round(p[2] + (d[2] / k) * i), i === n ? tip : needle);
  };
  for (const [x, y, z] of [[2, 8, 3], [7, 8, 3], [2, 8, 7], [7, 8, 7], [4, 9, 6], [5, 9, 4]] as const) spike([x, y, z], [(x - 4.5) * 0.5, 1, (z - 5) * 0.4 + 0.2], 3);
  for (const a of [-60, -20, 20, 60]) {
    const t = (a * Math.PI) / 180, sx = Math.sin(t), sy = Math.cos(t);
    spike([Math.round(cx + 4 * sx), Math.round(cy + 4 * sy), 10], [0.4 * sx, 0.4 * sy, 1], 4);
  }
  return v;
}

/* 1:6 the shirt slipped on under the jacket: "the short-sleeved shirt", "cool
   to the touch and form-fitted to my skin". The troll skin is never coloured:
   a plain dull taupe, the seams a step off. Held up as if worn, the front to +y. */
const SHIRT = [
  '..####....####..',
  '.######..######.',
  '################',
  '################',
  '################',
  '##.##########.##',
  '...##########...',
  '...##########...',
  '...##########...',
  '...##########...',
  '...##########...',
  '...##########...',
  '...##########...',
];
function trollskinShirt(): Vox {
  const v = fresh();
  const hide = '#7b7266', sleeve = twin('#7b7266'), seam = '#655d52', collar = '#4f483f', inside = '#2e2a26';
  const H = SHIRT.length - 1;
  SHIRT.forEach((row, j) => [...row].forEach((c, x) => {
    if (c !== '#') return;
    const z = H - j, arm = (x <= 2 || x >= 13) && z >= 5;
    const m = z === 0 ? seam : arm ? (z === 5 ? seam : sleeve) : hide;
    for (let y = 0; y <= 2; y++) v.set(x, y, z, m);
  }));
  // fitted, so it holds the shape of a chest: the front stands out a little
  panel(v, 4, 3, 1, 11, 3, 9, 2, hide);
  // the neck: the collar round the front, the back of the neckline standing higher inside it
  for (const [x, z] of [[2, 12], [3, 12], [4, 12], [5, 12], [10, 12], [11, 12], [12, 12], [13, 12], [6, 11], [9, 11], [7, 10], [8, 10]] as const) v.set(x, 2, z, collar);
  v.box(6, 0, 11, 9, 0, 11, collar); v.box(7, 0, 10, 8, 1, 10, inside);
  v.box(7, 2, 10, 8, 2, 10, collar);
  return v;
}

/* 1:39 the lottery ticket "the same size" as the other, "only had five spots to
   scratch off. It was red on one side and pink on the other. A small, cartoon
   dragon sat in the corner, holding a spoon. The dragon's tongue was out." Read
   as its face split red and pink. The scratch coating is never coloured: plain
   grey. 2:9 a spot scratched off reveals "a little spinning circle" that
   "flashed back and forth from a red fireball to a pink glob"; 2:22 a second. */
const DRAGON = [
  '#.#...',
  '###..S',
  '#t##.S',
  '.###S.',
  '#..#..',
];
function scratchTicket(scratched: 0 | 1 | 2): Vox {
  const v = fresh();
  const red = '#c22a22', pink = '#e889b0', coat = '#a9adb4', fleck = '#c9ccd1', bare = '#efe6da', ink = '#2a1f1c', spoon = '#d3d6db';
  const W = 12, H = 15;
  for (let x = 0; x <= W; x++) for (let z = 0; z <= H; z++) {
    if ((x === 0 || x === W) && (z === 0 || z === H)) continue;
    const m = x <= 6 ? red : pink;
    v.set(x, 1, z, m); v.set(x, 0, z, twin(m));
  }
  // the dragon in the top corner, a spoon in its claw and its tongue out
  face(v, 1, 1, 9, DRAGON, c => (c === '#' ? ink : c === 'S' ? spoon : c === 't' ? pink : null));
  // the five spots: three across, two below
  const spots: [number, number][] = [[1, 5], [5, 5], [9, 5], [3, 1], [7, 1]];
  spots.forEach(([x, z], i) => {
    if (i < scratched) {
      v.box(x, 1, z, x + 2, 1, z + 2, bare);
      v.set(x + 1, 1, z + 2, red); v.set(x + 1, 1, z + 1, red); v.set(x + 2, 1, z + 1, pink); v.set(x + 1, 1, z, pink);   // the little circle, red half and pink half
    } else {
      v.box(x, 1, z, x + 2, 1, z + 2, coat);
      v.set(x, 1, z + 2, fleck); v.set(x + 2, 1, z, fleck);
    }
  });
  return v;
}

/* 1:10 "The red stick was wet and sticky on the outside, like it was sweating";
   "I lit the long wick, which started hissing and popping like a sparkler."
   A stick lying along x, beaded with sweat, the long wick curling up off its
   end, sparking. The wick is a plain cord. */
function goblinDynamite(): Vox {
  const v = fresh();
  const red = '#b8241d', end = '#8f1b16', sweat = '#e0564c', drip = '#d3443a', cord = '#cdbb8e';
  sideYZ(v, 0, 0, 0, 15, 4, 4, 1, red);
  sideYZ(v, 0, 0, 0, 0, 4, 4, 1, end); sideYZ(v, 15, 0, 0, 15, 4, 4, 1, end);
  // the sweat: wet beads on its skin, a drip or two hanging off the underside
  for (const [x, y, z] of [[2, 4, 3], [5, 4, 2], [8, 4, 3], [11, 4, 1], [13, 4, 3], [4, 3, 4], [9, 2, 4], [12, 3, 4], [6, 1, 4]] as const) v.set(x, y, z, sweat);
  for (const [x, y, z] of [[3, 5, 2], [10, 5, 3], [7, 5, 1]] as const) v.set(x, y, z, drip);
  v.set(6, 3, -1, drip); v.set(12, 2, -1, drip);
  // the long wick out of its end, curling up and over
  const path: [number, number, number][] = [[16, 2, 2], [17, 2, 3], [18, 2, 5], [18, 2, 7], [17, 2, 9], [16, 2, 10], [15, 2, 10]];
  for (let i = 1; i < path.length; i++) bar(v, path[i - 1], path[i], cord);
  // lit: the end hisses and pops like a sparkler
  v.set(14, 2, 10, 'ember'); v.set(13, 2, 10, 'flame');
  for (const [x, y, z] of [[12, 2, 12], [13, 3, 12], [12, 1, 9], [11, 2, 11], [14, 3, 11], [12, 3, 8], [11, 1, 10], [14, 1, 12]] as const) v.set(x, y, z, 'flame');
  return v;
}

/* 1:2 "the size of a tractor and ran on treads, like a tank", "built out of
   mismatched, rusting hunks of metal", "a spinning, spike-covered wheel
   dominated the front", "black smoke billowed from several pipes". The metal
   is not coloured there, so plain greys (which 1:5 bears out: "random hunks of
   silver-colored metal"). A chibi of itself, its front to +y so the wheel is
   seen. Its riders are left off: one object. From the street the top is only
   a dark well.
   1:3 aboard: "nothing but a fur-lined, recessed hole with benches running the
   length", the driver's "seat up front", "a dozen levers and spigots and
   vibrating handles", "smoke billowed and steam hissed from multiple pipes",
   and "a small ladder near the back... made of bones tied with rope". The fur,
   the benches and the wheel are never coloured: plain ones. */
function murderDozer(aboard: boolean): Vox {
  const v = fresh();
  const plates = ['#a4abb6', '#8d949c', '#b3b7bd', '#7f8790'], rust = '#8a4b2a', rust2 = '#a55d32', rivet = '#5d636b';
  const tread = '#2b2e32', lug = '#40454b', hub = '#6b737c', drum = '#3b3f47', cap = '#5d646e', spike = '#c3c8d0';
  const pipe = '#454b52', smoke = '#3a3a40', smoke2 = '#4e4e55', steam = '#e3e7ea', well = '#1e1b19';
  const L = 10, W = 11;                                                        // the hull's length along y, its width along x
  // the treads, one either side, rounded at the ends, ridged, road wheels on their outer faces
  for (const [x0, x1] of [[0, 1], [W - 1, W]] as const) {
    sideYZ(v, x0, -1, 0, x1, L + 1, 3, 2, tread);
    for (let y = 0; y <= L; y += 2) v.box(x0, y, 3, x1, y, 3, lug);
    const out = x0 === 0 ? 0 : W;
    for (const y of [1, 4, 7, 10]) v.set(out, y, 1, hub);
  }
  // the hull: mismatched plates, a few of them rusting through, riveted
  const plateAt = (x: number, y: number, z: number) => plates[(Math.floor(y / 3) * 3 + Math.floor(z / 3) * 2 + (x < 6 ? 1 : 0)) % 4];
  for (let x = 1; x <= W - 1; x++) for (let y = 0; y <= L; y++) for (let z = 3; z <= 8; z++) {
    if (z >= 8 && (x === 1 || x === W - 1) && (y === 0 || y === L)) continue;
    v.set(x, y, z, plateAt(x, y, z));
  }
  for (const [x, y, z] of [[3, L, 5], [4, L, 5], [4, L, 4], [W - 1, 3, 6], [W - 1, 4, 6], [W - 1, 4, 7], [8, L, 7], [W - 1, 8, 4], [7, 0, 8]] as const) v.set(x, y, z, rust);
  for (const [x, y, z] of [[3, L, 4], [W - 1, 3, 7], [9, L, 7], [W - 1, 9, 4]] as const) v.set(x, y, z, rust2);
  for (let x = 2; x <= W - 2; x += 3) v.set(x, L, 7, rivet);
  for (let y = 1; y <= L - 1; y += 3) v.set(W - 1, y, 7, rivet);
  // the well in the top
  v.clear(3, 2, 6, W - 3, L - 2, 8);
  v.box(3, 2, 5, W - 3, L - 2, 5, well);
  if (aboard) {
    // fur over its floor and up its walls, a bench down either side, the driver's seat up front among the levers
    const fur = '#7a6450', tuft = '#8d7660', bench = '#5c3a20', seat = '#4a3b30', lever = '#9aa0a8', knob = '#2b2e32';
    v.box(3, 2, 5, W - 3, L - 2, 5, fur);
    for (const [x, y] of [[4, 3], [7, 5], [5, 4], [8, 2]] as const) v.set(x, y, 5, tuft);
    for (let x = 2; x <= W - 2; x++) for (let y = 1; y <= L - 1; y++) for (let z = 6; z <= 8; z++) if (v.has(x, y, z) && (x === 2 || x === W - 2 || y === 1 || y === L - 1) && z === 8) v.set(x, y, z, fur);   // fur over the lip
    v.box(3, 2, 6, 3, L - 5, 6, bench); v.box(W - 3, 2, 6, W - 3, L - 5, 6, bench);
    v.box(5, L - 4, 6, 6, L - 3, 6, seat); v.box(5, L - 4, 7, 6, L - 4, 8, seat);
    for (const [x, h] of [[3, 9], [4, 10], [5, 9], [6, 10], [7, 9], [8, 10]] as const) { v.box(x, L - 2, 6, x, L - 2, h, lever); v.set(x, L - 2, h + 1, knob); }
    // the ladder of bones near the back, up its right side, tied with rope
    const bone = '#e6dcc0', rope = '#a08a5a';
    v.box(W + 1, 1, 0, W + 1, 1, 8, bone); v.box(W + 1, 4, 0, W + 1, 4, 8, bone);
    for (const z of [2, 5, 8]) { v.box(W + 1, 2, z, W + 1, 3, z, bone); v.set(W + 1, 1, z, rope); v.set(W + 1, 4, z, rope); }
  }
  // the pipes, several, and the black smoke billowing back off them
  const pipes: [number, number, number][] = [[1, 1, 11], [W - 1, 1, 10], [W - 1, 6, 9], [1, 6, 9]];
  for (const [x, y, top] of pipes) { v.box(x, y, 7, x, y, top, pipe); v.set(x, y, top + 1, 'black'); }
  const puff = (x: number, y: number, z: number, m: string) => { chamfer(v, x, y, z, x + 2, y + 2, z, 1, m); chamfer(v, x, y, z + 1, x + 2, y + 2, z + 1, 0, m); chamfer(v, x, y, z + 2, x + 2, y + 2, z + 2, 1, m); };
  puff(0, -1, 12, smoke); puff(0, -2, 13, smoke2);
  puff(W - 2, 0, 11, smoke2); puff(W - 1, -2, 13, smoke);
  if (aboard) { puff(W - 2, 5, 10, steam); puff(0, 5, 10, steam); }
  // the spiked wheel across the front, on an arm from either side
  for (const x of [1, W - 1]) bar(v, [x, L, 6], [x, L + 3, 3], '#6b737c');
  const cy = L + 4, cz = 3;
  for (let x = 2; x <= W - 2; x++) for (let y = cy - 3; y <= cy + 3; y++) for (let z = cz - 3; z <= cz + 3; z++) {
    const d = Math.hypot(y - cy, z - cz);
    if (d <= 2.9) v.set(x, y, z, x === 2 || x === W - 2 ? (d < 1.2 ? spike : cap) : drum);
  }
  // the spikes, studding the drum in staggered rows
  for (let x = 3; x <= W - 3; x++) for (let k = 0; k < 8; k++) {
    if ((x + k) % 2) continue;
    const a = (k / 8) * Math.PI * 2;
    v.set(x, Math.round(cy + Math.cos(a) * 3.9), Math.round(cz + Math.sin(a) * 3.9), spike);
  }
  return v;
}

/* 1:5 "The Goblin Pass took the form of the same goblin-shaped skull from the
   top of the box. The symbol appeared floating in the air", then branded
   itself onto the forearm. The mark itself, floating: a skull, narrow-jawed and
   pointed at the chin, in a plain tattoo ink, holes cut through. */
const SKULL = [
  '...#####...',
  '.#########.',
  '###########',
  '###########',
  '##...#...##',
  '##...#...##',
  '###.###.###',
  '.####.####.',
  '.####.####.',
  '..#######..',
  '..#.#.#.#..',
  '...#####...',
  '....###....',
  '.....#.....',
];
function goblinPass(): Vox {
  const v = fresh();
  const ink = '#4a5770', inkBack = '#36404f';
  face(v, 0, 1, 0, SKULL, c => (c === '#' ? ink : null));
  face(v, 0, 0, 0, SKULL, c => (c === '#' ? inkBack : null));
  return v;
}

/* 1:30 "It looked like a silver, oversized lollipop with a button on the
   handle." The round end faces +y; the button is a plain dark one. */
function gooInator(): Vox {
  const v = fresh();
  const silver = '#c3c8d0', rim = twin('#c3c8d0'), shine = '#eef1f5', shade = '#9ea4ad', button = '#3a3f46';
  const cx = 6.5, cz = 15.5;
  for (let x = 0; x <= 13; x++) for (let z = 9; z <= 22; z++) {
    const d = Math.hypot(x - cx, z - cz);
    if (d <= 6.6) v.box(x, 0, z, x, 1, z, rim);
    if (d <= 5.6) v.set(x, 2, z, silver);                                     // the face, proud of the rim
  }
  for (const [x, z] of [[3, 18], [4, 19], [3, 17], [5, 20], [4, 18]] as const) v.set(x, 2, z, shine);
  for (const [x, z] of [[10, 13], [9, 12], [10, 14]] as const) v.set(x, 2, z, shade);
  // the handle, and its button on the front
  v.box(6, 0, 0, 7, 1, 9, silver);
  v.box(6, 0, 0, 7, 1, 0, shade);
  v.set(6, 2, 5, button); v.set(7, 2, 5, button);
  return v;
}

/* 1:41 "It was shaped like a spatula." Nothing more, so a plain one: a flat
   grey blade, a plain dark handle, lying along y, the blade to the front. */
function spatula(): Vox {
  const v = fresh();
  const blade = '#a4abb6', edge = '#c3c8d0', neck = '#7c858e', grip = '#3b3530', end = twin('#3b3530');
  v.box(5, 0, 3, 7, 9, 4, grip);
  v.box(5, 0, 3, 7, 0, 4, end);
  v.box(6, 10, 3, 6, 11, 3, neck); v.box(6, 12, 2, 6, 13, 2, neck); v.box(6, 14, 1, 6, 14, 1, neck);
  chamfer(v, 1, 14, 0, 11, 23, 0, 1, blade);
  v.box(2, 23, 0, 10, 23, 0, edge);
  return v;
}

/* 1:41 "A burned triangle of toast jumped out" of the plain metal toaster. A
   triangle of a slice standing on its point, the crust down two sides and
   standing proud, the cut edge rising across it, all of it toasted dark and
   blackened in patches. */
function manaToast(): Vox {
  const v = fresh();
  const crumb = '#7a4622', toasted = '#5e3418', char = '#2a1a10', crust = '#43281a', cut = '#8a5530';
  const N = 13;
  for (let x = 0; x <= N; x++) for (let z = 0; z <= x; z++) {
    const rim = x === N || z === 0, edge = x - z <= 1;
    for (let y = 0; y <= 2; y++) v.set(x, y, z, rim ? crust : edge && y < 2 ? cut : (x * 3 + z * 5) % 7 < 2 ? toasted : crumb);
    if (rim) v.set(x, 3, z, crust);
  }
  // burned: blackened patches on its face, worst toward the crust
  for (const [x, z] of [[12, 1], [11, 1], [12, 2], [11, 2], [12, 4], [12, 5], [10, 3], [9, 1], [8, 1], [12, 8], [11, 9], [9, 5], [7, 3], [5, 2], [10, 7], [12, 11]] as const) if (v.get(x, 2, z) !== crust) v.set(x, 2, z, char);
  return v;
}

/* 1:40 the launcher: "the tall MOAB" on "the newly-built bike trailer",
   "built using broken hunks of wood, and the spare chopper wheels" (the
   chopper's are "solid and black", 1:16), with "the equally-tall seat" behind
   it where she sits "facing backward". The launcher is "a curved,
   ski-jump-like ramp made from a pair of spare-part chopper wheel wells, with
   a pair of half-pipe channels at the end", "tiny, shock-absorbing
   front-wheelchair coasters for the very end", "two chambers on either side",
   and "two levers next to" the chair, "the red one and the black one". A bomb
   waits on the platform: "the size of a snowboard, but it was shaped and
   weighted like a champion pinewood derby car", on free weights for wheels.
   The words painted on its side are left off. The ramp, chambers, seat and bomb
   are never coloured: plain ones. Its hitch to -x, the ramp running down to
   +x, so its curve is the lit side. */
function motherOfAllBombs(): Vox {
  const v = fresh();
  const planks = ['#8a5a32', '#7a4e2b', '#6b4325'], tyre = '#302d35', hubC = '#55505c', capC = '#a4abb6';
  const ramp = '#8d949c', wall = twin('#8d949c'), strut = '#6b737c', chamberC = '#5d646e', seat = '#4a3b30';
  const bombC = '#6e6a62', weight = '#26262b', coaster = '#1b1714';
  // the trailer: a bed of broken planks, ragged at the ends, a hitch bar out front
  for (let x = 0; x <= 12; x++) {
    const m = planks[(x >> 1) % 3];
    const y0 = x === 12 ? 1 : 0, y1 = x === 0 ? 7 : x === 11 ? 7 : 8;
    v.box(x, y0, 3, x, y1, 3, m);
  }
  v.box(-4, 4, 3, -1, 4, 3, strut); v.box(-5, 3, 3, -5, 5, 3, strut);
  // its two wheels, off the chopper, solid black, a cap on each hub
  for (const [y0, y1, out] of [[-2, -1, -3], [9, 10, 11]] as const) {
    disc(v, 6, 1, y0, y1, 3, tyre);
    v.set(6, out, 1, capC); disc(v, 6, 1, out === 11 ? y1 : y0, out === 11 ? y1 : y0, 1, hubC); v.set(6, out, 1, capC);
  }
  // the tall seat at the front, its back to the hitch, facing down the ramp
  v.box(1, 3, 4, 2, 5, 9, strut);
  v.box(0, 2, 10, 3, 6, 10, seat);
  v.box(0, 2, 11, 0, 6, 14, seat);
  // the two levers beside it: red, and black
  v.box(3, 1, 8, 3, 1, 12, strut); v.box(3, 1, 13, 3, 1, 13, 'red');
  v.box(3, 7, 8, 3, 7, 12, strut); v.box(3, 7, 13, 3, 7, 13, coaster);
  // the ramp: a platform level with the seat, then the ski-jump curve down off the back of the trailer
  const top = 10, foot = 1, x0 = 7, x1 = 19;
  const zAt = (x: number) => (x <= x0 ? top : Math.round(foot + (top - foot) * ((x1 - x) / (x1 - x0)) ** 2));
  for (let x = 4; x <= x1; x++) {
    const z = zAt(x), zNext = x < x1 ? zAt(x + 1) : z;
    for (let zz = zNext; zz <= z; zz++) {
      v.box(x, 3, zz, x, 5, zz, ramp);                       // the floor, stepped down without a gap
      for (const y of [2, 6]) v.box(x, y, Math.max(foot, zz - 2), x, y, zz + 1, wall);   // the wheel wells' sides, deep
    }
    // the pair of half-pipe channels at the end: a ridge down the middle
    if (x >= 15) v.set(x, 4, zNext + 1, wall);
  }
  // struts from the bed up under the ramp
  for (const x of [5, 8, 11]) for (const y of [2, 6]) { const z = zAt(x); if (z > 4) v.box(x, y, 4, x, y, z - 1, strut); }
  // the coasters at the very end, inches off the ground
  for (const y of [2, 6]) { v.box(x1, y, foot - 1, x1, y, foot - 1, strut); v.box(x1 - 1, y, foot - 2, x1, y, foot - 3, coaster); }
  // the two chambers either side of the launcher's top
  for (const [y0, y1] of [[0, 1], [7, 8]] as const) { chamfer(v, 4, y0, 7, 7, y1, 11, 1, chamberC); v.box(4, y0, 7, 7, y1, 7, twin(chamberC)); }
  // a bomb on the platform: a long wedge, high at the back, on free weights
  v.box(4, 3, 11, 9, 5, 11, bombC);
  v.box(4, 3, 12, 6, 5, 12, bombC); v.box(4, 3, 13, 4, 5, 13, twin(bombC));
  for (const x of [5, 8]) { v.box(x, 2, 11, x, 2, 12, weight); v.box(x, 6, 11, x, 6, 12, weight); }
  return v;
}

/* 1:12 "a scrap of paper called a Neighborhood Map". Nothing more is said: a
   pale torn scrap, a corner curling, a map's plain lines on it in plain ink. */
const MAP = [
  '...#######..',
  '.##########.',
  '############',
  '###########.',
  '############',
  '.###########',
  '############',
  '############',
  '.##########.',
  '..#####.###.',
];
// the map's plain lines: a street that bends, two that cross it, a block between them
const STREETS = [
  '............',
  '....#.......',
  '....#.......',
  '....##......',
  '.....#......',
  '############',
  '.....#...#..',
  '.##..#...#..',
  '.##..#...#..',
  '.....#......',
];
function neighborhoodMap(): Vox {
  const v = fresh();
  const paper = '#dccba1', worn = '#cdb98d', ink = '#5a4a3a', curl = twin('#dccba1');
  MAP.forEach((row, j) => [...row].forEach((c, i) => {
    if (c !== '#') return;
    const x = i, y = 11 - j;
    v.set(x, y, 0, STREETS[j][i] === '#' ? ink : (x * 7 + y * 3) % 13 === 0 ? worn : paper);
  }));
  // two corners curling up off it
  v.clear(10, 10, 0, 11, 11, 0); v.box(10, 10, 1, 11, 10, 1, curl); v.set(11, 10, 2, curl);
  v.clear(0, 2, 0, 1, 3, 0); v.box(1, 2, 1, 1, 3, 1, curl); v.set(1, 2, 2, curl);
  return v;
}

/* 1:5 "a small pile of what looked like dry cat food": the enhanced one "looks
   like a regular pet biscuit", "small, smaller than my fingernail, brown,
   hard, and round with a crumbly texture". A heap of them, each a round
   pebble, the touching ones a tone apart. */
function petBiscuits(): Vox {
  const v = fresh();
  const brown = '#8a5530', crumb = '#ad7843';
  const nug = (x: number, y: number, z: number, m: string) => {
    chamfer(v, x, y, z, x + 4, y + 4, z, 2, m);
    chamfer(v, x, y, z + 1, x + 4, y + 4, z + 1, 1, m);
    chamfer(v, x, y, z + 2, x + 4, y + 4, z + 2, 2, m);
    v.set(x + 1, y + 4, z + 1, crumb); v.set(x + 4, y + 2, z + 1, crumb); v.set(x + 2, y + 1, z + 2, crumb);
  };
  const dark = '#74451f';
  nug(0, 0, 0, brown); nug(6, 1, 0, dark); nug(1, 6, 0, dark); nug(7, 7, 0, brown);
  nug(3, 3, 2, brown);
  for (const [x, y, z] of [[12, 4, 0], [2, 12, 0], [11, 11, 0]] as const) v.set(x, y, z, crumb);
  return v;
}

export const ITEMS_B1B: Record<string, Record<string, () => Vox>> = {
  'spiked-kneepads-of-shade-gnoll-riot-forces': { spiked: kneepad },
  'toe-ring-of-splatter-skunk': { plain: () => ring() },
  'trollskin-shirt-of-pummeling': { 'short-sleeved': trollskinShirt },
  'fireball-or-custard': { fresh: () => scratchTicket(0), 'one-scratched': () => scratchTicket(1), 'two-scratched': () => scratchTicket(2) },
  'goblin-dynamite': { lit: goblinDynamite },
  'goblin-murder-dozer': { charging: () => murderDozer(false), boarded: () => murderDozer(true) },
  'goblin-pass': { mark: goblinPass },
  'goo-inator-3000': { lollipop: gooInator },
  'gorgon-marital-aid': { spatula },
  'heal-critter-spell-book': { plain: () => tome() },
  'healing-potion': { red: () => potion({ liquid: '#c22a22' }) },
  'iron-skin-potion': { plain: () => potion() },
  'mana-toast': { burned: manaToast },
  'master-pen-key': { plain: () => key() },
  'tome-of-minion-army': { plain: () => tome() },
  'mother-of-all-bombs': { launcher: motherOfAllBombs },
  'neighborhood-map': { scrap: neighborhoodMap },
  'pet-biscuit': { pile: petBiscuits },
};
