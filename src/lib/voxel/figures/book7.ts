import { Vox } from '../vox.ts';
import { base, head, eyes, body, twin, person, copyInto, wideBase, floating, H0, H1,
         PLAIN_HAIR, PLAIN_TOP, PLAIN_BOTTOM, PLAIN_SHOES } from './parts.ts';

/* ---- the ninth floor's cast, drawn from the edition's own words at each look's point ----
   Shapes and colours only, never a name or a word: the words live in the data,
   and check-pages reads this file like any page. Where the book leaves a colour
   unsaid, a figure takes a plain one. */

/* a rounded block: its edges and corners left off, so a body or a ball reads round */
function round(v: Vox, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, mat: string | ((x: number, y: number, z: number) => string)) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const ex = x === x0 || x === x1, ey = y === y0 || y === y1, ez = z === z0 || z === z1;
    if ((ex && ey) || (ex && ez) || (ey && ez)) continue;
    v.set(x, y, z, typeof mat === 'string' ? mat : mat(x, y, z));
  }
}
/* an elf's ears: long points out past the hair */
function elfEars(v: Vox, skin: string) {
  for (const x of [-1, 8]) { v.box(x, 4, 17, x, 4, 19, skin); v.set(x < 0 ? -2 : 9, 4, 20, skin); }
}
/* a straight run of voxels from one point to another */
function line(v: Vox, a: [number, number, number], b: [number, number, number], mat: string) {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
  for (let i = 0; i <= n; i++) v.set(Math.round(a[0] + (b[0] - a[0]) * i / n), Math.round(a[1] + (b[1] - a[1]) * i / n), Math.round(a[2] + (b[2] - a[2]) * i / n), mat);
}

/* ---- the leader of the war mage rebellion, as first seen (7:61): a long-haired elf, old and wizened, an angry sneer
   on his sagging face, a crackling, many-coloured glow round him, the gate (a winding box like a large music box, the
   pocket watches in it) in his hands; when next met (8:37) mottled, sun-damaged skin and a purple milkshake ---- */
export function akuma(stage: 'gate' | 'milkshake') {
  const skin = '#dcbc98', fold = '#b89272';
  const v = person({ skin, hair: { color: PLAIN_HAIR, style: 'long' }, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 71 });
  elfEars(v, skin);
  v.set(2, 7, 18, skin); v.set(5, 7, 18, skin); v.set(3, 7, 18, '#6a5444'); v.set(4, 7, 18, '#6a5444');   // narrowed eyes, the brows drawn down between them
  v.set(1, 7, 14, fold); v.set(6, 7, 14, fold); v.set(1, 7, 15, fold); v.set(6, 7, 16, fold);   // the face sagging into jowls
  v.box(2, 7, 15, 4, 7, 15, '#5a2a24'); v.set(5, 7, 16, '#5a2a24');                 // the sneer, pulled up one side
  // the glow: sparks of every colour crackling round him
  for (const [x, y, z, m] of [[-2, 3, 12, 'laser'], [-2, 2, 13, 'laser'], [-1, 6, 7, 'ember'], [9, 2, 11, 'portal'], [9, 3, 12, 'portal'], [9, 6, 16, 'window'],
    [-2, 5, 21, 'portal'], [-3, 4, 22, 'portal'], [9, 4, 22, 'laser'], [2, -1, 23, 'window'], [6, 0, 24, 'ember'], [9, 6, 7, 'laser'], [-2, 7, 16, 'window'], [5, -1, 9, 'portal']] as [number, number, number, string][]) v.set(x, y, z, m);
  if (stage === 'gate') {
    v.box(0, 6, 10, 0, 8, 10, twin(skin)); v.box(7, 6, 10, 7, 8, 10, twin(skin));    // hands out in front
    v.box(1, 7, 9, 6, 9, 11, 'wood'); v.box(1, 7, 12, 6, 9, 12, 'woodDark');          // the winding box, its lid
    v.box(4, 8, 13, 5, 9, 13, 'accent'); v.set(4, 9, 13, '#fff3c4');   // a pocket watch on it
  } else {
    for (const [x, y, z] of [[2, 7, 19], [5, 7, 20], [6, 7, 17], [1, 7, 18], [0, 5, 11], [7, 4, 12], [0, 3, 13], [3, 7, 14]] as const) v.set(x, y, z, '#b98663');   // mottled
    v.box(8, 4, 9, 8, 5, 11, '#8a4ab8'); v.box(8, 4, 12, 8, 5, 12, '#efe3f2'); v.box(8, 5, 13, 8, 5, 14, 'white');   // the milkshake, its straw
  }
  return v;
}

/* ---- the god of silence, first seen whole (7:71): a kaiju, taller than the tower, but slim and younger-looking than
   expected and otherwise a regular man, in white and golden robes torn and filthy from the fight, the front stained red ---- */
