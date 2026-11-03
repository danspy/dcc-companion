import { Vox } from '../vox.ts';
import { base, head, eyes, body, twin, person, copyInto, wideBase, floating, H0, H1,
         PLAIN_HAIR, PLAIN_TOP, PLAIN_BOTTOM, PLAIN_SHOES } from './parts.ts';

/* ---- the fifth floor's cast (book 4), one builder per character, one look per stretch of the story ----
   Drawn the way book 1's cast is: a chibi, dot eyes, one or two things that make them
   who they are, each look read off the edition at its own point and opening there.
   Where the book leaves a colour unsaid a figure takes a plain one. Shapes and colours
   only, never a name or a word. */

type Mat = string | ((x: number, y: number, z: number) => string | null);
const pick = (m: Mat, x: number, y: number, z: number) => (typeof m === 'string' ? m : m(x, y, z));
/** A box with its edges and corners shaved off, so it reads round. */
function round(v: Vox, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m: Mat) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const ex = x === x0 || x === x1, ey = y === y0 || y === y1, ez = z === z0 || z === z1;
    if ((ex && ey) || (ex && ez) || (ey && ez)) continue;
    const c = pick(m, x, y, z); if (c) v.set(x, y, z, c);
  }
}
/** An ellipsoid, optionally only where `keep` says. */
function blob(v: Vox, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, m: Mat, keep: (x: number, y: number, z: number) => boolean = () => true) {
  for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++)
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1 && keep(x, y, z)) { const c = pick(m, x, y, z); if (c) v.set(x, y, z, c); }
}
/** A copy of a figure with every voxel at or above `from` moved by dz, and those below it dropped (`drop`) or kept. */
function lifted(src: Vox, dz: number, from = 8, drop = true): Vox {
  const v = new Vox();
  for (const { p: [x, y, z], mat, chunk } of src.all()) {
    v.chunk = chunk;
    if (z >= from) v.set(x, y, z + dz, mat); else if (!drop) v.set(x, y, z, mat);
  }
  v.chunk = 0;
  return v;
}
/** A figure one block taller: the legs run a block longer and everything above them rides up. */
function tall(src: Vox): Vox {
  const v = new Vox();
  for (const { p: [x, y, z], mat, chunk } of src.all()) {
    v.chunk = chunk;
    if (z >= 8) v.set(x, y, z + 1, mat);
    else { v.set(x, y, z, mat); if (z === 7) v.set(x, y, 8, mat); }
  }
  v.chunk = 0;
  return v;
}
/** A round belly out over the belt. */
const belly = (v: Vox, m: string) => v.box(2, 7, 10, 5, 7, 12, m);

/* ---- the doll's head the withering spirit is stuck in (4:24): latex, mouth stuck open, eyes wide, hooker-tier
   makeup, two fangs, a full head of bone-white, silky hair, full lips painted bright red, a half set of gills cut
   short at the neck, a chunk out of the chin, a sparkly barrette ---- */
export function samantha() {
  const v = new Vox(), skin = '#efc3a8', hair = '#efe9dc', lips = '#d0202a';
  base(v, 'stoneDark', 'stone', 401);
  v.chunk = 0;
  v.box(2, 2, 5, 6, 6, 6, twin(skin));                                              // the neck, cut short
  for (const [x, y] of [[2, 2], [6, 6], [4, 6], [6, 3]] as const) v.set(x, y, 5, null);   // jagged where it was cut
  for (const [y, z] of [[3, 6], [5, 6], [3, 5], [5, 5]] as const) v.set(6, y, z, '#b0505e');   // the gills, cut short
  round(v, 0, 8, 0, 8, 7, 16, skin);                                                 // the head
  // eyes stuck wide, lashes laid on thick
  for (const [x0, px] of [[1, 2], [6, 6]] as const) { v.box(x0, 8, 12, x0 + 1, 8, 13, 'white'); v.set(px, 8, 12, 'black'); v.set(px, 8, 13, 'black'); v.box(x0, 8, 14, x0 + 1, 8, 14, 'black'); }
  v.set(0, 8, 14, 'black'); v.set(8, 8, 14, 'black');
  // the mouth stuck open, the red lips round it, two fangs hanging into it
  v.box(2, 8, 9, 6, 8, 10, '#3a1014');
  v.box(2, 8, 11, 6, 8, 11, lips); v.box(2, 8, 8, 6, 8, 8, lips); v.box(1, 8, 9, 1, 8, 10, lips); v.box(7, 8, 9, 7, 8, 10, lips);
  v.set(3, 8, 10, 'white'); v.set(5, 8, 10, 'white'); v.set(3, 9, 9, 'white'); v.set(5, 9, 9, 'white');
  v.set(6, 8, 7, null); v.set(7, 8, 7, null); v.set(7, 7, 7, null); v.set(6, 8, 8, twin(skin));   // the chipped chin
  // the bone-white hair: over the top, down the back to the ground, a fringe over the brow
  v.box(0, 0, 16, 8, 7, 17, hair); v.box(-1, -1, 6, 9, -1, 17, hair); v.box(0, -2, 5, 8, -2, 7, hair);
  v.box(-1, 0, 8, -1, 4, 17, hair); v.box(9, 0, 8, 9, 2, 17, hair); v.box(9, 3, 15, 9, 5, 17, hair);
  v.box(0, 8, 16, 8, 8, 16, hair); v.set(4, 8, 16, skin); v.set(0, 8, 15, hair); v.set(8, 8, 15, hair);
  v.box(9, 3, 13, 9, 4, 14, '#e889b0'); v.set(9, 4, 14, '#fff3c4'); v.set(9, 3, 13, '#fff3c4');   // the sparkly barrette
  return v;
}

/* ---- the changeling at the Toe: first seen properly (4:5) as a rodent/human hybrid with orange hair in a purple
   jumpsuit, Chuck E. Cheese in drag; her human form described at 7:42, a black skintight bodysuit, long straight
   black hair, round glasses and a red cobra's head on her chest ---- */
