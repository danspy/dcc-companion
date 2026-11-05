import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { lathe, chamfer } from './itemparts.ts';
import { potion, vial } from './itemforms.ts';

/* ---- items, set b7b ----
   Drawn the way the anchor set in items.ts is: one object, floating, three-quarter
   view, smooth (chunk 0), facing +y (the lit left face), z up, each look from the
   edition's own description at its point. A colour the book leaves unsaid is a
   plain one. Shapes and colours only. */

const fresh = () => { const v = new Vox(); v.chunk = 0; return v; };
type P3 = [number, number, number];

/** a straight bar of voxels from one point to another, stepped along its longest axis */
function bar(v: Vox, a: P3, b: P3, m: string) {
  const n = Math.max(...a.map((p, i) => Math.abs(b[i] - p)));
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0;
    v.set(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), m);
  }
}
/** bars through a list of points */
function path(v: Vox, pts: P3[], m: string) { for (let i = 1; i < pts.length; i++) bar(v, pts[i - 1], pts[i], m); }
/** paint onto whatever surface of `v` faces +y at (x, z): the voxel furthest forward */
function onFront(v: Vox, x: number, z: number, m: string, y0 = -4, y1 = 24) {
  for (let y = y1; y >= y0; y--) if (v.has(x, y, z)) { v.set(x, y, z, m); return; }
}
/** a hollow vessel: `solid` decides the shape, its skin is `skin` and what is inside comes from `inner` */
function vessel(v: Vox, box: [number, number, number, number, number, number], solid: (x: number, y: number, z: number) => boolean, skin: string, inner: (x: number, y: number, z: number) => string | null) {
  const [x0, y0, z0, x1, y1, z1] = box;
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    if (!solid(x, y, z)) continue;
    const edge = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([a, b, c]) => !solid(x + a, y + b, z + c));
    v.set(x, y, z, edge ? skin : inner(x, y, z));
  }
}

/* ---- the hell-kissed celestial skill potion ----
   7:4 "a single, glittering potion in a bottle shaped like a horned skull", "a
   little, hand-written note tied around the top"; "The liquid inside was black and
   bubbling. The bubbles occasionally rose from the liquid, bursting. Each mini pop
   let out a spurt of color." Corked ("I popped the cork off"). The skull is glass,
   since the black shows through it; the note is a plain slip, its writing a few
   dark marks. */
function hellKissed(): Vox {
  const v = fresh();
  const black = '#16121a', bubble = '#3a3442', cork = '#b08758', paper = '#e6dcc0', ink = '#3a2a22', string = '#cdbf9a';
  const sheen = '#cfeaf2', shine = '#f4fbfd';
  // the skull: a round cranium, cheekbones and a narrower jaw under them, the face to +y
  const shape = new Vox();
  chamfer(shape, 1, 1, 5, 10, 8, 5, 2, 'x');
  chamfer(shape, 0, 0, 6, 11, 9, 12, 2, 'x');
  chamfer(shape, 1, 1, 13, 10, 8, 13, 3, 'x');
  chamfer(shape, 3, 2, 14, 8, 7, 14, 2, 'x');
  chamfer(shape, 2, 3, 1, 9, 9, 4, 2, 'x');
  shape.clear(0, 8, 5, 1, 9, 6); shape.clear(10, 8, 5, 11, 9, 6);       // the cheeks drawn in under the bone
  // the sockets and the nose, deep in the face
  const holes: [number, number][] = [];
  for (const x0 of [2, 7]) for (let x = x0; x <= x0 + 2; x++) for (let z = 8; z <= 10; z++) if (!((x === x0 || x === x0 + 2) && z === 10)) holes.push([x, z]);
  holes.push([5, 6], [6, 6], [5, 5], [6, 5], [5, 7], [6, 7]);
  for (const [x, z] of holes) shape.set(x, 9, z, null);
  const solid = (x: number, y: number, z: number) => shape.has(x, y, z);
  vessel(v, [-1, -1, 0, 12, 10, 15], solid, 'glass', (x, y, z) => (z <= 11 ? black : null));
  // the bone of the face picked out pale in the glass; the sockets and the nose stay clear, and the black shows in them
  for (let x = 0; x <= 11; x++) for (let z = 1; z <= 13; z++) {
    let y = 10; while (y >= 0 && !v.has(x, y, z)) y--;
    if (y >= 8 && !holes.some(([a, b]) => a === x && b === z)) v.set(x, y, z, sheen);
  }
  for (const [x, z] of [[1, 11], [1, 10], [2, 12]] as const) v.set(x, 9, z, shine);
  for (const x of [3, 5, 6, 8]) v.set(x, 9, 2, 'glass');               // the gaps between the teeth
  v.box(3, 9, 1, 8, 9, 1, 'glass');
  // bubbles rising in the black, and the spurts of colour where they burst at its top
  for (const [x, y, z] of [[4, 5, 11], [7, 3, 10], [3, 6, 8], [8, 6, 11]] as const) v.set(x, y, z, bubble);
  for (const [x, y, z, m] of [[3, 4, 12, '#ff5fa8'], [7, 6, 12, '#ffd23f'], [5, 3, 13, '#5fe0a0'], [8, 4, 13, '#6fb4ff']] as const) v.set(x, y, z, m);
  // the horns, up and out off the crown, curling in at the tips
  for (const s of [-1, 1]) {
    const x = (d: number) => (s < 0 ? d : 11 - d);
    path(v, [[x(1), 5, 13], [x(0), 5, 15], [x(-1), 5, 17], [x(-1), 5, 18], [x(0), 5, 20]], sheen);
    path(v, [[x(1), 4, 13], [x(0), 4, 15], [x(-1), 4, 17]], sheen);
    v.set(x(0), 5, 14, sheen); v.set(x(2), 5, 14, sheen); v.set(x(1), 5, 14, sheen); v.set(x(-1), 5, 16, shine);
  }
  // the neck, the string tied round it, and the cork
  v.box(5, 4, 15, 6, 5, 15, 'glass');
  v.box(5, 4, 16, 6, 5, 16, string);
  v.box(4, 3, 17, 7, 6, 18, cork); v.clear(4, 3, 18, 4, 3, 18); v.clear(7, 6, 18, 7, 6, 18); v.clear(4, 6, 18, 4, 6, 18); v.clear(7, 3, 18, 7, 3, 18);
  // the note, hanging off the string at the side
  v.set(7, 5, 16, string); v.set(8, 5, 15, string);
  v.box(8, 5, 12, 8, 7, 14, paper);
  v.set(9, 6, 14, ink); v.set(9, 7, 13, ink); v.set(9, 5, 12, ink);
  // it glitters
  for (const [x, y, z] of [[-2, 9, 9], [12, 3, 10], [11, 9, 2], [-1, 2, 2]] as const) v.set(x, y, z, 'white');
  return v;
}