export function harpocrates() {
  const skin = '#d7ab86', robe = '#ece8de', gold = 'accent';
  const v = new Vox();
  wideBase(v, -4, 11, 72, -1, 11);
  const fig = person({ skin, hair: { color: PLAIN_HAIR, style: 'short' }, top: robe, outfit: 'robe', bottom: robe, bare: true });
  fig.box(2, 6, 13, 5, 6, 13, gold); fig.box(0, 3, 10, 0, 5, 10, gold); fig.box(7, 3, 10, 7, 5, 10, gold);   // gold at the collar and the cuffs
  fig.box(0, 2, 5, 7, 2, 5, gold); fig.box(0, 7, 5, 7, 7, 5, gold); fig.box(0, 2, 5, 0, 7, 5, gold); fig.box(7, 2, 5, 7, 7, 5, gold);   // and round the hem
  for (const [x, y] of [[1, 7], [5, 7], [7, 5], [0, 3], [3, 2]] as const) fig.set(x, y, 5, null);   // torn
  for (const [x, z] of [[2, 12], [3, 12], [4, 12], [2, 11], [3, 11], [4, 11], [5, 11], [3, 10], [4, 10], [5, 10], [2, 9], [3, 9], [4, 9], [3, 8], [4, 7], [3, 6]] as const) fig.set(x, 6, z, '#9e2a26');   // the stain down the front
  for (const [x, y, z] of [[7, 3, 8], [7, 5, 7], [1, 7, 6], [6, 7, 6], [0, 4, 12], [7, 2, 11]] as const) fig.set(x, y, z, '#9c907a');   // filth
  copyInto(v, fig);
  // the town at his feet, a street of it no higher than his shin
  v.chunk = 0;
  v.box(-3, 7, 5, -2, 9, 6, 'plaster'); v.box(-3, 7, 7, -2, 9, 7, 'roofRed');
  v.box(-3, 2, 5, -2, 3, 7, 'tile'); v.set(-3, 3, 6, 'window');
  v.box(9, 8, 5, 10, 9, 6, 'plaster'); v.box(9, 8, 7, 10, 9, 7, 'roofBlue');
  v.box(9, 3, 5, 10, 4, 5, 'stone'); v.set(9, 4, 6, 'stone');                          // a block flattened
  return v;
}

/* ---- the god of rebirth, met in his own temple (7:52-7:53): two legs, two arms, humanoid, but where a head would be
   an entire six-legged beetle, wings and a tiny head of its own; barely five feet, in the robes of the gods with their
   golden fringe ---- */
export function khepri() {
  const v = new Vox(), robe = PLAIN_TOP, limb = '#8c8072', shell = '#4a3d31', leg = '#2a221c';
  base(v, 'stoneDark', 'stone', 73);
  v.chunk = 0;
  body(v, { top: robe, skin: limb, bottom: robe, feet: PLAIN_SHOES });
  v.box(1, 2, 6, 6, 6, 9, robe); v.box(0, 2, 5, 7, 7, 5, robe);                       // the robe to the floor
  for (let x = 0; x <= 7; x++) { v.set(x, 7, 5, 'accent'); v.set(x, 2, 5, 'accent'); }   // the golden fringe
  for (let y = 2; y <= 7; y++) { v.set(0, y, 5, 'accent'); v.set(7, y, 5, 'accent'); }
  v.box(0, 3, 10, 0, 5, 10, 'accent'); v.box(7, 3, 10, 7, 5, 10, 'accent'); v.box(2, 6, 13, 5, 6, 13, 'accent');
  v.box(3, 3, 14, 4, 5, 14, limb);                                                    // the neck the beetle sits on
  // the beetle: a long domed shell split down the back into its two wing cases, three legs a side gripping on
  round(v, 0, 7, -1, 8, 15, 19, (x) => (x <= 3 ? shell : twin(shell)));
  v.box(1, 0, 20, 2, 7, 20, '#5e4e3e'); v.box(5, 0, 20, 6, 7, 20, '#5e4e3e'); v.box(3, -1, 20, 4, 7, 20, '#211b16');   // the cases' sheen, the seam
  v.box(1, -2, 16, 2, -2, 18, '#6e604f'); v.box(5, -2, 16, 6, -2, 18, '#6e604f');     // the wings' tips, out from under the cases
  round(v, 2, 5, 9, 11, 15, 18, shell);                                               // its own tiny head
  v.set(2, 11, 17, '#c9b48a'); v.set(5, 11, 17, '#c9b48a');
  v.set(2, 12, 18, leg); v.set(5, 12, 18, leg); v.set(1, 13, 19, leg); v.set(6, 13, 19, leg);   // feelers
  for (const y of [1, 4, 7]) for (const [x, dx] of [[-1, -1], [8, 1]] as const) { v.set(x, y, 17, leg); v.set(x + dx, y, 16, leg); v.set(x + dx, y, 15, leg); v.set(x + dx, y + (y > 4 ? 1 : y < 4 ? -1 : 0), 14, leg); }
  return v;
}

/* ---- a naga: a snake's coil on the ground, a body rising out of it to a man's chest and arms, and a snake's head ----
   `pairs` arms down each side, from the shoulder down; a hood spread behind the head if there is one */
