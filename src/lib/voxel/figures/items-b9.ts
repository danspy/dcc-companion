import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { lathe, chamfer } from './itemparts.ts';
import { scroll, tome, tgheeBack } from './itemforms.ts';

/* ---- items, batch b9 ----
   Drawn like the anchor set in items.ts: one object, floating, three-quarter
   view, smooth (chunk 0), facing +y (the lit left face), z up. Each look from
   the edition's own words at its point; a colour the book leaves unsaid is a
   plain one. Where the book gives only the noun, the noun's plain form, the
   same as every other of its kind on the site. Shapes and colours only. */

const fresh = () => { const v = new Vox(); v.chunk = 0; return v; };

/** a straight bar of voxels from one point to another, stepped along its longest axis */
function bar(v: Vox, a: [number, number, number], b: [number, number, number], m: string) {
  const n = Math.max(...a.map((p, i) => Math.abs(b[i] - p)));
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0;
    v.set(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), m);
  }
}
/** a disc standing in the x-z plane, y0..y1 thick: an octagon, which reads round */
function disc(v: Vox, cx: number, cz: number, y0: number, y1: number, r: number, m: string) {
  for (let x = cx - r; x <= cx + r; x++) for (let z = cz - r; z <= cz + r; z++) {
    if (Math.abs(x - cx) + Math.abs(z - cz) <= r + Math.floor(r / 2)) v.box(x, y0, z, x, y1, z, m);
  }
}
/** a block rounded in the y-z plane: something seen side on from +x, a stick's section */
function sideYZ(v: Vox, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, cut: number, m: string) {
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const dy = Math.min(y - y0, y1 - y), dz = Math.min(z - z0, z1 - z);
    if (dy + dz >= cut) v.box(x0, y, z, x1, y, z, m);
  }
}
/** rows of characters drawn onto the x-z plane at y, top row first, from (x0, z0 + rows - 1) */
function face(v: Vox, x0: number, y: number, z0: number, rows: string[], pick: (c: string) => string | null) {
  rows.forEach((row, j) => [...row].forEach((c, i) => { const m = pick(c); if (m) v.set(x0 + i, y, z0 + rows.length - 1 - j, m); }));
}

/* ---- the tracking tag ----
   8:98 "I had a dart sticking out of my leg. I hadn't felt it". Only the noun: the
   plain dart, drawn exactly as every plain dart on the site is (a steel point, a
   grey barrel, a slim shaft and four pale flights), pointing down to the front. */
function dart(): Vox {
  const v = fresh();
  const point = '#dfe3e8', barrel = '#8c939b', grip = '#6b727b', shaft = '#4a4f58', flight = '#d4cfc2', flight2 = twin('#d4cfc2');
  const dy = -Math.SQRT1_2, dz = Math.SQRT1_2;
  const ox = 3, oy = 13, oz = 0;
  for (let x = -1; x <= 7; x++) for (let y = -2; y <= 16; y++) for (let z = -1; z <= 18; z++) {
    const px = x - ox, py = y - oy, pz = z - oz;
    const t = py * dy + pz * dz;                                   // along the dart
    const ny = py - t * dy, nz = pz - t * dz;
    const across = ny * -dz + nz * dy;                             // the other way across it
    const r = Math.hypot(px, across);
    let m: string | null = null;
    if (t >= -0.4 && t < 4.5 && r <= 0.55) m = point;
    else if (t >= 4.5 && t < 9.5 && r <= 1.25) m = Math.floor(t) % 2 ? grip : barrel;
    else if (t >= 9.5 && t < 13 && r <= 0.55) m = shaft;
    else if (t >= 12 && t <= 17.5) {
      const w = Math.min(3, (t - 11.5) * 0.9);
      if (Math.abs(px) <= w && Math.abs(across) <= 0.5) m = flight;
      else if (Math.abs(across) <= w && Math.abs(px) <= 0.5) m = flight2;
    }
    if (m) v.set(x, y, z, m);
  }
  return v;
}

/* ---- the xl pet carrier ----
   8:61 "Mordecai held up the pet carrier, which had some sort of device installed
   on the outside. 'This is an XL pet carrier.'" Nothing more of this one: the form
   a pet carrier takes in the book (2:14, a square brown box, called out with "a
   press of the button"), a size up, and the device a plain grey box bolted to its
   front. Its symbol is not mentioned, so none is cut. */
function xlCarrier(): Vox {
  const v = fresh();
  const brown = '#8a5a35', edge = '#a06b40', button = '#8c939b', buttonTop = '#b3b7bd';
  const plate = '#454b52', box = '#7c858e', boxTop = '#9aa1aa', vent = '#2f3237', bolt = '#b3b7bd';
  const N = 14;
  chamfer(v, 0, 0, 0, N - 1, N - 1, N - 1, 1, brown);
  for (let x = 1; x <= N - 2; x++) v.set(x, N - 1, N - 1, edge);                // its lit top edge
  for (let y = 1; y <= N - 2; y++) v.set(N - 1, y, N - 1, edge);
  // the button on top
  v.box(5, 5, N, 8, 8, N, button); v.box(6, 6, N, 7, 7, N, buttonTop);
  // the device: a plate bolted to the front, a grey box on it with a vent in its face
  v.box(2, N, 2, 11, N, 9, plate);
  for (const [x, z] of [[2, 2], [11, 2], [2, 9], [11, 9]] as const) v.set(x, N + 1, z, bolt);
  chamfer(v, 4, N + 1, 3, 9, N + 3, 8, 1, box);
  v.box(5, N + 1, 8, 8, N + 3, 8, boxTop);
  for (const z of [4, 6]) v.box(5, N + 4, z, 8, N + 4, z, vent);
  return v;
}

