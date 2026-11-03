import { Vox } from '../vox.ts';
import { base, head, eyes, body, twin, person, copyInto, wideBase, floating, H0, H1, PLAIN_HAIR, PLAIN_TOP, PLAIN_BOTTOM, PLAIN_SHOES } from './parts.ts';
import { BOOK2_FIGURES } from './book2.ts';
import { BOOK3_FIGURES } from './book3.ts';
import { BOOK4_FIGURES } from './book4.ts';
import { BOOK5_FIGURES } from './book5.ts';
import { BOOK6_FIGURES } from './book6.ts';
import { BOOK7_FIGURES } from './book7.ts';
import { BOOK8_FIGURES } from './book8.ts';

/* ---- the cast, one builder per character, one look per stretch of the story ----
   A figure is a summary of how someone looks, so it obeys the summary rule:
   each look opens at the point by which everything in it has been read
   (`figure` on the character in data/entities, [{ at, look }], superseding
   like taglines), and the page shows the latest one the reader has reached.
   Shapes and colours only, never a name or a word: the words live in the
   data, and check-pages reads this file like any page. Each look is drawn from
   the edition's own description at its point. */

/* ---- Carl, look by look ----
   The leather jacket and the boxers he ran out in (1:1), the pink Crocs that went flying the moment
   he ran (1:2). From 1:6 the nightgaunt cloak, black and leathery, its skin stretched between long
   finger bones, the hood down, never taken off again. The jacket's right arm melted away (1:15),
   over kneepads of skin and fur with spikes in them (1:12); the heart-covered BigBoi boxers (1:35);
   the xistera, a metal bracer on the bare right forearm (2:17). A black, sleeveless canvas jacket
   with a faint purple glow over the short-sleeved trollskin shirt (4:30), its patches sewn on by
   5:36 (the Earth and the flaming arrows at the shoulder, a white bomb at the front hem). Bald when
   his hair burns away (6:72); a tonic's long hair, tied back under the cloak (7:5), loose once the
   tie is gone (7:54). A joey's costume over everything, its head over his, boxers and kneepads on
   the outside, the cloak round his neck (8:21), off again by 8:34. */
const CARL = ['crocs', 'barefoot', 'cloak', 'sleeve', 'hearts', 'xistera', 'rattle', 'patches', 'bald', 'ponytail', 'loose', 'kangaroo', 'unsuited'] as const;
export type CarlLook = typeof CARL[number];
export function carl(stage: CarlLook) {
  const from = (s: CarlLook) => CARL.indexOf(stage) >= CARL.indexOf(s);
  const roo = stage === 'kangaroo';
  const v = new Vox(), skin = '#e3a77c', hair = '#3b2517', shirt = '#3d2c22';
  const jacket = from('rattle') ? '#27242c' : '#6e4023', cloak = '#2b2731', rib = '#4b4553', fur = '#8d6b4c';
  base(v, 'stoneDark', 'stone', 11);
  v.chunk = 0;
  head(v, roo ? fur : skin); eyes(v);
  const style = roo || stage === 'bald' ? null : from('loose') ? 'loose' : from('ponytail') ? 'tied' : 'messy';
  if (style === 'messy') {
    // messy dark hair: a cap over the top and the back, ragged at the fringe and over the ears
    v.box(0, 0, 20, 7, 7, 21, hair); v.box(0, 0, H0, 7, 1, 19, hair);
    v.box(0, 2, 17, 0, 4, 19, hair); v.box(7, 2, 17, 7, 4, 19, hair);
    v.box(0, 7, 19, 7, 7, 19, hair); v.set(4, 7, 19, skin); v.set(0, 7, 18, hair); v.set(7, 7, 18, hair); v.set(3, 7, 18, hair);
    for (const [x, y] of [[1, 2], [3, 4], [5, 1], [6, 5], [2, 6], [4, 1]] as const) v.set(x, y, 22, hair);
  }
  if (style === 'tied' || style === 'loose') {
    // the tonic's hair: thick, swept to one side over the brow, with lift on top
    v.box(0, 0, 20, 7, 7, 21, hair); v.box(0, 0, H0, 7, 1, 19, hair); v.box(1, 1, 22, 6, 6, 22, hair);
    v.box(0, 2, 16, 0, 5, 19, hair); v.box(7, 2, 16, 7, 5, 19, hair);
    v.box(0, 7, 19, 7, 7, 19, hair); v.box(0, 7, 18, 2, 7, 18, hair);
    if (style === 'tied') v.box(3, -1, 13, 4, -1, 20, hair);                        // tied back, the tail under the cloak
    else { v.box(0, -1, 11, 7, -1, 21, hair); v.box(-1, 0, 11, -1, 4, 18, hair); v.box(8, 0, 11, 8, 4, 18, hair); }   // loose, over the shoulders
  }
  if (roo) {
    // the joey's head pulled over his own: tall ears, a long snout
    v.box(1, 3, 22, 2, 4, 26, fur); v.box(5, 3, 22, 6, 4, 26, fur); v.box(1, 4, 23, 2, 4, 25, '#c99a84'); v.box(5, 4, 23, 6, 4, 25, '#c99a84');
    v.box(2, 8, 14, 5, 9, 16, twin(fur)); v.box(3, 10, 15, 4, 10, 16, 'black');
  }
  const sleeves: [string | null, string | null] = roo ? [fur, fur] : from('rattle') ? [null, null] : from('sleeve') ? [jacket, null] : [jacket, jacket];
  body(v, { top: roo ? fur : jacket, skin, bottom: from('hearts') ? '#f1ece4' : '#55607f', legs: roo ? fur : undefined,
    feet: roo ? twin(fur) : stage === 'crocs' ? '#f08cc0' : null, front: roo ? '#a8865f' : shirt, sleeves });
  if (roo) { v.box(0, 4, 9, 0, 5, 9, twin(fur)); v.box(7, 4, 9, 7, 5, 9, twin(fur)); }               // paws, not hands
  if (from('rattle') && !roo) {
    v.box(0, 3, 12, 0, 5, 13, shirt); v.box(7, 3, 12, 7, 5, 13, shirt);                               // the trollskin shirt's short sleeves
    v.box(2, 6, 10, 2, 6, 13, '#4c3a6b'); v.box(5, 6, 10, 5, 6, 13, '#4c3a6b');                       // the jacket's faint purple glow, at its edges
  }
  if (from('patches') && !roo) { v.set(6, 6, 13, '#3f7fd0'); v.set(6, 6, 12, '#e2742a'); v.set(1, 6, 10, 'white'); }
  if (from('hearts')) for (const [x, y, z] of [[1, 6, 9], [4, 6, 8], [6, 6, 9], [6, 3, 8], [6, 5, 9]] as const) v.set(x, y, z, '#c8261c');
  if (from('sleeve')) {
    // kneepads of skin and fur, a thorn in each
    v.box(1, 6, 7, 2, 6, 7, '#6b5747'); v.box(5, 6, 7, 6, 6, 7, '#6b5747'); v.set(1, 7, 7, 'bone'); v.set(6, 7, 7, 'bone');
  }
  if (from('xistera') && !roo) v.box(7, 3, 10, 7, 5, 11, 'metal');
  if (from('cloak')) {
    // the cloak, hood down: a panel down the back, a fold at each side behind the arm with a finger bone in it
    const z0 = roo ? 9 : 6;
    v.box(0, 1, z0, 7, 1, 13, cloak);
    for (const x of [-1, 8]) { v.box(x, 0, z0, x, 2, 13, cloak); v.box(x, 3, z0, x, 3, z0 + 2, cloak); v.box(x, 1, z0 + 1, x, 1, 12, rib); }   // flaring at the hem
    v.box(1, -1, 12, 6, -1, 14, cloak);
    if (style === 'loose') v.box(0, -1, 12, 7, -1, 14, hair);
  }
  if (roo) { v.box(3, 0, 6, 4, 0, 8, fur); v.box(4, -1, 5, 9, -1, 6, fur); v.box(9, 0, 5, 10, 0, 5, fur); }   // the tail, out behind to the right
  return v;
}


/* ---- the cat ----
   A tortoiseshell Persian, sitting (1:1); from 1:7 a cat-sized crown of smoky gems round a purple
   stone; from 1:23 a skirt-like crupper of silver fae scale over her back half. The crown crumbles
   to dust (2:25); a crystal tiara with white stones (3:2); big round bug-eyed sunglasses with no arms
   (3:15); a plain silver tiara set with citrine (6:24); an opalescent tiara of tiny jewels, each a
   different colour, and a glowing white cloak so short on her it is a shawl (7:3); the crupper
   remade as fine silver chain mail with an opalescent glow (8:9). */
const DONUT = ['cat', 'crown', 'crupper', 'bare', 'tiara', 'shades', 'citrine', 'lights', 'chain'] as const;
export type DonutLook = typeof DONUT[number];
export function donut(stage: DonutLook) {
  const from = (s: DonutLook) => DONUT.indexOf(stage) >= DONUT.indexOf(s);
  const v = new Vox();
  base(v, 'stoneDark', 'stone', 12);
  v.chunk = 0;
  const choc = '#6a4630', black = '#2b1e18', ginger = '#cf8038', cream = '#d9b48c';
  const armour = !from('crupper') ? null
    : from('chain') ? (x: number, y: number, z: number) => ((x + y + z) % 4 ? '#cfd4dc' : '#bfe0ea')
    : (x: number, _y: number, z: number) => (((x >> 1) + (z >> 1)) % 2 ? '#b7bbc5' : '#9da2ad');
  // tortoiseshell in big patches, by region: ginger over the left cheek and haunch, black over the brow and back
  const coat = (x: number, y: number, z: number) =>
    armour && y <= 3 && z >= 6 && z <= 11 ? armour(x, y, z)
      : (x <= 2 && z >= 13 && z <= 15) || (x <= 2 && z <= 8 && y >= 3) || (x >= 6 && z >= 9 && z <= 11 && y <= 3) ? ginger
      : (z >= 16 && x >= 2 && x <= 5) || (y <= 1 && z >= 7) || (x >= 6 && z <= 7) ? black : choc;
  const round = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const ex = x === x0 || x === x1, ey = y === y0 || y === y1, ez = z === z0 || z === z1;
      if ((ex && ey) || (ex && ez) || (ey && ez)) continue;         // corners and edges off: it reads round
      v.set(x, y, z, coat(x, y, z));
    }
  };
  round(0, 7, 0, 6, 5, 11);                                         // sitting: a fluffy loaf
  round(-1, 8, 2, 8, 11, 17);                                       // the head, broad, forward over the chest
  // the flat Persian face: a dark mask, big copper eyes set wide, a pushed-in nose, a pale muzzle
  v.box(0, 8, 13, 7, 8, 15, black);
  v.box(1, 8, 14, 2, 8, 15, '#f0b020'); v.box(5, 8, 14, 6, 8, 15, '#f0b020');
  v.set(2, 8, 14, '#140d0a'); v.set(5, 8, 14, '#140d0a');
  v.box(3, 8, 13, 4, 8, 13, '#b77d6c'); v.box(2, 8, 12, 5, 8, 12, cream);
  // small, low ears with pink in them
  for (const x of [-1, 7]) { v.box(x, 4, 17, x + 1, 5, 18, x < 0 ? ginger : choc); v.set(x < 0 ? 0 : 7, 5, 18, '#e3a0a0'); }
  // a plume of a tail curled round the right side, and her front paws
  for (const [x, y, z] of [[8, 0, 5], [8, 1, 5], [9, 2, 5], [9, 3, 5], [9, 4, 6], [9, 5, 6], [8, 6, 6], [9, 3, 6], [8, 6, 5], [8, 7, 5]] as const) v.set(x, y, z, y > 4 ? ginger : black);
  v.box(1, 7, 5, 2, 7, 6, cream); v.box(5, 7, 5, 6, 7, 6, choc);
  if (from('shades')) for (const [x0, x1] of [[0, 2], [5, 7]] as const) {
    // the sunglasses: two big round lenses fixed over the eyes, no arms
    v.box(x0, 9, 13, x1, 9, 15, '#17161c'); for (const x of [x0, x1]) for (const z of [13, 15]) v.set(x, 9, z, null);
    v.set(x0 + 1, 9, 15, '#7d8a99');
  }
  if (from('lights')) v.box(0, 0, 10, 7, 2, 11, (x, y, z) => (v.get(x, y, z) ? (x + z) % 3 ? '#f4f2ec' : '#e6eef2' : null));   // the glowing shawl, over her back
  const tiara = (frame: string, gems: string[], mid: string) => {
    v.box(1, 3, 18, 6, 6, 18, frame);
    [[1, 3], [3, 3], [6, 3], [1, 6], [6, 6], [1, 4], [6, 4]].forEach(([x, y], i) => v.set(x, y, 19, gems[i % gems.length]));
    v.box(3, 6, 19, 4, 6, 19, mid); v.set(3, 6, 20, mid);
  };
  if (stage === 'crown' || stage === 'crupper') {
    // the Enchanted Crown of the Sepsis Whore: cat-sized, smoky dark gems, a deep purple stone in the middle
    v.box(1, 3, 18, 6, 6, 18, '#3b3740');
    for (const [x, y] of [[1, 3], [3, 3], [6, 3], [1, 6], [6, 6], [1, 4], [6, 4]] as const) v.set(x, y, 19, '#4d4856');
    v.box(3, 6, 19, 4, 6, 19, '#6a2fb0'); v.set(3, 6, 20, '#9a5ae8'); v.set(4, 6, 20, '#4d4856');
  }
  if (stage === 'tiara' || stage === 'shades') tiara('#c9ced8', ['#eef4fa', '#dfe9f2'], '#ffffff');
  if (stage === 'citrine') tiara('#c9ced8', ['#e8b923', '#d9a514'], '#f2c94c');
  if (from('lights')) {
    tiara('#e9e4f0', ['#ff6b6b', '#5ad1ff', '#ffd84a', '#8af27a', '#d07aff', '#ff9ad5', '#7af0e0'], '#fff6d8');
    for (const [x, y, c] of [[2, 6, '#ff9a4a'], [5, 6, '#7a9aff'], [1, 5, '#ffe14a'], [6, 5, '#ff6bd0']] as const) v.set(x, y, 18, c);   // a jewel in every link
  }
  return v;
}