export function juiceBox(stage: 'mouse' | 'bodysuit') {
  if (stage === 'bodysuit') {
    const suit = '#1d1b22', skin = '#e3b896';
    const v = person({ skin, hair: { color: '#0d0b0e', style: 'long' }, top: suit, bottom: suit, legs: twin(suit), feet: suit, seed: 403 });
    for (const ex of [2, 5]) { v.set(ex, 7, 16, '#8a8f96'); v.box(ex - 1, 7, 17, ex - 1, 7, 18, '#8a8f96'); v.box(ex + 1, 7, 17, ex + 1, 7, 18, '#8a8f96'); }   // round glasses
    v.box(2, 6, 12, 5, 6, 12, '#c8202a'); v.box(3, 6, 13, 4, 6, 13, '#c8202a'); v.box(3, 6, 11, 4, 6, 11, '#8e1620');   // the cobra's head
    return v;
  }
  const v = new Vox(), fur = '#8a807a', hair = '#e07a28', suit = '#6a3a9a';
  base(v, 'stoneDark', 'stone', 402);
  v.chunk = 0;
  head(v, fur);
  v.box(2, 8, 14, 5, 8, 17, twin(fur)); v.box(3, 9, 14, 4, 9, 16, twin(fur)); v.box(3, 10, 16, 4, 10, 16, 'black');   // the snout and its nose
  eyes(v, 'black', 18, [1, 6], 2);
  // the orange hair, a mop over the top and down the back, the round ears up through it
  v.box(0, 0, 21, 7, 7, 22, hair); v.box(0, -1, 14, 7, 1, 21, hair); v.box(0, 2, 17, 0, 5, 21, hair); v.box(7, 2, 17, 7, 5, 21, hair);
  for (const x of [0, 3, 5, 7]) v.set(x, 7, 21, hair);
  for (const x0 of [-2, 6]) { v.box(x0, 3, 22, x0 + 3, 4, 25, fur); v.set(x0, 3, 25, null); v.set(x0 + 3, 3, 25, null); v.box(x0 + 1, 4, 23, x0 + 2, 4, 24, '#6e6560'); }
  body(v, { top: suit, skin: fur, bottom: suit, legs: twin(suit), feet: twin(fur) });
  return v;
}

/* ---- the pest exterminator (4:3): an overweight, balding guy of about twenty-five who looks maybe Spanish; by 7:7
   his usual leather jacket, zipped right up over a big white t-shirt ---- */
export function louis(stage: 'pudgy' | 'jacket') {
  const skin = '#d8a77f', jacket = '#33291f', top = stage === 'jacket' ? jacket : PLAIN_TOP;
  const v = person({ skin, top, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 404 });
  belly(v, top);
  // balding: hair round the back and over the ears, the crown bare
  v.box(0, 0, H0 + 1, 7, 1, H1 - 1, PLAIN_HAIR); v.box(0, 2, H1 - 4, 0, 4, H1 - 1, PLAIN_HAIR); v.box(7, 2, H1 - 4, 7, 4, H1 - 1, PLAIN_HAIR);
  if (stage === 'jacket') { v.box(3, 7, 13, 4, 7, 13, 'white'); v.box(3, 6, 13, 4, 6, 13, 'white'); for (const z of [10, 11, 12]) v.set(4, 8, z, 'metalDark'); v.set(4, 7, 9, 'metalDark'); }
  return v;
}

/* ---- the swashbuckler (4:20): a tired-looking man, Vietnamese (6:22); a curved sword from 4:29; both legs lost at
   the end of the Butcher's Masquerade and an Odette-style floating chair by 6:22; a small mechanical crab body
   Katia built for him by 7:21 ---- */
export function tran(stage: 'tired' | 'cutlass' | 'chair' | 'crab') {
  const skin = '#dcb48c';
  const fig = person({ skin, hair: { color: PLAIN_HAIR, style: 'short' }, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 405, bare: stage === 'chair' || stage === 'crab' });
  fig.set(2, 7, 16, twin(skin)); fig.set(5, 7, 16, twin(skin));                     // tired, under the eyes
  if (stage === 'tired') return fig;
  if (stage === 'cutlass') {
    fig.set(8, 5, 9, 'woodDark'); fig.box(8, 4, 10, 8, 6, 10, 'metalDark');
    fig.box(8, 5, 11, 8, 5, 14, 'metal'); fig.box(8, 6, 15, 8, 6, 16, 'metal'); fig.set(8, 7, 17, 'metal');
    return fig;
  }
  const v = new Vox();
  base(v, 'stoneDark', 'stone', 406);
  if (stage === 'chair') {
    copyInto(v, lifted(fig, 2));
    v.chunk = 0;
    v.box(-1, 0, 8, 8, 8, 9, '#3a3f4a'); v.box(-1, 8, 8, 8, 8, 8, 'glassTeal');      // the floating disc
    for (const [x, y] of [[1, 2], [6, 6], [3, 4], [5, 1]] as const) v.set(x, y, 5, 'portal');
    return v;
  }
  copyInto(v, lifted(fig, 3));
  v.chunk = 0;
  round(v, -1, 8, 0, 8, 8, 10, (x, y, z) => (z === 8 ? 'metalDark' : 'metal'));    // the crab's shell
  v.set(2, 8, 10, 'portal'); v.set(5, 8, 10, 'portal');
  for (const y of [1, 4, 7]) for (const s of [-1, 1]) {                               // six legs, out and down to the ground
    const x0 = s < 0 ? -2 : 9;
    v.set(x0, y, 9, 'metalDark'); v.set(x0 + s, y, 9, 'metal'); v.set(x0 + s * 2, y, 8, 'metal'); v.set(x0 + s * 2, y, 7, 'metalDark'); v.set(x0 + s * 2, y, 6, 'metalDark'); v.set(x0 + s * 2, y, 5, 'metal');
  }
  return v;
}

/* ---- the sun and ash god, as first seen whole (4:31): a muscular human shape made of curls of orange and red
   fire, a massive curved horn smoking like incense out of the left side of his head, the right side caved in; his
   human-sized form (8:95): tall, about fifty, blazing sockets for eyes, bald, a black beard streaked with red cracks
   that smoulder, the gods' white toga and gold sash covered in scorch marks, an angry scar down the side of his
   head, the ground burning under his feet ---- */
