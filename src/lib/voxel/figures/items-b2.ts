import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { chamfer } from './itemparts.ts';
import { potion, scroll, ticket, ring } from './itemforms.ts';

/* ---- items, batch b2 (the third floor's loot) ----
   Drawn like the anchor set in items.ts: one object, floating, three-quarter
   view, smooth (chunk 0), facing +y (the lit left face), z up, each look from
   the edition's own words at its point. A colour the book leaves unsaid is a
   plain one; a thing the book names only by its noun is that noun's plain form.
   Shapes and colours only. */

const fresh = () => { const v = new Vox(); v.chunk = 0; return v; };

/** a disc standing in the x-z plane, y0..y1 thick: an octagon, which reads round where a stepped circle reads as a heap */
function disc(v: Vox, cx: number, cz: number, y0: number, y1: number, r: number, m: (x: number, z: number, edge: boolean) => string) {
  const inside = (x: number, z: number) => Math.abs(x - cx) <= r && Math.abs(z - cz) <= r && Math.abs(x - cx) + Math.abs(z - cz) <= r + Math.floor(r / 2);
  for (let x = cx - r; x <= cx + r; x++) for (let z = cz - r; z <= cz + r; z++) {
    if (!inside(x, z)) continue;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !inside(x + a, z + b));
    v.box(x, y0, z, x, y1, z, m(x, z, edge));
  }
}
/** copy a scene into another, moved */
function place(dst: Vox, src: Vox, dx = 0, dy = 0, dz = 0) {
  for (const { p: [x, y, z], mat } of src.all()) dst.set(x + dx, y + dy, z + dz, mat);
}

/* ---- a big top ticket ----
   2:4 a "Big Top Ticket" in a dead clown's inventory, and at 2:9 one is pulled
   out to be read: the book never says what it looks like, so it is the plain
   ticket. */
const bigTopTicket = () => ticket();

/* ---- the anklet ----
   2:6 "the simple anklet. It appeared to be made of wood. It had three little
   beads attached to it that clicked when I shook it, like seed pods." A plain
   wooden band standing on its edge, the three pod-shaped beads hanging off the
   front of its lower curve. */
function anklet(): Vox {
  const v = fresh();
  const wood = '#9a6a3c', grain = '#835730', inner = twin('#835730'), pod = '#6b4524', podLight = '#93653a', tie = '#5c3a20';
  const c = 6, R = 6;
  for (let x = 0; x <= 2 * c; x++) for (let z = 0; z <= 2 * c; z++) {
    const d = Math.hypot(x - c, z - c);
    if (d <= R && d >= R - 1.8) {
      const band = Math.floor((Math.atan2(z - c, x - c) + Math.PI) / (Math.PI / 6)) % 2 ? wood : grain;   // carved in short lengths
      v.set(x, 1, z, band); v.set(x, 0, z, inner);
    }
  }
  // three seed-pod beads, each on a short tie off the band's lower curve, a pod narrow at both ends
  for (const [x, top] of [[2, 2], [6, 0], [10, 2]] as const) {
    v.set(x, 1, top - 1, tie);
    v.box(x, 1, top - 4, x, 2, top - 2, pod); v.box(x - 1, 1, top - 3, x + 1, 1, top - 3, pod);
    v.set(x, 2, top - 3, podLight); v.set(x - 1, 1, top - 3, podLight);
    v.set(x, 1, top - 5, pod);
  }
  return v;
}

/* ---- the fang caps ----
   2:13 "the twin, metallic metal caps ... They looked like a pair of loose
   vampire teeth." The metal is not named yet, so it is a plain one.
   2:14 "both of the golden fangs had resized themselves": gold. Two long
   canines, point down, each open at its top where the tooth goes in. */