/* ---- the necklace of indelible woe ----
   7:32 named, 7:39 in the dead king's things: the book gives only "the necklace",
   never its look. So it is the plain form of a necklace, hung up by its clasp: a
   loop of chain in a plain grey metal, no pendant, since none is mentioned. */
function plainNecklace(): Vox {
  const v = fresh();
  const metal = '#a4abb6', dark = twin('#a4abb6'), clasp = '#7c858e';
  // the loop, hanging: round and full at the foot, drawn in to the clasp at the top
  const pts: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    const p: [number, number] = [Math.round(6 + Math.sin(t) * (5.8 - 2.2 * Math.max(0, Math.cos(t)) ** 2)), Math.round(8 - Math.cos(t) * 8)];
    const last = pts[pts.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) pts.push(p);
  }
  // links of two, turned alternately: one stands out toward the eye, the next lies in the loop
  pts.forEach(([x, z], i) => {
    if (Math.floor(i / 2) % 2) { v.set(x, -1, z, dark); v.set(x, 0, z, metal); v.set(x, 1, z, metal); }
    else v.set(x, 0, z, dark);
  });
  chamfer(v, 5, -1, 15, 7, 1, 17, 1, clasp);
  return v;
}

/* ---- jamal's mechanical legs ----
   7:15 "eight, double-jointed legs and a harness for the 17-foot-long sea creature",
   "a voice-controlled automaton harness"; "It made him look like some horrifying
   spider hybrid", the "magically-enhanced joints", "extra-large leg joints". No
   colour is given: plain metal, the joints a lighter one, the way his figure wears
   them. The harness is drawn empty, two hoops round where the shark goes and the
   rails the legs hang from, the legs up to a knee and out and down like a spider's.
   8:34 "the new grabbers on his front legs", "his front spider legs now looked like
   they had hands": the front pair raised, a hand on each.
   8:44 "the new and improved sticky feets": the walking legs end in pads.
   8:96 "his legs absolutely wrecked and fallen off of him": the harness bent, the
   legs snapped at their joints, the pieces falling away under it. */
