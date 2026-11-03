import { Vox } from '../vox.ts';
import { base, head, eyes, body, twin, person, copyInto, wideBase, floating, H0, H1, PLAIN_HAIR, PLAIN_TOP, PLAIN_BOTTOM, PLAIN_SHOES } from './parts.ts';

/* ---- the eighth book's cast: the racers, the garage and the hangers-on of the
   tenth floor and the eleventh ----
   The same rules as book 1's cast (cast.ts): each look opens at the chapter by
   which everything in it has been read, shapes and colours only, and a colour
   the book never gives is a plain one. Read off the edition at each look's own
   chapter. */

/* ---- small parts these builders share ---- */
// a rounded block: the corners and edges off, so a body reads round and not as a crate
function round(v: Vox, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, mat: string | ((x: number, y: number, z: number) => string)) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const ex = x === x0 || x === x1, ey = y === y0 || y === y1, ez = z === z0 || z === z1;
    if ((ex && ey) || (ex && ez) || (ey && ez)) continue;
    v.set(x, y, z, typeof mat === 'string' ? mat : mat(x, y, z));
  }
}
// set only where the pattern says so, leaving every other voxel in the box as it was
function paint(v: Vox, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, f: (x: number, y: number, z: number) => string | null) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) { const m = f(x, y, z); if (m) v.set(x, y, z, m); }
}
// a figure drawn bare, set on its ground with its legs drawn longer: the tall and long-limbed
function tall(fig: Vox, extra: number, legs: string, feet: string, seed: number) {
  const v = new Vox();
  base(v, 'stoneDark', 'stone', seed);
  copyInto(v, fig, 0, 0, extra);
  v.chunk = 0;
  v.clear(-3, -3, 5, 10, 10, 5 + extra - 1);
  v.clear(1, 3, 5 + extra, 2, 7, 5 + extra); v.clear(5, 3, 5 + extra, 6, 7, 5 + extra);
  v.box(1, 3, 6, 2, 5, 7 + extra, legs); v.box(5, 3, 6, 6, 5, 7 + extra, legs);
  v.box(1, 3, 5, 2, 7, 5, feet); v.box(5, 3, 5, 6, 7, 5, feet);
  return v;
}
// a wide-brimmed cowboy hat, its band round the crown
function cowboyHat(v: Vox, color: string, band: [string, string], z = H1 + 1) {
  v.box(-2, -2, z, 9, 9, z, color);
  for (const [x, y] of [[-2, -2], [9, -2], [-2, 9], [9, 9]] as const) v.set(x, y, z, null);
  for (const x of [-2, 9]) { v.set(x, 0, z + 1, color); v.set(x, 7, z + 1, color); v.box(x, 1, z + 1, x, 6, z + 1, color); }   // the brim curled up at the sides
  v.box(1, 1, z + 1, 6, 6, z + 4, color);
  v.box(1, 1, z + 1, 6, 6, z + 1, band[0]); v.box(1, 6, z + 1, 6, 6, z + 1, band[1]); v.box(6, 1, z + 1, 6, 6, z + 1, band[1]);
  v.clear(3, 2, z + 4, 4, 5, z + 4);                                 // the crease along the crown
}

/* ---- the garage's mechanic: a little gremlin in overalls, lugging a red toolbox (8:1), who grins up with a sharp,
   gap-toothed smile (8:6). The book gives no colour for her or her overalls, and no shirt under them. ---- */
const shade = (hex: string, n: number) => '#' + (parseInt(hex.slice(1), 16) ^ n).toString(16).padStart(6, '0');
export function hedy() {
  const v = new Vox(), skin = '#9a8b7a', body2 = twin(skin), arm = shade(skin, 2), overalls = PLAIN_BOTTOM;
  base(v, 'stoneDark', 'stone', 81);
  v.chunk = 0;
  // little: feet 5, legs 6, hips 7, body 8-11, the head 12-19
  round(v, 0, 7, 0, 7, 12, 19, skin);
  eyes(v, 'black', 16);
  v.box(1, 7, 13, 6, 7, 13, '#3a2a26');                                              // the grin, wide
  for (const x of [1, 2, 3, 5, 6]) v.set(x, 7, 14, 'white');                         // sharp teeth, a gap in them
  v.set(2, 7, 13, 'white'); v.set(5, 7, 13, 'white');
  v.box(1, 2, 8, 6, 6, 11, body2);
  v.box(0, 3, 8, 0, 5, 11, arm); v.box(7, 3, 8, 7, 5, 11, arm);
  v.box(0, 4, 7, 0, 5, 7, skin); v.box(7, 4, 7, 7, 5, 7, skin);
  // the overalls: the legs, a bib up the front, the straps over her shoulders, a button at each
  v.box(1, 2, 7, 6, 6, 7, overalls); v.box(1, 3, 6, 2, 5, 6, overalls); v.box(5, 3, 6, 6, 5, 6, overalls);
  v.box(1, 3, 5, 2, 7, 5, PLAIN_SHOES); v.box(5, 3, 5, 6, 7, 5, PLAIN_SHOES);
  v.box(2, 6, 8, 5, 7, 10, overalls); v.box(2, 1, 8, 5, 2, 10, overalls);
  v.box(2, 2, 11, 2, 7, 11, overalls); v.box(5, 2, 11, 5, 7, 11, overalls);
  v.set(2, 8, 10, 'rail'); v.set(5, 8, 10, 'rail');
  // the red toolbox, carried in her right hand, a metal handle over it
  v.box(8, 2, 5, 10, 6, 7, '#c22a22'); v.box(8, 2, 7, 10, 6, 7, '#9a1f19');
  v.box(9, 3, 8, 9, 3, 8, 'metalDark'); v.box(9, 5, 8, 9, 5, 8, 'metalDark'); v.box(9, 3, 9, 9, 5, 9, 'metalDark');
  v.box(8, 7, 6, 10, 7, 6, 'metal');
  return v;
}

