import { Vox } from '../vox.ts';
import { base, head, eyes, body, twin, person, copyInto, wideBase, floating, H0, H1,
         PLAIN_HAIR, PLAIN_TOP, PLAIN_BOTTOM, PLAIN_SHOES } from './parts.ts';

/* ---- book 2's cast (the third floor), one builder per character, one look per stretch ----
   Same rules as cast.ts: each look is drawn from the edition's own description at
   its point, a colour the book leaves unsaid takes a plain one, and nothing here
   is a word. */

/* a rounded block: corners and edges off, so it reads soft */
function round(v: Vox, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, mat: string | ((x: number, y: number, z: number) => string)) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const ex = x === x0 || x === x1, ey = y === y0 || y === y1, ez = z === z0 || z === z1;
    if ((ex && ey) || (ex && ez) || (ey && ez)) continue;
    v.set(x, y, z, typeof mat === 'string' ? mat : mat(x, y, z));
  }
}
/* a straight run of voxels from a to b */
function seg(v: Vox, a: [number, number, number], b: [number, number, number], mat: string) {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
  for (let i = 0; i <= n; i++) v.set(Math.round(a[0] + (b[0] - a[0]) * i / n), Math.round(a[1] + (b[1] - a[1]) * i / n), Math.round(a[2] + (b[2] - a[2]) * i / n), mat);
}

/* ---- the circus elite (2:6): an extra-thin, almost naked half-elf, long pointed ears, short horns from her
   forehead, sharpened fangs, a mild glow off her skin, and from her toes to her face thick-lined, old-school
   tattoos of monsters (oni, little dragons, sharks, octopuses) that move about her; a thong and nothing else ---- */
export function signet() {
  const skin = '#e2e1e6', ink = '#1d1a22', red = '#c8302c', teal = '#2f8f86', gold = '#e0a21c', sea = '#4f7394';
  const v = person({ skin, top: twin(skin), sleeves: 'none', bottom: twin(skin), feet: null, seed: 71 });
  for (const x of [-1, 8]) { const o = x < 0 ? -1 : 1; v.box(x, 3, 17, x, 4, 18, skin); v.box(x + o, 3, 18, x + o, 3, 19, skin); v.set(x + 2 * o, 2, 20, skin); v.set(x + 3 * o, 2, 21, skin); }   // long, pointed ears
  for (const x of [1, 6]) { v.set(x, 7, H1 + 1, '#4a4044'); v.set(x, 6, H1 + 2, '#4a4044'); }   // short horns from the forehead
  v.set(2, 7, 15, '#3a1c24'); v.set(5, 7, 15, '#3a1c24'); v.set(3, 7, 15, 'white'); v.set(4, 7, 15, 'white'); v.set(3, 7, 14, '#3a1c24'); v.set(4, 7, 14, '#3a1c24');   // the fangs
  // the thong
  v.box(2, 6, 9, 5, 6, 9, PLAIN_BOTTOM); v.box(3, 6, 8, 4, 6, 8, PLAIN_BOTTOM); v.box(6, 2, 9, 6, 6, 9, PLAIN_BOTTOM);
  // the tattoos, from her toes to her face: creatures in bold colour, thick dark lines round them
  const paint = (pts: [number, number, number][], m: string) => { for (const [x, y, z] of pts) v.set(x, y, z, m); };
  paint([[4, 6, 13], [5, 6, 13], [4, 6, 12], [5, 6, 12]], red); paint([[3, 6, 11], [4, 6, 10], [5, 6, 10], [6, 6, 11]], ink);   // an octopus on her chest
  paint([[1, 6, 12], [1, 6, 13], [2, 6, 13]], teal); paint([[2, 6, 12]], ink);                                                     // a wave over her heart
  paint([[7, 3, 12], [7, 4, 12], [7, 5, 13], [7, 3, 10], [7, 4, 10]], teal); paint([[7, 4, 13], [7, 3, 11], [7, 5, 11], [7, 5, 12]], ink);      // a little dragon round her arm
  paint([[7, 2, 16], [7, 3, 16], [7, 2, 17], [7, 3, 17]], red); paint([[7, 2, 18], [7, 4, 18], [7, 4, 16], [7, 2, 15], [7, 3, 15], [7, 4, 17]], ink);   // an oni on her temple
  paint([[7, 5, 20], [7, 6, 20], [6, 7, 21]], sea); paint([[7, 6, 19], [7, 5, 21], [7, 7, 21]], ink);                                          // a shark's fin over her ear
  paint([[5, 7, 16], [6, 7, 16]], gold); paint([[1, 7, 16], [6, 7, 15]], ink);                              // scales and lines across her face
  paint([[6, 3, 6], [6, 4, 6], [6, 4, 7]], sea); paint([[6, 5, 6], [6, 5, 7], [6, 3, 7]], ink);                                                 // a shark down her leg
  paint([[1, 5, 6], [2, 5, 7]], gold); paint([[1, 5, 7], [2, 5, 6]], ink); paint([[5, 5, 7]], red); paint([[6, 5, 7], [5, 5, 6]], ink);          // a koi and a crab on her shins
  paint([[1, 7, 5], [5, 7, 5], [6, 6, 5]], ink); paint([[2, 6, 5]], teal);                                                                       // even her toes
  return v;
}

/* ---- the ringmaster (2:10): not a man with brambles but a giant pale green bush filling the centre ring,
   python-like roots running over the ground to every corner; beside it the weathered wooden cutout of him as he
   was, a dwarf in the red and black coattails and top hat of a ringmaster ---- */