function naga(v: Vox, o: { scale: string; belly: string; eye: string; pairs: number; coil: number; hood?: { color: string; rim: string } }) {
  for (let a = 0; a < Math.PI * 2; a += 0.12) {
    const cx = 3.5 + Math.cos(a) * o.coil, cy = 4 + Math.sin(a) * o.coil * 0.88;
    for (let dz = 0; dz <= 2; dz++) for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) v.set(Math.round(cx) + ox - 1, Math.round(cy) + oy - 1, 5 + dz, o.scale);
  }
  v.box(1, 2, 5, 6, 6, 10, o.scale); v.box(2, 6, 6, 5, 7, 10, o.belly);               // rising out of the coil
  v.box(1, 2, 11, 6, 6, 14, o.scale); v.box(2, 3, 15, 5, 6, 15, o.scale);             // the chest, the neck
  const limb = twin(o.scale);
  // the arms: with six, the top pair raised, the next held out, the lowest down at the sides, each ringed at the wrist;
  // with two, hanging at the sides like a man's
  if (o.pairs === 3) {
    const arms: [number, number][][] = [[[1, 14], [2, 15], [3, 16], [3, 17]], [[1, 12], [2, 12], [3, 12], [4, 12]], [[1, 10], [1, 9], [1, 8], [1, 7]]];
    for (const arm of arms) for (const side of [-1, 1]) arm.forEach(([dx, z], i) => { const x = (side < 0 ? 0 : 7) + side * dx; v.box(x, 4, z, x, 5, z, i === 2 ? 'accent' : limb); });
  } else { v.box(0, 3, 10, 0, 5, 14, limb); v.box(7, 3, 10, 7, 5, 14, limb); v.box(0, 4, 9, 0, 5, 9, limb); v.box(7, 4, 9, 7, 5, 9, limb); }
  if (o.hood) for (let x = -3; x <= 10; x++) for (let z = 13; z <= 23; z++) {
    const d = ((x - 3.5) / 7) ** 2 + ((z - 18) / 5.6) ** 2;
    if (d <= 1) v.set(x, 1, z, d > 0.72 ? o.hood.rim : o.hood.color);
  }
  // the snake's head: broad and flat-topped, a blunt snout out in front, the eyes high on it
  round(v, 0, 7, 1, 7, 16, 21, o.scale);
  round(v, 1, 6, 7, 9, 15, 18, o.scale);
  v.box(1, 7, 19, 2, 7, 20, o.eye); v.box(5, 7, 19, 6, 7, 20, o.eye);
}

/* ---- the warlord of the Blood Sultanate at the council (7:42): half again as big as any naga, a brilliant glossy white
   with a hint of gold along the edge of her wide cobra hood, a golden breastplate embossed with a branch bearing one
   flower, six arms ringed in golden bracelets, eyes solid red; at the end (7:54-7:55) the white was makeup, and she is a
   dusky gray, a hint of red along her neck ---- */
export function vinata(stage: 'white' | 'gray') {
  const gray = stage === 'gray', scale = gray ? '#7d7a76' : '#efece6', belly = gray ? '#9a958e' : '#f8f5ee';
  const v = new Vox();
  wideBase(v, -5, 12, 74, -3, 11);
  v.chunk = 0;
  naga(v, { scale, belly, eye: '#d0141a', pairs: 3, coil: 5.5, hood: { color: scale, rim: 'accent' } });
  v.box(1, 6, 11, 6, 6, 14, 'accent'); v.box(2, 7, 11, 5, 7, 13, 'accent');         // the golden breastplate
  v.set(3, 8, 11, '#b8901c'); v.set(3, 8, 12, '#b8901c'); v.set(4, 8, 13, '#b8901c'); v.set(4, 8, 12, '#b8901c');   // the branch embossed on it,
  v.set(5, 8, 13, '#e8d070');                                                         // its one flower
  if (gray) v.box(2, 7, 15, 5, 7, 15, '#9a3a36');                                    // a hint of red along her neck
  else for (const [x, y, z] of [[1, 7, 21], [7, 5, 18], [0, 6, 9]] as const) v.set(x, y, z, 'white');   // gloss
  return v;
}

/* ---- the paper tattoo made flesh (7:15): a seventeen-foot hammerhead shark, overweight, the anatomy of a regular
   hammerhead but breathing air, on a harness with eight double-jointed legs; a wide-brimmed, camel-coloured hat
   reshaped to sit on his head (8:90) ---- */
