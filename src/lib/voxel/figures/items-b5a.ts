import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { chamfer } from './itemparts.ts';
import { potion, tome, table, piercing } from './itemforms.ts';

/* ---- items, set b5a (book 5) ----
   Drawn like the anchor set in items.ts: one object, floating, three-quarter
   view, smooth (chunk 0), facing +y (the lit left face), z up. Each look from
   the edition's own description at its point; a colour the book leaves unsaid
   is a plain one. Shapes and colours only. */

const fresh = () => { const v = new Vox(); v.chunk = 0; return v; };

/** a straight bar of voxels from one point to another, stepped along its longest axis */
function bar(v: Vox, a: [number, number, number], b: [number, number, number], m: string) {
  const n = Math.max(...a.map((p, i) => Math.abs(b[i] - p)));
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0;
    v.set(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), m);
  }
}
/** a block standing in the x-z plane with its corners cut back: a panel seen face on (null carves) */
function panel(v: Vox, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, cut: number, m: string | null) {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const dx = Math.min(x - x0, x1 - x), dz = Math.min(z - z0, z1 - z);
    if (dx + dz >= cut) for (let y = y0; y <= y1; y++) v.set(x, y, z, m);
  }
}
/** a block lying in the x-y plane with its corners cut back (null carves) */
function flat(v: Vox, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, cut: number, m: string | null) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    const dx = Math.min(x - x0, x1 - x), dy = Math.min(y - y0, y1 - y);
    if (dx + dy >= cut) for (let z = z0; z <= z1; z++) v.set(x, y, z, m);
  }
}
/** a disc standing in the x-z plane, y0..y1 thick: an octagon, which reads round where a stepped circle reads as a heap */
function disc(v: Vox, cx: number, cz: number, y0: number, y1: number, r: number, m: string | null) {
  for (let x = cx - r; x <= cx + r; x++) for (let z = cz - r; z <= cz + r; z++) {
    if (Math.abs(x - cx) + Math.abs(z - cz) <= r + Math.floor(r / 2)) for (let y = y0; y <= y1; y++) v.set(x, y, z, m);
  }
}
/** rows of characters drawn onto the face at y, top row first, from (x0, z0 + rows - 1) */
function face(v: Vox, x0: number, y: number, z0: number, rows: string[], pick: (c: string) => string | null) {
  rows.forEach((row, j) => [...row].forEach((c, i) => { const m = pick(c); if (m) v.set(x0 + i, y, z0 + rows.length - 1 - j, m); }));
}

/* ---- a song of skedaddle ----
   5:67 "a sheet of music", which "was something between a scroll and a magic
   book": if a song is sung badly "the page tore just a little bit", so it is
   one page. No colours are given: a plain pale sheet standing a little bowed,
   two staves of plain ink across it and the notes on them. */
function sheetMusic(): Vox {
  const v = fresh();
  const paper = '#e6dcc0', back = twin('#e6dcc0'), line = '#8a8170', ink = '#2a2622';
  const W = 11, H = 14;
  for (let x = 0; x <= W; x++) for (let z = 0; z <= H; z++) { v.set(x, 1, z, paper); v.set(x, 0, z, back); }
  // its lower right corner curling forward
  v.clear(W - 1, 0, 0, W, 1, 1); v.set(W - 1, 2, 1, back); v.set(W, 2, 2, back); v.set(W - 1, 2, 2, back);
  // two staves, three lines each, a few notes on and between them, a stem up off each head
  for (const top of [12, 6]) for (const z of [top, top - 2, top - 4]) for (let x = 1; x <= W - 1; x++) v.set(x, 1, z, line);
  const notes: [number, number][] = [[2, 9], [5, 11], [8, 10], [2, 4], [5, 2], [8, 3]];
  for (const [x, z] of notes) { v.box(x, 1, z, x + 1, 1, z, ink); v.box(x + 1, 1, z + 1, x + 1, 1, z + 2, ink); }
  return v;
}

/* ---- the bomber's studio ----
   5:4 "The small room was only about ten feet wide, but it was long, making me
   feel like I was standing in a private bowling alley." The testing area runs
   down its length, and "the crafting table in the very back", "a specialty
   workbench". No colours are given: plain grey walls and floor, a plain wooden
   bench. A chibi of itself, cut away: the floor, the two far walls, a low sill
   along the near sides, the bench against the far end. */