/* ---- the two bugbears of the hippie team (8:4). A bugbear, as the sixth floor first showed one: large, furry,
   pointed ears and a goblin-like face, about a crawler's height and twice as bulky; the fur comes brown, orange-brown
   or red, and the book does not say which these two are, so it is a plain brown. Both wear tie-dyed T-shirts and
   beaded necklaces and no pants; one (Jasha) has a tie-dyed headband and lights the cigarettes, the other (Radoslav)
   is terrified, a cigarette pulled from the pack with his mouth. ---- */
const TIE = ['#e0443a', '#f0b81c', '#3aa05a', '#3a72d0', '#a03ab0'];
const tieDye = (x: number, _y: number, z: number) => {
  const a = Math.atan2(z - 11.5, x - 3.5), d = Math.hypot(x - 3.5, z - 11.5);
  return TIE[Math.floor(((d * 0.55 + a / Math.PI * 1.25) % 5 + 5) % 5)];
};
export function bugbear(stage: 'headband' | 'scared') {
  const v = new Vox(), fur = '#7d5434', limb = twin(fur), dark = '#4a3020';
  base(v, 'stoneDark', 'stone', stage === 'headband' ? 82 : 83);
  v.chunk = 0;
  head(v, fur);
  // the goblin-like face: a broad flat nose, a wide mouth, pointed ears out at the sides
  v.box(3, 8, 16, 4, 8, 17, dark);
  v.box(2, 7, 15, 5, 7, 15, '#3a2216');
  for (const [x, dx] of [[-1, -1], [8, 1]] as const) { v.box(x, 2, 16, x, 5, 19, fur); v.box(x + dx, 3, 18, x + dx, 4, 20, fur); v.box(x + dx * 2, 3, 20, x + dx * 2, 3, 21, fur); }
  if (stage === 'scared') {
    // wide, terrified eyes, and a cigarette in the mouth
    for (const x of [1, 5]) { v.box(x, 7, 17, x + 1, 7, 18, 'white'); v.set(x + (x < 4 ? 1 : 0), 7, 17, 'black'); }
    v.box(1, 7, 19, 2, 7, 19, dark); v.box(5, 7, 19, 6, 7, 19, dark);
    v.box(5, 8, 15, 5, 9, 15, 'white'); v.set(5, 10, 15, 'ember');
  } else {
    eyes(v, 'black', 17);
    // the tie-dyed headband round the head, knotted at the back
    for (let x = 0; x <= 7; x++) for (let y = 0; y <= 7; y++) if (x === 0 || x === 7 || y === 0 || y === 7) v.set(x, y, 19, TIE[(x + y) % 5]);
    v.set(3, -1, 19, TIE[1]); v.set(4, -1, 18, TIE[3]);
  }
  // twice as bulky as a crawler: a broad torso in the tie-dyed shirt, arms out at its sides, the sleeves short
  v.box(0, 1, 9, 7, 6, 13, tieDye);
  v.box(-1, 2, 12, -1, 5, 13, tieDye); v.box(8, 2, 12, 8, 5, 13, tieDye);
  v.box(-1, 2, 10, -1, 5, 11, limb); v.box(8, 2, 10, 8, 5, 11, limb);
  v.box(-1, 3, 9, -1, 5, 9, fur); v.box(8, 3, 9, 8, 5, 9, fur);
  // the beaded necklace, hanging over the shirt
  for (let x = 1; x <= 6; x++) v.set(x, 7, 13, ['#e8dcc0', '#c0392b', '#2a7ab0'][x % 3]);
  v.set(3, 7, 12, '#e8dcc0'); v.set(4, 7, 12, '#c0392b');
  // no pants: furry hips, thick furry legs, big furry feet
  v.box(0, 1, 8, 7, 6, 8, fur);
  v.box(0, 2, 6, 2, 5, 7, limb); v.box(5, 2, 6, 7, 5, 7, limb);
  v.box(0, 2, 5, 2, 7, 5, limb); v.box(5, 2, 5, 7, 7, 5, limb);
  // the one who lights them holds his cigarette
  if (stage === 'headband') { v.box(9, 5, 9, 9, 6, 9, 'white'); v.set(9, 7, 9, 'ember'); }
  return v;
}

/* ---- the unicorn of the sparkly team: first (8:3-8:5) only his head, a white horse's with a rainbow mane just
   brushed and a horn that glitters like an opalescent seashell, sticking out the top of a round tangle of weeds and
   brambles as tall as the truck, his vine mount; out of the vine at last (8:55), a sparkling white horse, a little
   shorter than expected, the rainbow horn glittering ---- */