export function emberus(stage: 'ablaze' | 'toga') {
  if (stage === 'toga') {
    const skin = '#c99a78', toga = '#ece6da';
    const v = person({ skin, hair: { color: PLAIN_HAIR, style: 'bald' }, eyes: 'ember', top: toga, outfit: 'robe', bottom: toga, feet: '#7a5a44', beard: '#1b1714', seed: 408 });
    for (const [x, y, z] of [[2, 8, 14], [4, 8, 13], [5, 7, 15], [3, 8, 12], [1, 7, 14]] as const) v.set(x, y, z, 'ember');   // the beard's cracks
    for (const [x, z] of [[1, 13], [2, 12], [3, 11], [4, 10], [5, 9], [6, 8]] as const) v.set(x, 6, z, '#d4a520');   // the gold sash
    v.box(7, 3, 12, 7, 3, 13, '#d4a520');
    for (const [x, y, z] of [[2, 6, 7], [5, 6, 6], [0, 4, 11], [6, 6, 11], [7, 5, 7], [1, 7, 5]] as const) v.set(x, y, z, '#4a3e36');   // scorch marks
    v.box(7, 4, H0 + 1, 7, 4, H1, '#8a4a3a'); v.set(7, 5, H0 + 3, '#8a4a3a');           // the scar
    for (const [x, y] of [[0, 8], [7, 7], [3, 9], [-1, 5], [8, 3]] as const) v.set(x, y, 4, 'ember');   // the ground burning
    return tall(v);
  }
  const v = new Vox();
  base(v, 'stoneDark', 'stone', 407);
  v.chunk = 0;
  // curls of orange and red fire licking up and down, in big bands rather than noise, a few burning brightest
  const fire = (x: number, y: number, z: number) => { const b = ((z * 2 + x + (y >> 1)) >> 2) % 4; return b === 0 ? '#b8281a' : b === 1 ? '#e2581c' : b === 2 ? '#f39a2c' : '#d23e1a'; };
  v.box(0, 0, H0, 7, 7, H1, fire);                                                     // the head
  v.clear(7, 1, H0 + 1, 7, 6, H1 - 2); v.clear(6, 3, H0 + 2, 6, 5, H1 - 3);           // the right side caved in
  v.box(1, 2, 10, 6, 6, 13, fire); v.box(-1, 3, 10, 0, 5, 13, fire); v.box(7, 3, 10, 8, 5, 13, fire);   // a big chest, arms like legs
  v.box(-1, 4, 9, 0, 5, 9, fire); v.box(7, 4, 9, 8, 5, 9, fire);
  v.box(1, 2, 8, 6, 6, 9, fire); v.box(1, 3, 6, 2, 5, 7, fire); v.box(5, 3, 6, 6, 5, 7, fire);
  v.box(1, 3, 5, 2, 7, 5, '#c42a18'); v.box(5, 3, 5, 6, 7, 5, '#c42a18');
  eyes(v, 'black', 17, [2, 5], 2);
  for (const [x, y, z] of [[1, 7, 12], [5, 6, 10], [0, 4, 11], [3, 7, 20], [7, 4, 12], [2, 6, 8]] as const) v.set(x, y, z, 'ember');
  // the massive horn, out of the left side of the head and curving up, smoking like an incense stick
  const horn = '#5e4e46', hornTip = '#8a7a6c';
  for (const [x, z, w] of [[-1, 17, 2], [-2, 18, 2], [-3, 19, 2], [-4, 20, 2], [-5, 21, 2], [-6, 22, 1], [-6, 24, 1], [-5, 25, 1], [-4, 26, 0]] as const) v.box(x, 3, z, x, 3 + w, z + 1, z > 23 ? hornTip : horn);
  for (const [x, y, z] of [[-3, 3, 28], [-2, 4, 29]] as const) v.set(x, y, z, 'mist');
  return v;
}

/* ---- the Syndicate liaison (4:19): a tall man in a dark hooded cloak, his face hidden in swirling darkness, grim
   reaper-like, a tiny glint of light deep in it; his hands, the only flesh to be seen, a dark, dark purple with long,
   elf-like fingers ---- */
export function orren() {
  const cloak = '#2b2832', skin = '#2c1a34';
  const v = person({ skin, eyes: 'void', top: cloak, outfit: 'robe', bottom: cloak, feet: cloak, hat: { color: cloak, kind: 'hood', trim: '#1c1a21' }, seed: 409 });
  v.box(0, 7, H0, 7, 7, H1, 'void'); v.set(4, 7, H0 + 3, 'glassTeal');
  v.box(0, 5, 7, 0, 5, 8, twin(skin)); v.box(7, 5, 7, 7, 5, 8, twin(skin)); v.set(0, 4, 8, twin(skin)); v.set(7, 4, 8, twin(skin));   // the long fingers
  return tall(v);
}

/* ---- the eighth edition's author, as Carl first meets him (7:20): a one-winged eagle, a skyfowl, shorter and
   stockier than most, his feathers all black tinged with gray, a twin tuft on his head like horns ---- */
export function justiceLight() {
  const v = new Vox(), blk = '#1f1d20', gry = '#55535a', beak = '#c9bd9a';
  base(v, 'stoneDark', 'stone', 410);
  v.chunk = 0;
  v.box(0, 1, 9, 7, 6, 13, blk); v.box(2, 6, 10, 5, 6, 12, gry);                     // a stocky body, the breast tinged gray
  v.box(1, 2, 8, 6, 6, 8, blk);
  v.box(1, 3, 6, 2, 5, 7, twin(blk)); v.box(5, 3, 6, 6, 5, 7, twin(blk));             // short legs
  v.box(1, 3, 5, 2, 7, 5, beak); v.box(5, 3, 5, 6, 7, 5, beak);                       // talons
  v.box(0, 0, H0, 7, 7, H1, blk);                                                      // the head
  for (const ex of [2, 5]) { v.box(ex - 1, 7, 16, ex + 1, 7, 19, gry); v.box(ex, 7, 17, ex, 7, 18, 'black'); }   // gray round the eyes
  v.box(3, 8, 16, 4, 8, 17, beak); v.box(3, 9, 16, 4, 9, 17, beak); v.box(3, 10, 15, 4, 10, 16, beak);   // the hooked beak
  for (const x0 of [0, 6]) { v.box(x0, 3, H1 + 1, x0 + 1, 4, H1 + 2, blk); v.set(x0 === 0 ? 0 : 7, 3, H1 + 3, gry); }   // the tufts, like horns
  // the one good wing, held half out, gray at the tips; a stump where the other was
  for (const [z, x1, g] of [[16, 10, 0], [15, 12, 0], [14, 13, 0], [13, 14, 1], [12, 14, 2], [11, 13, 2], [10, 12, 3], [9, 10, 2]] as const)
    for (let x = 8; x <= x1; x++) v.box(x, 3, z, x, 4, z, x > x1 - g || (z === 9) ? gry : blk);   // a fan of feathers, gray at the tips
  v.box(8, 3, 9, 8, 4, 9, blk);
  v.box(-1, 3, 12, -1, 4, 13, blk); v.set(-2, 3, 13, gry);
  return v;
}

/* ---- the pit fighter (4:25): dark-haired, a fur bikini and a spike-covered stick over her shoulder, leaning into
   the barbarian theme; her face burned in the masquerade's end, and healed that way (5:75); an extinction sigil
   tattooed under her eye by 6:22 ---- */
