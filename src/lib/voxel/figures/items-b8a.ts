import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { lathe, chamfer } from './itemparts.ts';
import { scroll, tome, patch } from './itemforms.ts';

/* ---- items, batch b8a (books 7 and 8) ----
   The anchor set's conventions (items.ts): one object, floating, three-quarter
   view, drawn smooth (chunk 0), facing +y (the lit left face), z up. Each look
   is drawn from the edition's own description at its point; a colour the book
   leaves unsaid takes a plain one. Shapes and colours only. */

const fresh = () => { const v = new Vox(); v.chunk = 0; return v; };

/** a disc standing in the x-z plane, y0..y1 thick: an octagon, which reads round where a stepped circle reads as a heap */
function disc(v: Vox, cx: number, cz: number, y0: number, y1: number, r: number, m: string | ((x: number, z: number) => string | null)) {
  for (let x = cx - r; x <= cx + r; x++) for (let z = cz - r; z <= cz + r; z++) {
    if (Math.abs(x - cx) + Math.abs(z - cz) > r + Math.floor(r / 2)) continue;
    const c = typeof m === 'string' ? m : m(x, z);
    if (c) v.box(x, y0, z, x, y1, z, c);
  }
}
/** rows of characters drawn onto the face at y, top row first, from (x0, z0 + rows - 1) */
function face(v: Vox, x0: number, y: number, z0: number, rows: string[], pick: (c: string) => string | null) {
  rows.forEach((row, j) => [...row].forEach((c, i) => { const m = pick(c); if (m) v.set(x0 + i, y, z0 + rows.length - 1 - j, m); }));
}
/** a straight bar of voxels from one point to another, stepped along its longest axis */
function bar(v: Vox, a: [number, number, number], b: [number, number, number], m: string) {
  const n = Math.max(...a.map((p, i) => Math.abs(b[i] - p)));
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0;
    v.set(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), m);
  }
}
/** a seeded value in [0, 1) for a voxel, so a pattern is the same every render */
const hash = (x: number, y: number, z: number) => (((x + 64) * 73856093 ^ (y + 64) * 19349663 ^ (z + 64) * 83492791) >>> 0) % 997 / 997;

/* ---- the assassin's veil ----
   8:8 "an Egyptian-style beaded headdress", "something one would have seen on
   Cleopatra". "Red, yellow, and orange beads cascaded down either side of her
   face", and "it doesn't cover my face". A beaded cap, strands of beads hanging
   down either side, the middle open where the face goes, facing +y. */
function assassinsVeil(): Vox {
  const v = fresh();
  const red = '#c22a22', orange = '#e0782a', yellow = '#e8c23a';
  const beads = [red, orange, yellow];
  const bead = (k: number) => beads[((k % 3) + 3) % 3];
  // the cap, rows of beads round it, a bead and its neighbour a step apart
  const cap: [number, number, number, number, number, number][] = [[0, 0, 9, 10, 9, 3], [0, 0, 10, 10, 9, 3], [1, 1, 11, 9, 8, 3], [2, 2, 12, 8, 7, 2]];
  cap.forEach(([x0, y0, z, x1, y1, cut]) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      if (Math.min(x - x0, x1 - x) + Math.min(y - y0, y1 - y) < cut) continue;
      const c = bead(z);
      v.set(x, y, z, (x + y) % 2 ? c : twin(c));
    }
  });
  // a row of beads across the brow
  for (let x = 2; x <= 8; x++) v.set(x, 9, 8, x % 2 ? yellow : red);
  // the strands, either side of the face, long to the back and the front, each its own run of colours
  for (const x of [0, 2, 8, 10]) for (const y of [1, 3, 5, 7, 9]) {
    const end = x === 0 || x === 10 ? 1 : 2;
    if ((x === 2 || x === 8) && y === 9) continue;               // the brow is open between the outer strands
    for (let z = 8; z >= end; z--) v.set(x, y, z, bead(z + y + x));
  }
  return v;
}