export function jamal(stage: 'legs' | 'gurkha') {
  const v = new Vox(), hide = '#7a848c', belly = '#d6dad6';
  wideBase(v, -5, 12, 75, -7, 11);
  v.chunk = 0;
  round(v, 0, 7, -5, 7, 9, 14, (x, y, z) => (z <= 9 ? belly : hide));              // the plump body, up on its legs
  round(v, 1, 6, -8, -5, 10, 13, hide);                                              // tapering to the tail
  v.box(3, -10, 10, 4, -9, 17, hide); v.box(3, -11, 15, 4, -11, 18, hide); v.box(3, -10, 9, 4, -10, 9, hide);   // the tail fin
  v.box(3, -1, 15, 4, 2, 15, hide); v.box(3, 0, 16, 4, 2, 17, hide); v.box(3, 1, 18, 4, 2, 19, hide);          // the dorsal fin
  // the hammer: a wide flat head, an eye at each end
  v.box(-3, 8, 12, 10, 10, 14, hide); v.box(-3, 8, 11, 10, 10, 11, belly); v.box(1, 7, 11, 6, 8, 14, hide);
  v.box(-3, 10, 13, -3, 10, 13, 'black'); v.box(10, 10, 13, 10, 10, 13, 'black'); v.set(-3, 9, 13, 'black'); v.set(10, 9, 13, 'black');
  v.box(2, 11, 11, 5, 11, 11, '#3a3a3e');                                            // the mouth
  for (const y of [4, 5, 6]) v.box(8, y, 11, 8, y, 13, '#4d555c');                    // gills
  // the harness and its eight legs, double-jointed, out and down to the ground
  v.box(-1, 1, 9, -1, 2, 14, 'metalDark'); v.box(8, 1, 9, 8, 2, 14, 'metalDark'); v.box(0, 1, 15, 7, 2, 15, 'metalDark'); v.box(0, 1, 8, 7, 2, 8, 'metalDark');
  for (const y of [-4, -1, 2, 5]) for (const [x0, dx] of [[-1, -1], [8, 1]] as const) {
    const fy = y + (y > 0 ? 1 : -1);
    line(v, [x0, y, 11], [x0 + dx * 2, y, 15], 'metalDark'); v.set(x0 + dx * 2, y, 15, 'rail');
    line(v, [x0 + dx * 2, y, 14], [x0 + dx * 3, fy, 6], 'metalDark'); v.set(x0 + dx * 3, fy, 5, 'rail');
  }
  if (stage === 'gurkha') {
    const camel = '#c19a6b';
    v.box(0, 7, 15, 7, 11, 15, camel); v.box(2, 8, 16, 5, 10, 18, camel); v.box(2, 8, 17, 5, 8, 17, '#7a5a3a');   // brim, crown, band
    v.box(3, 9, 18, 4, 9, 18, twin(camel));
  }
  return v;
}

/* ---- the Land War veteran (7:15): a tall, tan-skinned man of very few words, and his spear, a long, efficient metal
   stick with a no-nonsense point ---- */
export function bodi() {
  const v = person({ skin: '#b98a5e', hair: { color: PLAIN_HAIR, style: 'short' }, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 76 });
  v.box(3, 7, 15, 4, 7, 15, '#7a5236');                                              // a flat, closed mouth
  v.box(8, 5, 5, 8, 5, 21, 'metal'); v.box(8, 5, 22, 8, 5, 24, 'rail'); v.set(8, 5, 25, 'white');   // the spear
  return v;
}

/* ---- the Viceroy who leads the Madness, at the table (7:18): a white, featureless mask with a small red teardrop in
   its very centre, long flowing Jedi-like robes as starkly white as the mask, like a pope, moving as though the body
   under them is the wrong shape; the robes flung back (7:19) on a horrific, bug-like body and six arms, two of them
   holding a rifle ---- */
export function architectHouston(stage: 'mask' | 'arms') {
  const white = '#f3f1ec', robe = '#e9e6df', drop = '#c8201c';
  const v = new Vox();
  base(v, 'stoneDark', 'stone', 77);
  v.chunk = 0;
  v.box(0, 0, H0, 7, 7, H1, '#d9d5cc');                                               // the head, covered
  v.box(1, 8, H0 + 1, 6, 8, H1 - 1, white); v.box(2, 8, H0, 5, 8, H0, white);        // the mask, featureless
  v.set(3, 8, 17, drop); v.set(3, 8, 18, drop);                                     // the small teardrop in its centre
  if (stage === 'mask') {
    v.box(1, 2, 10, 6, 6, 13, robe); v.box(-1, 2, 9, 0, 6, 13, twin(robe)); v.box(7, 2, 9, 8, 6, 13, twin(robe));   // long, wide sleeves
    v.box(0, 1, 5, 7, 7, 9, robe); v.box(-1, 2, 5, 8, 6, 6, robe);                    // falling to the floor, wide at the hem
    v.box(-2, 1, 9, -2, 3, 11, robe); v.box(8, 0, 6, 8, 1, 8, robe); v.set(2, 0, 12, robe); v.box(5, -1, 7, 6, 0, 9, robe);   // lumps where nothing should be
    for (const x of [2, 5]) v.box(x, 7, 5, x, 7, 9, twin(robe)); v.box(8, 3, 5, 8, 3, 9, twin(robe)); v.box(9, 4, 5, 9, 5, 7, robe); v.box(8, 5, 10, 9, 6, 11, robe);   // its folds, and more lumps
    return v;
  }
  // the robes flung back: a cape behind, and under it the bug's body, segmented, and six arms
  const chit = '#3a3530', seg = '#4c463f';
  v.box(-1, 0, 6, 8, 1, 14, robe); v.box(-1, 2, 13, 0, 3, 14, robe); v.box(7, 2, 13, 8, 3, 14, robe);
  for (let z = 7; z <= 13; z++) v.box(1, 2, z, 6, 6, z, z % 2 ? chit : seg);
  v.box(2, 7, 8, 5, 7, 12, seg);
  v.box(1, 3, 5, 2, 6, 6, chit); v.box(5, 3, 5, 6, 6, 6, chit); v.set(1, 7, 5, seg); v.set(6, 7, 5, seg);   // bug legs
  const arm = '#5e574e';
  for (const z of [13, 11]) for (const [x0, dx] of [[0, -1], [7, 1]] as const) { v.box(x0, 4, z, x0, 5, z, arm); v.box(x0 + dx, 4, z, x0 + dx, 5, z, arm); v.box(x0 + dx * 2, 4, z - 1, x0 + dx * 2, 5, z - 1, arm); v.box(x0 + dx * 2, 5, z - 2, x0 + dx * 2, 6, z - 2, chit); }
  // the lowest pair, forward, holding the rifle
  v.box(0, 4, 9, 0, 8, 9, arm); v.box(7, 4, 9, 7, 8, 9, arm); v.box(1, 8, 9, 2, 8, 10, chit); v.box(5, 8, 9, 6, 8, 10, chit);
  v.box(3, 6, 10, 4, 12, 10, 'metalDark'); v.box(3, 3, 9, 4, 6, 10, 'woodDark'); v.box(3, 13, 10, 4, 13, 10, 'black'); v.box(3, 9, 9, 4, 9, 9, 'metalDark');
  return v;
}

