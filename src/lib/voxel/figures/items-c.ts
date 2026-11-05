import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { chamfer } from './itemparts.ts';

/* ---- items, set c ----
   Drawn like the anchor set in items.ts: one object, floating, three-quarter
   view, smooth (chunk 0), facing +y. Each look from the edition's own
   description at its point; a colour the book leaves unsaid is a plain one. */

/** a block standing up in the xz plane with its corners cut back by `cut`: a panel seen face on */
function panel(v: Vox, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, cut: number, m: string) {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const dx = Math.min(x - x0, x1 - x), dz = Math.min(z - z0, z1 - z);
    if (dx + dz >= cut) v.box(x, y0, z, x, y1, z, m);
  }
}
/** rows of characters drawn onto the face at y, top row first, from (x0, z0 + rows - 1) */
function face(v: Vox, x0: number, y: number, z0: number, rows: string[], pick: (c: string) => string | null) {
  rows.forEach((row, j) => [...row].forEach((c, i) => { const m = pick(c); if (m) v.set(x0 + i, y, z0 + rows.length - 1 - j, m); }));
}

/* ---- the memorial crystal ----
   5:67 "a little, glowing gem ... maybe the size of a grape and had no color at
   all, but even in hologram form, it glittered as it moved." A long-cut gem,
   pointed at both ends, its facets in a few pale tones, sparks standing off it. */
/** a facet's second tone: the same colour a step darker */
const shadeOf = (hex: string) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.86).toString(16).padStart(2, '0')).join('');
/** a gem pointed at both ends, `rows` [inset, cut] from the bottom point up; the long faces
    in alternate facets, the upper and the lower point each a tone of their own */
function crystal(v: Vox, n: number, rows: [number, number][], top: string, side: string, low: string) {
  const c = (n - 1) / 2, body = rows.map(r => r[0]).indexOf(0), end = rows.map(r => r[0]).lastIndexOf(0);
  rows.forEach(([inset, cut], k) => {
    for (let x = inset; x < n - inset; x++) for (let y = inset; y < n - inset; y++) {
      const dx = Math.min(x - inset, n - 1 - inset - x), dy = Math.min(y - inset, n - 1 - inset - y);
      if (dx + dy < cut) continue;
      const facet = Math.floor(((Math.atan2(y - c, x - c) + Math.PI) / (Math.PI * 2)) * 8 + 0.5) % 2;
      v.set(x, y, k, k > end ? top : k < body ? low : facet ? side : shadeOf(side));
    }
  });
}
const GEM: [number, number][] = [[3, 0], [2, 1], [1, 2], [0, 3], [0, 3], [0, 3], [0, 3], [0, 3], [1, 2], [2, 1], [3, 0]];
function memorialGem(): Vox {
  const v = new Vox(); v.chunk = 0;
  crystal(v, 7, GEM, '#f2f5f9', '#e2e8f0', '#b4bfce');
  v.set(3, 5, 9, 'white'); v.set(4, 4, 9, 'white'); v.set(2, 6, 6, 'white'); v.set(6, 2, 5, 'white');
  // it glitters: sparks off its edges
  for (const [x, y, z] of [[-1, 9, 9], [9, 0, 10], [9, 8, 2], [0, 10, 3]] as const) v.set(x, y, z, 'white');
  return v;
}
/* 8:70 "The small glowing gem occasionally changed color, but right now it
   gently pulsed amber ... The necklace was set in silver and hung from a
   simple chain." The same cut, amber now, hung point down in a silver
   setting, its chain looped up over it. */
function memorialPendant(): Vox {
  const v = new Vox(); v.chunk = 0;
  const silver = '#c2c7cf', claw = twin('#c2c7cf');
  crystal(v, 7, GEM, '#eaa040', '#e0902a', '#c27222');
  for (let z = 3; z <= 6; z++) v.set(3, 6, z, 'window');
  v.set(6, 3, 4, 'window'); v.set(6, 3, 5, 'window');
  // the setting: a silver cap over its upper point, and four claws down from it
  for (let x = 0; x <= 6; x++) for (let y = 0; y <= 6; y++) for (const z of [9, 10]) if (v.has(x, y, z)) v.set(x, y, z, silver);
  for (const [x, y] of [[1, 3], [3, 1], [5, 3], [3, 5]] as const) v.set(x, y, 8, claw);
  for (const [x, y] of [[0, 3], [3, 0], [6, 3], [3, 6]] as const) v.set(x, y, 7, claw);
  // the bail and the chain, a wide loop of links rising over it
  v.box(3, 3, 11, 3, 3, 12, silver);
  const path: [number, number][] = [[3, 13], [2, 14], [1, 14], [0, 15], [-1, 16], [-2, 17], [-2, 18], [-1, 19], [0, 20], [1, 21], [2, 21], [3, 21], [4, 21], [5, 21], [6, 20], [7, 19], [8, 18], [8, 17], [7, 16], [6, 15], [5, 14], [4, 14]];
  path.forEach(([x, z], i) => v.set(x, 3, z, i % 2 ? silver : claw));
  return v;
}