/* ---- the big shot chicken truck ----
   8:2 "The colorful, gleaming truck", "about twenty feet long", "basically the
   same body of a package delivery truck", "the now-familiar logo of a chicken
   with a fedora and red tie was painted on the side under the bullet-hole-ridden
   logo". "The front was replaced with a faux-1920s-style hood", "curved fenders
   made of shining chrome and round fluted headlamps", and "the massive clearly
   plastic tommy gun on the roof", whose "gigantic round drum magazine" hangs in
   front of the windshield. The body's colours are never given: a plain white,
   the gun a plain dark plastic. The serving window is a food truck's; 8:96 has
   flames "from the side window near the deep fryer". A chibi of itself, its nose
   to +x and its side to the lit +y face, where the logo is.
   8:90 "We'd removed the tommy gun and installed a platform on the roof", and the
   crew "covering every square inch of everything" in dahlias, "black, gold,
   magenta, and white", the logo and the chicken under them too (what stood on
   the platform is not drawn: it was a surprise until 8:92). 8:93 "the massive
   magic missile launcher we'd looted", "affixed to the roof". 8:96 "flames
   pouring from the side window near the deep fryer", "The missile launcher was
   wrecked." 8:98 "so smashed up, I was surprised it was still running", "The
   whole thing stank like fire."
   The spider legs, the tires and the shield of the race upgrades are folded away
   or switched off when it stands, and the drum blasted off at 8:63 came back with
   the truck after every race, so none of them is a look of its own. */
type Truck = 'truck' | 'float' | 'launcher' | 'burning' | 'smashed';
const TRUCK: Truck[] = ['truck', 'float', 'launcher', 'burning', 'smashed'];
const BLOOMS = ['#26232a', '#d9a93a', '#c2308a', '#f1ece4'], HEARTS = ['#5a5262', '#9c721e', '#7e1a58', '#c4bcae'];
// the bullet-hole-ridden logo: a line of lettering, '#' paint, 'o' a bullet hole through it
const LOGO = [
  '.......o....',
  '###.####o##.',
  '..o.........',
];
// the chicken in its fedora and red tie, painted under it: 'h' hat, 'w' head, 'e' eye, 'b' beak, 't' tie
const EMBLEM = [
  '.hhh.',
  'hhhhh',
  '.www.',
  '.wewb',
  '.ww..',
  '..t..',
  '..t..',
];
/** the dahlias: round blooms (diamonds two out from a heart) packed edge to edge, which tile the
    face exactly; each bloom one colour, its heart a step darker */