/* ---- the colonel of the Bloody Leeches (7:22): a grizzled old elf from one of the earliest seasons, like the world's
   fattest bulldog pickled for five thousand years and given elf ears, an unlit cigar in his mouth; solid as he is old ---- */
export function boomer() {
  const skin = '#cfa486', fold = '#a97f62';
  const v = person({ skin, hair: { color: '#9d988e', style: 'buzz' }, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 78 });
  elfEars(v, skin);
  v.box(1, 7, 10, 6, 7, 12, PLAIN_TOP); v.box(0, 2, 10, 0, 6, 12, twin(PLAIN_TOP)); v.box(7, 2, 10, 7, 6, 12, twin(PLAIN_TOP));   // solid, barrel-wide
  // the bulldog: jowls hanging past the chin, a broad flat nose, the face folded
  v.box(0, 8, 13, 2, 8, 15, twin(skin)); v.box(5, 8, 13, 7, 8, 15, twin(skin)); v.box(1, 7, 13, 6, 7, 13, twin(skin));
  v.box(3, 8, 16, 4, 8, 16, fold); v.set(3, 8, 15, '#3a2a24'); v.set(4, 8, 15, fold);
  v.box(1, 7, 19, 6, 7, 19, fold); v.set(4, 7, 19, skin); v.set(2, 7, 16, fold); v.set(5, 7, 16, fold);
  v.box(5, 9, 14, 5, 11, 14, '#6b4528'); v.set(5, 12, 14, '#4a4440');                // the cigar, unlit
  return v;
}

/* ---- the spider's husband, in the dream (7:18): first a spider, then a large, dark-skinned man in simple pants and a vest ---- */
export function hapanzi() {
  const skin = '#5a3a28';
  const v = person({ skin, hair: { color: PLAIN_HAIR, style: 'short' }, top: PLAIN_TOP, sleeves: 'none', bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 79 });
  v.box(3, 6, 10, 4, 6, 13, skin);                                                   // the vest, open down the chest
  v.box(-1, 3, 10, 0, 5, 13, twin(skin)); v.box(7, 3, 10, 8, 5, 13, twin(skin));     // big arms
  v.box(-1, 4, 9, -1, 5, 9, twin(skin)); v.box(8, 4, 9, 8, 5, 9, twin(skin));
  return v;
}

/* ---- the attorney, seen across her own table (8:1): a naga, coiled, much smaller than the one before her and with only
   two arms, nails she hides. The book gives her no colour; she takes a plain one ---- */
export function princessChandra() {
  const v = new Vox();
  wideBase(v, -4, 11, 80, -3, 11);
  v.chunk = 0;
  naga(v, { scale: '#857f70', belly: '#a19a8a', eye: 'black', pairs: 1, coil: 4.6 });
  v.set(1, 7, 19, '#857f70'); v.set(6, 7, 19, '#857f70'); v.set(2, 7, 20, '#857f70'); v.set(5, 7, 20, '#857f70');   // her eyes, smaller than the warlord's
  return v;
}

/* ---- the Sai mercenary inherited with a castle (7:26-7:28): an enormous bipedal rhinoceros, a samurai of his kind, in
   boots; one boot eaten off him, showing a round foot ---- */