function bombersStudio(): Vox {
  const v = fresh();
  const floor = '#8d949c', tile = '#7f868e', wall = '#5d646e', top = '#6b737c', sill = '#4d545b';
  const wood = '#8a5a35', legs = twin('#8a5a35'), vise = '#3a3f46';
  const L = 18, W = 6, H = 6;
  // the floor, a long lane in big plain tiles
  for (let x = 0; x <= L; x++) for (let y = 0; y <= W; y++) { v.set(x, y, 0, ((x >> 1) + (y >> 1)) % 2 ? tile : floor); v.set(x, y, -1, sill); }
  // the two far walls, a plain cap along their tops, and the low sill along the near sides
  v.box(-1, -1, -1, L, -1, H, wall); v.box(-1, -1, -1, -1, W, H, wall);
  v.box(-1, -1, H, L, -1, H, top); v.box(-1, -1, H, -1, W, H, top);
  v.box(0, W + 1, -1, L, W + 1, 1, sill); v.box(L + 1, 0, -1, L + 1, W + 1, 1, sill);
  // the bench at the very back: a thick top on four legs, a plain clamp on it
  v.box(0, 1, 4, 3, W - 1, 5, wood);
  for (const [x, y] of [[0, 1], [3, 1], [0, W - 1], [3, W - 1]] as const) v.box(x, y, 1, x, y, 3, legs);
  v.box(1, 2, 6, 2, 3, 6, vise); v.set(1, 4, 6, vise);
  return v;
}

/* ---- the enchanted hammer of fast forward ----
   5:62 "the ball peen hammer. The whole thing fit in my hand", "a small
   hammer", and "along the wooden handle was a similar impression. Another
   seven." The head's metal is never coloured: a plain grey, the flat face on
   its left, the round peen on its right, the seven pressed faintly into the
   handle's front. */
function hammer(): Vox {
  const v = fresh();
  const wood = '#8a5a32', grain = '#7b4f2b', mark = '#4a2f18', steel = '#8c939b', shine = '#b3b9c1', dark = '#6a7179';
  // the handle, three across, a little wider at the foot
  v.box(4, 0, 1, 6, 1, 12, wood);
  v.box(4, 0, 0, 6, 1, 0, grain);
  // the seven, pressed into its front
  face(v, 4, 1, 3, ['###', '..#', '.#.', '.#.'], c => (c === '#' ? mark : null));
  // the head, turned along x: the flat striking face, the eye over the handle, a waist, the round peen
  const R = [2.6, 2.6, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 1.4, 2, 2.5, 2.5, 1.8];
  R.forEach((r, x) => {
    for (let y = -2; y <= 3; y++) for (let z = 11; z <= 16; z++) {
      const dy = Math.abs(y - 0.5), dz = Math.abs(z - 13.5);
      if (dy <= r && dz <= r && dy + dz <= r * 1.45) v.set(x, y, z, x === 0 ? shine : z >= 15 && x < 9 ? shine : x === 8 ? dark : steel);
    }
  });
  return v;
}

/* ---- the enchanted stick of cascadia's screams ----
   5:62 "a metal rod, about a quarter-inch thick and about ten inches long. It
   seemed to be made of aluminum", and "a slight imperfection there at the end
   of the metal rod ... I think it's the number seven." A plain bar of dull
   silver lying along y, the seven pressed into its top at the near end. */
function stick(): Vox {
  const v = fresh();
  const alu = '#b8bec6', lower = '#9aa1a9', end = '#cfd4da', mark = '#7c838c';
  const L = 21;
  v.box(0, 0, 0, 2, L, 0, lower);
  v.box(0, 0, 1, 2, L, 1, alu);
  v.box(0, L, 0, 2, L, 1, end); v.box(0, 0, 0, 2, 0, 1, end);
  // the seven, on its top near the end it is seen from
  for (const [x, y] of [[0, L - 1], [1, L - 1], [2, L - 1], [2, L - 2], [1, L - 3], [1, L - 4]] as const) v.set(x, y, 1, mark);
  return v;
}

/* ---- the automaton table ----
   5:33 "the table that was sitting there in the middle of the empty studio.
   Automaton Table. Level 5. Sitting on the table was a book. It was a regular
   paperback". The table itself is never described: the plain crafting table,
   the paperback lying on it as it was found (its cover's picture too small to
   draw; the cover a plain one). */
