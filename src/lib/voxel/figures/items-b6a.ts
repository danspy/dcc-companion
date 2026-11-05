import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { lathe, chamfer } from './itemparts.ts';
import { scroll, card, ring, tgheeBack } from './itemforms.ts';

/* ---- items, set b6a: the eighth floor's deck, flags and finery ----
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
/** rows of characters laid onto the plane y, top row first, the bottom row at z0 */
function rows(v: Vox, x0: number, y: number, z0: number, art: string[], pick: (c: string) => string | null) {
  art.forEach((row, j) => [...row].forEach((c, i) => { const m = pick(c); if (m) v.set(x0 + i, y, z0 + art.length - 1 - j, m); }));
}

/* the heart-covered boxers (1:35 "a white pair of boxers covered in little red
   hearts"), the pattern the squad's flag (6:4) and its pack (6:47) are made of */
const BOXER = '#efe9df', BOXER2 = twin('#efe9df'), HEART = '#c8261c';
/** a little heart, three across and two high, its point at (x, z) */
function heart(v: Vox, x: number, y: number, z: number) {
  v.set(x - 1, y, z + 1, HEART); v.set(x + 1, y, z + 1, HEART); v.set(x, y, z, HEART);
}

/* ---- the teleport trap, mounted ----
   6:57 the anchor half is carried by "the small, fist-sized spider automaton.
   It had the anchor half of a teleport trap affixed to its flat, top surface,
   designed specifically to hold such things." The automatons are "metallic
   balls" until "legs appeared" (5:60). The trap half itself is never
   described, so it is a plain squat puck on the flat top. */
function mountedAnchor(): Vox {
  const v = fresh();
  const shell = '#9aa1aa', leg = '#4f555d', foot = '#3b4047', puck = '#6f767f', face = '#858c95';
  // the ball, its top cut flat
  chamfer(v, 4, 4, 2, 9, 9, 2, 2, shell);
  chamfer(v, 3, 3, 3, 10, 10, 6, 3, shell);
  chamfer(v, 3, 3, 7, 10, 10, 7, 3, twin(shell));
  // the anchor half, a plain puck on the flat top
  chamfer(v, 4, 4, 8, 9, 9, 9, 2, puck);
  chamfer(v, 5, 5, 9, 8, 8, 9, 1, face);
  // eight legs, four a side, up to a knee and down to the foot
  const c = 6.5;
  for (const s of [-1, 1]) for (const d of [0.9, 0.3, -0.3, -0.9]) {
    const n = Math.hypot(1, d), ux = s / n, uy = d / n;
    const at = (r: number, z: number): [number, number, number] => [Math.round(c + ux * r), Math.round(c + uy * r), z];
    bar(v, at(3.6, 4), at(5.6, 7), leg);
    bar(v, at(5.6, 7), at(7.4, 1), leg);
    v.set(...at(7.6, 0), foot);
  }
  return v;
}

/* ---- the book burner patch ----
   6:49 "The patch was a medium-sized rectangle with a book on it. The book
   was on fire." "It was embroidered, not screen printed." Its colours are
   never given: the plain patch's field and rim, an open book in plain brown
   and pale pages, flames in thread, standing proud of the cloth. */
const FIRE_ART = [
  '....y.......',
  '...yo...y...',
  '...oo..yo...',
  '..yor..oo.y.',
  '..oor.yor.o.',
  '.yoroyoorro.',
  '.oorooroooo.',
  '.rooooooorr.',
  'pp.rooooo.pp',
  'pppprrorpppp',
  'ppppp|pppppp',
  'ccccc|cccccc',
  '.cccccccccc.',
];
function bookBurner(): Vox {
  const v = fresh();
  const field = '#4b5a3a', rim = '#d8c48a';
  const W = 15, H = 17;
  for (let x = 0; x <= W; x++) for (let z = 0; z <= H; z++) {
    const corner = (x === 0 || x === W) && (z === 0 || z === H);
    if (corner) continue;
    const edge = x === 0 || x === W || z === 0 || z === H;
    v.set(x, 0, z, edge ? twin(rim) : twin(field)); v.set(x, 1, z, edge ? rim : field);
  }
  const pick = (c: string) => ({ y: '#f2cf4a', o: '#e8862a', r: '#c8361e', p: '#ece4cf', '|': '#b9ad8f', c: '#7a4a2a' } as Record<string, string>)[c] ?? null;
  rows(v, 2, 2, 2, FIRE_ART, pick);
  return v;
}

