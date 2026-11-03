import { Vox } from '../vox.ts';
import { base, head, eyes, body, twin, person, copyInto, wideBase, H0, H1,
  PLAIN_HAIR, PLAIN_TOP, PLAIN_BOTTOM, PLAIN_SHOES } from './parts.ts';

/* ---- the fifth book's cast (the Hunting Grounds and the Masquerade), one builder per character ----
   Same rules as cast.ts: each look is drawn from the edition's own description at its point, and
   opens where everything in it has been read. Shapes and colours only, never a name or a word.
   Where the book leaves a colour unsaid, a figure takes a plain one. */

/* ---- small local parts ---- */
type Mat = string | ((x: number, y: number, z: number) => string | null);
const at = (m: Mat, x: number, y: number, z: number) => (typeof m === 'string' ? m : m(x, y, z));
// a filled ellipsoid
function ellip(v: Vox, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, m: Mat) {
  for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++)
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1) { const c = at(m, x, y, z); if (c) v.set(x, y, z, c); }
}
// a box with its edges taken off, so it reads round
function round(v: Vox, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m: Mat) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const ex = x === x0 || x === x1, ey = y === y0 || y === y1, ez = z === z0 || z === z1;
    if ((ex && ey) || (ex && ez) || (ey && ez)) continue;
    const c = at(m, x, y, z); if (c) v.set(x, y, z, c);
  }
}
// pointed ears through the hair, as an elf has
function elfEars(v: Vox, skin: string) { for (const [x, dx] of [[-1, -1], [8, 1]] as const) { v.set(x, 4, 17, skin); v.set(x, 4, 18, skin); v.set(x, 3, 19, skin); v.set(x + dx, 3, 20, skin); } }
const NEUTRAL_SKIN = '#c99a78';

/* ---- the lawyer (5:3): a gray alien about four and a half feet tall, cartoon large eyes and a bulbous head, a tan
   suit and a tie with a little gray hula girl on it, a vape pen whose smoke pixelates (he is a holo) ---- */
export function quasar() {
  const v = new Vox(), gray = '#a3a6a4', suit = '#b9a37a';
  base(v, 'stoneDark', 'stone', 71);
  v.chunk = 0;
  body(v, { top: suit, skin: gray, bottom: suit, feet: PLAIN_SHOES, front: PLAIN_TOP });
  v.box(3, 7, 10, 4, 7, 13, '#33364a'); v.set(3, 7, 11, gray); v.set(4, 7, 12, gray);   // the tie, the hula girl on it
  // the bulbous head: a narrow chin, a skull swelling out above the eyes, to the sides and back
  v.box(1, 1, 14, 6, 6, 14, gray); v.box(0, 0, 15, 7, 7, 21, gray);
  round(v, -1, 8, -1, 7, 18, 23, twin(gray)); v.box(0, 7, 18, 7, 7, 21, gray); v.box(1, 0, 24, 6, 5, 24, twin(gray));
  // large black eyes, slanted up and out, a glint in each
  for (const x0 of [1, 5]) { v.box(x0, 7, 16, x0 + 1, 7, 18, 'black'); v.set(x0 + (x0 < 4 ? 1 : 0), 7, 16, gray); v.set(x0 + (x0 < 4 ? 0 : 1), 7, 19, 'black'); v.set(x0 + (x0 < 4 ? 1 : 0), 7, 18, '#5f6676'); }
  v.set(3, 7, 15, '#7c807e'); v.set(4, 7, 15, '#7c807e');                                   // a small mouth
  v.box(8, 5, 9, 8, 5, 11, 'metalDark'); v.set(8, 5, 12, 'portal');                          // the vape pen, pulsing
  for (const [x, y, z] of [[8, 6, 14], [9, 6, 15], [8, 7, 16]] as const) v.set(x, y, z, 'mist');   // its smoke, in pixels
  return v;
}

/* ---- the Curupira ranger, as first described (8:40): a small, red-haired crawler barely five feet tall who still
   looks mostly human, something odd about his feet hidden in large boots. Before it he only "looks human". ---- */
export function osvaldo() {
  const v = person({ skin: NEUTRAL_SKIN, hair: { color: '#c8321e', style: 'messy' }, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 72 });
  v.box(0, 2, 5, 3, 8, 7, PLAIN_SHOES); v.box(4, 2, 5, 7, 8, 7, twin(PLAIN_SHOES));          // the large boots, to the calf
  v.box(0, 2, 7, 3, 2, 7, '#3a332e'); v.box(4, 2, 7, 7, 2, 7, '#3a332e');
  return v;
}

/* ---- the high elf queen, as first seen (5:64): dark brown skin, silky highlighted brown hair piled high in a
   wedding updo with a curled strand down each side, gold makeup over her face like gold leaf, a long glittering
   colour-changing gown covered in magical sparkles, a gold chain with a glowing soul-crystal pendant ---- */
export function imogen() {
  const skin = '#4e3122', hair = '#7a4a26', hi = '#a8763e', gold = '#d8b04a';
  const bands = (z: number) => (z <= 6 ? '#2fae9e' : z <= 9 ? '#3a7ccc' : '#8a4fc8');   // the colours it changes through
  const v = person({ skin, top: '#7550c8', outfit: 'dress', bottom: '#3a7ccc', feet: '#2fae9e', sleeves: 'none', seed: 73 });
  for (const { p: [x, y, z], mat } of v.all()) if (z >= 5 && z <= 13 && (mat === '#7550c8' || mat === '#3a7ccc' || mat === '#2fae9e' || mat === twin('#7550c8'))) v.set(x, y, z, bands(z));
  v.box(0, 1, 5, 7, 7, 5, '#2fae9e'); v.box(-1, 2, 5, 8, 8, 5, (x, y) => ((x === -1 || x === 8 || y === 8) && (x + y) % 2 ? '#2fae9e' : null));   // to the floor, sweeping out
  v.box(0, 3, 10, 0, 5, 13, twin(skin)); v.box(7, 3, 10, 7, 5, 13, twin(skin));                // bare arms
  for (const [x, y, z] of [[1, 7, 9], [6, 7, 7], [3, 7, 6], [0, 5, 8], [7, 4, 11], [5, 7, 12], [2, 1, 10], [7, 7, 6]] as const) v.set(x, y, z, x === 3 ? 'portal' : 'white');   // sparkles
  // the hair swept up off the face and piled high, a curled strand dangling at each side
  v.box(0, 0, 20, 7, 6, 21, hair); v.box(0, 0, 14, 7, 1, 21, hair); v.box(0, 2, 18, 0, 4, 21, hair); v.box(7, 2, 18, 7, 4, 21, hair);
  v.box(1, 1, 22, 6, 6, 22, hair); v.box(2, 2, 23, 5, 5, 24, hair);
  for (const [x, y, z] of [[2, 5, 23], [4, 5, 24], [5, 3, 23], [3, 2, 24], [1, 3, 22], [5, 6, 22], [0, 6, 20], [7, 5, 21], [7, 0, 17], [0, 1, 15]] as const) v.set(x, y, z, hi);   // highlights
  for (const x of [-1, 8]) { v.box(x, 6, 14, x, 6, 18, hair); v.set(x, 7, 14, hair); }
  v.box(1, 7, 19, 6, 7, 19, gold); v.set(1, 7, 16, gold); v.set(6, 7, 16, gold); v.set(1, 7, 17, gold); v.set(6, 7, 17, gold);   // gold leaf over her brow and cheeks
  v.box(3, 7, 15, 4, 7, 15, '#a8742c');                                                         // gold lips
  elfEars(v, skin);
  v.set(2, 7, 13, gold); v.set(5, 7, 13, gold); v.box(3, 7, 12, 4, 7, 12, gold); v.box(3, 8, 11, 4, 8, 11, 'portal');   // the chain and its crystal
  return v;
}

/* ---- the mantis people: a long armoured abdomen behind, six thin legs, an upright thorax, a triangular head with
   compound eyes, the top pair of arms folded blades, a smaller pair with three fingers under them. The book never
   gives their colour, so their chitin is plain. ---- */