function fangCaps(gold: boolean): Vox {
  const v = fresh();
  const metal = gold ? '#d9a93a' : '#a4abb6', shine = gold ? '#f6dc8e' : '#dde0e5', shade = gold ? '#a87a24' : '#7c858e', hollow = '#2a2420';
  // a canine cap from its open top down to its point, [x0, x1, y0, y1] per row
  const rows: [number, number, number, number][] = [[0, 3, 0, 2], [0, 3, 0, 2], [0, 3, 0, 2], [0, 3, 0, 2], [0, 3, 0, 2], [0, 2, 0, 2], [1, 2, 0, 2], [1, 2, 1, 2], [1, 2, 1, 2], [2, 2, 1, 2], [2, 2, 1, 1], [2, 2, 1, 1]];
  const fang = (x0: number, flip: boolean) => {
    const X = (x: number) => x0 + (flip ? 3 - x : x);
    rows.forEach(([a, b, c, d], i) => {
      const z = rows.length - 1 - i;
      for (let x = a; x <= b; x++) for (let y = c; y <= d; y++) {
        if (i === 0 && (x === 0 || x === 3) && (y === 0 || y === 2)) continue;   // the rim's corners rounded
        v.set(X(x), y, z, metal);
      }
    });
    v.box(Math.min(X(1), X(2)), 1, rows.length - 1, Math.max(X(1), X(2)), 1, rows.length - 1, hollow);   // the open top, where the tooth goes in
    for (const z of [4, 5, 6, 7, 8, 9]) v.set(X(1), 2, z, shine);             // the light down its front
    v.set(X(0), 2, 10, shine); v.set(X(2), 2, 2, shine);
    for (const z of [6, 7, 8, 9]) v.set(X(3), 1, z, shade);
  };
  fang(0, false); fang(5, true);
  return v;
}

/* ---- the framed photograph ----
   2:17 "a small, framed picture ... The square photo": a woman in a bikini,
   laughing, sitting on a man's lap, her arm round his shoulder as she takes the
   selfie; at the bar a finger is run "down the glass". A small square frame
   standing on its strut, the glass over the photo. Nobody in it is described
   yet, so they are plain: plain skin, plain hair, a plain bikini, the man in a
   plain top, a plain ground behind them, and a plain brown frame. */
const PHOTO = [
  '...........',
  '.hhh...hhh.',
  'hhssh.hsssh',
  'hssh...sss.',
  'hssh..tssst',
  '.ssssstttt.',
  '.bbsstttttt',
  '..ss.ttttt.',
  '.bbbbbtttt.',
  '..sssssttt.',
  '...........',
];
function framedPhoto(): Vox {
  const v = fresh();
  const frame = '#8a5a32', frameLight = '#a36d40', ground = '#c9c6bd', skin = '#d9a27c', hair = '#2e241d', bikini = '#3f3d3a', top = '#6e6c66';
  const N = 15;
  // the frame: a square, two thick, its lit edges a shade lighter
  for (let x = 0; x <= N - 1; x++) for (let z = 0; z <= N - 1; z++) {
    const rim = x <= 1 || x >= N - 2 || z <= 1 || z >= N - 2;
    if (!rim) continue;
    v.set(x, 1, z, x <= 1 || z >= N - 2 ? frameLight : frame);
    v.set(x, 0, z, frame);
  }
  // the photo inside it, set back a step
  const m: Record<string, string> = { h: hair, s: skin, b: bikini, t: top };
  PHOTO.forEach((row, j) => [...row].forEach((c, i) => v.set(i + 2, 0, N - 3 - j, m[c] ?? ground)));
  // the glass over it, a glint across its corner
  for (const [x, z] of [[2, 12], [3, 12], [2, 11], [11, 2], [12, 2], [12, 3]] as const) v.set(x, 1, z, 'glass');
  // the strut behind, holding it up
  v.box(6, -1, 1, 8, -1, 8, frame); v.box(6, -2, 0, 8, -2, 4, frame); v.box(6, -3, 0, 8, -3, 1, frame);
  return v;
}

/* ---- a soul crystal ----
   2:24 "a golf ball-sized, amber-hued jewel that floated in the middle of the
   room. A stalk of light flowed downward through a small hole in the floor.
   Additional tendrils of golden light whipped about the gem, flying in all
   directions." The jewel in a few amber facets, floating; under it the stalk of
   light, and tendrils of it whipping off to the sides. */