export function grimaldi() {
  const v = new Vox(), leaf = '#a9c98a', leafDeep = '#8fb371', root = '#86935f';
  wideBase(v, -4, 16, 72, -2, 10);
  v.chunk = 0;
  const bush = (x: number, y: number, z: number) => ((x >> 2) + (y >> 2) * 2 + (z >> 2)) % 3 === 0 ? leafDeep : leaf;
  for (let x = -3; x <= 10; x++) for (let y = -1; y <= 8; y++) for (let z = 5; z <= 22; z++) {
    const d = ((x - 3.5) / 6.6) ** 2 + ((y - 3.5) / 4.9) ** 2 + ((z - 12.5) / 8.2) ** 2;
    if (d <= 1) v.set(x, y, z, bush(x, y, z));
  }
  for (const [cx, cy, cz, r] of [[1, 3, 20, 3], [6, 4, 21, 3], [4, 6, 17, 3], [-2, 4, 13, 2.6], [9, 3, 14, 2.6]] as const)   // lobes, so it is a shrub and not an egg
    for (let x = cx - 3; x <= cx + 3; x++) for (let y = cy - 3; y <= cy + 3; y++) for (let z = cz - 3; z <= cz + 3; z++) if (Math.hypot(x - cx, y - cy, z - cz) <= r) v.set(x, y, z, bush(x, y, z));
  // the roots, thick as pythons, along the floor
  for (const [x0, y0, x1, y1] of [[0, 7, -4, 10], [5, 8, 7, 10], [9, 5, 13, 7], [8, 1, 12, -1], [-2, 1, -4, -2]] as const) { seg(v, [x0, y0, 5], [x1, y1, 5], root); seg(v, [x0, y0, 6], [Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2), 6], root); }
  // the branch that twitched, reaching out over the ring
  seg(v, [9, 6, 15], [12, 8, 18], root); v.set(12, 8, 19, leaf); v.set(13, 8, 18, leaf);
  // the cutout of the dwarf ringmaster, on a stake, painted on its front
  v.box(14, 8, 5, 14, 8, 8, 'woodDark');
  const cut = (x0: number, x1: number, z0: number, z1: number, m: string) => { v.box(x0, 9, z0, x1, 9, z1, m); v.box(x0, 8, z0, x1, 8, z1, 'wood'); };
  cut(13, 15, 6, 7, '#1d1a1c');                  // boots and trousers
  cut(12, 16, 8, 11, '#b8262a');                 // the red coat
  v.box(12, 9, 8, 12, 9, 9, '#1d1a1c'); v.box(16, 9, 8, 16, 9, 9, '#1d1a1c');   // the black tails
  cut(13, 15, 12, 14, '#e3a77c'); v.set(13, 9, 13, 'black'); v.set(15, 9, 13, 'black');   // the face
  cut(12, 16, 15, 15, '#1d1a1c'); cut(13, 15, 16, 18, '#1d1a1c'); v.box(13, 9, 16, 15, 9, 16, '#b8262a');   // the top hat, a red band
  return v;
}

/* ---- the shepherd (3:32): about forty, a little plump, dark-haired, a long staff with a hook at the end;
   from 5:6 a vampire, floating, in robes, twin fangs when she smiles and blood running down her chin ---- */
export function miriam(stage: 'shepherd' | 'vampire') {
  const vamp = stage === 'vampire', skin = '#d9a882';
  const fig = person({ skin, hair: { color: '#2a1f1a', style: 'bob' }, top: PLAIN_TOP, outfit: vamp ? 'robe' : 'shirt', bottom: vamp ? PLAIN_TOP : PLAIN_BOTTOM, feet: PLAIN_SHOES, bare: vamp, seed: 73 });
  fig.box(2, 7, 10, 5, 7, 12, PLAIN_TOP);                                                   // a little plump
  fig.box(8, 5, 5, 8, 5, 20, 'wood'); fig.set(8, 6, 21, 'wood'); fig.set(8, 7, 21, 'wood'); fig.set(8, 8, 20, 'wood'); fig.set(8, 8, 19, 'wood');   // the crook
  if (!vamp) return fig;
  fig.box(3, 7, 15, 4, 7, 15, '#4a1a22'); fig.set(2, 7, 15, 'white'); fig.set(5, 7, 15, 'white');          // the fangs
  fig.set(4, 7, 14, '#b3202a'); fig.set(3, 7, 14, '#8a1820');                                              // blood down her chin
  return floating(fig, 3, 'redDark', 74);
}

/* ---- the goat crawler: one of the shepherd's burly brown and white Boer goats, now walking on two legs, decked
   out in armour and wielding a double-headed axe (2:14), named as that walking, talking goat creature at 3:3 ---- */
export function prepotente() {
  const v = new Vox(), brown = '#7a4a2c', fur = '#e8e2d6', armour = '#8a929a', horn = '#8a7a66';
  base(v, 'stoneDark', 'stone', 75);
  v.chunk = 0;
  head(v, brown);
  v.box(2, 8, 15, 5, 9, 18, brown); v.box(3, 10, 14, 4, 11, 16, brown); v.box(2, 10, 15, 5, 10, 16, brown);   // the long goat face, narrowing to the muzzle
  v.box(3, 12, 15, 4, 12, 16, '#3a2a22'); v.box(3, 11, 14, 4, 11, 14, '#4a3028');         // the nose and the mouth
  eyes(v, 'black', 18, [1, 6], 2);
  for (const x of [-1, 8]) { const o = x < 0 ? -1 : 1; v.box(x, 5, 16, x, 6, 19, '#5e3820'); v.box(x + o, 5, 13, x + o, 6, 17, '#5e3820'); }   // long ears, hanging down
  for (const x of [1, 6]) { const o = x < 4 ? -1 : 1; v.set(x, 6, 22, horn); v.set(x, 5, 23, horn); v.set(x, 4, 24, horn); v.set(x, 3, 25, horn); v.set(x, 2, 25, horn);
    v.set(x + o, 1, 24, horn); v.set(x + o, 0, 23, horn); v.set(x + 2 * o, -1, 22, horn); v.set(x + 2 * o, -1, 21, horn); }   // horns, rising and sweeping back
  body(v, { top: armour, skin: fur, bottom: 'metalDark', legs: fur, feet: '#2b2724' });
  v.box(-1, 2, 12, 0, 6, 13, '#6c747c'); v.box(7, 2, 12, 8, 6, 13, '#6c747c');            // pauldrons
  v.box(3, 6, 10, 4, 6, 12, '#b3b7bd');
  // the double-headed axe, upright in his right hand
  v.box(8, 5, 6, 8, 5, 20, 'woodDark');
  for (const [y0, y1, z] of [[2, 4, 16], [2, 4, 17], [2, 4, 18], [3, 4, 15], [3, 4, 19], [6, 8, 16], [6, 8, 17], [6, 8, 18], [6, 7, 15], [6, 7, 19]] as const) v.box(8, y0, z, 8, y1, z, 'rail');
  return v;
}

/* ---- a crocodilian head: a heavy skull, a long snout with teeth along the jaw, eyes raised high ---- */
function crocHead(v: Vox, skin: string, belly: string) {
  v.box(0, 0, H0, 7, 7, H1 - 1, skin);
  v.box(1, 8, H0, 6, 11, H0 + 2, skin); v.box(1, 8, H0, 6, 11, H0, belly);                  // the snout, its pale jaw
  for (const y of [8, 9, 10, 11]) v.set(6, y, H0 + 1, y % 2 ? 'white' : '#2a2620');         // teeth along the jaw
  for (const x of [2, 3, 4, 5]) v.set(x, 11, H0 + 1, x % 2 ? '#2a2620' : 'white');
  v.set(2, 11, H0 + 3, twin(skin)); v.set(5, 11, H0 + 3, twin(skin));                       // the nostrils, raised
  eyes(v, 'black', H0 + 4, [2, 5], 2);
  for (const x of [1, 2, 5, 6]) v.set(x, 7, H1, twin(skin));                                // the brows over them
  for (const [x, y] of [[2, 2], [5, 2], [3, 4], [4, 1]] as const) v.set(x, y, H1, twin(skin));   // ridges along the skull
}

/* ---- the shotgun crawler (2:14, named at 2:end): a guy with an alligator head in a T-shirt, carrying what
   looks like a mag-fed pump shotgun ---- */