const CHITIN = '#635d4f';
type MantisOpts = { head?: string; dreads?: boolean; wings?: boolean; heads?: boolean; crossbow?: boolean; flame?: boolean; small?: boolean; seed: number };
function mantis(o: MantisOpts): Vox {
  const v = new Vox(), c = CHITIN, d = twin(CHITIN), dark = '#47423a', blade = '#8a8270', hd = o.head ?? c, s = o.small ? 1 : 0;
  if (o.small) base(v, 'stoneDark', 'stone', o.seed); else wideBase(v, -3, 10, o.seed, -6, 10);
  v.chunk = 0;
  // hunched, the small one carries everything lower and further forward
  const dz = -3 * s, dy = s;
  ellip(v, 3.5, s ? -1 : -3, 10, s ? 2.2 : 2.8, s ? 2.6 : 3.8, 2.2, (_x, y) => (y % 2 ? c : dark));   // the abdomen, banded
  for (const y of s ? [3, 0] : [4, 0, -4]) for (const [x0, dx] of [[2, -1], [5, 1]] as const) {   // the legs, a knee up, splayed
    v.set(x0 + dx, y, 10, dark); v.set(x0 + dx * 2, y, 11, dark); v.box(x0 + dx * 3, y, 5, x0 + dx * 3, y, 10, dark);
  }
  v.box(2, 2, 9 + dz + 2 * s, 5, 5, 14 + dz, c);                                               // the thorax, upright
  v.box(3, 3, 15 + dz, 4, 5, 15 + dz, d);                                                      // the neck, bare
  // the head: a flat triangle, wide at the brow, coming down to the jaws
  const z0 = 16 + dz, y0 = 3 + dy, y1 = 6 + dy;
  [1, 1, 2, 2, 3, 4, 4].forEach((w, i) => v.box(4 - w, y0, z0 + i, 3 + w, y1, z0 + i, hd));
  v.box(3, y1 + 1, z0, 4, y1 + 1, z0 + 1, '#2a2620');                                           // the jaws
  for (const x0 of [-1, 7]) { v.box(x0, y0 + 1, z0 + 4, x0 + 1, y1 + 1, z0 + 6, '#b9d6e6'); v.set(x0 + (x0 < 0 ? 1 : 0), y1 + 1, z0 + 6, 'white'); }   // compound eyes, bulging, mirrored
  // the blades, folded up in front of the chest; the small three-fingered arms under them
  for (const x0 of [0, 6]) {
    v.box(x0, 5, 13 + dz, x0 + 1, 7 + dy, 13 + dz, blade);                                     // out of the shoulder, forward
    v.box(x0, 8 + dy, 8 + dz + 2 * s, x0 + 1, 8 + dy, 13 + dz, blade);                         // the blade, hanging
    v.box(x0, 9 + dy, 9 + dz + 2 * s, x0 + 1, 9 + dy, 11 + dz, d);                             // the forearm, folded back up
    v.set(x0 + (x0 ? 0 : 1), 9 + dy, 12 + dz, d); v.set(x0 + (x0 ? 1 : 0), 9 + dy, 8 + dz + 2 * s, '#2a2620');   // spikes, a hook
    const ax = x0 ? 8 : -1;
    v.box(ax, 4, 10 + dz + s, ax, 6, 10 + dz + s, c); v.set(ax, 7, 9 + dz + s, d); v.set(ax, 7, 10 + dz + s, d);
  }
  if (o.dreads) for (const [x, y] of [[-1, 3], [-1, 5], [8, 3], [8, 5], [1, 2], [6, 2], [3, 2]] as const) {   // antennae hanging like dreadlocks
    const top = z0 + 6; v.set(x < 0 ? 0 : x > 7 ? 7 : x, y, top + 1, hd); v.box(x, y, top - 7, x, y, top, '#2e2a2c');
  }
  if (o.wings) { v.box(1, -6, 13, 6, 0, 13, 'mist'); v.box(0, -5, 10, 0, 0, 12, 'mist'); v.box(7, -5, 10, 7, 0, 12, 'mist'); }   // translucent, folded
  if (o.heads) {
    // the heads of her kills, all over her back, two at her shoulders like a pair of headphones
    const tones = ['#c9a27e', '#8f9a76', '#b9b0a0', '#7a5a42', '#a8806a'];
    for (const [i, [x, y, z]] of ([[1, -5, 12], [4, -6, 11], [2, -3, 13], [5, -3, 12], [1, -1, 12], [4, -1, 13], [3, 0, 14], [0, -3, 11], [6, -5, 11]] as const).entries()) {
      v.box(x, y, z, x + 1, y + 1, z + 1, tones[i % tones.length]); v.set(x, y + 1, z + 1, '#2a201c');
    }
    for (const [x0, t] of [[0, 0], [6, 2]] as const) { v.box(x0, 2, 14, x0 + 1, 4, 16, tones[t]); v.box(x0, 2, 17, x0 + 1, 4, 17, PLAIN_HAIR); v.set(x0 + (x0 ? 1 : 0), 5, 15, '#2a201c'); v.set(x0 + (x0 ? 0 : 1), 5, 15, '#2a201c'); v.set(x0 + (x0 ? 1 : 0), 5, 14, '#5a2a24'); }
  }
  if (o.crossbow) { v.box(8, 4, 10, 8, 10, 10, 'woodDark'); v.box(7, 10, 10, 9, 10, 10, 'metalDark'); v.set(7, 9, 11, 'metalDark'); v.set(9, 9, 11, 'metalDark'); }
  if (o.flame) {
    // flames off the end of her, a newborn halfway out of them
    for (const [x, y, z] of [[3, -7, 9], [4, -7, 10], [2, -7, 11], [5, -6, 12], [3, -8, 12], [4, -8, 13], [2, -6, 13], [3, -7, 14], [5, -8, 10], [4, -6, 15]] as const) v.set(x, y, z, z > 12 ? 'flame' : 'ember');
    v.box(3, -8, 8, 4, -9, 9, '#d9cfb8'); v.set(3, -10, 9, '#d9cfb8'); v.set(4, -10, 10, '#b9d6e6');
    for (const [x, y, z] of [[1, 4, 9], [6, 2, 14], [0, -2, 12], [7, -4, 13], [2, 6, 16]] as const) v.set(x, y, z, 'ember');
  }
  return v;
}
/* ---- the Dark Hive's hunter, as first seen close (5:35): a big praying mantis, her back covered with the heads of her
   kills like round pustules in every state of decay, the two newest on her shoulders flanking her bare neck like
   headphones, a crossbow; she shakes every head off to make herself lighter at 5:38 ---- */
export const vrah = (stage: 'heads' | 'shed') => mantis({ heads: stage === 'heads', crossbow: true, seed: 74 });
/* ---- the hive queen (5:33): the size of a mantaur, a head like the talk-show host's bug helmet, mirrored compound eyes,
   antennae hanging like dreadlocks, folded blade arms and three-fingered arms under them, six legs, translucent wings
   folded over an armoured abdomen ---- */
export const circeTook = () => mantis({ head: '#1e1c1f', dreads: true, wings: true, seed: 75 });
/* ---- the merchant (5:38): a small, male mantis, hunched over and shivering, barely recognisable as the same race ---- */
export const edict = () => mantis({ small: true, seed: 76 });

/* ---- the nature god: first seen (5:61) as a deranged-looking squirrel with antlers, no bigger than a frost maiden,
   covered in the pieces of the hunter it burst out of; Mordecai has it usually depicted moss-covered (5:55). In the
   last fight (5:74) it looks exactly like the hive queen whose body it is, aflame, a newborn mantis halfway out ---- */
