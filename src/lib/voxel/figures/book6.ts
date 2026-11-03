import { Vox } from '../vox.ts';
import { base, head, eyes, body, twin, person, copyInto, wideBase, H0, H1,
         PLAIN_HAIR, PLAIN_TOP, PLAIN_BOTTOM, PLAIN_SHOES } from './parts.ts';

/* ---- the sixth book's cast, one builder per character, one look per stretch of the story ----
   The same rules as cast.ts: every look is drawn from the edition's own words at
   its point, a colour the book leaves unsaid is a plain one, and nothing here is
   a word. The comments cite the chapter each look is read from. */

type Mat = string | ((x: number, y: number, z: number) => string | null);
type P3 = [number, number, number];

/* ---- local helpers: shapes the people builders do not have ---- */
function blob(v: Vox, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, m: Mat) {
  for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++)
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1) { const c = typeof m === 'string' ? m : m(x, y, z); if (c) v.set(x, y, z, c); }
}
function line(v: Vox, a: P3, b: P3, m: string) {
  const n = Math.max(1, ...a.map((p, i) => Math.abs(b[i] - p)));
  for (let i = 0; i <= n; i++) v.set(Math.round(a[0] + (b[0] - a[0]) * i / n), Math.round(a[1] + (b[1] - a[1]) * i / n), Math.round(a[2] + (b[2] - a[2]) * i / n), m);
}
function path(v: Vox, pts: P3[], m: string) { for (let i = 0; i + 1 < pts.length; i++) line(v, pts[i], pts[i + 1], m); }
/** a box with its edges and corners off, so it reads round */
function rounded(v: Vox, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m: Mat) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const ex = x === x0 || x === x1, ey = y === y0 || y === y1, ez = z === z0 || z === z1;
    if ((ex && ey) || (ex && ez) || (ey && ez)) continue;
    const c = typeof m === 'string' ? m : m(x, y, z); if (c) v.set(x, y, z, c);
  }
}
/** a figure's layer z drawn twice, so it stands a block taller there (long legs, platform boots) */
function taller(fig: Vox, at: number, times = 1): Vox {
  const v = new Vox();
  for (const { p: [x, y, z], mat, chunk } of fig.all()) {
    v.chunk = chunk;
    if (z > at) v.set(x, y, z + times, mat);
    else if (z === at) for (let k = 0; k <= times; k++) v.set(x, y, z + k, mat);
    else v.set(x, y, z, mat);
  }
  v.chunk = 0;
  return v;
}
/** a figure with layers taken out, so it stands shorter (a small man, a child) */
function shorter(fig: Vox, ...cuts: number[]): Vox {
  let f = fig;
  for (const c of [...cuts].sort((a, b) => b - a)) {
    const n = new Vox();
    for (const { p: [x, y, z], mat, chunk } of f.all()) { if (z === c) continue; n.chunk = chunk; n.set(x, y, z > c ? z - 1 : z, mat); }
    f = n;
  }
  f.chunk = 0;
  return f;
}
/** a figure drawn bare, set on its own patch of ground */
function grounded(fig: Vox, seed: number): Vox {
  const v = new Vox();
  base(v, 'stoneDark', 'stone', seed);
  copyInto(v, fig);
  v.chunk = 0;
  return v;
}

/* ---- the swamp's demigod (6:25-6:26): a giant spider, translucent beige and brown speckled with black and covered
   with hair, a bulbous abdomen the size of a car, eight legs much too long and too thin, folding over her like the
   arms of a broken umbrella; an almost-human head on a long, putty-like neck, an older, haggard woman's face of
   flaking skin, long, stringy, greasy black hair, four black orbs for eyes in a row, the two in the middle huge, the
   jaw hinged down as if screaming and a pair of long, hair-covered fangs ---- */
export function shiMaria() {
  const v = new Vox(), beige = '#cdb48a', brown = '#7d5d3e', speck = '#1f1712', leg = '#5a4330', skin = '#c3b5a1', hair = '#141114';
  wideBase(v, -3, 10, 71, -8, 10);
  v.chunk = 0;
  // the abdomen, big as a car and behind her: beige over the back, brown under, a few black specks, hairy
  blob(v, 3.5, -4, 13.5, 5.2, 4.3, 4.6, (x, y, z) => ((x * 7 + y * 13 + z * 5) % 19 === 0 ? speck : z >= 14 ? beige : brown));
  for (const [x, y] of [[2, -3], [6, -6], [1, -6], [4, -1], [5, -8], [3, -5]] as const) v.set(x, y, 18, '#9a7a52');
  blob(v, 3.5, 1.5, 10, 3, 2.6, 2.2, brown);                                                                     // the body the legs hang from
  // eight legs, up to a knee high over her and down to the ground far out to the side
  const roots = [3, 1, -1, -3], knees = [5, 1, -3, -6], feet = [7, 2, -4, -8], kz = [19, 22, 22, 19];
  for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {
    const rx = side < 0 ? 1 : 6, kx = side < 0 ? -2 : 9, fx = side < 0 ? -3 : 10;
    path(v, [[rx, roots[i], 10], [kx, knees[i], kz[i]], [fx, feet[i], 5]], leg);
    v.set(kx, knees[i], kz[i] + 1, '#3d2e21');
  }
  // the long neck up out of her, and the head on it, out in front
  v.box(3, 2, 11, 4, 4, 13, twin(skin)); v.box(3, 4, 13, 4, 5, 14, twin(skin));
  v.box(0, 3, 14, 7, 10, 21, skin);
  for (const [x, z] of [[1, 15], [6, 16], [2, 20], [6, 20], [0, 18]] as const) v.set(x, 10, z, '#e2d7c6');     // flaking
  // the hair: stringy and greasy, over the top and the back, hanging in strings round her face
  v.box(0, 3, 21, 7, 10, 21, hair); v.box(0, 3, 14, 7, 3, 21, hair);
  for (const [x, y] of [[-1, 5], [-1, 7], [8, 4], [8, 6], [-1, 9]] as const) v.box(x, y, 11 + (y % 3), x, y, 21, hair);
  for (const x of [0, 7]) v.box(x, 10, 19, x, 10, 21, hair);
  // four black orbs in a row: two huge in the middle, smaller either side
  v.box(1, 11, 17, 2, 11, 18, 'black'); v.box(5, 11, 17, 6, 11, 18, 'black'); v.set(0, 10, 18, 'black'); v.set(7, 10, 18, 'black');
  v.set(2, 11, 18, '#4a4650'); v.set(6, 11, 18, '#4a4650');
  // the jaw hinged all the way down, screaming, and the hairy fangs
  v.box(2, 10, 14, 5, 10, 15, '#2a1418'); v.box(2, 8, 12, 5, 10, 13, twin(skin)); v.box(3, 10, 13, 4, 10, 13, '#2a1418');
  for (const x of [2, 5]) { v.box(x, 11, 12, x, 11, 15, '#3d2f25'); v.set(x, 11, 11, 'bone'); }
  return v;
}

/* ---- the cookbook's fourth author, as he walks into the guild (7:11): a Crest, the human race with no eyebrows
   (6:12), tall and thin, an old scar running up over his bald head from temple to temple as if he had been
   scalped, skin leathery and golden brown from a life of hard labour ---- */
export function tipid() {
  const skin = '#b5834f', scar = '#d9937a';
  const fig = person({ skin, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, bare: true });
  fig.box(0, 5, 18, 0, 5, 21, scar); fig.box(7, 5, 18, 7, 5, 21, scar);
  for (let x = 0; x <= 7; x++) fig.set(x, x % 3 ? 5 : 4, H1, scar);
  for (let x = 1; x <= 6; x++) fig.set(x, 7, 19, twin(skin));                    // the leathery brow, bare of eyebrows
  return grounded(taller(fig, 7), 72);
}

/* ---- the nun (6:5): a bipedal, short-haired cat, coffee-coloured fur almost black, the long, thin face of a
   Siamese, rounded upright ears, glowing green eyes; nothing on but a flowing cloak and arm bracers, a glowing
   trident over her shoulder ---- */
export function sisterInes() {
  const v = new Vox(), fur = '#3b2a20', cloak = PLAIN_TOP;
  base(v, 'stoneDark', 'stone', 73);
  v.chunk = 0;
  head(v, fur);
  v.box(2, 8, 14, 5, 8, 17, twin(fur)); v.box(3, 9, 14, 4, 9, 16, twin(fur)); v.set(3, 10, 16, '#140c09'); v.set(4, 10, 16, '#140c09');   // the long muzzle
  v.box(1, 7, 18, 2, 7, 18, '#7cf06a'); v.box(5, 7, 18, 6, 7, 18, '#7cf06a'); v.set(2, 7, 18, '#0d1a0b'); v.set(5, 7, 18, '#0d1a0b');   // green eyes
  for (const x of [0, 6]) { v.box(x, 3, 22, x + 1, 4, 23, fur); v.set(x === 0 ? 0 : 7, 3, 24, fur); v.set(x === 0 ? 1 : 6, 4, 24, fur); }   // rounded ears, upright
  body(v, { top: twin(fur), skin: fur, bottom: twin(fur), legs: fur, feet: fur });
  v.box(0, 3, 10, 0, 5, 11, PLAIN_BOTTOM); v.box(7, 3, 10, 7, 5, 11, PLAIN_BOTTOM);   // the bracers
  // the cloak, flowing off her shoulders
  v.box(-1, 1, 12, 8, 2, 13, cloak); v.box(0, 0, 6, 7, 1, 12, cloak); v.box(1, -1, 5, 6, -1, 9, cloak);
  // the trident, over her shoulder
  line(v, [8, 6, 8], [8, 2, 22], 'rail');
  v.box(8, 1, 22, 8, 3, 22, 'rail'); v.box(8, 1, 23, 8, 1, 25, 'rail'); v.box(8, 3, 23, 8, 3, 25, 'rail'); v.box(8, 2, 23, 8, 2, 26, 'white');
  return v;
}