type LegLook = 'harness' | 'grabbers' | 'sticky' | 'wrecked';
function jamalsLegs(look: LegLook): Vox {
  const v = fresh();
  const band = '#5d646e', leg = '#454b52', joint = '#b3b7bd', pad = '#2f3338', hand = '#8c939b';
  const hands = look !== 'harness', sticky = look === 'sticky' || look === 'wrecked', wrecked = look === 'wrecked';
  const W = 5, L = 7;                         // the harness: across, and along the body (the head to +y)
  /** a big joint: a block two on a side, whichever way the leg points */
  const knuckle = (x: number, y: number, z: number, side: number) => v.box(x, y, z, x + side, y + 1, z + 1, joint);
  // two hoops round where the body goes, and a rail down each side and along the top
  for (const y of [1, L - 1]) {
    v.box(0, y, 4, W - 1, y, 4, band); v.box(0, y, 10, W - 1, y, 10, band);
    v.box(0, y, 5, 0, y, 9, band); v.box(W - 1, y, 5, W - 1, y, 9, band);
  }
  v.box(0, 0, 7, 0, L, 7, band); v.box(W - 1, 0, 7, W - 1, L, 7, band);
  v.box(2, 0, 10, 2, L, 10, band);
  if (wrecked) {
    // bent: a hoop torn open, a rail snapped and hanging
    v.clear(0, L - 1, 8, 0, L - 1, 10); v.set(-1, L, 10, band); v.set(-1, L + 1, 11, band);
    v.clear(W - 1, 0, 7, W - 1, 2, 7); v.set(W, -1, 6, band); v.set(W, -1, 5, band);
  }
  /** one leg: from the hip on the rail up to the knee, out to the second joint, down to the foot */
  const legAt = (side: -1 | 1, y: number, k: number, f: number, i: number) => {
    const hx = side < 0 ? -1 : W, out = (d: number) => hx + side * d;
    const hip: P3 = [hx, y, 7], knee: P3 = [out(2), y + k, 13], ankle: P3 = [out(4), y + f, 7], foot: P3 = [out(5), y + f, 0];
    v.set(...hip, joint);
    const front = hands && i >= 6;
    if (wrecked) {
      // snapped: a stump up to the knee on some, the rest fallen away below the harness
      if (i % 3 !== 1) { bar(v, hip, [out(1), y + k, 10], leg); knuckle(out(2), y + k, 10, side); }
      const z = 1 - (i % 3), dx = side * (i % 2);
      bar(v, [out(1) + dx, y + f, z], [out(3) + dx, y + f + side, z - 1], leg);
      if (i % 3 === 0) knuckle(out(4) + dx, y + f, z - 1, side);
      if (front) { v.box(out(0), y + 3, -1, out(0) + side, y + 3, -1, hand); v.set(out(0), y + 4, 0, hand); v.set(out(0) + side, y + 4, 0, hand); }
      return;
    }
    if (front) {
      // the front pair reach forward and up, a hand on the end of each
      const elbow: P3 = [out(2), y + 1, 12], wrist: P3 = [out(2), y + 4, 9];
      bar(v, hip, elbow, leg); bar(v, elbow, wrist, leg);
      knuckle(elbow[0], elbow[1], elbow[2], side);
      const [wx, wy, wz] = wrist;
      v.box(wx - 1, wy + 1, wz - 1, wx + 1, wy + 1, wz + 1, hand);                     // the palm, facing forward
      for (const dx of [-1, 0, 1]) v.box(wx + dx, wy + 2, wz + 1, wx + dx, wy + 2, wz + 2, hand);   // three fingers up
      v.set(wx + side * 2, wy + 2, wz - 1, hand); v.set(wx + side * 2, wy + 1, wz, hand);       // the thumb, out to the side
      return;
    }
    bar(v, hip, knee, leg); bar(v, knee, ankle, leg); bar(v, ankle, foot, leg);
    knuckle(knee[0], knee[1], knee[2], side); v.box(ankle[0], ankle[1], ankle[2], ankle[0], ankle[1], ankle[2] + 1, joint);   // the extra-large joints
    if (sticky) v.box(foot[0] - side, foot[1] - 1, 0, foot[0], foot[1] + 1, 0, pad);
    else v.set(foot[0], foot[1], 0, joint);
  };
  [[0, -1, -2], [2, 0, -1], [5, 0, 1], [L, 1, 2]].forEach(([y, k, f], n) => { legAt(-1, y, k, f, n * 2); legAt(1, y, k, f, n * 2 + 1); });
  return v;
}

/* ---- katia's cybernetic arm ----
   7:86 "the cybernetic parts", "She raised her cybernetic, right arm and waved": the
   whole arm, "gone to the shoulder" before it. The book gives it no colour and no
   detail, so it is the plain form of a mechanical arm in a plain grey, raised at
   the elbow, the open hand waving to the front. */