function bloom(u: number, w: number, seed: number): string {
  for (let du = -2; du <= 2; du++) for (let dw = -2; dw <= 2; dw++) {
    if (Math.abs(du) + Math.abs(dw) > 2) continue;
    const cu = u + du, cw = w + dw;
    if ((((cu + 8 * cw) % 13) + 13) % 13) continue;
    const k = Math.floor(hash(cu, cw, seed) * 4);
    return du === 0 && dw === 0 ? HEARTS[k] : BLOOMS[k];
  }
  return BLOOMS[0];
}
function chickenTruck(s: Truck): Vox {
  const v = fresh();
  const at = (t: Truck) => TRUCK.indexOf(s) >= TRUCK.indexOf(t);
  const white = '#ebe7de', cab = twin('#ebe7de'), hood = '#e2ddd2', skirt = '#a9a59c', deck = '#8a5a32';
  const glass = '#2f3b48', glint = '#6f86a0', chrome = '#c9d0d8', shine = '#f2f5f8', tyre = '#2a2a2e', hub = '#8c939b', lamp = '#f6efc8';
  const plastic = '#3b3d44', plasticLit = '#5a5d66', ink = '#34373f', hole = '#141216';
  const burnt = '#2b2522', soot = '#4d433c';
  const R = 11;                                                             // the roof
  // the body: a delivery truck's box, its roof edges rounded
  chamfer(v, 0, 1, 2, 13, 8, R, 1, white);
  for (let x = 0; x <= 13; x++) { v.set(x, 1, R, null); v.set(x, 8, R, null); }
  v.box(0, 1, 2, 13, 8, 2, skirt);
  // the serving window on the side, its counter under it; the logo along the top, the chicken under it
  v.box(1, 8, 5, 5, 8, 7, glass); v.set(1, 8, 7, glint); v.set(2, 8, 7, glint);
  v.box(1, 9, 4, 5, 9, 4, skirt);
  face(v, 1, 8, 8, LOGO, c => (c === '#' ? ink : c === 'o' ? hole : null));
  face(v, 7, 8, 1, EMBLEM, c => ({ h: '#2b2930', w: '#faf7f0', e: '#1b1714', b: '#e0902a', t: '#c22a22' } as Record<string, string>)[c] ?? null);
  // the cab, its windshield to the front and a window each side
  chamfer(v, 14, 1, 2, 16, 8, 9, 1, cab);
  v.clear(14, 1, 9, 16, 1, 9); v.clear(14, 8, 9, 16, 8, 9); v.clear(16, 1, 9, 16, 8, 9);
  v.box(16, 2, 6, 16, 7, 8, glass); v.set(16, 7, 8, glint); v.set(16, 6, 8, glint);
  for (const y of [1, 8]) { v.box(14, y, 6, 15, y, 8, glass); v.set(15, y, 8, glint); }
  v.box(14, 1, 2, 16, 8, 2, skirt);
  // the faux-1920s hood, round fluted headlamps standing either side of it
  chamfer(v, 17, 2, 2, 19, 7, 5, 1, hood);
  v.box(17, 3, 5, 19, 6, 5, hood);
  for (const y of [1, 7]) { v.box(20, y, 4, 20, y + 1, 5, chrome); v.box(21, y, 4, 21, y + 1, 5, lamp); v.set(20, y, 5, shine); }
  // the wheels, and the curved chrome fenders swooping over the front pair
  const wheel = (cx: number, y0: number, y1: number, out: number) => {
    disc(v, cx, 2, y0, y1, 2, tyre);
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) v.set(cx + dx, out, 2 + dz, hub);
  };
  for (const [y0, y1, out] of [[0, 1, 0], [8, 9, 9]] as const) {
    wheel(3, y0, y1, out); wheel(16, y0, y1, out);
    for (const [x, z] of [[13, 3], [14, 4], [15, 5], [16, 5], [17, 5], [18, 4], [19, 4], [20, 3]] as const) v.box(x, y0, z, x, y1, z, chrome);
    for (const x of [15, 16, 17]) v.set(x, out === 0 ? 0 : 9, 5, shine);
  }
  if (!at('float')) {
    // the plastic tommy gun along the roof, the stock at the back, the barrel out over the hood
    v.box(4, 4, R + 1, 16, 5, R + 2, plastic); v.box(4, 4, R + 2, 16, 5, R + 2, plasticLit);
    v.box(0, 4, R + 1, 3, 5, R + 1, plastic); v.box(0, 4, R + 2, 1, 5, R + 3, plastic);
    v.box(17, 4, R + 2, 21, 5, R + 2, plastic); v.box(17, 4, R + 3, 18, 5, R + 3, plasticLit);
    v.box(20, 4, R, 20, 5, R + 1, plastic);                                 // the front grip
    v.box(21, 4, R + 3, 21, 5, R + 3, plastic);                             // the sight
    // the drum, its round face to the side, hanging in front of the windshield
    disc(v, 18, 9, 2, 7, 2, plastic);
    disc(v, 18, 9, 8, 8, 1, plasticLit); v.set(18, 8, 9, plastic);
    v.box(17, 4, R - 1, 18, 5, R + 1, plastic);
    return v;
  }
  // the float: a platform on the roof, and dahlias stuck over every surface
  v.box(1, 2, R, 12, 7, R, deck);
  v.box(0, 0, R + 1, 13, 9, R + 1, deck);
  const bare = new Set([glass, glint, chrome, shine, tyre, hub, lamp]);
  for (const { p: [x, y, z], mat } of v.all()) {
    if (bare.has(mat)) continue;
    if (!v.has(x, y, z + 1)) v.set(x, y, z, bloom(x, y, 1));
    else if (!v.has(x, y + 1, z) || !v.has(x, y - 1, z)) v.set(x, y, z, bloom(x, z, 2));
    else if (!v.has(x + 1, y, z) || !v.has(x - 1, y, z)) v.set(x, y, z, bloom(y, z, 3));
  }
  const T = R + 2;                                                          // the top of the platform
  if (at('launcher')) {
    // the looted launcher on its turntable, turned to the side: a pod of tubes, their mouths in rows
    const steel = '#6b737c', steelLit = '#8c939b', mouth = '#16141a', base = '#3e4349';
    chamfer(v, 4, 3, T, 9, 7, T, 2, base);
    chamfer(v, 3, 2, T + 1, 10, 8, T + 3, 1, steel);
    chamfer(v, 3, 2, T + 4, 10, 7, T + 4, 1, steelLit);
    for (const x of [4, 6, 8]) for (const z of [T + 1, T + 3]) v.box(x, 8, z, x + 1, 8, z, mouth);
    if (at('burning')) {
      // wrecked: torn open, blackened, a tube bent up out of it
      v.clear(7, 4, T + 2, 10, 8, T + 3); v.clear(9, 2, T + 3, 10, 4, T + 3);
      for (const [x, y, z] of [[6, 8, T + 3], [6, 7, T + 3], [7, 3, T + 3], [8, 2, T + 3], [7, 8, T + 1], [9, 8, T + 1], [10, 6, T + 1]] as const) v.set(x, y, z, burnt);
      v.box(7, 4, T + 1, 10, 7, T + 1, soot);
      bar(v, [8, 6, T + 2], [11, 7, T + 4], steel);
    }
  }
  if (at('burning')) {
    // scorched round the serving window and up the side, the blooms burnt off it
    for (let x = 0; x <= 9; x++) for (let z = 2; z <= R + 1; z++) {
      const m = v.get(x, 8, z); if (!m || m === glass) continue;
      const r = Math.hypot(x - 3, (z - 6.5) * 0.75);
      if (r < 3.6 + hash(x, 8, z) * 2.2) v.set(x, 8, z, r < 3 ? burnt : soot);
    }
    v.box(1, 8, 5, 5, 8, 7, hole);
  }
  if (s === 'burning') {
    // the fire pouring out of the window and licking up the side
    for (const [x, y, z] of [[1, 9, 6], [2, 9, 7], [3, 9, 6], [4, 9, 7], [5, 9, 6], [2, 9, 8], [4, 9, 9], [3, 9, 10], [1, 9, 9]] as const) v.set(x, y, z, 'ember');
    for (const [x, y, z] of [[2, 10, 7], [4, 10, 8], [3, 10, 9], [2, 10, 10], [4, 10, 11], [3, 10, 12], [1, 10, 11], [5, 10, 10], [3, 9, 13], [2, 10, 14]] as const) v.set(x, y, z, 'flame');
  }
  if (s === 'smashed') {
    // stove in: corners and the roof's edge knocked away, the windshield and a lamp gone, a fender torn off
    v.clear(0, 7, 8, 1, 9, R + 1); v.clear(12, 8, 9, 13, 9, R + 1); v.clear(0, 0, R + 1, 2, 2, R + 1);
    v.clear(16, 2, 6, 16, 5, 8); v.box(15, 2, 6, 15, 5, 8, hole);
    v.clear(21, 7, 4, 21, 8, 5); v.clear(18, 8, 4, 20, 9, 4);
    v.box(13, 9, 3, 13, 9, 3, burnt);
    for (const [x, y, z] of [[9, 8, 9], [10, 8, 10], [11, 8, 3], [12, 8, 4], [14, 8, 4], [17, 7, 5], [6, 8, 10], [7, 8, 2]] as const) if (v.has(x, y, z)) v.set(x, y, z, soot);
  }
  return v;
}

