import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { chamfer } from './itemparts.ts';
import { potion, tome, patch, ring } from './itemforms.ts';

/* ---- items, set b4a (book 4) ----
   Drawn like the anchor set in items.ts: one object, floating, three-quarter
   view, smooth (chunk 0), facing +y (the lit left face), z up. Each look from
   the edition's own description at its point; a colour the book leaves unsaid
   is a plain one. Shapes and colours only. */

const fresh = () => { const v = new Vox(); v.chunk = 0; return v; };

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
/** rows of characters drawn onto the face at y, top row first, from (x0, z0 + rows - 1) */
function face(v: Vox, x0: number, y: number, z0: number, rows: string[], pick: (c: string) => string | null) {
  rows.forEach((row, j) => [...row].forEach((c, i) => { const m = pick(c); if (m) v.set(x0 + i, y, z0 + rows.length - 1 - j, m); }));
}

/* ---- the astral paw spellbook ----
   4:2 the spellbook-of-the-floor club prize Donut pulls from the mailbox and
   reads at once. The spellbook itself is never described: the plain tome. */
const spellbook = () => tome();

/* ---- the belt of buoyancy ----
   4:23 "a simple belt that wrapped around her stomach that'd keep her from
   sinking". No colour or material: a plain brown strap, fastened in a loop the
   size of a cat's middle, a plain metal buckle at the front. */
function buoyancyBelt(): Vox {
  const v = fresh();
  const strap = '#7a5232', edge = twin('#7a5232'), hole = '#3a2616', buckle = '#a4abb6', prong = '#7c858e';
  // the loop: an octagonal band three high, its middle left open
  flat(v, 0, 0, 0, 13, 11, 2, 4, strap);
  flat(v, 2, 2, 0, 11, 9, 2, 3, null);
  for (let x = 0; x <= 13; x++) for (let y = 0; y <= 11; y++) if (v.has(x, y, 1)) { v.set(x, y, 0, edge); }
  // the buckle on the front: a square frame standing proud, the strap showing through it, the prong across
  panel(v, 4, 12, 0, 8, 12, 3, 0, buckle);
  v.box(5, 12, 1, 7, 12, 2, strap);
  v.box(5, 12, 1, 5, 12, 2, prong);
  // the loose end, run through the buckle and on round the right, its holes punched in a line
  v.box(9, 12, 0, 11, 12, 2, strap);
  v.box(12, 11, 0, 12, 11, 2, strap);
  for (const x of [10, 12]) v.set(x, x === 12 ? 11 : 12, 1, hole);
  v.set(10, 12, 0, edge); v.set(11, 12, 0, edge); v.set(12, 11, 0, edge);
  return v;
}

/* ---- the coffee shop author kit ----
   4:13 "a sheet of paper and a quill pen. There was also a little jar that was
   capped and filled with black ink." The magic at work: "The magical pen rose
   into the air as the top popped off the ink well. The pen dipped within and
   wrote". The sheet lying flat with a few lines on it, the jar open at its back
   corner and its cap beside it, the quill standing over the sheet by itself, its
   nib at the end of the line it is writing. The feather's colour is never
   given: a plain pale one. */