export function florin() {
  const v = new Vox(), skin = '#56643e';
  base(v, 'stoneDark', 'stone', 76);
  v.chunk = 0;
  crocHead(v, skin, '#a9ab7c');
  body(v, { top: PLAIN_TOP, skin, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES });
  v.box(0, 3, 10, 0, 5, 11, twin(skin)); v.box(7, 3, 10, 7, 5, 11, twin(skin));          // the T-shirt's short sleeves
  // the shotgun, held level at his right side: stock, receiver, box magazine, pump, barrel
  v.box(8, 0, 9, 8, 2, 10, 'wood'); v.box(8, 3, 10, 8, 6, 11, 'metal'); v.box(8, 5, 8, 8, 6, 9, 'metalDark');
  v.box(8, 7, 10, 8, 12, 10, 'metal'); v.box(8, 7, 9, 8, 9, 9, 'wood');
  return v;
}

/* ---- the half-elf who opened the one Celestial box (2:end): an Asian half-elf in a glowing robe that lifts him
   off the ground, magical, wisp-like wings out of his back, his left hand glowing blue; from 4:31 his left arm is
   gone, torn off, and his right hand glows red ---- */
export function quan(stage: 'robe' | 'one-arm') {
  const skin = '#e3b58e', robe = '#e4e1ee', fig = person({ skin, hair: { color: PLAIN_HAIR, style: 'short' }, top: robe, outfit: 'robe', bottom: robe, feet: robe, bare: true, seed: 77 });
  for (const x of [-1, 8]) { fig.set(x, 4, 18, skin); fig.set(x, 4, 19, skin); fig.set(x < 0 ? -2 : 9, 3, 20, skin); }   // pointed ears
  const sheen = '#a9dcea';
  fig.box(0, 7, 5, 7, 7, 5, sheen); fig.box(7, 1, 5, 7, 6, 5, sheen); fig.box(3, 6, 10, 4, 6, 13, sheen);   // the robe's glow, down the front and at the hem
  if (stage === 'robe') fig.box(0, 4, 9, 0, 5, 9, 'portal');                                // the left hand, glowing blue
  else { fig.clear(0, 3, 9, 0, 5, 13); fig.set(0, 4, 13, '#8a1c1c'); fig.box(7, 4, 9, 7, 5, 9, 'ember'); }   // the arm torn off; the right hand glowing red
  // the wings: wisps of light out of his back, sweeping up and out behind his head
  for (const side of [-1, 1]) for (let i = 1; i <= 5; i++) {
    const x = side < 0 ? 1 - i : 6 + i, lo = 11 + i, hi = 16 + Math.round(i * 1.4);
    for (let z = lo; z <= hi; z++) fig.set(x, -1, z, z === hi || (z + i) % 4 === 0 ? sheen : 'glass');
  }
  return floating(fig, 3, 'portal', 78);
}

/* ---- the princess on the panel (2:19): a squid woman in a crown, grey skin covered in bumps, a tangle of
   squid-like tentacles hanging from her cephalopod face, a long, flowing dress ---- */
export function dnadia() {
  const skin = '#9aa0a7', v = person({ skin, top: PLAIN_BOTTOM, outfit: 'dress', bottom: PLAIN_BOTTOM, feet: PLAIN_BOTTOM, hat: { color: 'accent', kind: 'crown' }, seed: 79 });
  for (const [x, y, z] of [[1, 7, 20], [6, 7, 20], [7, 3, 18], [7, 5, 20], [7, 2, 15], [3, 7, 21], [7, 6, 16], [0, 6, 17]] as const) v.set(x, y, z, twin(skin));   // bumps
  v.box(0, 7, 14, 7, 7, 16, '#7d848d');                                                      // the lower face, where the tentacles grow
  // a tangle of tentacles hanging from the face, over the dress, each one curling at its tip
  const t = ['#868d96', '#737a84'];
  for (const [x, len, dx] of [[0, 5, -1], [1, 7, 0], [2, 6, 1], [3, 8, 0], [4, 7, -1], [5, 8, 0], [6, 6, 1], [7, 5, 1]] as const) {
    for (let i = 0; i < len; i++) v.set(x + (i > 4 ? dx : 0), 8 + (i > 1 ? 1 : 0), H0 + 1 - i, t[x % 2]);
    v.set(x + dx, 10, H0 + 2 - len, t[x % 2]); v.set(x + dx, 10, H0 + 3 - len, t[(x + 1) % 2]);
  }
  return v;
}

/* ---- the tiger crawler (2:23): a well-muscled, shirtless man, very furry and very orange, a big cat's head with
   a Siberian tiger's orange, white and black, a housecat's slit eyes, a long, absurdly shaggy tail, no shoes on his
   newly clawed feet, a belt with a curved sword in its scabbard, the sword glowing orange ---- */
export function bautista() {
  const fur = '#e07a26', pale = '#f1ebe0', stripe = '#1c1714';
  const v = person({ skin: fur, top: fur, sleeves: 'none', bottom: PLAIN_BOTTOM, feet: null, seed: 80 });
  v.box(1, 7, 14, 6, 7, 15, pale); v.box(3, 7, 16, 4, 7, 16, pale); v.set(3, 8, 15, '#c26a5a'); v.set(4, 8, 15, '#c26a5a');   // white muzzle, the nose
  for (const [x, y, z] of [[2, 7, 20], [5, 7, 20], [2, 7, 21], [5, 7, 21], [7, 2, 17], [7, 2, 18], [7, 4, 16], [7, 4, 17], [7, 6, 18], [7, 6, 19], [0, 6, 18], [0, 4, 16]] as const) v.set(x, y, z, stripe);   // stripes
  v.box(1, 1, 21, 2, 1, 21, stripe); v.box(5, 1, 21, 6, 1, 21, stripe); v.box(3, 3, 21, 4, 3, 21, stripe); v.box(1, 4, 21, 1, 5, 21, stripe); v.box(6, 4, 21, 6, 5, 21, stripe);
  for (const x of [0, 6]) { v.box(x, 4, 22, x + 1, 5, 22, fur); v.set(x + (x ? 1 : 0), 5, 23, fur); v.set(x + (x ? 0 : 1), 5, 22, pale); }   // ears
  v.box(3, 6, 10, 4, 6, 12, pale);                                                         // the chest
  for (const [x, y, z] of [[6, 3, 12], [6, 3, 11], [6, 5, 10], [6, 5, 11], [1, 6, 12], [6, 6, 13], [7, 3, 12], [7, 5, 11], [7, 4, 13]] as const) v.set(x, y, z, stripe);
  v.box(1, 2, 9, 6, 6, 9, '#3a2a1e'); v.set(3, 6, 9, 'metal');                             // the belt
  v.set(8, 2, 10, 'ember'); v.set(8, 2, 11, 'ember'); v.set(8, 3, 9, 'ember');              // the sword's glowing hilt
  seg(v, [8, 3, 8], [8, 6, 5], '#4a3122'); v.set(8, 7, 5, '#4a3122');                     // its curved scabbard
  for (const [x, y] of [[1, 7], [2, 7], [5, 7], [6, 7]] as const) v.set(x, y, 5, x % 2 ? 'white' : twin(fur));   // claws
  // the tail: long and shaggy, out behind him and up round his right side
  const tail: [number, number, number][] = [[4, 1, 8], [5, 0, 8], [6, -1, 7], [7, -2, 7], [8, -2, 8], [9, -1, 9], [10, 0, 10], [10, 1, 11], [10, 2, 12], [10, 3, 13], [9, 3, 14]];
  tail.forEach(([x, y, z], i) => { const m = i % 3 === 2 ? stripe : fur; v.set(x, y, z, m); v.set(x, y, z + 1, m); if (i > 3) v.set(x + (i % 2 ? 1 : 0), y + (i % 2 ? 0 : -1), z, twin(fur)); });
  return v;
}