const RAINBOW = ['#e0443a', '#f08a24', '#f0d21c', '#4fb04a', '#3a72d0', '#8a4ac0'];
const OPAL = ['#f7c8e6', '#bfe2f8', '#fff0b4', '#c8f0d2'];
function unicornHead(v: Vox, y0: number, z0: number) {
  const white = '#f4f2f4';
  v.box(1, y0, z0, 6, y0 + 5, z0 + 5, white);                                        // the head
  v.box(2, y0 + 6, z0, 5, y0 + 8, z0 + 2, twin(white));                               // the long muzzle, forward
  v.set(2, y0 + 9, z0 + 1, '#c9a0b0'); v.set(5, y0 + 9, z0 + 1, '#c9a0b0');          // nostrils
  for (const x of [1, 6]) v.box(x, y0 + 5, z0 + 3, x, y0 + 5, z0 + 4, 'black');      // eyes
  for (const x of [1, 6]) v.box(x, y0 + 1, z0 + 6, x, y0 + 2, z0 + 7, white);        // ears
  // the rainbow mane, just brushed, down the back of the head and the neck, a forelock over the brow
  for (let z = z0 - 4; z <= z0 + 6; z++) {
    const c = RAINBOW[Math.min(5, Math.floor((z0 + 6 - z) * 0.55))];
    for (const x of [2, 3, 4, 5]) v.set(x, y0 - 1, z, c);
    if (z >= z0 - 2) { v.set(7, y0, z, c); v.set(7, y0 + 1, z, c); if (z > z0 + 1) v.set(7, y0 + 2, z, c); }   // falling to his right side
  }
  v.box(2, y0, z0 + 6, 5, y0 + 2, z0 + 6, RAINBOW[0]); v.box(2, y0 + 3, z0 + 6, 5, y0 + 3, z0 + 6, RAINBOW[1]);
  // the horn, rising from the brow and leaning forward, glittering like the inside of a shell
  for (let i = 0; i < 6; i++) v.set(i < 3 ? 3 : 4, y0 + 4 + (i >> 1), z0 + 6 + i, OPAL[i % 4]);
  v.set(4, y0 + 4, z0 + 6, OPAL[2]); v.set(3, y0 + 5, z0 + 7, OPAL[3]);
}
export function dwight(stage: 'vine' | 'horse') {
  const v = new Vox(), white = '#f4f2f4';
  if (stage === 'vine') {
    wideBase(v, -3, 11, 84, -2, 11);
    v.chunk = 0;
    // the vine mount: a round tangle of weeds and brambles, thorns sticking out of it
    for (let x = -2; x <= 9; x++) for (let y = -1; y <= 10; y++) for (let z = 5; z <= 16; z++) {
      const d = Math.hypot((x - 3.5) / 6, (y - 4.5) / 6, (z - 10.5) / 5.8);
      if (d > 1) continue;
      const k = (x * 7 + y * 3 + z * 5) % 11;
      if (d > 0.8 || k < 6) v.set(x, y, z, k < 3 ? '#5a4a2a' : k < 7 ? '#3d5a2a' : '#2f4721');
    }
    for (const [x, y, z] of [[-3, 4, 11], [10, 5, 10], [3, 11, 9], [6, 10, 13], [0, 9, 14], [8, 1, 13], [-2, 1, 8], [4, -2, 12], [9, 8, 7]] as const) v.set(x, y, z, '#c9b88a');
    unicornHead(v, 3, 16);
    return v;
  }
  base(v, 'stoneDark', 'stone', 85);
  v.chunk = 0;
  // a horse, a little short: the body along the floor, four legs, the neck up at the front
  v.box(1, -4, 9, 6, 3, 12, white);
  for (const [x, y] of [[1, -4], [5, -4], [1, 2], [5, 2]] as const) { v.box(x, y, 6, x + 1, y + 1, 8, twin(white)); v.box(x, y, 5, x + 1, y + 1, 5, '#cfc6c0'); }
  v.box(2, 2, 12, 5, 5, 16, white);
  unicornHead(v, 4, 16);
  // the tail, behind, and the sparkle all over him
  v.box(3, -5, 10, 4, -5, 12, twin(white)); v.box(3, -6, 7, 4, -6, 10, twin(white));
  for (const [x, y, z] of [[0, -2, 11], [7, 0, 10], [7, -3, 12], [0, 1, 9], [7, 3, 15], [0, 7, 19], [7, 8, 18], [7, -1, 8]] as const) v.set(x, y, z, OPAL[(x + y + z) % 4]);
  return v;
}

/* ---- the smaller half of the sparkly team (8:5): a pinkish-red fuzzy rodent a little smaller than the cat, a mix of a
   rat and a chinchilla, two legs, two monkey-like arms, a rodent head, vein-covered red eyes bulging out of it, a tail,
   and a mini race-car-driver helmet, white with a blue stripe down the centre; the helmet cracked from 8:32 ---- */
export function lucienne(stage: 'helmet' | 'cracked') {
  const v = new Vox(), fur = '#d8727c', pale = '#e89aa2';
  base(v, 'stoneDark', 'stone', 86);
  v.chunk = 0;
  round(v, 1, 6, 2, 6, 6, 11, fur);                                                  // a fuzzy round body
  v.box(1, 3, 5, 2, 6, 5, twin(fur)); v.box(5, 3, 5, 6, 6, 5, twin(fur));           // two legs, big feet
  v.box(0, 4, 8, 0, 5, 11, twin(fur)); v.box(7, 4, 8, 7, 5, 11, twin(fur));         // monkey-like arms, long
  v.box(-1, 5, 7, 0, 6, 7, pale); v.box(7, 5, 7, 8, 6, 7, pale);                     // little hands
  round(v, 0, 7, 1, 7, 11, 17, fur);                                                 // the rodent head
  v.box(2, 8, 12, 5, 9, 14, fur); v.box(3, 10, 13, 4, 10, 13, '#b04a5a');            // the snout, a nose on it
  v.set(2, 8, 11, 'white'); v.set(5, 8, 11, 'white');                                // teeth
  // bulging red eyes, veined
  for (const x of [1, 5]) { v.box(x, 8, 15, x + 1, 8, 16, '#d8202a'); v.set(x + (x < 4 ? 0 : 1), 8, 16, 'black'); v.set(x + (x < 4 ? 1 : 0), 8, 15, '#ff8080'); }
  // the long tail, curled up behind
  for (const [x, y, z] of [[3, 1, 7], [3, 0, 6], [3, -1, 6], [2, -2, 7], [2, -2, 8], [3, -2, 9], [4, -1, 9]] as const) v.set(x, y, z, pale);
  // the racing helmet: a shell one voxel proud of the head over its top, back and sides, open at the face, a brow over
  // the eyes, the blue stripe running front to back over the top
  const inHead = (x: number, y: number, z: number) => {
    if (x < 0 || x > 7 || y < 1 || y > 7 || z < 11 || z > 17) return false;
    const ex = x === 0 || x === 7, ey = y === 1 || y === 7, ez = z === 11 || z === 17;
    return !((ex && ey) || (ex && ez) || (ey && ez));
  };
  const near = (x: number, y: number, z: number) => {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) if (inHead(x + dx, y + dy, z + dz)) return true;
    return false;
  };
  paint(v, -1, 0, 13, 8, 8, 18, (x, y, z) => {
    if (inHead(x, y, z) || !near(x, y, z)) return null;
    if (y === 8 && z < 18) return null;                                              // the face open
    if (y === 7 && z < 17 && x >= 0 && x <= 7) return null;
    return x >= 3 && x <= 4 && (z === 18 || y === 0 || y === 8) ? '#2f5fc0' : 'white';
  });
  if (stage === 'cracked') for (const [x, y, z] of [[5, 2, 18], [6, 3, 18], [7, 3, 18], [8, 3, 17], [8, 4, 16], [8, 3, 15], [8, 4, 14], [6, 7, 18], [6, 8, 18]] as const) if (v.has(x, y, z)) v.set(x, y, z, '#2a2a30');
  return v;
}