function authorKit(): Vox {
  const v = fresh();
  const paper = '#e3d7b8', ink = '#1b1714', cap = '#3a3f46', quill = '#f4f1ea', vane = '#e4dfd3', shaft = '#a89f8c';
  // the sheet
  v.box(0, 0, 0, 10, 13, 0, paper);
  // what the pen has written so far: fine lines of ink, broken into words
  const lines: [number, number, number[]][] = [[2, 8, [5]], [2, 7, [4]], [2, 8, [6]], [2, 5, []]];
  lines.forEach(([x0, x1, gaps], i) => { const y = 11 - i * 2; for (let x = x0; x <= x1; x++) if (!gaps.includes(x)) v.set(x, y, 0, ink); });
  // the little jar at the back corner: glass walls round black ink, open at the top
  flat(v, 6, 0, 1, 9, 3, 4, 1, 'glass');
  v.clear(7, 1, 2, 8, 2, 4);
  v.box(7, 1, 1, 8, 2, 3, ink);
  // its cap, popped off, lying on the sheet beside it
  flat(v, 3, 1, 1, 4, 2, 1, 0, cap);
  // the quill: a flat feather standing over the line it is writing, leaning back
  // up to the left, its vanes broad along the upper shaft and narrowing to the tip
  const Y = 5, nib = 6;
  const sx = (z: number) => Math.round(nib - (z - 1) * 5 / 14);
  v.set(nib, Y, 1, ink); v.set(nib, Y, 2, ink);
  for (let z = 3; z <= 16; z++) {
    const x = sx(z);
    v.set(x, Y, z, shaft);
    const w = z < 5 ? 0 : z <= 6 ? 1 : z <= 13 ? 2 : z <= 15 ? 1 : 0;
    for (let k = 1; k <= w; k++) { v.set(x - k, Y, z, k === w ? vane : quill); v.set(x + k, Y, z, k === w ? vane : quill); }
  }
  return v;
}

/* ---- the stock certificates ----
   4:28 "All seven of the stock certificates looked different. Some were paper.
   One was an actual egg covered in writing. Another was printed on glass."
   Three of the seven together: a paper one standing, a pane of glass printed
   behind it, and the egg in front, each lined with writing. No colours are
   given: pale paper, plain glass, an egg's plain cream. */
function certificates(): Vox {
  const v = fresh();
  const paper = '#e6dcc0', ink = '#3a3530', line = '#8a7f6c', print = '#2a3340', shell = '#efe6d2', script = '#b3a284';
  // the glass one, standing at the back and to the right
  panel(v, 6, 0, 2, 15, 0, 14, 0, 'glass');
  for (const z of [12, 10, 8, 6]) for (let x = 8; x <= 13; x++) if ((x + z) % 4 !== 0) v.set(x, 0, z, print);
  // the paper one, standing in front of it to the left
  panel(v, 0, 2, 0, 9, 2, 13, 0, paper);
  panel(v, 0, 1, 0, 9, 1, 13, 0, twin(paper));
  v.box(3, 2, 11, 6, 2, 11, ink);
  for (const z of [9, 7, 5]) for (let x = 2; x <= 7; x++) if ((x * 2 + z) % 5 !== 0) v.set(x, 2, z, line);
  v.box(5, 2, 2, 7, 2, 2, ink);
  // the egg, upright at the front right, written over in fine lines
  const egg: [number, number][] = [[1, 1], [0, 1], [0, 1], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0]];   // [inset, cut] up from its foot
  egg.forEach(([inset, cut], z) => flat(v, 10 + inset, 5 + inset, z, 14 - inset, 9 - inset, z, cut, shell));
  for (const z of [2, 4]) for (let x = 10; x <= 14; x++) for (let y = 5; y <= 9; y++) {
    const front = y === 9 || (y === 8 && !v.has(x, 9, z)), right = x === 14 || (x === 13 && !v.has(14, y, z));
    if (v.has(x, y, z) && (front || right) && (x + y + z) % 3 !== 0) v.set(x, y, z, script);
  }
  return v;
}

/* ---- dolores doesn't splat ----
   4:12 "The potion was called Dolores Doesn't Splat." Never coloured: the plain potion. */
const splatPotion = () => potion();

/* ---- drakea's enchanted kerchief of disorder ----
   4:28 "The item appeared in a puff of magic smoke. A black bandana. It looked
   like a standard bandana ... It was decorated with a typical white, paisley
   pattern"; the System calls it a "simple, square piece of fabric". Spread out
   flat as it came: the black square, the white teardrops of the paisley over it,
   a white line of dots round its edge, one corner turned up off the rest. */