function cyberArm(): Vox {
  const v = fresh();
  const plate = '#a4abb6', dark = '#4d535b', bolt = '#bfc4cb', seam = twin('#a4abb6');
  // the socket that fastens at the shoulder
  chamfer(v, 0, 0, 3, 3, 4, 8, 1, dark);
  v.set(1, 5, 6, bolt);
  // the upper arm, out to the side, a seam down its plates and a piston under it
  chamfer(v, 4, 1, 5, 9, 3, 8, 1, plate);
  v.box(4, 3, 6, 9, 3, 6, seam);
  v.box(5, 2, 4, 9, 2, 4, dark);
  // the elbow, a joint block with a bolt through it
  chamfer(v, 10, 0, 4, 13, 4, 8, 1, dark);
  v.set(11, 5, 6, bolt);
  // the forearm, up from the elbow
  chamfer(v, 10, 1, 9, 13, 3, 15, 1, plate);
  v.box(11, 3, 10, 12, 3, 10, seam); v.box(11, 3, 13, 12, 3, 13, seam);
  v.box(10, 1, 16, 13, 3, 16, dark);              // the wrist
  // the open hand, palm to the front: four fingers up, the thumb out to the side
  v.box(10, 1, 17, 13, 3, 19, plate);
  v.box(10, 3, 18, 13, 3, 18, seam);
  for (const x of [10, 11, 12, 13]) v.box(x, 2, 20, x, 3, x === 10 || x === 13 ? 21 : 22, x % 2 ? plate : seam);
  v.box(8, 2, 17, 9, 3, 17, plate); v.set(7, 2, 18, plate); v.set(7, 3, 18, plate);
  return v;
}

/* ---- glory bound ----
   6:30 the drug is named, and never shown. 7:16 Mordecai's dose: "the fizzing, green
   jar", "It looked like thick, carbonated slime. The concoction made a hissing
   noise." A wide glass jar of it, bubbles coming up through the green and fizzing
   over the top. No lid is mentioned, so none is drawn. */
function gloryJar(): Vox {
  const v = fresh();
  const green = '#5fae46', deep = '#3f8a30', bubble = '#a6e08a', fizz = '#d4f5c0';
  const c = 5;
  const R = (z: number) => (z === 0 ? 3.8 : z <= 9 ? 4.6 : z === 10 ? 4.2 : z === 11 ? 4.8 : 0);
  lathe(v, c, c, 0, 11, R, (x, y, z) => {
    const inside = Math.hypot(x - c, y - c) <= R(z) - 1 && z >= 1 && z <= 10;
    if (!inside) return 'glass';
    return z <= 8 ? (z <= 3 ? deep : green) : null;
  });
  // the lumpy top of the slime, and bubbles rising through it
  for (const [x, y] of [[4, 5], [5, 6], [6, 4], [3, 6]] as const) v.set(x, y, 9, green);
  for (const [x, y, z] of [[7, 5, 7], [5, 8, 5], [8, 6, 3], [3, 7, 6], [6, 8, 8], [8, 3, 6], [4, 4, 9]] as const) v.set(x, y, z, bubble);
  // the fizz, spitting up over the rim
  for (const [x, y, z] of [[5, 5, 11], [4, 6, 12], [6, 4, 13], [5, 7, 14], [3, 4, 12]] as const) v.set(x, y, z, fizz);
  return v;
}

/* ---- revitalize pet ----
   7:2 a heal pet potion grown "super sparkly": "This one was purple and looked as if
   someone had dumped half a jar of glitter into it". 7:3 "I smashed the vial", so
   it is the plain vial, purple, the glitter all through it and a sparkle off it. */
function glitterVial(): Vox {
  const v = vial({ liquid: '#7a3db8' });
  for (const [x, y, z, m] of [[4, 3, 2, '#ffffff'], [3, 4, 3, '#e8d6ff'], [4, 2, 5, '#e8d6ff'], [2, 4, 6, '#ffffff'], [4, 4, 7, '#ffffff'], [3, 4, 8, '#e8d6ff'], [4, 3, 9, '#e8d6ff'], [2, 4, 4, '#e8d6ff'], [4, 2, 8, '#ffffff']] as const) if (v.get(x, y, z) === '#7a3db8') v.set(x, y, z, m);
  for (const [x, y, z] of [[-2, 6, 11], [7, 2, 13], [6, 7, 4], [-1, 0, 6]] as const) v.set(x, y, z, 'white');
  return v;
}

/* ---- carl's chain dragon tattoo ----
   7:40 "It has to be a chain. A chain shaped like a dragon." Inked on his right
   forearm, "Katia pushed my sleeve back", a big one, since a level-13 skill takes
   almost all the ink. So it is drawn on the arm: the forearm laid along, his own
   skin, the hand closed at the wrist end, and down its length in black ink a
   dragon in profile, its head at the wrist and its body a chain of links waving
   back to a barbed tail. No colour is given beyond the ink's. */