/* ---- the bull rush, a bespoke personal shield ----
   6:52 "a small, opalescent pin that looked like a longhorn cow", clipped to
   Donut's collar. Face on, the horns spread wide; the opal is a few pale
   tints sliding across it. The clasp behind is a plain metal bar. */
const STEER = [
  '#..................#',
  '##................##',
  '.####..........####.',
  '..######....######..',
  '....############....',
  '..eee..######..eee..',
  '...eeee######eeee...',
  '.......#o##o#.......',
  '.......######.......',
  '.......######.......',
  '........####........',
  '.......######.......',
  '.......#n##n#.......',
  '........####........',
];
function longhornPin(): Vox {
  const v = fresh();
  const horn = ['#d3e5f0', '#e9e4f1', '#d6eedd'], face = ['#f1dbe8', '#ece7f2'], dark = '#6c6584';
  const H = STEER.length;
  STEER.forEach((row, j) => [...row].forEach((c, x) => {
    const z = H - 1 - j;
    if (c === '.') return;
    const head = c !== 'e' && x >= 7 && x <= 12 && j >= 4;
    const m = head ? face[Math.floor((x + z) / 3) % 2] : horn[Math.floor((x + 2 * z) / 5) % 3];
    v.set(x, 0, z, twin(m)); v.set(x, 1, z, m);
    if (head) v.set(x, 2, z, c === 'o' || c === 'n' ? dark : m);              // the face stands proud of the horns
    if (head && j >= 11 && c === '#') v.set(x, 3, z, face[1]);                // and the muzzle prouder still
  }));
  v.box(8, -1, 7, 11, -1, 7, '#a4abb6');                                       // the clasp behind
  return v;
}

/* ---- the squad flag ----
   6:4 "a little bigger than my hand, like one of those flags you give to kids
   to wave at a parade. It was a miniature pair of heart-covered boxers ... an
   actual pair of heart boxers flying sideways, like they were dangling off a
   clothesline." "Embroidered onto the flag on the top and bottom was a
   motorcycle club-style patch", and "Centered on the boxers over the crotch
   area was an embroidered bomb patch, identical to the one on my jacket" (a
   white rectangle, a little circular bomb stitched on in black, 5:36). "The
   flagpole, stick, whatever was a glowing metal spike, maybe about a foot
   long." The glow's colour is never given, so it is the warm enchanted glow;
   the club patches' colours are never given, so a plain dark cloth, the
   lettering a pale stitched line. */