/* ---- the demon prince of Sheol: first in the body of the sea snake he has slipped into (6:60), a giant, whale-sized
   boa coiled on top of a tall building, pouring fire into the sky; then his own full form (6:66), a centaur-like
   quadruped with a humanoid chest, red skin that bubbles like lava with black, swirling patches, the head of a
   massive, demonic deer with four steaming horns, two straight up and two curving down like tusks, and a mouth
   beaked at the end, nothing inside it but teeth and fire ---- */
export function amayon(stage: 'serpent' | 'demon') {
  const v = new Vox();
  if (stage === 'serpent') {
    const hide = '#5e5a4a', belly = '#7a7560';
    wideBase(v, -4, 11, 74, -2, 10);
    v.chunk = 0;
    // the coils, heaped
    for (const [r0, r1, z0, z1] of [[2.4, 5.6, 5, 7], [1.6, 4.6, 8, 10], [0.8, 3.4, 11, 12]] as const)
      for (let x = -3; x <= 10; x++) for (let y = -2; y <= 10; y++) { const d = Math.hypot(x - 3.5, (y - 4) * 1.05); if (d >= r0 && d <= r1) for (let z: number = z0; z <= z1; z++) v.set(x, y, z, z === z1 && d > r1 - 1.2 ? belly : hide); }
    for (const [x, y, z] of [[-1, 2, 7], [8, 6, 7], [2, 9, 6], [6, -1, 6], [0, 6, 10], [7, 2, 10], [4, 8, 9]] as const) if (v.has(x, y, z)) v.set(x, y, z, twin(hide));   // its saddles
    // the neck rearing out of the middle, and the head thrown back, jaws open to the sky
    v.box(2, 3, 11, 5, 6, 19, hide); v.box(2, 7, 12, 5, 7, 18, belly);
    v.box(1, 2, 19, 6, 7, 23, hide);                                                           // the head
    v.box(2, 5, 24, 5, 8, 25, hide); v.box(2, 8, 19, 5, 9, 21, belly);                          // the snout up, the lower jaw dropped
    v.box(2, 8, 22, 5, 9, 23, '#3a1410'); v.box(3, 6, 25, 4, 7, 25, '#3a1410');                 // the throat, open
    v.set(1, 6, 22, 'black'); v.set(6, 6, 22, 'black');
    // the fire it pours into the sky
    for (let z = 24; z <= 30; z++) { const w = z < 27 ? 2 : 1; v.box(4 - w, 9 - w, z, 4 + w - 1, 9 + w - 1, z, z % 2 ? 'flame' : 'ember'); }
    v.set(2, 10, 31, 'ember'); v.set(5, 8, 31, 'flame');
    return v;
  }
  const red = '#b8281c', swirl = '#1f1416', horn = '#3a2f2c';
  // lava: red, in black swirling bands, bubbling through here and there
  const skin = (x: number, y: number, z: number) => { const s = Math.sin(x * 0.9 + z * 0.7) + Math.cos(y * 0.8 - z * 0.5); return s > 1.15 ? swirl : red; };
  wideBase(v, -4, 11, 75, -8, 10);
  v.chunk = 0;
  rounded(v, 1, 6, -6, 4, 8, 13, skin);                                                          // the quadruped's body
  for (const [x, y] of [[1, -6], [5, -6], [1, 3], [5, 3]] as const) { v.box(x, y, 5, x + 1, y + 1, 8, red); v.box(x, y, 5, x + 1, y + 1, 5, swirl); }
  v.box(3, -8, 11, 4, -7, 12, swirl); v.box(3, -9, 8, 4, -9, 10, swirl);                        // a tail
  rounded(v, 0, 7, 3, 8, 13, 20, skin);                                                         // the chest rising from the front
  v.box(1, 8, 15, 6, 8, 18, skin); v.box(3, 9, 15, 4, 9, 17, swirl);                            // its muscle
  v.box(-2, 4, 17, -1, 7, 20, skin); v.box(8, 4, 17, 9, 7, 20, skin);                           // shoulders
  v.box(-2, 6, 13, -1, 7, 16, red); v.box(8, 6, 13, 9, 7, 16, red);                             // arms
  v.box(-2, 7, 12, -1, 9, 13, swirl); v.box(8, 7, 12, 9, 9, 13, swirl);                         // fists
  // the deer's head, long and beaked, the beak full of fire
  v.box(1, 3, 21, 6, 9, 26, red); v.box(2, 10, 21, 5, 12, 24, red); v.box(2, 13, 21, 5, 13, 23, '#2a1a12'); v.set(3, 14, 22, '#2a1a12'); v.set(4, 14, 22, '#2a1a12');
  v.box(3, 10, 21, 4, 12, 21, 'ember'); v.box(2, 13, 20, 5, 13, 20, 'ember');
  v.set(1, 9, 24, 'black'); v.set(6, 9, 24, 'black');
  for (const [x, z] of [[2, 25], [5, 23], [3, 22]] as const) v.set(x, 9, z, swirl);
  for (const [x, y, z] of [[2, 8, 19], [6, 8, 14], [7, 2, 11], [3, 4, 13], [8, 1, 10], [1, 9, 25]] as const) if (v.has(x, y, z)) v.set(x, y, z, 'ember');   // the lava, bubbling
  // four steaming horns: two straight up, two curving down like tusks
  for (const x of [2, 5]) { v.box(x, 5, 27, x, 5, 33, horn); v.set(x, 5, 34, 'mist'); v.set(x + (x < 4 ? -1 : 1), 5, 35, 'mist'); }
  for (const [x, dx] of [[0, -1], [7, 1]] as const) { path(v, [[x, 9, 24], [x + dx, 10, 22], [x + dx, 11, 19], [x, 12, 18]], horn); v.set(x + dx * 2, 10, 23, 'mist'); }
  return v;
}

/* ---- the god of blacksmiths (6:16): human-sized, buff and dark-skinned, a giant war hammer over his shoulder, a
   leather apron with no shirt, shorts, a necklace of sharp white teeth from some massive creature, eyes of nothing
   but white light, a yellow glow about him ---- */
export function ogun() {
  const skin = '#4a2e1f', apron = '#7e5230';
  const fig = person({ skin, hair: { color: PLAIN_HAIR, style: 'buzz' }, eyes: 'white', top: twin(skin), sleeves: 'none', bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, bare: true });
  fig.box(-1, 3, 10, -1, 5, 13, twin(skin)); fig.box(8, 3, 10, 8, 5, 13, twin(skin));           // arms like his hammer
  // the leather apron over his bare chest: a bib, the skirt to the knee, a strap up to each shoulder
  fig.box(1, 7, 6, 6, 7, 9, apron); fig.box(2, 7, 10, 5, 7, 11, apron); fig.box(2, 7, 12, 2, 7, 12, apron); fig.box(5, 7, 12, 5, 7, 12, apron);
  fig.box(2, 2, 13, 2, 6, 13, apron); fig.box(5, 2, 13, 5, 6, 13, apron);
  fig.box(1, 7, 13, 6, 7, 13, 'bone'); for (const x of [1, 3, 4, 6]) fig.set(x, 7, 12, 'bone');   // the necklace of teeth, points down
  // the hammer over his right shoulder, its head behind him
  line(fig, [8, 6, 9], [8, 0, 19], 'woodDark');
  fig.box(7, -3, 18, 10, 0, 21, 'metalDark'); fig.box(7, -3, 18, 7, 0, 21, 'metal'); fig.box(10, -3, 18, 10, 0, 21, 'metal');
  const v = grounded(fig, 76);
  for (const [x, y, z] of [[-2, 6, 6], [9, 7, 7], [-2, 1, 16], [9, 3, 15], [2, 9, 5], [5, -1, 6]] as const) v.set(x, y, z, 'accentGlow');   // the glow
  return v;
}

/* ---- the orisha (6:11): a well-muscled man a hair shorter than Carl, skin bone white, almost translucent, a straw
   skirt to his knees and a headdress like a second grass skirt, a lampshade that hides his face and falls halfway
   down his chest; tendrils of fire off his bare feet and legs, a wand of reeds tied with colourful string and hung
   with seashells. Back from the card as the gold edition (6:58): shining with golden light, a short staff with a
   sugar skull at the end, his skirt woven gold ---- */
export function asojano(stage: 'reeds' | 'gold') {
  const skin = '#e8e5de', gold = stage === 'gold';
  const straw = gold ? 'accent' : '#c9a85a', strawDark = gold ? '#d9a10a' : '#a88a42', hat = '#c9a85a', hatDark = '#a88a42';
  const fig = person({ skin, top: twin(skin), sleeves: 'none', bottom: straw, feet: null, bare: true });
  // the skirt, to the knees, in strands
  for (let x = 0; x <= 7; x++) for (let y = 1; y <= 7; y++) if (x === 0 || x === 7 || y === 1 || y === 7) fig.box(x, y, 7, x, y, 9, (x + y) % 2 ? straw : strawDark);
  for (const x of [1, 3, 4, 6]) fig.set(x, 7, 6, strawDark);
  // the headdress: a lampshade of grass over the head and halfway down the chest, the face lost in it
  for (let z = 12; z <= 23; z++) {
    const r = z >= 23 ? 2 : z >= 22 ? 3 : z >= 14 ? 4 : 5;
    for (let x = 4 - r; x <= 3 + r; x++) for (let y = 4 - r; y <= 3 + r; y++) {
      const edge = x === 4 - r || x === 3 + r || y === 4 - r || y === 3 + r;
      if (edge || z >= 21) fig.set(x, y, z, (x + y) % 2 ? hat : hatDark);
    }
  }
  for (const [x, y, z] of [[1, 8, 5], [6, 8, 6], [0, 4, 6], [7, 3, 5], [2, 6, 7], [5, 7, 7]] as const) fig.set(x, y, z, 'flame');   // fire off his feet
  if (!gold) {
    fig.box(8, 5, 8, 8, 5, 16, '#a89a5a');                                                                   // the wand of reeds
    fig.set(8, 5, 10, '#d23a3a'); fig.set(8, 5, 12, '#2f6fd0'); fig.set(8, 5, 14, '#e8c21c'); fig.set(8, 6, 15, 'white'); fig.set(9, 5, 13, 'white');
    return grounded(fig, 77);
  }
  fig.box(8, 5, 7, 8, 5, 15, 'woodDark');                                                                     // the short staff
  fig.box(7, 4, 16, 9, 6, 18, 'white'); fig.set(7, 6, 17, 'black'); fig.set(9, 6, 17, 'black'); fig.set(8, 6, 16, '#e05a9a'); fig.set(8, 6, 18, '#3aa0d0');   // the sugar skull
  const v = grounded(fig, 77);
  for (const [x, y, z] of [[-2, 5, 8], [9, 2, 11], [-2, 1, 19], [10, 6, 20], [3, 9, 5], [8, -2, 14], [-1, 8, 14]] as const) v.set(x, y, z, 'accentGlow');
  return v;
}