/* ---- the enriched pet biscuit ----
   8:16 "It was a glowing, familiar little item. An enhanced pet biscuit", which is
   "small... brown, hard, and round with a crumbly texture" (1:5); "the crumbly little
   treat". So the enhanced biscuit's own form, its brown and its crumbs, and the glow
   of a magic thing standing off it in sparks; the glow's colour is never given, so
   it is the warm enchanted glow. */
function enrichedBiscuit(): Vox {
  const v = fresh();
  const brown = '#8a5530', crumb = '#ad7843';
  chamfer(v, 2, 2, 0, 7, 7, 0, 2, brown);
  chamfer(v, 1, 1, 1, 8, 8, 1, 2, brown);
  chamfer(v, 0, 0, 2, 9, 9, 4, 2, brown);
  chamfer(v, 1, 1, 5, 8, 8, 5, 2, brown);
  chamfer(v, 2, 2, 6, 7, 7, 6, 2, brown);
  for (const [x, y, z] of [[3, 9, 3], [7, 9, 2], [9, 4, 3], [9, 7, 4], [4, 6, 6], [6, 3, 6], [2, 8, 5]] as const) v.set(x, y, z, crumb);
  for (const [x, y, z] of [[11, 7, -1], [3, 12, -1], [6, 12, -2]] as const) v.set(x, y, z, crumb);
  // the glow, in sparks round it and a light on its crown
  for (const [x, y, z] of [[-2, 6, 6], [5, -2, 8], [12, 2, 5], [1, 12, 4], [11, 11, 7], [-1, -1, 2], [8, 13, 1]] as const) v.set(x, y, z, 'window');
  v.set(4, 4, 6, 'window'); v.set(5, 5, 6, 'window');
  return v;
}

/* ---- the desperado pass ----
   1:19 a tattoo that brands itself on: on Donut "it looked like nothing but a
   gold-colored splotch" through her fur; on Carl's neck, "'It's a dagger dripping
   blood,' Donut said, examining it close." (1:32 "the tattoo of the dagger on my
   neck"; 3:25 Katia's forms "on her neck", the same.) The mark itself, floating, flat
   like every pass tattoo on the site: a dagger point down, in the gold the book gives
   the mark, blood running off its blade and dripping from its point. */
function daggerMark(): Vox {
  const v = fresh();
  const gold = '#d9a42a', fuller = '#f0c65a', grip = '#b98a20', back = '#a87a1a';
  // laid on the diagonal, the pommel up at the left and the point down at the right
  const ox = 1.5, oz = 15.5, ax = Math.SQRT1_2, az = -Math.SQRT1_2;
  for (let x = -1; x <= 15; x++) for (let z = -1; z <= 17; z++) {
    const dx = x - ox, dz = z - oz, t = dx * ax + dz * az, u = dx * -az + dz * ax;
    let m: string | null = null;
    if (t >= -0.6 && t < 1.8) { if (Math.abs(u) <= 1.4) m = gold; }                                // the pommel
    else if (t >= 1.8 && t < 5.2) { if (Math.abs(u) <= 0.75) m = Math.floor(t) % 2 ? grip : gold; } // the grip, wrapped
    else if (t >= 5.2 && t < 6.9) { if (Math.abs(u) <= 3.6) m = grip; }                             // the guard
    else if (t >= 6.9 && t <= 20) {
      const w = 1.55 * (1 - (t - 6.9) / 14) + 0.2;                                                   // the blade, narrowing to its point
      if (Math.abs(u) <= w) m = Math.abs(u) < 0.4 && t < 17 ? fuller : gold;
    }
    if (m) { v.set(x, 1, z, m); v.set(x, 0, z, back); }
  }
  // the blood: runs down off the blade's underside, and drops falling from its point
  const blood = '#b3201b', bloodDark = '#7d1714';
  const under = (x: number) => { for (let z = -2; z <= 17; z++) if (v.has(x, 1, z)) return z; return 99; };
  for (const [x, run, drop] of [[9, 1, 3], [12, 2, 0], [15, 1, 3]] as const) {
    const z = under(x);
    for (let k = 1; k <= run; k++) { v.set(x, 1, z - k, blood); v.set(x, 0, z - k, bloodDark); }
    if (drop) { v.set(x, 1, z - run - drop, blood); v.set(x, 0, z - run - drop, bloodDark); }
  }
  return v;
}

/* ---- the tome of magic missile ----
   1:7 "a silver adventurer box that contained a book", the note over it naming the
   tome. Nothing else: the plain tome. */
const magicMissileTome = () => tome();

/* ---- the ping tome ----
   4:32 "The black, leather hardback was warm to the touch and had a skull on the
   cover." The plain tome in black leather, the skull set in its front board; the
   skull's colour is never given, so it is a plain bone. */
const SKULL = ['.#####.', '#######', '#..#..#', '###.###', '.#####.', '.#.#.#.'];
function pingTome(): Vox {
  const v = tome({ cover: '#2a272e', pages: '#e3d7b8' });
  const bone = '#d8cfb6';
  SKULL.forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') v.set(2 + i, 4 + j, 5, bone); }));
  return v;
}