export function britney(stage: 'bikini' | 'burned' | 'sigil') {
  const skin = '#ecc4a4', fur = '#7a5a3a';
  const v = person({ skin, hair: { color: PLAIN_HAIR, style: 'long' }, top: skin, sleeves: 'none', bottom: fur, legs: twin(skin), feet: null, seed: 411 });
  v.box(1, 2, 12, 6, 6, 13, fur); v.set(3, 6, 12, skin); v.set(4, 6, 12, skin);       // the fur top
  for (const [x, y, z] of [[1, 6, 13], [6, 6, 13], [1, 6, 8], [6, 6, 8], [3, 6, 8]] as const) v.set(x, y, z, '#9a7a52');   // the fur's fluff
  // the spiked stick, from her right hand up over her shoulder
  for (const [y, z] of [[6, 8], [5, 9], [5, 10], [4, 11], [3, 12], [2, 13], [1, 14], [0, 15], [-1, 16], [-2, 17]] as const) v.box(8, y, z, 8, y, z + (z > 10 ? 1 : 0), 'wood');
  for (const [x, y, z] of [[9, 2, 14], [9, 0, 16], [9, -2, 18], [7, 1, 16], [7, -1, 18], [8, -3, 19], [8, 1, 16], [8, -1, 18], [9, 1, 15], [9, -1, 17]] as const) v.set(x, y, z, 'rail');
  if (stage !== 'bikini') {   // the burn, down the right side of her face and round over the ear, healed that way
    for (const [x, y, z] of [[5, 7, 14], [6, 7, 14], [6, 7, 15], [5, 7, 16], [6, 7, 16], [6, 7, 17], [7, 7, 15], [7, 7, 16], [7, 6, 14], [7, 6, 15], [7, 6, 16], [7, 6, 17], [7, 5, 15], [7, 5, 16], [4, 7, 15]] as const) v.set(x, y, z, (x * 3 + z + y) % 4 === 0 ? '#8e3a32' : (x + z) % 3 === 0 ? '#e0a090' : '#c46a5c');
  }
  if (stage === 'sigil') { v.set(2, 7, 16, '#1b1714'); v.set(1, 7, 15, '#1b1714'); v.set(3, 7, 15, '#1b1714'); }
  return v;
}

/* ---- the hammersmith (4:3): a thin and tall man of about twenty-five with an angular face and olive skin ---- */
export function firas() {
  const v = person({ skin: '#c08e62', hair: { color: PLAIN_HAIR, style: 'short' }, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 412 });
  for (const x of [0, 7]) { v.set(x, 7, H0, null); v.set(x, 6, H0, null); v.set(x, 7, H0 + 1, null); }   // the angular jaw
  v.set(1, 7, H0, null);  v.set(6, 7, H0, null);
  return tall(v);
}

/* ---- the goddess of hopelessness, as she enters the realm (6:66): a regular-sized, young-faced female dwarf with a
   pickaxe, a helmet with a candle on it that sparks like a stick of dynamite ---- */
export function ysalte() {
  const v = person({ skin: '#e8bd98', hair: { color: PLAIN_HAIR, style: 'long' }, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 413 });
  round(v, -1, 8, -1, 8, H1, H1 + 2, 'metal'); v.box(0, 8, H1, 7, 9, H1, 'metalDark');   // the helmet, its brim
  v.box(3, 3, H1 + 3, 4, 4, H1 + 5, '#e9e1cf');                                         // the candle
  v.set(3, 4, H1 + 6, 'flame'); for (const [x, y, z] of [[2, 5, H1 + 7], [5, 3, H1 + 7], [4, 5, H1 + 8], [1, 3, H1 + 6]] as const) v.set(x, y, z, 'flame');   // sparking
  v.box(8, 5, 8, 8, 5, 18, 'woodDark'); v.box(8, 2, 19, 8, 8, 20, 'metal'); v.box(8, 0, 18, 8, 1, 18, 'metal'); v.box(8, 9, 18, 8, 10, 18, 'metal'); v.set(8, -1, 17, 'metal'); v.set(8, 11, 17, 'metal');   // the pickaxe
  return v;
}

/* ---- the juvenile gate guardian (4:29): a giant puppy with two heads and big, floppy ears, wagging his tail ---- */
export function orthrus() {
  const v = new Vox(), fur = '#8a735c', ear = '#5e4c3c';
  wideBase(v, -4, 12, 414, -6, 11);
  v.chunk = 0;
  round(v, -1, 10, -5, 4, 7, 13, fur);                                                  // the body
  for (const [x, y] of [[-1, -5], [9, -5], [-1, 3], [9, 3]] as const) { v.box(x, y, 5, x + 1, y + 1, 7, twin(fur)); }   // four legs
  v.box(0, 3, 11, 9, 5, 14, fur);                                                       // the shoulders the two necks rise from
  for (const x0 of [-3, 6]) {
    round(v, x0, x0 + 5, 3, 9, 12, 19, fur);                                            // a head
    v.box(x0 + 1, 10, 12, x0 + 4, 11, 14, twin(fur)); v.box(x0 + 2, 12, 14, x0 + 3, 12, 14, 'black');   // the snout and its nose
    v.box(x0 + 1, 9, 16, x0 + 1, 9, 17, 'black'); v.box(x0 + 4, 9, 16, x0 + 4, 9, 17, 'black');        // eyes
    for (const ex of [x0 - 1, x0 + 6]) v.box(ex, 4, 13, ex, 7, 18, ex === 4 ? twin(ear) : ear);       // the floppy ears
  }
  for (const [x, y, z] of [[4, -6, 12], [5, -6, 12], [4, -7, 13], [5, -7, 13], [5, -7, 14], [6, -7, 15], [6, -6, 16], [7, -6, 16]] as const) v.set(x, y, z, fur);   // the tail, up and wagging
  return v;
}

/* ---- the town's principal, a dromedarian like the rest (4:1, 4:6): a giant camel on two legs, eight feet tall, in a
   headscarf and robes, long arms, a hump like an overstuffed backpack under the robes ---- */
export function henrik() {
  const tan = '#c8a06a', robe = PLAIN_TOP, scarf = '#7a766e';
  const v = person({ skin: tan, eyes: 'black', top: robe, outfit: 'robe', bottom: robe, feet: twin(tan), seed: 415 });
  v.box(1, 8, 13, 6, 10, 16, twin(tan)); v.box(2, 11, 13, 5, 11, 15, twin(tan));      // the long muzzle
  v.set(2, 11, 15, '#4a3624'); v.set(5, 11, 15, '#4a3624'); v.box(2, 11, 13, 5, 11, 13, '#7a5a3a');   // nostrils, the split lip
  v.box(1, 7, 19, 2, 7, 19, twin(tan)); v.box(5, 7, 19, 6, 7, 19, twin(tan));         // heavy lids
  v.box(-1, -1, H1, 8, 8, H1 + 1, scarf); v.box(-1, -1, H0 - 1, 8, -1, H1, scarf);     // the headscarf, over and down the back
  v.box(-1, 0, H1 - 4, -1, 5, H1, scarf); v.box(8, 0, H1 - 4, 8, 5, H1, scarf); v.box(-1, 8, H1, 8, 8, H1, twin(scarf));
  v.box(1, -2, 9, 6, 1, 13, robe); v.box(2, -3, 10, 5, -3, 13, robe);                 // the hump under the robes
  v.box(0, 4, 8, 0, 5, 8, twin(tan)); v.box(7, 4, 8, 7, 5, 8, twin(tan));             // long arms
  return tall(v);
}