/* ---- the naga of the Blood Sultanate (6:21): large, green and purple, four arms and no legs, a long snake's body
   coiled on the ground, dark snake eyes, dented plate armour on his chest, his head and arms bare. A prisoner
   (7:58): without his armour and with his arms removed, less a naga than a massive cobra ---- */
export function rishi(stage: 'armor' | 'armless') {
  const v = new Vox(), green = '#4f8a3e', purple = '#6a3a88', armless = stage === 'armless';
  wideBase(v, -4, 11, 78, -3, 10);
  v.chunk = 0;
  // the coils on the ground, a purple stripe down the back of them
  for (const [r0, r1, z0, z1] of [[2.6, 5.4, 5, 6], [1.2, 3.8, 7, 8]] as const)
    for (let x = -3; x <= 10; x++) for (let y = -3; y <= 10; y++) { const d = Math.hypot(x - 3.5, y - 3.5); if (d >= r0 && d <= r1) for (let z: number = z0; z <= z1; z++) v.set(x, y, z, z === z1 && Math.abs(d - (r0 + r1) / 2) < 0.7 ? purple : green); }
  v.box(2, 2, 8, 5, 5, 9, green);
  // the chest, and the head, a snake's, bare
  v.box(1, 2, 10, 6, 6, 14, twin(green));
  // the head, a snake's: long and flat, purple over the crown, dark snake eyes up at its sides
  v.box(0, 0, 15, 7, 6, 19, green); v.box(1, 7, 15, 6, 10, 18, green); v.box(2, 11, 15, 5, 11, 17, green);
  v.box(1, 0, 20, 6, 6, 20, purple); v.box(2, 7, 19, 5, 10, 19, purple);
  v.box(1, 7, 15, 6, 11, 15, '#3a6a30'); v.set(2, 11, 17, '#1c2a18'); v.set(5, 11, 17, '#1c2a18');
  v.box(1, 8, 18, 1, 9, 18, 'black'); v.box(6, 8, 18, 6, 9, 18, 'black');
  if (armless) {
    // the hood of a cobra, flared behind the head
    v.box(-2, 0, 13, 9, 0, 20, green); v.box(-1, 0, 21, 8, 0, 21, green); v.box(-2, 1, 14, -2, 2, 19, purple); v.box(9, 1, 14, 9, 2, 19, purple);
    v.box(2, 7, 10, 5, 7, 14, '#9ac07a');
    return v;
  }
  // dented plate armour on the chest
  v.box(1, 6, 10, 6, 7, 14, 'metal'); for (const [x, z] of [[2, 13], [5, 11], [3, 10], [6, 14]] as const) v.set(x, 7, z, 'metalDark');
  // four bare arms: an upper pair raised out from the shoulders, a lower pair at the sides
  for (const [x, dx] of [[0, -1], [7, 1]] as const) {
    const arm = twin(green);
    for (const dy of [0, 1]) { path(v, [[x, 4 + dy, 14], [x + dx * 2, 5 + dy, 15], [x + dx * 3, 6 + dy, 17]], arm); }
    v.box(x + dx * 3, 6, 18, x + dx * 3, 7, 18, green);
    for (const dy of [0, 1]) path(v, [[x, 3 + dy, 12], [x + dx, 4 + dy, 10], [x + dx, 5 + dy, 9]], arm);
    v.set(x + dx, 6, 8, green);
  }
  return v;
}

/* ---- the older dancer at the end of the bar (6:23): skin that looks like skin and feels like metal, well toned, too
   large to be an elf despite the pointed ears, his arms covered in old, faded ink, on his chest a tattoo of spread,
   bat-like demon wings with an anatomical heart in the middle, scarred in several places ---- */
export function damascusSteel() {
  const skin = '#c8967a', ink = '#6c7a88';
  const v = person({ skin, hair: { color: PLAIN_HAIR, style: 'short' }, top: twin(skin), sleeves: 'none', bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 79 });
  for (const x of [-1, 8]) { v.set(x, 4, 18, skin); v.set(x, 4, 19, skin); v.set(x, 3, 20, skin); }        // pointed ears
  for (const [x, y, z] of [[0, 5, 12], [0, 4, 11], [0, 5, 10], [0, 3, 13], [7, 5, 11], [7, 4, 13], [7, 3, 10], [7, 5, 13], [0, 3, 10]] as const) v.set(x, y, z, ink);   // the faded ink
  v.box(1, 7, 12, 2, 7, 13, '#2a2430'); v.box(5, 7, 12, 6, 7, 13, '#2a2430'); v.set(1, 7, 11, '#2a2430'); v.set(6, 7, 11, '#2a2430');   // the wings
  v.box(3, 7, 11, 4, 7, 12, '#a8242a'); v.set(3, 7, 13, '#a8242a');                                         // the heart
  for (const [x, y, z] of [[5, 7, 10], [2, 7, 10], [1, 7, 15], [6, 7, 16]] as const) v.set(x, y, z, '#e3bba4');   // scars
  return v;
}

/* ---- the adjutant (6:36): a very angry-looking female orc of the same wild boar breed as the Skull Empire's
   princes, her nostrils flared, an hourglass carved onto one of her tusks ---- */
export function baronessVictory() {
  const v = new Vox(), hide = '#4f3a32', bristle = '#141012';
  base(v, 'stoneDark', 'stone', 80);
  v.chunk = 0;
  head(v, hide);
  v.box(0, 0, H1 - 1, 7, 7, H1 + 1, bristle); v.box(0, 0, H0, 7, 1, H1, bristle);
  for (const [x, y] of [[1, 2], [3, 4], [5, 1], [6, 5], [2, 6]] as const) v.set(x, y, H1 + 2, bristle);
  v.box(-1, 3, H1 - 2, -1, 4, H1, hide); v.box(8, 3, H1 - 2, 8, 4, H1, hide);                          // ears
  v.box(2, 8, H0 + 1, 5, 9, H0 + 3, twin(hide)); v.box(2, 10, H0 + 2, 2, 10, H0 + 2, '#1b1714'); v.box(5, 10, H0 + 2, 5, 10, H0 + 2, '#1b1714');   // nostrils flared
  v.box(0, 8, H0, 1, 8, H0 + 2, 'bone'); v.set(1, 9, H0 + 2, 'bone'); v.set(0, 8, H0 + 1, '#6a5a44'); v.set(1, 8, H0 + 1, '#8a7a60');   // the carved tusk
  v.box(6, 8, H0, 6, 8, H0 + 2, 'bone'); v.set(6, 9, H0 + 2, 'bone');
  v.set(1, 7, H0 + 4, 'black'); v.set(6, 7, H0 + 4, 'black');
  v.box(0, 7, H0 + 5, 2, 7, H0 + 5, bristle); v.box(5, 7, H0 + 5, 7, 7, H0 + 5, bristle); v.set(2, 7, H0 + 6, hide); v.set(5, 7, H0 + 6, hide);   // brows down hard
  body(v, { top: PLAIN_TOP, skin: hide, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES });
  return v;
}

/* ---- the old dancer (6:23): human, about seventy and jacked, shiny with oil, a long white beard, a conquistador's
   helmet, little spandex shorts and an open vest. Mounted at last (7:63): astride the swamp yak that was the orc
   king's, a cross between a hippopotamus and a yak (7:32), horned; his crust sock of nickels slung over his
   shoulder, a glowing, enormously long war lance upright in a sleeve off the saddle, a flag on its tip ---- */