/* ---- the lady ninja of the fox team (8:12): a short fox in a red ninja suit covering her whole body, a bandolier of
   throwing stars, nunchucks; she pulls the red cowl back to show her fox face. The book gives
   her fur no colour, so it is a plain tawny one. ---- */
export function chiyome() {
  const v = new Vox(), fur = '#b07a4a', red = '#b3262a';
  base(v, 'stoneDark', 'stone', 87);
  v.chunk = 0;
  head(v, fur);
  v.box(2, 8, 14, 5, 8, 16, twin(fur)); v.box(3, 9, 14, 4, 10, 15, twin(fur)); v.set(3, 11, 15, 'black'); v.set(4, 11, 15, 'black');   // the muzzle, narrow and pointed
  eyes(v, 'black', 18);
  for (const x0 of [0, 5]) { v.box(x0, 3, 22, x0 + 2, 5, 23, fur); v.box(x0 + 1, 4, 24, x0 + 1, 5, 25, fur); v.set(x0 + 1, 5, 26, fur); }   // tall, pointed ears
  // the cowl pulled back, bunched behind her head
  v.box(0, -1, 13, 7, -1, 16, red); v.box(-1, 0, 13, -1, 3, 14, red); v.box(8, 0, 13, 8, 3, 14, red); v.box(1, -2, 13, 6, -2, 14, twin(red));
  body(v, { top: red, skin: red, bottom: red });
  // the bandolier across her chest, stars along it
  for (let i = 0; i < 5; i++) { v.set(1 + i + (i > 3 ? 1 : 0), 7, 13 - i, '#2b1e18'); v.set(i > 3 ? 7 : 0, 3 + i % 3, 13 - i, '#2b1e18'); }
  for (const [x, z] of [[2, 12], [4, 10], [6, 9]] as const) { v.set(x, 8, z, 'rail'); v.set(x + 1, 8, z, 'metal'); }
  // the nunchucks in her right hand, the chain between the two sticks
  v.box(8, 5, 9, 8, 5, 12, 'woodDark'); v.set(8, 5, 13, 'metalDark'); v.set(8, 6, 14, 'metalDark'); v.box(8, 7, 14, 8, 10, 14, 'woodDark');
  return v;
}

/* ---- the truck's GPS: first only a unit with a screen, a map on it (8:3) and words on the screen (8:17); from the fan-voted upgrade (8:73) a small hologram on the dash, a human woman in a
   pantsuit with large red glasses, made to look like the therapist. Her hair and the suit are not given a colour. ---- */
function gpsUnit(v: Vox, z0: number, glow: boolean) {
  v.box(-1, 3, z0, 8, 5, z0 + 1, '#26282e');                                         // the unit
  v.box(0, 6, z0, 7, 6, z0 + 1, '#3a3d44');
  if (glow) for (const [x, y] of [[1, 4], [3, 3], [4, 5], [6, 4], [2, 5], [5, 3]] as const) v.set(x, y, z0 + 2, 'portal');
}
export function metcalf(stage: 'screen' | 'hologram') {
  const v = new Vox();
  base(v, 'stoneDark', 'stone', 88);
  v.chunk = 0;
  if (stage === 'screen') {
    v.box(3, 3, 5, 4, 4, 8, 'metalDark'); v.box(2, 2, 5, 5, 5, 5, 'metalDark');      // the stand
    v.box(-1, 3, 9, 8, 5, 17, '#26282e');                                             // the unit, its screen facing out
    v.box(0, 6, 10, 7, 6, 16, '#123a3a');                                             // the screen
    for (const [x0, x1, z] of [[0, 3, 15], [3, 3, 12], [3, 6, 12], [5, 5, 10], [1, 1, 11], [6, 6, 14]] as const) v.box(x0, 6, z, x1, 6, z, '#3fc9c0');   // the map's roads
    v.box(1, 6, 13, 3, 6, 13, '#3fc9c0'); v.set(5, 6, 14, '#ffd36a');                 // and where the truck is
    return v;
  }
  gpsUnit(v, 5, true);
  const fig = person({ skin: '#e0b896', hair: { color: PLAIN_HAIR, style: 'short' }, top: PLAIN_TOP, outfit: 'jacket', bottom: PLAIN_TOP, legs: twin(PLAIN_TOP), feet: PLAIN_SHOES, bare: true });
  // large red glasses
  const red = '#d0202a';
  for (const [x0, x1] of [[1, 2], [5, 6]] as const) { fig.box(x0, 8, 16, x1, 8, 16, red); fig.box(x0, 8, 19, x1, 8, 19, red); }
  fig.box(0, 8, 16, 0, 8, 19, red); fig.box(7, 8, 16, 7, 8, 19, red); fig.box(3, 8, 18, 4, 8, 18, red);
  fig.box(-1, 4, 18, -1, 7, 18, red); fig.box(8, 4, 18, 8, 7, 18, red);
  fig.box(3, 6, 10, 4, 6, 13, '#e8e4d8');                                             // a blouse at the jacket's opening
  copyInto(v, fig, 0, 0, 3);
  return v;
}