/* ---- the game guide, in a new body on almost every floor ----
   A bearded, rat-like creature in a vest (1:2). A bugaboo (1:35): seven feet of obsidian hair, a bear
   with no neck, enormous owlish eyes, comically skinny legs and long, absurdly thin arms. An incubus
   (2:2): tall, dusky grey, short horns, long grey-and-black hair in a ponytail, black bat wings folded
   against his back, a barbed tail, a tuxedo with a bow tie. A grulke (3:2): a toad warrior, mud
   coloured and warty, jowls and a throat pouch. A skyfowl (4:1): a light-brown and beige eagle, the
   feathers round its neck ruffled. A pocket kuma (5:2): knee-high, chubby and fuzzy, brown and white,
   elf ears, a monkey tail, buck teeth, big bug eyes. A cyclops (6:2): bright pink and bald, a cone of a
   head, one brown eye under a caterpillar brow, a belly straining a white shirt. A man in a snowsuit
   and a raccoon hat, glasses (7:2). A grim reaper (8:7), floating, very long arms and withered hands,
   robes drifting, nothing inside the hood. And from 8:89, no body at all: he is the crafting table. */
export function mordecai() {
  const v = new Vox(), fur = '#7d746c', furDark = '#5a524c', beard = '#c9c2b6';
  base(v, 'stoneDark', 'stone', 13);
  v.chunk = 0;
  head(v, fur);
  v.box(2, 8, 15, 5, 8, 18, fur); v.box(3, 9, 15, 4, 9, 17, fur);      // the snout, forward
  v.set(3, 10, 17, '#e39a9a'); v.set(4, 10, 17, '#e39a9a');              // the nose
  v.box(1, 8, 14, 6, 8, 14, beard); v.box(2, 9, 13, 5, 9, 14, beard); v.box(3, 9, 12, 4, 9, 12, beard);   // the beard
  eyes(v, 'black', 19, [1, 6], 2);
  // big round ears
  for (const x0 of [-1, 5]) { v.box(x0, 2, 22, x0 + 3, 3, 25, furDark); v.set(x0, 2, 25, null); v.set(x0 + 3, 2, 25, null); v.box(x0 + 1, 3, 23, x0 + 2, 3, 24, '#e3a0a0'); }
  body(v, { top: '#e6d6b4', skin: fur, bottom: '#4a3a2c', legs: '#4a3a2c', feet: twin(fur) });
  v.box(1, 2, 10, 2, 6, 13, '#6b3f22'); v.box(5, 2, 10, 6, 6, 13, '#6b3f22');   // the vest, open over a shirt
  v.set(3, 6, 10, '#c9a24a');
  // the tail, long and pink, round behind
  for (const [x, y, z] of [[3, 1, 8], [3, 0, 7], [3, -1, 6], [2, -2, 5], [1, -2, 5], [0, -1, 5], [-1, 0, 5]] as const) v.set(x, y, z, '#e39a9a');
  return v;
}
export function bugaboo() {
  const v = new Vox(), fur = '#1e1c24', tuft = '#2d2a36';
  base(v, 'stoneDark', 'stone', 13);
  v.chunk = 0;
  // one rounded mass from the hips to the crown: no neck at all
  for (let x = -1; x <= 8; x++) for (let y = 0; y <= 7; y++) for (let z = 8; z <= 22; z++)
    if (((x - 3.5) / 4.9) ** 2 + ((y - 3.6) / 4.3) ** 2 + ((z - 15) / 7.4) ** 2 <= 1) v.set(x, y, z, (x * 3 + y * 5 + z * 7) % 11 ? fur : tuft);
  for (const [x, y] of [[1, 2], [3, 1], [5, 3], [2, 5], [6, 5], [4, 6]] as const) v.set(x, y, 23, tuft);   // hair sticking up
  // the enormous owlish eyes
  for (const x0 of [0, 5]) { v.box(x0, 8, 15, x0 + 2, 8, 17, '#e7c24a'); v.set(x0 + 1, 8, 16, 'black'); v.set(x0 + 1, 9, 16, 'black'); }
  // comically skinny legs, and long, absurdly thin arms hanging past the knees
  v.box(2, 4, 5, 2, 4, 8, fur); v.box(5, 4, 5, 5, 4, 8, fur); v.box(2, 5, 5, 2, 5, 5, tuft); v.box(5, 5, 5, 5, 5, 5, tuft);
  v.box(-2, 4, 7, -2, 4, 15, fur); v.box(9, 4, 7, 9, 4, 15, fur); v.box(-2, 5, 6, -2, 5, 7, tuft); v.box(9, 5, 6, 9, 5, 7, tuft);
  return v;
}
export function incubus() {
  const skin = '#8c8a93', hair = '#3a383f';
  const v = person({ skin, hair: { color: hair, style: 'ponytail' }, top: '#1c1b20', front: '#ecebe6', bottom: '#1c1b20', legs: '#1c1b20', feet: '#111014', seed: 13 });
  v.chunk = 0;
  for (let z = 15; z <= 21; z += 2) v.set(3, -2, z - 1, '#6a6870');                         // grey streaks in the black
  v.box(1, 5, 22, 1, 5, 23, '#2b2228'); v.box(6, 5, 22, 6, 5, 23, '#2b2228');              // short devil horns
  v.box(3, 7, 13, 4, 7, 13, 'black');                                                      // the bow tie
  for (const x of [-1, 8]) { v.box(x, 0, 8, x, 1, 17, '#18141a'); v.set(x, 0, 18, '#18141a'); }   // bat wings folded against his back
  for (const [x, y, z] of [[4, 1, 8], [5, 0, 7], [6, -1, 6], [7, -1, 6], [8, 0, 6], [9, 0, 7], [9, 1, 7], [10, 0, 7]] as const) v.set(x, y, z, twin(skin));   // the barbed tail
  return v;
}
export function grulke() {
  const v = new Vox(), mud = '#6e5c3c', wart = '#52432a', pouch = '#a8946a';
  base(v, 'stoneDark', 'stone', 13);
  v.chunk = 0;
  v.box(0, 1, 7, 7, 6, 13, mud);                                                // a squat body
  v.box(-1, 1, 13, 8, 7, 18, twin(mud));                                         // the head, wide, one with it
  v.box(0, 2, 19, 2, 5, 19, twin(mud)); v.box(5, 2, 19, 7, 5, 19, twin(mud));   // the eyes bulge on top
  v.set(1, 8, 17, 'black'); v.set(6, 8, 17, 'black'); v.box(0, 8, 17, 2, 8, 18, (x, _y, z) => (x === 1 && z === 17 ? 'black' : '#c4a440'));
  v.box(5, 8, 17, 7, 8, 18, (x, _y, z) => (x === 6 && z === 17 ? 'black' : '#c4a440'));
  v.box(-1, 8, 14, 8, 8, 14, '#3e3220');                                         // the wide mouth
  v.box(-2, 5, 11, -1, 7, 13, mud); v.box(8, 5, 11, 9, 7, 13, mud);             // the hanging jowls
  v.box(2, 7, 9, 5, 8, 12, pouch);                                               // the throat pouch
  for (const [x, y, z] of [[1, 7, 15], [5, 7, 16], [7, 4, 15], [8, 2, 17], [0, 6, 11], [7, 6, 9], [3, 1, 18], [6, 6, 12]] as const) v.set(x, y, z, wart);
  v.box(-1, 2, 5, 1, 5, 8, twin(mud)); v.box(6, 2, 5, 8, 5, 8, twin(mud));     // bent haunches
  v.box(-1, 5, 5, 2, 8, 5, mud); v.box(5, 5, 5, 8, 8, 5, mud);                  // wide feet
  v.box(-1, 6, 8, -1, 7, 10, mud); v.box(8, 6, 8, 8, 7, 10, mud);               // short arms
  return v;
}
export function skyfowl() {
  const v = new Vox(), brown = '#9b7650', beige = '#dcc69c', dark = '#76583a', beak = '#e2b33e';
  base(v, 'stoneDark', 'stone', 13);
  v.chunk = 0;
  v.box(1, 1, 7, 6, 6, 13, brown); v.box(2, 7, 8, 5, 7, 12, beige);             // the body, a beige chest
  v.box(0, 0, 13, 7, 7, 14, (x, y) => ((x + y) % 2 ? brown : dark));             // the ruff of feathers round the neck
  v.box(0, 1, 15, 7, 7, 21, beige);                                               // the head
  v.box(2, 8, 16, 5, 9, 18, beak); v.box(3, 10, 16, 4, 10, 17, beak); v.box(3, 10, 15, 4, 10, 15, '#b88a22');   // the hooked beak
  eyes(v, 'black', 19, [1, 6], 1);
  v.box(-1, 0, 8, -1, 5, 14, dark); v.box(8, 0, 8, 8, 5, 14, dark);             // the wings, folded
  v.box(2, -2, 6, 5, 0, 9, dark);                                                 // tail feathers
  v.box(2, 3, 5, 2, 4, 6, beak); v.box(5, 3, 5, 5, 4, 6, beak);                 // legs
  v.box(1, 5, 5, 3, 6, 5, beak); v.box(4, 5, 5, 6, 6, 5, beak); v.set(1, 7, 5, 'black'); v.set(6, 7, 5, 'black');   // talons
  return v;
}
export function kuma() {
  const v = new Vox(), brown = '#8b5a36', white = '#efe7d8';
  base(v, 'stoneDark', 'stone', 13);
  v.chunk = 0;
  // knee-high and chubby: a round body, a round head, both fuzzy brown with white on the front
  v.box(1, 2, 6, 6, 6, 10, brown); v.box(2, 7, 7, 5, 7, 9, white);
  v.box(1, 1, 11, 6, 6, 16, brown); v.box(2, 7, 11, 5, 7, 13, white);
  for (const x0 of [1, 5]) { v.box(x0, 7, 14, x0 + 1, 7, 15, 'black'); v.set(x0, 8, 15, 'white'); v.box(x0, 8, 14, x0 + 1, 8, 14, 'black'); }   // big bug eyes
  v.box(3, 8, 12, 4, 8, 12, '#3a2a20'); v.box(3, 8, 11, 4, 8, 11, 'white');    // a nose, buck teeth
  v.box(-1, 3, 14, 0, 4, 15, brown); v.set(-2, 3, 16, brown); v.box(7, 3, 14, 8, 4, 15, brown); v.set(9, 3, 16, brown);   // long elf ears
  v.box(1, 3, 5, 2, 6, 5, twin(brown)); v.box(5, 3, 5, 6, 6, 5, twin(brown));   // feet
  v.box(0, 4, 8, 0, 5, 9, twin(brown)); v.box(7, 4, 8, 7, 5, 9, twin(brown));   // stubby arms
  for (const [x, y, z] of [[6, 1, 7], [7, 0, 8], [8, 0, 9], [8, 0, 10], [8, 1, 11], [7, 1, 12], [7, 2, 12]] as const) v.set(x, y, z, twin(brown));   // the monkey tail, curled
  return v;
}
export function cyclops() {
  const v = new Vox(), skin = '#ef80aa';
  base(v, 'stoneDark', 'stone', 13);
  v.chunk = 0;
  head(v, skin);
  v.box(1, 1, 22, 6, 6, 22, skin); v.box(2, 2, 23, 5, 5, 23, skin); v.box(3, 3, 24, 4, 4, 25, skin);   // a cone of a head
  v.box(1, 7, 20, 6, 7, 20, twin(skin)); v.box(2, 7, 21, 5, 7, 21, twin(skin));                     // furrowed
  v.box(2, 7, 15, 5, 7, 18, 'white'); v.box(3, 7, 16, 4, 7, 17, '#6b4226');                         // the one big brown eye
  v.box(1, 8, 19, 6, 8, 19, '#3a2a22');                                                              // the caterpillar brow
  body(v, { top: '#ecebe6', skin, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES });
  v.box(2, 7, 9, 5, 7, 12, '#ecebe6'); v.box(3, 8, 10, 4, 8, 11, '#ecebe6'); v.set(3, 8, 10, skin);  // the belly straining the shirt
  v.box(-1, 4, 8, 0, 6, 9, twin(skin)); v.box(7, 4, 8, 8, 6, 9, twin(skin));                        // sausage fingers
  return v;
}
export function canadian() {
  const v = person({ skin: '#e6bf9c', top: PLAIN_TOP, bottom: PLAIN_TOP, legs: PLAIN_TOP, feet: PLAIN_SHOES, glasses: '#1c1c1c', sleeves: 'long', seed: 13 });
  v.chunk = 0;
  // the snowsuit's collar, and the raccoon hat with its ringed tail hanging down the back
  v.box(1, 2, 13, 6, 6, 13, twin(PLAIN_TOP));
  v.box(0, 0, 21, 7, 7, 22, '#6e6258'); v.box(0, 7, 20, 7, 7, 20, '#6e6258'); v.box(1, 1, 23, 6, 6, 23, '#5f544b');
  for (let z = 13; z <= 20; z++) v.set(7, -1, z, Math.floor(z / 2) % 2 ? '#3a332d' : '#8c8076');
  return v;
}
export function reaper() {
  const fig = new Vox(), robe = '#2b2a30', canvas = '#3a3833', hand = '#b9b1a0';
  fig.chunk = 0;
  // robes from a ragged hem to the shoulders, drifting
  fig.box(0, 1, 2, 7, 6, 13, (x, y, z) => (z === 2 && (x + y) % 3 === 0 ? null : (x + z) % 5 ? robe : canvas));
  fig.box(-1, 0, 4, -1, 2, 11, robe); fig.box(8, 0, 4, 8, 2, 11, robe);
  // the hood, and nothing inside it
  fig.box(-1, -1, 14, 8, 7, 22, robe); fig.box(1, 2, 23, 6, 5, 23, robe); fig.box(0, 7, 15, 7, 7, 20, 'void'); fig.box(1, 6, 16, 6, 6, 19, 'void');
  // very long arms, the sleeves hanging past the knees, withered hands
  fig.box(-2, 3, 5, -2, 5, 13, canvas); fig.box(9, 3, 5, 9, 5, 13, canvas);
  fig.box(-2, 4, 3, -2, 5, 4, hand); fig.box(9, 4, 3, 9, 5, 4, hand); fig.set(-2, 6, 3, hand); fig.set(9, 6, 3, hand);
  return floating(fig, 3, 'mist', 13);
}
export function craftingTable() {
  const v = new Vox();
  base(v, 'stoneDark', 'stone', 13);
  v.chunk = 0;
  for (const [x, y] of [[0, 1], [7, 1], [0, 7], [7, 7]] as const) v.box(x, y, 5, x, y, 10, 'woodDark');
  v.box(0, 1, 7, 7, 7, 7, 'woodDark');                                           // the stretcher
  v.box(-1, 0, 11, 8, 8, 12, 'wood');                                            // the thick top
  v.box(6, 7, 13, 8, 8, 14, 'metal'); v.box(7, 9, 13, 7, 9, 13, 'metalDark');    // a vise at the end
  v.box(1, 3, 13, 4, 3, 13, 'woodDark'); v.box(4, 2, 13, 4, 4, 14, 'metalDark'); // a hammer
  v.box(1, 5, 13, 3, 6, 13, 'metal');                                            // a tray of something
  // and, faintly, whoever lives in it
  for (const [x, y, z] of [[2, 4, 16], [4, 5, 18], [3, 3, 20], [5, 4, 15]] as const) v.set(x, y, z, 'portal');
  return v;
}