function dongFigure() {
  const skin = '#d8a27a', vest = PLAIN_TOP;
  const fig = person({ skin, top: twin(skin), sleeves: 'none', bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, bare: true });
  fig.box(-1, 3, 10, -1, 5, 13, twin(skin)); fig.box(8, 3, 10, 8, 5, 13, twin(skin));                   // jacked
  fig.box(1, 2, 10, 2, 6, 13, vest); fig.box(5, 2, 10, 6, 6, 13, vest); fig.box(1, 2, 10, 6, 2, 13, vest);   // the open vest
  for (const [x, y, z] of [[-1, 5, 12], [8, 5, 11], [3, 6, 12]] as const) fig.set(x, y, z, '#f2caa6');     // oiled
  // the long white beard, over his chest
  fig.box(1, 8, H0, 6, 8, H0 + 2, 'white'); fig.box(2, 7, 10, 5, 7, 13, 'white'); fig.box(3, 7, 9, 4, 7, 9, 'white'); fig.box(2, 8, H0 + 2, 5, 8, H0 + 2, 'white');
  fig.set(0, 7, H0 + 3, 'white'); fig.set(7, 7, H0 + 3, 'white');
  // the conquistador's helmet: a dome with a crest, a brim turned up front and back
  fig.box(0, 0, H1 - 1, 7, 7, H1 + 1, 'metal'); fig.box(3, 0, H1 + 2, 4, 7, H1 + 3, 'metal'); fig.box(3, 2, H1 + 4, 4, 5, H1 + 4, 'metal');
  fig.box(-1, -1, H1 - 2, 8, 8, H1 - 2, 'metalDark'); fig.box(3, 9, H1 - 1, 4, 9, H1, 'metalDark'); fig.box(3, -2, H1 - 1, 4, -2, H1, 'metalDark');
  return fig;
}
export function dongQuixote(stage: 'vest' | 'mounted') {
  if (stage === 'vest') return grounded(dongFigure(), 81);
  const v = new Vox(), yak = '#5d5048', yakDark = '#463b34', saddle = '#5c3a20';
  wideBase(v, -3, 11, 82, -6, 11);
  copyInto(v, dongFigure(), 0, -1, 5);
  v.chunk = 0;
  // the swamp yak: a hippo's barrel of a body on short legs, a broad, blunt snout and a yak's horns
  rounded(v, -2, 9, -6, 6, 6, 12, yak); v.box(-1, -5, 12, 8, 5, 12, yak);
  for (const [x, y] of [[-1, -5], [6, -5], [-1, 4], [6, 4]] as const) v.box(x, y, 5, x + 2, y + 1, 7, yakDark);
  rounded(v, -1, 8, 6, 10, 6, 12, yak); v.box(0, 11, 6, 7, 11, 10, yakDark); v.set(1, 11, 9, 'black'); v.set(6, 11, 9, 'black');
  v.set(-1, 9, 11, 'black'); v.set(8, 9, 11, 'black');
  for (const [x, dx] of [[-1, -1], [8, 1]] as const) path(v, [[x, 8, 12], [x + dx, 8, 13], [x + dx * 2, 8, 15], [x + dx * 2, 9, 16]], 'bone');
  v.box(0, -4, 13, 7, 0, 13, saddle); v.box(0, -4, 14, 7, -4, 14, saddle);
  v.box(-3, 3, 8, -3, 5, 12, PLAIN_BOTTOM); v.box(10, 3, 8, 10, 5, 12, PLAIN_BOTTOM); v.box(-3, 4, 7, -3, 6, 7, PLAIN_SHOES); v.box(10, 4, 7, 10, 6, 7, PLAIN_SHOES);   // his legs either side
  // the lance, upright in its sleeve off the saddle, the flag at its tip
  v.box(10, -2, 7, 10, -1, 12, saddle); v.box(10, -2, 7, 10, -2, 28, 'rail'); v.set(10, -2, 29, 'white');
  v.box(10, -1, 24, 10, 3, 27, 'cloth'); v.box(10, 0, 25, 10, 2, 26, PLAIN_TOP);
  // the crust sock of nickels, slung over his shoulder
  path(v, [[7, 1, 18], [8, -1, 16], [8, -2, 13]], '#d9d1bd'); v.box(7, -3, 11, 8, -2, 13, '#b8ad92');
  return v;
}

/* ---- the club's otter (6:52): a short, weird little otter of a man, a water mage. He changes out of his usual
   lifeguard outfit into a leather vest and little red boots (7:5) ---- */
export function splashZone(stage: 'otter' | 'vest') {
  const v = new Vox(), fur = '#5c3f26', pale = '#c9a77e', vest = stage === 'vest';
  base(v, 'stoneDark', 'stone', 83);
  v.chunk = 0;
  // a flat, broad otter's head: rounded over the top, a pale lower face and a wide muzzle, tiny ears
  rounded(v, 0, 7, 0, 7, 14, 20, fur);
  v.box(0, 7, 14, 7, 7, 16, pale); v.box(1, 8, 14, 6, 9, 16, pale); v.box(3, 10, 16, 4, 10, 16, 'black'); v.box(2, 9, 14, 5, 9, 14, twin(pale));
  for (const x of [0, 7]) { v.set(x, 9, 15, 'white'); v.set(x, 9, 16, 'white'); }                         // whiskers
  eyes(v, 'black', 17, [2, 5], 2);
  for (const x of [0, 7]) v.set(x, 3, 20, twin(fur));                                                    // tiny ears, round
  body(v, { top: twin(fur), skin: fur, bottom: twin(fur), legs: fur, feet: vest ? '#c22a22' : twin(fur) });
  v.box(2, 7, 9, 5, 7, 13, pale);                                                                          // the pale chest
  // the tail, long and thick, tapering off behind him and round to the side
  v.box(3, 0, 6, 5, 1, 8, fur); v.box(5, -2, 5, 6, -1, 7, fur); v.box(7, -3, 5, 8, -2, 6, fur); v.box(9, -4, 5, 9, -3, 5, fur); v.set(10, -5, 5, twin(fur));
  if (vest) {
    const leather = '#3b2a1e';
    v.box(1, 2, 10, 1, 7, 13, leather); v.box(6, 2, 10, 6, 7, 13, leather); v.box(1, 1, 10, 6, 1, 13, leather);
    v.box(1, 3, 6, 2, 7, 6, '#c22a22'); v.box(5, 3, 6, 6, 7, 6, '#c22a22');                                // the red boots, up the ankle
  }
  return shorter(v, 7);
}

/* ---- the half-mantaur, as he waves from his garage (8:13): a mantaur, half man and half man, cut in half down the
   middle from between his eyes to his groin, standing on his one right leg with a right arm and a second right arm
   above it, the whole of him and his half a head in an all-black gimp suit of shiny vinyl, a zipper at the mouth.
   Made whole again (8:66): a naked mantaur with a bright red, jagged scar down the middle of his face and chest, the
   halves not perfectly aligned and bulging along the seam, a mullet, and a scarf round his neck, the only thing on
   him ---- */
function mantaur(v: Vox, skin: string, x0: number, x1: number, dz: number, ink: string) {
  const at = (bx0: number, by0: number, bz0: number, bx1: number, by1: number, bz1: number, m: string) => {
    for (let x = Math.max(bx0, x0); x <= Math.min(bx1, x1); x++) for (let y = by0; y <= by1; y++) for (let z = bz0; z <= bz1; z++) v.set(x, y, z + dz, m);
  };
  const limb = twin(skin);
  at(1, 3, 5, 2, 7, 5, limb); at(5, 3, 5, 6, 7, 5, limb); at(1, 3, 6, 2, 5, 8, limb); at(5, 3, 6, 6, 5, 8, limb);   // legs
  at(1, 2, 9, 6, 6, 13, skin);                                                                           // the lower man
  at(0, 3, 10, 0, 5, 13, limb); at(7, 3, 10, 7, 5, 13, limb); at(0, 4, 9, 0, 5, 9, limb); at(7, 4, 9, 7, 5, 9, limb);   // the lower arms
  at(1, 2, 14, 6, 6, 18, twin(limb));                                                                    // the upper man, out of his shoulders
  at(0, 3, 15, 0, 5, 18, limb); at(7, 3, 15, 7, 5, 18, limb); at(0, 4, 14, 0, 5, 14, limb); at(7, 4, 14, 7, 5, 14, limb);   // the upper arms
  at(0, 0, 19, 7, 7, 26, skin);                                                                          // the head
  at(2, 7, 22, 2, 7, 23, ink); at(5, 7, 22, 5, 7, 23, ink);                                              // eyes
}
export function corcunda(stage: 'gimp' | 'whole') {
  const v = new Vox();
  base(v, 'stoneDark', 'stone', 84);
  v.chunk = 0;
  if (stage === 'gimp') {
    const suit = '#2a2730';
    mantaur(v, suit, 4, 7, 0, 'black');
    v.set(5, 7, 22, '#3a3640'); v.set(5, 7, 23, 'black');                                                 // the one eye
    v.box(4, 7, 20, 6, 7, 20, 'rail'); v.set(6, 7, 21, 'rail');                                          // the zipper at the mouth
    // the upper of his two right hands, raised in a wave
    v.clear(7, 3, 14, 7, 5, 18); v.box(7, 4, 17, 7, 5, 18, twin(suit)); v.box(8, 4, 18, 8, 5, 24, twin(suit)); v.box(8, 4, 25, 8, 6, 26, suit);
    for (const [x, y, z] of [[4, 7, 25], [5, 6, 16], [7, 5, 11], [6, 6, 12], [8, 5, 21], [4, 6, 9], [6, 6, 7]] as const) v.set(x, y, z, '#625c70');   // the vinyl's shine
    return v;
  }
  const skin = '#d9a684', scar = '#d0261e';
  mantaur(v, skin, 0, 3, 0, 'black'); mantaur(v, skin, 4, 7, 1, 'black');                              // the halves, a block out of true
  for (let z = 9; z <= 26; z++) v.set(z % 2 ? 3 : 4, z >= 19 ? 7 : 6, z + (z % 2 ? 0 : 1), scar);    // the jagged scar down the middle
  for (const z of [11, 16]) v.set(4, 7, z + 1, twin(skin));                                              // bulges at the seam
  v.box(0, 0, 26, 7, 7, 27, PLAIN_HAIR); v.box(0, -1, 18, 7, -1, 26, PLAIN_HAIR); v.box(0, 0, 21, 0, 2, 25, PLAIN_HAIR); v.box(7, 0, 22, 7, 2, 26, PLAIN_HAIR);   // the mullet
  v.box(0, 1, 18, 7, 7, 18, PLAIN_TOP); v.box(5, 7, 14, 6, 7, 17, PLAIN_TOP);                            // the scarf
  return v;
}

/* ---- the barbarian (7:8): a large human with a shock of blond hair and arms that look as if they could bend steel.
   Later a large bearded man (8:14), with a giant battle-axe in each hand (8:63) ---- */