function chainDragonArm(): Vox {
  const v = fresh();
  const skin = '#e3a77c', crease = twin('#e3a77c'), ink = '#24222a', link = '#55515e';
  const L = 15, D = 6, H = 7;                 // along, deep, high
  // the forearm, round in section: thicker toward the elbow end (+x), the wrist (-x) narrower
  for (let x = 0; x <= L; x++) {
    const thin = x <= 3 ? 1 : 0;
    for (let y = thin; y <= D - thin; y++) for (let z = thin; z <= H - thin; z++) {
      const dy = Math.min(y - thin, D - thin - y), dz = Math.min(z - thin, H - thin - z);
      if (dy + dz >= 2 || (x === L && dy + dz >= 3)) v.set(x, y, z, skin);
    }
  }
  // the fist at the wrist, its fingers curled toward the front, the thumb over them
  chamfer(v, -6, 0, 0, -1, 6, 7, 2, skin);
  for (const z of [1, 3, 5]) v.box(-6, 6, z, -3, 6, z, crease);
  v.box(-6, 4, 7, -1, 6, 7, skin); v.box(-5, 5, 7, -2, 5, 7, crease);
  v.box(-3, 6, 6, -1, 7, 7, skin);
  // the dragon along the front, wrapped round the arm: its head at the wrist, its body links in two blacks
  const dragon = [
    '.#..............',
    '###.......cc....',
    '#.##....cc..cc..',
    '##.#cccc......c.',
    '..............cc',
    '..............c.',
  ];
  dragon.forEach((row, j) => [...row].forEach((c, x) => {
    if (c === '.') return;
    onFront(v, x, 6 - j, c === '#' || Math.floor(x / 2) % 2 ? ink : link, 0, D + 1);
  }));
  return v;
}

/* ---- the reaper spider minion merchant patch ----
   7:4 "a black and silver patch, die cut and shaped like the horrifying form of Shi
   Maria, though with a shorter neck and shorter hair. Also, the spider in the image
   carried multiple wicker baskets lashed over her bulbous body." A die-cut patch,
   so its outline is the creature's: the bulbous body with the baskets lashed on it,
   the legs, a short neck and a head with short hair; black, picked out in silver. */
const MERCHANT = [
  '...ssssss.......###..',
  '...wvwvwvsssss.##fff.',
  '...vwvwvwwvwvw.##fef.',
  '..swvwvwvvwvwvs.##ff.',
  '.s###s#####s###s.##..',
  's####s#####s####s##..',
  's#####s####s#####s#..',
  's#####s####s######s..',
  's######s##s#########s',
  '.s#####s##s########s.',
  '..s####s##s#####sss..',
  '...sssssssssssss.....',
  '..s.s.s.s..s.s.s.s...',
  '.s.s.s.s....s.s.s.s..',
  's.s.s.s......s.s.s.s.',
];
function merchantPatch(): Vox {
  const v = fresh();
  const black = '#1f1d24', back = '#17161b', silver = '#c3c8d0', dim = '#8e949d', face = '#d9dde3';
  const pick: Record<string, string> = { '#': black, s: silver, w: silver, v: dim, f: face, e: black };
  stencil(v, MERCHANT, (x, z, c) => { v.set(x, 1, z, pick[c]); v.set(x, 0, z, back); });
  return v;
}
/** rows of characters standing in the x-z plane, top row first, each filled character handed to `put` */
function stencil(v: Vox, rows: string[], put: (x: number, z: number, c: string) => void) {
  rows.forEach((row, j) => [...row].forEach((c, i) => { if (c !== '.') put(i, rows.length - 1 - j, c); }));
}

/* ---- rev-up magic hair restoration tonic ----
   3:12 looted: "a bottle of Rev-Up Magic Hair Restoration", which 6:72 calls "a
   potion that grows it back": the plain potion, nothing more said of it.
   7:4 "The set came with little plastic gloves and multiple cotton swabs. That and
   a paper, fold-out instruction pamphlet that was really, really long."
   7:5 "The thing came with multiple trays and brushes", "the little plastic trays",
   "the large, main tray". None of it is coloured: plain plastic, plain paper. */