export function diwata(stage: 'squirrel' | 'mantis') {
  if (stage === 'mantis') return mantis({ head: '#1e1c1f', dreads: true, wings: true, flame: true, seed: 77 });
  const v = new Vox(), fur = '#7d6e60', dark = '#5e5248', moss = 'lichen', gore = '#9a2a24', antler = '#bfa27a';
  wideBase(v, -3, 10, 78, -4, 10);
  v.chunk = 0;
  const coat = (x: number, y: number, z: number) => ((x <= 1 && z >= 8 && z <= 11) || (z >= 18 && y <= 4) || (x >= 6 && y <= 3 && z >= 7 && z <= 10) ? moss : fur);
  round(v, 0, 7, 0, 6, 5, 12, coat);                                                           // sitting up
  round(v, -1, 8, 2, 8, 12, 19, coat);                                                         // the head
  v.box(2, 9, 13, 5, 9, 15, twin(fur)); v.box(3, 10, 14, 4, 10, 14, '#3a2a28');                // the muzzle and nose
  v.box(3, 9, 12, 4, 9, 12, 'white');                                                          // the front teeth
  for (const x of [1, 5]) { v.box(x, 9, 16, x + 1, 9, 17, 'white'); v.set(x + (x < 4 ? 1 : 0), 9, 16, 'black'); }   // eyes wide, deranged
  for (const x of [0, 7]) { v.box(x, 4, 20, x, 5, 21, fur); v.set(x, 4, 22, dark); }           // tufted ears
  for (const [x0, dx] of [[1, -1], [6, 1]] as const) {                                         // antlers, branching
    v.box(x0, 5, 20, x0, 5, 22, antler); v.set(x0 + dx, 5, 23, antler); v.set(x0 + dx * 2, 5, 24, antler); v.set(x0 + dx * 2, 5, 25, antler);
    v.set(x0, 5, 23, antler); v.set(x0, 6, 24, antler); v.set(x0 + dx * 3, 5, 23, antler); v.set(x0 + dx * 3, 4, 24, antler);
  }
  // the bushy tail, up the back and curled over
  for (const [y, z, r] of [[-1, 7, 2.2], [-2.5, 11, 2.6], [-3, 15, 2.8], [-2.5, 19, 2.6], [-1, 22, 2.3], [1, 23.5, 1.8]] as const) ellip(v, 3.5, y, z, r, r * 0.8, r * 0.9, (x, yy, zz) => (zz > 21 ? dark : (x + zz) % 5 === 0 ? moss : fur));
  v.box(1, 7, 5, 2, 8, 6, twin(fur)); v.box(5, 7, 5, 6, 8, 6, twin(fur)); v.box(1, 7, 10, 2, 8, 11, twin(fur)); v.box(5, 7, 10, 6, 8, 11, twin(fur));   // paws
  for (const [x, y, z] of [[0, 4, 13], [7, 3, 9], [2, 7, 8], [6, 7, 12], [-1, 5, 17], [8, 6, 15], [4, 1, 20], [3, 0, 11], [1, -3, 16], [5, 8, 7]] as const) v.set(x, y, z, gore);   // pieces of hunter
  v.set(6, 7, 7, 'metalDark'); v.set(0, 6, 11, 'metalDark');                                    // and of his armour
  return v;
}

/* ---- the goddess of childbirth: first seen (6:17) in her sponsor's own form, a hairy alien of about five feet, coarse
   blue and black hair, six black eyes in a V on a bug-like face, four three-fingered arms, a long thin neck, a thin
   body with a pregnant belly, a blood-red toga and a laurel leaf on her head; her true form (7:86) a large, pillowy
   humanoid woman, olive skin, dark eyes, dark curly hair with flowers in it, white and gold robes, sandals, the lower
   half of her face alien, almost like a gray Nullian's ---- */
export function eileithyia(stage: 'toga' | 'true-form') {
  if (stage === 'true-form') {
    const skin = '#b8966a', robe = '#f1ede6';
    const v = person({ skin, hair: { color: '#24191a', style: 'curly' }, eyes: '#1b1210', top: robe, outfit: 'robe', bottom: robe, feet: twin(skin), seed: 79 });
    v.box(0, 2, 9, 7, 7, 12, robe); v.box(-1, 3, 10, 0, 6, 13, twin(robe)); v.box(7, 3, 10, 8, 6, 13, twin(robe));   // pillowy
    v.box(0, 7, 9, 7, 7, 9, 'accent'); v.box(3, 7, 10, 4, 7, 13, 'accent'); v.box(0, 2, 5, 7, 7, 5, robe); v.box(0, 7, 5, 7, 7, 5, 'accent');   // the gold
    v.box(1, 7, 14, 6, 7, 16, '#a3a4a0'); v.box(2, 8, 14, 5, 8, 15, '#a3a4a0'); v.clear(0, 7, 14, 0, 7, 14); v.clear(7, 7, 14, 7, 7, 14);   // the lower face, alien
    for (const [x, y, z] of [[1, 6, 22], [5, 7, 21], [6, 3, 23], [2, 3, 23]] as const) { v.set(x, y, z, 'white'); v.set(x, y, z + 1, 'white'); v.set(x + 1, y, z, 'accent'); }   // flowers in her hair
    v.box(1, 5, 5, 2, 7, 5, '#7a4a2a'); v.box(5, 5, 5, 6, 7, 5, '#7a4a2a');                       // sandals
    return v;
  }
  const v = new Vox(), blue = '#3b5cab', black = '#17161d', toga = '#8a1418';
  base(v, 'stoneDark', 'stone', 80);
  v.chunk = 0;
  v.box(2, 3, 5, 2, 5, 8, black); v.box(5, 3, 5, 5, 5, 8, black); v.box(2, 4, 5, 2, 6, 5, blue); v.box(5, 4, 5, 5, 6, 5, blue);   // thin legs
  v.box(2, 3, 9, 5, 5, 13, toga); v.box(2, 6, 8, 5, 7, 11, toga); v.box(1, 2, 6, 6, 6, 9, toga);   // a thin body, the belly out, the toga over it
  v.box(1, 3, 12, 1, 5, 13, toga);                                                              // over one shoulder
  for (const [x, z0] of [[1, 10], [6, 10]] as const) v.box(x, 3, z0, x, 5, 13, x < 4 ? blue : black);   // the upper arms
  v.box(0, 4, 9, 0, 6, 11, black); v.box(7, 4, 9, 7, 6, 11, blue);                              // and the lower
  v.box(0, 6, 8, 0, 7, 8, blue); v.box(7, 6, 8, 7, 7, 8, black); v.box(1, 6, 12, 1, 7, 12, black); v.box(6, 6, 12, 6, 7, 12, blue);   // three-fingered hands
  v.box(3, 3, 14, 4, 4, 16, blue);                                                              // the long, thin neck
  v.box(0, 0, 17, 7, 7, 23, blue); v.box(0, 0, 21, 7, 3, 24, black); v.box(0, 0, 17, 7, 1, 23, black); v.box(0, 2, 19, 0, 5, 23, black); v.box(7, 2, 19, 7, 5, 23, black);   // the hairy head, blue in front, black behind
  for (const [x, y, z] of [[-1, 3, 20], [8, 4, 21], [2, -1, 22], [5, -1, 19], [-1, 5, 18], [8, 2, 18], [4, 2, 25]] as const) v.set(x, y, z, x % 2 ? black : blue);   // coarse
  for (const [x, z] of [[1, 22], [6, 22], [2, 21], [5, 21], [3, 20], [4, 20]] as const) v.set(x, 7, z, '#0c0b10');   // six black eyes, in a V
  v.box(3, 8, 17, 4, 8, 18, twin(blue));
  for (let x = -1; x <= 8; x++) for (let y = -1; y <= 8; y++) if ((x === -1 || x === 8 || y === -1 || y === 8) && (x + y) % 2 === 0) v.set(x, y, 23, x === -1 || x === 8 ? 'leaf' : 'leafLight');   // the laurel
  return v;
}

/* ---- the allosaurus: at 5:28 only a big dinosaur girl in a pink boa with a spent wand; first seen (5:52) fifteen feet
   tall and lizard-like, not feathered, thick alligator skin between green and dusty brown, ridged bumps along her and
   humps over her eyes like horns, a battered pink tiara grown into her head, a bloody, nearly bare boa, a pink
   blood-soaked tutu, a star-tipped wand glowing faint red in a three-fingered claw ---- */