/* ---- the medic, as the tribute shows (4:4): rail thin and timid, the head kept shaved, a bright red shirt with
   a vest, a medical bag over the shoulder with the familiar red cross on it ---- */
export function ifechi() {
  const skin = '#5a3a28', v = person({ skin, hair: { color: '#000000', style: 'bald' }, top: '#d0262a', bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 81 });
  v.set(2, 7, 18, '#f4efe6'); v.set(5, 7, 18, '#f4efe6');                                  // the eyes catch the light
  v.box(0, 0, H1, 7, 7, H1, '#4a2f20');                                                     // the shaved scalp
  v.box(1, 6, 10, 1, 6, 13, PLAIN_TOP); v.box(6, 6, 10, 6, 6, 13, PLAIN_TOP); v.box(1, 2, 10, 6, 2, 13, PLAIN_TOP); v.box(6, 3, 10, 6, 5, 13, PLAIN_TOP);   // the vest, open over the shirt
  for (const [x, z] of [[2, 13], [3, 13], [4, 12], [5, 12]] as const) v.set(x, 7, z, '#3a2a1e');   // the bag's strap
  v.box(8, 4, 6, 9, 7, 9, 'white'); v.box(9, 6, 7, 9, 6, 9, 'red'); v.box(9, 5, 8, 9, 7, 8, 'red'); v.box(8, 4, 10, 8, 5, 11, '#3a2a1e');   // the bag and its cross
  return v;
}

/* ---- a skyfowl's head: an eagle's, the hooked beak forward, the eyes set to the sides ---- */
function beakHead(v: Vox, feather: string, beak: string, eye = 'black') {
  head(v, feather);
  v.box(2, 8, 15, 5, 9, 17, beak); v.box(3, 10, 15, 4, 10, 17, beak); v.box(3, 11, 15, 4, 11, 16, beak); v.set(3, 11, 14, beak); v.set(4, 11, 14, beak);   // the hooked beak
  v.box(2, 9, 15, 5, 9, 15, twin(beak));
  eyes(v, eye, 18, [1, 6], 2);
}

/* ---- the magistrate's assistant (2:18): an elderly female skyfowl, an eagle-headed humanoid, her feathers
   tinged grey, her large beak cracked and crazed like brittle old pottery, a sour look; she rests on a perch
   behind the desk, and the shelves round her hold hundreds of small stuffed animals, bears to eagles to sharks ---- */
export function missQuill() {
  const v = new Vox(), feather = '#8f877d', wing = '#6c645b', headF = '#b9b3aa', beak = '#ddcc96', crack = '#6e5c3a', talon = '#c9b27a';
  wideBase(v, -3, 16, 83, -1, 10);
  const fig = new Vox(); fig.chunk = 0;
  beakHead(fig, headF, beak);
  for (const [x, y, z] of [[3, 9, 16], [4, 8, 17], [2, 9, 17], [4, 10, 16], [5, 8, 16], [3, 11, 15]] as const) fig.set(x, y, z, crack);   // the crazing
  fig.box(0, 7, 20, 2, 7, 20, twin(headF)); fig.box(5, 7, 20, 7, 7, 20, twin(headF));     // a sour brow
  body(fig, { top: feather, skin: talon, bottom: twin(feather), legs: talon, feet: talon });
  // her wings, folded down her sides and longer than her arms, the fingers at the first knuckle
  fig.box(-1, 1, 7, -1, 5, 13, wing); fig.box(8, 1, 7, 8, 5, 13, wing); fig.box(8, 1, 6, 8, 2, 6, wing); fig.box(-1, 1, 6, -1, 2, 6, wing);
  for (const z of [8, 10, 12]) fig.set(8, 5, z, twin(wing));
  fig.set(8, 6, 9, talon); fig.set(-1, 6, 9, talon);
  for (const [x, y] of [[1, 7], [2, 7], [5, 7], [6, 7]] as const) fig.set(x, y, 5, '#3a2e24');   // talons
  copyInto(v, fig, 0, 0, 3);
  v.chunk = 0;
  v.box(-2, 4, 7, 9, 5, 7, 'woodDark'); v.box(-2, 4, 5, -2, 5, 6, 'woodDark'); v.box(9, 4, 5, 9, 5, 6, 'woodDark');   // the perch
  // a few of the stuffed animals, tags on, beside her
  round(v, 11, 13, 2, 4, 5, 7, '#8a5a32'); round(v, 11, 13, 2, 4, 8, 10, '#8a5a32'); v.set(11, 3, 11, '#8a5a32'); v.set(13, 3, 11, '#8a5a32');
  v.set(11, 5, 9, 'black'); v.set(13, 5, 9, 'black'); v.set(12, 5, 8, '#5a3a20'); v.set(13, 4, 6, 'white');   // a bear
  round(v, 11, 13, 6, 8, 5, 7, '#7a5a3a'); round(v, 11, 13, 6, 8, 8, 9, 'white'); v.set(12, 9, 8, '#e8c21c'); v.set(11, 9, 9, 'black'); v.set(13, 9, 9, 'black');   // an eagle
  v.box(14, 2, 5, 16, 8, 6, '#7c8a96'); v.box(14, 4, 7, 15, 5, 8, '#7c8a96'); v.box(14, 8, 5, 16, 8, 5, '#e6e2da'); v.set(14, 9, 6, 'black'); v.set(16, 9, 6, 'black'); v.set(15, 1, 6, '#7c8a96');   // a shark
  return v;
}

/* ---- the previous magistrate, as he is kept (2:24): a zombified, featherless skyfowl, black swirling orbs for
   eyes, hazy black smoke rising off him, ethereal, worm-like wisps swirling about him like a parody of the wings
   he had, and a thin thread of golden light running into his chest from an amber jewel floating before him ---- */