const PAISLEY = [            // the field inside the border, a row per y, back to front
  '..........',
  '.##...#...',
  '.###..##..',
  '..#....##.',
  '......#...',
  '.#........',
  '.##...##..',
  '..##..###.',
  '...#...#..',
  '..........',
];
function kerchief(): Vox {
  const v = fresh();
  const black = '#1f1d22', under = twin('#1f1d22'), white = '#eeeae2';
  const N = 13;
  v.box(0, 0, 0, N, N, 0, under);
  v.box(0, 0, 1, N, N, 1, black);
  for (let i = 1; i < N; i++) for (const [x, y] of [[i, 1], [i, N - 1], [1, i], [N - 1, i]] as const) if (i % 2) v.set(x, y, 1, white);
  PAISLEY.forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') v.set(i + 2, j + 2, 1, white); }));
  // the front corner turned up off the rest, its underside showing
  v.clear(N - 1, N - 1, 0, N, N, 1);
  v.box(N - 2, N - 1, 2, N - 1, N - 1, 2, under); v.set(N - 1, N - 2, 2, under);
  return v;
}

/* ---- the earth patch ----
   4:28 "a tiny round patch depicting the planet earth"; "This is just a screen
   print". The round patch form, its face the planet: blue sea, green land, a
   wisp of white cloud. */
const GLOBE = [
  '...........',
  '....gg.....',
  '...gggg....',
  '..ggg...w..',
  '..gg.....g.',
  '...g....gg.',
  '.......ggg.',
  '..w....gg..',
  '.......g...',
  '...gg......',
  '..ggg...w..',
  '...g.......',
  '...........',
];
function earthPatch(): Vox {
  const v = patch({ shape: 'round', field: '#2f6fb3' });
  GLOBE.forEach((row, j) => [...row].forEach((c, i) => {
    const z = GLOBE.length - 1 - j;
    if (c !== '.' && v.get(i, 1, z) === '#2f6fb3') v.set(i, 1, z, c === 'g' ? '#4f9a42' : '#eeeae2');
  }));
  return v;
}

/* ---- the petrify rock class bolts ----
   4:14 "A set of ten bolts of Petrify Rock Class", loaded into Katia's
   crossbow. Nothing more is said of them: plain crossbow bolts, a wooden
   shaft, a grey head, dull vanes, three of the set lying side by side. */
function plainBolt(v: Vox, ox: number, oy: number, oz: number) {
  const shaft = '#8a5a32', head = '#8c939b', edge = '#c5cad0', vane = '#b3a891', nock = '#5c3a20';
  const L = 17;
  v.box(ox, oy + 1, oz, ox + 1, oy + L - 5, oz + 1, shaft);
  v.box(ox, oy, oz, ox + 1, oy, oz + 1, nock);
  // the head, broad at its base and tapering to the point
  v.box(ox - 1, oy + L - 4, oz, ox + 2, oy + L - 3, oz + 1, head);
  v.box(ox, oy + L - 2, oz, ox + 1, oy + L - 1, oz + 1, head);
  v.set(ox, oy + L, oz + 1, edge); v.set(ox, oy + L - 1, oz + 1, edge); v.set(ox - 1, oy + L - 3, oz + 1, edge);
  // the vanes, standing up off the shaft at the back, broadest at the nock
  [2, 2, 1].forEach((h, i) => v.box(ox, oy + 1 + i, oz + 2, ox + 1, oy + 1 + i, oz + 1 + h, i % 2 ? twin(vane) : vane));
}
function petrifyBolts(): Vox {
  const v = fresh();
  plainBolt(v, 0, 0, 0);
  plainBolt(v, 5, 2, 0);
  plainBolt(v, 10, 1, 0);
  return v;
}