export function bigTina(stage: 'boa' | 'ballerina') {
  const full = stage === 'ballerina', hide = full ? '#6f6a45' : '#5f5c55', ridge = twin(full ? '#57532f' : '#48463f'), pink = '#ee7fb4', blood = '#7d1b17';
  const v = new Vox();
  wideBase(v, -3, 11, 81, -7, 12);
  v.chunk = 0;
  for (const x0 of [0, 5]) { v.box(x0, 0, 6, x0 + 2, 3, 10, twin(hide)); v.box(x0, 1, 5, x0 + 2, 5, 5, twin(hide)); v.set(x0, 6, 5, 'bone'); v.set(x0 + 2, 6, 5, 'bone'); v.set(x0 + 1, 6, 5, 'bone'); }   // thick legs, clawed feet
  v.box(0, -2, 9, 7, 5, 14, hide); v.box(1, 3, 12, 6, 7, 16, hide);                           // the body, leaning forward
  v.box(2, -6, 9, 5, -3, 12, hide); v.box(3, -9, 8, 4, -7, 10, hide); v.set(3, -10, 8, hide);   // the tail
  // the head, huge, forward over the chest; a long jaw full of teeth
  v.box(0, 4, 17, 7, 11, 23, hide); v.box(1, 9, 15, 6, 12, 16, hide);
  v.box(1, 12, 17, 6, 12, 17, '#2a1414'); for (const x of [1, 3, 5]) v.set(x, 12, 16, 'bone'); for (const x of [2, 4, 6]) v.set(x, 12, 18, 'bone');
  v.box(0, 12, 18, 7, 12, 19, hide);
  for (const x of [1, 6]) { v.set(x, 11, 21, 'black'); v.set(x, 11, 20, '#e8c21c'); }       // reptilian eyes
  v.box(1, 10, 23, 2, 11, 24, ridge); v.box(5, 10, 23, 6, 11, 24, ridge);                     // the humps over her eyes
  for (const [x, y, z] of [[3, 2, 15], [4, 0, 15], [3, -2, 15], [4, -4, 13], [3, -6, 13], [4, 6, 24], [3, 8, 24], [4, 4, 24]] as const) v.set(x, y, z, ridge);   // ridged bumps
  v.box(2, 3, 13, 2, 5, 13, ridge); v.box(5, -1, 14, 5, 1, 14, ridge);
  for (const [x, y] of [[0, 8], [7, 8]] as const) { v.box(x, y, 13, x, y + 1, 13, twin(hide)); v.set(x, y + 2, 12, 'bone'); v.set(x, y + 2, 13, 'bone'); }   // small three-fingered arms
  // the wand in her right claw, its star at the end (glowing red once it is seen close)
  v.box(8, 10, 11, 8, 10, 14, full ? 'rail' : '#b3b7bd');
  if (full) for (const [x, z] of [[8, 15], [7, 15], [9, 15], [8, 16], [8, 14]] as const) v.set(x, 10, z + 1, z === 15 && x === 8 ? 'ember' : 'red');
  // the boa: pink feathers round her neck, nearly bare and bloody once she is seen close
  for (let x = -1; x <= 8; x++) for (let y = 3; y <= 10; y++) {
    if (!(x === -1 || x === 8 || y === 10 || y === 3)) continue;
    if (full && (x * 3 + y) % 3 === 0) continue;
    v.set(x, y, 16, full && (x + y) % 4 === 1 ? blood : pink);
  }
  if (full) {
    for (const [z, r] of [[10, 1], [9, 2]] as const) for (let x = -r; x <= 7 + r; x++) for (let y = -2 - r; y <= 5 + r; y++) if ((x === -r || x === 7 + r || y === -2 - r || y === 5 + r) && (z === 10 || (x + y) % 2 === 0)) v.set(x, y, z, (x + y + z) % 4 ? pink : blood);   // the tutu, a ruffle
    v.box(0, -2, 11, 7, 5, 11, pink); for (const [x, y] of [[0, 5], [7, 1], [3, 5], [7, -2]] as const) v.set(x, y, 11, blood);
    for (const [x, z] of [[1, 25], [3, 26], [5, 25], [6, 24]] as const) v.set(x, 7, z, '#d978a6'); v.box(1, 7, 24, 5, 7, 24, '#d978a6'); v.set(3, 7, 25, '#e8a0c0');   // the tiara, cockeyed
  }
  return v;
}

/* ---- the raptor pack leader (5:11): a big, battle-scarred velociraptor, lighter than Mongo, pink and blue feathers, a
   jagged scar the length of her face, the left eye gone, her beak pitted, ten-inch claws. Turned back into a bear by a
   potion (5:73), very pregnant (5:74), the paper bubbles of her costume still round her neck; one-eyed (7:59); old,
   scarred and tired under an eyepatch, her newborn twins on her chest, neither bear nor raptor (7:82) ---- */