/* ---- the residents' wheelchair train ----
   1:37 "They'd taken the wheels from multiple wheelchairs that no longer had owners
   and affixed them to long pieces of wood", "more like a train or a set of
   rollercoaster cars", the riders "sitting upon their own chairs, which sat locked in
   place, two by two"; "The individual cars were attached to one another by a set of
   glowing metal chains", one chain running on up to the two pulling at the front;
   "He even added ramps so they can get on and off easily." A chibi of itself: two of
   its ten cars, running along x with the front at +x, so its side is the lit face,
   the chain's lead trailing off ahead and a ramp off the back. The riders are left
   off: one object. Wood, chairs and their seats are never coloured: plain ones; the
   chain's glow is the warm enchanted glow. */
function wheelchairTrain(): Vox {
  const v = fresh();
  const plank = '#8a5a35', plankDark = '#7a4c2c', tyre = '#302d35', hub = '#9aa1aa', frame = '#a4abb6', seat = '#4a5060', seatBack = twin('#4a5060');
  const link = '#b3b7bd';
  const L = 8, W = 7;
  const wheel = (cx: number, cz: number, y: number, r: number, m = tyre) => { disc(v, cx, cz, y, y, r, m); if (r > 1) disc(v, cx, cz, y, y, r - 1, hub); v.set(cx, y, cz, m === tyre || r > 1 ? hub : tyre); };
  const chair = (x0: number, y0: number) => {
    v.box(x0, y0 + 1, 5, x0 + 2, y0 + 2, 5, seat);                   // the seat
    v.box(x0, y0 + 1, 6, x0, y0 + 2, 8, seatBack);                   // the back
    v.set(x0 - 1, y0, 9, frame); v.set(x0 - 1, y0 + 3, 9, frame);    // the push handles
    v.box(x0, y0, 4, x0, y0, 8, frame); v.box(x0, y0 + 3, 4, x0, y0 + 3, 8, frame);
    v.box(x0 + 3, y0 + 1, 4, x0 + 3, y0 + 2, 4, frame);              // the footrest
    wheel(x0 + 1, 5, y0, 1, frame); wheel(x0 + 1, 5, y0 + 3, 1, twin(frame));
  };
  const car = (x0: number) => {
    for (let y = 0; y <= W; y++) v.box(x0, y, 3, x0 + L, y, 3, y % 2 ? plankDark : plank);   // the boards, lengthwise
    v.box(x0 + 1, 1, 2, x0 + L - 1, W - 1, 2, plankDark);                                     // the bed under them
    for (const wx of [x0 + 2, x0 + L - 2]) { wheel(wx, 2, -1, 2); wheel(wx, 2, W + 1, 2); }  // the wheelchair wheels it runs on
    chair(x0 + 3, 0); chair(x0 + 3, 4);
  };
  car(0); car(L + 3);
  // the chain, glowing, along both edges of the cars, across the gap between them and on ahead
  const end = 2 * L + 3 + 4;
  for (const y of [0, W]) for (let x = 0; x <= end; x++) {
    const onCar = x <= L || (x >= L + 3 && x <= 2 * L + 3);
    const yy = x > 2 * L + 3 ? (y === 0 ? Math.min(3, x - 2 * L - 3) : W - Math.min(3, x - 2 * L - 3)) : y;
    const z = onCar ? 4 : 3;
    if (!v.has(x, yy, z) || onCar) { if (!(onCar && v.has(x, yy, z) && v.get(x, yy, z) !== plank)) v.set(x, yy, z, x % 2 ? 'window' : link); }
  }
  // the ramp off the back, for getting on and off
  for (let i = 0; i <= 3; i++) v.box(-1 - i, 2, 3 - i, -1 - i, 5, 3 - i, i % 2 ? plankDark : plank);
  return v;
}

/* ---- the spike module ----
   3:1 "Each of them were tiny cubes about the size of a pair of dice." Nothing
   else, and nothing to tell it from the alarm module beside it: the same small
   rounded cube in a plain grey. */
function moduleCube(): Vox {
  const v = fresh();
  const grey = '#8c939b';
  chamfer(v, 1, 1, 0, 7, 7, 0, 1, grey);
  chamfer(v, 0, 0, 1, 8, 8, 7, 1, grey);
  chamfer(v, 1, 1, 8, 7, 7, 8, 1, grey);
  return v;
}

/* ---- donut's claw caps ----
   8:9 "They're a little translucent, so I bought the red ones," Rosetta said,
   "putting the four caps on the table." Four little red caps, each a claw's hook
   standing on its point, open at its top where the claw goes in, a paler red where
   the light comes through, in a slight arc as they sit on the paw. */
function clawCaps(): Vox {
  const v = fresh();
  const red = '#c22a22', light = '#e8675f', dark = '#8e1c17', hollow = '#3a0f0d';
  // a claw's hook in profile: the open collar at its back, the curve over the top, the point down at the front
  const HOOK = [
    '###.....',
    '#####...',
    '.######.',
    '...#####',
    '.....###',
    '......##',
    '.......#',
  ];
  const cap = (x0: number, y0: number) => {
    HOOK.forEach((row, j) => [...row].forEach((c, i) => {
      if (c !== '#') return;
      const z = HOOK.length - 1 - j, thick = i >= 6 ? 1 : 2;
      for (let y = 0; y <= thick; y++) {
        const top = j === 0 || HOOK[j - 1][i] !== '#';
        v.set(x0 + i, y0 + y - (thick === 1 ? 0 : 0), z, top && y === thick ? light : y === 0 ? dark : red);
      }
    }));
    v.set(x0, y0 + 1, 6, hollow); v.set(x0, y0 + 1, 5, hollow);              // the open collar
  };
  cap(0, 15); cap(1, 10); cap(1, 5); cap(0, 0);
  return v;
}