export function jurgen(stage: 'blond' | 'axes') {
  const skin = '#ecc3a0', hair = '#e6c65e';
  const fig = person({ skin, hair: { color: hair, style: 'messy' }, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, bare: true });
  fig.box(-1, 3, 10, -1, 5, 13, twin(PLAIN_TOP)); fig.box(8, 3, 10, 8, 5, 13, twin(PLAIN_TOP)); fig.box(-1, 4, 9, -1, 5, 9, twin(skin)); fig.box(8, 4, 9, 8, 5, 9, twin(skin));   // the arms
  for (const [x, y] of [[2, 3], [4, 5], [6, 2], [1, 6], [3, 1]] as const) fig.box(x, y, H1 + 1, x, y, H1 + 2, hair);   // the shock of it
  if (stage === 'axes') {
    fig.box(1, 7, H0, 6, 7, H0 + 1, PLAIN_HAIR); fig.box(2, 8, H0 - 1, 5, 8, H0 + 1, PLAIN_HAIR); fig.box(3, 8, H0 - 2, 4, 8, H0 - 2, PLAIN_HAIR);   // the beard
    for (const [x, dx] of [[-1, -1], [8, 1]] as const) {
      fig.box(x, 6, 7, x, 6, 18, 'woodDark');
      fig.box(x + dx, 5, 14, x + dx * 2, 7, 18, 'metal'); fig.box(x + dx * 3, 4, 13, x + dx * 3, 8, 19, 'rail');
    }
  }
  return grounded(taller(fig, 7), 85);
}

/* ---- the coin kid at the club (6:23): a skinny, young crocodilian in a club t-shirt, scrambling about with a bucket
   almost full of gold ---- */
export function bucketBoy() {
  const v = new Vox(), scale = '#5a6b3c', belly = '#8a9a5e';
  base(v, 'stoneDark', 'stone', 86);
  v.chunk = 0;
  v.box(0, 0, 14, 7, 7, 20, scale);
  v.box(1, 8, 14, 6, 12, 16, twin(scale)); v.box(1, 8, 14, 6, 12, 14, belly);                               // the long snout
  for (const x of [1, 6]) for (const y of [9, 11]) v.set(x, y, 15, 'bone');                                // teeth along it
  v.set(2, 12, 17, 'black'); v.set(5, 12, 17, 'black');                                                     // nostrils
  for (const x of [1, 5]) { v.box(x, 5, 21, x + 1, 6, 21, scale); v.set(x + (x < 4 ? 0 : 1), 7, 20, 'black'); }   // eyes up on top
  for (const [x, y] of [[2, 2], [5, 3], [3, 0]] as const) v.set(x, y, 21, twin(scale));
  body(v, { top: PLAIN_TOP, skin: scale, bottom: PLAIN_BOTTOM, legs: scale, feet: scale });
  v.box(3, 0, 7, 4, 1, 8, scale); v.box(3, -2, 5, 4, -1, 6, scale); v.box(3, -3, 5, 4, -3, 5, twin(scale));   // the tail
  // the bucket of gold
  for (let x = 8; x <= 11; x++) for (let y = 3; y <= 6; y++) for (let z = 6; z <= 9; z++) if (x === 8 || x === 11 || y === 3 || y === 6 || z === 6) v.set(x, y, z, 'metal');
  v.box(9, 4, 9, 10, 5, 9, 'accent'); v.set(9, 4, 10, 'accent'); v.set(10, 5, 10, 'accentGlow');
  v.box(8, 4, 10, 8, 5, 10, 'metalDark');
  return v;
}

/* ---- the fugitive (6:5): Hispanic, in his mid-thirties, a well-muscled bald man in a leather jacket with knee-high
   boots and a black cape, completely covered in old prison tattoos, even on his face, dark eyes; a crossbow like
   Katia's, an open-mouthed creature on its front ---- */
export function anton() {
  const skin = '#b98160', ink = '#3f4c5a', jacket = '#2f2620', boots = '#211b17';
  const v = person({ skin, top: jacket, bottom: PLAIN_BOTTOM, legs: boots, feet: boots, cape: '#1b1714', seed: 87 });
  // the ink: over the scalp, down the face and the neck, on the hands
  v.box(1, 1, 21, 3, 3, 21, ink); v.box(4, 4, 21, 6, 6, 21, ink); v.box(2, 5, 21, 3, 6, 21, ink); v.set(5, 2, 21, ink); v.box(0, 1, 18, 0, 3, 20, ink); v.box(7, 1, 18, 7, 3, 20, ink);
  v.box(0, 7, 15, 1, 7, 16, ink); v.box(6, 7, 16, 7, 7, 17, ink); v.set(2, 7, 16, ink); v.box(3, 7, 20, 4, 7, 20, ink); v.box(2, 7, 14, 5, 7, 14, ink);
  v.set(0, 4, 9, ink); v.set(7, 5, 9, ink);
  // the crossbow, held level in the right hand
  v.box(8, 3, 10, 8, 9, 10, 'woodDark'); v.box(7, 9, 10, 9, 9, 10, 'metalDark'); v.set(7, 8, 11, 'metalDark'); v.set(9, 8, 11, 'metalDark');
  v.set(8, 10, 10, '#2a1d18'); v.set(8, 10, 11, '#5c3a20');
  return v;
}

/* ---- the club's hairy muscle man (6:52): short, hairy all over, punching things with twin war gauntlets. At the
   wheel (8:30): in his usual outfit, nothing but a Speedo, a hockey helmet off the discard pile, eyes gone red ---- */
export function gluteusMaxx(stage: 'gauntlets' | 'speedo') {
  const skin = '#d4a17e', hair = PLAIN_HAIR, speedo = stage === 'speedo';
  const fig = person({ skin, hair: { color: hair, style: 'short' }, eyes: speedo ? '#d0302a' : 'black', top: twin(skin), sleeves: 'none', bottom: PLAIN_BOTTOM, feet: twin(skin), bare: true });
  fig.box(-1, 3, 10, -1, 5, 13, twin(skin)); fig.box(8, 3, 10, 8, 5, 13, twin(skin));                    // muscle
  // hair all over: a mat of it on the chest and down the belly, on the arms and the legs
  fig.box(2, 6, 11, 5, 6, 13, hair); fig.box(3, 6, 9, 4, 6, 10, hair);
  fig.box(-1, 4, 11, -1, 5, 13, hair); fig.box(8, 4, 11, 8, 5, 13, hair); fig.box(1, 5, 6, 2, 5, 7, hair); fig.box(5, 5, 6, 6, 5, 7, hair);
  if (speedo) {
    fig.box(1, 2, 8, 6, 6, 8, PLAIN_BOTTOM); fig.box(1, 2, 9, 6, 6, 9, twin(skin)); fig.set(3, 6, 9, hair); fig.set(4, 6, 9, hair);
    fig.box(0, 0, H1 - 1, 7, 7, H1 + 1, PLAIN_TOP); fig.box(0, 0, H0 + 4, 0, 7, H1, PLAIN_TOP); fig.box(7, 0, H0 + 4, 7, 7, H1, PLAIN_TOP); fig.box(0, 0, H0 + 2, 7, 0, H1, PLAIN_TOP);   // the hockey helmet
  } else {
    for (const x0 of [-2, 7]) { fig.box(x0, 4, 8, x0 + 2, 7, 10, 'metal'); fig.set(x0 + 1, 8, 10, 'metalDark'); fig.set(x0 + 1, 8, 8, 'metalDark'); fig.box(x0, 3, 11, x0 + 2, 6, 11, 'metalDark'); }   // the war gauntlets
  }
  return grounded(shorter(fig, 7), 88);
}

/* ---- a monk seal of the coast (6:6): a gray, slick seal, six or seven feet long, rearing up on its tail with its
   little flippers going, shouting. On the card he wears a white headband with red hearts (6:9) ---- */
export function geraldo(stage: 'seal' | 'headband') {
  const v = new Vox(), gray = '#7c8188', pale = '#9aa0a6';
  base(v, 'stoneDark', 'stone', 89);
  v.chunk = 0;
  blob(v, 3.5, 3.5, 10.5, 3.8, 3.4, 5.6, (x, y) => (y >= 6 ? pale : gray));                        // the body, reared up
  v.box(1, -1, 5, 6, 1, 6, gray); v.box(0, -3, 5, 2, -2, 5, twin(gray)); v.box(5, -3, 5, 7, -2, 5, twin(gray));   // the tail flippers
  blob(v, 3.5, 4.5, 18, 3.4, 3.2, 3.2, gray);                                                        // the head
  v.box(2, 8, 16, 5, 8, 17, pale); v.set(3, 9, 17, 'black'); v.set(4, 9, 17, 'black');               // muzzle and nose
  for (const x of [1, 6]) v.set(x, 9, 16, 'white');                                                  // whiskers
  v.box(1, 7, 19, 1, 7, 19, 'black'); v.box(6, 7, 19, 6, 7, 19, 'black');
  // the little flippers, up and going
  v.box(-1, 4, 10, -1, 6, 12, twin(gray)); v.box(-2, 5, 12, -2, 7, 13, twin(gray)); v.box(8, 4, 10, 8, 6, 12, twin(gray)); v.box(9, 5, 12, 9, 7, 13, twin(gray));
  if (stage === 'headband') {
    // round the brow, on the head's own skin: white, with red hearts
    const ring: P3[] = [];
    for (let x = -1; x <= 8; x++) for (let y = 0; y <= 9; y++) if (v.get(x, y, 19) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !v.get(x + dx, y + dy, 19))) ring.push([x, y, 19]);
    for (const [x, y, z] of ring) v.set(x, y, z, (x * 3 + y) % 5 === 0 ? '#d0303a' : 'white');
    v.set(-1, 3, 18, 'white'); v.set(-1, 2, 17, 'white');                                              // the knot's tails
  }
  return v;
}