export function toyotomi() {
  const hide = '#8b8a84', horn = '#cfc6b2', plate = PLAIN_TOP, cord = '#3f3d3a';
  const v = new Vox();
  base(v, 'stoneDark', 'stone', 81);
  v.chunk = 0;
  head(v, hide);
  round(v, 1, 6, 7, 11, H0, H0 + 4, twin(hide));                                      // the long snout
  v.box(2, 9, H0 + 4, 5, 11, H0 + 4, horn); v.box(3, 10, H0 + 5, 4, 11, H0 + 6, horn); v.box(3, 11, H0 + 7, 4, 11, H0 + 8, horn); v.set(3, 11, H0 + 9, horn);   // the horn, up off the nose
  v.box(3, 8, H0 + 5, 4, 8, H0 + 5, horn);                                              // and a small one behind it
  eyes(v, 'black', 19, [1, 6], 1);
  for (const x of [0, 6]) { v.box(x, 1, H1 + 1, x + 1, 2, H1 + 2, hide); v.set(x === 0 ? 0 : 7, 2, H1 + 3, hide); }   // ears
  v.set(2, 12, H0 + 1, '#4a4844'); v.set(5, 12, H0 + 1, '#4a4844');
  body(v, { top: plate, skin: hide, bottom: plate, legs: twin(hide), feet: PLAIN_SHOES });
  v.box(-1, 2, 9, 0, 6, 13, twin(hide)); v.box(7, 2, 9, 8, 6, 13, twin(hide));      // arms like a rhino's legs
  // the samurai's plates: wide flared shoulders, a laced chest, a skirt of plates
  v.box(-2, 2, 13, 0, 6, 14, plate); v.box(7, 2, 13, 9, 6, 14, plate); v.box(-2, 2, 12, -2, 6, 12, twin(plate)); v.box(9, 2, 12, 9, 6, 12, twin(plate));
  for (const z of [10, 12]) v.box(1, 6, z, 6, 6, z, cord);
  v.box(0, 1, 7, 7, 7, 9, plate); for (const x of [1, 3, 5]) v.box(x, 7, 7, x, 7, 9, cord);
  v.box(5, 3, 5, 6, 7, 5, twin(hide)); v.set(5, 7, 5, null); v.set(6, 7, 5, null);  // the boot eaten: a round foot
  return v;
}

/* ---- the sluggalette born of Carl's slugpox (7:55): a slug the size of a bulldog, little wisps of pink-dyed hair circling
   her round head monk-style, piercings down the side of her slimy head, a single hatchet growing straight up from the
   middle of it, dripping blood; with her eyestalks and a thimble-sized wide-brimmed camel hat on one of them (8:90) ---- */
export function bigs(stage: 'hatchet' | 'gurkha') {
  const slug = '#8f8670', sole = '#6f6858', pink = '#ff6fb4';
  const v = new Vox();
  base(v, 'stoneDark', 'stone', 82);
  v.chunk = 0;
  for (let x = 0; x <= 7; x++) for (let y = -5; y <= 7; y++) for (let z = 5; z <= 9; z++)   // the body, low along the ground, tapering back
    if (((x - 3.5) / 3.4) ** 2 + ((y - 1) / 6) ** 2 + ((z - 5) / 3.6) ** 2 <= 1) v.set(x, y, z, z === 5 ? sole : slug);
  for (let x = -1; x <= 8; x++) for (let y = 1; y <= 10; y++) for (let z = 7; z <= 16; z++)   // the round head, reared up
    if (Math.hypot(x - 3.5, y - 5.5, z - 11.5) <= 4.5) v.set(x, y, z, slug);
  const front = (x: number, z: number) => { for (let y = 12; y >= 0; y--) if (v.has(x, y, z)) return y; return 0; };
  const side = (y: number, z: number) => { for (let x = 10; x >= 0; x--) if (v.has(x, y, z)) return x; return 0; };
  // the wisps of pink: a thin ring round her head, monk-style, the top of it bare
  for (let x = -1; x <= 8; x++) for (let y = 0; y <= 10; y++) {
    const r = Math.hypot(x - 3.5, y - 5.5);
    if (r > 3.3 && v.has(x, y, 13) && (x + y) % 2 === 0) v.set(x, y, 13, pink);
    if (r > 3.2 && v.has(x, y, 14) && (x * 3 + y) % 4 === 0) v.set(x, y, 14, pink);
  }
  for (const [y, z] of [[7, 9], [7, 11], [6, 13], [8, 10], [5, 9]] as const) v.set(side(y, z), y, z, 'rail');   // piercings down the side
  v.box(2, front(2, 10), 10, 5, front(2, 10), 10, '#5a4f44');                         // a mouth
  // the hatchet, growing straight up out of the middle of her head, bloody
  v.box(4, 5, 16, 4, 5, 20, 'woodDark'); v.box(4, 6, 18, 4, 8, 21, 'metal'); v.box(4, 9, 18, 4, 9, 21, 'rail');
  v.set(4, 7, 17, 'red'); v.set(4, 9, 17, 'red'); v.set(4, 8, 18, 'red');
  if (stage === 'hatchet') { for (const x of [2, 5]) v.box(x, front(x, 12) + 1, 12, x, front(x, 12) + 1, 13, 'black'); return v; }
  // eyestalks, and the tiny hat on one of them
  for (const x of [2, 5]) { v.box(x, 8, 15, x, 8, 16, slug); v.box(x, 9, 17, x, 9, 18, slug); v.set(x, 10, 18, 'black'); }
  v.box(4, 8, 19, 6, 10, 19, '#c19a6b'); v.set(5, 9, 20, '#c19a6b'); v.set(5, 10, 19, '#7a5a3a');
  return v;
}