/* ---- the scavenger's daughter, a back patch ----
   6:3 "a thick, black piece of fabric embroidered with a white pile of skulls
   from various creatures, rising up into a pyramid", the whole of it "covered
   in clear stitching". A full-sized back patch (its outline is never given, so
   a plain rounded oblong), standing face on to +y, the skulls raised on it,
   three, two and one, each a different creature's. */
// each skull five by five, a voxel of bare cloth between them; 'o' a dark hole
const SKULLS: { x: number; z: number; rows: string[] }[] = [
  { x: 1, z: 1, rows: ['.###.', '#####', '#o#o#', '##o##', '.#.#.'] },    // a man's, its teeth
  { x: 7, z: 1, rows: ['.###.', '#####', '#o#o#', '.###.', '..#..'] },    // a beak
  { x: 13, z: 1, rows: ['.###.', '#####', '#o#o#', '##o##', '#####'] },   // a wide jaw
  { x: 4, z: 7, rows: ['.###.', '#####', '#o#o#', '##o##', '#...#'] },    // fangs
  { x: 10, z: 7, rows: ['#####', '#o#o#', '#####', '.#o#.', '.###.'] },   // a long snout
  { x: 7, z: 13, rows: ['.###.', '#####', '#o#o#', '##o##', '.###.'] },   // horned, below
];
const PATCH_BLACK = '#2a2830', HOLE = '#141216', BONE = '#ebe6da', BONE2 = '#ddd6c6';
function patchBase(v: Vox, stitch: string | null) {
  panel(v, 0, 0, 0, 18, 1, 18, 3, PATCH_BLACK);
  // the clear stitching over the whole cloth: fine glinting runs, no picture in them
  if (stitch) for (let x = 1; x <= 17; x++) for (let z = 1; z <= 17; z++) {
    if ((x * 3 + z * 5) % 7 === 0 && z % 2 === 0 && v.has(x, 1, z)) v.set(x, 1, z, stitch);
  }
  SKULLS.forEach((s, k) => face(v, s.x, 2, s.z, s.rows, c => (c === '#' ? (k % 2 ? BONE2 : BONE) : c === 'o' ? HOLE : null)));
  // the top skull's horns, curling out and up
  for (const [x, z] of [[6, 16], [5, 17], [12, 16], [13, 17]] as const) v.set(x, 2, z, BONE);
}
function scavengersPatch(): Vox {
  const v = new Vox(); v.chunk = 0;
  patchBase(v, '#454856');
  return v;
}
/* 6:7 the "stitches all around the pile of skulls are glowing ... brown";
   6:72 "a centipede crawling through all the skulls". Fed, the stitches light
   up, and the picture in them shows. */
function scavengersGlowing(): Vox {
  const v = new Vox(); v.chunk = 0;
  patchBase(v, null);
  const lit = '#c2915a', seg = '#a2723f', leg = '#8e6136';
  // the body winds up the left of the pile, over its top and down the right, head last
  const body: [number, number][] = [
    [0, 3], [0, 4], [0, 5], [0, 6], [1, 7], [2, 8], [2, 9], [2, 10], [2, 11], [2, 12], [3, 13], [3, 14], [3, 15], [3, 16], [4, 17], [5, 18],
    [6, 18], [7, 18], [8, 18], [9, 18], [10, 18], [11, 18], [12, 18], [13, 18],
    [14, 17], [15, 16], [15, 15], [15, 14], [15, 13], [16, 12], [16, 11], [16, 10], [16, 9], [16, 8], [17, 7], [18, 6], [18, 5],
  ];
  const free = (x: number, z: number) => v.has(x, 1, z) && !v.has(x, 2, z);
  body.forEach(([x, z], i) => v.set(x, 2, z, i % 2 ? seg : lit));
  // a leg off every other segment, on the side away from the pile
  const cx = 9, cz = 8;
  body.forEach(([x, z], i) => {
    if (i % 2 || i === 0 || i >= body.length - 1) return;
    const [ax, az] = body[i - 1], [bx, bz] = body[i + 1];
    let nx = Math.sign(-(bz - az)), nz = Math.sign(bx - ax);
    if ((x + nx - cx) * (x - cx) + (z + nz - cz) * (z - cz) < (x - cx) ** 2 + (z - cz) ** 2) { nx = -nx; nz = -nz; }
    if (free(x + nx, z + nz)) v.set(x + nx, 2, z + nz, leg);
  });
  // the head, and its feelers reaching down past the pile
  v.box(18, 2, 3, 18, 2, 4, leg); v.set(17, 2, 2, lit); v.set(18, 2, 2, lit);
  return v;
}