/* ---- quint's starter kit ----
   2:15 "a suitcase filled with everything you need to start your own pharmaceutical
   empire"; "The suitcase was actually a large chest. I had to move my bottle out of
   the way for it to fit on the table. It was filled to the brim with chemicals and
   herbs. Mordecai opened it up". A big chest, its lid thrown open at the back,
   bottles and bundles of herbs heaped to its brim. Wood, glass and the chemicals are
   never coloured: plain brown planks, plain glass, a plain grey liquid; the herbs a
   plain green. */
function starterKit(): Vox {
  const v = fresh();
  const wood = '#8a5a35', seam = '#74482a', rim = '#a06b40', lidIn = '#6e4428';
  const liquid = '#8c9aa8', cork = '#b08758', herb = '#5f8a46', herbDark = twin('#5f8a46'), stalk = '#8a7a4a', packet = '#e3d7b8';
  const W = 15, D = 9, H = 5;
  v.box(0, 0, 0, W, D, H, wood);
  v.clear(1, 1, 1, W - 1, D - 1, H);
  for (let x = 0; x <= W; x++) { v.set(x, D, 2, seam); v.set(x, D, H, rim); v.set(x, 0, H, rim); }
  for (let y = 0; y <= D; y++) { v.set(W, y, 2, seam); v.set(W, y, H, rim); v.set(0, y, H, rim); }
  // the lid, thrown back and standing up behind the chest, its inside to the front
  v.box(0, -2, H + 1, W, -1, H + 7, wood);
  v.box(1, -1, H + 2, W - 1, -1, H + 6, lidIn);
  // what fills it: herbs to the brim, bottles of chemicals standing up out of them, a packet
  v.box(1, 1, 1, W - 1, D - 1, H - 1, herbDark);
  for (let x = 1; x <= W - 1; x++) for (let y = 1; y <= D - 1; y++) if ((x * 3 + y * 5) % 7 < 3) v.set(x, y, H, (x + y) % 2 ? herb : herbDark);
  const bottle = (cx: number, cy: number, h: number) => {
    const top = H - 2 + h;
    lathe(v, cx, cy, H - 2, top, z => (z >= top - 1 ? 0.6 : 1.3), (x, y, z) => (x === cx && y === cy && z < top - 1 ? liquid : 'glass'));
    v.set(cx, cy, top + 1, cork);
  };
  bottle(3, 3, 5); bottle(6, 7, 4); bottle(11, 3, 6); bottle(13, 7, 4); bottle(8, 3, 4); bottle(3, 7, 3);
  // bundles of herbs, tied, lying across the top
  for (const [x, y] of [[9, 6], [5, 4]] as const) { v.box(x, y, H + 1, x + 2, y + 1, H + 1, herb); v.box(x - 1, y, H + 1, x - 1, y + 1, H + 1, stalk); }
  v.box(12, 5, H + 1, 13, 5, H + 2, packet);
  return v;
}

/* ---- heal, heal critter, wand recharge ----
   1:25 "a dozen Heal scrolls"; 1:5 "a single rolled-up piece of paper", the Scroll
   of Heal Critter; 5:62 "The recharge wand scroll". Each only its noun: the plain
   scroll, like every scroll the book leaves at that. */
const plainScroll = () => scroll();

/* ---- the jellyfish salve ----
   4:11 "'It's a lotion bottle, Carl,' Donut said". Only the noun: a plain lotion
   bottle, a flat rounded body, a pump on its neck with the spout to the front; the
   bottle and its pump are never coloured, so a plain white and a plain grey. */
function lotionBottle(): Vox {
  const v = fresh();
  const body = '#e9e5dc', shoulder = twin('#e9e5dc'), pump = '#9aa1aa', pumpTop = '#b8bec6', collar = '#7c858e';
  chamfer(v, 0, 0, 0, 8, 5, 10, 2, body);
  chamfer(v, 1, 0, 11, 7, 5, 11, 3, shoulder);
  v.box(3, 2, 12, 5, 3, 12, collar);                       // the collar on its neck
  v.box(4, 2, 13, 4, 3, 14, pump);                         // the stem
  v.box(3, 1, 15, 5, 4, 16, pump); v.box(3, 1, 16, 5, 4, 16, pumpTop);
  v.box(4, 5, 16, 4, 7, 16, pump); v.set(4, 8, 15, collar);  // the spout, out to the front
  return v;
}

/* ---- the mairmei mushroom ----
   4:6 "There was also a small bowl on the table. It had a trio of shriveled, black
   plants within. Mushrooms, I realized." 4:8 the system names them. Three shrivelled
   black mushrooms standing crooked in the little bowl they came in; the bowl is never
   coloured, so a plain earthen one. */