/* ---- the Semeru war leader (7:7): a young, squat, wide dwarf, darker complected, a round face and a flat nose, thick
   black hair under his hat, no beard but a long, thin moustache; armour almost samurai-like, an open-chested metal vest
   with flared shoulders belling out just below the waist, chainmail legs with loose red and yellow strips down the
   sides; a rounded skullcap full of feathers straight up, a metal fern curling at its front; everything he wears
   glowing; a wide sickle slung over his shoulder ---- */
export function arief() {
  const skin = '#a8774f', hair = '#15110e', mail = 'metalDark', steel = 'metal';
  const v = person({ skin, top: steel, bottom: steel, legs: mail, feet: PLAIN_SHOES, seed: 83 });
  v.box(0, 0, H1 - 3, 7, 1, H1 - 1, hair); v.box(0, 2, H0 + 2, 0, 5, H1 - 2, hair); v.box(7, 2, H0 + 2, 7, 5, H1 - 2, hair);   // hair under the hat
  v.box(3, 7, 16, 4, 7, 16, twin(skin));                                              // a flat nose
  v.box(2, 7, 15, 5, 7, 15, hair); v.set(1, 7, 14, hair); v.set(6, 7, 14, hair); v.box(1, 8, 12, 1, 8, 13, hair); v.box(6, 8, 12, 6, 8, 13, hair);   // the long, thin moustache, its ends hanging
  v.box(3, 6, 10, 4, 6, 13, skin); v.set(2, 6, 13, skin); v.set(5, 6, 13, skin);      // the vest open down the chest
  v.box(-1, 2, 13, 0, 6, 13, steel); v.box(7, 2, 13, 8, 6, 13, steel); v.set(-1, 4, 12, steel); v.set(8, 4, 12, steel);   // flared shoulders
  v.box(0, 1, 8, 7, 7, 9, steel); v.box(-1, 2, 8, 8, 6, 8, steel);                   // the bell below the waist
  for (const [x, y, z, m] of [[0, 4, 7, 'red'], [0, 3, 6, '#e8c21c'], [0, 5, 6, 'red'], [7, 4, 7, '#e8c21c'], [7, 3, 6, 'red'], [7, 5, 6, '#e8c21c'], [3, 4, 7, 'red'], [4, 4, 6, '#e8c21c']] as [number, number, number, string][]) v.set(x, y, z, m);   // the strips
  // the skullcap, rounded, its feathers straight up, each with its own glow, and the fern on the front
  round(v, -1, 8, -1, 8, H1 - 1, H1 + 1, steel);
  for (const [x, y, h, m, tip] of [[1, 2, 4, '#d23a3a', 'ember'], [3, 1, 6, '#2f6fd0', 'portal'], [5, 2, 5, '#e8c21c', 'window'], [6, 5, 3, '#3aa05a', 'portal'], [2, 5, 3, '#eeeae2', 'laser'], [4, 3, 5, '#8a3ab0', 'laser']] as [number, number, number, string, string][]) {
    v.box(x, y, H1 + 2, x, y, H1 + 1 + h, m); v.set(x, y, H1 + 2 + h, tip);
  }
  v.box(3, 9, H1 - 1, 3, 9, H1 + 1, 'rail'); v.box(2, 9, H1 + 1, 4, 9, H1 + 1, 'rail'); v.set(4, 9, H1 + 2, 'rail'); v.set(5, 9, H1 + 3, 'rail'); v.set(4, 9, H1 + 4, 'rail');   // the fern, curling at its tip
  // the wide sickle over his shoulder
  line(v, [8, 1, 9], [8, -1, 17], 'woodDark');
  for (const [y, z] of [[-1, 18], [0, 19], [1, 20], [2, 20], [3, 19], [4, 18], [5, 17], [-2, 18], [-1, 19]] as const) v.set(8, y, z, 'rail');
  for (const [x, y, z] of [[-1, 6, 8], [8, 3, 20]] as const) v.set(x, y, z, 'portal');   // the enchantments glowing
  return v;
}

/* ---- the Dream's adjutant (7:69): a tripod, a round, basketball-like body on three long, multi-jointed legs, covered in
   black dots that might be eyes ---- */