/* ---- the Borant representative: two feet of kua-tin in a 1950s spacesuit, a round glass helmet full of
   water (1:36); out of the suit (5:17), thinner than any kua-tin Carl has seen, a rebreather round her throat ---- */
export function zev(stage: 'suit' | 'rebreather' = 'suit') {
  if (stage === 'rebreather') return zevOut();
  const v = new Vox(), suit = '#e8e6df', trim = '#9aa3ad';
  base(v, 'stoneDark', 'stone', 14);
  v.chunk = 0;
  // a short body in white mesh: two feet tall, barely to the knee
  v.box(1, 2, 9, 6, 6, 12, suit); v.box(0, 3, 9, 0, 5, 12, twin(suit)); v.box(7, 3, 9, 7, 5, 12, twin(suit));
  v.box(0, 4, 8, 0, 5, 8, trim); v.box(7, 4, 8, 7, 5, 8, trim);                          // gloves
  v.box(1, 3, 6, 2, 5, 8, twin(suit)); v.box(5, 3, 6, 6, 5, 8, twin(suit));             // legs
  v.box(1, 3, 5, 2, 7, 5, trim); v.box(5, 3, 5, 6, 7, 5, trim);                           // boots
  for (const [x, z] of [[2, 10], [4, 11], [5, 9], [3, 12]] as const) v.set(x, 6, z, '#cfcac0');   // the mesh
  v.box(1, 6, 12, 6, 6, 12, trim);                                                        // the collar ring
  // the bulky backpack, and a pair of tubes from it to the back of the helmet
  v.box(1, -1, 8, 6, 1, 13, '#b8bcc2'); v.box(2, -1, 13, 2, -1, 15, trim); v.box(5, -1, 13, 5, -1, 15, trim);
  // the round glass helmet, filled with water, and the fish face in it
  v.chunk = 1;
  for (let x = 0; x <= 7; x++) for (let y = 0; y <= 7; y++) for (let z = 13; z <= 20; z++) {
    const d = Math.hypot(x - 3.5, y - 3.5, z - 16.5);
    if (d <= 4.2 && d >= 3.3) v.set(x, y, z, 'tank');
  }
  v.chunk = 0;
  v.box(2, 2, 14, 5, 5, 17, '#5f9e8a'); v.box(3, 2, 18, 4, 4, 19, '#4d8573');             // the kua-tin head, a fin on top
  v.set(1, 4, 16, '#7fbfa8'); v.set(6, 4, 16, '#7fbfa8');                                 // side fins
  v.set(2, 5, 16, 'black'); v.set(5, 5, 16, 'black'); v.box(3, 5, 15, 4, 5, 15, '#2f5446');   // eyes and a wide mouth, behind the glass
  v.set(1, 6, 18, '#f4fbff'); v.set(1, 6, 17, '#f4fbff');                                 // a glint on the glass
  return v;
}
function zevOut() {
  const v = new Vox(), skin = '#5f9e8a', fin = '#4d8573', light = '#7fbfa8';
  base(v, 'stoneDark', 'stone', 14);
  v.chunk = 0;
  // the same fish face, now out in the air: a fin on top, fins at the sides, a wide mouth
  v.box(1, 1, 13, 6, 6, 18, skin); v.box(3, 2, 19, 4, 4, 20, fin); v.box(0, 3, 15, 0, 4, 17, light); v.box(7, 3, 15, 7, 4, 17, light);
  eyes(v, 'black', 16, [2, 5], 1); v.box(2, 7, 14, 5, 7, 14, '#2f5446');
  v.box(1, 6, 13, 6, 6, 18, skin);
  // so thin: a narrow body, thin limbs, flippers for feet
  v.box(2, 3, 9, 5, 5, 12, skin); v.box(1, 4, 9, 1, 4, 12, twin(skin)); v.box(6, 4, 9, 6, 4, 12, twin(skin));
  v.box(2, 4, 6, 2, 4, 8, twin(skin)); v.box(5, 4, 6, 5, 4, 8, twin(skin)); v.box(1, 4, 5, 2, 6, 5, fin); v.box(5, 4, 5, 6, 6, 5, fin);
  // the rebreather round her throat, misting
  v.box(1, 2, 12, 6, 6, 12, 'metalDark'); v.box(3, 7, 12, 4, 7, 12, 'metal'); v.set(3, 8, 13, 'mist'); v.set(4, 8, 12, 'mist');
  return v;
}

/* ---- the pet ----
   Hatched (1:46): a chicken dinosaur thing, raw-chicken pink with a few pink feathers. Almost twice
   the size (2:5): longer, thicker pink feathers along his little arms with a line of deep red, a
   longer tail, a black magical collar. Pony-sized, as tall as Carl's chest (2:21). Full grown (3:7):
   about thirteen feet from beak to tail, more than half of it a colourful red and blue feathered
   tail, with a saddle for the cat. A cheap pharaoh's headdress, blue and gold stripes, its two bands
   hanging down like floppy ears (8:11). */
export function mongo() {
  const v = new Vox(), skin = '#f0b6a2', feather = '#ee7fb4', claw = '#e9dccb';
  base(v, 'stoneDark', 'stone', 15);
  v.chunk = 0;
  v.box(1, 2, 8, 6, 6, 12, skin);                                    // a plump body
  v.box(2, 5, 12, 5, 8, 16, twin(skin));                             // the head, up and forward
  v.box(2, 9, 13, 5, 10, 14, skin);                                  // the snout
  v.set(2, 8, 15, 'black'); v.set(5, 8, 15, 'black');                 // eyes
  v.box(3, -1, 9, 4, 1, 10, skin); v.box(3, -3, 9, 4, -2, 9, skin);  // a short tail
  v.box(1, 3, 5, 2, 5, 7, twin(skin)); v.box(5, 3, 5, 6, 5, 7, twin(skin));   // big legs
  v.box(1, 6, 5, 2, 7, 5, claw); v.box(5, 6, 5, 6, 7, 5, claw);       // clawed feet
  v.set(1, 7, 10, twin(skin)); v.set(6, 7, 10, twin(skin));           // little arms
  for (const [x, y, z] of [[4, 6, 17], [2, 3, 13], [6, 4, 12], [3, 1, 11], [1, 5, 11], [6, 2, 9]] as const) v.set(x, y, z, feather);   // a few random pink feathers
  return v;
}
export function mongoJuvenile() {
  const v = new Vox(), skin = '#f0b6a2', feather = '#ee7fb4', red = '#b0233a', claw = '#e9dccb';
  base(v, 'stoneDark', 'stone', 15);
  v.chunk = 0;
  v.box(0, 1, 8, 7, 6, 13, skin);                                                        // twice the size
  v.box(1, 5, 14, 6, 9, 19, twin(skin)); v.box(1, 10, 15, 6, 11, 16, skin);             // the head, a wider beak
  v.box(1, 9, 17, 2, 9, 18, '#8fb3d9'); v.box(5, 9, 17, 6, 9, 18, '#8fb3d9'); v.set(2, 9, 17, 'black'); v.set(5, 9, 17, 'black');   // bluish skin round the eyes
  v.box(1, 5, 13, 6, 8, 13, 'black');                                                    // the magical collar
  for (const x of [-1, 8]) { v.box(x, 4, 9, x, 7, 12, feather); v.box(x, 4, 9, x, 7, 9, red); }   // feathered arms, a line of deep red
  v.box(2, -1, 9, 5, 0, 12, skin); v.box(3, -4, 8, 4, -2, 10, skin); v.box(3, -6, 7, 4, -5, 8, skin);   // a longer tail
  v.box(0, 2, 5, 2, 5, 7, twin(skin)); v.box(5, 2, 5, 7, 5, 7, twin(skin));
  v.box(0, 6, 5, 2, 7, 5, claw); v.box(5, 6, 5, 7, 7, 5, claw);
  for (const [x, y, z] of [[2, 2, 14], [6, 3, 13], [4, 1, 13], [1, 3, 12], [7, 2, 10], [3, 6, 20], [4, 7, 20]] as const) v.set(x, y, z, feather);
  return v;
}
/** the grown raptor: pony height on big clawed feet, the feathered arms, the long tail */
function raptor(o: { tail: [string, string]; saddle?: boolean; nemes?: boolean }) {
  const v = new Vox(), skin = '#f0b6a2', feather = '#ee7fb4', red = '#b0233a', claw = '#e9dccb';
  wideBase(v, -3, 10, 15, -6, 11);
  v.chunk = 0;
  v.box(1, 2, 5, 2, 5, 10, twin(skin)); v.box(6, 2, 5, 7, 5, 10, twin(skin));                 // thick legs
  v.box(0, 5, 5, 3, 8, 5, claw); v.box(5, 5, 5, 8, 8, 5, claw);                                // claws bigger than he once was
  v.box(0, 0, 10, 8, 7, 16, skin);                                                             // the body
  v.box(2, 6, 16, 6, 9, 19, skin); v.box(1, 7, 20, 7, 12, 25, twin(skin)); v.box(1, 13, 21, 7, 14, 22, skin);   // neck, head, beak
  v.box(1, 12, 23, 2, 12, 24, '#8fb3d9'); v.box(6, 12, 23, 7, 12, 24, '#8fb3d9'); v.set(2, 12, 23, 'black'); v.set(6, 12, 23, 'black');
  v.box(2, 6, 19, 6, 9, 19, 'black');                                                          // the collar
  for (const x of [-1, 9]) { v.box(x, 5, 11, x, 9, 15, feather); v.box(x, 5, 11, x, 9, 11, red); }
  // the tail: more than half of him, feathered in two colours
  [[2, -3, 11, 6, -1, 15], [3, -6, 11, 5, -4, 14], [3, -9, 10, 5, -7, 13], [4, -12, 10, 4, -10, 12]].forEach(([a, b, c, d, e, f], i) => v.box(a, b, c, d, e, f, o.tail[i % 2]));
  if (o.saddle) { v.box(2, 1, 17, 6, 4, 17, red); v.box(2, 1, 18, 2, 4, 19, red); v.box(6, 1, 18, 6, 4, 18, '#2e4f9c'); v.box(3, 4, 18, 5, 4, 19, '#2e4f9c'); }   // a cat-sized saddle, in his colours
  if (o.nemes) {
    const stripe = (n: number) => (n % 2 ? '#2f5fbf' : '#d8b13a');
    v.box(1, 7, 26, 7, 11, 26, (x) => stripe(x)); v.box(0, 7, 20, 0, 9, 26, (_x, _y, z) => stripe(z)); v.box(8, 7, 20, 8, 9, 26, (_x, _y, z) => stripe(z));
  }
  return v;
}