/* ---- the anarchist's battle rattle ----
   4:28 "a black, sleeveless, jacket made of a thick canvas. It glowed with a
   very subtle light, almost purple." Standing as if worn, the front to +y: two
   panels meeting down the middle in a V at the neck, the arm holes open, the
   shoulders over the top. The glow is a faint purple along its edges. Its
   patches, each sewn on the front where the book puts it:
   5:1  the earth patch's immunity is "already obtained via upgrade patch": it is on.
   5:36 "Katia ... sewed the arrow patch next to the planet earth on my jacket's
        shoulder"; the bomb, a white rectangle "a little bigger than the first"
        with "a little, circular bomb hand stitched on it with fine, black
        thread", "on the bottom left of the jacket's front, right along the
        hemline".
   5:44 the goat patch, "black, denim-like material with a gray goat head
        screen-printed on it", identical in size to the bomb, sewn "right next to
        the bomb patch".
   6:3  the peace symbol, "small and round, almost identical in size to my earth
        patch ... just black with a white, screen-printed peace symbol". (The
        back patch of the same chapter is on the back, out of view.)
   8:89 "a foot crushing down a set of four-leaf clovers", sewn "above the
        Midnight Epicure patch", the goat. */
// the front, top row first: '#' canvas, '|' where the two panels meet
const VEST = [
  '..###.....###..',
  '..####...####..',
  '.#####...#####.',
  '.#####...#####.',
  '.######.######.',
  '.######|######.',
  '.######|######.',
  '#######|#######',
  '#######|#######',
  '#######|#######',
  '#######|#######',
  '#######|#######',
  '#######|#######',
  '#######|#######',
  '#######|#######',
  '#######|#######',
  '#######|#######',
];
type Patches = { earth?: boolean; arrows?: boolean; bomb?: boolean; goat?: boolean; peace?: boolean; clover?: boolean };
function battleRattle(p: Patches = {}): Vox {
  const v = fresh();
  const canvas = '#2b2733', inner = '#121016', seam = '#1c1a22', glow = '#4e4170';
  const D = 4, H = VEST.length;
  const at = (x: number, z: number) => { const r = VEST[H - 1 - z]; return r !== undefined && x >= 0 && x < r.length && r[x] !== '.'; };
  // the front and the back, the back closed across the neck but for its top row
  for (let x = 0; x < 15; x++) for (let z = 0; z < H; z++) {
    if (at(x, z)) v.set(x, D, z, VEST[H - 1 - z][x] === '|' ? seam : canvas);
    if (at(x, z) || (z >= H - 4 && z < H - 1 && x >= 5 && x <= 9)) v.set(x, 0, z, canvas);
  }
  // between them: closed sides under the arms, dark where the neck and the arm holes open
  for (let x = 0; x < 15; x++) for (let z = 0; z < H; z++) {
    if (!at(x, z) && !(z >= H - 4 && z < H - 1 && x >= 5 && x <= 9)) continue;
    const outer = !at(x - 1, z) || !at(x + 1, z), top = !at(x, z + 1);
    const armhole = z >= 10 && outer && (x < 3 || x > 11);
    for (let y = 1; y < D; y++) v.set(x, y, z, armhole || top || (x >= 5 && x <= 9 && z >= 10) ? inner : canvas);
  }
  // the shoulders over the top, front to back
  for (const [x0, x1] of [[2, 4], [10, 12]] as const) v.box(x0, 1, H - 1, x1, D - 1, H - 1, canvas);
  // the glow: the hem, the arm holes, the V and the collar, edged faintly purple
  for (let x = 0; x < 15; x++) for (let z = 0; z < H; z++) {
    if (!at(x, z) || VEST[H - 1 - z][x] === '|') continue;
    const edge = z === 0 || !at(x - 1, z) || !at(x + 1, z) || !at(x, z + 1);
    if (edge && !(z < 10 && (x === 0 || x === 14))) v.set(x, D, z, glow);
  }
  for (let y = 0; y <= D; y++) { v.set(14, y, 0, glow); }
  // the patches, sewn on the front, standing a little proud of it
  const sew = (x0: number, z0: number, rows: string[], pal: Record<string, string>) => face(v, x0, D + 1, z0, rows, c => pal[c] ?? null);
  if (p.earth) sew(9, 11, ['.bg.', 'bggb', 'gbbg', '.gb.'], { b: '#2f6fb3', g: '#4f9a42' });
  if (p.arrows) sew(10, 6, ['fofo', 'cbcb', 'ybyb', 'yyyy'], { f: '#ffb340', o: '#e0602a', c: '#d8c48a', b: '#7a4a2a', y: '#c9a14a' });
  if (p.bomb) sew(1, 1, ['wwwwk', 'wkkww', 'wkkww', 'wwwww'], { w: '#ebe6da', k: '#1b1714' });
  if (p.goat) sew(1, 6, ['dgdgd', 'ddgdd', 'dgggd', 'ddgdd'], { d: '#3a3d48', g: '#9aa0a8' });
  if (p.clover) sew(2, 11, ['css', 'sss', 'gcg'], { c: '#d8c48a', g: '#4f9a42', s: '#d9a57a' });
  if (p.peace) sew(9, 1, ['.kk.', 'kwwk', 'kwwk', '.kk.'], { k: '#1b1714', w: '#eeeae2' });
  return v;
}