function soulCrystal(): Vox {
  const v = fresh();
  const pavilion = '#b8641a', amber = '#d9851f', facet = '#c06f1a', crown = '#eca23a', table = '#f7c766', glint = '#fff1c8';
  const cx = 7, cy = 7, z0 = 9;
  // the jewel: cut to a point below, wide at its girdle, a crown and a flat table above
  ([[0, 0, pavilion], [1, 1, pavilion], [2, 2, pavilion], [3, 3, amber], [3, 3, amber], [2, 1, crown], [1, 0, table]] as [number, number, string][])
    .forEach(([h, cut], i, all) => chamfer(v, cx - h, cy - h, z0 + i, cx + h, cy + h, z0 + i, cut, all[i][2]));
  for (const [x, y, z] of [[cx - 3, cy + 1, z0 + 3], [cx - 1, cy + 3, z0 + 3], [cx + 1, cy + 3, z0 + 4], [cx + 3, cy - 1, z0 + 4], [cx - 2, cy + 2, z0 + 2], [cx + 2, cy + 2, z0 + 2], [cx + 2, cy - 2, z0 + 3]] as const) if (v.has(x, y, z)) v.set(x, y, z, facet);
  v.set(cx - 1, cy + 1, z0 + 6, glint); v.set(cx - 2, cy + 2, z0 + 5, glint);
  // the stalk of light, down out of its point
  v.box(cx, cy, 0, cx, cy, z0 - 1, 'window');
  // tendrils of golden light whipping off it, each a curl of a few blocks
  const tendril = (pts: [number, number, number][]) => pts.forEach(([x, y, z]) => v.set(cx + x, cy + y, z0 + z, 'window'));
  tendril([[4, 0, 3], [5, 0, 4], [6, -1, 4], [7, -1, 5], [7, -2, 6], [8, -2, 7]]);
  tendril([[-4, 0, 3], [-5, 1, 3], [-6, 1, 2], [-7, 2, 2], [-7, 2, 1]]);
  tendril([[0, 4, 4], [0, 5, 5], [1, 6, 5], [1, 7, 6], [2, 7, 7]]);
  tendril([[1, -4, 4], [1, -5, 5], [0, -6, 6], [-1, -6, 7]]);
  return v;
}

/* ---- the gate pass ----
   2:17 one of "two pieces of paper" in an orc's inventory: "The paper itself
   said" a heading and one line of orders, and a name signed under it. A slip
   of plain paper standing face on, its heading, its one line and the signature
   in a plain dark ink, the lower corner curling. */
function gatePass(): Vox {
  const v = fresh();
  const paper = '#e8dfc4', back = twin('#e8dfc4'), ink = '#2e2a28', curl = '#d6cbab';
  const W = 14, H = 10;
  for (let x = 0; x <= W; x++) for (let z = 0; z <= H; z++) {
    if (x >= W - 1 && z <= 1) continue;                                  // the corner that curls
    v.set(x, 1, z, paper); v.set(x, 0, z, back);
  }
  v.set(W - 1, 2, 1, curl); v.set(W, 2, 2, curl); v.set(W - 2, 2, 0, curl);
  const write = (x0: number, x1: number, z: number) => { for (let x = x0; x <= x1; x++) v.set(x, 1, z, ink); };
  write(4, 10, H - 1); write(5, 9, H - 2);                               // the heading
  write(1, 12, 6); write(1, 7, 5);                                       // the line of orders
  for (const [x, z] of [[7, 2], [8, 3], [9, 2], [10, 3], [11, 2], [12, 2], [8, 1]] as const) v.set(x, 1, z, ink);   // the signature
  return v;
}

/* ---- the mysterious letter ----
   2:17 "a folded piece of paper stained red with blood. I opened it. It was a
   relatively short letter ... The text was all squiggles and triangles." Half
   open: one half lying flat, the other standing at the crease, the squiggles and
   triangles on its inside, blood soaked across both. */