/* ---- the orchid of eileithyia's grace ----
   6:19 "It was a pink flower bud. An orchid." Loose in the box it came in;
   the stem it was cut from a plain green. */
function orchidBud(): Vox {
  const v = new Vox(); v.chunk = 0;
  const pink = '#e47aa9', fold = '#c4598a', tip = '#f4b2cd', green = '#5a9a3e', cup = twin('#5a9a3e');
  // the stem it was cut from, curving away forward, and the cup the bud sits in
  v.box(4, 9, 0, 4, 10, 0, green); v.set(4, 8, 1, green); v.set(4, 7, 2, green); v.set(4, 6, 3, green); v.set(4, 5, 4, green);
  chamfer(v, 3, 3, 4, 5, 5, 4, 1, cup);
  // the bud: a teardrop, widest low, leaning forward to a point
  const layers: [number, number, number, number][] = [ // [x0, x1, z, cut]
    [2, 6, 5, 2], [1, 7, 6, 3], [1, 7, 7, 3], [1, 7, 8, 3], [2, 6, 9, 2], [2, 6, 10, 2], [3, 5, 11, 1], [3, 5, 12, 1],
  ];
  layers.forEach(([a, b, z, cut]) => {
    const lean = z >= 10 ? 1 : 0;
    chamfer(v, a, a + lean, z, b, b + lean, z, cut, z >= 11 ? tip : pink);
  });
  v.set(4, 5, 13, tip);
  // the edge of a folded petal, wrapping round it
  for (const [x, y, z] of [[2, 7, 6], [3, 7, 7], [4, 7, 8], [5, 7, 9], [6, 7, 10], [7, 4, 7], [7, 5, 8], [6, 6, 11]] as const) if (v.has(x, y, z)) v.set(x, y, z, fold);
  // two sepals of the cup reaching up its base
  for (const [x, y, z] of [[4, 6, 5], [6, 4, 5], [4, 7, 6]] as const) if (v.has(x, y, z)) v.set(x, y, z, cup);
  return v;
}

/* ---- the book of voodoo ----
   6:40 "A thick, diary-like book filled with blank paper. There were probably
   three or four hundred pages. The cover was a hard, black leather with no
   title." Lying flat, the boards proud of the page block, the spine behind. */
function voodooBook(): Vox {
  const v = new Vox(); v.chunk = 0;
  const leather = '#332f39', page = '#ebe3d0', line = '#d0c5aa';
  // the boards, under and over
  chamfer(v, 0, 0, 0, 10, 13, 0, 1, leather);
  chamfer(v, 0, 0, 6, 10, 13, 6, 1, twin(leather));
  // the page block, layer on layer, showing at the head and the fore-edge
  for (let z = 1; z <= 5; z++) v.box(1, 1, z, 9, 12, z, z % 2 ? page : line);
  // the spine, rounded, along the back
  v.box(0, 0, 1, 0, 13, 5, leather);
  v.box(-1, 0, 2, -1, 13, 4, leather);
  return v;
}

/* ---- the sapient nickel sock ----
   6:64 "It was a white tube sock with red and blue stripes at the very top.
   It sagged heavily. It was old, crusty, and splattered with blood." Lying on
   its side as a sock lies on a floor: the leg runs forward to its open,
   striped cuff at +y, a nickel peeking out of the mouth; the foot bends off
   at the heel to the right, lumpy with the coin in it. `k` is how far it has grown: 7:68 "significantly
   larger than it had been before"; 8:24 "his giant stinking nickel sock". */