/* ---- the enchanted gnome farseerer ----
   4:2 "The telescope was a white tube covered in pipes and gears. The material
   of the body was odd, maybe ceramic"; at 4:1 "a steampunk-ish telescope". It
   lies along x, the wide end and its lens to the right, the pipes and a gear
   along its lit side and over the top. The metal is never coloured: a plain grey. */
function farSeerer(): Vox {
  const v = fresh();
  const white = '#e8e4dc', band = '#cdc7ba', pipe = '#8d949c', joint = '#5d646e', gear = '#7c858e', hub = '#454b52', lens = '#2c3a4a', glint = '#7891ab';
  /** a length of tube along x, square in section with its corners cut */
  const tube = (x0: number, x1: number, lo: number, hi: number, cut: number, m: string) => {
    for (let x = x0; x <= x1; x++) for (let y = lo; y <= hi; y++) for (let z = lo; z <= hi; z++) {
      if (Math.min(y - lo, hi - y) + Math.min(z - lo, hi - z) >= cut) v.set(x, y, z, m);
    }
  };
  tube(0, 2, 2, 4, 1, band);            // the eyepiece
  tube(3, 15, 1, 5, 1, white);          // the long body
  tube(16, 19, 0, 6, 2, white);         // the wide hood
  for (const x of [3, 9, 16]) tube(x, x, x === 16 ? 0 : 1, x === 16 ? 6 : 5, x === 16 ? 2 : 1, band);
  // the lens, set in the wide end
  for (let y = 1; y <= 5; y++) for (let z = 1; z <= 5; z++) if (Math.min(y - 1, 5 - y) + Math.min(z - 1, 5 - z) >= 1) v.set(20, y, z, lens);
  v.set(20, 4, 4, glint); v.set(20, 3, 4, glint); v.set(20, 4, 3, glint);
  // a pipe along the lit side, elbowing into the body at either end
  v.box(4, 6, 2, 8, 6, 2, pipe); v.set(4, 6, 3, joint); v.set(8, 6, 3, joint);
  // a second pipe over the top, standing off it on three posts
  v.box(5, 3, 7, 14, 3, 7, pipe); for (const x of [5, 10, 14]) v.set(x, 3, 6, joint);
  // a gear on the side, toothed, its hub proud of it
  const cx = 12, cz = 3, y = 6;
  for (let x = cx - 2; x <= cx + 2; x++) for (let z = cz - 2; z <= cz + 2; z++) if (Math.abs(x - cx) + Math.abs(z - cz) <= 3) v.set(x, y, z, gear);
  for (const [dx, dz] of [[0, 3], [3, 0], [0, -3], [-3, 0]] as const) v.set(cx + dx, y, cz + dz, gear);
  v.set(cx, y + 1, cz, hub);
  // the knob that focuses it, by the eyepiece
  v.box(1, 5, 3, 1, 6, 3, joint);
  return v;
}

/* ---- the enchanted handcuffs ----
   4:32 "A pair of handcuffs popped out. They were encased in red, fuzzy
   velvet"; 7:50 they "jingled", so the chain is bare metal, a plain grey. The
   two cuffs lying side by side as they fell, the short chain between them. */