/* ---- the Shadow Boxer liaison (6:12): a massive, hairy goat creature standing on two cloven hooves, a line of red,
   bug-like eyes down its evil face, tall and shaggy, a pair of horns curled on its head; tall enough to push a horn
   through the ceiling ---- */
export function harbinger() {
  const v = new Vox(), fur = '#544c46', shag = '#463f3a', horn = '#b8ad96', red = '#e0302a';
  base(v, 'stoneDark', 'stone', 90);
  v.chunk = 0;
  for (const x of [1, 5]) { v.box(x, 3, 6, x + 1, 5, 10, shag); v.box(x, 4, 5, x + 1, 6, 5, 'black'); v.set(x, 6, 5, null); }   // the legs and the cloven hooves
  v.box(1, 2, 11, 6, 6, 17, fur); for (let x = 1; x <= 6; x++) v.set(x, 6 + (x % 2), 11, shag);           // the shaggy body
  v.box(0, 3, 12, 0, 5, 17, shag); v.box(7, 3, 12, 7, 5, 17, shag); v.box(0, 4, 11, 0, 5, 11, 'black'); v.box(7, 4, 11, 7, 5, 11, 'black');
  for (const x of [0, 7]) v.set(x, 5, 10, shag);
  // the long face, the snout forward, and the line of red eyes down it
  v.box(1, 1, 18, 6, 6, 25, fur); v.box(2, 7, 18, 5, 9, 22, fur); v.box(2, 10, 18, 5, 10, 19, '#2b2624');
  for (const [z, y] of [[24, 7], [22, 10], [20, 10]] as const) { v.set(3, y, z, red); v.set(4, y, z, red); }
  v.set(3, 7, 23, fur); v.box(3, 8, 23, 4, 9, 23, fur); v.set(2, 7, 24, red); v.set(5, 7, 24, red);
  v.box(1, 6, 18, 1, 7, 18, shag); v.box(6, 6, 18, 6, 7, 18, shag);
  // the horns, curled
  for (const [x, dx] of [[1, -1], [6, 1]] as const) path(v, [[x, 3, 26], [x, 1, 26], [x + dx, -1, 26], [x + dx * 2, -1, 24], [x + dx * 2, 1, 23], [x + dx, 2, 23]], horn);
  return shorter(v, 16);
}

/* ---- the sponsor driving a goddess, seen as she really is (6:17): an alien about five feet tall, covered in coarse
   blue and black hairs, bipedal, six black eyes in a V on a bug-like face, four arms with three fingers each, a long,
   thin neck her head looks ready to tumble off, a thin body but for a belly that makes her look very pregnant; a
   blood-red toga and a laurel leaf on her head. Torn out of the goddess (8:86): nothing on but a long, white
   undershirt ---- */
export function huanxinJinx(stage: 'toga' | 'undershirt') {
  const v = new Vox(), blue = '#2c4a86', face = '#5a80c4', black = '#15151b', toga = stage === 'toga';
  const cloth = toga ? '#9a1420' : 'white';
  base(v, 'stoneDark', 'stone', 91);
  v.chunk = 0;
  for (const x of [2, 5]) { v.box(x, 3, 5, x, 5, 9, black); v.box(x, 4, 5, x, 6, 5, black); }            // thin legs
  v.box(2, 3, 10, 5, 5, 14, blue); v.box(2, 2, 11, 5, 2, 14, black);                                     // a thin body
  blob(v, 3.5, 6, 10.5, 2.4, 1.8, 2.2, blue);                                                             // the belly
  // four arms, three fingers on each: an upper pair raised out from the shoulders, a lower pair hanging
  for (const [x, dx] of [[1, -1], [6, 1]] as const) {
    path(v, [[x, 4, 14], [x + dx * 2, 4, 15], [x + dx * 3, 5, 17]], black);
    for (const y of [5, 6, 7]) v.set(x + dx * 3, y, 18, blue);
    path(v, [[x, 4, 12], [x + dx, 4, 11], [x + dx, 4, 9]], black);
    for (const y of [4, 5, 6]) v.set(x + dx, y, 8, blue);
  }
  v.box(3, 3, 15, 4, 4, 17, black);                                                                       // the long, thin neck
  v.box(0, 0, 18, 7, 6, 24, blue); v.box(0, 0, 24, 7, 6, 24, black); v.box(0, 0, 18, 7, 1, 24, black); v.box(0, 0, 21, 0, 2, 24, black); v.box(7, 0, 21, 7, 2, 24, black);   // the head
  v.box(1, 7, 18, 6, 7, 23, face); v.box(3, 8, 18, 4, 8, 19, black);                                      // the bug-like face, mouthparts
  for (const [x, z] of [[1, 23], [2, 22], [3, 21], [6, 23], [5, 22], [4, 21]] as const) v.set(x, 7, z, 'black');   // six eyes in a V
  // the toga (or the undershirt), from one shoulder to the knee
  v.box(2, 2, 7, 5, 6, 10, cloth); v.box(2, 7, 8, 5, 7, 10, cloth); v.box(2, 6, 11, 5, 6, 12, cloth);
  blob(v, 3.5, 6, 10.5, 2.6, 2, 2.4, cloth);
  if (toga) { for (let z = 10; z <= 14; z++) v.set(2 + Math.floor((14 - z) * 0.8), 6, z, cloth); v.box(5, 2, 13, 5, 6, 14, cloth);
    for (const [x, y] of [[0, 3], [0, 5], [1, 7], [3, 7], [6, 7], [7, 5], [7, 3], [2, 0], [5, 0]] as const) v.set(x, y, 25, 'leaf');   // the laurel
    v.set(0, 7, 24, 'leafLight'); v.set(7, 7, 24, 'leafLight');
  } else v.box(2, 3, 11, 5, 6, 14, cloth);
  return v;
}

/* ---- the card's anime saviour (6:22), as he lands (6:28): a ridiculously good-looking man with long, flowing brown
   hair, barefoot, in a white robe with a red sash, a golden halo floating over his head, firing an uzi. Risen
   again as the gold edition (6:58): his whole body glowing with golden light, a gold-plated uzi in each hand ---- */
export function uziJesus(stage: 'robe' | 'gold') {
  const skin = '#efcfb2', gold = stage === 'gold';
  const fig = person({ skin, hair: { color: '#6a4628', style: 'long' }, top: gold ? '#f4e8c0' : 'white', outfit: 'robe', bottom: gold ? '#f4e8c0' : 'white', feet: null, bare: true });
  for (let i = 0; i < 4; i++) fig.set(1 + i, 7, 13 - i, '#b3262a');                                    // the sash
  fig.set(5, 7, 9, '#b3262a'); fig.box(6, 6, 8, 6, 7, 9, '#b3262a');
  const halo = gold ? 'accentGlow' : 'accent';
  for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) if (x === 1 || x === 6 || y === 1 || y === 6) fig.set(x, y, H1 + 3, halo);   // the halo
  const uzi = (x: number, m: string) => { fig.box(x, 5, 9, x, 8, 10, m); fig.set(x, 6, 8, m); fig.set(x, 9, 10, 'metalDark'); };
  uzi(8, gold ? 'accent' : 'metalDark');
  if (!gold) return grounded(fig, 92);
  uzi(-1, 'accent');
  const v = grounded(fig, 92);
  for (const [x, y, z] of [[-2, 2, 15], [9, 3, 18], [-1, 7, 21], [8, 0, 22], [2, 9, 6], [6, -1, 8], [10, 6, 12], [-3, 5, 10]] as const) v.set(x, y, z, 'accentGlow');
  return v;
}

/* ---- the club's announcer and disc jockey (6:23, named as hired at 6:34): a skeleton in a golden, glinting crown ---- */
export function doctorBones() {
  const v = new Vox(), b = 'bone', b2 = '#d6ccb2', gap = '#2a2420';
  base(v, 'stoneDark', 'stone', 93);
  v.chunk = 0;
  v.box(0, 0, 14, 7, 7, 21, b);                                                                   // the skull
  v.box(1, 7, 17, 2, 7, 18, gap); v.box(5, 7, 17, 6, 7, 18, gap); v.box(3, 7, 16, 4, 7, 16, gap);   // sockets and nose
  v.box(1, 7, 14, 6, 7, 15, b2); for (const x of [1, 3, 5]) v.set(x, 7, 15, gap); v.box(1, 7, 14, 6, 7, 14, gap); v.box(2, 6, 14, 5, 6, 14, gap);   // the teeth
  v.box(3, 3, 8, 4, 4, 13, b2);                                                                   // the spine
  for (const z of [10, 12]) { v.box(1, 2, z, 6, 6, z, b); v.clear(2, 3, z, 5, 5, z); v.box(3, 3, z, 4, 4, z, b2); }   // ribs
  v.box(1, 2, 13, 6, 6, 13, b); v.box(2, 3, 13, 5, 5, 13, b2);
  v.box(1, 3, 8, 6, 5, 9, b);  v.box(3, 5, 8, 4, 5, 9, gap);                                       // the pelvis
  for (const x of [0, 7]) { v.box(x, 4, 9, x, 4, 13, b2); v.box(x, 4, 8, x, 5, 8, b); }            // arms, hands
  for (const x of [2, 5]) { v.box(x, 4, 6, x, 4, 7, b2); v.box(x - (x < 4 ? 1 : 0), 4, 5, x + (x < 4 ? 0 : 1), 6, 5, b); }   // legs, feet
  // the golden crown, glinting
  v.box(1, 1, 22, 6, 6, 22, 'accent');
  for (const [x, y] of [[1, 1], [6, 1], [1, 6], [6, 6], [3, 6], [6, 3], [1, 3], [3, 1]] as const) v.set(x, y, 23, 'accent');
  v.set(3, 6, 22, 'accentGlow'); v.set(6, 6, 23, 'accentGlow');
  return v;
}