function automatonTable(): Vox {
  const v = table();
  const cover = '#5a6270', pages = '#e3d7b8';
  v.box(7, 2, 8, 11, 7, 8, pages);
  v.box(7, 2, 9, 11, 7, 9, cover);
  v.box(7, 2, 8, 7, 7, 8, twin(cover));              // the spine down its left
  return v;
}

/* ---- the eighth floor book of lore ----
   5:67 bought from the prize case, where it is only a hologram and a name: the
   plain tome. 5:end "the thin, hardback book ... It had the aquamarine and gold
   stripes with the black triangle of the flag of the Bahamas on the cover, and
   that was it." Thin, standing on its tail, the cover to +y and the spine to
   -x, so the flag's triangle sits at the spine; back and spine a plain dark. */
function loreBook(): Vox {
  const v = fresh();
  const aqua = '#1fb3c2', gold = '#f2c62e', black = '#16161a', board = '#2d3138', pages = '#e3d7b8', leaf = '#cfc3a2';
  const W = 11, H = 14;
  v.box(1, 1, 1, W - 1, 2, H - 1, pages);
  for (let z = 3; z <= H - 2; z += 3) v.set(W - 1, 2, z, leaf);
  v.box(0, 0, 0, W, 0, H, board);                    // the back board
  v.box(0, 0, 0, 0, 3, H, board);                    // the spine
  v.box(-1, 1, 1, -1, 2, H - 1, board);
  // the front board: the flag, three bands with the triangle from the spine side
  for (let x = 0; x <= W; x++) for (let z = 0; z <= H; z++) {
    const band = z <= 4 || z >= 10 ? aqua : gold;
    const tri = x <= 5.6 * (1 - Math.abs(z - 7) / 7.6);
    v.set(x, 3, z, tri ? black : band);
  }
  return v;
}

/* ---- the charm animal potion ----
   5:43 the recipe for "a potion of Charm Animal": the plain potion. 5:46 "We
   grabbed the green potion and bounced": the same, green. */
const charmPlain = () => potion();
const charmGreen = () => potion({ liquid: '#3f9f45' });

/* ---- the crawlcon badge ----
   5:21 "A plastic, rectangle badge popped out, dangling from a red lanyard",
   "the size of a postcard". "The front featured a moving image of a horned
   demon thing shooting fire from its mouth. The words SPECIAL GUEST exploded
   over and over again along the edge. At the bottom was a spinning logo."
   The plastic's colour is not given: a plain pale one, the words a run of ink
   along the top edge, the logo a disc. The demon's colour is not given here: a
   dark one. 5:30 "The red demon on the front of the badge": the same, red. */
function badge(demon: string): Vox {
  const v = fresh();
  const plastic = '#e8e6e0', back = '#cfccc4', ink = '#3a3f55', logo = '#5d646e', logoMid = '#a4abb6';
  const strap = '#c22a22', strapDark = '#9e211b', clip = '#9aa1a9';
  const fire = ['#ffd45a', '#f39a2a', '#e0561c'];
  const W = 14, H = 10;
  panel(v, 0, 0, 0, W, 0, H, 1, back);
  panel(v, 0, 1, 0, W, 1, H, 1, plastic);
  // the words along the top edge, exploding over and over: a broken run of ink
  for (let x = 2; x <= W - 2; x++) if (x % 3) v.set(x, 1, H - 1, ink);
  // the logo, spinning at the bottom
  v.box(6, 1, 1, 8, 1, 2, logo); v.set(7, 1, 1, logoMid); v.set(7, 1, 2, logoMid);
  // the horned demon on the left, in profile, its jaws open to the right
  face(v, 1, 1, 2, [
    '.#...#.',
    '..#.#..',
    '.#####.',
    '###.###',
    '#######',
    '###....',
    '#####..',
  ], c => (c === '#' ? demon : null));
  // the fire, out of its mouth and widening across the badge
  face(v, 5, 1, 2, [
    '......221',
    '....22110',
    '..2211000',
    '22110000.',
    '..221110.',
    '.....222.',
  ], c => (c === '.' ? null : fire[+c]));
  // the clip and the red lanyard, two straps up from it to a loop, leaning back as it goes over a neck
  v.box(6, 0, H + 1, 8, 1, H + 1, clip);
  const path: [number, number][] = [[6, 12], [5, 13], [5, 14], [4, 15], [4, 16], [4, 17], [4, 18], [5, 19], [6, 20], [7, 20], [8, 20], [9, 19], [10, 18], [10, 17], [10, 16], [10, 15], [9, 14], [9, 13], [8, 12]];
  path.forEach(([x, z], i) => { const y = -Math.floor((z - 11) / 3); v.set(x, y, z, i % 4 < 2 ? strap : strapDark); });
  return v;
}