function squadFlag(): Vox {
  const v = fresh();
  const steel = '#cfd5dc', club = '#5b5a64', stitch = '#e6e1d6', bomb = '#1b1714', patchRim = '#d2cdc2';
  // the spike, glowing down its front, its point at the foot
  v.box(0, 0, 1, 0, 1, 23, steel);
  v.box(0, 1, 3, 0, 1, 23, 'window');
  v.set(0, 0, 1, '#eef1f4'); v.set(0, 1, 1, '#eef1f4'); v.set(0, 1, 0, '#eef1f4');
  // the boxers, flying off the spike: the waistband up against it, the legs out to the right
  const top = 22, bot = 9, mid = (top + bot) / 2;
  const inside = (x: number, z: number) => {
    if (x < 1 || x > 15 || z < bot || z > top) return false;
    if (x >= 10 && Math.abs(z - mid) < (x - 9) * 0.38) return false;              // the gap between the legs
    if (x === 15 && (z === top || z === bot)) return false;
    return true;
  };
  for (let x = 1; x <= 15; x++) for (let z = bot; z <= top; z++) {
    if (!inside(x, z)) continue;
    v.set(x, 0, z, BOXER2); v.set(x, 1, z, x <= 2 ? BOXER2 : BOXER);
    if (x <= 2) v.set(x, 2, z, BOXER);                                           // the waistband, thicker
  }
  // the little red hearts, printed all over
  for (const [x, z] of [[5, 17], [9, 18], [13, 18], [5, 11], [9, 11], [13, 11], [4, 14]] as const) {
    for (const [a, b] of [[-1, 1], [1, 1], [0, 0]] as const) if (inside(x + a, z + b)) v.set(x + a, 1, z + b, HEART);
  }
  // the club patches along the top and the bottom, a little arched, their lettering a stitched line
  for (let x = 4; x <= 13; x++) {
    const end = x === 4 || x === 13 ? 1 : 0;
    v.set(x, 2, top - 1 - end, x % 2 ? stitch : club);
    v.set(x, 2, bot + 1 + end, x % 2 ? stitch : club);
  }
  // the bomb patch over the crotch: a white rectangle, the little round bomb stitched on in black
  v.box(6, 2, 14, 9, 2, 17, 'white');
  for (const [x, z] of [[6, 14], [9, 14], [6, 17], [9, 17]] as const) v.set(x, 2, z, patchRim);
  v.box(7, 3, 15, 8, 3, 16, bomb); v.set(8, 3, 17, bomb);
  return v;
}

/* ---- the champion pack ----
   6:47 "a bulky, leather bag containing several items. The bag itself was
   decorated with the same boxer pattern as our team flag": white, with
   little red hearts. Its leather is never given a colour, so the plain brown
   shows at its base, its rim and its handles. */
function championPack(): Vox {
  const v = fresh();
  const leather = '#7a4a2a', dark = twin('#7a4a2a'), clasp = '#a4abb6';
  chamfer(v, 1, 1, 0, 12, 8, 0, 2, leather);
  chamfer(v, 0, 0, 1, 13, 9, 8, 3, BOXER);
  chamfer(v, 0, 0, 9, 13, 9, 9, 3, leather);
  chamfer(v, 1, 1, 10, 12, 8, 10, 3, dark);
  v.box(2, 4, 10, 11, 5, 10, '#4a2c18');                              // the mouth, drawn shut
  // two handles arching over the top, their straps running down the front, one strap down the right
  for (const x of [3, 10]) {
    v.box(x, 2, 11, x, 2, 12, leather); v.box(x, 7, 11, x, 7, 12, leather); v.box(x, 3, 13, x, 6, 13, leather);
    v.box(x, 9, 1, x, 9, 8, leather);
  }
  v.box(13, 4, 1, 13, 4, 8, leather);
  v.set(6, 10, 9, clasp); v.set(7, 10, 9, clasp);
  // the hearts, on the front and the right side
  for (const [x, z] of [[1, 5], [6, 6], [8, 3], [12, 6], [5, 2], [12, 2]] as const) if (v.has(x, 9, z)) heart(v, x, 9, z);
  for (const [y, z] of [[2, 6], [7, 6], [6, 2], [2, 2]] as const) { v.set(13, y - 1, z + 1, HEART); v.set(13, y + 1, z + 1, HEART); v.set(13, y, z, HEART); }
  return v;
}

/* ---- the combo card ----
   6:4 "a large, rectangular card, just about the size of a postcard. It was
   rigid", and on its face "nothing but a red, stylized plus symbol floating
   in a field of stars." (Its back, the government's moving logo, faces away.) */