/* ---- the Santero (6:5): Hispanic, mid-thirties, in glowing silver plate armour head to toe, its metal boots
   platforms that give him seven or eight inches, his head sticking out of the breastplate like a man poking his
   head out of a tank, a backwards baseball cap and a wide-eyed, scared look. Smote by his god (6:16): the god's
   handprint burned sideways across his face, red muscle and the white of his teeth showing, as he stands again on
   the card (6:56) ---- */
export function paz(stage: 'plate' | 'burned') {
  const skin = '#c08a62', plate = 'rail', joint = 'metal';
  const fig = person({ skin, top: plate, bottom: plate, legs: plate, feet: joint, bare: true });
  fig.box(-1, 1, 10, 8, 7, 14, plate); fig.box(0, 2, 15, 7, 6, 15, plate);                              // the breastplate, up to the chin
  fig.box(-1, 3, 9, -1, 5, 13, joint); fig.box(8, 3, 9, 8, 5, 13, joint); fig.box(-1, 4, 8, -1, 5, 8, plate); fig.box(8, 4, 8, 8, 5, 8, plate);
  fig.box(1, 7, 11, 6, 7, 12, 'white'); fig.box(1, 1, 8, 6, 6, 9, joint);
  // the backwards cap
  fig.box(0, 0, H1, 7, 7, H1 + 1, PLAIN_TOP); fig.box(1, -2, H1, 6, -1, H1, twin(PLAIN_TOP));
  // wide, scared eyes
  fig.box(1, 7, 17, 1, 7, 18, 'white'); fig.box(6, 7, 17, 6, 7, 18, 'white'); fig.set(3, 7, 15, '#3a2420'); fig.set(4, 7, 15, '#3a2420');
  if (stage === 'burned') {
    const raw = '#8e2a22';
    fig.box(0, 7, 15, 2, 7, 19, raw); fig.box(3, 7, 17, 4, 7, 17, raw); fig.box(3, 7, 19, 5, 7, 19, raw); fig.set(0, 7, 20, raw);   // the handprint, sideways
    fig.box(1, 7, 15, 2, 7, 15, 'bone'); fig.set(0, 7, 17, 'bone');                                    // teeth, and bone
    fig.set(1, 7, 17, 'white'); fig.set(2, 7, 17, 'black');
  }
  return grounded(taller(fig, 5, 2), 94);
}

/* ---- the river mother (6:17): a stunningly beautiful, dark-skinned mermaid rising from her fountain, neck gills,
   pointed ears and large eyes, topless, split at the waist into two bodies, or tails, just like the coffee logo ---- */
export function yemaya() {
  const v = new Vox(), skin = '#6a4530', tail = PLAIN_BOTTOM;
  wideBase(v, -5, 12, 95, -2, 10);
  v.chunk = 0;
  // the marble fountain, bubbling
  for (let x = -3; x <= 10; x++) for (let y = -1; y <= 9; y++) { const d = Math.hypot((x - 3.5) / 6.4, (y - 4) / 5); if (d <= 1) v.set(x, y, 5, d > 0.82 ? 'tile' : 'water'); if (d > 0.82 && d <= 1) v.set(x, y, 6, 'tile'); }
  for (const [x, y] of [[0, 2], [6, 7], [1, 7], [7, 1], [4, 8]] as const) v.set(x, y, 6, 'white');
  // the two tails, out of her waist either side and up beside her, a fluke at the top of each, as on the logo
  for (const [x, dx] of [[-2, -1], [9, 1]] as const) {
    v.box(dx < 0 ? -1 : 7, 4, 8, dx < 0 ? 1 : 8, 6, 9, tail); v.box(x, 4, 7, x, 6, 9, tail);
    v.box(x, 5, 10, x, 6, 15, tail); v.set(x, 7, 12, twin(tail)); v.set(x, 7, 14, twin(tail));
    v.box(x - 1, 5, 16, x + 1, 6, 16, twin(tail)); v.box(x - 1, 5, 17, x - 1, 6, 18, twin(tail)); v.box(x + 1, 5, 17, x + 1, 6, 18, twin(tail));
    v.box(dx < 0 ? -1 : 8, 5, 11, dx < 0 ? -1 : 8, 6, 11, twin(skin));                                    // her hands on them
  }
  v.box(1, 2, 8, 6, 6, 9, tail);
  const fig = person({ skin, hair: { color: PLAIN_HAIR, style: 'long' }, top: twin(skin), sleeves: 'none', bottom: tail, bare: true });
  for (let z = 5; z <= 7; z++) fig.clear(-2, -2, z, 9, 9, z);
  fig.clear(1, 2, 8, 6, 6, 9);
  fig.box(1, 7, 17, 2, 7, 18, 'black'); fig.box(5, 7, 17, 6, 7, 18, 'black'); fig.set(1, 7, 18, 'white'); fig.set(5, 7, 18, 'white');   // large eyes
  for (const x of [-1, 8]) { fig.set(x, 4, 17, skin); fig.set(x, 4, 18, skin); fig.set(x, 3, 19, skin); }   // pointed ears
  for (const x of [0, 7]) fig.box(x, 5, 14, x, 6, 15, '#3e2618');                                        // the gills at her neck
  fig.box(1, 0, 9, 6, 0, 13, PLAIN_HAIR);                                                                 // the hair, down her back
  copyInto(v, fig);
  return v;
}

/* ---- Carl's half-brother in his father's last summer (6:45): a small boy of about six with his father's nose, his
   eyes and his hair, and so Carl's; a matchbox car in his hand ---- */
export function asher() {
  const fig = person({ skin: '#e3a77c', hair: { color: '#3b2517', style: 'messy' }, top: PLAIN_TOP, sleeves: 'short', bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, bare: true });
  fig.box(8, 4, 8, 8, 7, 9, 'metal'); fig.set(8, 4, 7, 'black'); fig.set(8, 7, 7, 'black'); fig.box(8, 5, 10, 8, 6, 10, 'glassTeal');   // the matchbox car
  return grounded(shorter(fig, 7, 12), 96);
}

/* ---- the Reavers' warlord: at the table (6:21) a square-headed, old-school robot out of a sixties science fiction
   film, rattling up and down as if it ran on a diesel engine. At the next table (7:42) a slight, wide-eyed, thin
   young man of about twenty, his skin a little too pink, in white underwear and a t-shirt ---- */
export function fang(stage: 'robot' | 'young-man') {
  if (stage === 'young-man') {
    const skin = '#f2aaa0';
    const v = person({ skin, hair: { color: PLAIN_HAIR, style: 'short' }, top: PLAIN_TOP, sleeves: 'short', bottom: 'white', legs: twin(skin), feet: PLAIN_SHOES, seed: 97 });
    v.box(1, 7, 17, 1, 7, 18, 'white'); v.box(6, 7, 17, 6, 7, 18, 'white');                               // wide-eyed
    return v;
  }
  const v = new Vox(), m = 'metal', d = 'metalDark';
  base(v, 'stoneDark', 'stone', 97);
  v.chunk = 0;
  for (const x of [1, 5]) { v.box(x, 3, 6, x + 1, 5, 8, d); v.box(x, 3, 5, x + 1, 7, 5, m); }             // blocky legs
  v.box(0, 1, 9, 7, 6, 14, m);                                                                            // a box of a body
  v.box(2, 7, 10, 5, 7, 13, d); v.set(2, 7, 12, 'red'); v.set(4, 7, 12, 'window'); v.set(3, 7, 10, 'rail'); v.set(5, 7, 11, 'portal');   // its dials
  for (const x of [-1, 8]) { v.box(x, 3, 10, x, 4, 14, d); v.set(x, 5, 10, m); v.set(x, 5, 9, m); v.set(x, 3, 9, m); }   // tube arms, pincers
  v.box(3, 3, 15, 4, 4, 15, d);
  v.box(-1, 0, 16, 8, 7, 23, m);                                                                          // the square head
  v.box(0, 8, 17, 7, 8, 21, d); v.set(2, 8, 20, 'black'); v.set(5, 8, 20, 'black'); v.box(2, 8, 18, 5, 8, 18, 'rail');   // its face plate
  for (const x of [-2, 9]) v.box(x, 3, 19, x, 4, 20, d);
  v.box(5, -1, 12, 5, -1, 19, d);                                                                         // the exhaust stack
  for (const [x, y, z] of [[5, -1, 21], [4, -2, 22], [6, -1, 23]] as const) v.set(x, y, z, 'mist');
  return v;
}

/* ---- the badger at number ten (6:8): a badger-headed porsuk, a swashbuckler, very serious ---- */
export function burcu() {
  const v = new Vox(), gray = '#8c8a86', white = '#ece8df', stripe = '#232226';
  base(v, 'stoneDark', 'stone', 98);
  v.chunk = 0;
  v.box(0, 0, 14, 7, 7, 21, gray);
  // the white face and the black stripes over the eyes to the ears, and the snout
  v.box(0, 7, 14, 7, 7, 21, white); v.box(1, 7, 16, 2, 7, 21, stripe); v.box(5, 7, 16, 6, 7, 21, stripe);
  v.box(1, 1, 21, 2, 6, 21, stripe); v.box(5, 1, 21, 6, 6, 21, stripe); v.box(3, 1, 21, 4, 6, 21, white);
  v.box(2, 8, 14, 5, 9, 16, white); v.box(3, 10, 15, 4, 10, 16, 'black');
  v.set(2, 7, 18, '#7a6a5a'); v.set(5, 7, 18, '#7a6a5a'); v.set(2, 7, 19, 'black'); v.set(5, 7, 19, 'black');
  for (const x of [0, 6]) { v.box(x, 2, 22, x + 1, 3, 22, gray); v.set(x === 0 ? 0 : 7, 3, 22, white); }   // small ears
  body(v, { top: PLAIN_TOP, skin: gray, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES });
  v.box(1, 7, 13, 6, 7, 13, PLAIN_TOP); v.box(2, 8, 13, 5, 8, 13, white);
  return v;
}