/* ---- the credit chit ----
   5:25 "It looks like a credit card", with no description; 7:35 "a long,
   plastic-like card". A card of plain grey plastic standing on its long edge,
   its corners rounded, a plain metal contact square and a row of raised digits
   on its face, the things that make a card a credit card. */
function creditChit(): Vox {
  const v = fresh();
  const plastic = '#a9aeb6', back = '#8f949c', chip = '#cfd3d8', chipLine = '#7c838c', digit = '#5a5f67';
  const W = 15, H = 9;
  panel(v, 0, 0, 0, W, 0, H, 1, back);
  panel(v, 0, 1, 0, W, 1, H, 1, plastic);
  v.box(2, 1, 4, 4, 1, 6, chip); v.set(3, 1, 5, chipLine); v.set(2, 1, 5, chipLine); v.set(4, 1, 5, chipLine);
  for (let x = 2; x <= W - 2; x++) if ((x - 2) % 3 !== 2) v.set(x, 1, 2, digit);
  return v;
}

/* ---- donut's benefactor-box tiara ----
   5:62 "a new tiara", 5:68 "her new tiara gleaming", 5:72 "Her tiara
   glittered." Its shape, metal and stones are never given: the plain form of a
   tiara, a band with a fan of peaks at its front, in a plain grey metal, a
   little openwork in the fan and the light catching its points. No stones. */
function plainTiara(): Vox {
  const v = fresh();
  const metal = '#a4abb6', shade = '#8f96a0', glint = '#e4e8ec';
  // the band: an eight-sided ring, two high
  for (let x = 0; x <= 9; x++) for (let y = 0; y <= 9; y++) {
    const dx = Math.min(x, 9 - x), dy = Math.min(y, 9 - y);
    if (dx + dy >= 2 && !(dx >= 1 && dy >= 1 && dx + dy >= 4)) v.box(x, y, 0, x, y, 1, dx + dy === 2 ? shade : metal);
  }
  // the fan of peaks at the front, rising to its middle, the two tones of the metal alternating
  [[0, 3], [1, 5], [2, 7], [3, 9], [4, 12], [5, 12], [6, 9], [7, 7], [8, 5], [9, 3]].forEach(([x, t]) => v.box(x, 9, 2, x, 9, t, x % 2 ? metal : shade));
  v.box(4, 8, 2, 5, 8, 10, shade);                                   // the middle stands thicker
  // the gleam, on its points
  for (const [x, z] of [[4, 12], [3, 9], [6, 9], [2, 7], [7, 7], [1, 5], [8, 5]] as const) v.set(x, 9, z, glint);
  v.set(5, 9, 11, glint);
  return v;
}

/* ---- the enchanted venomous elven rock chucker ----
   5:24 "The rock-throwing device was oddly small", "the size and height of one
   of those windsurfing boards", "affixed to the ground with a set of spikes",
   "made of some weird, hollow wood", "The whole thing glowed green" (the
   System: "poisonous bamboo stalks"). "There was no counterweight ... but the
   machine was made with a pair of magical plates that wanted to come together
   like magnets": the arm is ratcheted, the rock "attached ... to the sling",
   the lever pulled; the "postage-stamp-sized plate ... was covered with little
   diodes". No green that glows is in the palette, so the bamboo is a bright
   one; the rest is plain: grey plates and spikes, a plain cord and pouch.
   5:51 "a little cup on the side of the sling": the same, the cup added. */