function handcuffs(): Vox {
  const v = fresh();
  const velvet = '#b3202e', fuzz = '#d0414d', deep = '#8c1823', chain = '#a4abb6', link = '#7c858e';
  const cuff = (x0: number, y0: number) => {
    flat(v, x0, y0, 0, x0 + 8, y0 + 8, 2, 3, velvet);
    flat(v, x0 + 2, y0 + 2, 0, x0 + 6, y0 + 6, 2, 2, null);
    // the pile: a lighter nap over its top, darker round its foot
    for (let x = x0; x <= x0 + 8; x++) for (let y = y0; y <= y0 + 8; y++) {
      if (v.has(x, y, 2) && ((x * 7 + y * 3) % 5 === 0 || (x + y * 5) % 7 === 0)) v.set(x, y, 2, fuzz);
      if (v.has(x, y, 0) && (x + y) % 2 === 0) v.set(x, y, 0, deep);
    }
    // a few tufts standing up off it
    for (const [dx, dy] of [[1, 4], [4, 7], [7, 2]] as const) v.set(x0 + dx, y0 + dy, 3, fuzz);
  };
  cuff(0, 7);
  cuff(9, 0);
  // the swivels on the facing sides, and three links of chain between them, each turned to the last
  v.box(7, 8, 1, 7, 9, 1, link); v.box(10, 4, 1, 11, 4, 1, link);
  v.box(8, 7, 1, 8, 8, 2, chain); v.box(9, 6, 0, 9, 6, 1, chain); v.box(9, 5, 1, 10, 5, 1, chain);
  return v;
}

/* ---- the enchanted toe ring of the leprous bandit ----
   4:2 the platinum box "contained a toe ring", slid "onto my left pinky". Its
   metal is never named: the plain ring, a size smaller. */
const toeRing = () => ring({ size: 4.6 });

/* ---- the gnomish drop bear ----
   4:3 "an open-air, twin-engine biplane, with each engine nestled between the
   wings", a pilot and "a second gnome passenger, facing backward", "Two
   ominous shapes hung under the main fuselage, hanging vertically ... egg-shaped
   ... attached to the bottom of the plane by a small net", and "The nose of the
   plane had a face painted on the side, some sort of gray, screaming animal. It
   looked almost like a jacked-up, rabid koala." Its metal is never coloured: a
   plain grey, the face lighter on it. A chibi of itself: the fuselage along x,
   its nose to the right, the wings across, the face on the nose's lit side, the
   two seats open and empty (the crew are not the plane). */