/* ---- big-ass magnet ----
   8:62 a page of the banquet book: a letter, then "Drawing: A well-shaded, curved
   piece of metal with little electric bolts coming off it." The page standing
   face on to +y, its lines of writing at the top, the drawing under them in
   pencil greys: a bent bar of metal, shaded, and little zigzag bolts round it. */
const DRAWING = [
  '.zz.........zz.',
  'zz..#ll.mm#..zz',
  '.zz.#ll.mm#.zz.',
  'zz..#ll.mm#..zz',
  '....#ll.mm#....',
  '.zz.#llmmm#.zz.',
  'zz...#lmm#...zz',
  '.zz...###...zz.',
];
function magnetPage(): Vox {
  const v = fresh();
  const paper = '#e6dcc2', back = twin('#e6dcc2'), writing = '#8f8676', light = '#c0c4ca', mid = '#8a8f97', dark = '#53575f', bolt = '#3e4148';
  // the sheet, its top corner curling forward
  for (let x = 0; x <= 14; x++) for (let z = 0; z <= 16; z++) { v.set(x, 0, z, back); v.set(x, 1, z, paper); }
  v.clear(13, 0, 15, 14, 1, 16); v.clear(12, 0, 16, 12, 1, 16);
  v.set(13, 2, 15, paper); v.set(14, 2, 14, paper); v.set(12, 2, 16, paper);
  // a few lines of the letter
  for (const [x0, x1, z] of [[1, 10, 15], [1, 12, 13], [1, 8, 11]] as const) v.box(x0, 1, z, x1, 1, z, writing);
  // the drawing: the curved metal, lit on its left, shaded on its right, bolts sparking off it
  face(v, 0, 1, 1, DRAWING, c => (c === '#' ? dark : c === 'l' ? light : c === 'm' ? mid : c === 'z' ? bolt : null));
  return v;
}

/* ---- eris's five-sided coin ----
   8:35 "It appeared to be just a regular coin. It was about the size of a poker
   chip but metal. It had her laughing face on one side and a swirl on the
   other." Its base form, the face side to +y, a raised rim round it. The metal
   is never coloured: a plain silver grey. */