/* ---- the sun and life god: the red sun in the sky, chasing his brother across it (4:3); in person (7:54) an
   olive-skinned man who sits down beside Carl as if at a restaurant, heat coming off him ---- */
export function hellik(stage: 'sun' | 'man') {
  if (stage === 'man') {
    const v = person({ skin: '#c39467', hair: { color: PLAIN_HAIR, style: 'short' }, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 417 });
    return v;
  }
  const sun = new Vox();
  sun.chunk = 0;
  blob(sun, 3.5, 4, 14, 4.6, 4.6, 4.6, (x, y, z) => ((((x >> 1) + (z >> 1) + (y >> 2)) % 3 === 0) ? '#a82018' : '#d2321c'));
  for (const [x, y, z] of [[3, 4, 20], [4, 4, 8], [-2, 4, 14], [9, 4, 14], [3, 10, 14], [8, 9, 18], [-1, 8, 18], [8, 9, 10]] as const) sun.set(x, y, z, 'ember');   // its rays
  return floating(sun, 0, 'ember', 416);
}

/* ---- the glass mage (4:21): an unkempt, overweight guy in his twenties with long, stringy hair, in a bathrobe ---- */
export function ghazi() {
  const skin = '#ddb08a', robe = PLAIN_TOP;
  const v = person({ skin, hair: { color: PLAIN_HAIR, style: 'long' }, top: robe, bottom: robe, legs: twin(skin), feet: null, seed: 418 });
  belly(v, robe); v.box(1, 2, 7, 6, 6, 9, robe);                                         // the robe to the knee
  v.box(3, 6, 13, 4, 6, 13, skin); v.box(3, 7, 12, 4, 7, 12, twin(robe));              // the lapels open at the chest
  v.box(1, 7, 10, 6, 7, 10, '#4a4844'); v.set(4, 8, 10, '#4a4844'); v.set(4, 8, 9, '#4a4844');   // the belt, tied
  for (const [x, z0] of [[0, 12], [7, 11]] as const) v.box(x, 7, z0, x, 7, z0 + 6, PLAIN_HAIR);   // stringy, hanging down past the face
  v.set(0, 8, 12, PLAIN_HAIR); v.set(7, 8, 11, PLAIN_HAIR);
  for (const [x, y] of [[1, 3], [5, 2], [3, 6], [6, 5]] as const) v.set(x, y, H1 + 1, PLAIN_HAIR);
  return v;
}

/* ---- the lead dancer (6:23): a large, shirtless man with dark purple skin and snake-like features, only two arms ---- */
export function anaconda() {
  const skin = '#56306c', scale = '#714a8a', v = new Vox();
  base(v, 'stoneDark', 'stone', 419);
  v.chunk = 0;
  head(v, skin);
  eyes(v, 'black', 17, [2, 5], 2);
  v.box(-1, 2, H0, -1, 6, H0 + 2, skin); v.box(8, 2, H0, 8, 6, H0 + 2, skin);            // a broad, snake's jaw
  for (let x = 0; x <= 7; x++) for (let y = 0; y <= 7; y++) if ((x + y) % 3 === 0) v.set(x, y, H1, scale);   // scales over the crown
  for (const x of [1, 3, 4, 6]) v.set(x, 7, 20, scale); v.set(2, 7, 19, scale); v.set(5, 7, 19, scale);
  v.set(3, 7, 15, '#2a1636'); v.set(4, 7, 15, '#2a1636');                              // the flat, slitted nose
  v.box(1, 7, 14, 6, 7, 14, '#2a1636'); v.set(1, 7, 14, skin); v.set(6, 7, 14, skin);  // a wide mouth
  body(v, { top: twin(skin), skin, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES });
  v.box(-1, 3, 10, 0, 5, 13, skin); v.box(7, 3, 10, 8, 5, 13, skin);                    // big arms
  for (const [x, y, z] of [[-1, 4, 13], [0, 5, 12], [8, 4, 13], [7, 5, 12], [8, 3, 11], [2, 6, 13], [5, 6, 13], [3, 6, 11], [4, 6, 11]] as const) v.set(x, y, z, scale);   // scales over the shoulders and chest
  return v;
}

/* ---- the recap host (1:14, named 4:26): an orange-hued, four-eyed, lizard-like creature with a microphone ---- */
export function kevin() {
  const o = '#e0782a', v = new Vox();
  base(v, 'stoneDark', 'stone', 420);
  v.chunk = 0;
  v.box(0, 0, H0, 7, 7, H1 - 1, o);
  v.box(2, 8, H0, 5, 8, H0 + 1, twin(o)); v.box(3, 9, H0, 4, 11, H0 + 1, twin(o));      // a long, blunt lizard's snout
  v.box(3, 9, H0, 4, 11, H0, '#b8581c');                                                // the line of the mouth
  v.set(3, 11, H0 + 1, '#5a2a10'); v.set(4, 11, H0 + 1, '#5a2a10');
  for (const x of [1, 6]) { v.box(x, 7, 19, x, 7, 20, 'black'); v.box(x, 7, 16, x, 7, 17, 'black'); }   // four eyes, two over two
  body(v, { top: twin(o), skin: o, bottom: twin(o), feet: o });
  for (const [y, z] of [[1, 8], [0, 7], [-1, 6], [-2, 5], [-3, 5], [-4, 5]] as const) v.box(3, y, z, 4, y, z, o);   // the tail
  v.box(8, 5, 9, 8, 5, 11, 'metalDark'); v.box(8, 5, 12, 8, 5, 13, 'rail');               // the microphone
  return v;
}

/* ---- the changeling girl with compression sickness (4:10): no arms at all, her head sunken in at the top like a
   deflated, kicked soccer ball ---- */
export function ruby() {
  const skin = '#e2b48e';
  const v = person({ skin, hair: { color: PLAIN_HAIR, style: 'bob' }, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 421 });
  v.clear(0, 3, 9, 0, 5, 13); v.clear(7, 3, 9, 7, 5, 13);                               // no arms
  v.clear(2, 2, H1, 5, 5, H1); v.clear(3, 3, H1 - 1, 4, 4, H1 - 1);                     // the sunken crown
  v.box(2, 2, H1 - 1, 5, 5, H1 - 1, twin(skin)); v.box(3, 3, H1 - 2, 4, 4, H1 - 2, twin(skin));
  return v;
}

/* ---- the changeling boy (4:2): a small, gray, featureless thing that forms into a boy of about eight, wide-eyed, in a
   dromedarian-like robe, minding the telescope on his roof, a white tube covered in pipes and gears ---- */