function mushrooms(): Vox {
  const v = fresh();
  const bowl = '#8f6a48', bowlIn = '#5e4430', black = '#1f1c22', sheen = '#3f3a45', stem = '#2b2730';
  const c = 6;
  const R = (z: number) => [3.4, 4.7, 5.6, 6.1][z] ?? 0;
  lathe(v, c, c, 0, 3, R, (x, y, z) => (z >= 1 && Math.hypot(x - c, y - c) <= R(z) - 1.1 ? null : bowl));
  lathe(v, c, c, 1, 1, () => 3.6, () => bowlIn);
  // three of them, each a crooked stalk under a shrivelled cap that droops off to one side
  const shroom = (x: number, y: number, h: number, lean: number, droop: [number, number]) => {
    for (let z = 2; z <= h; z++) v.set(x + (z > h - 2 ? lean : 0), y, z, stem);
    const tx = x + lean;
    chamfer(v, tx - 1, y - 1, h + 1, tx + 1, y + 1, h + 1, 1, black);
    v.box(tx - 1, y - 1, h + 1, tx + 1, y + 1, h + 1, black);
    v.clear(tx + 1, y - 1, h + 1, tx + 1, y - 1, h + 1);                                // a corner shrivelled away
    v.box(tx, y, h + 2, tx, y + 1, h + 2, black); v.set(tx - 1, y + 1, h + 2, sheen);  // its wrinkled crown
    v.set(tx + droop[0], y + droop[1], h, black); v.set(tx + droop[0], y + droop[1], h - 1, black);   // the edge hanging down
  };
  shroom(4, 5, 6, -1, [-2, 0]);
  shroom(8, 5, 5, 1, [2, 1]);
  shroom(6, 8, 4, 0, [0, 2]);
  return v;
}

/* ---- the adept's fountain pen ----
   7:75 "A fountain pen. Adept's fountain pen. The most basic of all the
   calligrapher's implements." Only the noun: a plain fountain pen, its nib down to
   the front, a dark barrel with a steel band and clip, a steel nib with its slit. */
function fountainPen(): Vox {
  const v = fresh();
  const nib = '#d6dadf', slit = '#5d646e', body = '#2c2f36', grip = '#3b3f47', band = '#b3b7bd', end = '#22252b';
  const ax = 0.62, az = 0.78;                                    // along it, rising to the back right
  for (let x = -2; x <= 17; x++) for (let y = -1; y <= 3; y++) for (let z = -2; z <= 20; z++) {
    const t = x * ax + z * az;                                   // distance from the nib's tip
    const across = -x * az + z * ax, py = y - 1;
    const rr = Math.hypot(across, py);
    let m: string | null = null;
    if (t >= -0.3 && t < 5) { const w = 0.45 + t * 0.26; if (Math.abs(across) <= w && Math.abs(py) <= 0.5) m = Math.abs(across) < 0.45 && t > 1.2 && t < 4.2 ? slit : nib; }
    else if (t >= 5 && t < 7.5) { if (rr <= 1.2) m = grip; }
    else if (t >= 7.5 && t < 21) { if (rr <= 1.5) m = t >= 12 && t < 13 ? band : t >= 20 ? end : body; }
    if (m) v.set(x, y, z, m);
  }
  // the clip, along its top side by the back
  for (let t = 14; t <= 19; t++) { const x = Math.round(t * ax - 1.9 * az), z = Math.round(t * az + 1.9 * ax); v.set(x, 1, z, band); }
  return v;
}

/* ---- the upgrade coupons ----
   3:2 "It was just seven slips of paper", each a coupon for what it buys, and "the
   fine print on the coupons". Three slips standing one behind another, each printed
   with a line for what it is for and rows of fine print under it; paper and ink are
   never coloured, so a plain pale paper and a plain dark ink. */
function coupons(): Vox {
  const v = fresh();
  const paper = '#e6d9b0', edge = twin('#e6d9b0'), ink = '#3a3530', fine = '#a39878';
  const slip = (x0: number, y0: number, z0: number) => {
    for (let x = 0; x <= 11; x++) for (let z = 0; z <= 6; z++) { v.set(x0 + x, y0 + 1, z0 + z, paper); v.set(x0 + x, y0, z0 + z, edge); }
    v.box(x0 + 2, y0 + 2, z0 + 5, x0 + 9, y0 + 2, z0 + 5, ink);        // what it is for
    for (const z of [3, 1]) for (let x = 1; x <= 10; x++) if (x % 3) v.set(x0 + x, y0 + 2, z0 + z, fine);   // the fine print
  };
  slip(4, 0, 6); slip(2, 3, 3); slip(0, 6, 0);
  return v;
}

/* ---- growler gary's left hands ----
   3:26 "Mongo quickly and efficiently chomped off the hyena's two arms right at the
   elbow", "picking up both of the hairy, severed arms", one "placed on the
   hand-shaped key console", and "You must use your left hand". One left forearm,
   palm down as it lies on the console, the fingers to the front and the thumb on
   its right, the bitten end at the elbow at the back; the fur is never coloured, so
   a plain dull brown, the nails a plain dark. */
function severedHand(): Vox {
  const v = fresh();
  const fur = '#8f7a5c', tuft = '#6f5d45', finger = twin('#8f7a5c'), nail = '#2e2a26', flesh = '#a3302a', fleshDark = '#7a1f1b', bone = '#e2d8c0';
  // the forearm, rounded across, from the bitten elbow at the back to the wrist
  for (let x = 1; x <= 5; x++) for (let z = 0; z <= 4; z++) {
    const dx = Math.min(x - 1, 5 - x), dz = Math.min(z, 4 - z);
    if (dx + dz >= 1) v.box(x, -10, z, x, -1, z, fur);
  }
  for (const [x, y] of [[2, -2], [4, -4], [3, -6], [2, -8], [4, -7], [3, -3]] as const) v.set(x, y, 5, tuft);   // the hair along its back
  for (const [y, z] of [[-3, 2], [-5, 3], [-8, 2], [-6, 1]] as const) v.set(6, y, z, tuft);
  // the bitten end, cut off ragged so its raw face looks up, the two bones showing
  v.clear(1, -10, 3, 5, -10, 4); v.clear(1, -9, 4, 5, -9, 4);
  for (let x = 2; x <= 4; x++) { v.set(x, -10, 2, flesh); v.set(x, -9, 3, flesh); }
  v.set(1, -10, 2, fleshDark); v.set(5, -10, 2, fleshDark); v.set(1, -9, 3, fleshDark); v.set(5, -9, 3, fleshDark);
  v.set(2, -10, 3, bone); v.set(4, -10, 3, bone);
  // the back of the hand, a little flatter than the arm
  chamfer(v, 0, 0, 0, 6, 4, 2, 1, fur);
  // four fingers lying out to the front, apart, a dark nail at each tip
  [[0, 3], [2, 4], [4, 4], [6, 3]].forEach(([x, len], i) => { v.box(x, 5, 0, x, 4 + len, 1, i % 2 ? finger : fur); v.set(x, 5 + len, 0, nail); });
  // the thumb, on its right, angled out
  v.box(7, 1, 0, 7, 3, 1, finger); v.box(8, 3, 0, 8, 4, 0, finger); v.set(8, 5, 0, nail);
  return v;
}