export function remex() {
  const v = new Vox(), skin = '#a39b92', pock = '#857d75', beak = '#b8a77c';
  base(v, 'stoneDark', 'stone', 82);
  v.chunk = 0;
  beakHead(v, skin, beak);
  for (const x of [1, 6]) { v.box(x, 7, 18, x, 7, 19, 'black'); v.set(x, 8, 19, '#5a2f86'); v.set(x, 8, 18, 'black'); }   // swirling black orbs
  body(v, { top: skin, skin, bottom: twin(skin), feet: '#c9b27a' });
  for (const [x, y, z] of [[2, 6, 12], [5, 6, 11], [6, 4, 13], [1, 6, 10], [6, 2, 11], [4, 7, 20], [7, 3, 17], [7, 5, 15], [2, 7, 21]] as const) v.set(x, y, z, pock);   // gooseflesh
  // the wisps where his wings were, worming out from his back and up
  for (const side of [-1, 1]) for (let i = 0; i <= 5; i++) {
    const x = side < 0 ? -1 - Math.round(i * 0.6) : 8 + Math.round(i * 0.6), y = 1 + Math.round(Math.sin(i * 1.3) * 1.2), z = 11 + i * 2;
    v.set(x, y, z, 'mist'); v.set(x, y, z + 1, 'mist');
  }
  // the smoke, rising off him in black curls
  for (const [x, y, z0, h] of [[1, 2, 22, 3], [5, 3, 22, 3], [3, 0, 22, 3], [6, 6, 22, 2], [2, 5, 22, 2]] as const) for (let z = z0; z < z0 + h; z++) v.set(x + ((z - z0) % 2), y, z, 'nightMist');
  // the golden thread from his chest to the amber jewel
  seg(v, [4, 7, 11], [11, 8, 16], 'window');
  v.box(11, 8, 16, 12, 9, 17, '#d98a1f'); v.set(12, 9, 17, 'window');
  return v;
}

/* ---- the club's pharmacist (2:15): small and floating, the top half a sharp-toothed, beady-eyed opossum, the
   bottom half a whirling dervish, as if half swallowed by a miniature tornado twisting on the floor ---- */
export function quint() {
  const v = new Vox(), grey = '#8f8b87', face = '#ece6dc', ear = '#2b2724';
  base(v, 'stoneDark', 'stone', 84);
  v.chunk = 0;
  for (let z = 5; z <= 12; z++) {                                                          // the tornado, widening and twisting upward
    const r = 0.8 + (z - 5) * 0.5, cx = 3.5 + Math.sin(z * 0.8) * 0.7, cy = 4 + Math.cos(z * 0.8) * 0.5;
    for (let x = -2; x <= 9; x++) for (let y = -1; y <= 9; y++) {
      const dx = x - cx, dy = y - cy;
      if (Math.hypot(dx, dy) <= r + 0.35) v.set(x, y, z, Math.floor((Math.atan2(dy, dx) / Math.PI + 1) * 1.5 + z * 0.6) % 2 ? 'cloud' : '#7b858d');
    }
  }
  for (const [x, y, z] of [[-2, 6, 9], [9, 2, 10], [8, 8, 7], [-1, 1, 12], [9, 6, 12]] as const) v.set(x, y, z, 'stoneDark');   // grit whirling round it
  const top = new Vox(); top.chunk = 0;
  head(top, grey); top.box(0, 6, H0, 7, 7, H1 - 2, face);                                 // grey over the top, the white face
  top.box(2, 8, 14, 5, 9, 16, face); top.box(3, 10, 14, 4, 10, 15, face); top.set(3, 11, 15, '#e3909a'); top.set(4, 11, 15, '#e3909a');   // the pointed snout, the pink nose
  top.box(2, 9, 14, 5, 9, 14, '#3a1c24'); top.set(2, 10, 14, 'white'); top.set(5, 10, 14, 'white'); top.set(3, 10, 13, 'white'); top.set(4, 10, 13, 'white');   // sharp teeth
  eyes(top, 'black', 17, [2, 5], 1);
  for (const x of [-1, 7]) { top.box(x, 3, 21, x + 1, 4, 22, ear); top.set(x === -1 ? 0 : 7, 4, 21, '#d98a90'); }   // round dark ears
  top.box(1, 2, 11, 6, 6, 13, grey); top.box(0, 3, 11, 0, 5, 13, twin(grey)); top.box(7, 3, 11, 7, 5, 13, twin(grey));   // a short furry body
  top.box(0, 4, 10, 0, 5, 10, '#e3a0a0'); top.box(7, 4, 10, 7, 5, 10, '#e3a0a0');       // pink hands
  copyInto(v, top, 0, 0, 2);
  return v;
}

/* ---- the host (2:19): four feet of pudgy, fuzzy brown, a wombat crossed with an ewok, two huge cheeks and
   giant eyes, wearing nothing but an orange scarf round his neck ---- */
export function ripperWonton() {
  const v = new Vox(), fur = '#7a5a3a', pale = '#a07c58', scarf = '#ef7d1f';
  base(v, 'stoneDark', 'stone', 85);
  v.chunk = 0;
  round(v, 0, 7, 1, 7, 6, 13, fur); v.box(2, 7, 7, 5, 7, 11, pale);                        // a pudgy body, a paler belly
  round(v, -1, 8, 0, 8, 14, 21, fur);                                                       // a big round head
  round(v, -2, 0, 4, 8, 14, 17, fur); round(v, 7, 9, 4, 8, 14, 17, fur);                   // the huge cheeks
  for (const x of [1, 5]) { v.box(x, 9, 17, x + 1, 9, 18, 'black'); v.set(x + 1, 9, 18, '#f4f1ea'); }   // giant eyes
  v.box(3, 9, 15, 4, 9, 16, '#3a2a22'); v.box(3, 9, 14, 4, 9, 14, pale);                  // the nose, the mouth
  for (const x of [0, 6]) round(v, x, x + 2, 3, 5, 21, 23, fur);                           // small round ears
  v.box(-1, 4, 9, -1, 5, 11, twin(fur)); v.box(8, 4, 9, 8, 5, 11, twin(fur));               // short arms
  v.box(1, 4, 5, 2, 8, 5, twin(fur)); v.box(5, 4, 5, 6, 8, 5, twin(fur));                   // feet
  for (let x = -1; x <= 8; x++) for (let y = 0; y <= 8; y++) if (x < 1 || x > 6 || y < 1 || y > 7) v.set(x, y, 13, scarf);   // the scarf, round the neck
  v.box(5, 9, 10, 6, 9, 13, scarf); v.set(5, 9, 9, twin(scarf));                          // its end
  return v;
}

/* ---- the club's bouncer (2:15): a lizard-faced crocodilian, the same race as the shotgun crawler, sitting in a
   chair in front of the club's door ---- */