const SCRIPT = [
  '#.#..##.#...#',
  '.#..#..#.#.##',
  '.............',
  '..#..##.#..#.',
  '.###.#.#..###',
  '.............',
  '#..#.#..##...',
  '.##.#.#.#.#..',
];
function mysteriousLetter(): Vox {
  const v = fresh();
  const paper = '#e6dcc2', back = twin('#e6dcc2'), ink = '#2a2622', blood = '#8a1c17', wet = '#a8261e', soak = '#c98d80';
  const W = 14;
  // the standing half: its inside faces +y, the writing on it
  v.box(0, 0, 0, W, 0, 10, back); v.box(0, 1, 0, W, 1, 10, paper);
  SCRIPT.forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') v.set(i + 1, 1, 9 - j, ink); }));
  // the lying half, flat out in front of the crease
  v.box(0, 1, -1, W, 10, -1, back); v.box(0, 2, 0, W, 10, 0, paper);
  // the blood: dark at the heart of each stain, thinning to a pink edge
  const stain = (x: number, y: number, z: number, d: number) => {
    if (d > 3.4 || !v.has(x, y, z) || v.get(x, y, z) === back) return;
    v.set(x, y, z, d < 1.6 ? blood : d < 2.6 ? wet : soak);
  };
  for (let x = 0; x <= W; x++) for (let z = 0; z <= 10; z++) stain(x, 1, z, Math.hypot(x - 13, (z - 9) * 1.2));
  for (let x = 0; x <= W; x++) for (let z = 0; z <= 10; z++) stain(x, 1, z, Math.hypot(x - 12, z - 0) * 1.4);
  for (let x = 0; x <= W; x++) for (let y = 2; y <= 10; y++) stain(x, y, 0, Math.min(Math.hypot(x - 11, y - 2), Math.hypot(x - 3, y - 8) * 1.2));
  return v;
}

/* ---- an earth hobby potion ----
   2:5 "The third item was a potion. An Earth Hobby Potion." Nothing more is
   said of it: the plain potion. */
const hobbyPotion = () => potion();

/* ---- a blitz stick ----
   2:15 "An anti-alcohol ... potion appeared, along with three licorice sticks":
   the blitz sticks. One stick of black licorice, a twisted rope of it, lying
   across the view. */
function blitzStick(): Vox {
  const v = fresh();
  const black = '#352c30', ridge = '#5e4d53', sheen = '#86727a', end = '#231d1f';
  const L = 17;
  for (let x = 0; x <= L; x++) {
    const z = Math.floor(x / 3);                                           // rising along its length
    for (let y = 0; y <= 3; y++) for (let k = 0; k <= 3; k++) {
      if ((y === 0 || y === 3) && (k === 0 || k === 3)) continue;          // its corners cut, so it reads round
      // the twist: a ridge winding round it, one face a step on each block
      const face = k === 3 ? 0 : y === 3 ? 1 : k === 0 ? 2 : y === 0 ? 3 : -1;
      const twist = face >= 0 && (x + face) % 4 < 1;
      const top = k === 3 && (y === 1 || y === 2) && !twist;
      v.set(x, y, z + k, x === 0 || x === L ? end : twist ? ridge : top && x % 4 === 2 ? sheen : black);
    }
  }
  return v;
}

/* ---- the magical pet carrier ----
   2:14 "a square brown box the size of a Rubik's Cube. It had a symbol etched
   on the outside that looked like a fire hydrant", and the pet comes back out
   "with a press of the button". A brown cube, its edges worn round, the hydrant
   cut into its front and the button on top, in a plain grey. */
const HYDRANT = [
  '..###..',
  '.#####.',
  '..###..',
  '#######',
  '..###..',
  '..###..',
  '.#####.',
];
function petCarrier(): Vox {
  const v = fresh();
  const brown = '#8a5a35', edge = '#a06b40', etched = '#5a3820', button = '#8c939b', buttonTop = '#b3b7bd';
  const N = 11;
  chamfer(v, 0, 0, 0, N - 1, N - 1, N - 1, 1, brown);
  for (let x = 1; x <= N - 2; x++) v.set(x, N - 1, N - 1, edge);                       // its lit top edge
  // the hydrant, cut into the front face
  HYDRANT.forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') v.set(i + 2, N - 1, N - 3 - j, etched); }));
  // the button
  v.box(4, 4, N, 6, 6, N, button); v.set(5, 5, N, buttonTop); v.set(4, 6, N, buttonTop);
  return v;
}