/* ---- the doppelganger ----
   As first met (2:21): eyes too big and too high, a crooked nose, a lumpy chin, hair much too thick, a
   poorly sewn tracksuit and blocky snow boots: a face she is still learning to make. Back in the
   dungeon (3:2): the mostly human blond face, the nose fixed, the blue tracksuit. A slick black
   bodysuit, badly shaped knee-high boots and a purple mohawk (3:6). Her fighting form (3:15): a
   pink-skinned giant with spikes on her back, a leather outfit, black boots, the mohawk. The massive
   repeating crossbow slung over her shoulder (3:24); a six-foot riot shield on her left arm, a curved
   half-cylinder with a small window at the top and blocky white lettering (3:31). The crossbow goes
   to the cat (7:86); the shield stays. */
const KATIA = ['first-face', 'blond', 'mohawk', 'hulk', 'crossbow', 'shield', 'shielded'] as const;
export type KatiaLook = typeof KATIA[number];
export function katia(stage: KatiaLook = 'first-face') {
  const skin = '#e8b994', blond = '#e2c25a', suit = '#5d7f9c', purple = '#8a3fd0';
  if (stage === 'blond') return person({ skin, hair: { color: blond, style: 'long' }, top: suit, bottom: suit, legs: twin(suit), feet: '#d9d2c4', seed: 16 });
  if (stage === 'mohawk') return person({ skin, hair: { color: purple, style: 'mohawk' }, top: '#18171c', bottom: '#18171c', legs: '#2a2a30', feet: '#2a2a30', seed: 16 });
  if (stage !== 'first-face') return katiaHulk(stage);
  const v = new Vox(), hair = blond;
  base(v, 'stoneDark', 'stone', 16);
  v.chunk = 0;
  head(v, skin);
  v.box(1, 7, 18, 2, 7, 20, 'black'); v.box(5, 7, 18, 6, 7, 20, 'black');   // eyes too big and too high
  v.set(2, 7, 20, '#f5f0e6'); v.set(6, 7, 20, '#f5f0e6');
  v.set(5, 8, 16, twin(skin)); v.set(5, 8, 17, twin(skin)); v.set(6, 8, 16, twin(skin));   // a crooked, sideways nose
  v.box(2, 7, 13, 5, 7, 13, twin(skin)); v.set(4, 8, 14, twin(skin));         // a lumpy chin
  // the hair: blond and much too thick, in strands
  v.box(0, 0, 21, 7, 7, 22, hair); v.box(0, 0, 14, 7, 1, 20, hair);
  for (const x of [0, 7]) for (const z of [12, 14, 16, 18, 20]) v.box(x, 2, z, x, 3, z + 1, hair);
  for (const x of [0, 2, 3, 5, 7]) v.set(x, 7, 21, hair);
  // a poorly sewn tracksuit and blocky snow boots
  body(v, { top: suit, skin, bottom: suit, legs: twin(suit), feet: '#d9d2c4', sleeves: [suit, suit] });
  v.box(3, 6, 10, 3, 6, 13, '#7a9ab5'); v.set(1, 6, 12, '#4a6680'); v.set(6, 6, 10, '#4a6680');
  v.box(1, 3, 5, 2, 7, 6, '#d9d2c4'); v.box(5, 3, 5, 6, 7, 6, '#d9d2c4');
  return v;
}
function katiaHulk(stage: KatiaLook) {
  const from = (s: KatiaLook) => KATIA.indexOf(stage) >= KATIA.indexOf(s);
  const v = new Vox(), skin = '#e98aa9', leather = '#3b2e27', boots = '#1d1b1f', purple = '#8a3fd0';
  wideBase(v, -3, 10, 16, -1, 10);
  v.chunk = 0;
  // as wide as she is tall: thick legs in black boots, a broad body in leather, huge arms
  v.box(0, 2, 5, 2, 5, 9, boots); v.box(5, 2, 5, 7, 5, 9, boots); v.box(0, 6, 5, 2, 6, 5, boots); v.box(5, 6, 5, 7, 6, 5, boots);
  v.box(-1, 1, 10, 8, 6, 15, leather); v.box(2, 7, 11, 5, 7, 14, twin(leather));
  v.box(-3, 2, 9, -2, 5, 15, skin); v.box(9, 2, 9, 10, 5, 15, skin);
  v.box(-3, 3, 8, -2, 5, 8, twin(skin)); v.box(9, 3, 8, 10, 5, 8, twin(skin));
  // her head, the purple mohawk
  v.box(0, 0, 16, 7, 7, 23, skin); eyes(v, 'black', 19);
  v.box(3, 0, 24, 4, 7, 26, purple);
  // spikes down her back, standing out past the shoulder
  for (const [x, y, z] of [[9, 0, 12], [10, 0, 13], [9, 0, 10], [10, -1, 11], [-2, 0, 12], [-3, 0, 13], [5, -1, 17], [6, -2, 18]] as const) v.set(x, y, z, twin(skin));
  if (from('crossbow') && !from('shielded')) {
    // the repeating crossbow slung across her back, up over the right shoulder
    for (let t = 0; t <= 9; t++) v.set(-1 + t, -1, 10 + t, 'woodDark');
    v.box(6, -1, 19, 11, -1, 19, 'metalDark'); v.box(7, -2, 17, 8, -1, 18, 'metal');
  }
  if (from('shield')) {
    // the riot shield on her left arm, in front: curved, a small window at the top, blocky white marks
    v.box(-4, 8, 5, 2, 8, 17, '#2e3238'); v.box(-3, 9, 5, 1, 9, 17, '#2e3238');
    v.box(-2, 10, 6, 0, 10, 16, '#343940');
    v.box(-2, 10, 14, 0, 10, 15, 'glass');
    for (const [x, z] of [[-2, 10], [0, 10], [-1, 9], [-2, 8], [0, 8]] as const) v.set(x, 10, z, 'white');
  }
  return v;
}

/* Where the book leaves a colour unsaid (hair, a shirt), a figure takes a plain,
   dark one: it may not assert anything the page has not told the reader. */

/* ---- the brothers' party of four, first seen on a screen (1:42) ---- */
// the one with the acne scars, no armour and no weapon; an eyepatch (7:50), then a robotic eye (7:56)
export function liJun(stage: 'scars' | 'patch' | 'robot') {
  const skin = '#e3b58e';
  const v = person({ skin, hair: { color: '#1b1612', style: 'short' }, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 31 });
  for (const [x, z] of [[1, 16], [1, 15], [6, 16], [6, 15], [2, 15]] as const) v.set(x, 7, z, '#c48d68');   // the scars
  if (stage === 'patch') { v.box(4, 7, 17, 6, 7, 18, '#1b1714'); v.set(7, 7, 19, '#1b1714'); }
  if (stage === 'robot') { v.box(4, 7, 16, 6, 7, 18, 'metalDark'); v.set(5, 7, 17, 'portal'); }
  return v;
}
// the bald one, built sturdy; glowing black and gold segmented armour by 3:31
export function zhang(stage: 'plain' | 'armor') {
  const armor = stage === 'armor';
  const v = person({ skin: '#e0ae86', hair: { color: '#000000', style: 'bald' }, top: armor ? '#1f1d24' : PLAIN_TOP, outfit: armor ? 'armor' : 'shirt',
    bottom: armor ? '#1f1d24' : PLAIN_BOTTOM, feet: armor ? '#1f1d24' : PLAIN_SHOES, seed: 32 });
  if (armor) for (const z of [10, 12]) { v.box(1, 6, z, 6, 6, z, 'accentGlow'); v.box(0, 5, z, 0, 5, z, 'accentGlow'); v.box(7, 3, z, 7, 5, z, 'accentGlow'); }
  if (armor) { v.box(1, 5, 7, 2, 5, 7, 'accentGlow'); v.box(5, 5, 7, 6, 5, 7, 'accentGlow'); }
  return v;
}
// a slight woman first, but drawn only once the book describes her (3:32): rail thin, deathly pale, a mouth almost
// twice as wide as it should be, a short pair of black horns through black hair, a flowing white and red robe with
// long wide arms, chains hanging from them to the ground; one good eye and one mechanical from 8:61
export function liNa(stage: 'changbi' | 'gear-eye') {
  const skin = '#ebe8e2';
  const v = person({ skin, hair: { color: '#141114', style: 'long' }, eyes: '#140d10', top: '#f1ede6', outfit: 'robe', bottom: '#f1ede6', feet: '#f1ede6', seed: 33 });
  v.box(1, 7, 15, 6, 7, 15, '#3a1820');                                   // the wide mouth
  v.box(1, 7, 19, 6, 7, 19, twin(skin)); v.set(4, 7, 19, twin(skin));      // the ridged brow, under the fringe
  for (const x of [1, 6]) { v.box(x, 5, H1 + 1, x, 6, H1 + 2, '#2a2228'); v.set(x, 6, H1 + 3, '#2a2228'); v.set(x + (x < 4 ? -1 : 1), 6, H1 + 3, '#2a2228'); }   // horns
  // long, wide sleeves almost to the floor, red at the cuffs, and the chains hanging out of them
  v.box(-1, 2, 7, 0, 6, 13, '#f1ede6'); v.box(7, 2, 7, 8, 6, 13, '#f1ede6');
  v.box(-1, 2, 7, 0, 6, 7, '#b3262a'); v.box(7, 2, 7, 8, 6, 7, '#b3262a'); v.box(1, 6, 6, 6, 6, 6, '#b3262a');
  for (const [x, y, z] of [[-1, 7, 6], [-1, 8, 5], [0, 9, 5], [1, 10, 5], [8, 7, 6], [8, 8, 5], [9, 9, 5], [9, 10, 5], [10, 10, 5]] as const) v.set(x, y, z, z === 5 && (x + y) % 2 ? 'metal' : 'metalDark');   // chains, dragging
  if (stage === 'gear-eye') { v.box(4, 7, 17, 6, 7, 18, 'metal'); v.set(5, 7, 17, 'ember'); v.set(6, 8, 18, 'metalDark'); }
  return v;
}