export function fopsy() {
  const v = new Vox(), skin = '#a39c8e', leg = '#6e695f';
  wideBase(v, -5, 12, 84, -4, 11);
  v.chunk = 0;
  for (let x = -2; x <= 9; x++) for (let y = -2; y <= 9; y++) for (let z = 15; z <= 26; z++) {   // the ball
    const r = 5.3 * Math.sqrt(Math.max(0, 1 - ((z - 20.5) / 6) ** 2)), dx = Math.abs(x - 3.5), dy = Math.abs(y - 3.5);
    if (Math.max(dx, dy) <= r && dx + dy <= r * 1.42) v.set(x, y, z, skin);
  }
  // the dots, scattered all over it, none touching another
  const dots: [number, number, number][] = [];
  for (let z = 25; z >= 16; z--) for (let x = -2; x <= 9; x++) for (let y = -2; y <= 9; y++) {
    if (!v.has(x, y, z) || (v.has(x + 1, y, z) && v.has(x, y + 1, z) && v.has(x, y, z + 1))) continue;
    if ((x * 7 + y * 11 + z * 5) % 4 !== 0 || dots.some(([a, b, c]) => Math.max(Math.abs(a - x), Math.abs(b - y), Math.abs(c - z)) < 3)) continue;
    dots.push([x, y, z]); v.set(x, y, z, '#1f1c1a');
  }
  // three long legs, each jointed high and again lower down
  for (const a of [Math.PI * 0.42, Math.PI * 1.1, Math.PI * 1.75]) {
    const c = Math.cos(a), s = Math.sin(a), at = (r: number, z: number): [number, number, number] => [Math.round(3.5 + c * r), Math.round(3.5 + s * r), z];
    line(v, at(3, 16), at(7, 19), leg); line(v, at(3.5, 16), at(7.5, 19), leg); line(v, at(7, 19), at(7.5, 11), leg); line(v, at(7.5, 11), at(6.5, 6), leg);
    v.set(...at(7, 19), '#8a857a'); v.set(...at(7.5, 11), '#8a857a'); v.set(...at(6.5, 5), 'metalDark');
  }
  return v;
}

/* ---- the lawyer's niece, interviewing him for her school report (7:1): a young nullian, the gray skin, large eyes and
   bulbous head of her kind (5:3), rough hands, a recorder on her wrist; the very illegal blaster her uncle gave her, in
   her hand (8:88) ---- */
export function tempest(stage: 'recorder' | 'blaster') {
  const skin = '#9aa0a3';
  const v = person({ skin, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 85 });
  // the bulbous head: wider and taller over the brow, narrow at the chin
  v.box(-1, 1, 17, -1, 6, 21, skin); v.box(8, 1, 17, 8, 6, 21, skin); v.box(0, 0, H1 + 1, 7, 7, H1 + 1, skin); v.box(1, 1, H1 + 2, 6, 6, H1 + 2, skin);
  v.set(0, 7, H0, null); v.set(7, 7, H0, null); v.set(0, 6, H0, null); v.set(7, 6, H0, null);
  v.box(1, 7, 16, 2, 7, 18, 'black'); v.box(5, 7, 16, 6, 7, 18, 'black'); v.set(2, 7, 18, '#3a3e42'); v.set(5, 7, 18, '#3a3e42');   // large eyes
  v.box(-1, 4, 9, -1, 5, 10, 'metalDark'); v.set(-1, 5, 10, 'portal');                // the recorder on her wrist
  if (stage === 'blaster') {                                                          // the arm up and out, the blaster in her hand
    v.clear(7, 4, 9, 7, 5, 9); v.box(7, 6, 11, 7, 7, 11, twin(skin));
    v.box(7, 8, 11, 7, 10, 12, 'metalDark'); v.box(7, 8, 10, 7, 8, 10, 'black'); v.set(7, 11, 12, 'laser'); v.set(7, 9, 13, 'red');
  }
  return v;
}

/* ---- the influencer flung out of the goddess (7:69): a slender woman who had herself made to look just like the
   Amazonian shieldmaiden (7:62), blonde, in that same armour, its glittering breastplate ---- */
export function nami() {
  const v = person({ skin: '#f0c9a6', hair: { color: '#e8cf74', style: 'long' }, top: '#d9d4c8', outfit: 'armor', bottom: '#4a4d55', feet: '#d8cdb8', seed: 86 });
  v.box(1, 6, 11, 6, 6, 13, '#e6d48a'); v.set(2, 6, 12, '#fff3c4'); v.set(5, 6, 11, '#fff3c4'); v.set(4, 6, 13, '#fff3c4');   // the glittering breastplate
  return v;
}

/* Every figure this book draws, by character id and look. Characters the book
   never describes enough to draw stay the shadow figure, and are not here. */
export const BOOK7_FIGURES: Record<string, Record<string, () => Vox>> = {
  akuma: { gate: () => akuma('gate'), milkshake: () => akuma('milkshake') },
  harpocrates: { robes: harpocrates },
  khepri: { beetle: khepri },
  vinata: { white: () => vinata('white'), gray: () => vinata('gray') },
  jamal: { legs: () => jamal('legs'), gurkha: () => jamal('gurkha') },
  bodi: { spear: bodi },
  'architect-houston': { mask: () => architectHouston('mask'), arms: () => architectHouston('arms') },
  boomer: { cigar: boomer },
  hapanzi: { man: hapanzi },
  'princess-chandra': { naga: princessChandra },
  toyotomi: { samurai: toyotomi },
  bigs: { hatchet: () => bigs('hatchet'), gurkha: () => bigs('gurkha') },
  arief: { feathers: arief },
  fopsy: { tripod: fopsy },
  tempest: { recorder: () => tempest('recorder'), blaster: () => tempest('blaster') },
  nami: { armor: nami },
};