/* ---- the scroll of meat hooks ----
   2:17 the elf "only held one other item. A scroll". No more is said of how it
   looks: the plain scroll. */
const meatHooks = () => scroll();

/* ---- the collar ----
   2:5 "a black, magical collar for Mongo". Black, a band to fit a dinosaur's
   neck, lying flat, closed with a plain buckle at the front. */
function collar(): Vox {
  const v = fresh();
  const black = '#26232a', blackLight = '#3a3640', buckle = '#a4abb6';
  const N = 15, H = 3;
  chamfer(v, 0, 0, 0, N - 1, N - 1, H - 1, 4, black);
  // the hole, leaving the band two thick
  for (let x = 2; x <= N - 3; x++) for (let y = 2; y <= N - 3; y++) {
    const dx = Math.min(x - 2, N - 3 - x), dy = Math.min(y - 2, N - 3 - y);
    if (dx + dy >= 3) v.clear(x, y, 0, x, y, H - 1);
  }
  for (let x = 4; x <= N - 5; x++) v.set(x, N - 1, H - 1, blackLight);              // the lit edge of the band
  // the buckle: a plain metal frame on the front, the strap's end through it
  v.box(5, N - 1, -1, 9, N, -1, buckle); v.box(5, N - 1, H, 9, N, H, buckle);
  v.box(5, N, 0, 5, N, H - 1, buckle); v.box(9, N, 0, 9, N, H - 1, buckle);
  v.box(6, N, 0, 8, N, H - 1, black); v.set(7, N, 1, buckle);
  return v;
}

/* ---- the two strength rings ----
   2:6 "I also pulled the two rings off the fingers of the second one ... Both of
   the rings were +2 to strength", and "I rubbed the blood off". Two plain rings
   standing side by side, the second a step behind the first. */
function strengthRings(): Vox {
  const v = fresh();
  place(v, ring(), 0, 0, 0);
  place(v, ring(), 7, -6, 2);
  return v;
}

/* ---- the casino chip ----
   2:13 "the poker chip. It was black with pink, then purple, then pink splotches
   staggered along the edges. A familiar dagger logo adorned the center." A chip
   standing face on, the splotches round its rim, onto both faces and over its
   edge, and the dagger in the middle, point down, in a plain pale steel. */
function casinoChip(): Vox {
  const v = fresh();
  const black = '#1f1c22', blackEdge = '#2e2a33', pink = '#e889b0', purple = '#7a46b0', steel = '#c9ccd1', hilt = '#8c939b';
  const c = 7, r = 7;
  const seq = [pink, purple, pink];
  disc(v, c, c, 0, 2, r, (x, z, edge) => {
    if (!edge) return black;
    const a = (Math.atan2(z - c, x - c) + Math.PI) / (Math.PI * 2);
    const k = Math.floor(a * 18);
    return k % 2 === 0 ? seq[(k / 2) % 3] : blackEdge;
  });
  // the inner ring of the face, a step proud
  disc(v, c, c, 3, 3, r - 2, (x, z, edge) => (edge ? blackEdge : black));
  // the dagger: a broad blade tapering down to its point, the crossguard, the grip and its pommel
  v.box(c - 1, 4, 5, c + 1, 4, 7, steel); v.set(c + 1, 4, 5, hilt);
  v.box(c, 4, 2, c, 4, 4, steel);
  v.box(c - 2, 4, 8, c + 2, 4, 8, hilt);
  v.set(c, 4, 9, hilt); v.set(c, 4, 10, steel);
  return v;
}

/* ---- the scroll of upgrade ----
   2:13 "I received a single scroll. A scroll of Upgrade." Its look is never
   given: the plain scroll. */
const upgradeScroll = () => scroll();

/* ---- the double healing potion ----
   2:11 "the double healing potion, the one Mordecai had mixed last night"; the
   book gives nothing of how it looks, so it is the plain potion. */
const doubleHealing = () => potion();