function rockChucker(cup: boolean): Vox {
  const v = fresh();
  const cane = '#86dc5a', node = '#4f9e36', plate = '#4d545b', diode = '#c5cad0', spike = '#8c939b', cord = '#c9b384', pouch = '#8a7f6c', cupC = '#7c858e';
  const stalk = (a: [number, number, number], b: [number, number, number]) => {
    const n = Math.max(...a.map((p, i) => Math.abs(b[i] - p)));
    for (let i = 0; i <= n; i++) {
      const t = n ? i / n : 0;
      v.set(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), i % 4 === 3 ? node : cane);
    }
  };
  // the base: two long stalks either side, three across them, spiked down at the corners
  for (const y of [0, 1, 6, 7]) stalk([0, y, 1], [15, y, 1]);
  for (const x of [0, 8, 15]) for (const z of [1]) stalk([x, 2, z], [x, 5, z]);
  for (const [x, y] of [[0, 0], [15, 0], [0, 7], [15, 7]] as const) { v.set(x, y, 0, spike); v.set(x, y, -1, spike); }
  // the two A-frames, up from the base to the axle
  for (const y of [0, 7]) { stalk([5, y, 2], [8, y, 10]); stalk([11, y, 2], [8, y, 10]); }
  bar(v, [8, 0, 10], [8, 7, 10], spike);
  // the throwing arm, through the axle: the short end low over the plates, the long end high at the back
  for (const y of [3, 4]) stalk([12, y, 6], [1, y, 16]);
  // the two plates that pull together, one on the short end and one on the base under it, diodes on each
  for (const z of [5, 2]) { v.box(12, 3, z, 13, 4, z, plate); v.set(12, 4, z, diode); }
  v.box(12, 3, 1, 13, 4, 1, cane);
  // the lever, at the front corner
  bar(v, [14, 2, 2], [15, 2, 5], spike);
  // the sling, hanging off the long end, its empty pouch
  v.set(1, 3, 15, cord); v.set(1, 4, 14, cord); v.set(1, 4, 13, cord); v.set(1, 5, 12, cord);
  v.box(0, 4, 10, 2, 6, 11, pouch); v.set(1, 5, 11, twin(pouch));
  if (cup) { v.box(3, 5, 10, 4, 6, 11, cupC); v.set(3, 6, 11, '#2b2e32'); v.set(4, 6, 11, '#2b2e32'); v.set(3, 5, 12, cupC); v.set(4, 5, 12, cupC); v.set(3, 6, 12, cupC); v.set(4, 6, 12, cupC); v.set(3, 6, 11, null); }
  return v;
}

/* ---- the enchanted collar charm of the effete bourgeoisie ----
   5:11 "this pendant", "Each jewel encrusted upon this charm represents a
   settlement"; "the gem is turquoise", "The gem is tiny." A round pendant with
   a ring at its top to hang from a collar, its metal never named so a plain
   grey, the one small turquoise stone set in it. 5:43 "The red gem added to
   Donut's leadership charm": a second, red stone beside it. */
function collarCharm(two: boolean): Vox {
  const v = fresh();
  const metal = '#a4abb6', rim = '#8f96a0', ring = '#c2c7cf', turq = '#3cc0ae', turqHi = '#8be3d6', red = '#c22a22', redHi = '#e8574a';
  disc(v, 5, 5, 0, 1, 4, rim);
  disc(v, 5, 5, 1, 1, 3, metal);
  // the ring over its top
  for (const [x, z] of [[4, 10], [4, 11], [4, 12], [5, 13], [6, 12], [6, 11], [6, 10], [5, 10]] as const) v.set(x, 1, z, ring);
  v.box(5, 0, 10, 5, 0, 10, rim);
  const gx = two ? 3 : 5;
  v.box(gx - 1, 2, 4, gx, 2, 5, turq); v.set(gx - 1, 2, 5, turqHi);
  if (two) { v.box(7, 2, 4, 8, 2, 5, red); v.set(7, 2, 5, redHi); }
  return v;
}

/* ---- the enchanted silver bracelet of the ab-solar ----
   5:43 "the sparkling bracelet", "This new one glittered silver with little
   purple gems", "The attached, purple gems each had an odd shape, almost like a
   bulb of garlic." A silver band lying open side up, each gem a bulb, round at
   its foot and pointed at its top, standing proud of the band. */