function comboCard(): Vox {
  const night = '#1d2240';
  const v = card({ face: night, border: '#262c50', back: '#3a3f55' });
  for (const [x, z] of [[1, 11], [3, 10], [6, 11], [7, 9], [1, 8], [7, 4], [1, 3], [3, 1], [6, 2], [2, 6], [7, 7], [5, 10]] as const) v.set(x, 1, z, '#eef1f6');
  // the plus, floating proud of the stars: a heavy middle, its arms drawn out thin
  const red = '#d42a2a';
  v.box(3, 2, 5, 5, 2, 7, red);
  v.box(4, 2, 3, 4, 2, 9, red); v.box(1, 2, 6, 7, 2, 6, red);
  return v;
}

/* ---- the dart of ophiotaurus ----
   6:1 "the dart in Chaco's wolf-like hand ... Chaco threw the dart". Only the
   noun: a plain dart, a steel point, a grey barrel, a slim shaft and four
   pale flights, the point down to the front. */
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

/* ---- the nipple ring of the defiler ----
   6:3 "I picked up the small nipple ring. It was a silver ring with an
   eyeball hanging from it." A silver hoop on its edge, the eye hung under it
   on a short link, looking out to the front; its iris is a plain dark. */
function defilerRing(): Vox {
  const v = fresh();
  const silver = '#c8ccd4', white = '#eeeae2', shade = '#dcd5c7', iris = '#525866', pupil = '#141016';
  // the hoop, on its edge
  const cx = 4.5, cz = 15;
  for (let x = -1; x <= 10; x++) for (let z = 9; z <= 21; z++) { const d = Math.hypot(x - cx, z - cz); if (d <= 5.6 && d >= 3.9) { v.set(x, 3, z, silver); v.set(x, 4, z, twin(silver)); } }
  v.box(4, 3, 8, 5, 4, 9, silver);                                               // the link it hangs by
  // the eyeball, from chamfered layers so it reads round, looking out to the front
  chamfer(v, 3, 2, 0, 6, 5, 0, 1, shade);
  chamfer(v, 2, 1, 1, 7, 6, 1, 2, white);
  chamfer(v, 1, 0, 2, 8, 7, 5, 3, white);
  chamfer(v, 2, 1, 6, 7, 6, 6, 2, white);
  chamfer(v, 3, 2, 7, 6, 5, 7, 1, shade);
  // the iris on its front corner, so it looks out at whoever is looking, its corners rounded off
  const face = [[5, 7], [6, 6], [7, 5], [8, 4]] as const;
  face.forEach(([x, y], i) => { for (let z = 2; z <= 5; z++) if ((i > 0 && i < 3) || (z > 2 && z < 5)) v.set(x, y, z, iris); });
  v.set(6, 6, 3, pupil); v.set(7, 5, 3, pupil); v.set(6, 6, 4, pupil); v.set(7, 5, 4, pupil);
  v.set(6, 6, 5, white);
  return v;
}

/* ---- donut's sailor hat ----
   6:37 collected from a man in "a white, old-school sailor's outfit"; 6:38
   "Nice dixie cup ... the white sailor hat": a white canvas crown with its
   brim turned up all round, a row of stitching on the brim. */
function sailorHat(): Vox {
  const v = fresh();
  const white = '#f2efe8', brim = twin('#f2efe8'), stitch = '#cdc6b6';
  const c = 6.5;
  // the crown, rounded over its top, rising out of the brim
  const R = (z: number) => (z <= 6 ? 4.4 : z === 7 ? 4.2 : z === 8 ? 3.4 : 0);
  lathe(v, c, c, 0, 8, R, () => white);
  // the brim, turned up all round and flaring, rows of stitching round it
  const B = (z: number) => [4.9, 5.4, 5.9, 6.4, 6.8, 7.1][z] ?? 0;
  lathe(v, c, c, 0, 5, B, (x, y, z) => (Math.hypot(x - c, y - c) > R(z) - 0.2 ? (z === 2 ? stitch : brim) : null));
  // the fold where the brim turns up off the crown, in its shadow
  lathe(v, c, c, 5, 5, () => 5.6, (x, y) => (Math.hypot(x - c, y - c) > 4.5 ? stitch : null));
  return v;
}