/* ---- the pig (8:19): just a regular round pink pig, weighing something like five hundred pounds ---- */
export function penelope() {
  const v = new Vox(), pink = '#efa0ae', deep = '#d97a8c';
  wideBase(v, -3, 10, 89, -4, 11);
  v.chunk = 0;
  for (let x = -2; x <= 9; x++) for (let y = -3; y <= 8; y++) for (let z = 7; z <= 15; z++)
    if (((x - 3.5) / 5.6) ** 2 + ((y - 2.5) / 6) ** 2 + ((z - 11) / 4.3) ** 2 <= 1) v.set(x, y, z, pink);   // round
  for (const [x, y] of [[0, -1], [6, -1], [0, 5], [6, 5]] as const) v.box(x, y, 5, x + 1, y + 1, 7, deep);   // short legs
  round(v, 0, 7, 5, 10, 9, 15, twin(pink));                                          // the head, forward
  v.box(2, 11, 10, 5, 11, 13, deep); v.set(3, 12, 11, '#8a4a52'); v.set(4, 12, 11, '#8a4a52'); v.box(2, 12, 12, 5, 12, 12, deep);   // the snout
  v.set(1, 11, 13, 'black'); v.set(6, 11, 13, 'black'); v.set(1, 11, 14, 'black'); v.set(6, 11, 14, 'black');   // eyes
  for (const x of [0, 6]) { v.box(x, 8, 15, x + 1, 9, 16, deep); v.set(x + (x ? 1 : 0), 10, 16, deep); }   // ears, flopping forward
  for (const [x, y, z] of [[4, -4, 12], [4, -5, 13], [3, -5, 14], [3, -4, 14]] as const) v.set(x, y, z, deep);   // the curl of a tail
  return v;
}

/* ---- the bull-headed mercenary (8:19): a bullheaded Taurin, a sound mage, standing in the road with a comically
   large mallet like the one Brandon carried, its glowing head vibrating to keep the rain and hail off. The book gives
   neither his hide nor his clothes a colour. ---- */
export function pontiff() {
  const v = new Vox(), hide = '#5a4334';
  base(v, 'stoneDark', 'stone', 90);
  v.chunk = 0;
  head(v, hide);
  v.box(1, 8, 14, 6, 10, 17, twin(hide)); v.set(2, 11, 16, 'black'); v.set(5, 11, 16, 'black');   // the bull's muzzle
  v.box(2, 11, 14, 5, 11, 14, twin(hide));
  eyes(v, 'black', 18, [1, 6], 2);
  for (const [x0, dx] of [[-1, -1], [8, 1]] as const) { v.box(x0, 4, 19, x0, 5, 20, '#e8dcc0'); v.box(x0 + dx, 4, 20, x0 + dx, 5, 21, '#e8dcc0'); v.box(x0 + dx * 2, 4, 21, x0 + dx * 2, 5, 22, '#e8dcc0'); v.box(x0 + dx * 2, 5, 23, x0 + dx * 2, 5, 24, '#e8dcc0'); v.set(x0 + dx, 5, 25, '#e8dcc0'); }   // horns, curving up
  for (const x of [-1, 8]) v.box(x, 2, 17, x, 3, 18, hide);                          // ears
  body(v, { top: PLAIN_TOP, skin: hide, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES });
  v.box(-1, 2, 11, 0, 6, 13, twin(PLAIN_TOP)); v.box(7, 2, 11, 8, 6, 13, twin(PLAIN_TOP));   // the shoulders of a big man
  // the mallet: its haft in his right hand, its round head glowing and humming over his shoulder
  v.box(10, 5, 5, 10, 5, 13, 'woodDark'); v.box(8, 4, 9, 9, 5, 9, twin('#5a4334'));
  for (let x = 8; x <= 13; x++) for (let y = 2; y <= 8; y++) for (let z = 13; z <= 18; z++) if (Math.hypot(y - 5, z - 15.5) <= 3.1) v.set(x, y, z, x === 8 || x === 13 ? 'metal' : 'rail');
  for (const [y, z] of [[5, 15], [4, 16], [6, 14]] as const) { v.set(13, y, z, 'portal'); v.set(8, y, z, 'portal'); }
  for (const [x, y, z] of [[14, 5, 15], [14, 4, 17], [11, 9, 16], [11, 1, 14], [10, 6, 19]] as const) v.set(x, y, z, 'mist');   // the hum
  return v;
}

/* ---- the lady mantaurs (8:13): four legs like a centaur's, though the front pair are a second pair of arms shoved
   into boots, the bent-over lower torso arched up; a broad, muscle-bound second torso rising from where its neck
   would be, two more arms on it; both in a sleek white racing suit with a red-and-blue stripe down the centre all the
   way to the neck, long slick black boots past the knee on all four, and massive gleaming white cowboy hats banded
   red and blue. One has straight black hair (Genesis); the other freckles, a mop of curly red hair and a mouthful of
   chewing tobacco (Rapture). ---- */