/* ---- the enchanted xistera extension slot ----
   4:34 "It was a curved piece of wicker basket, though it glowed with enchantment",
   which "slid easily onto the scoop", "the round slot" a head fits face-first into;
   "the wicker-like substance" with "the tiny inscription on the side". 6:54 it
   attaches "with a click". In the xistera's own wicker, alternating bands of the
   weave: a round slot facing the front, the curved sleeve that slides onto the scoop
   behind it, its rim and a few strands glowing with the warm enchanted glow, the
   inscription a short dark line on its side. */
function extensionSlot(): Vox {
  const v = fresh();
  const wicker = '#c9a467', weave = '#b8925a', inner = '#8e6c3c', pale = '#f2d48a', ink = '#5a4326';
  const rib = (n: number) => (n % 2 ? wicker : weave);
  const cx = 6, cz = 8;
  // the round slot: a deep ring facing +y, its bottom closed at the back
  for (let x = 0; x <= 12; x++) for (let z = 2; z <= 14; z++) {
    const d = Math.hypot(x - cx, z - cz);
    if (d > 6.2) continue;
    if (d > 4.4) { for (let y = 4; y <= 7; y++) v.set(x, y, z, rib(y + Math.floor(Math.atan2(z - cz, x - cx) * 3))); v.set(x, 8, z, d > 5.4 ? pale : 'window'); }
    else { v.set(x, 4, z, inner); }
  }
  // the curved sleeve behind it, a trough that slides onto the end of the scoop
  for (let y = -3; y <= 3; y++) for (let x = 1; x <= 11; x++) for (let z = 0; z <= 6; z++) {
    const d = Math.hypot(x - cx, (z - 7) * 1.1);
    if (d <= 5.6 && d >= 4.2 && z <= 5) v.set(x, y, z, rib(y));
  }
  for (const [x, y, z] of [[2, -2, 3], [10, 0, 2], [6, -3, 1]] as const) v.set(x, y, z, 'window');
  // the tiny inscription on its side
  v.box(11, -1, 3, 11, 2, 3, ink); v.set(11, 0, 2, ink); v.set(11, 2, 2, ink);
  return v;
}

/* ---- hobgoblin dynamite ----
   2:13 "a whole box of hobgoblin dynamite"; "The sticks were white instead of red.
   They had a larger yield and were much more stable." A stick like the goblin
   dynamite beside it, white, dry (it does not sweat like the unstable red), its
   cord wick curling up off its end, not lit. */
function hobDynamite(): Vox {
  const v = fresh();
  const white = '#e8e4da', end = '#c9c3b6', cord = '#cdbb8e', paper = twin('#e8e4da');
  sideYZ(v, 0, 0, 0, 15, 4, 4, 1, white);
  sideYZ(v, 0, 0, 0, 0, 4, 4, 1, end); sideYZ(v, 15, 0, 0, 15, 4, 4, 1, end);
  for (const x of [3, 12]) sideYZ(v, x, 0, 0, x, 4, 4, 1, paper);              // its wrapper's seams
  const path: [number, number, number][] = [[16, 2, 2], [17, 2, 3], [18, 2, 5], [18, 2, 7], [17, 2, 9], [16, 2, 10], [15, 2, 10]];
  for (let i = 1; i < path.length; i++) bar(v, path[i - 1], path[i], cord);
  return v;
}

/* ---- stout, greased lightning ----
   6:7 "three common utility cards", "the third was a Stout card"; 6:11 "another
   called Greased Lightning". T'Ghee cards whose faces are never described: the back
   every T'Ghee card has in common (6:4). 6:16 "Green, which was the color of a
   common card": the Stout card's rim takes it from there; Greased Lightning's rarity
   is never given. */
const cardBack = () => tgheeBack();
const commonCardBack = () => tgheeBack('#3f9a4a');

/* ---- the knife of frozen tears ----
   6:59 "It was a small, crystal knife. It looked like a butter knife. It glinted
   with red light." "made of something called Sylvan crystal. It's not very sharp".
   A butter knife in pale crystal, blunt and round at its tip, its flat to the front,
   red glints along its edge and on its handle. */