/* ---- Brynhild's Daughters' leader as first named (1:39): a Nordic shieldmaiden, a glittering breastplate, a
   Valkyrie helmet, the enchanted crossbow that shoots firebolts; from 2:7 an Amazonian, a foot taller and built
   like a bodybuilder, blonde, the crossbow now automatic ---- */
export function hekla(stage: 'shieldmaiden' | 'amazonian') {
  const big = stage === 'amazonian';
  const v = person({ skin: '#f0c9a6', top: '#d9d4c8', outfit: 'armor', bottom: '#4a4d55', feet: '#d8cdb8',
    hat: { color: '#b3b7bd', kind: 'helmet', trim: '#b3b7bd' }, seed: 34, ...(big ? { hair: { color: '#e8cf74', style: 'long' as const } } : {}) });
  v.box(1, 8, 17, 6, 8, 18, 'void'); v.clear(1, 8, 17, 6, 8, 18);             // the helmet's opening shows the face
  v.box(1, 6, 11, 6, 6, 13, '#e6d48a'); v.set(2, 6, 12, '#fff3c4'); v.set(5, 6, 11, '#fff3c4');   // the glittering breastplate
  for (const x of [-2, 9]) { v.box(x, 3, H1 - 1, x, 5, H1 + 1, 'white'); v.set(x, 2, H1 + 2, 'white'); }   // the helmet's wings
  if (big) { v.box(-1, 3, 9, 0, 6, 13, twin('#f0c9a6')); v.box(7, 3, 9, 8, 6, 13, twin('#f0c9a6')); v.box(-1, 3, 12, 8, 6, 13, '#cfc9bc'); }
  // the crossbow, held level in the right hand, a firebolt in it
  v.box(8, 3, 10, 8, 9, 10, 'woodDark'); v.box(7, 9, 10, 9, 9, 10, 'metalDark'); v.set(7, 8, 11, 'metalDark'); v.set(9, 8, 11, 'metalDark');
  v.set(8, 10, 10, 'ember');
  if (big) v.box(8, 4, 11, 8, 6, 11, 'metal');
  return v;
}

/* ---- the Meadow Lark crew, met at 1:22 ---- */
// the older brother: taller, less stocky, a metal skullcap and no weapon; lava rock covered in little holes from
// 3:8, eyes like burning coals and molten heat by 4:14; human-shaped again in his Meadow Lark work overalls at 8:84
export function chrisAndrews(stage: 'skullcap' | 'igneous' | 'molten' | 'overalls') {
  if (stage === 'igneous' || stage === 'molten') {
    const rock = '#45403d', v = person({ skin: rock, eyes: stage === 'molten' ? 'ember' : 'black', top: rock, bottom: rock, feet: rock, seed: 35 });
    for (const [x, y, z] of [[1, 7, 15], [6, 7, 20], [3, 7, 21], [2, 6, 12], [5, 6, 10], [7, 4, 12], [7, 2, 18], [7, 5, 15], [1, 6, 8], [6, 5, 6], [4, 7, 15]] as const) v.set(x, y, z, '#1c1918');
    if (stage === 'molten') for (const [x, y, z] of [[3, 6, 11], [4, 6, 12], [7, 3, 10], [2, 7, 16], [7, 6, 20]] as const) v.set(x, y, z, 'ember');
    return v;
  }
  const overalls = stage === 'overalls';
  const v = person({ skin: '#6e4a33', hair: { color: '#16110e', style: 'buzz' }, top: overalls ? '#53698a' : PLAIN_TOP, bottom: overalls ? '#53698a' : PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 36 });
  if (overalls) { v.box(2, 6, 12, 2, 6, 13, '#3f526e'); v.box(5, 6, 12, 5, 6, 13, '#3f526e'); v.box(3, 6, 10, 4, 6, 11, '#3f526e'); }
  else v.box(0, 0, H1, 7, 7, H1 + 1, 'metal');                                // the metal skullcap
  return v;
}
// the younger brother: a chubby guy in a heavy winter jacket, a gigantic hammer looped over his shoulder, its round
// head almost as wide as a tyre, glittering, magical metal
export function brandon() {
  const jacket = '#34405a';
  const v = person({ skin: '#5e3c2a', hair: { color: '#16110e', style: 'buzz' }, top: jacket, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 37 });
  v.box(2, 7, 10, 5, 7, 12, jacket);                                          // a round middle
  for (const z of [10, 12]) { v.box(1, 6, z, 6, 6, z, twin(jacket)); v.box(2, 7, z, 5, 7, z, twin(jacket)); }   // the jacket's quilting
  v.chunk = 0;
  // the haft, from his right hand back over the shoulder; the head slung behind it, round and nearly as wide
  // as a tyre, a bright rim on each face, glittering. (Drawn beside his head, at its depth, it read as a lump
  // growing out of his face.)
  for (const [x, y, z] of [[8, 5, 9], [8, 4, 10], [8, 4, 11], [8, 3, 12], [8, 2, 13], [8, 1, 14], [8, 0, 14]] as const) { v.set(x, y, z, 'wood'); v.set(x + 1, y, z, 'wood'); }
  const cy = -2, cz = 14, r = 3.1;
  for (let x = 7; x <= 12; x++) for (let y = -6; y <= 2; y++) for (let z = 10; z <= 18; z++) {
    const d = Math.hypot(y - cy, z - cz); if (d > r) continue;
    v.set(x, y, z, x === 7 || x === 12 ? (d > r - 1.1 ? '#d9dce1' : 'metal') : '#b3b7bd');
  }
  for (const [y, z] of [[-1, 16], [-4, 14], [0, 13]] as const) v.set(12, y, z, '#fff3c4');
  return v;
}
// a round woman of about fifty, four foot eleven, in medical scrubs with an ID badge on her breast, a bow, and a
// quiver so big on her it almost drags on the floor
export function yolanda() {
  const scrubs = '#5f9ea0';
  const v = person({ skin: '#c98e66', hair: { color: PLAIN_HAIR, style: 'bob' }, top: scrubs, sleeves: 'short', bottom: scrubs, feet: '#e3ded4', seed: 38 });
  v.box(2, 7, 10, 5, 7, 12, scrubs);                                          // round
  v.set(2, 7, 13, 'white');                                                    // the badge
  v.box(5, -1, 6, 6, 0, 16, '#7a4a2a'); for (const x of [5, 6]) v.set(x, -1, 17, '#eeeae2');   // the huge quiver, almost to the floor
  v.box(-1, 5, 8, -1, 5, 15, 'woodDark'); v.set(-1, 6, 7, 'woodDark'); v.set(-1, 6, 16, 'woodDark');   // the bow
  return v;
}

/* ---- Carl's ex, as first described on Odette's show (5:19): thin, long straight hair, freckles, pouty lips, very
   pale, a glittering red gown, ridiculously tall heels and her ever-present anklet. Before it she is only
   remembered, and stands as a shadow. ---- */
export function beatrice() {
  const skin = '#f2d6c4', gown = '#c0222a';
  const v = person({ skin, hair: { color: '#6a4a33', style: 'long' }, top: gown, outfit: 'dress', bottom: gown, legs: twin(skin), feet: '#1b1714', sleeves: 'none', seed: 39 });
  for (const [x, z] of [[1, 16], [2, 16], [6, 16], [5, 16]] as const) v.set(x, 7, z, '#c98e76');   // freckles
  v.box(3, 7, 15, 4, 7, 15, '#d4687a');                                        // pouty lips
  for (const [x, y, z] of [[1, 7, 8], [6, 7, 9], [3, 7, 7], [5, 7, 6], [0, 4, 8], [7, 4, 7]] as const) v.set(x, y, z, '#ff7b6b');   // the glitter
  v.box(1, 3, 4, 2, 4, 4, '#1b1714'); v.box(5, 3, 4, 6, 4, 4, '#1b1714');      // the heels, lifting her
  v.set(6, 5, 6, 'accent');                                                    // the anklet
  return v;
}