export function skarn() {
  const v = new Vox();
  wideBase(v, -2, 18, 422, 0, 10);
  const boy = person({ skin: '#e2b48e', hair: { color: PLAIN_HAIR, style: 'short' }, top: PLAIN_TOP, outfit: 'robe', bottom: PLAIN_TOP, feet: PLAIN_SHOES, bare: true });
  boy.set(2, 7, 19, 'white'); boy.set(5, 7, 19, 'white');                                // wide-eyed
  copyInto(v, boy);
  v.chunk = 0;
  for (const [x, y] of [[11, 3], [15, 3], [13, 8]] as const) for (let z = 5; z <= 11; z++) v.set(Math.round(x + (13 - x) * (z - 5) / 6), Math.round(y + (5 - y) * (z - 5) / 6), z, 'metalDark');   // the stand
  for (let i = 0; i <= 8; i++) { const x = 10 + i, z = 11 + Math.floor(i / 2); v.box(x, 4, z, x, 6, z + 2, i === 8 ? 'glassTeal' : 'white'); }   // the tube, up towards the sky
  for (const x of [12, 15]) v.box(x, 4, 11 + ((x - 10) >> 1), x, 6, 13 + ((x - 10) >> 1), 'metal');   // bands of pipe round it
  v.box(11, 7, 12, 17, 7, 12, 'metal'); v.box(13, 7, 14, 14, 7, 15, 'metalDark'); v.set(13, 8, 15, 'metal'); v.set(14, 8, 14, 'metal');   // a pipe along it, a gear
  return v;
}

/* ---- the archers' leader (4:3): a stocky man of about forty-five with greying blonde hair and ice-blue eyes, his
   whole party sold cars and chose the bow ---- */
export function langley() {
  const skin = '#e9c0a0', blond = '#c9b98a', grey = '#a9a59a';
  const v = person({ skin, hair: { color: blond, style: 'short' }, eyes: '#5ab4e6', top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 423 });
  v.box(0, 2, H1 - 4, 0, 4, H1 - 2, grey); v.box(7, 2, H1 - 4, 7, 4, H1 - 2, grey); v.box(1, 0, H0 + 1, 6, 0, H0 + 4, grey);   // greying at the sides
  v.box(-1, 3, 10, -1, 5, 13, twin(PLAIN_TOP)); v.box(8, 3, 10, 8, 5, 13, twin(PLAIN_TOP));   // stocky
  v.box(-1, 4, 9, -1, 5, 9, twin(skin)); v.box(8, 4, 9, 8, 5, 9, twin(skin));
  v.box(9, 5, 8, 9, 5, 15, 'woodDark'); v.set(9, 6, 7, 'woodDark'); v.set(9, 6, 16, 'woodDark'); v.box(9, 6, 8, 9, 6, 15, '#d8d2c4');   // the bow and its string
  return v;
}

/* ---- the trap-finding spy (4:7): early twenties, dark hair, tan skin, a Mediterranean look; frazzled, an eye that
   twitches and a left hand that never stops trembling ---- */
export function bobby() {
  const skin = '#c8956a';
  const v = person({ skin, hair: { color: '#1e1713', style: 'messy' }, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 424 });
  v.set(2, 7, 18, twin(skin)); v.set(1, 7, 18, twin(skin)); v.set(3, 7, 18, twin(skin));   // the twitching eye, half shut
  v.clear(0, 4, 9, 0, 5, 9); v.box(-1, 4, 10, -1, 5, 10, twin(skin)); v.set(-1, 6, 9, twin(skin));   // the left hand, shaking loose
  return v;
}

/* ---- the Commandant's daughter (4:12, 4:16): a dirigible gnome girl of about ten, mixing her lemonade for a stand
   she has set up while her father lies dead in the kitchen ---- */
export function bonnie() {
  const skin = '#e9bc98';
  const v = person({ skin, hair: { color: PLAIN_HAIR, style: 'bob' }, top: PLAIN_TOP, outfit: 'dress', bottom: PLAIN_TOP, legs: twin(skin), feet: PLAIN_SHOES, seed: 425 });
  v.box(8, 5, 8, 10, 7, 10, '#f0d860'); v.box(8, 5, 11, 10, 7, 11, 'glass'); v.set(9, 8, 11, 'glass');   // the pitcher of lemonade
  v.box(9, 6, 12, 9, 6, 13, 'rail');                                                         // the spoon in it
  for (const [x, y, z, k] of [[-1, 7, 5, 0], [0, 8, 5, 1], [-1, 8, 6, 1], [1, 9, 5, 0]] as const) v.set(x, y, z, k ? '#f2d33a' : twin('#f2d33a'));   // lemons
  return v;
}

/* ---- the hostage under the town hall (4:6): an elderly dirigible gnome without the red hat, sickly and pale, scabs on
   his face, half starved, chained up to the wall ---- */
export function wynne() {
  const skin = '#e2d6c4', v = new Vox();
  base(v, 'stoneDark', 'stone', 426);
  v.chunk = 2;
  v.box(-2, -2, 5, 9, -1, 20, (x, y, z) => (((x >> 1) + (z >> 1)) % 3 ? 'stoneDark' : 'stone'));   // the wall
  const fig = person({ skin, hair: { color: PLAIN_HAIR, style: 'short' }, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: twin(skin), bare: true });
  fig.set(2, 7, 16, twin(skin)); fig.set(5, 7, 16, twin(skin)); fig.set(1, 7, 15, twin(skin)); fig.set(6, 7, 15, twin(skin));   // hollow, starved
  for (const [x, y, z] of [[7, 6, 15], [7, 4, 14], [7, 3, 17], [1, 7, 14]] as const) fig.set(x, y, z, '#8a3428');   // scabs
  for (const [x, y] of [[2, 6], [5, 6], [6, 3], [1, 4]] as const) fig.set(x, y, 11, '#4a4844');      // ragged
  copyInto(v, fig);
  v.chunk = 0;
  for (const s of [-1, 8]) {                                                                // shackles and chains to the wall
    v.box(s, 4, 9, s, 5, 9, 'metalDark');
    for (const [y, z] of [[3, 10], [2, 11], [1, 12], [0, 13], [-1, 14]] as const) v.set(s, y, z, (y + z) % 2 ? 'metal' : 'metalDark');
    v.set(s, -1, 15, 'metal');
  }
  return v;
}

/* ---- the gut rearranger (4:25): a spotted, gecko-like creature, a Kuhli, covered head to toe in little sheaths filled
   with daggers of all types ---- */