function garlicBracelet(): Vox {
  const v = fresh();
  const silver = '#c2c7cf', shade = '#a3a9b2', inside = '#7f8792', glint = '#eef1f4', gem = '#8a4fc0', gemHi = '#b98ae6', gemLo = '#6c3a9c';
  flat(v, 0, 0, 0, 13, 13, 2, 4, silver);
  flat(v, 2, 2, 0, 11, 11, 2, 3, null);
  for (let x = 0; x <= 13; x++) for (let y = 0; y <= 13; y++) if (v.has(x, y, 2)) {
    const rimIn = !v.has(x + 1, y, 2) && x < 12 || !v.has(x, y + 1, 2) && y < 12 || !v.has(x - 1, y, 2) && x > 1 || !v.has(x, y - 1, 2) && y > 1;
    if (rimIn) v.set(x, y, 2, inside);
    v.set(x, y, 0, shade);
  }
  // the bulbs, proud of the band's outside: round at the foot, pointed at the top, rising over its rim
  const bulb = (put: (i: number, z: number, m: string) => void) => {
    put(1, 0, gemLo);
    put(0, 1, gem); put(1, 1, gemHi); put(2, 1, gem);
    put(0, 2, gem); put(1, 2, gem); put(2, 2, gemLo);
    put(1, 3, gem); put(1, 4, gemHi);
  };
  bulb((i, z, m) => v.set(5 + i, 14, z, m));
  bulb((i, z, m) => v.set(14, 5 + i, z, m));
  bulb((i, z, m) => v.set(10 + i, 13 - i, z, m));
  bulb((i, z, m) => v.set(1 + i, 11 + i - 1, z, m));
  for (const [x, y] of [[4, 13], [9, 13], [13, 9], [13, 4], [12, 12]] as const) if (v.has(x, y, 1)) v.set(x, y, 1, glint);
  return v;
}

/* ---- the flaming arrow patch ----
   5:36 "a small, square patch similar in size to my first patch", featuring "a
   group of about a dozen flaming arrows clutched in the hands of an eagle claw.
   The drawing was rendered in an old-school, traditional, Sailor Jerry style."
   The square patch with a stitched rim; the field a plain pale cloth, the
   drawing in that style's heavy black line: the arrows' shafts, the flames at
   their heads, the yellow foot of the eagle gripping them, black at its talons. */
function arrowPatch(): Vox {
  const v = fresh();
  const field = '#ebdfc0', rim = '#2a2622';
  const yellow = '#ffcf3a', orange = '#f08a24', red = '#d8361f', ink = '#1f1b18', claw = '#e8b321';
  const W = 12, H = 12;
  for (let x = 0; x <= W; x++) for (let z = 0; z <= H; z++) {
    if ((x === 0 || x === W) && (z === 0 || z === H)) continue;
    const edge = x === 0 || x === W || z === 0 || z === H;
    v.set(x, 0, z, twin(edge ? rim : field)); v.set(x, 1, z, edge ? rim : field);
  }
  // inside the rim: the arrows fanning up out of the claw, each head in flames, the yellow foot
  // gripping them at the foot of the patch, its toes and talons picked out in black
  const col: Record<string, string> = { y: yellow, o: orange, r: red, k: ink, c: claw };
  face(v, 1, 1, 1, [
    '.y...y...y.',
    'oyo.oyo.oyo',
    'rkr.rkr.rkr',
    '.k...k...k.',
    '..k..k..k..',
    '...k.k.k...',
    '.k.kkkkk.k.',
    '.ccccccccc.',
    '..ccccccc..',
    '...ccccc...',
    '....ccc....',
  ], c => col[c] ?? null);
  return v;
}

/* ---- the holy gooper ----
   5:44 "two potion balls cradled in his small arms. He moved to the Emberus
   shrine at the back of the room and dipped the balls in the red water". The
   potion ball is the hard rubber one (3:7), its rubber a plain dull colour with
   the split on top; this one wet red from its dip, the red running up its sides
   and hanging in drops underneath. */
function holyGooper(): Vox {
  const v = fresh();
  const rubber = '#6a655d', split = '#24211d', red = '#a3221b', wet = '#d4473b', deep = '#7d1b17';
  chamfer(v, 2, 2, 0, 7, 7, 0, 2, red);
  chamfer(v, 1, 1, 1, 8, 8, 1, 3, red);
  chamfer(v, 0, 0, 2, 9, 9, 4, 3, red);
  chamfer(v, 0, 0, 5, 9, 9, 6, 3, rubber);
  chamfer(v, 1, 1, 7, 8, 8, 7, 3, rubber);
  chamfer(v, 2, 2, 8, 7, 7, 8, 2, rubber);
  // the red running up from the dip in streaks, and the wet shine on its lit side
  for (const [x, y, z] of [[2, 9, 5], [2, 9, 6], [5, 9, 5], [9, 4, 5], [9, 4, 6], [9, 7, 5], [7, 9, 5], [3, 8, 7]] as const) if (v.has(x, y, z)) v.set(x, y, z, red);
  for (const [x, y, z] of [[3, 9, 3], [4, 9, 3], [3, 9, 4], [9, 5, 3], [2, 8, 2]] as const) if (v.has(x, y, z)) v.set(x, y, z, wet);
  // the split across its top
  for (const [x, y] of [[3, 3], [4, 4], [5, 4], [6, 5]] as const) v.set(x, y, 8, split);
  // drops hanging under it
  v.set(4, 6, -1, deep); v.set(4, 6, -2, red); v.set(6, 4, -1, deep); v.set(6, 7, -1, red);
  return v;
}