const LAUGH = [
  '..#...#..',
  '.#.#.#.#.',
  '.........',
  '.#######.',
  '.#ooooo#.',
  '..#ooo#..',
  '...###...',
];
function erisCoin(): Vox {
  const v = fresh();
  const metal = '#b9bec6', rim = '#d4d8dd', line = '#5d636b', mouth = '#3a3e45';
  const c = 6, r = 6;
  disc(v, c, c, 0, 1, r, metal);
  disc(v, c, c, 2, 2, r, (x, z) => (Math.abs(x - c) + Math.abs(z - c) >= r + Math.floor(r / 2) - 1 || Math.abs(x - c) === r || Math.abs(z - c) === r ? rim : null));
  // her laughing face, struck into it: eyes screwed shut, the mouth wide open
  face(v, c - 4, 1, c - 3, LAUGH, ch => (ch === '#' ? line : ch === 'o' ? mouth : null));
  return v;
}

/* ---- the crupper of the benevolent champion ----
   8:8 "a plain silver crupper similar in appearance to the one she was already
   wearing, though this was made of fine chain mail as opposed to larger scales";
   the old one "hung like a skirt across her backside" (2:20). A rounded shell of
   fine mail draped over a rump that is not there, hanging to a fringed hem, its
   open front to +x. 8:9 "there was an opalescent glow to the armor". */
function crupper(glow: boolean): Vox {
  const v = fresh();
  const silver = glow ? '#d4d8de' : '#c3c8cf', ring = glow ? '#bfc4cc' : '#a3a9b2', inside = glow ? '#8f8aa0' : '#6f747c';
  const opal = ['#e8cfe0', '#c8e6e3', '#d8d0f0', '#eee2c4'];
  const X1 = 11, Y1 = 9, Z1 = 8;
  // the top: arched across the back, rounding down over the rump at the rear (-x)
  const top = (x: number, y: number) => Z1 - Math.round(((y - Y1 / 2) / (Y1 / 2)) ** 2 * 3) - Math.max(0, 3 - x);
  const shell = (x: number, y: number, z: number) => x >= 0 && x <= X1 && y >= 0 && y <= Y1 && z >= 0 && z <= top(x, y);
  // two thick, so the outside is mail and the inside, seen through the open front, is in shadow
  const hollow = (x: number, y: number, z: number) => x >= 2 && y >= 2 && y <= Y1 - 2 && z <= top(x, y) - 2 && z <= top(x, y - 1) - 2 && z <= top(x, y + 1) - 2;
  const solid = (x: number, y: number, z: number) => shell(x, y, z) && !hollow(x, y, z);
  for (let x = 0; x <= X1; x++) for (let y = 0; y <= Y1; y++) for (let z = 0; z <= Z1; z++) {
    if (!solid(x, y, z)) continue;
    const out = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1]].some(([a, b, c]) => !shell(x + a, y + b, z + c));
    if (z === 0 && out && (x + y) % 2) continue;                            // the fringed hem
    let m = (x + y + z) % 2 ? silver : ring;                                // fine rings, row on row
    if (glow && m === ring) m = opal[Math.floor((x + y + 2 * z) / 3) % opal.length];
    v.set(x, y, z, out ? m : inside);
  }
  return v;
}

/* ---- the danforth ----
   8:8 "a quiver with handful of glittering crossbow bolts", "They're so
   sparkly!" One bolt, plain otherwise (the book gives no colour): a wooden shaft,
   a grey head, dull vanes, and glitter all along it. It lies along y, its point
   to +y. */
function danforthBolt(): Vox {
  const v = fresh();
  const shaft = '#8a5a32', head = '#8c939b', edge = '#c5cad0', vane = '#b3a891', nock = '#5c3a20', spark = '#ffffff';
  const L = 20;
  v.box(4, 1, 4, 5, L - 7, 5, shaft);
  v.box(4, 0, 4, 5, 0, 5, nock);
  v.box(4, L - 6, 4, 5, L - 6, 5, head);
  v.box(2, L - 5, 4, 7, L - 4, 5, head);
  v.box(3, L - 3, 4, 6, L - 2, 5, head);
  v.box(4, L - 1, 4, 5, L, 5, head);
  v.set(4, L, 5, edge); v.set(4, L - 1, 5, edge); v.set(3, L - 2, 5, edge); v.set(2, L - 4, 5, edge);
  [3, 3, 2, 2, 1].forEach((h, i) => {
    const y = i + 1;
    v.box(6, y, 5, 5 + h, y, 5, vane); v.box(4 - h, y, 5, 3, y, 5, vane);
    if (i < 4) v.box(4, y, 6, 5, y, 6 + (i < 2 ? 1 : 0), twin(vane));
  });
  // the glitter: catches of light along the shaft and the head, and sparks standing off it
  for (const [x, y, z] of [[4, 7, 5], [5, 10, 5], [4, 13, 5], [5, 5, 5], [6, L - 4, 5], [5, L - 2, 5], [7, 3, 5]] as const) v.set(x, y, z, spark);
  for (const [x, y, z] of [[1, 9, 7], [8, 12, 6], [2, L - 1, 7], [7, 6, 8], [0, 4, 6]] as const) v.set(x, y, z, spark);
  return v;
}