function crystalKnife(): Vox {
  const v = fresh();
  const crystal = '#dfe9f0', facet = '#b7c8d6', handle = '#c6d5e0', glint = '#e5463d';
  // the handle, a slim rounded rod, and the neck into the blade
  v.box(0, 0, 2, 6, 1, 3, handle); v.set(0, 0, 2, facet); v.set(0, 1, 3, facet);
  v.box(7, 1, 2, 7, 1, 3, facet);
  // the blade, its flat to the front, taller than the handle, its spine level with the handle's top,
  // blunt along its edge and round at its tip
  for (let x = 8; x <= 19; x++) {
    const z0 = x === 8 ? 1 : x >= 18 ? 1 : 0, z1 = x === 19 ? 2 : 3;
    for (let z = z0; z <= z1; z++) v.set(x, 1, z, z === z0 && x < 18 ? facet : crystal);
  }
  // the red glints
  for (const [x, y, z] of [[10, 1, 2], [13, 1, 1], [16, 1, 3], [3, 1, 3], [12, 1, 3]] as const) if (v.has(x, y, z)) v.set(x, y, z, glint);
  return v;
}

/* ---- carl's father's glock ----
   6:45 "a 9mm Glock"; 6:46 "I had my dad's Glock out, and I turned it over in my
   hands, examining it. He'd taken pretty good care of it." Only the noun: a plain
   pistol side on to the front, the muzzle to the right; its colour is never given,
   so a plain dark grey, the slide a shade lighter. */
function pistol(): Vox {
  const v = fresh();
  const slide = '#4a4e56', slideTop = '#5c616a', frame = '#34373d', grip = '#2b2d32', stipple = '#3a3d44', sight = '#1c1d21', bore = '#141416';
  // the slide, the length of the gun, serrations at its back
  v.box(0, 0, 8, 15, 3, 10, slide); v.box(0, 0, 10, 15, 3, 10, slideTop);
  for (const x of [1, 3]) v.box(x, 3, 8, x, 3, 9, frame);
  v.set(14, 1, 11, sight); v.set(14, 2, 11, sight); v.set(1, 1, 11, sight); v.set(1, 2, 11, sight);
  v.box(15, 1, 9, 15, 2, 9, bore);
  // the frame under it, and the trigger guard
  v.box(4, 0, 7, 13, 3, 7, frame);
  v.box(5, 0, 4, 9, 3, 4, frame); v.box(9, 0, 5, 9, 3, 6, frame);
  v.box(6, 1, 5, 6, 2, 6, sight);                                              // the trigger
  // the grip, raked back, its face stippled
  for (let z = 0; z <= 7; z++) { const s = Math.floor((7 - z) / 3); v.box(0 - s, 0, z, 4 - s, 3, z, grip); }
  for (const [x, z] of [[1, 5], [3, 5], [2, 3], [0, 3], [1, 1], [-1, 1]] as const) v.set(x, 3, z, stipple);
  v.box(-3, 0, 0, 2, 3, 0, frame);                                              // the magazine's base
  return v;
}

/* ---- the folder of court documents ----
   6:45 "I picked up a folder filled with court documents. I took it without looking
   at it." A folder lying shut and fat with papers, their edges showing unevenly
   along its open sides, its tab at the back; the folder is never coloured, so a
   plain buff card, the papers plain white. */
function courtFolder(): Vox {
  const v = fresh();
  const card = '#c9b17c', cardEdge = twin('#c9b17c'), paper = '#efeadf', paperEdge = '#d9d2c2', line = '#9a9282';
  const W = 13, D = 10;
  v.box(0, 0, 0, W, D, 0, cardEdge);                            // the back
  v.box(0, 0, 1, W - 1, D - 1, 3, paper);                       // the papers
  for (const z of [1, 3]) for (let x = 0; x <= W - 1; x++) v.set(x, D - 1, z, paperEdge);
  v.box(2, D, 2, 7, D, 2, paper); v.box(W, 3, 1, W, 7, 1, paper);            // sheets standing out of the stack
  v.box(9, D, 1, 11, D, 1, paperEdge);
  v.box(0, 0, 4, W, D, 4, card);                                // the front
  v.box(0, 0, 0, 0, D, 4, cardEdge);                            // the fold, at the left
  v.box(3, -1, 0, 6, -1, 4, card);                              // the tab at the back
  for (const [x0, x1, z] of [[3, 8, 2], [3, 6, 1]] as const) v.box(x0, D, z, x1, D, z, line);
  return v;
}

/* ---- all eyes on me ----
   5:72 Donut's song, sheet music "something between a scroll and a magic book"
   (5:67). Never described further: the plain sheet of music, drawn exactly as the
   site draws every one (a pale sheet a little bowed, two staves of plain ink). */
function sheetMusic(): Vox {
  const v = fresh();
  const paper = '#e6dcc0', back = twin('#e6dcc0'), line = '#8a8170', ink = '#2a2622';
  const W = 11, H = 14;
  for (let x = 0; x <= W; x++) for (let z = 0; z <= H; z++) { v.set(x, 1, z, paper); v.set(x, 0, z, back); }
  v.clear(W - 1, 0, 0, W, 1, 1); v.set(W - 1, 2, 1, back); v.set(W, 2, 2, back); v.set(W - 1, 2, 2, back);
  for (const top of [12, 6]) for (const z of [top, top - 2, top - 4]) for (let x = 1; x <= W - 1; x++) v.set(x, 1, z, line);
  const notes: [number, number][] = [[2, 9], [5, 11], [8, 10], [2, 4], [5, 2], [8, 3]];
  for (const [x, z] of notes) { v.box(x, 1, z, x + 1, 1, z, ink); v.box(x + 1, 1, z + 1, x + 1, 1, z + 2, ink); }
  return v;
}

/* ---- the automaton guide ----
   5:33 "It was a regular paperback featuring a familiar, smiling dwarf riding on the
   back of a mechanical horse thing." A thin paperback standing on its tail, the
   cover to the front: on it the little dwarf, bearded, astride a jointed metal horse.
   The cover is the plain slate the paperback has on the table it was found on; the
   picture's colours are never given, so plain ones. (The autograph is inside.) */