/* ---- the hunting trophy ----
   5:8 "It's the hand of a hunter. Gross." Each one is its own hunter's, and
   "None of the hands had any sort of rings or any other adornments." The
   plain form of a severed hand, in the gray the book gives twice (5:8 "a gray
   hand popped out", 5:11 "a fat, mottled gray hand"), standing on its cut
   wrist, the back of the hand to +y, the stump red. */
function trophyHand(): Vox {
  const v = fresh();
  const skin = '#8a8c90', crease = '#75777b', nail = '#b9bab4', cut = '#a3221b', raw = '#7d1b17', bone = '#eadfc4';
  // the wrist, cut off red at its foot, a fleck of bone in the cut, a drop under it
  v.box(2, 0, 0, 8, 2, 0, cut); v.set(5, 2, 0, bone); v.set(4, 2, 0, raw);
  v.box(2, 0, 1, 8, 2, 3, skin);
  v.set(3, 3, 1, raw); v.set(7, 3, 0, raw); v.set(5, 1, -1, raw);
  // the back of the hand, the knuckles a line of creases
  chamfer(v, 0, 0, 4, 10, 2, 10, 1, skin);
  for (const x of [1, 4, 6, 9]) v.set(x, 2, 10, crease);
  // four fingers apart, the middle longest, each curling a little forward at its tip, the nail on it
  [[0, 15], [3, 17], [6, 16], [9, 14]].forEach(([x, top], i) => {
    const m = i % 2 ? twin(skin) : skin;
    v.box(x, 0, 11, x + 1, 2, top - 1, m);
    v.box(x, 1, top, x + 1, 3, top, m);
    v.set(x, 3, top, nail); v.set(x + 1, 3, top, nail);
    v.set(x, 2, 13, crease); v.set(x + 1, 2, 13, crease);
  });
  // the thumb, out from the left side and up
  v.box(-1, 0, 5, -1, 2, 7, skin); v.box(-2, 0, 7, -2, 2, 10, twin(skin)); v.box(-3, 1, 10, -2, 3, 11, twin(skin)); v.set(-3, 3, 11, nail);
  return v;
}

/* ---- the i take it all back potion ----
   5:57 "a black, bubbling potion", and "A tag hung off the top, like a label
   on a Christmas present." The plain potion, its liquid black with bubbles
   rising in it, a pale paper tag hung on a string from its neck, a few lines
   of writing on it. */
function takeItBack(): Vox {
  const v = potion({ liquid: '#1b1714' });
  const bubble = '#5a5560', paper = '#e6d9b0', ink = '#5a4f42', string = '#c9b384';
  for (const [x, y, z] of [[4, 8, 3], [6, 8, 5], [3, 7, 6], [5, 8, 7], [6, 7, 2], [7, 6, 6]] as const) v.set(x, y, z, bubble);
  v.set(5, 5, 8, bubble); v.set(4, 6, 9, bubble);
  // the string round the neck, and the tag hanging off it out to the side
  for (const [x, z] of [[7, 12], [8, 12], [9, 11], [10, 11]] as const) v.set(x, 6, z, string);
  panel(v, 10, 6, 5, 13, 6, 10, 0, paper);
  v.clear(13, 6, 10, 13, 6, 10);
  v.box(11, 6, 8, 12, 6, 8, ink); v.set(11, 6, 6, ink);
  return v;
}

/* ---- the constitution nipple ring ----
   5:55 "The fourth, constitution-enhancing ring was about the size of a nickel";
   its metal and any stone are never given: the plain piercing, a chibi of
   itself. */
const conRing = () => piercing();

/* ---- just wait until your daddy gets home ----
   5:9 "a large, egg-shaped, clamshell-like bomb casing from the previous floor.
   It was a type of live ammo ball, but it was broken", filled and then "weld the
   thing closed. The finished, egg-like bomb was about five feet tall ... so I
   built a little cart to place it in that Bomo could pull behind him." The
   shell in the live ammo ball's plain grey (4:13 has no colour either), its two
   halves meeting at a seam welded over in a rough bead, standing upright in a
   plain wooden cart on two wheels, the pull handle out in front. */