function tonicKit(trays: boolean): Vox {
  const v = fresh();
  const paper = '#e6dcc0', fold = twin('#e6dcc0'), print = '#8a8070', glove = '#d9e2e6', cuff = twin('#d9e2e6');
  const stick = '#f2efe6', cotton = '#ffffff', plastic = '#9aa3ab', rim = twin('#9aa3ab'), wood = '#8a5a32', bristle = '#3b3630';
  const z0 = trays ? 1 : 0;
  if (trays) {
    // the large, main tray under it all, a rim round its floor
    v.box(-1, -1, 0, 16, 11, 0, plastic);
    v.box(-1, -1, 1, 16, -1, 1, rim); v.box(-1, 11, 1, 16, 11, 1, rim); v.box(-1, -1, 1, -1, 11, 1, rim); v.box(16, -1, 1, 16, 11, 1, rim);
  }
  // the pamphlet, folded out in a long zigzag across the back
  for (let x = 0; x <= 15; x++) {
    const p = x % 4, z = z0 + (p === 0 ? 0 : p === 1 || p === 3 ? 1 : 2);
    v.box(x, 0, z, x, 4, z, x % 4 === 2 ? fold : paper);
    if (x % 4 === 1 || x % 4 === 3) v.set(x, 2, z, print);
  }
  // the bottle, standing on it
  for (const { p: [x, y, z], mat } of potion().all()) v.set(x + 1, y - 2, z + z0 + 2, mat);
  // a plastic glove lying flat at the front, its fingers spread
  v.box(10, 6, z0, 14, 9, z0, glove); v.box(9, 7, z0, 9, 8, z0, cuff); v.box(8, 7, z0, 8, 8, z0, cuff);
  for (const y of [6, 7, 8, 9]) v.box(15, y, z0, 16, y, z0, y % 2 ? glove : cuff);
  v.set(13, 10, z0, glove); v.set(14, 11, z0, glove);
  // cotton swabs at the front
  for (const [y, x0] of [[11, 2], [12, 4]] as const) { v.box(x0, y, z0, x0 + 5, y, z0, stick); v.set(x0, y, z0, cotton); v.set(x0 + 5, y, z0, cotton); v.set(x0, y, z0 + 1, cotton); v.set(x0 + 5, y, z0 + 1, cotton); }
  if (trays) {
    // two small mixing trays and a brush laid across them
    for (const x of [1, 5]) { v.box(x, 7, z0, x + 2, 9, z0, plastic); v.box(x, 7, z0 + 1, x + 2, 7, z0 + 1, rim); v.box(x, 9, z0 + 1, x + 2, 9, z0 + 1, rim); }
    v.box(0, 10, z0 + 1, 5, 10, z0 + 1, wood); v.box(6, 10, z0 + 1, 7, 10, z0 + 1, bristle);
  }
  return v;
}

/* ---- the spellbook of run, little günter, run ----
   7:40 "The book had grown little, centipede-like legs and had skittered away from
   me", "bigger than the books usually were, and it was dripping some foul-smelling
   black liquid all over the counter", "shivering". A big plain tome (its cover is
   never coloured), up on two rows of tiny legs down its long sides, black goo
   running off its edges. */
function centipedeBook(): Vox {
  const v = fresh();
  const leg = '#4a3d33', foot = '#2e2520', goo = '#1b1714', sheen = '#3a3436';
  const W = 13, L = 15;
  // the tome, bigger than the plain form, lifted on its legs: the boards overhang the pages,
  // which show on the two seen sides, the spine to the back
  const cover = '#5b3a26', pages = '#e3d7b8', line = '#cfc2a0';
  v.box(0, 0, 2, W, L, 2, cover);
  v.box(1, 0, 3, W - 1, L - 1, 6, pages);
  for (const z of [4, 5]) { v.box(W - 1, 0, z, W - 1, L - 1, z, (z % 2 ? line : pages)); v.box(1, L - 1, z, W - 1, L - 1, z, (z % 2 ? line : pages)); }
  v.box(0, 0, 3, 0, L, 6, twin(cover));
  v.box(0, 0, 7, W, L, 7, cover);
  // the legs, a pair to every other row down both long sides, bent out and down
  for (let y = 1; y <= L - 1; y += 2) {
    v.set(-1, y, 1, leg); v.set(-2, y, 0, foot);
    v.set(W + 1, y, 1, leg); v.set(W + 2, y, 0, foot);
  }
  // black goo: a slick across the cover, running over its edges and dripping off
  for (const [x, y] of [[3, 12], [4, 12], [4, 13], [4, 14], [5, 11], [5, 14], [4, 15], [10, 4], [11, 4], [11, 5], [12, 5], [7, 8]] as const) v.set(x, y, 8, goo);
  v.set(4, 13, 9, sheen); v.set(11, 4, 9, sheen);
  for (const [x, y, z0, z1] of [[4, L + 1, 3, 8], [5, L + 1, 6, 8], [W + 1, 5, 3, 8], [W + 1, 12, 5, 7]] as const) v.box(x, y, z0, x, y, z1, goo);
  v.set(4, L + 1, 1, goo); v.set(W + 1, 5, 1, goo); v.set(4, L + 1, -1, goo);
  return v;
}

/* ---- the war crime spellbook ----
   7:29 "THE BOOK ITSELF IS BLEEDING AND CRYING AND IT'S DISGUSTING." Nothing else is
   said of how it looks, so it is the plain tome, stood up with its cover to the
   front: blood seeping from its pages and running off it, tears running down the
   cover in two tracks. */