/* ---- the prison tattoo kit ----
   6:3 "I pulled out the group of items for the tattoo kit. It was a long,
   sharp needle. Some ink. A few stick things. A thing that looked like a
   piece of sandpaper." The set together: the sandpaper flat, the sticks laid
   over it, the needle across them and a small pot of ink at the back. The ink
   and its pot are a plain black and glass; the sticks plain wood. */
function tattooKit(): Vox {
  const v = fresh();
  const grit = '#b59a6c', grain = '#9a8058', wood = '#a87a4a', wood2 = twin('#a87a4a'), steel = '#dfe3e8', ink = '#141016', cap = '#3b3f47';
  // the sandpaper, a stiff square, its grit in a few darker grains
  for (let x = 0; x <= 10; x++) for (let y = 0; y <= 10; y++) v.set(x, y, 0, (x * 7 + y * 3) % 11 === 0 ? grain : grit);
  // three sticks laid across it
  bar(v, [1, 2, 1], [9, 6, 1], wood); bar(v, [1, 4, 1], [9, 8, 1], wood2); bar(v, [2, 7, 1], [8, 10, 1], wood);
  // the long needle over them, its point to the front
  bar(v, [11, 1, 2], [0, 12, 2], steel); v.set(0, 13, 2, '#f4f6f8');
  // the pot of ink at the back corner
  const c = 9;
  lathe(v, c, c - 7, 1, 6, z => (z <= 4 ? 2.4 : z === 5 ? 1.6 : 0), (x, y, z) => (Math.hypot(x - c, y - (c - 7)) <= 1.4 && z >= 1 && z <= 4 ? ink : 'glass'));
  v.box(c - 1, c - 8, 6, c, c - 7, 7, cap);
  return v;
}

/* ---- donut's red beret ----
   6:4 "an angry-looking, bearded guy wearing a red beret. The beret glowed,
   indicating it was magical." A soft round cap over a band, its little stalk
   on top; the glow's colour is never given, so it lights its own edge. */
function redBeret(): Vox {
  const v = fresh();
  const red = '#b8221e', band = '#8e1814', top = '#c9302a';
  const c = 6.5;
  lathe(v, c, c, 0, 1, () => 4.3, () => band);
  // the soft crown, overhanging the band and slouching a little to one side
  lathe(v, c, c, 2, 4, z => [5.6, 6.5, 6.7][z - 2], () => red);
  lathe(v, c + 0.6, c, 5, 5, () => 6.2, () => red);
  lathe(v, c + 1, c, 6, 6, () => 4.8, () => top);
  v.set(8, 6, 7, top);                                                             // its little stalk
  // the glow of a magic thing, in sparks standing off it
  for (const [x, y, z] of [[-2, 9, 5], [15, 3, 6], [12, 14, 3], [2, 1, 9], [10, -2, 8]] as const) v.set(x, y, z, 'window');
  return v;
}

/* ---- the right back atcha personal shield ----
   6:3 "a forearm bracer. This one was black and short and covered with little
   buckles." A short cuff standing open-ended, little straps and buckles all
   over its outside. The buckles' metal is never given, so it is a plain one;
   the buckler it throws out is never shown. */
function backAtchaBracer(): Vox {
  const v = fresh();
  const black = '#26252b', inner = '#121014', strap = '#45444d', buckle = '#b3b7bd';
  // the cuff: an oval tube, a little wider at the elbow end, open at both
  for (let z = 0; z <= 9; z++) {
    const rx = z >= 6 ? 4.9 : 4.5, ry = z >= 6 ? 4.2 : 3.8;
    for (let x = -1; x <= 10; x++) for (let y = -1; y <= 9; y++) {
      const e = (k: number) => ((x - 4.5) / (rx - k)) ** 2 + ((y - 4) / (ry - k)) ** 2;
      if (e(0) > 1 || e(1.5) <= 1) continue;
      v.set(x, y, z, e(1.1) <= 1 ? inner : z === 1 || z === 4 || z === 7 ? strap : black);
    }
  }
  // the little buckles on its straps, standing proud, over the front and the right
  const front = (x: number, z: number) => { let y = 9; while (y > 0 && !v.has(x, y, z)) y--; return y + 1; };
  const right = (y: number, z: number) => { let x = 10; while (x > 0 && !v.has(x, y, z)) x--; return x + 1; };
  for (const [x, z] of [[2, 1], [6, 1], [4, 4], [1, 7], [5, 7]] as const) { const y = front(x, z); v.set(x, y, z, buckle); v.set(x, y, z + 1, buckle); v.set(x + 1, y - 1, z, strap); }
  for (const [y, z] of [[3, 1], [5, 4], [2, 7]] as const) { const x = right(y, z); v.set(x, y, z, buckle); v.set(x, y, z + 1, buckle); }
  return v;
}