/* ---- the high cleric of the fire god (6:18): a Hobbledehoy, a small human, everything about him proportionally
   smaller, about four and a half feet, older, in long red robes, with long white hair, a wizard crossed with a
   hobbit ---- */
export function paterCoal() {
  const skin = '#e6b896', robe = '#a8261e';
  const fig = person({ skin, hair: { color: '#eeeae2', style: 'long' }, top: robe, outfit: 'robe', bottom: robe, feet: twin(robe), bare: true });
  fig.set(1, 7, 16, twin(skin)); fig.set(6, 7, 16, twin(skin)); fig.box(2, 7, 19, 5, 7, 19, twin(skin));   // older
  fig.box(0, 7, 10, 0, 7, 13, twin(robe)); fig.box(7, 7, 10, 7, 7, 13, twin(robe)); fig.box(-1, 3, 9, 0, 6, 10, robe); fig.box(7, 3, 9, 8, 6, 10, robe);   // wide sleeves
  return grounded(shorter(fig, 7), 99);
}

/* ---- the crab (6:24): a red Maníseros land crab, red and black and armoured, the size of a large pig, big red
   claws, sitting with them stretched out, meditating in a faint yellow glow ---- */
export function raul() {
  const v = new Vox(), red = '#c0281e', dark = '#1f1412';
  wideBase(v, -4, 11, 100, -2, 11);
  v.chunk = 0;
  blob(v, 3.5, 3.5, 9, 5, 4, 2.6, (x, y, z) => (z <= 7 || (x + y) % 9 === 0 ? dark : red));                    // the shell
  v.box(0, 8, 8, 7, 8, 9, red); v.box(2, 8, 7, 5, 8, 7, dark);
  for (const x of [2, 5]) { v.box(x, 7, 11, x, 7, 13, red); v.set(x, 7, 14, 'black'); v.set(x, 8, 14, '#f2d050'); }   // eyes on stalks
  // the legs, four a side, out and down
  for (const [i, y] of [[0, 0], [1, 2], [2, 4], [3, 6]] as const) for (const side of [-1, 1]) {
    const x0 = side < 0 ? -1 : 8;
    path(v, [[x0, y, 8], [x0 + side * 2, y - 1, 9], [x0 + side * 3, y - 1, 5]], i % 2 ? dark : red);
  }
  // the big claws, stretched out in front
  for (const [x, dx] of [[0, -1], [7, 1]] as const) {
    path(v, [[x, 7, 9], [x + dx * 2, 9, 10]], red);
    v.box(Math.min(x + dx * 1, x + dx * 4), 9, 9, Math.max(x + dx * 1, x + dx * 4), 11, 12, red);
    v.box(Math.min(x + dx * 2, x + dx * 4), 12, 11, Math.max(x + dx * 2, x + dx * 4), 13, 12, red); v.box(Math.min(x + dx * 2, x + dx * 4), 12, 9, Math.max(x + dx * 2, x + dx * 4), 12, 9, dark);
  }
  for (const [x, y, z] of [[-3, 2, 14], [10, 3, 15], [3, -2, 13], [1, 10, 16], [6, 9, 16], [-3, 6, 8], [10, 7, 9]] as const) v.set(x, y, z, 'accentGlow');   // the glow
  return v;
}

/* ---- the Yule Cat (6:41): a fat, hairy, dirty-brown Persian the size of a house, bigger than the spider, a moon
   face and giant yellow eyes, a candle as big as a garbage can burning on his head, its wax dripping into his fur ---- */
export function jola() {
  const v = new Vox(), fur = '#6e5a40', dark = '#58482f', pale = '#8a7556', wax = 'cloth';
  wideBase(v, -5, 12, 101, -2, 12);
  v.chunk = 0;
  const coat = (x: number, y: number, z: number) => (z <= 7 || (y <= 0 && z >= 9) ? dark : z >= 20 && y <= 4 ? dark : fur);
  rounded(v, -2, 9, -1, 8, 5, 13, coat);                                                     // the loaf of him
  rounded(v, -3, 10, 2, 10, 13, 21, coat);                                                   // the moon face
  v.box(-1, 10, 13, 8, 10, 15, pale); v.box(1, 11, 14, 6, 11, 15, pale);                     // the flat muzzle
  v.box(0, 10, 16, 2, 10, 18, '#f0c020'); v.box(5, 10, 16, 7, 10, 18, '#f0c020'); v.box(1, 10, 16, 1, 10, 18, 'black'); v.box(6, 10, 16, 6, 10, 18, 'black');   // giant yellow eyes
  v.box(3, 11, 15, 4, 11, 15, '#9a6a5a');
  for (const x of [-2, 8]) { v.box(x, 5, 21, x + 1, 7, 22, dark); v.set(x + (x < 0 ? 1 : 0), 7, 22, '#c98a80'); v.set(x + (x < 0 ? 0 : 1), 6, 23, dark); }   // small ears, low on the head
  for (const [x, z] of [[-3, 15], [10, 15], [-3, 17], [10, 17]] as const) v.box(x, 8, z, x, 10, z, pale);  // the ruff of his cheeks
  v.box(-1, 9, 5, 2, 10, 6, pale); v.box(5, 9, 5, 8, 10, 6, pale);                            // paws
  for (const [x, y, z] of [[10, 0, 5], [11, 1, 6], [11, 2, 7], [11, 3, 8], [11, 4, 8], [10, 5, 7], [10, 6, 6]] as const) v.box(x, y, z, x, y, z + 1, dark);   // the tail
  // the candle, burning, wax running into his fur
  v.box(1, 4, 22, 6, 8, 27, wax); v.box(2, 5, 28, 5, 7, 28, wax);
  for (const [x, y, z0] of [[1, 8, 21], [6, 6, 20], [3, 8, 20], [6, 4, 21]] as const) v.box(x, y, z0, x, y, 22, wax);
  v.box(3, 6, 29, 4, 6, 29, 'black'); v.box(3, 6, 30, 4, 6, 31, 'flame'); v.set(3, 6, 32, 'flame'); v.set(4, 6, 30, 'ember');
  return v;
}

/* ---- the Residual at the shelter (6:50-6:51): a homeless man at breakfast in the red hat with the flaps, a cup of
   coffee from the kitchen, an unlit cigarette rolling in his trembling fingers ---- */
export function paulie() {
  const skin = '#d9a885', hat = '#b3262a';
  const v = person({ skin, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 102 });
  v.set(1, 7, 16, twin(skin)); v.set(6, 7, 16, twin(skin));
  v.box(-1, -1, H1, 8, 8, H1 + 1, hat); v.box(0, 0, H1 + 2, 7, 7, H1 + 2, hat);                          // the red hat
  v.box(-1, 2, H0 + 2, -1, 5, H1, hat); v.box(8, 2, H0 + 2, 8, 5, H1, hat); v.box(0, -1, H0 + 3, 7, -1, H1, hat);   // its flaps
  v.box(0, 8, H1, 7, 8, H1, twin(hat));
  v.box(8, 5, 9, 8, 6, 11, 'white'); v.set(8, 6, 11, '#3a2418');                                         // the coffee
  v.box(-1, 5, 9, -1, 7, 9, 'white'); v.set(-1, 8, 9, '#c9a06a');                                         // the cigarette
  return v;
}

/* Every figure of the sixth book's cast, by character id and look. One character
   has no figure: the skyfowl brother of the prologue is only ever "the skyfowl"
   (an eagle-folk crawler), with nothing of his own to draw. */
export const BOOK6_FIGURES: Record<string, Record<string, () => Vox>> = {
  'shi-maria': { spider: shiMaria },
  tipid: { scar: tipid },
  'sister-ines': { trident: sisterInes },
  amayon: { serpent: () => amayon('serpent'), demon: () => amayon('demon') },
  ogun: { hammer: ogun },
  asojano: { reeds: () => asojano('reeds'), gold: () => asojano('gold') },
  rishi: { armor: () => rishi('armor'), armless: () => rishi('armless') },
  'damascus-steel': { ink: damascusSteel },
  'baroness-victory': { tusk: baronessVictory },
  'dong-quixote': { vest: () => dongQuixote('vest'), mounted: () => dongQuixote('mounted') },
  'splash-zone': { otter: () => splashZone('otter'), vest: () => splashZone('vest') },
  corcunda: { gimp: () => corcunda('gimp'), whole: () => corcunda('whole') },
  jurgen: { blond: () => jurgen('blond'), axes: () => jurgen('axes') },
  'bucket-boy': { bucket: bucketBoy },
  anton: { crossbow: anton },
  'gluteus-maxx': { gauntlets: () => gluteusMaxx('gauntlets'), speedo: () => gluteusMaxx('speedo') },
  geraldo: { seal: () => geraldo('seal'), headband: () => geraldo('headband') },
  harbinger: { goat: harbinger },
  'huanxin-jinx': { toga: () => huanxinJinx('toga'), undershirt: () => huanxinJinx('undershirt') },
  'uzi-jesus': { robe: () => uziJesus('robe'), gold: () => uziJesus('gold') },
  'doctor-bones': { crown: doctorBones },
  paz: { plate: () => paz('plate'), burned: () => paz('burned') },
  yemaya: { siren: yemaya },
  asher: { boy: asher },
  fang: { robot: () => fang('robot'), 'young-man': () => fang('young-man') },
  burcu: { badger: burcu },
  'pater-coal': { robes: paterCoal },
  raul: { crab: raul },
  jola: { candle: jola },
  paulie: { 'red-hat': paulie },
};