export function kiwi(stage: 'raptor' | 'ursine' | 'one-eyed' | 'twins') {
  if (stage !== 'raptor') return bear({ fur: '#6e5442', belly: stage !== 'twins', bubbles: stage === 'ursine', oneEye: stage !== 'ursine', patch: stage === 'twins', twins: stage === 'twins', seed: 82 });
  const v = new Vox(), pink = '#e8a2bc', blue = '#8fb4e2', scar = '#a8566e', beak = '#8c7c68', claw = '#efe6d2';
  wideBase(v, -3, 10, 83, -8, 12);
  v.chunk = 0;
  for (const x0 of [1, 5]) { v.box(x0, 0, 7, x0 + 1, 2, 10, twin(pink)); v.box(x0, 1, 5, x0 + 1, 4, 6, twin(pink)); v.set(x0, 5, 5, claw); v.set(x0 + 1, 5, 6, claw); }   // legs, the sickle claws up
  v.box(0, -3, 9, 7, 4, 13, pink); v.box(1, 3, 12, 6, 6, 15, pink); v.box(0, -3, 13, 7, 1, 13, blue);   // the body, blue down the back
  v.box(2, -7, 10, 5, -4, 13, pink); v.box(3, -9, 11, 4, -8, 13, pink); v.box(3, -11, 12, 4, -10, 14, blue); v.box(2, -8, 14, 5, -5, 14, blue);   // the tail, held out stiff, feathered
  v.box(1, 3, 15, 6, 9, 21, pink); v.box(1, 2, 21, 6, 5, 22, blue); v.box(2, 1, 22, 5, 3, 23, blue); v.set(3, 0, 23, blue); v.set(4, 0, 22, blue);   // the head, a blue crest swept back
  v.box(2, 10, 15, 5, 13, 18, pink); v.box(2, 14, 15, 5, 15, 17, beak); v.set(2, 15, 17, '#6a5c4c'); v.set(4, 14, 15, '#6a5c4c'); v.set(5, 15, 16, '#6a5c4c');   // the long snout, the pitted beak
  v.box(2, 10, 16, 5, 13, 16, '#2a1414'); for (const y of [10, 12]) { v.set(2, y, 15, '#efe6d2'); v.set(5, y + 1, 15, '#efe6d2'); }   // the jaw, its teeth
  v.box(5, 9, 19, 5, 9, 20, 'black'); v.box(7, 6, 19, 7, 7, 20, 'black');                                                // her one eye
  for (const [x, y, z] of [[1, 9, 21], [2, 9, 20], [2, 9, 19], [2, 9, 18], [2, 10, 18], [3, 11, 18], [3, 12, 18], [3, 13, 18], [4, 14, 17]] as const) v.set(x, y, z, scar);   // the scar, the length of her face, through the left eye
  for (const x0 of [-1, 8]) { v.box(x0, 2, 10, x0, 6, 13, blue); v.box(x0, 7, 11, x0, 7, 12, claw); v.set(x0, 8, 11, claw); v.set(x0, 8, 13, claw); }   // feathered arms, long claws
  return v;
}
/* the bears (ursine): a round body, a round head with small round ears and a muzzle; the book gives no fur colour */
type BearOpts = { fur: string; apron?: string; cubs?: boolean; belly?: boolean; bubbles?: boolean; oneEye?: boolean; patch?: boolean; twins?: boolean; seed: number };
function bear(o: BearOpts): Vox {
  const v = new Vox(), f = o.fur, muzzle = '#a88a6c', limb = twin(f);
  base(v, 'stoneDark', 'stone', o.seed);
  v.chunk = 0;
  head(v, f);
  v.box(2, 8, 15, 5, 9, 17, muzzle); v.box(3, 9, 17, 4, 9, 17, '#1b1714');                     // the muzzle, the nose
  eyes(v, 'black', 18, o.oneEye ? [5] : [2, 5], 2);
  if (o.oneEye && !o.patch) v.box(1, 7, 18, 3, 7, 19, twin(muzzle));                              // the left eye gone
  if (o.patch) { v.box(1, 7, 18, 3, 7, 19, '#1b1714'); v.box(0, 7, 20, 7, 7, 20, '#1b1714'); v.box(-1, 2, 20, -1, 6, 20, '#1b1714'); v.box(8, 2, 20, 8, 6, 20, '#1b1714'); }
  if (o.oneEye) for (const [x, z] of [[1, 21], [2, 20], [3, 17], [3, 16]] as const) v.set(x, 7, z, '#8a6a5a');   // scarred
  for (const x0 of [-1, 6]) { v.box(x0, 2, 21, x0 + 2, 3, 23, f); v.set(x0 === -1 ? 0 : 7, 3, 22, muzzle); }   // round ears
  v.box(0, 1, 8, 7, 7, 13, f); v.box(-1, 2, 9, -1, 6, 13, limb); v.box(8, 2, 9, 8, 6, 13, limb);   // a round body, thick arms
  v.box(1, 2, 5, 2, 6, 7, limb); v.box(5, 2, 5, 6, 6, 7, limb); v.box(1, 6, 5, 2, 7, 5, muzzle); v.box(5, 6, 5, 6, 7, 5, muzzle);   // short legs
  if (o.belly) { v.box(1, 8, 8, 6, 8, 12, twin(f)); v.box(2, 9, 9, 5, 9, 11, twin(f)); }        // very pregnant
  if (o.bubbles) for (let x = -1; x <= 8; x++) for (let y = 0; y <= 8; y++) if ((x === -1 || x === 8 || y === 8 || y === 0) && (x + y) % 2 === 0) v.set(x, y, 14, 'white');   // paper bubbles, a pearl necklace
  if (o.apron) { v.box(1, 8, 7, 6, 8, 13, o.apron); v.box(0, 7, 13, 7, 7, 13, twin(o.apron)); v.set(0, 8, 13, o.apron); v.set(7, 8, 13, o.apron); }
  const cub = (x0: number, y0: number, z0: number) => {                                         // a cub held to the chest
    v.box(x0, y0, z0, x0 + 2, y0 + 2, z0 + 2, f); v.set(x0, y0 + 1, z0 + 3, f); v.set(x0 + 2, y0 + 1, z0 + 3, f);
    v.set(x0 + 1, y0 + 3, z0 + 1, muzzle); v.set(x0, y0 + 2, z0 + 2, 'black'); v.set(x0 + 2, y0 + 2, z0 + 2, 'black');
  };
  if (o.cubs) { cub(-1, 8, 9); cub(6, 8, 10); }
  if (o.twins) {
    // two newborns, neither bear nor raptor, bulbous eyes that do not match
    for (const [x0, z0] of [[0, 10], [5, 11]] as const) {
      v.box(x0, 8, z0, x0 + 2, 9, z0 + 1, '#b98a78'); v.set(x0 + 1, 10, z0, '#d9a8b0'); v.set(x0 + 1, 7, z0 + 2, '#b98a78');
      v.set(x0, 10, z0 + 1, 'black'); v.box(x0 + 2, 10, z0 + 1, x0 + 2, 10, z0 + 2, 'black');
    }
  }
  return v;
}
/* ---- the ursine barmaid (5:44): a large bear in an apron, her two small cubs clutched in her arms ---- */
export const prudence = () => bear({ fur: '#7a5a3e', apron: PLAIN_TOP, cubs: true, seed: 84 });

/* ---- the tattooist: a regular giant tortoise like one in any zoo, a hundred and fifty years old, who talks (5:25); he
   pokes the tattoos in with a silver, needle-like stick held in his mouth (5:29) ---- */
export function edgar(stage: 'tortoise' | 'needle') {
  const v = new Vox(), shellA = '#5f5444', shellB = '#4a4136', rim = '#3a332a', skin = '#8c8674', fold = twin('#6e6a5a');
  wideBase(v, -3, 10, 85, -2, 13);
  v.chunk = 0;
  for (const [x, y] of [[-1, 0], [7, 0], [-1, 6], [7, 6]] as const) { v.box(x, y, 5, x + 2, y + 2, 7, skin); v.box(x, y + 2, 5, x + 2, y + 2, 5, fold); }   // stumpy, wrinkled legs
  v.box(0, 0, 6, 7, 8, 7, '#a89a78');                                                           // the plastron
  ellip(v, 3.5, 4, 7, 5.4, 5.4, 7.4, (x, y, z) => (z < 7 ? null : z === 7 ? rim : ((Math.floor((x + 2) / 3) + Math.floor((y + 2) / 3) + (z > 11 ? 1 : 0)) % 2 ? shellA : shellB)));   // the domed shell, plate by plate
  v.box(2, 9, 8, 5, 10, 10, skin);                                                              // the neck
  v.box(1, 10, 9, 6, 14, 14, skin);                                                             // an old, heavy head
  v.box(1, 14, 10, 6, 14, 10, '#4f4a3e'); v.box(2, 14, 12, 2, 14, 13, 'black'); v.box(5, 14, 12, 5, 14, 13, 'black');
  v.box(1, 14, 14, 6, 14, 14, fold); v.set(1, 14, 11, fold); v.set(6, 14, 11, fold); v.box(1, 11, 9, 6, 11, 9, fold);   // the wrinkles
  if (stage === 'needle') { v.box(3, 15, 10, 3, 18, 10, '#cfd4da'); v.set(3, 19, 10, 'white'); }   // the silver tattoo needle
  return v;
}

/* ---- the announcer, first seen at the warlords' table (6:21): a tiny kua-tin with long, droopy whiskers like a
   catfish, dull scales, buggy eyes, little arms, older-looking and exhausted; a rebreather round her gills when she is
   really in the room. Her clothes are never described. ---- */
export function cascadia() {
  const v = new Vox(), scale = '#6f8a7a', dull = twin('#6f8a7a'), fin = '#8aa092';
  base(v, 'stoneDark', 'stone', 86);
  v.chunk = 0;
  body(v, { top: PLAIN_TOP, skin: scale, bottom: PLAIN_BOTTOM, feet: twin(scale) });
  head(v, scale);
  for (const [x, z] of [[1, 20], [3, 19], [5, 20], [6, 17], [1, 16], [4, 15]] as const) v.set(x, 7, z, dull);   // a dull sheen of scales
  for (const x0 of [0, 6]) { v.box(x0, 7, 17, x0 + 1, 8, 19, '#e6e2d0'); v.set(x0 + (x0 ? 0 : 1), 8, 18, 'black'); v.set(x0 + (x0 ? 0 : 1), 8, 17, 'black'); }   // buggy eyes
  v.box(1, 7, 19, 6, 7, 19, dull); v.set(2, 7, 16, dull); v.set(5, 7, 16, dull);                // tired, heavy lids
  v.box(2, 7, 15, 5, 7, 15, '#2f4438');                                                         // a wide mouth
  for (const [x, dx] of [[1, -1], [6, 1]] as const) { v.set(x, 8, 15, fin); v.set(x + dx, 8, 14, fin); v.box(x + dx, 8, 10, x + dx, 8, 13, fin); v.set(x + dx * 2, 8, 10, fin); }   // long, droopy whiskers
  v.box(3, 2, 22, 4, 5, 23, fin); v.set(-1, 4, 18, fin); v.set(8, 4, 18, fin);                 // a fin on top, fins at the sides
  v.box(-1, 1, 14, -1, 6, 15, 'metalDark'); v.box(8, 1, 14, 8, 6, 15, 'metalDark'); v.box(0, 0, 14, 7, 0, 14, 'metalDark');   // the rebreather round her gills
  v.box(-1, 3, 14, -1, 4, 15, 'glassTeal'); v.box(8, 3, 14, 8, 4, 15, 'glassTeal');
  return v;
}