/* ---- the tiara of the inebriated dragonfly ----
   6:24 "a simple, silver-colored one", and "the citrine jewel installed into
   the item", the "large jewel" (6:2), "yellow orange" (6:2). A plain band,
   the front rising in one low arch to the stone, set proud at its middle. */
function dragonflyTiara(): Vox {
  const v = fresh();
  const silver = '#c8ccd4', edge = twin('#c8ccd4'), cit = '#ec9a1e', glint = '#f8c85e', deep = '#c2700f';
  // the band, an eight-sided ring two high
  for (let x = 0; x <= 9; x++) for (let y = 0; y <= 9; y++) {
    const dx = Math.min(x, 9 - x), dy = Math.min(y, 9 - y);
    if (dx + dy >= 2 && !(dx >= 1 && dy >= 1 && dx + dy >= 4)) v.box(x, y, 0, x, y, 1, silver);
  }
  // the front, one simple arch up to the stone, its top edge catching the light
  [[1, 4], [2, 6], [3, 8], [4, 10], [5, 10], [6, 8], [7, 6], [8, 4]].forEach(([x, t]) => {
    v.box(x, 9, 2, x, 9, t, silver); v.set(x, 9, t, edge);
    if (x >= 2 && x <= 7) v.box(x, 8, 2, x, 8, t - 1, edge);
  });
  // the citrine, large, set proud in the middle of it
  chamfer(v, 3, 10, 3, 6, 11, 7, 1, cit);
  v.box(4, 12, 4, 5, 12, 6, cit);
  v.set(4, 12, 6, glint); v.set(3, 11, 6, glint); v.set(4, 11, 7, glint);
  v.set(6, 11, 4, deep); v.set(5, 12, 4, deep); v.set(6, 10, 3, deep);
  return v;
}

export const ITEMS_B6A: Record<string, Record<string, () => Vox>> = {
  'teleport-trap': { mounted: mountedAnchor },
  'book-burner-patch': { embroidered: bookBurner },
  'build-trench-scroll': { plain: () => scroll() },
  'bull-rush-bespoke-personal-shield': { pin: longhornPin },
  'squad-flag': { boxers: squadFlag },
  'champion-pack': { bag: championPack },
  'combo-card': { stars: comboCard },
  'cracker-jack-scroll': { plain: () => scroll() },
  'damnation-card': { plain: () => tgheeBack() },
  'dart-of-ophiotaurus': { plain: dart },
  'nipple-ring-of-the-defiler': { eyeball: defilerRing },
  'donuts-sailor-hat': { 'dixie-cup': sailorHat },
  'prison-tattoo-kit': { set: tattooKit },
  'paupers-ring-of-steadfast-emberus': { plain: () => ring() },
  'donuts-red-beret': { glowing: redBeret },
  'right-back-atcha-personal-shield': { bracer: backAtchaBracer },
  'tiara-of-inebriated-dragonfly': { citrine: dragonflyTiara },
  'flee-card': { plain: () => tgheeBack() },
  'force-discard-card': { plain: () => tgheeBack() },
  'glow-up-card': { plain: () => tgheeBack() },
  'golden-combo-card': { plain: () => tgheeBack() },
};