/* ---- denial of service missile ----
   8:30 missiles for the eight-pack launcher; 8:31 they "spiraled off one by one"
   and "weren't designed to explode". The missile itself is never described, so
   it is a missile's plain form: a grey tube, a darker nose and four fins, the
   nozzle under it, standing nose up. */
function missile(): Vox {
  const v = fresh();
  const body = '#a4abb6', band = '#8c939b', nose = '#5d636b', fin = '#4d535b', nozzle = '#2a2d33';
  const c = 4;
  lathe(v, c, c, 0, 1, z => (z === 0 ? 1.2 : 1.6), () => nozzle);
  lathe(v, c, c, 2, 14, () => 2.2, (_x, _y, z) => (z === 5 || z === 13 ? band : body));
  lathe(v, c, c, 15, 19, z => [2, 1.7, 1.3, 0.9, 0.4][z - 15], () => nose);
  // the fins, out on four sides at the tail, swept back to its foot
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) for (const [k, z0, z1] of [[3, 1, 7], [4, 0, 5], [5, 0, 3]] as const) {
    v.box(c + dx * k, c + dy * k, z0, c + dx * k, c + dy * k, z1, fin);
  }
  return v;
}

/* ---- dwight's magical horn ----
   8:3 "A horn that glittered like an opalescent seashell"; 8:5 "the base of the
   opalescent horn", and the System's advice to take it. A unicorn's spiral horn,
   leaning, pearl with the colours shifting in its twist, glints standing off it. */
function unicornHorn(): Vox {
  const v = fresh();
  const pearl = '#f4f0f6', sheen = ['#f2b6cf', '#f2d79c', '#b8e6c6', '#b4d4f2', '#d2bdf0'];
  const H = 20;
  for (let z = 0; z <= H; z++) {
    const R = 0.5 + 2.9 * (1 - z / (H + 1)), cx = 3.5 + z * 0.14, cy = 3.5 + z * 0.06;
    for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) {
      if (Math.hypot(x - cx, y - cy) > R) continue;
      // the twist: a band winding up it, catching the colours of the light as it turns
      const a = (Math.atan2(y - cy, x - cx) + Math.PI) / (2 * Math.PI);
      const turn = (a + z / 5) % 1;
      v.set(x, y, z, turn < 0.32 ? sheen[Math.floor(z / 4) % sheen.length] : pearl);
    }
  }
  for (const [x, y, z] of [[0, 8, 10], [8, 1, 15], [1, 6, 18], [8, 7, 5]] as const) v.set(x, y, z, '#ffffff');
  return v;
}

/* ---- the gurkha hat ----
   8:90 "wide-brimmed camel-colored hats designed to sit at an angle on one's
   head" (8:89 "what looked like a wide-brimmed brown hat"). A round crown on a
   wide, flat brim; the crown a step off the brim so the two keep an edge. */
function gurkhaHat(): Vox {
  const v = fresh();
  const camel = '#c49a64', crown = twin('#c49a64'), shade = '#b0864f';
  chamfer(v, 0, 0, 0, 15, 13, 0, 5, camel);
  chamfer(v, 1, 1, 1, 14, 12, 1, 5, camel);
  chamfer(v, 4, 3, 2, 11, 10, 6, 3, crown);
  chamfer(v, 5, 4, 7, 10, 9, 7, 2, crown);
  chamfer(v, 4, 3, 2, 11, 10, 2, 3, shade);
  return v;
}

/* ---- the enchanted juvenile macropus dominus skin ----
   8:21 a dead joey's skin, worn "like it was a Halloween costume": "built-in
   gloves with long, clawed nails at the end. The palm of the hand had a thick
   pad, like the paw of a dog"; "The wide head of the dead joey sat awkwardly
   atop my own head"; "my large, sagging kangaroo feet"; a pouch, a tail. Its fur
   is never coloured: a plain brown. Hanging empty, facing +y.
   8:32 "my kangaroo skin flayed off", "My kangaroo feet were literally on fire";
   8:33 "My shredded kangaroo suit". Torn open, the feet charred. */