export function womantaur(who: 'black-hair' | 'red-curls') {
  const v = new Vox(), skin = who === 'black-hair' ? '#e6b896' : '#f0c8a8', suit = '#ecebe6', boot = '#16141a';
  wideBase(v, -3, 10, who === 'black-hair' ? 91 : 92, -7, 10);
  v.chunk = 0;
  // the lower half: a bent-over torso, its back arched up, on two legs behind and two booted arms in front
  v.box(1, -5, 9, 6, 4, 12, suit); v.box(1, -3, 13, 6, 2, 13, suit);
  paint(v, 3, -5, 9, 4, 4, 12, (x, y, z) => (z === 12 || y === 4 ? (y % 2 ? 'red' : 'blue') : null));
  paint(v, 3, -3, 13, 4, 2, 13, (x, y) => (y % 2 ? 'red' : 'blue'));
  for (const [x, y] of [[1, -5], [5, -5], [1, 3], [5, 3]] as const) { v.box(x, y, 5, x + 1, y + 1, 9, boot); v.box(x, y + 1, 5, x + 1, y + 2, 5, boot); }
  // the upper torso rising from the front, muscle-bound, two arms
  v.box(1, 2, 13, 6, 6, 17, suit); v.box(3, 6, 13, 4, 6, 17, (x, y, z) => (z % 2 ? 'red' : 'blue'));
  v.box(-1, 3, 14, 0, 5, 17, twin(suit)); v.box(7, 3, 14, 8, 5, 17, twin(suit));
  v.box(-1, 4, 13, 0, 5, 13, twin(skin)); v.box(7, 4, 13, 8, 5, 13, twin(skin));
  // the head, and the hat
  v.box(0, 0, 18, 7, 7, 25, skin);
  eyes(v, 'black', 21);
  const hairC = who === 'black-hair' ? '#141114' : '#c4471c';
  if (who === 'black-hair') {
    v.box(0, 0, 18, 7, 1, 25, hairC); v.box(0, 0, 19, 0, 5, 25, hairC); v.box(7, 0, 19, 7, 5, 25, hairC); v.box(0, 7, 24, 7, 7, 24, hairC); v.set(4, 7, 24, skin);
    v.box(0, -1, 16, 7, -1, 24, hairC);                                                // straight, down the back
  } else {
    for (const [x, y, z] of [[-1, 1, 22], [-1, 4, 20], [-1, 2, 18], [8, 1, 22], [8, 4, 20], [8, 2, 18], [1, -1, 19], [4, -1, 21], [6, -1, 17], [2, -1, 23]] as const) v.box(x, y, z, x + (x < 0 || x > 7 ? 0 : 1), y + 1, z + 1, hairC);
    v.box(0, 0, 18, 7, 1, 25, hairC); v.box(0, 0, 19, 0, 6, 25, hairC); v.box(7, 0, 19, 7, 6, 25, hairC); v.box(0, 7, 24, 7, 7, 24, hairC); v.set(2, 7, 24, skin); v.set(5, 7, 24, skin);
    for (const [x, z] of [[1, 20], [2, 19], [5, 19], [6, 20], [3, 20]] as const) v.set(x, 7, z, '#c4825a');   // freckles
    v.box(6, 8, 19, 6, 8, 19, twin(skin)); v.set(7, 7, 18, '#5a3a1a');              // a cheek full of tobacco, a brown dribble
  }
  cowboyHat(v, 'white', ['red', 'blue'], 26);
  return v;
}

/* ---- the left half of a mantaur (8:58), split down the middle from between the eyes to the groin: one leg, a lower
   arm and an upper arm, half a head, in a snow-white latex gimp suit covered in zippers to keep his insides in, a long
   black zipper down the flat side of him, a mask over his mouth; he hops, and unzips an eyehole to show a brown eye ---- */
export function porky() {
  const v = new Vox(), suit = '#f2f2ee', zip = '#1b1714';
  base(v, 'stoneDark', 'stone', 93);
  v.chunk = 0;
  // his half, x 0-3; the cut side at x 4
  v.box(1, 3, 5, 2, 7, 5, twin(suit)); v.box(1, 3, 6, 2, 5, 8, twin(suit));          // the one leg
  v.box(0, 2, 9, 4, 6, 13, suit);                                                    // the lower torso
  v.box(-1, 3, 9, -1, 5, 13, twin(suit)); v.box(-1, 4, 8, -1, 5, 8, twin(suit));     // its arm
  v.box(1, 2, 14, 4, 6, 17, suit);                                                   // the second torso, from the neck
  v.box(0, 3, 14, 0, 5, 17, twin(suit)); v.box(0, 4, 13, 0, 5, 13, twin(suit));      // its arm
  v.box(0, 0, 18, 4, 7, 25, suit);                                                   // half a head
  // the zippers: down the flat side, at the mouth, round the eyehole, and across the suit
  v.box(4, 3, 9, 4, 3, 25, zip); v.box(4, 4, 5, 4, 4, 8, zip);
  v.box(1, 7, 20, 4, 7, 20, zip); v.set(4, 7, 20, 'rail');
  v.box(1, 7, 22, 3, 7, 22, zip); v.box(1, 7, 24, 3, 7, 24, zip); v.set(1, 7, 23, zip); v.set(2, 7, 23, '#7a4a28');
  v.box(1, 7, 11, 3, 7, 11, zip); v.box(0, 6, 15, 0, 6, 16, zip); v.set(2, 7, 15, zip);
  // the suit, taut, showing a little red where the zipper sticks at his waist
  v.set(4, 3, 9, '#b02a2a');
  v.box(0, 7, 13, 3, 7, 13, zip); v.box(1, 7, 17, 3, 7, 17, zip);                   // the seams at the waist of the second torso and the neck
  return v;
}