const RIDER = [
  '...sss.....',
  '...sss.....',
  '...bbb.....',
  '..cbbbc....',
  '..ccccc.mjm',
  '...ccc..mmm',
  '.mmmmmmmm..',
  'mmmmmmmmm..',
  '.mmmmmmmm..',
  '.j.j..j.j..',
  '.m.m..m.m..',
  '.m.m..m.m..',
];
function automatonGuide(): Vox {
  const v = fresh();
  const cover = '#5a6270', board = twin('#5a6270'), pages = '#e3d7b8', leaf = '#cfc3a2';
  const metal = '#a4abb6', joint = '#5d646e', skin = '#e0b48c', beard = '#8a8478', coat = '#7a5236';
  const W = 11, H = 15;
  v.box(1, 1, 1, W - 1, 1, H - 1, pages);
  for (let z = 3; z <= H - 2; z += 3) v.set(W - 1, 1, z, leaf);
  v.box(0, 0, 0, W, 0, H, board);                               // the back cover
  v.box(0, 0, 0, 0, 2, H, board);                               // the spine
  v.box(0, 2, 0, W, 2, H, cover);                               // the front cover
  face(v, 0, 2, 1, RIDER, c => ({ s: skin, b: beard, c: coat, m: metal, j: joint } as Record<string, string>)[c] ?? null);
  return v;
}

/* ---- the spider stalker ----
   5:60 "the twenty, rat-sized automaton spiders", poured from a bag: "They dropped
   out, rolling away like spilled tennis balls. Legs appeared from the metallic
   balls". A small metal ball, flat on top, its seam round the middle, standing on
   eight jointed legs; the metal is never coloured, so a plain grey. */
function spiderBot(): Vox {
  const v = fresh();
  const metal = '#8c939b', seam = '#6b727b', shine = '#c3c8d0', leg = '#5d646e', foot = '#454b52';
  const ox = 4, oy = 4;
  chamfer(v, ox + 1, oy + 1, 3, ox + 5, oy + 5, 3, 1, metal);
  chamfer(v, ox, oy, 4, ox + 6, oy + 6, 7, 2, metal);
  chamfer(v, ox + 1, oy + 1, 8, ox + 5, oy + 5, 8, 1, metal);
  for (let x = ox; x <= ox + 6; x++) for (let y = oy; y <= oy + 6; y++) if (v.has(x, y, 5) && (!v.has(x + 1, y, 5) || !v.has(x, y + 1, 5) || !v.has(x - 1, y, 5) || !v.has(x, y - 1, 5))) v.set(x, y, 5, seam);
  v.set(ox + 1, oy + 5, 7, shine); v.set(ox + 2, oy + 6, 7, shine); v.set(ox + 1, oy + 4, 8, shine);
  // eight legs, four a side, each up to a knee and down to a foot
  const legs: [number, number, number, number][] = [   // from (x, y) on the body, out to (dx, dy)
    [ox, oy + 1, -4, -2], [ox, oy + 3, -4, 0], [ox, oy + 5, -4, 1], [ox + 1, oy + 6, -3, 3],
    [ox + 6, oy + 1, 3, -3], [ox + 6, oy + 3, 4, -1], [ox + 6, oy + 5, 4, 1], [ox + 5, oy + 6, 2, 4],
  ];
  for (const [x, y, dx, dy] of legs) {
    const kx = x + Math.round(dx * 0.6), ky = y + Math.round(dy * 0.6);
    bar(v, [x, y, 5], [kx, ky, 7], leg);
    bar(v, [kx, ky, 7], [x + dx, y + dy, 1], leg);
    v.set(x + dx, y + dy, 0, foot);
  }
  return v;
}

export const ITEMS_B9: Record<string, Record<string, () => Vox>> = {
  'tracking-tag': { dart },
  'xl-pet-carrier': { device: xlCarrier },
  'enriched-pet-biscuit': { glowing: enrichedBiscuit },
  'desperado-pass': { dagger: daggerMark },
  'tome-of-magic-missile': { plain: magicMissileTome },
  'ping-tome': { skull: pingTome },
  'residents-wheelchair-train': { cars: wheelchairTrain },
  'spike-module': { cube: moduleCube },
  'donuts-claw-caps': { red: clawCaps },
  'quints-starter-kit': { open: starterKit },
  'heal-scroll': { plain: plainScroll },
  'scroll-of-heal-critter': { plain: plainScroll },
  'jellyfish-salve': { bottle: lotionBottle },
  'mairmei-mushroom': { trio: mushrooms },
  'adepts-fountain-pen': { plain: fountainPen },
  'upgrade-coupon': { slips: coupons },
  'growler-garys-left-hands': { severed: severedHand },
  'xistera-extension-slot': { slot: extensionSlot },
  'hobgoblin-dynamite': { stick: hobDynamite },
  'stout-card': { back: cardBack, common: commonCardBack },
  'greased-lightning-card': { back: cardBack },
  'knife-of-frozen-tears': { crystal: crystalKnife },
  'carls-fathers-glock': { plain: pistol },
  'folder-of-court-documents': { shut: courtFolder },
  'wand-recharge-scroll': { plain: plainScroll },
  'all-eyes-on-me-sheet-music': { plain: sheetMusic },
  'dr-ratchets-guide': { paperback: automatonGuide },
  'spider-stalker': { legs: spiderBot },
};