function kangarooSkin(shredded: boolean): Vox {
  const v = fresh();
  const fur = '#94704c', belly = twin('#94704c'), ear = '#7d5c3c', pad = '#3a2c24', claw = '#ddd2b8', eye = '#2a2420', nose = '#2a2420';
  // the big, sagging feet, long to the front, drooping at the toe
  for (const x0 of [2, 6]) { v.box(x0, 2, 0, x0 + 1, 10, 1, fur); v.box(x0, 11, 0, x0 + 1, 11, 0, fur); v.box(x0, 3, 2, x0 + 1, 6, 3, fur); }
  // the tail, thick at the back and tapering out behind
  v.box(4, 0, 2, 6, 2, 5, fur); v.box(4, -2, 1, 6, -1, 3, fur); v.box(5, -4, 0, 5, -3, 1, fur);
  // the body, the pouch on its front with its mouth across the top
  chamfer(v, 2, 2, 4, 8, 7, 12, 1, fur);
  v.box(3, 8, 5, 7, 8, 8, belly); v.box(4, 9, 5, 6, 9, 7, belly);
  v.box(4, 8, 9, 6, 8, 9, belly); v.box(4, 8, 8, 6, 8, 8, '#4a3626');
  // the empty arms hanging, the gloves at their ends, padded palms forward and the long nails down
  for (const x0 of [0, 9]) {
    v.box(x0, 4, 7, x0 + 1, 5, 11, fur);
    v.box(x0, 4, 5, x0 + 1, 6, 6, fur);
    v.box(x0, 7, 5, x0 + 1, 7, 6, pad);
    for (const x of [x0, x0 + 1]) { v.set(x, 6, 4, claw); v.set(x, 6, 3, claw); v.set(x, 7, 4, claw); }
  }
  // the wide joey head, its snout forward, its eyes shut, its tall ears
  chamfer(v, 1, 2, 13, 9, 8, 18, 2, fur);
  chamfer(v, 3, 9, 13, 7, 10, 15, 1, belly);
  v.box(4, 11, 14, 6, 11, 15, belly); v.box(4, 11, 15, 6, 11, 15, nose); v.set(5, 11, 14, nose);
  v.box(2, 8, 16, 3, 8, 16, eye); v.box(7, 8, 16, 8, 8, 16, eye);
  for (const x0 of [2, 7]) { v.box(x0, 4, 19, x0 + 1, 6, 21, fur); v.box(x0, 6, 19, x0 + 1, 6, 20, ear); }
  if (shredded) {
    const torn = '#24190f', raw = '#6e3b2a', char = '#2a2420', ash = '#55483c';
    // rents in it, dark where it has come away from what is inside
    for (const { p: [x, y, z], mat } of v.all()) {
      if (mat !== fur && mat !== belly && mat !== ear) continue;
      const t = hash(x * 2, y, z);
      if (z <= 1 && y >= 2) { v.set(x, y, z, t < 0.5 ? char : ash); continue; }      // the burnt feet
      if (t < 0.12) v.set(x, y, z, torn); else if (t < 0.2) v.set(x, y, z, raw);
    }
    v.clear(9, 4, 9, 10, 5, 10); v.clear(0, 8, 7, 0, 9, 7);
    v.clear(1, 7, 10, 2, 7, 12); v.box(2, 7, 10, 2, 7, 12, torn);
    v.clear(7, 4, 21, 8, 6, 21); v.set(4, 0, 5, null); v.set(6, -2, 3, null);
    for (const x of [2, 3, 6, 7]) v.set(x, 11, 0, char);
  }
  return v;
}

/* ---- the four-leaf clover patch ----
   7:57 "a small patch of a group of four-leaf clovers being smashed under a bare
   foot"; the System: "a perfectly-perfect, mouthwatering human foot treading
   upon a patch of four-leaf clovers, creasing them". The patch's own colours are
   never given, so a plain dark field and the form's rim; the foot comes down out
   of the top, side on, its sole flat on the clovers. */
// side on: 'f' the foot coming down out of the top, 't' its toes, 's' its sole; 'g' a clover's leaflet, 'v' its crease
const CLOVER_PATCH = [
  '...........',
  '...fff.....',
  '...fff.....',
  '...fff.....',
  '...ffff....',
  '..fffffff..',
  '..ffffffftt',
  '.sssssssss.',
  'gvg.gvgvg.g',
  '.g.gvgvgvgv',
  '..g.g.g.g..',
  '...........',
  '...........',
];
function cloverPatch(): Vox {
  const v = patch({ field: '#3f3d45' });
  const skin = '#e3a77c', toe = '#eeb78e', sole = '#c98a62', green = '#5aa040', crease = '#2f6b33';
  face(v, 0, 2, 0, CLOVER_PATCH, c => ({ f: skin, t: toe, s: sole, g: green, v: crease } as Record<string, string>)[c] ?? null);
  // only what lies on the cloth
  for (const { p: [x, y, z] } of v.all()) if (y === 2 && !v.has(x, 1, z)) v.set(x, y, z, null);
  return v;
}