/* ---- the Meadow Lark crawlers ---- */
// very slight, terrified, hollowed-out eyes, in medical scrubs and a magical cloak, a longsword (1:22); from 3:8 an
// Obsidian Butterfly: gaunt, a white skull painted on her face, four translucent wings coloured like a monarch's
export function imani(stage: 'scrubs' | 'butterfly') {
  const skin = '#b47c58', scrubs = '#5d7f86';
  const fig = person({ skin, hair: { color: PLAIN_HAIR, style: 'bun' }, top: scrubs, sleeves: 'short', bottom: scrubs, feet: PLAIN_SHOES, cape: '#3b3550', held: { kind: 'sword', color: 'rail' }, bare: stage === 'butterfly', seed: 41 });
  fig.set(2, 7, 16, twin(skin)); fig.set(5, 7, 16, twin(skin));                       // the hollows under her eyes
  if (stage === 'scrubs') return fig;
  // the painted skull: white over the face, the sockets and the nose dark, a row of teeth
  fig.box(1, 7, 15, 6, 7, 19, '#ece7dd'); fig.box(1, 7, 17, 3, 7, 18, 'black'); fig.box(4, 7, 17, 6, 7, 18, 'black');
  fig.set(3, 7, 16, 'black'); fig.set(4, 7, 16, 'black'); for (const x of [2, 4]) fig.set(x, 7, 15, '#3a3532');
  const v = new Vox();
  wideBase(v, -5, 12, 42);
  // four wings, upper and lower either side, see-through, veined and edged dark
  for (const side of [-1, 1]) for (const [z0, z1, w] of [[14, 23, 6], [7, 13, 5]] as [number, number, number][]) {
    const xs = side < 0 ? [-w, -1] : [8, 7 + w];
    for (let x = xs[0]; x <= xs[1]; x++) for (let z = z0; z <= z1; z++) {
      const edge = x === xs[0] || x === xs[1] || z === z0 || z === z1, vein = (x + z) % 4 === 0;
      v.set(x, 0, z, edge || vein ? 'wingDark' : (z + x) % 5 === 0 ? '#f7f2e8' : 'wing');
    }
  }
  copyInto(v, fig);
  return v;
}
// pushing seventy, black eyes, wrapped head to toe in scarves, a red checkered trapper hat with ear flaps skewed on
// her head; a shopping cart piled with blankets and a pink plastic flamingo with an arrow through its head, and a
// blue bag of spray-paint cans (1:22)
export function agatha() {
  const v = new Vox(), skin = '#c99f84';
  wideBase(v, -3, 16, 43);
  const scarves = ['#7a5a8a', '#8a6a3e', '#55697a', '#7d3a35', '#6a7a4a'];
  const fig = person({ skin, top: scarves[0], bottom: scarves[2], legs: scarves[4], feet: PLAIN_SHOES, bare: true });
  for (let z = 6; z <= 13; z++) { fig.box(1, 6, z, 6, 6, z, scarves[z % scarves.length]); fig.box(7, 3, z > 9 ? z : 0, 7, 5, z > 9 ? z : 0, scarves[(z + 2) % scarves.length]); }
  fig.box(1, 7, 14, 6, 8, 15, scarves[3]); fig.box(6, 8, 11, 6, 8, 14, scarves[3]);   // a scarf round the chin, its end hanging
  fig.set(1, 7, 16, twin(skin)); fig.set(6, 7, 16, twin(skin)); fig.set(3, 7, 19, twin(skin));   // wrinkles
  // the trapper hat, red and black checks, the flaps down over the ears, skewed
  for (let x = -1; x <= 8; x++) for (let y = -1; y <= 8; y++) fig.set(x, y, H1 + (x > 3 ? 1 : 0), ((x >> 1) + (y >> 1)) % 2 ? '#b8262a' : '#2a1d1d');
  fig.box(-1, 3, H0 + 2, -1, 5, H1, '#b8262a'); fig.box(8, 3, H0 + 2, 8, 5, H1, '#b8262a');
  fig.box(-1, 4, 7, -1, 6, 9, '#2f5fb0'); fig.set(-1, 5, 10, '#d23a8a'); fig.set(-1, 4, 10, '#3ab07a');   // the blue bag, cans in it
  copyInto(v, fig);
  // the cart: a wire frame on four wheels, blankets heaped in it, the flamingo standing up out of them
  for (let x = 9; x <= 15; x++) for (let y = 2; y <= 8; y++) for (let z = 7; z <= 11; z++) {
    const ex = x === 9 || x === 15, ey = y === 2 || y === 8, ez = z === 7 || z === 11;
    if ((ex && ey) || (ex && ez) || (ey && ez)) v.set(x, y, z, 'rail');
  }
  for (const [x, y] of [[9, 2], [15, 2], [9, 8], [15, 8]] as const) { v.set(x, y, 6, 'rail'); v.set(x, y, 5, 'black'); }
  v.box(10, 3, 8, 14, 7, 10, '#7a6a9a'); v.box(11, 4, 11, 14, 6, 11, '#a85a4a'); v.box(10, 5, 11, 11, 7, 12, '#5a7a8a');
  v.box(12, 5, 12, 12, 5, 16, '#ee7fb4'); v.box(12, 5, 17, 13, 6, 18, '#ee7fb4'); v.set(14, 6, 17, 'black');
  v.box(11, 5, 18, 14, 5, 18, 'woodDark'); v.set(10, 5, 18, 'white'); v.set(15, 5, 18, 'metal');   // the arrow through its head
  return v;
}
// a very old woman in a wheelchair, in a care home's robe (1:31); from 3:8 a Frost Maiden: light blue skin, white,
// haphazardly-cut hair, about four and a half feet, floating a foot off the ground, still in the home's anti-slip
// socks; from 5:36 a brown streak in the white and a gold wedding ring on a chain round her neck; an ice staff by 6:2
export function elle(stage: 'chair' | 'frost' | 'ring' | 'staff') {
  if (stage === 'chair') {
    const v = new Vox(), skin = '#e7c4aa', robe = '#9db4c8';
    base(v, 'stoneDark', 'stone', 44);
    v.chunk = 0;
    head(v, skin); eyes(v); v.set(2, 7, 16, twin(skin)); v.set(5, 7, 16, twin(skin));
    v.box(0, 0, H1 - 1, 7, 7, H1, '#d8d3cc'); v.box(0, 0, H0 + 1, 7, 1, H1, '#d8d3cc'); v.box(0, 7, H1 - 2, 7, 7, H1 - 2, '#d8d3cc');
    v.box(1, 2, 10, 6, 6, 13, robe); v.box(0, 3, 10, 0, 5, 13, twin(robe)); v.box(7, 3, 10, 7, 5, 13, twin(robe));
    v.box(1, 3, 9, 6, 8, 9, robe);                                                   // sitting: the lap forward
    v.box(1, 8, 6, 2, 9, 8, twin(skin)); v.box(5, 8, 6, 6, 9, 8, twin(skin)); v.box(1, 9, 5, 2, 10, 5, '#d8cfc0'); v.box(5, 9, 5, 6, 10, 5, '#d8cfc0');
    // the chair: a seat, two big wheels at her sides, handles behind
    v.box(1, 2, 8, 6, 8, 8, 'metalDark');
    for (const x of [-1, 8]) for (let y = 1; y <= 9; y++) for (let z = 5; z <= 13; z++) { const d = Math.hypot(y - 5, z - 9); if (d <= 4.4 && d >= 3.4) v.set(x, y, z, 'black'); else if (d < 0.8) v.set(x, y, z, 'rail'); }
    v.box(1, 0, 10, 1, 1, 15, 'metalDark'); v.box(6, 0, 10, 6, 1, 15, 'metalDark');
    return v;
  }
  const skin = '#9fcdf0', fig = person({ skin, hair: { color: '#f3f6f8', style: 'messy' }, top: '#e8f2f8', outfit: 'dress', bottom: '#d4e6f2', legs: '#d8cfc0', feet: '#d8cfc0', bare: true,
    ...(stage === 'staff' ? { held: { kind: 'staff' as const, color: '#cfe8f7', tip: 'glass' } } : {}) });
  for (const x of [-1, 8]) { fig.set(x, 4, 18, skin); fig.set(x, 4, 19, skin); }   // the points of her ears
  for (const [x, y] of [[1, 5], [2, 4], [5, 6], [6, 4]] as const) fig.set(x, y, 5, '#b9b0a2');   // the socks' grips
  if (stage !== 'frost') { fig.box(2, 0, H1 - 1, 3, 7, H1, '#7a5233'); fig.set(2, 7, 19, '#7a5233'); fig.box(3, 6, 12, 4, 6, 12, 'accent'); fig.set(3, 7, 13, '#c9a24a'); }
  return floating(fig, 3, 'portal', 45);
}
// a girl of about thirteen in an oversized yellow soccer jersey with a thick blue stripe, worn like a tabard over a
// full set of glowing silver armour, a mace, an angry face, and her rottweiler in its chainmail sweater (1:14); a
// grown woman whose face goes from a great beauty to a skull from 2:7; a goat's leg from 4:4; a skeleton's leg
// beside it and a nimbus of flame round her by 5:37
export function lucia(stage: 'girl' | 'woman' | 'goat' | 'flame') {
  const v = new Vox(), skin = '#b98563', silver = '#c9ced6', jersey = '#f2c81c';
  wideBase(v, -5, 9, 46);
  const fig = person({ skin, hair: { color: '#15121a', style: stage === 'girl' ? 'ponytail' : 'long' }, top: jersey, bottom: silver, legs: silver, feet: silver, bare: true });
  fig.box(0, 3, 10, 0, 5, 13, silver); fig.box(7, 3, 10, 7, 5, 13, silver);
  fig.box(1, 6, 11, 6, 6, 11, '#2a4fb0'); fig.box(7, 2, 11, 7, 2, 11, '#2a4fb0');   // the stripe
  fig.box(8, 5, 9, 8, 5, 13, 'woodDark'); fig.box(8, 4, 14, 8, 6, 15, 'metalDark'); fig.set(8, 7, 15, 'metal'); fig.set(8, 3, 14, 'metal');   // the mace
  fig.box(1, 7, 19, 2, 7, 19, '#15121a'); fig.box(5, 7, 19, 6, 7, 19, '#15121a');   // brows down
  if (stage !== 'girl') { fig.box(0, 7, 14, 3, 7, 18, '#ece7dd'); fig.box(1, 7, 17, 2, 7, 18, 'black'); fig.set(2, 7, 15, 'black'); fig.set(0, 7, 15, '#3a3532'); }   // half of her face a skull
  if (stage === 'goat' || stage === 'flame') { fig.box(1, 3, 5, 2, 5, 9, '#7a5a3e'); fig.box(1, 4, 5, 2, 6, 5, '#2a201a'); }   // a goat's leg and hoof
  if (stage === 'flame') { fig.box(5, 3, 6, 6, 5, 9, '#ece7dd'); fig.set(5, 4, 7, '#3a3532'); for (const [x, y, z] of [[-1, 3, 16], [8, 2, 19], [-1, 6, 10], [8, 6, 12], [3, 1, 23], [6, 0, 22], [0, 1, 21], [8, 4, 8]] as const) fig.set(x, y, z, 'ember'); }
  copyInto(v, fig);
  // the rottweiler, black and tan, in its chainmail sweater
  const dog = (x0: number, y0: number) => {
    v.box(x0, y0, 6, x0 + 2, y0 + 3, 7, 'metal'); v.box(x0, y0 + 4, 7, x0 + 2, y0 + 5, 9, '#1b1714'); v.box(x0 + 1, y0 + 6, 7, x0 + 1, y0 + 6, 8, '#a0622e');
    for (const [dx, dy] of [[0, 0], [2, 0], [0, 3], [2, 3]] as const) v.set(x0 + dx, y0 + dy, 5, '#1b1714');
    v.set(x0, y0 + 5, 9, '#a0622e'); v.set(x0 + 2, y0 + 5, 9, '#a0622e'); v.set(x0 + 1, y0 - 1, 7, '#1b1714');
  };
  dog(-4, 3);
  return v;
}

/* ---- the couple on the recap (1:20) ---- */
// he: forty, tall and lean, a few days' stubble, a Seahawks beanie, filthy ripped jeans, a black t-shirt, spiked
// football shoulder pads of glowing black metal, heavy boots, a gun. She: forty, athletic, close-cropped brown hair,
// shining metallic pants and boots, a leather jacket like Carl's but with both sleeves, a pistol
export function frankAndMaggie() {
  const v = new Vox();
  wideBase(v, -2, 19, 47, -5, 10);
  const frank = person({ skin: '#e6b693', top: '#1d1c20', bottom: '#4b6b98', legs: '#4b6b98', feet: '#2b2724', hat: { color: '#0d2547', kind: 'beanie', trim: '#69be28' }, bare: true });
  frank.box(1, 7, 14, 6, 7, 15, '#c9967a');                                        // stubble
  for (const x0 of [-1, 7]) { frank.box(x0, 2, 13, x0 + 1, 6, 14, '#141318'); frank.set(x0, 3, 15, '#141318'); frank.set(x0 + 1, 5, 15, '#141318'); frank.set(x0, 6, 14, 'portal'); }
  frank.set(1, 5, 7, '#7d9cc5'); frank.set(6, 5, 6, '#7d9cc5');                    // the rips
  frank.box(8, 5, 9, 8, 7, 9, 'metalDark');                                        // the gun
  const maggie = person({ skin: '#ecbf9f', hair: { color: '#5b3b26', style: 'buzz' }, top: '#6e4023', front: '#2b2724', bottom: '#c6ccd4', legs: '#c6ccd4', feet: '#aab1ba', bare: true });
  maggie.set(-1, 5, 9, 'metalDark');
  copyInto(v, frank); copyInto(v, maggie, 10, -5, 0);
  return v;
}

/* ---- on Odette's show (1:27): absurdly thin, not from Earth, long blonde hair in a tight bun, a simple black dress,
   clutching a tablet ---- */
export function lexis() {
  const v = person({ skin: '#efd0b4', hair: { color: '#ecd27c', style: 'bun' }, top: '#141216', outfit: 'dress', bottom: '#141216', legs: twin('#efd0b4'), feet: '#141216', seed: 48 });
  v.box(8, 4, 9, 8, 7, 12, '#2b2f38'); v.box(8, 8, 10, 8, 8, 11, 'portal');      // the tablet, lit
  return v;
}
/* ---- Meadow Lark's guide, as first seen (6:48): an older, blue-skinned half-elf with slitted eyes, drunk, drinking
   straight from the bottle. Before it she is a name, and stands as a shadow. ---- */
export function tiatha() {
  const skin = '#7fa3c4', v = person({ skin, hair: { color: PLAIN_HAIR, style: 'bun' }, top: PLAIN_TOP, outfit: 'robe', bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 49 });
  v.box(2, 7, 18, 2, 7, 18, skin); v.box(5, 7, 18, 5, 7, 18, skin);               // half-shut, slitted
  for (const x of [-1, 8]) { v.set(x, 4, 18, skin); v.set(x, 4, 19, skin); }
  v.box(8, 5, 9, 8, 5, 12, '#2f6b4a'); v.set(8, 5, 13, '#2f6b4a'); v.set(8, 5, 14, 'woodDark');   // the bottle
  return v;
}
/* ---- the first safe room (1:9): a hairy dwarf barely taller than the counter, hair brown with an odd green tinge
   over everything but his black eyes and a bulbous, red-veined nose; a blue apron, a plain paper hat, a nametag ---- */
export function tally() {
  const fur = '#6d5b34';
  const v = person({ skin: fur, top: fur, bottom: fur, feet: '#3a2e1e', seed: 50 });
  v.box(0, 7, 14, 7, 7, 21, twin(fur)); v.set(2, 7, 18, 'black'); v.set(5, 7, 18, 'black');   // hair over the whole face
  v.box(3, 8, 15, 4, 9, 16, '#c95b5b'); v.set(4, 9, 16, '#9a3a3a');               // the nose
  v.box(2, 7, 8, 5, 7, 13, '#3a6fb8'); v.box(1, 6, 13, 6, 6, 13, '#3a6fb8');      // the apron
  v.set(4, 8, 12, 'white');                                                        // the nametag
  v.box(1, 2, 22, 6, 5, 22, 'white'); v.box(2, 3, 23, 5, 4, 23, 'white'); v.box(3, 3, 24, 4, 4, 24, 'white');   // the paper hat
  return v;
}
/* ---- Carl's father, as Carl last sees him (6:45): once a big man, now light and dying, the brown he always dyed
   his hair gone to grey, sickly wisps, his skin a deep, mottled yellow, an IV in his arm. Before it he is only
   remembered. ---- */