export function vadim() {
  const hide = '#76785e', spot = '#4c4e38', strap = '#4e3a2a', v = new Vox();
  base(v, 'stoneDark', 'stone', 427);
  v.chunk = 0;
  v.box(-1, 0, H0, 8, 7, H1 - 2, hide);                                                       // a wide, flat head
  v.box(-1, 7, 17, 0, 7, 18, 'black'); v.box(7, 7, 17, 8, 7, 18, 'black'); v.set(0, 7, 18, 'white'); v.set(8, 7, 18, 'white');   // big, wide-set eyes
  v.box(1, 7, 15, 6, 7, 15, '#3a3c2a');                                                       // the wide mouth
  for (const [x, y, z] of [[2, 7, 18], [5, 7, 17], [3, 3, H1 - 2], [6, 1, H1 - 2], [0, 4, H1 - 2], [8, 3, 16], [1, 7, 14]] as const) v.set(x, y, z, spot);
  body(v, { top: strap, skin: hide, bottom: strap, legs: twin(hide), feet: hide });
  for (const [x, y, z] of [[0, 6, 12], [7, 6, 11], [1, 7, 6], [6, 7, 7], [2, 6, 7], [5, 6, 6], [0, 5, 10], [7, 3, 13]] as const) v.set(x, y, z, spot);
  // the sheaths, row on row, a hilt standing out of each
  for (const z of [10, 12]) for (const x of [1, 2, 3, 4, 5, 6]) v.set(x, 7, z, (x + z) % 2 ? 'metal' : 'rail');
  for (const [x, y, z] of [[0, 6, 13], [7, 6, 13], [0, 6, 10], [7, 6, 10], [1, 6, 8], [6, 6, 8], [2, 6, 6], [5, 6, 6], [7, 2, 12], [-1, 3, 12], [8, 4, 11]] as const) v.set(x, y, z, 'metal');
  v.box(1, 6, 9, 6, 6, 9, strap);
  for (const [y, z] of [[1, 8], [0, 7], [-1, 6], [-2, 5], [-3, 5]] as const) v.box(3, y, z, 4, y, z, hide);   // the tail
  v.box(0, 7, 5, 2, 8, 5, hide); v.box(5, 7, 5, 7, 8, 5, hide);                              // splayed toes
  return v;
}

/* ---- the octo-shark brood mother queen (4:26): a shark the size of a mountain, tentacles flowing behind her, her
   mouth stuck wide open, every tooth the size of a surfboard, her hungry babies in it ---- */
export function lusca() {
  const grey = '#66717c', pale = '#9aa4ad', v = new Vox();
  wideBase(v, -3, 12, 428, -4, 11);
  v.chunk = 0;
  blob(v, 4.5, 3, 11.5, 5.6, 7, 5, (x, y, z) => (z <= 9 ? pale : grey));                    // the body
  v.clear(0, 8, 9, 9, 11, 13);                                                               // the open mouth
  blob(v, 4.5, 6, 11, 4.2, 3.4, 2.6, '#3a1418', (x, y, z) => y >= 7 && y <= 8);
  for (let x = 0; x <= 9; x++) { if (x % 2 === 0) { v.set(x, 8, 13, 'white'); v.set(x, 9, 13, 'white'); } else { v.set(x, 8, 9, 'white'); v.set(x, 9, 9, 'white'); } }
  for (let x = 0; x <= 9; x++) { v.set(x, 9, 14, grey); v.set(x, 9, 8, pale); v.set(x, 10, 8, pale); }
  v.box(2, 8, 10, 3, 8, 11, grey); v.set(2, 9, 11, 'black'); v.box(6, 8, 11, 7, 8, 12, grey); v.set(7, 9, 12, 'black');   // babies in her mouth
  v.box(-1, 5, 13, -1, 6, 14, 'black'); v.box(10, 5, 13, 10, 6, 14, 'black');               // her eyes
  v.box(4, -1, 16, 5, 2, 17, grey); v.box(4, -1, 18, 5, 0, 19, grey); v.set(4, -2, 20, grey); // the dorsal fin
  // the tentacles, trailing out over the ground, suckers along them
  for (const [x0, y0, dx, dy, n] of [[0, -3, -1, -1, 3], [9, -3, 1, -1, 2], [3, -4, 0, -1, 1], [6, -4, 0, -1, 1], [-1, 3, -1, 1, 3], [10, 3, 1, 1, 3], [-1, 0, -1, 0, 3], [10, 0, 1, 0, 2]] as const)
    for (let i = 0; i < n; i++) { const x = x0 + dx * i, y = y0 + dy * i, z = 5 + (i < 1 ? 1 : 0); v.box(x, y, 5, x, y, z, grey); v.set(x, y, z + 1, i % 2 ? pale : grey); if (i === n - 1) v.set(x + dx, y + dy + (dy === 0 ? 1 : 0), 5, grey); }
  for (const [x, y, z] of [[9, -2, 8], [10, -2, 9], [11, -2, 10], [11, -1, 11], [12, -1, 12], [12, -1, 13], [11, 0, 14], [11, 0, 15], [10, 0, 16]] as const) { v.box(x, y, z, x, y + 1, z, grey); v.set(x, y + 2, z, (z % 2) ? pale : grey); }   // one curling up behind her
  return v;
}

/* ---- the feral goose mother (4:16): a regular white goose out of a children's book, in a frilly, baby-blue bonnet and
   a blue shawl round her neck, torn and stained with blood ---- */
export function denise() {
  const white = '#f2efe8', orange = '#e08a2a', bonnet = '#a9cfee', frill = '#d7eafa', shawl = '#3d6fb5', blood = '#8e1c16';
  const v = new Vox();
  base(v, 'stoneDark', 'stone', 429);
  v.chunk = 0;
  round(v, 0, 7, -1, 7, 6, 12, white);                                                       // the body
  v.box(-1, 1, 8, -1, 6, 11, twin(white)); v.box(8, 1, 8, 8, 6, 11, twin(white));           // folded wings
  v.box(3, -2, 11, 4, -2, 13, white); v.set(3, -3, 13, white); v.set(4, -3, 13, white);     // the tail, up
  v.box(3, 6, 12, 4, 7, 16, white);                                                          // the neck
  round(v, 1, 6, 5, 10, 16, 21, white);                                                      // the head
  v.box(3, 11, 17, 4, 12, 18, orange); v.box(3, 13, 17, 4, 13, 17, orange);                  // the beak
  v.set(2, 10, 19, 'black'); v.set(5, 10, 19, 'black');
  v.box(2, 4, 5, 2, 4, 5, orange); v.box(5, 4, 5, 5, 4, 5, orange); v.box(1, 5, 5, 2, 7, 5, orange); v.box(5, 5, 5, 6, 7, 5, orange);   // feet
  // the bonnet: over the crown and the back of the head, a frill round the face, ties under the beak
  round(v, 0, 7, 4, 8, 19, 22, bonnet); v.box(1, 4, 16, 6, 4, 19, bonnet);
  for (let x = 0; x <= 7; x++) v.set(x, 9, 22, x % 2 ? frill : bonnet);                   // the frilled rim over the face
  for (const x of [0, 7]) for (let z = 17; z <= 21; z++) v.set(x, 9, z, z % 2 ? frill : bonnet);
  v.box(0, 8, 16, 0, 8, 17, bonnet); v.box(7, 8, 16, 7, 8, 17, bonnet); v.set(1, 10, 15, bonnet); v.set(6, 10, 15, bonnet);   // its ties
  // the shawl round the neck and over the shoulders, torn, blood on it
  v.box(1, 4, 12, 6, 9, 13, shawl); v.box(2, 5, 14, 5, 8, 14, shawl); v.box(0, 2, 11, 7, 5, 11, shawl);
  v.set(6, 9, 12, null); v.set(1, 9, 13, null);
  for (const [x, y, z] of [[2, 9, 13], [4, 9, 12], [5, 8, 14], [7, 4, 11], [6, 9, 13]] as const) v.set(x, y, z, blood);
  return v;
}