function sock(k: 0 | 1 | 2): Vox {
  const v = new Vox(); v.chunk = 0;
  const white = '#e6e1d3', crust = '#cbbd95', red = '#c22a22', blue = '#2e4f9c', blood = '#7d1b17', nickel = '#b3b7bd', mouth = '#3a2f26';
  const W = [5, 7, 8][k], H = [4, 5, 6][k], leg = [10, 12, 13][k], foot = [8, 9, 10][k];
  /* one slice of the soft tube across `u` (x for the leg, y for the foot): flat
     where it lies, rounded over the top, `grow` voxels fatter where coin bunches */
  const slice = (put: (u: number, z: number) => void, grow = 0, sag = 0) => {
    const w = W + grow * 2, h = H + grow - sag;
    for (let u = 0; u < w; u++) for (let z = 0; z < h; z++) {
      const du = Math.min(u, w - 1 - u), upper = z >= h / 2, dz = upper ? h - 1 - z : z;
      if (du + dz >= (upper && w >= 7 ? 2 : 1)) put(u - grow, z);
    }
  };
  // the leg, from the heel (y 0) to the cuff; emptier than the foot, so it lies flatter
  for (let y = 0; y <= leg; y++) {
    const sag = y > W && y < leg - 3 ? 1 : 0, bow = y > W && y < leg - 4 ? 1 : 0;   // slack, and bowed a little
    const m = y === leg - 1 ? red : y === leg - 3 ? blue : white;
    slice((u, z) => v.set(u - bow, y, z, m), 0, sag);
  }
  // the heel: the outer corner of the bend rounded off
  for (let x = 0; x < W; x++) for (let y = 0; y < W; y++) if (x + y < 2) for (let z = 0; z < H + 1; z++) v.set(x, y, z, null);
  // the foot, bending away from the heel to a rounded toe, lumpy with nickels
  const lumps = [Math.round(foot * 0.2), Math.round(foot * 0.55)];
  for (let i = 0; i < foot; i++) {
    const x = W + i;
    const grow = lumps.some(c => i >= c - (k ? 1 : 0) && i <= c + 1 && i < foot - 2) ? 1 : 0;
    if (i === foot - 1) slice((u, z) => { if (u > 0 && u < W - 1 && z < H - 1) v.set(x, u, z, white); });   // the toe, rounding off
    else slice((u, z) => v.set(x, u, z, white), grow);
  }
  // the open mouth at the cuff, dark inside, a nickel peeking out of it
  for (let x = 1; x < W - 1; x++) for (let z = 1; z < H - 1; z++) v.set(x, leg, z, mouth);
  const c = Math.floor(W / 2);
  v.box(c - 1, leg + 1, 1, c, leg + 1, 1 + (k ? 1 : 0), nickel); v.set(c, leg, 1, twin(nickel));
  // old crust and splashes of blood, here and there on the faces that show
  const r = (x: number, y: number, z: number) => (((x + 40) * 73856093 ^ (y + 40) * 19349663 ^ z * 83492791) >>> 0) % 997 / 997;
  for (const { p: [x, y, z], mat } of v.all()) {
    if (mat !== white || y >= leg - 3) continue;
    if (v.has(x, y, z + 1) && v.has(x, y + 1, z) && v.has(x + 1, y, z)) continue;
    const t = r(x, y, z);
    if (t < 0.025) { v.set(x, y, z, blood); if (v.get(x, y, z - 1) === white) v.set(x, y, z - 1, blood); }
    else if (t < 0.055) v.set(x, y, z, crust);
  }
  return v;
}

/* ---- the tiara of a thousand lights, on its charge pillow ----
   7:3 "A red, fluffy pillow with a glittering, shining, opalescent tiara
   placed upon it", the pillow like velvet, the dainty tiara "covered in about
   a hundred, tiny jewels, each sparkling a different color." 7:73, charged, it
   "glowed like a lighthouse beacon": its jewels lit. */