export function clarabelle() {
  const v = new Vox(), skin = '#56643e';
  base(v, 'stoneDark', 'stone', 86);
  v.chunk = 0;
  crocHead(v, skin, '#a9ab7c');
  v.box(1, 2, 10, 6, 6, 13, PLAIN_TOP); v.box(0, 3, 10, 0, 5, 13, twin(PLAIN_TOP)); v.box(7, 3, 10, 7, 5, 13, twin(PLAIN_TOP));
  v.box(0, 6, 9, 0, 7, 9, twin(skin)); v.box(7, 6, 9, 7, 7, 9, twin(skin));                // hands on her knees
  v.box(1, 3, 9, 6, 8, 9, PLAIN_BOTTOM);                                                    // sitting: the lap forward
  v.box(1, 8, 6, 2, 8, 8, PLAIN_BOTTOM); v.box(5, 8, 6, 6, 8, 8, PLAIN_BOTTOM);
  v.box(1, 8, 5, 2, 10, 5, PLAIN_SHOES); v.box(5, 8, 5, 6, 10, 5, PLAIN_SHOES);
  // the chair: a seat, four legs, a back behind her
  v.box(0, 1, 8, 7, 8, 8, 'wood');
  for (const [x, y] of [[0, 1], [7, 1], [0, 8], [7, 8]] as const) v.box(x, y, 5, x, y, 7, 'woodDark');
  v.box(0, 0, 9, 7, 0, 16, 'wood'); v.box(0, 0, 15, 7, 0, 16, 'woodDark');
  return v;
}

/* ---- the magistrate, as found (2:22): the naked, emaciated corpse hanging upside down in a massive dreamcatcher
   of bone, the featherless wings spread all the way out, gooseflesh grey, like uncooked chicken wings with grasping
   fingers at the first knuckle, milky white dead eyes under a cracked beak, the taloned claws splayed at the top
   towards the ceiling, lashed to the bone with old, frayed rope, clear fluid dripping from his mouth and eyes ---- */
export function featherfall() {
  const v = new Vox(), skin = '#b5a69c', dark = '#8e8076', beak = '#c2b07a', claw = '#2e241d', rope = '#6e5a3e';
  wideBase(v, -7, 14, 87, -1, 8);
  v.chunk = 0;
  for (let x = -8; x <= 15; x++) for (let z = 5; z <= 27; z++) { const d = Math.hypot(x - 3.5, z - 15.5); if (d >= 9.2 && d <= 10.4) { v.set(x, 2, z, 'bone'); v.set(x, 3, z, 'bone'); } }   // the hoop of bone
  for (const [a, b] of [[[-6, 2, 9], [-3, 2, 11]], [[13, 2, 9], [10, 2, 11]], [[-2, 2, 23], [0, 2, 21]], [[9, 2, 23], [7, 2, 21]]] as const) seg(v, a as [number, number, number], b as [number, number, number], rope);   // its web, behind him
  // upside down: the head at the bottom, crown down
  v.box(1, 2, 7, 6, 7, 12, skin);
  v.box(2, 7, 8, 2, 7, 9, '#eef1f2'); v.box(5, 7, 8, 5, 7, 9, '#eef1f2');                  // milky, dead eyes
  v.box(2, 8, 10, 5, 8, 11, beak); v.box(3, 9, 10, 4, 9, 12, beak); v.set(3, 10, 12, beak); v.set(4, 10, 12, beak);   // the beak, its hook turned up
  v.set(3, 8, 11, '#5a4a30'); v.set(4, 9, 11, '#5a4a30');                                  // the crack
  v.box(3, 3, 13, 4, 5, 13, skin);                                                         // the neck
  v.box(1, 3, 14, 6, 6, 18, skin); for (const z of [15, 17]) v.box(2, 6, z, 5, 6, z, dark);   // a starved chest, the ribs
  v.box(2, 3, 19, 5, 6, 20, dark);
  for (const [s, e] of [[[2, 4, 21], [0, 4, 23]], [[5, 4, 21], [7, 4, 23]]] as const) for (const y of [4, 5]) seg(v, [s[0], y, s[2]], [e[0], y, e[2]], skin);   // legs up in a V
  for (const [x, o] of [[0, -1], [7, 1]] as const) { v.set(x + o, 4, 24, claw); v.set(x, 5, 25, claw); v.set(x, 4, 25, claw); v.set(x - o, 5, 24, claw); }   // the talons, splayed to the ceiling
  // the wings, spread right out to the hoop: thick from the shoulder, a bend, the fingers at the knuckle, the tip lashed
  for (const side of [-1, 1]) {
    const X = (x: number) => (side < 0 ? x : 7 - x);
    for (let x = -3; x <= 0; x++) { v.set(X(x), 4, 15, skin); v.set(X(x), 4, 16, skin); v.set(X(x), 5, 15, skin); v.set(X(x), 5, 16, skin); }
    for (let x = -6; x <= -4; x++) { v.set(X(x), 4, 16, skin); v.set(X(x), 5, 16, skin); v.set(X(x), 4, 17, skin); }
    v.set(X(-1), 5, 14, dark); v.set(X(-2), 5, 14, dark);                                   // loose skin under the wing
    v.set(X(-3), 5, 17, claw); v.set(X(-4), 5, 18, claw); v.set(X(-3), 4, 18, claw);       // grasping fingers at the first knuckle
    v.set(X(-6), 5, 17, rope); v.set(X(-6), 6, 16, rope); v.set(X(1), 6, 23, rope);       // lashed at the wrist and the ankle
  }
  v.set(3, 6, 6, rope); v.set(4, 6, 6, rope);                                               // and by the head
  for (const [x, y, z] of [[2, 8, 6], [5, 8, 5], [3, 9, 5]] as const) v.set(x, y, z, 'glass');   // the drip
  return v;
}

/* ---- the explosives dealer (2:16): six feet of large, muscular hobgoblin, an ugly one, an open sore on her
   cheek bubbling black and green ooze, the pus running down her shoulder and staining her threadbare pink graphic
   tee, a unicorn wearing sunglasses on its front ---- */
export function pustule() {
  const skin = '#9a8f7c', pink = '#e889b0';
  const v = person({ skin, hair: { color: PLAIN_HAIR, style: 'short' }, top: pink, sleeves: 'short', bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 88 });
  v.box(-1, 3, 9, 0, 6, 11, twin(skin)); v.box(7, 3, 9, 8, 6, 11, twin(skin));            // big arms
  v.box(-1, 3, 12, 0, 6, 13, twin(pink)); v.box(7, 3, 12, 8, 6, 13, twin(pink));
  v.box(3, 8, 16, 4, 8, 17, twin(skin)); v.box(1, 7, 19, 6, 7, 19, twin(skin));            // a lumpy nose, a heavy brow
  v.set(1, 7, 15, '#1b1714'); v.set(2, 7, 15, 'slime'); v.set(1, 7, 16, 'slime'); v.set(1, 8, 15, 'slime');   // the sore
  v.set(1, 7, 14, 'slime'); v.set(0, 6, 13, 'slime'); v.set(1, 6, 13, '#2a3a1e'); v.set(1, 6, 12, 'slime');    // the pus, down onto the shirt
  // the unicorn in sunglasses on the shirt
  v.box(3, 6, 12, 4, 6, 12, '#f1ece4'); v.box(3, 6, 11, 4, 6, 11, '#1b1714'); v.box(2, 6, 10, 4, 6, 10, '#f1ece4'); v.set(5, 6, 13, 'accent'); v.set(5, 6, 12, '#7a5aa8');
  v.set(6, 4, 11, twin(pink)); v.set(2, 6, 13, twin(pink));                                // threadbare
  return v;
}