export function carlsFather() {
  const skin = '#d4b86e', gown = '#b9c9d6';
  const v = person({ skin, hair: { color: '#b4b2ae', style: 'buzz' }, top: gown, sleeves: 'short', bottom: gown, outfit: 'robe', feet: twin(skin), seed: 51 });
  for (const [x, z] of [[1, 15], [6, 16], [2, 19], [5, 20]] as const) v.set(x, 7, z, '#b39a58');   // the spots
  v.box(2, 7, 17, 2, 7, 17, skin); v.box(5, 7, 17, 5, 7, 17, skin);               // slitted eyes
  for (const [x, y] of [[1, 3], [3, 5], [6, 2], [5, 6]] as const) v.set(x, y, H1, skin);   // thin, wispy
  v.box(10, 4, 5, 10, 4, 20, 'rail'); v.box(9, 3, 18, 11, 5, 20, '#dfeef5'); v.box(8, 4, 10, 9, 4, 10, '#dfeef5');   // the IV stand, its bag and line
  return v;
}

/* ---- the goddess of chaos, as first seen close (8:35): a woman of Carl's height with something of the snake about
   her, a swirl on her lips, a mouth a little too big and a forked tongue; blonde and strong like the crawler her
   pilot made herself into (7:62); at 8:97 her body below the waist is the tails of thousands of snakes ---- */
export function eris(stage: 'woman' | 'snakes') {
  const skin = '#e8d2b6', v = person({ skin, hair: { color: '#e9cf76', style: 'long' }, eyes: '#e1b320', top: '#3d3348', outfit: stage === 'woman' ? 'dress' : 'shirt', bottom: '#3d3348', feet: '#3d3348', seed: 52, bare: stage === 'snakes' });
  v.set(2, 7, 18, 'black'); v.set(5, 7, 18, 'black');                            // slit pupils
  v.box(2, 7, 15, 5, 7, 15, '#7a2a52'); v.set(3, 7, 15, '#e0b0c8');               // the lips, a swirl on them
  v.set(3, 8, 15, '#c0303a'); v.set(2, 9, 15, '#c0303a'); v.set(4, 9, 15, '#c0303a');   // the forked tongue
  if (stage === 'woman') return v;
  const out = new Vox();
  wideBase(out, -4, 11, 53);
  copyInto(out, v, 0, 0, 2);
  out.chunk = 0;
  for (let i = 0; i < 26; i++) {                                                   // the tails, writhing out across the ground
    const a = i * 2.4, r = 2 + (i % 5);
    const x = Math.round(3.5 + Math.cos(a) * r), y = Math.round(4.5 + Math.sin(a) * r * 0.8), z = 5 + (i % 3);
    out.box(x, y, 5, x, y, z, i % 2 ? '#3f5a3a' : '#556b40'); if (i % 4 === 0) out.set(x, y, z + 1, '#d9cfae');
  }
  out.box(1, 2, 5, 6, 6, 9, '#556b40');
  return out;
}

/* ---- the boar-orcs of the Skull Empire ---- */
// a boar's head on a crawler's frame: dark hide under black bristles, a snout with tusks, small pig eyes
function boarHead(v: Vox, hide: string, tusks: [string, string]) {
  v.box(0, 0, H0, 7, 7, H1, hide);
  v.box(0, 0, H1 - 1, 7, 7, H1 + 1, '#141012'); v.box(0, 0, H0, 7, 1, H1, '#141012');
  for (const [x, y] of [[1, 2], [3, 4], [5, 1], [6, 5], [2, 6]] as const) v.set(x, y, H1 + 2, '#141012');
  v.box(-1, 3, H1 - 2, -1, 4, H1, hide); v.box(8, 3, H1 - 2, 8, 4, H1, hide);   // ears
  v.box(2, 8, H0 + 1, 5, 9, H0 + 3, twin(hide)); v.set(3, 10, H0 + 2, '#1b1714'); v.set(4, 10, H0 + 2, '#1b1714');   // the snout
  v.box(1, 8, H0, 1, 8, H0 + 2, tusks[0]); v.box(6, 8, H0, 6, 8, H0 + 2, tusks[1]); v.set(1, 9, H0 + 2, tusks[0]); v.set(6, 9, H0 + 2, tusks[1]);
  v.set(1, 7, H0 + 4, 'black'); v.set(6, 7, H0 + 4, 'black');                    // pig eyes
}
// a boar-orc built like a tank, dark flesh under black bristles, his left tusk all gold, a line of earrings round his
// left ear, a hot pink silk shirt buttoned halfway up over a hairy chest hung with gold chains (1:42)
export function maestro() {
  const hide = '#4a352e', v = new Vox();
  base(v, 'stoneDark', 'stone', 61);
  v.chunk = 0;
  boarHead(v, hide, ['accent', '#efe6d2']);
  for (const z of [H1 - 2, H1 - 1, H1]) v.set(-2, 4, z, 'accent');               // the earrings
  body(v, { top: '#ff4fa3', skin: hide, bottom: '#2b2430', feet: '#2b2724' });
  v.box(-1, 3, 10, 0, 5, 13, '#ff4fa3'); v.box(7, 3, 10, 8, 5, 13, '#ff4fa3');   // arms like legs
  v.box(3, 6, 11, 4, 6, 13, '#2a1d18'); v.box(2, 7, 12, 5, 7, 12, 'accent'); v.set(3, 7, 11, 'accent'); v.set(4, 7, 13, 'accent');   // the open shirt, the chains
  return v;
}
// the same boar creature, leaner than his brother (2:19); a crown from 7:42
export function stalwart(stage: 'prince' | 'king') {
  const hide = '#5a4236', v = new Vox();
  base(v, 'stoneDark', 'stone', 62);
  v.chunk = 0;
  boarHead(v, hide, ['#efe6d2', '#efe6d2']);
  body(v, { top: '#3a3640', skin: hide, bottom: '#2b2430', feet: '#2b2724' });
  if (stage === 'king') { v.box(1, 1, H1 + 2, 6, 6, H1 + 2, 'accent'); for (const [x, y] of [[1, 1], [6, 1], [1, 6], [6, 6], [3, 6], [6, 3]] as const) v.set(x, y, H1 + 3, 'accent'); v.set(3, 6, H1 + 3, 'red'); }
  return v;
}
// like his elder son, a giant baby turned orc; old and tired in glittering armour covered in feathers, a colourful
// tidal wave of them, gaudy rings on all his fingers (7:32)
export function rust() {
  const hide = '#4f3a30', v = new Vox();
  base(v, 'stoneDark', 'stone', 63);
  v.chunk = 0;
  boarHead(v, hide, ['#d9cfae', '#d9cfae']);
  v.box(1, 7, H0 + 5, 6, 7, H0 + 5, twin(hide));                                  // heavy, tired lids
  const feathers = ['#d23a3a', '#2f6fd0', '#e8c21c', '#3aa05a', '#d06a2a', '#8a3ab0'];
  body(v, { top: feathers[0], skin: hide, bottom: '#2b2430', feet: '#2b2724' });
  for (let z = 6; z <= 14; z++) for (const [x, y] of [[1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 3], [7, 4], [7, 5], [0, 5]] as const) if (z >= 10 || x === 7 || x === 0) v.set(x + (z > 13 ? 0 : 0), y, z, feathers[(x * 3 + z * 2) % feathers.length]);
  v.box(-1, 2, 13, 8, 6, 14, feathers[2]); v.set(-1, 4, 15, feathers[4]); v.set(8, 3, 15, feathers[1]); v.set(8, 5, 15, feathers[3]);
  v.set(0, 4, 9, 'accent'); v.set(7, 5, 9, 'accent'); v.set(7, 4, 9, 'accent');   // rings
  return v;
}

/* ---- the god of war, as first seen whole (3:33): a black-skinned, overly muscular minotaur on a horse's body, the
   head of a big, angry bull with a golden ring in its snout, and a smoking, double-headed axe, its handle a living
   oak tree and its head like still-molten metal ---- */
export function grull() {
  const v = new Vox(), hide = '#1d1a1c', hoof = '#3a3236';
  wideBase(v, -3, 11, 64, -7, 10);
  v.chunk = 0;
  v.box(1, -5, 9, 6, 5, 13, hide);                                                 // the horse's body, along the floor
  for (const [x, y] of [[1, -5], [5, -5], [1, 4], [5, 4]] as const) { v.box(x, y, 5, x + 1, y + 1, 8, twin(hide)); v.box(x, y, 5, x + 1, y + 1, 5, hoof); }
  v.box(3, -7, 11, 4, -6, 12, hide); v.box(3, -8, 8, 4, -8, 11, '#2a2427');        // the tail
  v.box(1, 4, 14, 6, 7, 19, hide);                                                  // the man's chest, rising from the front
  v.box(-1, 5, 14, 0, 7, 19, twin(hide)); v.box(7, 5, 14, 8, 7, 19, twin(hide));   // arms
  v.box(1, 3, 20, 6, 8, 25, '#2a2427');                                             // the bull's head
  v.box(2, 9, 20, 5, 10, 22, '#3a3236'); v.set(3, 11, 21, 'black'); v.set(4, 11, 21, 'black');
  v.box(3, 11, 19, 4, 11, 19, 'accent'); v.set(2, 11, 20, 'accent'); v.set(5, 11, 20, 'accent');   // the golden ring
  v.set(2, 8, 24, 'ember'); v.set(5, 8, 24, 'ember');                               // the eyes, angry
  for (const [x0, dx] of [[0, -1], [7, 1]] as const) { v.box(x0, 5, 26, x0, 6, 26, 'bone'); v.set(x0 + dx, 5, 27, 'bone'); v.set(x0 + dx * 2, 5, 28, 'bone'); v.set(x0 + dx * 2, 5, 29, 'bone'); }
  // the axe: an oak for a haft, leaves still on it, two blades like molten metal, smoke off them
  v.box(9, 7, 8, 9, 7, 26, '#5c3a20'); v.set(10, 7, 14, 'leaf'); v.set(8, 7, 19, 'leafLight'); v.set(10, 7, 23, 'leaf');
  for (let z = 22; z <= 28; z++) { const w = 3 - Math.abs(z - 25) * 0.6; for (let d = 1; d <= w; d++) { v.set(9, 7 + d, z, d > w - 1 ? 'ember' : '#c8501c'); v.set(9, 7 - d, z, d > w - 1 ? 'ember' : '#c8501c'); } }
  for (const [x, y, z] of [[9, 9, 29], [10, 8, 30], [9, 6, 30], [10, 7, 31], [9, 8, 32]] as const) v.set(x, y, z, 'mist');
  return v;
}

/* ---- the Krakaren clone on the second floor: first a pair of pink tentacles, each fifteen feet long, covered in
   mouths with bright red, human lips (1:33); dead, the whole of her (1:35), twenty feet of octopus with a beaked
   mouth and a group of eyes, black streaks running down her like mascara ---- */
export function krakaren(stage: 'tentacles' | 'body') {
  const v = new Vox(), pink = '#e48aa6', lips = '#d1202a';
  wideBase(v, -3, 11, 65, -2, 11);
  v.chunk = 0;
  const tentacle = (x0: number, y0: number, h: number, lean: number) => {
    for (let z = 5; z <= 5 + h; z++) {
      const t = (z - 5) / h, x = Math.round(x0 + Math.sin(t * 3) * lean), y = Math.round(y0 + t * lean);
      v.box(x, y, z, x + 1, y + 1, z, pink);
      if ((z - 5) % 4 === 2) { v.set(x, y + 2, z, lips); v.set(x + 1, y + 2, z, lips); }
    }
  };
  if (stage === 'tentacles') { v.box(1, 3, 4, 6, 7, 4, 'black'); tentacle(1, 4, 18, 2); tentacle(5, 5, 15, -2); return v; }
  for (let x = -1; x <= 8; x++) for (let y = 0; y <= 8; y++) for (let z = 9; z <= 22; z++) if (((x - 3.5) / 5) ** 2 + ((y - 4) / 4.6) ** 2 + ((z - 15) / 7) ** 2 <= 1) v.set(x, y, z, pink);
  for (const [x, z] of [[2, 17], [4, 18], [6, 17], [3, 15], [5, 16], [1, 15]] as const) { v.set(x, 8, z, 'black'); v.set(x, 8, z - 1, '#e8c21c'); }   // a group of eyes
  for (const [x, z0] of [[2, 16], [4, 14], [6, 15], [3, 13]] as const) for (let z = z0 - 4; z < z0; z++) v.set(x, 9, z, '#1b1714');   // the mascara, running
  v.box(3, 9, 10, 4, 9, 11, '#3a2a2a'); v.set(3, 10, 10, 'bone');                  // the beak
  for (const [x, y, dx, dy] of [[-1, 6, -1, 1], [8, 6, 1, 1], [-1, 1, -1, -1], [8, 1, 1, -1], [3, 9, 0, 1]] as const) for (let i = 0; i < 4; i++) { v.set(x + dx * i, y + dy * i, 5 + (i === 3 ? 1 : 0), pink); if (i === 2) v.set(x + dx * i, y + dy * i + 1, 6, lips); }
  return v;
}