function daddyBomb(): Vox {
  const v = fresh();
  const shell = '#9aa1a9', lower = '#6f767e', seam = '#2e3237', weld = '#d3d7dc', weld2 = '#868d96', shine = '#c9ced4', hinge = '#4d545b';
  const plank = '#8a5a35', rail = '#6e4626', tyre = '#302d35', hub = '#a4abb6', handle = '#7b4f2b';
  // the cart: a plank bed with a low rail round it
  v.box(-1, -1, 3, 12, 10, 3, plank);
  for (let x = -1; x <= 12; x++) for (let y = -1; y <= 10; y++) if (x === -1 || x === 12 || y === -1 || y === 10) v.set(x, y, 4, rail);
  // two wheels, one each side
  disc(v, 5, 3, 11, 12, 3, tyre); disc(v, 5, 3, 11, 11, 1, hub); v.set(5, 13, 3, hub);
  disc(v, 5, 3, -3, -2, 3, tyre);
  // the pull handle out of the front, up to a crossbar
  bar(v, [13, 1, 4], [16, 1, 7], handle); bar(v, [13, 8, 4], [16, 8, 7], handle);
  v.box(16, 1, 7, 16, 8, 7, handle); v.box(16, 0, 7, 16, 0, 7, rail); v.box(16, 9, 7, 16, 9, 7, rail);
  // the egg, from chamfered layers so it reads round: widest low, the lower shell darker,
  // the two halves meeting at a dark seam round its waist, welded over in a rough bead
  const layers: [number, number, number][] = [[4, 3, 1], [5, 1, 3], [6, 0, 3], [7, 0, 4], [8, 0, 4], [9, 0, 4], [10, 0, 4], [11, 0, 4], [12, 0, 4], [13, 1, 3], [14, 1, 3], [15, 2, 2], [16, 2, 2], [17, 3, 1], [18, 4, 0]];
  for (const [z, inset, cut] of layers) chamfer(v, 1 + inset, inset, z, 10 - inset, 9 - inset, z, cut, z < 10 ? lower : z === 10 ? seam : shell);
  let k = 0;
  for (let x = 0; x <= 11; x++) for (let y = 0; y <= 10; y++) if (v.has(x, y, 10) && (!v.has(x, y + 1, 10) || !v.has(x + 1, y, 10))) {
    if (k++ % 2) continue;
    v.set(x, y, 10, weld);
    if (!v.has(x, y + 1, 10)) v.set(x, y + 1, 10, weld2); else v.set(x + 1, y, 10, weld2);
  }
  v.box(11, 4, 9, 11, 5, 11, hinge);                       // the hinge it was a clamshell on
  for (const [x, z] of [[3, 14], [2, 13], [3, 15], [2, 12]] as const) for (let y = 12; y >= 0; y--) if (v.has(x, y, z)) { v.set(x, y, z, shine); break; }
  return v;
}

export const ITEMS_B5A: Record<string, Record<string, () => Vox>> = {
  'song-of-skedaddle': { plain: sheetMusic },
  'bombers-studio': { room: bombersStudio },
  'hammer-of-fast-forward': { plain: hammer },
  'stick-of-cascadias-screams': { plain: stick },
  'automaton-table': { found: automatonTable },
  'eighth-floor-book-of-lore': { plain: () => tome(), flag: loreBook },
  'charm-animal-potion': { plain: charmPlain, green: charmGreen },
  'crawlcon-badge': { badge: () => badge('#3a3540'), 'red-demon': () => badge('#c22a22') },
  'credit-chit': { plain: creditChit },
  'donuts-benefactor-box-tiara': { plain: plainTiara },
  'venomous-elven-rock-chucker': { trebuchet: () => rockChucker(false), cup: () => rockChucker(true) },
  'collar-charm-of-effete-bourgeoisie': { turquoise: () => collarCharm(false), 'two-gems': () => collarCharm(true) },
  'silver-bracelet-of-ab-solar': { garlic: garlicBracelet },
  'flaming-arrow-patch': { claw: arrowPatch },
  'holy-gooper': { dipped: holyGooper },
  'hunting-trophy': { hand: trophyHand },
  'i-take-it-all-back': { tagged: takeItBack },
  'constitution-nipple-ring': { plain: conRing },
  'just-wait-until-your-daddy-gets-home': { cart: daddyBomb },
};