/* ---- the hidden beer-can bomb ----
   8:12 "an ice-cold Busch Light, peach flavored"; 8:76 "I'd drilled out the can
   and replaced it with a hidden explosive", "especially hidden". A beer can and
   nothing else, because nothing shows: its colours are never given, so it is
   plain aluminium, the rolled rim and the tab on top. */
function beerCan(): Vox {
  const v = fresh();
  const can = '#c3c8cf', rim = '#d6dade', lid = '#9aa1a9', tab = '#7c858e', seam = twin('#c3c8cf');
  const c = 4;
  lathe(v, c, c, 0, 11, z => (z === 0 ? 3 : z <= 10 ? 3.9 : 3.2), (_x, _y, z) => (z === 1 || z === 10 ? seam : can));
  for (let x = 0; x <= 8; x++) for (let y = 0; y <= 8; y++) if (Math.hypot(x - c, y - c) <= 3.2) v.set(x, y, 12, Math.hypot(x - c, y - c) > 2.3 ? rim : lid);
  v.box(3, 4, 13, 5, 4, 13, tab); v.box(4, 5, 13, 4, 6, 13, tab);
  return v;
}

/* ---- the hobgoblin big boom satchel ----
   8:21 "the two hobgoblin big boom satchels in my inventory", released at the
   bottom of the pouch. The book gives only the noun, so it is a satchel's plain
   form: a brown bag, its flap down over the front, a buckle, a strap over the top. */
function satchel(): Vox {
  const v = fresh();
  const leather = '#7a5232', flap = twin('#7a5232'), strap = '#5c3a20', buckle = '#a4abb6';
  chamfer(v, 0, 0, 0, 11, 5, 8, 1, leather);
  v.box(0, 0, 9, 11, 5, 9, flap); v.set(0, 0, 9, null); v.set(11, 0, 9, null);
  v.box(0, 6, 4, 11, 6, 9, flap); v.set(0, 6, 4, null); v.set(11, 6, 4, null);
  v.box(5, 6, 1, 6, 6, 3, strap); v.box(5, 7, 3, 6, 7, 4, buckle);
  // the strap, up from either end and over
  bar(v, [1, 2, 10], [3, 2, 14], strap); bar(v, [1, 3, 10], [3, 3, 14], strap);
  v.box(4, 2, 14, 7, 3, 14, strap);
  bar(v, [10, 2, 10], [8, 2, 14], strap); bar(v, [10, 3, 10], [8, 3, 14], strap);
  return v;
}

export const ITEMS_B8A: Record<string, Record<string, () => Vox>> = {
  'assassins-veil': { headdress: assassinsVeil },
  // 8:56 "The scroll was called Gelded Choirboy": a scroll and nothing more
  'gelded-choirboy': { plain: () => scroll() },
  'big-shot-chicken-truck': Object.fromEntries(TRUCK.map(s => [s, () => chickenTruck(s)])),
  'big-ass-magnet': { page: magnetPage },
  'eris-five-sided-coin': { coin: erisCoin },
  'crupper-of-benevolent-champion': { mail: () => crupper(false), opalescent: () => crupper(true) },
  'danforth-bolt': { sparkly: danforthBolt },
  'denial-of-service-missile': { plain: missile },
  'dwights-magical-horn': { horn: unicornHorn },
  'gurkha-hat': { hat: gurkhaHat },
  // 8:8 "A green scroll that clanked heavily to the table, as if it were made of metal"
  'emergency-gremlin-scroll': { green: () => scroll({ paper: '#4f8a5e', edge: '#3d6e4a' }) },
  'juvenile-macropus-dominus-skin': { suit: () => kangarooSkin(false), shredded: () => kangarooSkin(true) },
  'four-leaf-clover-patch': { patch: cloverPatch },
  'hidden-beer-bomb': { can: beerCan },
  'hobgoblin-big-boom-satchel': { plain: satchel },
  // 8:9 "The book thumped onto the table." "The thing was freezing cold": a spell book, a tome's plain form
  'ice-slick': { plain: () => tome() },
};