/* ---- the queen's familiar (5:69-5:73): a big orange tomcat, an enormous poofy turban of gold fabric with a white
   feather about four feet long (5:70); he loses the hat (6:12); a turban of thin white tissues and a gold chain with a
   small jewelled charm by 7:10 ---- */
export function ferdinand(stage: 'turban' | 'bare' | 'tissue') {
  const v = new Vox(), fur = '#d98a3a', stripe = '#b56a24', pale = '#f0c48a';
  base(v, 'stoneDark', 'stone', 66);
  v.chunk = 0;
  const coat = (x: number, y: number, z: number) => ((x + z) % 4 === 0 && y < 6 ? stripe : fur);
  const round = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const ex = x === x0 || x === x1, ey = y === y0 || y === y1, ez = z === z0 || z === z1;
      if ((ex && ey) || (ex && ez) || (ey && ez)) continue;
      v.set(x, y, z, coat(x, y, z));
    }
  };
  round(0, 7, 0, 6, 5, 11); round(-1, 8, 2, 8, 11, 17);
  v.box(1, 8, 14, 2, 8, 14, '#7dbb3a'); v.box(5, 8, 14, 6, 8, 14, '#7dbb3a'); v.set(2, 8, 14, 'black'); v.set(5, 8, 14, 'black');   // eyes
  v.box(3, 8, 13, 4, 8, 13, '#c26a6a'); v.box(2, 8, 12, 5, 8, 12, pale);
  for (const x of [-1, 7]) { v.box(x, 4, 17, x + 1, 5, 19, fur); v.set(x < 0 ? 0 : 7, 5, 18, '#e3a0a0'); }   // ears, a tom's
  for (const [x, y, z] of [[8, 0, 6], [9, 1, 7], [9, 2, 8], [9, 3, 9], [9, 4, 10], [9, 5, 10]] as const) v.set(x, y, z, z % 2 ? stripe : fur);   // the tail, up
  v.box(1, 7, 5, 2, 7, 6, pale); v.box(5, 7, 5, 6, 7, 6, pale);
  if (stage === 'turban') {
    for (let x = -1; x <= 8; x++) for (let y = 1; y <= 8; y++) for (let z = 18; z <= 22; z++) if (((x - 3.5) / 5) ** 2 + ((y - 4.5) / 4.4) ** 2 + ((z - 19) / 3.2) ** 2 <= 1) v.set(x, y, z, (x + y + z) % 3 ? '#e0b02a' : '#c99620');
    v.set(3, 8, 20, 'red'); v.box(3, 7, 21, 3, 7, 26, 'white'); v.set(3, 6, 27, 'white'); v.set(3, 5, 28, 'white'); v.set(3, 4, 28, 'white');   // the jewel and the long white feather
  }
  if (stage === 'tissue') {
    for (let x = 0; x <= 7; x++) for (let y = 2; y <= 7; y++) v.set(x, y, 18, (x + y) % 2 ? '#f4f1ea' : '#e6e1d6');
    v.box(1, 3, 19, 6, 6, 19, '#f4f1ea'); v.box(7, 7, 15, 7, 7, 17, '#f4f1ea');    // one end sagging
    v.box(1, 7, 10, 6, 7, 10, 'accent'); v.set(3, 8, 10, '#3fc9c0');               // the chain, its jewel
  }
  return v;
}

/* ---- the talk show host: in costume (1:28) a crab-taur, the lower body a king crab's shell, black and red and
   lumpy, as big as a bear, on many legs, a dark torso, a black triangular bug head with mirrored compound eyes the
   size of footballs and antennae six feet across; her real self (1:29): a woman of about sixty with no body below
   the stomach, eyes a little too wide, in a dark shirt with a heart on a necklace, floating on a flat hovering disc ---- */
export function odette(stage: 'costume' | 'herself') {
  const v = new Vox();
  if (stage === 'herself') {
    base(v, 'stoneDark', 'stone', 67);
    v.chunk = 0;
    const skin = '#c08a6a';
    v.box(-1, 0, 9, 8, 8, 10, '#3a3f4a'); v.box(-1, 8, 9, 8, 8, 9, 'glassTeal'); for (const [x, y] of [[1, 2], [6, 6], [3, 4]] as const) v.set(x, y, 7, 'portal');   // the disc, a faint glow under it
    head(v, skin); v.set(1, 7, 17, 'black'); v.set(1, 7, 18, 'black'); v.set(6, 7, 17, 'black'); v.set(6, 7, 18, 'black');   // eyes set too wide
    v.box(0, 0, H1 - 1, 7, 7, H1, '#2b2220'); v.box(0, 0, H0, 7, 1, H1, '#2b2220'); v.box(0, 7, H1 - 2, 7, 7, H1 - 2, '#2b2220');
    v.box(1, 2, 11, 6, 6, 13, '#262a33'); v.box(0, 3, 11, 0, 5, 13, twin('#262a33')); v.box(7, 3, 11, 7, 5, 13, twin('#262a33'));   // no body below the stomach
    v.set(3, 7, 13, '#d0303a'); v.set(4, 7, 13, '#d0303a'); v.set(3, 7, 12, '#d0303a');   // the heart on its necklace
    return v;
  }
  wideBase(v, -4, 12, 68, -3, 11);
  v.chunk = 0;
  for (let x = -3; x <= 10; x++) for (let y = -2; y <= 9; y++) for (let z = 7; z <= 12; z++)
    if (((x - 3.5) / 7) ** 2 + ((y - 3.5) / 6) ** 2 + ((z - 8) / 4) ** 2 <= 1) v.set(x, y, z, (x * 3 + y + z) % 5 === 0 ? '#1b1416' : (x + y) % 3 ? '#8a1f1c' : '#5a1412');
  for (const [x, y, dx, dy] of [[-3, 1, -1, 0], [-3, 5, -1, 0], [10, 1, 1, 0], [10, 5, 1, 0], [0, 9, 0, 1], [7, 9, 0, 1], [0, -2, 0, -1], [7, -2, 0, -1]] as const) { v.set(x + dx, y + dy, 7, '#5a1412'); v.set(x + dx * 2, y + dy * 2, 6, '#5a1412'); v.set(x + dx * 2, y + dy * 2, 5, '#1b1416'); }
  v.box(1, 3, 12, 6, 7, 16, '#3a2218');                                             // the torso
  v.box(0, 4, 13, 0, 6, 16, twin('#3a2218')); v.box(7, 4, 13, 7, 6, 16, twin('#3a2218'));
  for (let z = 17; z <= 23; z++) { const w = Math.round((23 - z) * 0.6) + 1; v.box(4 - w, 3, z, 3 + w, 8, z, '#141214'); }   // the bug head, a triangle
  v.box(0, 8, 19, 2, 9, 21, '#b9d6e6'); v.box(5, 8, 19, 7, 9, 21, '#b9d6e6'); v.set(1, 9, 21, 'white'); v.set(6, 9, 21, 'white');   // mirrored eyes
  for (const [x, dx] of [[2, -1], [5, 1]] as const) for (let i = 1; i <= 6; i++) v.set(x + dx * i, 6 - Math.floor(i / 2), 23 + i, '#141214');   // antennae
  return v;
}

/* ---- the System AI: it has no body, only the voice in a crawler's head and the boxes it writes in, so its figure
   is one of its own message boxes hanging over the ground, gold on black ---- */
export function systemAi() {
  const v = new Vox();
  base(v, 'stoneDark', 'stone', 69);
  v.chunk = 0;
  v.box(-1, 3, 9, 8, 4, 18, '#0d0c0c');                                            // the box
  for (let x = -1; x <= 8; x++) { v.set(x, 5, 9, 'accent'); v.set(x, 5, 18, 'accent'); }
  for (let z = 9; z <= 18; z++) { v.set(-1, 5, z, 'accent'); v.set(8, 5, z, 'accent'); }
  for (const x of [1, 3, 5]) v.set(x, 5, 16, 'accentGlow');                         // *** ... ***
  for (const [x0, x1, z] of [[1, 6, 14], [1, 4, 12], [1, 5, 10]] as const) v.box(x0, 5, z, x1, 5, z, '#8a8680');   // its words
  for (const [x, y] of [[2, 4], [5, 4], [3, 5]] as const) v.set(x, y, 5, 'portal');
  return v;
}

/* ---- a character not pictured yet ----
   A figure of shadow on its patch of ground with the System's question mark
   over it, as an uncharted floor has one: a placeholder in the house style,
   never a grey box. Nothing in it is a fact, so it is served to anyone. */
const MARK = ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'];
export function unpictured(): Vox {
  const v = new Vox(), shade = '#3a3b42', deep = '#2c2d33';
  base(v, 'stoneDark', 'stone', 17);
  v.chunk = 0;
  head(v, shade);
  body(v, { top: deep, skin: shade, bottom: deep, legs: twin(deep), feet: twin(shade) });
  MARK.forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') { v.set(i + 1, 4, H0 + 16 - j, 'accentGlow'); v.set(i + 1, 3, H0 + 16 - j, 'accent'); } }));
  return v;
}

/* Every figure drawn, by character id and look. A look named in the data and
   missing here fails test-maps; so does one that does not render. */
export const VOXEL_FIGURES: Record<string, Record<string, () => Vox>> = {
  carl: Object.fromEntries(CARL.map(l => [l, () => carl(l)])),
  'princess-donut': Object.fromEntries(DONUT.map(l => [l, () => donut(l)])),
  mordecai: { rat: mordecai, bugaboo, incubus, grulke, skyfowl, kuma, cyclops, canadian, reaper, table: craftingTable },
  zev: { suit: () => zev('suit'), rebreather: () => zev('rebreather') },
  mongo: { chick: mongo, juvenile: mongoJuvenile, pony: () => raptor({ tail: ['#ee7fb4', '#b0233a'] }),
    grown: () => raptor({ tail: ['#c8261c', '#2e4f9c'], saddle: true }), nemes: () => raptor({ tail: ['#c8261c', '#2e4f9c'], saddle: true, nemes: true }) },
  katia: Object.fromEntries(KATIA.map(l => [l, () => katia(l)])),
  'li-jun': { scars: () => liJun('scars'), patch: () => liJun('patch'), robot: () => liJun('robot') },
  zhang: { plain: () => zhang('plain'), armor: () => zhang('armor') },
  'li-na': { changbi: () => liNa('changbi'), 'gear-eye': () => liNa('gear-eye') },
  hekla: { shieldmaiden: () => hekla('shieldmaiden'), amazonian: () => hekla('amazonian') },
  'chris-andrews': { skullcap: () => chrisAndrews('skullcap'), igneous: () => chrisAndrews('igneous'), molten: () => chrisAndrews('molten'), overalls: () => chrisAndrews('overalls') },
  brandon: { hammer: brandon },
  yolanda: { scrubs: yolanda },
  beatrice: { gown: beatrice },
  imani: { scrubs: () => imani('scrubs'), butterfly: () => imani('butterfly') },
  agatha: { cart: agatha },
  'elle-mcgibbons': { chair: () => elle('chair'), frost: () => elle('frost'), ring: () => elle('ring'), staff: () => elle('staff') },
  'lucia-mar': { girl: () => lucia('girl'), woman: () => lucia('woman'), goat: () => lucia('goat'), flame: () => lucia('flame') },
  'frank-and-maggie': { recap: frankAndMaggie },
  lexis: { tablet: lexis },
  'mistress-tiatha': { bottle: tiatha },
  tally: { apron: tally },
  'carls-father': { last: carlsFather },
  eris: { woman: () => eris('woman'), snakes: () => eris('snakes') },
  maestro: { shirt: maestro },
  'prince-stalwart': { prince: () => stalwart('prince'), king: () => stalwart('king') },
  rust: { feathers: rust },
  grull: { axe: grull },
  krakaren: { tentacles: () => krakaren('tentacles'), body: () => krakaren('body') },
  ferdinand: { turban: () => ferdinand('turban'), bare: () => ferdinand('bare'), tissue: () => ferdinand('tissue') },
  odette: { costume: () => odette('costume'), herself: () => odette('herself') },
  'system-ai': { box: systemAi },
  /* books 2 to 8, each in its own file */
  ...BOOK2_FIGURES,
  ...BOOK3_FIGURES,
  ...BOOK4_FIGURES,
  ...BOOK5_FIGURES,
  ...BOOK6_FIGURES,
  ...BOOK7_FIGURES,
  ...BOOK8_FIGURES,
};