/* ---- the familiar: a Boer goat transformed by a pet biscuit (5:6), so black it drinks the light, ethereal black flames
   licking up off her ridged, hairy back, a stubby pair of wings, the heat of her in waves; much bigger by 5:49, the
   size of a large rhinoceros, a full set of black, smoking wings and a saddle ---- */
export function bianca(stage: 'stubby' | 'saddle') {
  const big = stage === 'saddle', v = new Vox(), coat = '#141117', ridge = '#241e26', horn = '#77707c', smoke = 'wingDark';
  wideBase(v, -3, 10, 87, -6, 12);
  v.chunk = 0;
  const g = big ? 1 : 0;
  for (const [x, y] of [[0, -4], [6, -4], [0, 3 + g], [6, 3 + g]] as const) { v.box(x, y, 5, x + 1, y + 1, 8, twin(coat)); v.box(x, y + 1, 5, x + 1, y + 1, 5, '#2b2730'); }   // legs, hooves
  v.box(0, -4 - g, 8, 7, 4 + g, 12 + g, coat);                                                   // the body
  v.box(3, -4 - g, 13 + g, 4, 3 + g, 13 + g, ridge);                                             // the ridged back
  v.box(3, -6 - g, 11, 4, -5 - g, 12, coat);                                                     // a short tail
  v.box(2, 4 + g, 11 + g, 5, 6 + g, 15 + g, coat);                                               // the neck
  v.box(1, 5 + g, 14 + g, 6, 10 + g, 19 + g, coat); v.box(2, 11 + g, 14 + g, 5, 12 + g, 16 + g, coat);   // the head, the long muzzle
  v.set(1, 10 + g, 17 + g, 'ember'); v.set(6, 10 + g, 17 + g, 'ember');                          // eyes, hot
  for (const x of [0, 7]) v.box(x + (x ? 1 : -1), 8 + g, 14 + g, x + (x ? 1 : -1), 9 + g, 17 + g, ridge);   // long, drooping ears
  for (const [x, dx] of [[2, -1], [5, 1]] as const) { v.set(x, 6 + g, 20 + g, horn); v.set(x, 5 + g, 21 + g, horn); v.set(x + dx, 4 + g, 21 + g, horn); }   // short, swept-back horns
  // ethereal black flames off her back, a little heat in them
  for (const [x, y, h] of [[1, -3, 3], [3, -1, 5], [5, -3, 2], [2, 1, 4], [6, 0, 3], [4, 2, 2], [1, 3, 2], [4, -4, 4], [6, 3, 3], [2, -2, 2], [5, 1, 4]] as const) {
    v.box(x, y, 13 + g, x, y, 12 + g + h, smoke); v.set(x + ((x + y) & 1 ? 1 : -1), y, 13 + g + h, smoke);
  }
  v.set(3, -1, 18 + g, 'ember'); v.set(2, 1, 17 + g, 'ember');
  if (!big) for (const x of [-1, 8]) v.box(x, 0, 11, x, 2, 13, ridge);                         // a stubby pair of wings
  else {
    for (const [x0, dx] of [[-1, -1], [8, 1]] as const) for (let i = 0; i < 5; i++) {           // a full set of black, smoking wings, raised
      const x = x0 + dx * i; v.box(x, -2 + (i >> 1), 12 + i, x, 3, 15 + i * 2, i === 4 ? ridge : coat);
      v.set(x, -2 + (i >> 1), 16 + i * 2, 'nightMist'); if (i > 1) v.set(x, 1, 17 + i * 2, 'nightMist');
    }
    v.box(1, -1, 14, 6, 2, 14, '#5c3a20'); v.box(1, 3, 14, 6, 3, 15, '#4a2e18'); v.box(0, 0, 10, 0, 1, 13, '#4a2e18'); v.box(7, 0, 10, 7, 1, 13, '#4a2e18');   // the saddle and its straps
  }
  return v;
}

/* ---- the former crawler on the panel (5:33): an older, heavily scarred, albino, bald moon elf, the muscles still
   bulging under his silk shirt ---- */
export function drick() {
  const skin = '#ecd8cd', shirt = PLAIN_TOP, scar = '#c58a84';
  const v = person({ skin, hair: { color: skin, style: 'bald' }, top: shirt, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 88 });
  v.box(-1, 3, 10, 0, 5, 13, twin(shirt)); v.box(7, 3, 10, 8, 5, 13, twin(shirt)); v.box(1, 7, 11, 6, 7, 13, shirt);   // the bulk under the shirt
  v.box(-1, 4, 9, 0, 5, 9, twin(skin)); v.box(7, 4, 9, 8, 5, 9, twin(skin));
  for (const [x, z] of [[2, 12], [4, 11], [5, 13]] as const) v.set(x, 8, z, '#7a7874');            // the silk's sheen
  elfEars(v, skin);
  for (const [x, y, z] of [[1, 7, 19], [1, 7, 18], [2, 7, 16], [3, 7, 15], [5, 7, 20], [6, 7, 19], [6, 7, 16], [7, 6, 21], [0, 5, 20], [4, 3, 21]] as const) v.set(x, y, z, scar);   // the scars
  v.box(2, 7, 19, 2, 7, 19, twin(skin)); v.box(5, 7, 19, 5, 7, 19, twin(skin));                // old, heavy brows
  return v;
}

/* ---- the pet show's tummy acher (5:63): as tall as Carl, a giant lumpy meatball, no arms, a pair of stubby legs, an
   enormous jagged mouth with a single tooth; reset to a meatball-sized baby (7:5); about three-quarters grown with a
   silver cap on his one round tooth (7:65); a red Rambo-style headband from 8:11 ---- */
export function rend(stage: 'meatball' | 'baby' | 'silver-tooth' | 'headband') {
  const v = new Vox(), meat = '#7a4a32', lump = twin('#5f3826'), mouth = '#2a1010';
  base(v, 'stoneDark', 'stone', 89);
  v.chunk = 0;
  const small = stage === 'baby', r = small ? 0.5 : stage === 'silver-tooth' ? 0.88 : 1;
  const cz = 7 + 7 * r, rz = 7 * r, rx = 5 * r, ry = 4.6 * r;
  for (const x0 of [1.5, 5.5]) v.box(Math.round(x0 - 0.5 - (small ? 0 : 0)), 3, 5, Math.round(x0 + (small ? -0.5 : 0.5)), 5, small ? 5 : 6, twin(meat));   // stubby legs
  ellip(v, 3.5, 4, cz, rx, ry, rz, (x, y, z) => (((x >> 1) * 5 + (y >> 1) * 3 + (z >> 1) * 7) % 6 === 0 ? lump : meat));
  // the mouth: carved across the front, jagged along its top
  const front = (x: number, z: number) => { for (let y = 12; y >= 0; y--) if (v.get(x, y, z)) return y; return -1; };
  const m0 = Math.round(cz - rz * 0.55), m1 = Math.round(cz + rz * 0.1);
  for (let x = Math.ceil(3.5 - rx * 0.85); x <= Math.floor(3.5 + rx * 0.85); x++) {
    const top = m1 + ((x & 1) ? 1 : 0);
    for (let z = m0; z <= top; z++) { const y = front(x, z); if (y >= 0) v.set(x, y, z, mouth); }
  }
  const ty = front(3, m1) >= 0 ? front(3, m1) : 7, tooth = stage === 'silver-tooth' || stage === 'headband' ? 'rail' : 'bone';
  v.box(3, ty, m1, 4, ty, small ? m1 : m1 + 1, tooth); v.set(3, ty + 1, m1, tooth);              // the one round tooth
  const ez = Math.round(cz + rz * 0.4);
  for (const x of [2, 5]) { const y = front(x, ez) + 1; v.set(x, y, ez, 'black'); v.set(x, y, ez + 1, 'white'); v.set(x + (x < 4 ? -1 : 1), y - 1, ez, 'white'); }   // eyes
  if (stage === 'headband') {
    const hz = Math.round(cz + rz * 0.62);
    for (const z of [hz, hz + 1]) for (let x = -2; x <= 9; x++) for (let y = -2; y <= 10; y++) if (v.get(x, y, z) && (!v.get(x + 1, y, z) || !v.get(x - 1, y, z) || !v.get(x, y + 1, z) || !v.get(x, y - 1, z))) v.set(x, y, z, '#c0222a');
    v.box(3, -2, hz - 3, 3, -2, hz - 1, '#c0222a'); v.box(4, -2, hz - 4, 4, -2, hz - 2, '#a01a20');   // its tails, behind
  }
  return v;
}