/* ---- the stuffed demon (2:23): in one of the shelf's enchanted glass cases, unbroken by the blast, a plush
   armoured man atop a black horse, the tag still on (the scowl it attempts is only described at 3:7, so it is
   not drawn) ---- */
export function kimaris() {
  const v = new Vox(), horse = '#2f2a2d', mane = '#141012', armour = '#a3abb3', face = '#d9a882';
  wideBase(v, -3, 12, 89, -1, 10);
  v.chunk = 0;
  v.box(-2, 1, 5, 11, 8, 5, '#3a2a1e');                                                     // the case's floor
  // the horse, side on, plump as a plush is, its head to the right
  round(v, 0, 7, 3, 6, 8, 11, horse);
  for (const [x, y] of [[0, 3], [0, 5], [6, 3], [6, 5]] as const) v.box(x, y, 6, x + 1, y + 1, 7, twin(horse));
  v.box(7, 4, 11, 8, 5, 13, horse); round(v, 8, 10, 3, 6, 12, 15, horse); v.box(10, 4, 12, 10, 5, 13, twin(horse));   // the neck, the head, the muzzle
  v.set(8, 4, 16, horse); v.set(8, 5, 16, horse);                                           // ears
  v.set(9, 6, 14, '#d9d2c4');                                                               // a button eye
  v.box(6, 4, 12, 7, 5, 14, mane); v.box(-1, 4, 8, -1, 5, 11, mane);                        // the mane and the tail
  // the rider, turned to face out of the case: armour, a leg down either side, a helmet over a scowling face
  v.box(2, 7, 9, 3, 7, 11, armour); v.box(2, 2, 9, 3, 2, 11, armour);
  v.box(1, 3, 12, 4, 6, 14, armour); v.box(0, 4, 12, 0, 5, 14, twin(armour)); v.box(5, 4, 12, 5, 5, 14, twin(armour));
  v.box(1, 3, 15, 4, 6, 18, face); v.box(1, 3, 18, 4, 6, 19, armour); v.box(1, 3, 15, 4, 3, 18, armour); v.box(0, 3, 16, 0, 6, 19, armour); v.box(5, 3, 16, 5, 6, 19, armour);
  v.set(1, 6, 16, 'black'); v.set(4, 6, 16, 'black'); v.set(1, 6, 17, 'black'); v.set(4, 6, 17, 'black');                    // dot eyes
  v.set(5, 7, 9, 'white'); v.set(5, 7, 8, 'white');                                         // the tag
  // the glass case: a faint skin, bright along its edges
  for (let x = -2; x <= 11; x++) for (let y = 1; y <= 8; y++) for (let z = 6; z <= 21; z++) {
    const on = (x === -2 || x === 11 ? 1 : 0) + (y === 1 || y === 8 ? 1 : 0) + (z === 21 ? 1 : 0) + (z === 6 ? 1 : 0);
    if (on && !v.has(x, y, z)) v.set(x, y, z, on >= 2 ? 'domeRim' : 'dome');
  }
  return v;
}

/* ---- the singer on the panel (2:19): a silver and black cobra, a Naga, her hooded head a metre wide, towering
   over the table, her forked tongue flipping in and out ---- */
export function manasa() {
  const v = new Vox(), silver = '#c3c7cc', pale = '#e2e4e6', black = '#1f1d21';
  base(v, 'stoneDark', 'stone', 90);
  v.chunk = 0;
  for (const [r, z0, z1] of [[4.0, 5, 6], [2.9, 7, 8]] as const) for (let x = -2; x <= 9; x++) for (let y = -1; y <= 9; y++) {   // the coils, silver, banded black
    const d = Math.hypot(x - 3.5, y - 4); if (d <= r + 0.5 && d >= r - 1.2) for (let z = z0; z <= z1; z++) v.set(x, y, z, Math.floor((Math.atan2(y - 4, x - 3.5) + Math.PI) * 1.6) % 4 === 0 ? black : silver);
  }
  v.box(3, 5, 9, 4, 7, 16, silver); v.box(3, 7, 9, 4, 7, 16, pale);                        // the neck, rising, its pale belly
  for (const z of [10, 13]) v.box(3, 5, z, 4, 6, z, black);
  // the hood, spread wide behind the head: silver in front, black behind and round the rim
  for (let x = -3; x <= 10; x++) for (let z = 11; z <= 22; z++) {
    const e = ((x - 3.5) / 7) ** 2 + ((z - 16.5) / 5.6) ** 2;
    if (e <= 1) { v.set(x, 4, z, black); v.set(x, 5, z, e > 0.6 ? black : silver); }
  }
  for (const [x, z] of [[0, 17], [1, 18], [6, 18], [7, 17], [1, 14], [6, 14]] as const) v.set(x, 5, z, black);   // the marks on the hood
  v.box(2, 6, 19, 5, 10, 21, silver); v.box(2, 6, 22, 5, 8, 22, silver); v.box(3, 6, 17, 4, 7, 18, silver);   // the head, flat and long, forward over the hood
  v.box(2, 6, 19, 5, 10, 19, pale);
  v.set(2, 9, 21, black); v.set(5, 9, 21, black); v.set(2, 9, 22, black); v.set(5, 9, 22, black);   // eyes
  v.box(3, 11, 19, 4, 11, 19, '#c0303a'); v.set(2, 12, 19, '#c0303a'); v.set(5, 12, 19, '#c0303a');   // the forked tongue
  return v;
}

/* ---- the roller-skating bear (2:8): once a black bear, a tattered pink clown hat and a pleated clown ruff grown
   onto her, no skin on her face, only exposed skull and a pair of round red eyes, her front paws turned to white
   worms like mops, roller skates on her back legs; standing up she is eight feet of her, the hat cockeyed on the
   skull, its cone fused to the bone (2:9 shows her up close, the look is the same) ---- */