/* ---- the fleshmancer (8:54): a tall, gaunt, thin, poised human mage sitting ramrod straight in blue flowing robes,
   a cappuccino in a slender hand. His hair is not given. ---- */
export function grigori() {
  const robe = '#2f4f9a', skin = '#e2bea0';
  const fig = person({ skin, hair: { color: PLAIN_HAIR, style: 'short' }, top: robe, outfit: 'robe', bottom: robe, feet: PLAIN_SHOES, bare: true });
  fig.set(1, 7, 15, twin(skin)); fig.set(6, 7, 15, twin(skin));                       // gaunt
  fig.box(8, 5, 9, 8, 6, 10, 'white'); fig.box(8, 5, 11, 8, 6, 11, '#c8a27a'); fig.set(9, 5, 10, 'white');   // the cappuccino
  const v = tall(fig, 2, robe, PLAIN_SHOES, 94);
  v.box(1, 2, 5, 6, 6, 9, robe); v.box(0, 2, 5, 7, 7, 5, robe);                      // the robe, to the floor
  return v;
}

/* ---- the tourist (8:15): a tall, long-limbed soother: as the second floor first showed one, absurdly thin, white
   and hairless, oversized black eyes and a bony ridge from between them up over the head. He wears a T-shirt with a
   nude picture of Elle on it, a fanny pack, and a massive, poorly drawn tattoo of her face on his skinny arm; by 8:54
   the shirt is an all-over print of her screaming face, casting. The same body is the soldier wearing his name. ---- */
export function soother(stage: 'fan' | 'print') {
  const skin = '#ecebe8', shirt = PLAIN_TOP, elle = '#9fcdf0', elleHair = '#f3f6f8';
  const fig = new Vox();
  fig.chunk = 0;
  // the head on a thin neck, a voxel higher than a crawler's
  fig.box(0, 0, H0 + 1, 7, 7, H1 + 1, skin); fig.box(3, 3, H0, 4, 4, H0, twin(skin));
  for (const x of [1, 5]) fig.box(x, 7, 17, x + 1, 7, 19, 'black');                 // oversized black eyes
  fig.set(2, 7, 19, '#5a5a66'); fig.set(6, 7, 19, '#5a5a66');
  fig.box(3, 7, 20, 4, 8, 21, twin(skin)); fig.box(3, 0, H1 + 2, 4, 7, H1 + 2, twin(skin)); fig.box(3, -1, 17, 4, -1, H1 + 1, twin(skin));   // the bony ridge
  // absurdly thin: a flat chest, skinny arms
  fig.box(1, 3, 10, 6, 6, 13, shirt);
  fig.box(0, 3, 12, 0, 4, 13, twin(shirt)); fig.box(7, 3, 12, 7, 4, 13, twin(shirt));
  fig.box(0, 3, 9, 0, 4, 11, twin(skin)); fig.box(7, 3, 9, 7, 4, 11, twin(skin));
  fig.box(1, 3, 8, 6, 6, 9, PLAIN_BOTTOM);
  fig.box(1, 3, 6, 2, 4, 7, PLAIN_BOTTOM); fig.box(5, 3, 6, 6, 4, 7, PLAIN_BOTTOM);
  fig.box(1, 3, 5, 2, 6, 5, PLAIN_SHOES); fig.box(5, 3, 5, 6, 6, 5, PLAIN_SHOES);
  fig.box(2, 7, 8, 5, 7, 9, '#3a3d44'); fig.set(5, 8, 9, 'metal');                   // the fanny pack
  fig.box(7, 3, 10, 7, 4, 10, elle); fig.box(7, 3, 11, 7, 4, 11, elleHair);           // the tattoo of her face on his arm
  if (stage === 'fan') {
    // a picture of her on the shirt: blue, white hair
    fig.box(3, 6, 13, 4, 6, 13, elleHair); fig.box(3, 6, 10, 4, 6, 12, elle); fig.set(2, 6, 12, elleHair); fig.set(5, 6, 12, elleHair); fig.set(2, 6, 11, elle); fig.set(5, 6, 11, elle);
  } else {
    // her screaming face all over it: blue, white hair over the top, the mouth wide open
    fig.box(1, 3, 10, 6, 6, 13, elle); fig.box(1, 3, 13, 6, 6, 13, elleHair); fig.set(1, 6, 12, elleHair); fig.set(6, 6, 12, elleHair);
    fig.set(2, 6, 12, 'black'); fig.set(5, 6, 12, 'black'); fig.box(3, 6, 10, 4, 6, 11, '#3a1820');
    fig.set(6, 4, 12, 'black'); fig.box(6, 3, 10, 6, 5, 10, '#3a1820');
  }
  return tall(fig, 3, PLAIN_BOTTOM, PLAIN_SHOES, 95);
}

/* ---- the fairy Imani's card became (8:36): a tiny, ridiculously buff humanoid with flowing blond hair, only a white
   loincloth, hovering like a hummingbird, wings buzzing too fast to see; temporarily a tiny red starfish (8:84),
   squirting water ---- */