/* ---- the leader of the Dream, first seen at the warlords' table (6:21): an older, regal-looking, bald elf, pale like
   the rest of the dream elves, in a simple leather jerkin ---- */
export function epitomeTagg() {
  const skin = '#e6d2c2', jerkin = '#6b4a2e';
  const v = person({ skin, hair: { color: skin, style: 'bald' }, top: jerkin, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 90 });
  v.box(0, 3, 10, 0, 5, 13, twin(PLAIN_TOP)); v.box(7, 3, 10, 7, 5, 13, twin(PLAIN_TOP));       // the sleeves under it
  v.box(3, 7, 10, 4, 7, 13, '#4a3220'); for (const z of [11, 13]) { v.set(2, 7, z, '#4a3220'); v.set(5, 7, z, '#4a3220'); }   // the jerkin's lacing
  elfEars(v, skin);
  for (const [x, z] of [[1, 16], [6, 16], [2, 20], [5, 20], [3, 21]] as const) v.set(x, 7, z, twin('#d8c8ba'));   // the lines of age
  v.box(1, 7, 19, 2, 7, 19, '#c9b4a2'); v.box(5, 7, 19, 6, 7, 19, '#c9b4a2'); v.box(3, 7, 15, 4, 7, 15, '#b89a88');   // a level, bored brow, a thin mouth
  return v;
}

/* ---- the Atoll beastmaster at the masquerade (5:67): tall and thin, four arms with three fingers on each hand, a thin
   shovel-like face with high-set eyes, wrinkly, dark, ape-like skin, no mouth, about a dozen nostril holes, random
   thick whiskers, a thick leather trap bandolier hung loose round his waist, little empty chains off it ---- */
export function zabit() {
  const skin = '#4b3b31', crease = twin('#3a2c24');
  const v = person({ skin, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 91 });
  for (const x of [2, 5]) { v.set(x, 7, 17, skin); v.set(x, 7, 18, skin); v.box(x, 7, 19, x, 7, 20, '#e8d8a0'); v.set(x, 7, 20, 'black'); }   // eyes set high
  v.box(1, 8, 14, 6, 9, 16, skin); v.box(2, 10, 14, 5, 10, 15, skin);                            // the shovel of a face
  for (const [x, y, z] of [[2, 10, 15], [4, 10, 15], [3, 10, 15], [5, 10, 15], [1, 9, 16], [3, 9, 16], [5, 9, 16], [2, 8, 16], [4, 8, 16], [6, 8, 16], [6, 9, 16], [1, 8, 16]] as const) v.set(x, y, z, '#1b1310');   // a dozen nostrils, on top of it
  for (const [x, z] of [[1, 18], [6, 18], [2, 21], [5, 21], [1, 20], [6, 20], [3, 17], [4, 17]] as const) v.set(x, 7, z, crease);   // wrinkles
  for (const [x, y, z] of [[-1, 8, 15], [-2, 9, 16], [8, 8, 15], [9, 9, 14], [-1, 8, 14], [8, 9, 16]] as const) v.set(x, y, z, '#8a8278');   // thick whiskers
  v.box(-1, 3, 8, -1, 5, 11, twin(PLAIN_TOP)); v.box(8, 3, 8, 8, 5, 11, twin(PLAIN_TOP));     // the second pair of arms
  v.box(-1, 5, 7, -1, 7, 7, twin(skin)); v.box(8, 5, 7, 8, 7, 7, twin(skin)); v.set(-1, 7, 8, twin(skin)); v.set(8, 7, 8, twin(skin));   // three-fingered hands
  v.box(0, 1, 8, 7, 7, 9, '#6b4a2e');                                                           // the bandolier
  for (const [x, y, d] of [[1, 8, 2], [3, 8, 1], [5, 8, 2], [6, 8, 1], [0, 7, 1], [7, 3, 2]] as const) for (let i = 0; i < d; i++) v.set(x + (x === 0 ? -1 : x === 7 ? 1 : 0), y, 7 - i, i % 2 ? 'metalDark' : 'metal');   // empty chains
  return v;
}

/* ---- the vampire hunter's mount (5:46): an undead northropi, the same kind of thing as Quetzalcoatlus, huge, like a
   pelican crossed with a vulture, a beak like a jouster's lance as long as a man, blood-red eyes, twin talons ---- */
export function sierra() {
  const v = new Vox(), hide = '#5e5853', dark = '#433e3a', wing = '#4f4642', beak = '#8a8070', red = '#d1202a';
  wideBase(v, -4, 11, 92, -3, 14);
  v.chunk = 0;
  for (const x0 of [2, 5]) { v.box(x0, 2, 6, x0, 3, 8, dark); v.box(x0 - 1, 3, 5, x0 + 1, 5, 5, '#2a2427'); v.set(x0 - 1, 6, 5, '#d9cfae'); v.set(x0 + 1, 6, 5, '#d9cfae'); }   // talons
  v.box(1, 0, 8, 6, 5, 13, hide); v.box(2, -2, 9, 5, -1, 11, hide);                              // the body
  for (const [x0, dx] of [[0, -1], [7, 1]] as const) for (let i = 0; i < 4; i++) {               // the wings, half folded
    const x = x0 + dx * i; v.box(x, 0 + (i >> 1), 9 + i, x, 5, 13 + i, i === 3 ? dark : wing);
    v.set(x, 6, 13 + i, dark);
  }
  v.box(3, 5, 13, 4, 6, 16, hide);                                                               // the neck, up
  v.box(1, 4, 16, 6, 9, 21, hide); v.box(2, 2, 21, 5, 4, 23, dark); v.box(3, 1, 23, 4, 2, 25, dark);   // the head, a crest behind
  v.box(2, 10, 17, 5, 12, 18, beak); v.box(3, 13, 17, 4, 15, 18, beak); v.set(3, 16, 17, beak); v.set(3, 16, 18, '#6e665a');   // the lance of a beak
  v.box(2, 10, 16, 5, 11, 16, '#a89c8a');                                                        // the pouch under it
  v.box(1, 9, 19, 1, 9, 20, red); v.box(6, 9, 19, 6, 9, 20, red);                                // blood-red eyes
  return v;
}

/* ---- the caprid fable (5:43): the book never shows him, only his symbol, a picture of him that children are told to
   put in the window: a weird, satanic goat, a caricature of an adult caprid. So, as the System AI is its box, his
   figure is that symbol, a goat's head hanging over the ground like a ward ---- */