export function heather() {
  const v = new Vox(), fur = '#231e1f', bone = '#e6dcc4', worm = '#efe9dc';
  base(v, 'stoneDark', 'stone', 91);
  v.chunk = 0;
  for (const x of [1, 5]) { v.box(x, 3, 6, x + 1, 7, 6, PLAIN_SHOES); v.box(x, 3, 5, x, 3, 5, 'metalDark'); v.set(x + 1, 3, 5, 'metalDark'); v.set(x, 7, 5, 'metalDark'); v.set(x + 1, 7, 5, 'metalDark'); }   // the skates
  v.box(1, 3, 7, 2, 5, 9, twin(fur)); v.box(5, 3, 7, 6, 5, 9, twin(fur));                  // legs
  round(v, 0, 7, 1, 7, 9, 16, fur);                                                         // a big bear's body
  // the ruff, pleated, round her neck
  for (let x = -1; x <= 8; x++) for (let y = 0; y <= 8; y++) if (x < 1 || x > 6 || y < 1 || y > 7) v.set(x, y, 16, (x + y) % 2 ? '#e9e1cf' : twin('#e9e1cf'));
  // the skull: a bear's, with the snout, the teeth, the sockets and the red eyes in them
  round(v, 0, 7, 0, 7, 17, 24, bone);
  v.box(2, 8, 17, 5, 10, 19, bone); v.box(2, 10, 17, 5, 10, 17, '#3a2a28'); v.set(3, 10, 17, 'white'); v.set(5, 10, 17, 'white'); v.box(3, 10, 19, 4, 10, 19, '#3a2a28');
  for (const x of [1, 5]) { v.box(x, 7, 20, x + 1, 7, 22, '#3a2a28'); v.box(x, 7, 21, x + 1, 7, 22, 'red'); }
  // the tattered pink clown hat, cockeyed, its cone into the bone
  v.box(1, 1, 25, 6, 6, 25, '#ee7fb4'); v.clear(6, 1, 25, 6, 1, 25); v.set(1, 6, 25, twin('#ee7fb4'));
  v.box(2, 2, 26, 6, 5, 26, '#ee7fb4'); v.box(3, 2, 27, 6, 4, 27, '#ee7fb4'); v.box(4, 3, 28, 6, 4, 28, '#ee7fb4'); v.box(5, 3, 29, 6, 3, 29, '#ee7fb4'); v.set(6, 3, 30, '#ee7fb4');
  // arms, and the worms that were her claws, hanging like mops
  v.box(-1, 3, 11, -1, 5, 15, twin(fur)); v.box(8, 3, 11, 8, 5, 15, twin(fur));
  for (const [y, len] of [[3, 4], [4, 6], [5, 5], [6, 3]] as const) for (const x of [-1, 8]) for (let i = 0; i < len; i++) v.set(x + (i > 2 ? (x < 0 ? -1 : 1) : 0), y + (i > 3 ? 1 : 0), 10 - i, worm);
  return v;
}

/* ---- the orc at the bar (2:14): an older woman, large and well-muscled, an orcish Agatha, her medieval-style
   shirt stained red with blood like a butcher who forgot her apron ---- */
export function gumgum() {
  const skin = '#b08f72';
  const v = person({ skin, hair: { color: PLAIN_HAIR, style: 'short' }, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 92 });
  v.box(-1, 3, 10, 0, 6, 13, twin(PLAIN_TOP)); v.box(7, 3, 10, 8, 6, 13, twin(PLAIN_TOP)); // big arms
  v.box(-1, 4, 9, 0, 5, 9, twin(skin)); v.box(7, 4, 9, 8, 5, 9, twin(skin));
  for (const [x, z] of [[1, 16], [6, 16], [3, 20], [5, 20]] as const) v.set(x, 7, z, twin(skin));   // lines of age
  v.box(2, 6, 10, 5, 6, 11, 'redDark'); v.box(3, 6, 12, 4, 6, 12, 'redDark'); v.set(2, 6, 12, 'red'); v.set(5, 6, 13, 'red'); v.set(1, 6, 11, 'red');   // the blood
  v.box(8, 5, 10, 8, 6, 11, 'redDark'); v.set(6, 3, 10, 'red');
  return v;
}

/* ---- the dwarf boy (2:20): a young fathom dwarf in dirty, patched clothes, still clutching the broken stick
   with his dead salamander tied to the end; the arm he punched with bitten off below the elbow ---- */
export function rickyJoe() {
  const v = person({ skin: '#e0b090', hair: { color: PLAIN_HAIR, style: 'messy' }, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 93 });
  v.box(2, 6, 11, 3, 6, 12, '#77736a'); v.box(5, 6, 8, 6, 6, 9, '#5f5b54');              // patches
  for (const [x, y, z] of [[6, 7, 15], [1, 7, 17], [4, 6, 10], [6, 4, 12]] as const) v.set(x, y, z, 'dirtDark');   // dirt
  v.clear(7, 3, 9, 7, 5, 11); v.set(7, 4, 11, '#a8201c');                                    // the stump
  seg(v, [0, 6, 9], [0, 9, 12], 'woodDark');                                                // the broken stick
  v.box(-1, 10, 12, 1, 10, 12, '#8a6a4a'); v.set(0, 10, 11, '#8a6a4a'); v.set(-1, 11, 12, '#8a6a4a'); v.set(1, 11, 11, '#8a6a4a'); v.set(0, 11, 12, '#8a6a4a');   // the salamander, limp
  v.set(0, 9, 13, '#c9b27a');                                                               // tied on
  return v;
}

/* ---- the magistrate's assistant on the stairs (2:18): young, dark-haired and pretty, one pale blue eye and one
   brown, like a husky's, carrying papers and a blue folder; at 2:22 the long dark hair, the face oddly unmarred,
   and everything below the waist burned to flaky, obsidian-coloured logs of charcoal ---- */
export function burgundy(stage: 'papers' | 'charred') {
  const char = stage === 'charred';
  const v = person({ skin: '#ecc6a8', hair: { color: '#1f1712', style: char ? 'long' : 'bob' }, top: PLAIN_TOP,
    bottom: char ? '#1e1b1a' : PLAIN_BOTTOM, legs: char ? '#2a2624' : undefined, feet: char ? '#1e1b1a' : PLAIN_SHOES, seed: 94,
    ...(char ? {} : { held: { kind: 'clipboard' as const, color: 'blue' } }) });
  v.box(2, 7, 17, 2, 7, 18, '#a8d4ee'); v.box(5, 7, 17, 5, 7, 18, '#6a4426');              // one pale blue eye, one brown
  if (!char) { v.box(8, 5, 13, 8, 6, 13, 'white'); return v; }
  for (const [x, y, z] of [[1, 6, 8], [6, 4, 9], [2, 5, 6], [5, 5, 7], [6, 3, 6], [3, 6, 9]] as const) v.set(x, y, z, '#4a4440');   // flakes of char
  v.box(1, 6, 10, 6, 6, 10, '#3a3432');
  return v;
}

/* Every figure drawn for book 2, by character id and look. */
export const BOOK2_FIGURES: Record<string, Record<string, () => Vox>> = {
  signet: { tattoos: signet },
  grimaldi: { vine: grimaldi },
  'miriam-dom': { shepherd: () => miriam('shepherd'), vampire: () => miriam('vampire') },
  prepotente: { armor: prepotente },
  florin: { shotgun: florin },
  'quan-ch': { robe: () => quan('robe'), 'one-arm': () => quan('one-arm') },
  dnadia: { crown: dnadia },
  bautista: { tigran: bautista },
  ifechi: { medic: ifechi },
  remex: { leech: remex },
  quint: { tornado: quint },
  'miss-quill': { perch: missQuill },
  'ripper-wonton': { scarf: ripperWonton },
  clarabelle: { chair: clarabelle },
  featherfall: { dreamcatcher: featherfall },
  pustule: { unicorn: pustule },
  kimaris: { plush: kimaris },
  manasa: { cobra: manasa },
  'heather-the-bear': { clown: heather },
  gumgum: { bloodstained: gumgum },
  'ricky-joe': { 'one-arm': rickyJoe },
  burgundy: { papers: () => burgundy('papers'), charred: () => burgundy('charred') },
};