function warCrimeBook(): Vox {
  const v = fresh();
  const cover = '#5b3a26', pages = '#e3d7b8', blood = '#9a1d18', wet = '#c22a22', tear = '#9fd8f0';
  const W = 11, T = 5, H = 14;
  // the plain tome on its tail, the cover to +y, the spine to -x
  v.box(1, 1, 1, W - 1, T - 1, H - 1, pages);
  v.box(0, T, 0, W, T, H, cover); v.box(0, 0, 0, W, 0, H, cover);
  v.box(0, 0, 0, 0, T, H, twin(cover));
  // blood seeping from the pages along the top and the fore-edge, and running down
  for (const [x, y] of [[3, 2], [4, 3], [7, 2], [8, 3], [9, 1]] as const) v.set(x, y, H - 1, blood);
  for (const [y, z0] of [[2, 9], [3, 4], [1, 11]] as const) v.box(W - 1, y, z0, W - 1, y, H - 1, blood);
  for (const [y, z0] of [[2, 6], [3, 1]] as const) v.box(W, y, z0, W, y, z0 + 3, wet);
  v.set(W, 3, -1, wet); v.set(W, 2, -3, blood); v.set(8, 2, -2, blood);
  v.box(6, 2, -1, 7, 3, -1, blood); v.set(7, 1, 0, blood);
  // the tears, two tracks down the cover from near its top
  for (const x of [3, 7]) { v.box(x, T + 1, 5, x, T + 1, 11, tear); v.set(x + 1, T + 1, 8, tear); }
  v.set(3, T + 1, 3, tear); v.set(7, T + 1, 2, tear);
  return v;
}

/* ---- the scorpion's bite ----
   7:86 "A strange device appeared on Donut's back": "Quadruped weapon mount. 'The
   scorpion's bite.' Non-magical bandolier accessory. Allows for the mounting of
   multiple ranged weapons." Then "Katia's crossbow formed on Donut's back, attached
   to the mount": "The large, deadly crossbow was bigger than Donut". So it is drawn
   as the book shows it: two girth straps round where a cat goes, a strap along her
   back with the bandolier's loops on it, and the mount on top carrying the
   crossbow, unloaded. The leather and the metal are never coloured: plain ones,
   the crossbow in the dark wood and metal of her figure's. */
function weaponMount(): Vox {
  const v = fresh();
  const leather = '#6b4428', loop = '#523420', buckle = '#b3b7bd', post = '#5d646e';
  const stock = '#5c3a20', prod = '#454b52', fitting = '#7c858e', cord = '#cfc6b0';
  // the two girth straps, hoops round her chest and her belly, buckled at the side
  for (const x of [3, 9]) for (let y = 0; y <= 8; y++) for (let z = 0; z <= 8; z++) {
    const d = Math.max(Math.abs(y - 4), Math.abs(z - 4)) + 0.5 * Math.min(Math.abs(y - 4), Math.abs(z - 4));
    if (d >= 3.6 && d <= 5) v.box(x, y, z, x + 1, y, z, leather);
  }
  for (const x of [3, 9]) v.set(x, 9, 4, buckle);
  // the strap along her back, the bandolier's loops on it
  v.box(1, 3, 8, 12, 5, 8, leather);
  for (const x of [2, 5, 8, 11]) v.box(x, 2, 7, x, 6, 9, loop);
  // the mount: a post up off the back, a cradle on it
  v.box(6, 3, 9, 7, 5, 11, post);
  v.box(4, 2, 12, 9, 6, 12, post);
  // the crossbow on the cradle, pointing forward along x: the stock, the magazine on top, the bow across the front
  v.box(-2, 3, 13, 13, 5, 14, stock);
  v.box(-3, 3, 12, -1, 5, 14, stock);                     // the butt
  v.box(4, 3, 15, 8, 5, 17, fitting);                     // the repeating magazine
  v.box(4, 3, 18, 8, 5, 18, prod);
  v.box(13, 3, 13, 14, 5, 14, fitting);                   // the nose
  for (let y = -5; y <= 13; y++) {
    const back = Math.abs(y - 4) >= 6 ? 2 : Math.abs(y - 4) >= 3 ? 1 : 0;
    v.set(14 - back, y, 14, prod);
  }
  bar(v, [12, -5, 14], [7, 3, 15], cord); bar(v, [12, 13, 14], [7, 5, 15], cord);
  return v;
}

/* ---- stayfast ink ----
   7:75 "She pulled what looked like a wineskin from her inventory", "Stayfast Ink,
   825 ml." A plain leather wineskin, its neck stopped, a cord for carrying; the ink
   is inside it and never seen, so neither is drawn. */