function dropBear(): Vox {
  const v = fresh();
  const body = '#5d646e', nose = '#4d545b', wing = '#8d949c', wingEdge = twin('#8d949c'), strut = '#3e434a', pit = '#16141a';
  const blade = '#3a2a1e', hubc = '#a4abb6', egg = '#7c858e', net = '#b59a5a';
  const koala = '#b4b9bf', ear = '#d6d9dd', mouth = '#6a1717', tooth = '#eeeae2', eye = '#1b1714';
  const y0 = 4, y1 = 9;                  // the fuselage, across
  // the fuselage, rounded along its edges, narrowing to the tail
  for (let x = 0; x <= 15; x++) {
    const t = x < 6 ? Math.ceil((6 - x) / 2) : 0;
    const a = y0 + t, b = y1 - t, lo = 2 + t, hi = 8;
    for (let y = a; y <= b; y++) for (let z = lo; z <= hi; z++)
      if (Math.min(y - a, b - y) + Math.min(z - lo, hi - z) >= 1) v.set(x, y, z, x >= 14 ? nose : body);
  }
  for (let y = y0 + 1; y <= y1 - 1; y++) for (let z = 3; z <= 7; z++) if (Math.min(y - y0 - 1, y1 - 1 - y) + Math.min(z - 3, 7 - z) >= 1) v.set(16, y, z, nose);
  // the two open seats on top, and a scrap of windscreen before the front one
  v.box(9, y0 + 1, 8, 11, y1 - 1, 8, pit); v.box(4, y0 + 2, 8, 6, y1 - 2, 8, pit);
  v.box(12, y0 + 1, 9, 12, y1 - 1, 9, strut);
  // the tail: a fin and the tailplane
  v.box(0, y0 - 2, 7, 2, y1 + 2, 7, wing);
  v.box(0, 6, 8, 2, 7, 11, wing); v.clear(2, 6, 11, 2, 7, 11);
  // the two wings across it, the lower through its belly and the upper on struts over the seats
  const s0 = -4, s1 = 17;
  for (const z of [2, 11]) { v.box(8, s0, z, 11, s1, z, wing); v.box(11, s0, z, 11, s1, z, wingEdge); }
  for (const y of [y0, y1]) v.box(9, y, 9, 9, y, 10, strut);
  for (const y of [s0 + 1, s1 - 1]) v.box(10, y, 3, 10, y, 10, strut);
  // the engines, nestled between the wings either side, a propeller on each
  for (const y of [1, 12]) {
    chamfer(v, 8, y - 1, 5, 12, y + 1, 8, 1, nose);
    v.box(9, y, 3, 9, y, 4, strut); v.box(9, y, 9, 9, y, 10, strut);
    v.set(13, y, 6, hubc); v.set(13, y, 7, hubc);
    v.box(14, y, 3, 14, y, 5, blade); v.box(14, y, 8, 14, y, 10, blade);
  }
  // the face painted on the nose's side: grey, wild-eared, screaming
  face(v, 12, y1, 3, ['e...e', 'ekkke', 'kxkxk', 'kmmmk', 'ktmtk', '.kkk.'], c => (c === 'e' ? ear : c === 'k' ? koala : c === 'x' ? eye : c === 'm' ? mouth : c === 't' ? tooth : null));
  // under the belly, the two eggs, hanging upright, each in its small net
  for (const ex of [12, 15]) {
    [[1, 0], [0, 1], [0, 0], [0, 1], [1, 0]].forEach(([inset, cut], i) => {
      const z = -5 + i, a = ex - 1 + inset, b = ex + 1 - inset, c = 5 + inset, d = 7 - inset;
      for (let x = a; x <= b; x++) for (let y = c; y <= d; y++)
        if (Math.min(x - a, b - x) + Math.min(y - c, d - y) >= cut) v.set(x, y, z, (x + y + z) % 3 === 0 ? net : egg);
    });
    v.box(ex, 6, 0, ex, 6, 1, net);
  }
  return v;
}

export const ITEMS_B4A: Record<string, Record<string, () => Vox>> = {
  'astral-paw-spellbook': { plain: spellbook },
  'belt-of-buoyancy': { plain: buoyancyBelt },
  'coffee-shop-author-kit': { writing: authorKit },
  'stock-certificate': { assorted: certificates },
  'dolores-doesnt-splat': { plain: splatPotion },
  'drakeas-kerchief-of-disorder': { spread: kerchief },
  'earth-patch': { printed: earthPatch },
  'petrify-rock-class-bolts': { plain: petrifyBolts },
  'anarchists-battle-rattle': {
    plain: () => battleRattle(),
    'one-patch': () => battleRattle({ earth: true }),
    'three-patches': () => battleRattle({ earth: true, arrows: true, bomb: true }),
    'four-patches': () => battleRattle({ earth: true, arrows: true, bomb: true, goat: true }),
    'five-patches': () => battleRattle({ earth: true, arrows: true, bomb: true, goat: true, peace: true }),
    'six-patches': () => battleRattle({ earth: true, arrows: true, bomb: true, goat: true, peace: true, clover: true }),
  },
  'gnome-farseerer': { telescope: farSeerer },
  'handcuffs': { velvet: handcuffs },
  'toe-ring-of-leprous-bandit': { plain: toeRing },
  'gnomish-drop-bear': { biplane: dropBear },
};