export function jacobus(stage: 'loincloth' | 'starfish') {
  if (stage === 'starfish') {
    const v = new Vox(), red = '#c8322a';
    base(v, 'stoneDark', 'stone', 96);
    v.chunk = 0;
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + i * Math.PI * 2 / 5;
      for (let r = 0; r <= 5; r++) { const x = Math.round(3.5 + Math.cos(a) * r), y = Math.round(4.5 + Math.sin(a) * r); v.set(x, y, 5, red); if (r < 3) v.set(x, y, 6, red); }
    }
    v.box(2, 3, 6, 5, 6, 7, red); v.box(3, 4, 8, 4, 5, 8, twin(red));
    v.set(3, 7, 7, 'black'); v.set(4, 7, 7, 'black');
    for (const [x, y, z] of [[4, 5, 9], [4, 5, 10], [4, 6, 11], [4, 7, 12], [4, 8, 12], [4, 9, 11], [4, 10, 10], [4, 10, 8]] as const) v.set(x, y, z, 'water');   // the squirt
    return v;
  }
  const skin = '#e8c2a0', muscle = twin(skin), arm = shade(skin, 2), hair = '#ead07a';
  const fig = new Vox();
  fig.chunk = 0;
  head(fig, skin); eyes(fig);
  // flowing blond hair, past the shoulders
  fig.box(0, 0, H1 - 1, 7, 7, H1, hair); fig.box(0, 0, H0, 7, 1, H1, hair); fig.box(0, 7, H1 - 2, 7, 7, H1 - 2, hair); fig.set(3, 7, H1 - 2, skin);
  fig.box(0, -1, 10, 7, -1, H1 - 1, hair); fig.box(-1, 0, 11, -1, 4, H1 - 2, hair); fig.box(8, 0, 11, 8, 4, H1 - 2, hair);
  // ridiculously buff: a broad chest on a narrow waist, shoulders like boulders, arms as thick as his legs
  fig.box(0, 2, 10, 7, 6, 13, skin); fig.box(1, 2, 8, 6, 6, 9, muscle);
  fig.box(1, 7, 12, 3, 7, 13, muscle); fig.box(4, 7, 12, 6, 7, 13, muscle);        // the pecs
  for (const z of [10, 11]) { fig.set(2, 7, z, muscle); fig.set(5, 7, z, muscle); }
  fig.box(-2, 2, 12, -1, 6, 14, arm); fig.box(8, 2, 12, 9, 6, 14, arm);              // shoulders
  fig.box(-2, 3, 9, -1, 5, 11, arm); fig.box(8, 3, 9, 9, 5, 11, arm);                // arms
  fig.box(-2, 4, 8, -1, 5, 8, skin); fig.box(8, 4, 8, 9, 5, 8, skin);                // fists
  // only a white loincloth
  fig.box(1, 2, 7, 6, 6, 8, 'white'); fig.box(3, 7, 6, 4, 7, 8, 'white');
  fig.box(1, 3, 5, 2, 5, 6, muscle); fig.box(5, 3, 5, 6, 5, 6, muscle); fig.box(1, 4, 4, 2, 6, 4, arm); fig.box(5, 4, 4, 6, 6, 4, arm);
  // the wings, buzzing too fast to see: only a blur at his back
  for (const xs of [[-6, -2], [9, 13]] as const) for (let x = xs[0]; x <= xs[1]; x++) for (let z = 12; z <= 20; z++)
    if (((x + z) & 1) && Math.hypot((x - (xs[0] + xs[1]) / 2) / 2.8, (z - 16) / 4.6) < 1) fig.set(x, 0, z, 'mist');
  return floating(fig, 3, 'portal', 97);
}

/* ---- the fire fairy of the three-for-one squad (8:34): a level 96 flaming fire fairy about the cat's size. Nothing
   more is given (no face, no wings, no clothes), so she is a small figure of flame and nothing else. ---- */
export function quemada() {
  const fig = new Vox(), hot = '#f07a2a', deep = '#c8401c';
  fig.chunk = 0;
  // small, about the cat's size: a little head and body
  round(fig, 1, 6, 1, 6, 12, 18, hot);
  fig.box(2, 7, 15, 2, 7, 16, 'black'); fig.box(5, 7, 15, 5, 7, 16, 'black');
  fig.box(2, 2, 8, 5, 5, 11, deep); fig.box(1, 3, 9, 1, 4, 11, hot); fig.box(6, 3, 9, 6, 4, 11, hot);
  fig.box(2, 3, 6, 2, 4, 7, hot); fig.box(5, 3, 6, 5, 4, 7, hot);
  for (const [x, y, z] of [[2, 6, 10], [4, 6, 9], [3, 6, 11], [1, 6, 14], [6, 6, 17], [3, 7, 18]] as const) fig.set(x, y, z, 'ember');
  // flaming: fire rising off her head and her shoulders
  for (const [x, y, z] of [[2, 3, 19], [4, 4, 20], [5, 2, 19], [3, 5, 19], [3, 2, 21], [1, 4, 18], [6, 4, 18], [1, 3, 12], [6, 4, 12], [4, 1, 19]] as const) fig.set(x, y, z, 'flame');
  const v = new Vox();
  base(v, 'stoneDark', 'stone', 98);
  copyInto(v, fig, 0, 0, -1);
  return v;
}

/* Book 8's figures, by character id and look. */
export const BOOK8_FIGURES: Record<string, Record<string, () => Vox>> = {
  hedy: { overalls: hedy },
  jasha: { headband: () => bugbear('headband') },
  radoslav: { scared: () => bugbear('scared') },
  dwight: { vine: () => dwight('vine'), horse: () => dwight('horse') },
  lucienne: { helmet: () => lucienne('helmet'), cracked: () => lucienne('cracked') },
  chiyome: { ninja: chiyome },
  'dr-metcalf': { screen: () => metcalf('screen'), hologram: () => metcalf('hologram') },
  penelope: { pig: penelope },
  pontiff: { mallet: pontiff },
  genesis: { racer: () => womantaur('black-hair') },
  rapture: { racer: () => womantaur('red-curls') },
  porky: { 'white-suit': porky },
  grigori: { robes: grigori },
  linus: { fan: () => soother('fan'), print: () => soother('print') },
  minus: { fan: () => soother('fan'), print: () => soother('print') },
  jacobus: { loincloth: () => jacobus('loincloth'), starfish: () => jacobus('starfish') },
  quemada: { flame: quemada },
};