export function midnightEpicure() {
  const v = new Vox(), hide = '#2a2427', horn = '#d9cfae', glow = '#3a3236';
  base(v, 'stoneDark', 'stone', 93);
  v.chunk = 0;
  v.box(1, 1, 12, 6, 7, 19, hide); v.box(2, 8, 11, 5, 10, 15, hide); v.box(2, 11, 11, 5, 11, 13, twin(hide));   // the head, the long muzzle
  v.box(3, 11, 12, 4, 11, 12, '#141012');
  v.box(3, 9, 7, 4, 10, 10, hide); v.set(3, 10, 6, hide);                                          // the beard, hanging
  for (const x of [1, 5]) { v.box(x, 8, 16, x + 1, 8, 17, horn); v.box(x, 8, 17, x + 1, 8, 17, '#141012'); v.set(x + (x < 4 ? 1 : 0), 8, 17, horn); }   // slotted goat's eyes
  for (const [x0, dx] of [[0, -1], [7, 1]] as const) {                                            // ears out to the sides
    v.box(x0 + dx, 3, 15, x0 + dx * 2, 4, 16, hide);
  }
  for (const [x0, dx] of [[2, -1], [5, 1]] as const) {                                            // great horns, curling up and out
    for (const [i, z] of [[0, 20], [0, 21], [1, 22], [2, 23], [3, 23], [4, 22], [4, 21]] as const) v.set(x0 + dx * i, 4 - (i > 2 ? 1 : 0), z, horn);
    v.set(x0 + dx * 5, 3, 20, horn);
  }
  for (const [x, y] of [[2, 4], [5, 4], [3, 5], [4, 3]] as const) v.set(x, y, 5, glow);
  return v;
}

/* ---- the subjugated god, as first seen (8:92): a huge donkey in yellow-and-blue parade regalia, a round blanket
   covered in flowers, a headdress like a Vegas showgirl's, tack glittering with thousands of rhinestones, clawed
   talons like a crow's for feet, the red curve of a closed eye floating over her head ---- */
export function lamashtu() {
  const v = new Vox(), coat = '#8a8580', pale = '#c9c2b6', talon = '#3a3532', yellow = '#f2c81c', blue = '#2e5fc0';
  wideBase(v, -3, 10, 94, -7, 12);
  v.chunk = 0;
  for (const [x, y] of [[0, -5], [6, -5], [0, 3], [6, 3]] as const) {
    v.box(x, y, 6, x + 1, y + 1, 9, twin(coat));
    v.set(x, y + 2, 5, talon); v.set(x + 1, y + 2, 5, talon); v.set(x, y + 3, 5, talon); v.set(x + 1, y + 3, 5, talon); v.box(x, y, 5, x + 1, y + 1, 5, talon); v.set(x, y - 1, 5, talon);   // crow's talons
  }
  v.box(0, -5, 9, 7, 4, 14, coat); v.box(3, -7, 11, 4, -6, 13, coat); v.set(3, -8, 10, '#2b2724');   // the body, a tail
  v.box(2, 4, 13, 5, 6, 18, coat);                                                               // the neck
  v.box(1, 5, 17, 6, 9, 22, coat); v.box(2, 10, 17, 5, 11, 19, pale); v.box(3, 11, 17, 4, 11, 17, '#2b2724');   // the head, the pale muzzle
  v.box(1, 9, 20, 1, 9, 21, 'black'); v.box(6, 9, 20, 6, 9, 21, 'black');                        // eyes
  v.box(1, 6, 23, 2, 6, 26, coat); v.box(5, 6, 23, 6, 6, 26, coat); v.set(1, 6, 26, '#2b2724'); v.set(6, 6, 26, '#2b2724');   // the long ears
  // the showgirl headdress: a band and a fan of plumes
  v.box(0, 7, 22, 7, 9, 22, yellow); for (const x of [1, 3, 5]) v.set(x, 9, 22, 'white');
  for (const [x, z0, z1, c] of [[-2, 23, 24, blue], [-1, 23, 25, yellow], [0, 23, 26, blue], [3, 23, 27, yellow], [4, 23, 27, yellow], [7, 23, 26, blue], [8, 23, 25, yellow], [9, 23, 24, blue]] as const) v.box(x, 7, z0, x, 7, z1, c);
  // the round blanket over her back, covered in flowers; the glittering tack
  for (let x = -1; x <= 8; x++) for (let y = -5; y <= 4; y++) if (Math.hypot((x - 3.5) / 4.6, (y + 0.5) / 4.6) <= 1) v.set(x, y, 15, (x * 3 + y * 5) % 7 === 0 ? 'white' : (x * 5 + y) % 9 === 0 ? yellow : blue);
  for (const z of [13, 14]) { v.set(-1, -2, z, blue); v.set(8, -2, z, blue); v.set(-1, 2, z, yellow); v.set(8, 2, z, yellow); }
  for (const [x, y, z] of [[1, 10, 19], [6, 10, 19], [1, 8, 18], [6, 8, 18], [0, 4, 14], [7, 4, 14], [0, 5, 15], [7, 5, 16]] as const) v.set(x, y, z, z % 2 ? 'white' : 'beam');   // rhinestones
  for (const [x, z] of [[1, 30], [2, 29], [3, 29], [4, 29], [5, 29], [6, 30]] as const) v.set(x, 6, z, 'red');   // the closed eye
  return v;
}

/* ---- the mushroom crawler at the masquerade (5:70): a mushroom guy, the poofy, bulbous cap the cat's turban is said to
   look like; on stage the next night with an acoustic guitar missing a string (5:71). The book gives no colours. ---- */
export function horton(stage: 'mushroom' | 'guitar') {
  const stem = '#ddd2bc', cap = '#a8927a', gills = '#8a7764';
  const v = person({ skin: stem, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 95 });
  ellip(v, 3.5, 3.5, 20, 6.2, 6.2, 5.4, (_x, _y, z) => (z < 20 ? null : z === 20 ? gills : cap));   // the cap
  for (const [x, y, z] of [[1, 2, 25], [5, 5, 24], [6, 1, 23], [0, 5, 22], [3, 7, 23]] as const) v.set(x, y, z, twin(cap));
  if (stage === 'guitar') {
    v.box(0, 8, 8, 3, 8, 11, '#b07a40'); v.box(1, 9, 9, 2, 9, 10, '#b07a40'); v.set(1, 8, 10, '#2a1a10'); v.set(2, 8, 9, '#2a1a10');   // the body, its sound hole
    for (let i = 0; i < 5; i++) v.set(4 + i, 8, 11 + Math.floor(i * 0.6), '#6a4422');                  // the neck, across
    v.box(9, 8, 13, 9, 8, 14, '#3a2414');
    for (const z of [9, 11]) v.set(3, 9, z, 'rail');                                                      // a string short
  }
  return v;
}

/* Not drawn, and why (they stay the shadow figure):
   - viscount-fog: never physically described; he is dust before Carl meets him (5:47).
   - everly: only ever "a mantis" (7:16), no trait of her own.
   - volteeg: only "a gargoyle" with an ugly, misshapen head (7:35); nothing of his build or colour. */

export const BOOK5_FIGURES: Record<string, Record<string, () => Vox>> = {
  quasar: { suit: quasar },
  osvaldo: { boots: osvaldo },
  imogen: { gown: imogen },
  vrah: { heads: () => vrah('heads'), shed: () => vrah('shed') },
  diwata: { squirrel: () => diwata('squirrel'), mantis: () => diwata('mantis') },
  eileithyia: { toga: () => eileithyia('toga'), 'true-form': () => eileithyia('true-form') },
  'big-tina': { boa: () => bigTina('boa'), ballerina: () => bigTina('ballerina') },
  kiwi: { raptor: () => kiwi('raptor'), ursine: () => kiwi('ursine'), 'one-eyed': () => kiwi('one-eyed'), twins: () => kiwi('twins') },
  edgar: { tortoise: () => edgar('tortoise'), needle: () => edgar('needle') },
  cascadia: { rebreather: cascadia },
  bianca: { stubby: () => bianca('stubby'), saddle: () => bianca('saddle') },
  drick: { 'silk-shirt': drick },
  rend: { meatball: () => rend('meatball'), baby: () => rend('baby'), 'silver-tooth': () => rend('silver-tooth'), headband: () => rend('headband') },
  'epitome-tagg': { jerkin: epitomeTagg },
  'circe-took': { 'hive-queen': circeTook },
  zabit: { 'four-arms': zabit },
  'midnight-epicure': { symbol: midnightEpicure },
  lamashtu: { parade: lamashtu },
  edict: { hunched: edict },
  sierra: { vampire: sierra },
  prudence: { apron: prudence },
  horton: { mushroom: () => horton('mushroom'), guitar: () => horton('guitar') },
};