/* ---- the glass reaper case ----
   2:24 "the small, glass case", the protective carrier a plush figure was kept
   in, its door "a small, hinged flap held closed by a cheap-looking hook and
   eyebolt". The plush taken out of it, it is drawn shut and empty. The glass
   has no frame in the book: its edges catch the light.
   2:25 shut round the overloading gem: "Light streamed from the container like
   a miniature, caged sun ... Lance-like rays burst from the glass ... The case
   itself glowed red hot." */
function reaperCase(burning: boolean): Vox {
  const v = fresh();
  const W = 9, D = 8, H = 11;
  const pane = burning ? 'force' : 'glass', rim = burning ? '#e2471c' : 'domeRim';
  for (let x = 0; x <= W; x++) for (let y = 0; y <= D; y++) for (let z = 0; z <= H; z++) {
    const ex = x === 0 || x === W, ey = y === 0 || y === D, ez = z === 0 || z === H;
    if (!(ex || ey || ez)) continue;
    v.set(x, y, z, (ex ? 1 : 0) + (ey ? 1 : 0) + (ez ? 1 : 0) >= 2 ? rim : pane);
  }
  // the flap in the front, hinged on the left, the hook and eyebolt on the right
  for (let x = 2; x <= 7; x++) for (let z = 2; z <= 9; z++) if (x === 2 || x === 7 || z === 2 || z === 9) v.set(x, D, z, rim);
  v.set(2, D, 3, 'metal'); v.set(2, D, 8, 'metal');
  v.set(7, D, 6, 'metal'); v.set(8, D, 6, 'metalDark'); v.set(8, D + 1, 6, 'metal'); v.set(8, D + 1, 5, 'metal');
  if (!burning) return v;
  // the gem inside, a caged sun
  chamfer(v, 3, 3, 3, 6, 6, 8, 2, 'window');
  chamfer(v, 2, 2, 4, 7, 7, 7, 3, 'window');
  // the red-hot edges of the glass, burning brightest where they turn
  for (const [x, y, z] of [[0, D, 0], [W, D, 0], [0, D, H], [W, 0, H], [0, 0, H], [W, D, H], [W, 0, 0], [0, D, 5], [W, D, 6], [4, D, H], [W, 4, H], [W, D, 3], [5, D, 0]] as const) v.set(x, y, z, 'ember');
  // the rays, bursting out of the glass
  for (const [x, y, z, dx, dy, dz, n] of [
    [W + 1, 4, 6, 1, 0, 0, 4], [5, D + 1, 6, 0, 1, 0, 4], [4, D + 1, 9, 0, 1, 1, 3], [5, 4, H + 1, 0, 0, 1, 4],
    [W + 1, 2, 9, 1, -1, 1, 3], [-1, 4, 6, -1, 0, 0, 3], [2, D + 1, 3, -1, 1, -1, 3],
  ] as const) for (let i = 0; i < n; i++) v.set(x + dx * i, y + dy * i, z + dz * i, 'window');
  return v;
}

export const ITEMS_B2: Record<string, Record<string, () => Vox>> = {
  'big-top-ticket': { plain: bigTopTicket },
  'anklet-of-fallen-oak': { wooden: anklet },
  'fang-caps-of-expectorating-tizheruk': { caps: () => fangCaps(false), golden: () => fangCaps(true) },
  'framed-photograph-of-beatrice-and-brad': { framed: framedPhoto },
  'soul-crystal': { floating: soulCrystal },
  'gate-pass': { slip: gatePass },
  'mysterious-letter': { folded: mysteriousLetter },
  'earth-hobby-potion': { plain: hobbyPotion },
  'blitz-stick': { stick: blitzStick },
  'magical-pet-carrier': { cube: petCarrier },
  'meat-hooks-scroll': { plain: meatHooks },
  'mongos-collar': { black: collar },
  'nicas-strength-rings': { plain: strengthRings },
  'one-hundred-thousand-gold-casino-chip': { chip: casinoChip },
  'scroll-of-upgrade': { plain: upgradeScroll },
  'double-healing-potion': { plain: doubleHealing },
  'sheol-glass-reaper-case': { case: () => reaperCase(false), 'caged-sun': () => reaperCase(true) },
};