const JEWELS = ['#e8506a', '#4fb3ff', '#6fdc7a', '#ffd34a', '#c07aff', '#ff9a4a', '#7ff0e6', '#ff7ad2'];
const LIGHTS = ['portal', 'window', 'laser', 'ember'];
// the front, standing up over the band: '#' the opalescent metal, 'J' a jewel
const FAN = [
  '.....J.....',
  '.....#.....',
  '..J..#..J..',
  '..#.###.#..',
  'J.#J###J#.J',
  '#.#######.#',
  '#J#J#J#J#J#',
  '###########',
];
function tiara(lit: boolean): Vox {
  const v = new Vox(); v.chunk = 0;
  const velvet = '#b3202e', plush = twin('#b3202e'), opal = '#efeaf4', sheen = '#dde6f3';
  // the pillow: a plump cushion, higher in the middle
  chamfer(v, 1, 1, 0, 11, 11, 0, 3, velvet);
  chamfer(v, 0, 0, 1, 12, 12, 2, 3, velvet);
  chamfer(v, 2, 2, 3, 10, 10, 3, 3, plush);
  let n = 0;
  const jewel = () => { const i = n++; return lit && i % 3 !== 2 ? LIGHTS[i % LIGHTS.length] : JEWELS[(i * 3) % JEWELS.length]; };
  // the band: a thin oval ring lying on the cushion, jewels set round it
  for (let x = 1; x <= 11; x++) for (let y = 2; y <= 8; y++) {
    const dx = Math.min(x - 1, 11 - x), dy = Math.min(y - 2, 8 - y);
    if (dx + dy >= 2 && !(dx >= 1 && dy >= 1 && dx + dy >= 3) && y < 8) v.set(x, y, 4, (x + y) % 3 === 0 ? jewel() : opal);
  }
  // the front rises in fine points, a jewel set in each, all of it facing forward
  face(v, 1, 8, 4, FAN, c => (c === '#' ? opal : c === 'J' ? jewel() : null));
  v.set(6, 8, 9, sheen); v.set(5, 8, 8, sheen); v.set(7, 8, 8, sheen);
  return v;
}

/* ---- the tilt-rotor airship ----
   7:6 "the sleek, silver tube sitting on a pair of chopper-like landing
   skids", the rounded nose "heavily tinted glass", no wings or tail, "four,
   rectangle-shaped protuberances on the top", windows dotting either side and
   the bottom glass. Its propellers are folded away, never seen. A chibi of
   itself: the squat tube runs along x, nose to the right. */
function airship(): Vox {
  const v = new Vox(); v.chunk = 0;
  const silver = '#bfc5ce', hump = twin('#bfc5ce'), tint = '#2c3a4a', glint = '#7891ab', belly = '#3e5064', skid = '#666c75', window = '#33404f';
  const L = 14;
  // the fuselage: a squished oval in section, rounding off into a bullet nose
  const taper = (x: number) => (x === 0 ? 1 : x <= L - 4 ? 0 : x - (L - 4));
  for (let x = 0; x <= L; x++) for (let y = 0; y <= 7; y++) for (let z = 2; z <= 7; z++) {
    const dy = Math.min(y, 7 - y), dz = Math.min(z - 2, 7 - z), t = taper(x);
    if (dy + dz < 2 + t || dy < t - 1 || dz < t - 2) continue;
    v.set(x, y, z, x >= L - 3 && z >= 3 ? tint : z === 2 ? belly : silver);
  }
  // a streak of light across the tinted glass of the nose
  for (const x of [L - 3, L - 2, L - 1]) {
    let best: [number, number] | null = null;
    for (let y = 0; y <= 7; y++) for (let z = 3; z <= 7; z++) if (v.get(x, y, z) === tint && (!best || y + z > best[0] + best[1])) best = [y, z];
    if (best) v.set(x, best[0], best[1], glint);
  }
  // windows dotting the side
  for (const x of [2, 4, 6, 8]) v.set(x, 7, 5, window);
  // four rectangular humps on the roof
  for (const x of [1, 4, 7, 10]) v.box(x, 3, 8, x + 1, 4, 8, hump);
  // the skids: two runners on struts, turned up at the front
  for (const y of [1, 6]) {
    v.box(1, y, 0, L - 3, y, 0, skid); v.set(L - 2, y, 1, skid);
    for (const x of [3, L - 5]) v.box(x, y, 1, x, y, 2, skid);
  }
  return v;
}

export const ITEMS_C: Record<string, Record<string, () => Vox>> = {
  'memorial-crystal': { gem: memorialGem, pendant: memorialPendant },
  'scavengers-daughter': { patch: scavengersPatch, glowing: scavengersGlowing },
  'orchid-of-eileithyias-grace': { bud: orchidBud },
  'voodoo-book': { closed: voodooBook },
  'mr-jefferson': { sock: () => sock(0), swollen: () => sock(1), giant: () => sock(2), shrunk: () => sock(0) },
  'tiara-of-a-thousand-lights': { pillow: () => tiara(false), beacon: () => tiara(true) },
  'party-planner': { docked: airship },
};