/* ---- the feral minor demon of the harem (4:34): fat, a huge head that is a pink, fleshy dome yet scaled like a
   lizard's, scattered black hairs across it, reptilian eyes, a jagged mouth full of teeth and a red tongue, slathered
   in makeup (bruise-coloured eyeshadow to the patchy hairline, lipstick thick as spackle, cheeks painted in red
   swirls), the tops of black leathery wings either side of the head, a purple glow, a chain whip ---- */
export function slit() {
  const pink = '#e7a0a8', scale = '#cf8892', v = new Vox();
  wideBase(v, -5, 12, 430, -1, 10);
  v.chunk = 0;
  const flesh = (x: number, y: number, z: number) => (((x >> 1) + (y >> 1) + (z >> 1)) % 3 === 0 ? scale : pink);
  round(v, -1, 8, 0, 7, 6, 13, flesh);                                                       // a fat body
  v.box(-2, 3, 9, -2, 5, 12, twin(pink)); v.box(9, 3, 9, 9, 5, 12, twin(pink));             // arms
  v.box(0, 2, 5, 2, 5, 5, twin(pink)); v.box(5, 2, 5, 7, 5, 5, twin(pink));                  // stubby feet
  blob(v, 3.5, 3.5, 15, 5.6, 5.4, 7.6, flesh, (x, y, z) => z >= 13);                        // the dome of a head
  const front = (x: number, z: number) => { for (let y = 10; y >= -2; y--) if (v.has(x, y, z)) return y; return 8; };
  const face = (x: number, z: number, m: string) => v.set(x, front(x, z), z, m);
  for (const x of [1, 2, 5, 6]) for (const z of [18, 19]) face(x, z, 'black');             // reptilian eyes
  for (const x of [1, 2, 5, 6]) for (const z of [20, 21]) face(x, z, '#6b3f7a');           // the bruise-coloured eyeshadow
  face(3, 21, '#6b3f7a'); face(4, 21, '#6b3f7a');
  for (const x of [0, 7]) face(x, 17, '#d03030'); face(-1, 16, '#d03030'); face(8, 16, '#d03030');   // the red swirls of the cheeks
  for (let x = 0; x <= 7; x++) { face(x, 13, '#a8202a'); face(x, 16, '#a8202a'); face(x, 14, x % 2 ? 'white' : '#3a1418'); face(x, 15, x % 2 ? '#3a1418' : 'white'); }   // lips, the jagged mouth
  face(-1, 14, '#a8202a'); face(8, 14, '#a8202a'); face(-1, 15, '#a8202a'); face(8, 15, '#a8202a');
  v.set(3, front(3, 14) + 1, 14, '#d0303a'); v.set(4, front(4, 14) + 1, 13, '#d0303a');     // the tongue
  const top = (x: number, y: number) => { for (let z = 24; z >= 13; z--) if (v.has(x, y, z)) return z; return 22; };
  for (const [x, y] of [[0, 3], [1, 3], [2, 4], [3, 4], [4, 4], [5, 5], [6, 5], [2, 1], [3, 2], [3, 3], [5, 1], [6, 2], [1, 6], [2, 7], [6, 7]] as const) v.set(x, y, top(x, y), '#1b1714');   // the hairs
  // the black, leathery wings rising either side of the head
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -3 : 10;
    v.box(x0, 2, 14, x0, 4, 21, '#221c22'); v.box(x0 + s, 2, 17, x0 + s, 3, 23, '#221c22'); v.box(x0 + s * 2, 2, 19, x0 + s * 2, 2, 24, '#221c22');
    v.set(x0, 4, 22, '#221c22'); v.set(x0 - s, 3, 15, '#221c22');
  }
  // the chain whip, from her right hand down across the ground
  v.set(10, 5, 9, 'woodDark'); v.set(10, 6, 9, 'woodDark');
  for (const [x, y, z] of [[10, 7, 8], [11, 8, 7], [11, 9, 6], [10, 10, 5], [9, 11, 5], [8, 11, 5], [7, 10, 5]] as const) v.set(x, y, z, (x + y) % 2 ? 'metal' : 'metalDark');
  for (const [x, y] of [[-3, 7], [11, 3], [4, 10], [-4, 3], [1, 9]] as const) v.set(x, y, 5, 'laser');   // the purple glow
  return v;
}

/* Every book 4 figure, by character id and look. */
export const BOOK4_FIGURES: Record<string, Record<string, () => Vox>> = {
  samantha: { head: samantha },
  'juice-box': { mouse: () => juiceBox('mouse'), bodysuit: () => juiceBox('bodysuit') },
  louis: { pudgy: () => louis('pudgy'), jacket: () => louis('jacket') },
  tran: { tired: () => tran('tired'), cutlass: () => tran('cutlass'), chair: () => tran('chair'), crab: () => tran('crab') },
  emberus: { ablaze: () => emberus('ablaze'), toga: () => emberus('toga') },
  orren: { hood: orren },
  'justice-light': { 'one-wing': justiceLight },
  britney: { bikini: () => britney('bikini'), burned: () => britney('burned'), sigil: () => britney('sigil') },
  firas: { lanky: firas },
  ysalte: { miner: ysalte },
  orthrus: { puppy: orthrus },
  henrik: { camel: henrik },
  hellik: { sun: () => hellik('sun'), man: () => hellik('man') },
  ghazi: { bathrobe: ghazi },
  anaconda: { dancer: anaconda },
  kevin: { host: kevin },
  ruby: { armless: ruby },
  skarn: { telescope: skarn },
  langley: { archer: langley },
  bobby: { spy: bobby },
  bonnie: { lemonade: bonnie },
  wynne: { chained: wynne },
  vadim: { daggers: vadim },
  lusca: { brood: lusca },
  denise: { bonnet: denise },
  slit: { harem: slit },
};