function wineskin(): Vox {
  const v = fresh();
  const leather = '#7a4a2a', seam = '#a06a40', stopper = '#3b2a20', cord = '#c9b384';
  // the belly, full and rounded, a little flattened front to back
  chamfer(v, 2, 1, 0, 8, 6, 0, 2, leather);
  chamfer(v, 1, 0, 1, 9, 7, 2, 3, leather);
  chamfer(v, 0, 0, 3, 10, 7, 8, 3, leather);
  chamfer(v, 1, 0, 9, 9, 7, 10, 3, leather);
  chamfer(v, 3, 1, 11, 7, 6, 11, 2, leather);
  // the stitched seam round its edge
  for (let z = 1; z <= 10; z++) for (const x of [0, 1, 9, 10]) if (v.has(x, 4, z) && (x === 0 || x === 10 || !v.has(x + (x < 5 ? -1 : 1), 4, z))) v.set(x, 4, z, seam);
  // the neck, tied off, and the stopper in it
  v.box(4, 3, 12, 6, 4, 13, twin(leather));
  v.box(4, 3, 13, 6, 4, 13, cord);
  v.box(4, 3, 14, 6, 4, 15, stopper);
  // the carrying cord, looped from the neck over to the side
  path(v, [[7, 4, 13], [9, 4, 14], [11, 4, 13], [12, 4, 10], [11, 4, 7]], cord);
  return v;
}

/* ---- toraline ink ----
   6:71 "An empty beaker", "I picked up the burning hot beaker, and it was now filled
   with a small amount of bubbling, black liquid." A plain glass beaker, its lip and
   spout, black ink in the bottom and bubbles on it.
   7:40 "She pulled the vial from her inventory and sat it on the table. The ink was
   already mixed." The plain vial, the ink in it black. */
function inkBeaker(): Vox {
  const v = fresh();
  const ink = '#16121a', bubble = '#3a3442';
  const c = 4;
  const R = (z: number) => (z === 0 ? 3.4 : z <= 9 ? 3.8 : z === 10 ? 4.2 : 0);
  lathe(v, c, c, 0, 10, R, (x, y, z) => (Math.hypot(x - c, y - c) <= R(z) - 1 && z >= 1 ? (z <= 2 ? ink : null) : 'glass'));
  v.set(c, c + 5, 10, 'glass'); v.set(c, c + 5, 9, 'glass');                  // the spout
  for (const [x, y, z] of [[3, 4, 3], [5, 5, 3], [4, 2, 3], [5, 3, 4]] as const) v.set(x, y, z, bubble);
  // the graduation marks up its side
  for (const z of [3, 5, 7]) v.set(c + 4, c, z, 'domeRim');
  return v;
}

/* ---- the waffle maker ----
   7:54 Carl's thermobaric bomb, "the size of a thermos"; 7:60 "the round high-yield
   Waffle Makers, which were shaped like tubes". A tube of plain dark metal standing
   on end, capped at both ends, a band round its middle; no markings are given. */
function tubeBomb(): Vox {
  const v = fresh();
  const body = '#5d646e', cap = '#3b3f47', band = '#7c858e', shine = '#9aa2ab';
  const c = 3.5;
  lathe(v, c, c, 0, 15, z => (z === 0 || z === 15 ? 2.6 : z <= 2 || z >= 13 ? 3.6 : 3.2), (x, y, z) => (z <= 2 || z >= 13 ? cap : z === 7 || z === 8 ? band : body));
  v.box(3, 3, 16, 4, 4, 16, cap);
  for (let z = 4; z <= 11; z++) if (z !== 7 && z !== 8) { for (let y = 8; y >= 0; y--) if (v.has(2, y, z)) { v.set(2, y, z, shine); break; } }
  return v;
}

export const ITEMS_B7B: Record<string, Record<string, () => Vox>> = {
  'hell-kissed-potion-of-prince-of-woe': { 'horned-skull': hellKissed },
  'indelible-woe': { plain: plainNecklace },
  'katias-cybernetic-arm': { waving: cyberArm },
  'glory-bound': { jar: gloryJar },
  'revitalize-pet': { sparkly: glitterVial },
  'myspace-photo': { plain: () => potion() },
  'carls-chain-dragon-tattoo': { inked: chainDragonArm },
  'reaper-spider-minion-merchant-patch': { 'die-cut': merchantPatch },
  'rev-up-hair-restoration-tonic': { bottle: () => potion(), kit: () => tonicKit(false), trays: () => tonicKit(true) },
  'run-little-gunter-run': { skittering: centipedeBook },
  'scorpions-bite': { mounted: weaponMount },
  'stayfast-ink': { wineskin },
  'toraline-ink': { beaker: inkBeaker, vial: () => vial({ liquid: '#16121a' }) },
  'waffle-maker': { tube: tubeBomb },
  'war-crime': { bleeding: warCrimeBook },
  'jamals-mechanical-legs': { harness: () => jamalsLegs('harness'), grabbers: () => jamalsLegs('grabbers'), sticky: () => jamalsLegs('sticky'), wrecked: () => jamalsLegs('wrecked') },
};
