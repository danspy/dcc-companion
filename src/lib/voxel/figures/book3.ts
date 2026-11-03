import { Vox } from '../vox.ts';
import { base, head, eyes, body, twin, person, copyInto, wideBase, floating, H0, H1,
         PLAIN_HAIR, PLAIN_TOP, PLAIN_BOTTOM, PLAIN_SHOES } from './parts.ts';

/* ---- the third floor's cast, and the people it first names ----
   The same rules as book 1's: each look opens at the chapter by which
   everything in it has been read, a colour the book leaves unsaid takes a
   plain one, and nothing here is a word. Many of these are named on the
   third floor and only described later; their first look sits where the
   description does. */

/* a block with its corners and edges taken off, so it reads round */
function round(v: Vox, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, mat: string | ((x: number, y: number, z: number) => string)) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const ex = x === x0 || x === x1, ey = y === y0 || y === y1, ez = z === z0 || z === z1;
    if ((ex && ey) || (ex && ez) || (ey && ez)) continue;
    v.set(x, y, z, typeof mat === 'string' ? mat : mat(x, y, z));
  }
}
/* a pair of wings on the back, rising from the shoulders, the lower edge lifting toward the tip */
function wings(v: Vox, mat: string, edge: string, z0: number, z1: number, w: number, y = 0) {
  for (const side of [-1, 1]) for (let d = 0; d < w; d++) {
    const x = side < 0 ? -1 - d : 8 + d, lo = z0 + Math.round((d * (z1 - z0)) / (w * 1.5)), hi = z1 - (d === w - 1 ? 1 : 0);
    for (let z = lo; z <= hi; z++) v.set(x, y, z, d === w - 1 || z === lo || z === hi ? edge : mat);
  }
}
/* a fairy's wings: a big rounded lobe over a small one on each side, see-through, edged darker */
function fairyWings(v: Vox, mat: string, edge: string, z0: number, z1: number, w: number, y = 0) {
  const lobes: [number, number, number, number][] = [[w * 0.55, z1 - (z1 - z0) * 0.3, w * 0.55, (z1 - z0) * 0.32], [w * 0.35, z0 + (z1 - z0) * 0.15, w * 0.38, (z1 - z0) * 0.2]];
  const inside = (d: number, z: number) => lobes.some(([cd, cz, rd, rz]) => ((d - cd) / rd) ** 2 + ((z - cz) / rz) ** 2 <= 1);
  for (const side of [-1, 1]) for (let d = 0; d <= w; d++) for (let z = z0 - 2; z <= z1 + 1; z++) {
    if (!inside(d, z)) continue;
    const rim = !inside(d + 1, z) || !inside(d, z + 1) || !inside(d, z - 1) || (d > 0 && !inside(d - 1, z));
    v.set(side < 0 ? -1 - d : 8 + d, y, z, rim ? edge : mat);
  }
}
/* take out one layer of a figure and drop everything above it by one: a tall figure made a step shorter */
function squash(v: Vox, zc: number) {
  const above = v.all().filter((c) => c.p[2] >= zc);
  for (const c of above) v.set(c.p[0], c.p[1], c.p[2], null);
  const was = v.chunk;
  for (const c of above) if (c.p[2] > zc) { v.chunk = c.chunk; v.set(c.p[0], c.p[1], c.p[2] - 1, c.mat); }
  v.chunk = was;
}
/* an engineer's cap: a low crown and a short peak, in a plain colour */
function cap(v: Vox, color: string, z = H1) {
  v.box(0, 0, z, 7, 7, z + 1, color); v.box(1, 8, z, 6, 9, z, twin(color));
}

/* ---- the club's rock monsters ---- */
const ROCK = '#86827c', ROCK_DARK = '#66625d', TUX = '#1d1b20';
const CZ = 16, CT = 23;   // a cretin stands taller than a person: the head from z 16 to 23
// seven feet of rock: a craggy head with a heavy brow, a chest as wide as a door, arms like pillars
function cretin(o: { seed: number; tux: boolean; crossed?: boolean }) {
  const v = new Vox(), limb = twin(ROCK);
  base(v, 'stoneDark', 'stone', o.seed);
  v.chunk = 0;
  v.box(0, 0, CZ, 7, 7, CT, ROCK);                                               // the head
  v.box(0, 8, CZ + 5, 7, 8, CZ + 5, ROCK_DARK);                                  // the brow, jutting
  eyes(v, 'black', CZ + 3, [2, 5], 2);
  for (const [x, y] of [[1, 1], [4, 2], [6, 5], [2, 5], [5, 0]] as const) v.set(x, y, CT + 1, ROCK_DARK);   // a craggy crown
  for (const [x, z] of [[1, CZ + 1], [6, CZ + 2], [5, CZ + 6], [0, CZ + 6], [3, CZ]] as const) v.set(x, 7, z, ROCK_DARK);   // cracks
  const top = o.tux ? TUX : ROCK, sleeve = o.tux ? twin(TUX) : limb;
  v.box(0, 2, 11, 7, 6, 15, top);                                                 // the chest
  v.box(1, 2, 9, 6, 6, 10, o.tux ? TUX : ROCK_DARK);                              // hips
  v.box(1, 3, 6, 2, 5, 8, o.tux ? twin(TUX) : limb); v.box(5, 3, 6, 6, 5, 8, o.tux ? twin(TUX) : limb);
  v.box(0, 3, 5, 2, 7, 5, ROCK_DARK); v.box(5, 3, 5, 7, 7, 5, ROCK_DARK);         // big flat feet
  if (o.crossed) {
    v.box(-2, 3, 13, -1, 5, 15, sleeve); v.box(8, 3, 13, 9, 5, 15, sleeve);       // upper arms
    v.box(-2, 6, 12, -1, 7, 13, limb); v.box(8, 6, 12, 9, 7, 13, limb);
    v.box(-1, 8, 12, 8, 8, 13, ROCK_DARK); v.box(0, 7, 12, 7, 7, 13, ROCK_DARK);   // arms folded across the chest
    v.set(1, 8, 14, ROCK); v.set(6, 8, 14, ROCK);
  } else {
    v.box(-2, 3, 11, -1, 5, 15, sleeve); v.box(8, 3, 11, 9, 5, 15, sleeve);       // arms like pillars
    v.box(-2, 3, 9, -1, 5, 10, limb); v.box(8, 3, 9, 9, 5, 10, limb);             // fists of rock
  }
  if (o.tux) {
    v.box(3, 6, 11, 4, 6, 15, 'white');                                           // the shirt front
    v.box(2, 7, 15, 5, 7, 15, 'black'); v.set(3, 7, 15, '#0d0c0e');               // the bow tie
    v.set(3, 7, 13, 'black'); v.set(3, 7, 12, 'black');                            // studs
  }
  return v;
}
/* Bomo: a seven-foot, tuxedoed rock monster (3:8); hidden inside a suit of scrap armour like a walking mech, spiked
   pieces sewn on and daggers in the gaps, missile launchers on the shoulder pads (6:14) until it blows off him (6:15) */
export function bomo(stage: 'tuxedo' | 'scrapheap') {
  const v = cretin({ seed: 71, tux: true });
  if (stage === 'tuxedo') return v;
  const plate = (x: number, z: number) => { const k = (((x + 4) >> 1) * 2 + (z >> 1)) % 3; return k === 0 ? 'metalDark' : k === 1 ? 'metal' : '#6a6f74'; };
  for (let x = -3; x <= 10; x++) for (let z = 6; z <= 15; z++) v.set(x, 7, z, plate(x, z));                // plates over the front
  v.box(-3, 2, 9, -3, 6, 15, 'metal'); v.box(10, 2, 9, 10, 6, 15, 'metal');                              // over the arms
  v.box(0, 2, 5, 2, 7, 6, 'metalDark'); v.box(5, 2, 5, 7, 7, 6, 'metalDark');                           // armoured boots
  for (const [x, y, z] of [[1, 8, 14], [5, 8, 12], [8, 8, 15], [-2, 8, 10], [3, 8, 9], [9, 8, 11], [-4, 4, 14], [11, 4, 13], [-4, 3, 11], [11, 5, 15], [6, 8, 7], [0, 8, 6]] as const) v.set(x, y, z, 'rail');   // spikes and dagger points
  // the helmet chunk, the eyes left showing through a slot
  v.box(-1, -1, CZ + 2, 8, 8, CT + 1, '#6a6f74'); v.box(0, 8, CZ + 3, 7, 8, CZ + 4, 'black');
  v.set(2, 8, CZ + 3, 'ember'); v.set(5, 8, CZ + 3, 'ember'); v.box(-1, 8, CZ + 5, 8, 8, CZ + 5, 'metalDark');
  for (const [x, y] of [[0, 0], [7, 3], [3, 8], [5, 1]] as const) v.set(x, y, CT + 2, 'rail');
  // the shoulder pads, a launcher on each, the tubes pointing ahead
  for (const x0 of [-5, 9]) {
    v.box(x0, 1, 16, x0 + 3, 6, 17, 'metalDark');
    v.box(x0 + 1, 1, 18, x0 + 2, 6, 19, '#4f555c');
    v.box(x0 + 1, 7, 18, x0 + 2, 7, 19, 'black'); v.set(x0 + 1, 7, 19, 'red'); v.set(x0 + 2, 7, 18, 'red');
  }
  return v;
}
/* the Sledge: Bomo's twin in a tuxedo (3:8); by 3:19 a pink feather boa round his neck, a cowboy hat, and a giant
   pinback button hanging off the boa from the club's dance floor */
export function sledge(stage: 'tuxedo' | 'boa') {
  const v = cretin({ seed: 72, tux: true });
  if (stage === 'tuxedo') return v;
  const pink = '#f07ab8', pink2 = '#d85a9c';
  for (let x = -2; x <= 9; x++) for (let y = 1; y <= 8; y++) for (const z of [15, 16]) if (x === -2 || x === 9 || y === 1 || y === 8) v.set(x, y, z, (x + y + z) % 3 ? pink : pink2);   // the boa round the neck
  for (const [x, z] of [[1, 14], [1, 13], [2, 12], [2, 11], [6, 14], [6, 13], [5, 12]] as const) { v.set(x, 8, z, z % 2 ? pink : pink2); v.set(x, 9, z, z % 2 ? pink2 : pink); }   // its ends hanging
  v.box(5, 10, 11, 6, 10, 12, 'white'); v.set(5, 10, 12, pink2);                  // the button
  // the cowboy hat: a wide brim turned up at the sides, a dented crown
  for (let x = -2; x <= 9; x++) for (let y = -1; y <= 9; y++) { if ((x === -2 || x === 9) && (y === -1 || y === 9)) continue; v.set(x, y, CT + 1, PLAIN_HAIR); }
  v.box(-2, 1, CT + 2, -2, 7, CT + 2, PLAIN_HAIR); v.box(9, 1, CT + 2, 9, 7, CT + 2, PLAIN_HAIR);
  v.box(1, 1, CT + 2, 6, 6, CT + 4, twin(PLAIN_HAIR)); v.clear(3, 1, CT + 4, 4, 6, CT + 4); v.box(1, 6, CT + 2, 6, 6, CT + 2, '#5a4a3a');
  return v;
}
/* Clay-ton: another of the club's rock monsters, posted behind Elle with his arms crossed (3:8) */
export function clayTon() { return cretin({ seed: 73, tux: false, crossed: true }); }

/* ---- the club's assistant manager (3:9): a hand-sized fairy who buzzes through the air, plainly female in a tuxedo
   like the bouncers', raven hair in a severe bun, tiny red sparkles following her ---- */
export function astrid() {
  const fig = person({ skin: '#ecc9ad', hair: { color: '#0f0d12', style: 'bun' }, top: TUX, front: 'white', bottom: TUX, feet: TUX, bare: true });
  fig.box(2, 7, 13, 5, 7, 13, 'black');                                            // the bow tie
  fig.box(1, 7, 19, 2, 7, 19, '#0f0d12'); fig.box(5, 7, 19, 6, 7, 19, '#0f0d12');  // brows, severe
  fairyWings(fig, 'mist', 'nightMist', 9, 23, 5, 0);
  for (const [x, y, z] of [[-2, 4, 9], [9, 3, 12], [-1, 6, 16], [10, 5, 8], [4, -2, 10], [-3, 2, 13], [8, 7, 6]] as const) fig.set(x, y, z, '#ff3b3b');   // red sparkles
  return floating(fig, 3, 'ember', 74);
}

/* ---- the Daughters (3:21): Eva, a small half-nagini, half-orc, about five feet: green, opalescent and scaled, four
   arms, a cobra's head, standing on two ordinary legs, shiny green leather armour almost like a tracksuit, two wide
   sabers crossed on her back, both pairs of arms crossed ---- */
export function eva() {
  const v = new Vox(), scale = '#5fae7e', sheen = '#8fd6a8', suit = '#2f7a4c', stripe = '#62b97a';
  base(v, 'stoneDark', 'stone', 75);
  v.chunk = 0;
  head(v, scale);
  for (const [x, z] of [[1, 20], [3, 21], [6, 19], [2, 15], [5, 16], [0, 17], [7, 20]] as const) v.set(x, 7, z, sheen);   // opalescent
  v.box(2, 8, 14, 5, 9, 16, twin(scale)); v.set(3, 10, 14, '#c0303a'); v.set(2, 10, 13, '#c0303a'); v.set(4, 10, 13, '#c0303a');   // the snout, a flicking tongue
  eyes(v, 'black', 17, [1, 6], 2); v.set(1, 7, 18, '#e8c21c'); v.set(6, 7, 18, '#e8c21c');
  // the hood, flared out round the head
  for (const x0 of [-2, 8]) { v.box(x0, 1, 14, x0 + 1, 5, 21, scale); v.box(x0 + (x0 < 0 ? 0 : 1), 2, 15, x0 + (x0 < 0 ? 0 : 1), 4, 20, sheen); v.box(x0, 1, 22, x0 + 1, 3, 22, scale); }
  v.box(0, -1, 14, 7, -1, 22, scale);
  body(v, { top: suit, skin: scale, bottom: suit, legs: suit, feet: twin(suit), sleeves: [suit, suit] });
  v.box(0, 6, 10, 0, 6, 13, stripe); v.box(7, 6, 10, 7, 6, 13, stripe); v.box(1, 6, 8, 1, 6, 9, stripe); v.box(6, 6, 8, 6, 6, 9, stripe);   // tracksuit piping
  // two pairs of arms, both folded: the upper across the chest, the lower across the belly
  v.box(-1, 3, 12, -1, 5, 13, twin(suit)); v.box(8, 3, 12, 8, 5, 13, twin(suit));
  v.box(0, 7, 12, 7, 7, 13, twin(suit)); v.set(0, 8, 13, scale); v.set(7, 8, 12, scale);
  v.box(0, 7, 10, 7, 7, 10, suit); v.set(-1, 7, 10, scale); v.set(8, 7, 10, scale);
  // two wide sabers, crossed on the back, the hilts over the shoulders
  for (let i = 0; i <= 15; i++) { v.set(-3 + i, -2, 7 + i, 'rail'); v.set(10 - i, -2, 7 + i, 'rail'); v.set(-3 + i, -2, 6 + i, i > 1 && i < 14 ? 'metal' : null); v.set(10 - i, -2, 6 + i, i > 1 && i < 14 ? 'metal' : null); }
  v.box(-4, -2, 22, -3, -2, 24, 'woodDark'); v.box(10, -2, 22, 11, -2, 24, 'woodDark'); v.box(-5, -2, 22, -2, -2, 22, 'metalDark'); v.box(9, -2, 22, 12, -2, 22, 'metalDark');
  return v;
}
/* Silfa (3:22): a wisteria fairy, a plump woman of about fifty, half the cat's size, who buzzes up out of reach */
export function silfa() {
  const skin = '#e6bea0', fig = person({ skin, hair: { color: PLAIN_HAIR, style: 'short' }, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, bare: true });
  fig.box(1, 7, 10, 6, 7, 12, PLAIN_TOP); fig.box(2, 8, 10, 5, 8, 11, PLAIN_TOP);  // round
  fig.set(1, 7, 16, twin(skin)); fig.set(6, 7, 16, twin(skin)); fig.box(3, 7, 15, 4, 7, 15, twin(skin));   // the years on her face
  fairyWings(fig, 'mist', 'nightMist', 9, 20, 4, 0);
  return floating(fig, 3, 'portal', 76);
}

/* ---- the Prize Carousel's host (3:7): a winged, wolf-headed man in a brown and orange checkered leisure suit,
   holding a microphone; at the parade (8:92) a formal black-and-white tuxedo and a top hat; wingless by 8:93 ---- */
export function chaco(stage: 'leisure-suit' | 'tuxedo' | 'wingless') {
  const v = new Vox(), fur = '#8d8781', furDark = '#66615c';
  base(v, 'stoneDark', 'stone', 77);
  v.chunk = 0;
  head(v, fur);
  v.box(2, 8, 15, 5, 9, 17, twin(fur)); v.box(3, 10, 16, 4, 10, 17, 'black');   // the snout, the nose
  v.box(2, 8, 15, 5, 9, 15, '#d9d2c6');                                            // a pale jaw
  eyes(v, '#2a1a10', 18, [1, 6], 2); v.set(1, 7, 19, '#d8a02a'); v.set(6, 7, 19, '#d8a02a');
  for (const x0 of [0, 5]) { v.box(x0, 3, H1 + 1, x0 + 2, 4, H1 + 2, furDark); v.box(x0 + (x0 ? 1 : 0), 3, H1 + 3, x0 + (x0 ? 2 : 1), 4, H1 + 4, furDark); }   // pointed ears
  if (stage === 'leisure-suit') {
    const check = (x: number, z: number) => ((((x + 2) >> 1) + (z >> 1)) % 2 ? '#7a4a26' : '#d8792e');
    body(v, { top: '#7a4a26', skin: fur, bottom: '#7a4a26', legs: '#7a4a26', feet: '#3a2a20' });
    for (let x = 0; x <= 7; x++) for (let z = 6; z <= 13; z++) for (let y = 2; y <= 7; y++) if (v.get(x, y, z) && v.get(x, y, z) !== fur && v.get(x, y, z) !== twin(fur)) v.set(x, y, z, check(x, z));
    v.box(3, 7, 11, 4, 7, 13, '#e8dcc4'); v.set(3, 7, 13, '#e8dcc4');               // the open collar
    v.box(0, 3, 9, 0, 5, 9, twin(fur)); v.box(7, 3, 9, 7, 5, 9, twin(fur));
  } else {
    body(v, { top: TUX, skin: fur, bottom: TUX, legs: TUX, feet: 'black', front: 'white' });
    v.box(2, 7, 13, 5, 7, 13, 'black');
    v.box(-1, -1, H1 + 1, 8, 8, H1 + 1, 'black'); v.box(1, 1, H1 + 2, 6, 6, H1 + 6, '#141216'); v.box(1, 6, H1 + 2, 6, 6, H1 + 2, 'white');   // the top hat
    v.box(0, 3, H1 + 1, 2, 4, H1 + 2, furDark); v.box(5, 3, H1 + 1, 7, 4, H1 + 2, furDark);   // ears flattened under it
  }
  v.box(8, 5, 9, 8, 5, 11, 'metalDark'); v.box(8, 5, 12, 8, 6, 13, '#2b2b30');      // the microphone
  if (stage !== 'wingless') {
    // feathered wings, folded high behind the shoulders
    for (const side of [-1, 1]) for (let d = 0; d < 5; d++) {
      const x = side < 0 ? -1 - d : 8 + d, lo = 11 + d, hi = 23 + Math.min(d, 2) - (d === 4 ? 2 : 0);
      for (let z = lo; z <= hi; z++) v.set(x, -1, z, d === 4 || z === lo || z === hi ? furDark : z % 3 === 0 ? '#a7a19b' : fur);
    }
  }
  return v;
}

/* ---- the Ochre Line's engineer (3:11): a ManTauR, a man where a man's neck should be: the lower half large and
   strong, naked but for a fur loincloth, a pair of legs and arms; on top a smaller man with a second pair of arms,
   gap-toothed, greasy black hair hanging out of an engineer's hat, a filthy once-white tank top; blue paint in
   streaks over his face and his lower half ---- */
export function goreGore() {
  const v = new Vox(), skin = '#d9a27c', limb = twin(skin), paint = '#3a5fc8', top = '#d8d0b8';
  wideBase(v, -4, 11, 78);
  v.chunk = 0;
  // the lower man: legs, a loincloth, a big bare torso, arms, streaks of blue
  v.box(-1, 3, 5, 2, 8, 5, limb); v.box(5, 3, 5, 8, 8, 5, limb);                   // big feet
  v.box(-1, 3, 6, 2, 6, 8, limb); v.box(5, 3, 6, 8, 6, 8, limb);
  v.box(-1, 2, 9, 8, 7, 10, '#7a5a3a'); v.box(2, 8, 7, 5, 8, 10, '#8a6a46');      // the fur loincloth
  v.box(-1, 2, 11, 8, 7, 15, skin);
  v.box(-3, 3, 11, -2, 6, 15, limb); v.box(9, 3, 11, 10, 6, 15, limb); v.box(-3, 4, 9, -2, 6, 10, skin); v.box(9, 4, 9, 10, 6, 10, skin);
  for (const [x, z] of [[0, 12], [1, 13], [2, 14], [5, 12], [6, 13], [7, 14], [3, 11]] as const) v.set(x, 7, z, paint);
  v.set(-3, 6, 13, paint); v.set(10, 6, 12, paint); v.set(0, 6, 7, paint); v.set(7, 6, 6, paint);
  // the upper man, rising out of the shoulders, smaller
  v.box(1, 3, 16, 6, 6, 20, top); v.box(2, 6, 17, 5, 6, 19, '#bdb49a'); v.set(4, 6, 16, '#a89e82'); v.set(2, 6, 20, '#a89e82');   // the stained tank top
  v.box(-1, 4, 17, 0, 5, 20, limb); v.box(7, 4, 17, 8, 5, 20, limb); v.box(-1, 5, 16, 0, 6, 16, skin); v.box(7, 5, 16, 8, 6, 16, skin);   // the second pair of arms
  v.box(0, 1, 21, 7, 7, 28, skin);                                                  // the head
  eyes(v, 'black', 24, [2, 5], 2);
  v.box(2, 7, 22, 5, 7, 22, '#3a1820'); v.set(2, 7, 22, 'white'); v.set(3, 7, 22, 'white'); v.set(5, 7, 22, 'white');   // a gap-toothed grin
  for (const [x, z] of [[1, 26], [2, 25], [1, 24], [6, 26], [5, 25], [6, 24], [3, 23], [4, 23]] as const) v.set(x, 7, z, paint);   // the war paint
  // greasy black hair hanging out from under the hat, and the hat
  v.box(0, 1, 23, 0, 6, 27, '#141114'); v.box(7, 1, 23, 7, 6, 27, '#141114'); v.box(0, 1, 21, 7, 1, 27, '#141114');
  for (const x of [0, 7]) { v.set(x, 7, 23, '#141114'); v.set(x, 7, 22, '#141114'); }
  v.box(0, 1, 28, 7, 7, 29, PLAIN_TOP); v.box(1, 8, 28, 6, 9, 28, twin(PLAIN_TOP));
  squash(v, 7);                                                                     // a step shorter, so he stands with the rest
  return v;
}

/* ---- the Yellow Line's conductor (3:5): a dwarf at the bar over a drink, in a wrinkled uniform like the janitors'
   (a dark double-breasted suit with gold buttons, a white shirt, a conductor's cap), his jacket stuffed with
   drawings of a wife ---- */
export function vernon() {
  const suit = '#2c2d3a';
  const v = person({ skin: '#dcae8c', hair: { color: PLAIN_HAIR, style: 'short' }, top: suit, front: 'white', bottom: suit, feet: PLAIN_SHOES, seed: 79 });
  cap(v, suit); v.box(0, 7, H1, 7, 7, H1, 'accent');                              // the cap, its gold band
  for (const [x, z] of [[2, 10], [2, 12], [5, 10], [5, 12]] as const) v.set(x, 7, z, 'accent');   // the buttons
  for (const [x, y, z] of [[1, 6, 11], [6, 6, 13], [0, 5, 11], [7, 3, 12]] as const) v.set(x, y, z, twin(suit));   // creases
  v.box(5, 7, 13, 6, 7, 14, 'cloth'); v.set(6, 8, 14, '#d9d0bc');                 // the drawings, poking out
  v.box(8, 5, 9, 8, 6, 11, 'glass'); v.set(8, 5, 10, '#c98a2a');                 // the drink
  return v;
}
/* ---- a conductor of the Mango Line (3:21): a dwarf huddled on the ground, head hanging, tears down his dirt-coloured
   face and a puddle of them under him ---- */
export function tizquick() {
  const v = new Vox(), skin = '#8a6a4c', limb = twin(skin), tear = '#9fd6f0';
  base(v, 'stoneDark', 'stone', 80);
  v.chunk = 0;
  v.box(1, 1, 5, 6, 5, 8, PLAIN_BOTTOM);                                          // sitting
  v.box(1, 5, 5, 2, 8, 7, PLAIN_BOTTOM); v.box(5, 5, 5, 6, 8, 7, PLAIN_BOTTOM);   // knees drawn up
  v.box(1, 8, 5, 2, 9, 5, PLAIN_SHOES); v.box(5, 8, 5, 6, 9, 5, PLAIN_SHOES);
  v.box(1, 1, 9, 6, 5, 12, PLAIN_TOP);                                            // hunched
  v.box(0, 3, 8, 0, 7, 11, twin(PLAIN_TOP)); v.box(7, 3, 8, 7, 7, 11, twin(PLAIN_TOP));   // arms round the knees
  v.box(0, 7, 8, 7, 7, 8, limb);
  v.box(0, 1, 12, 7, 8, 19, skin);                                                // the head, hanging forward
  v.box(0, 1, 18, 7, 8, 19, PLAIN_HAIR); v.box(0, 1, 12, 7, 2, 19, PLAIN_HAIR); v.box(0, 3, 15, 0, 5, 19, PLAIN_HAIR); v.box(7, 3, 15, 7, 5, 19, PLAIN_HAIR);
  v.set(2, 8, 15, 'black'); v.set(5, 8, 15, 'black');
  v.box(1, 8, 16, 6, 8, 16, twin(skin));                                          // the brow, sunk
  for (const x of [2, 5]) { v.box(x, 9, 12, x, 9, 14, tear); v.set(x, 9, 11, tear); }   // tears
  for (const [x, y] of [[3, 9], [4, 9], [2, 10], [3, 10], [4, 10], [5, 10], [3, 11], [1, 9], [6, 9]] as const) v.set(x, y, 5, 'water');   // the puddle
  return v;
}

/* ---- the bartender at the Downward Dog (3:25-3:26): a jackal-faced gnoll, so drunk he can barely sit up, among
   empty bottles ---- */
export function growlerGary() {
  const v = new Vox(), fur = '#8c7b62', furDark = '#5f523f';
  wideBase(v, -3, 10, 81);
  v.chunk = 0;
  head(v, fur);
  v.box(2, 8, 14, 5, 11, 16, twin(fur)); v.box(3, 12, 15, 4, 12, 16, 'black'); v.box(2, 8, 14, 5, 11, 14, '#cfc2a8');   // a long jackal muzzle
  v.box(1, 7, 18, 2, 7, 18, 'black'); v.box(5, 7, 18, 6, 7, 18, 'black'); v.box(1, 7, 19, 6, 7, 19, furDark);   // eyes half shut
  for (const x0 of [0, 5]) { v.box(x0, 3, H1 + 1, x0 + 2, 4, H1 + 3, furDark); v.box(x0 + (x0 ? 1 : 0), 3, H1 + 4, x0 + (x0 ? 2 : 1), 4, H1 + 5, furDark); v.set(x0 + 1, 4, H1 + 2, '#c9a090'); }   // big ears
  body(v, { top: PLAIN_TOP, skin: fur, bottom: PLAIN_BOTTOM, feet: furDark });
  v.box(8, 5, 9, 8, 5, 12, 'glass'); v.set(8, 5, 13, 'glass'); v.set(8, 5, 14, 'woodDark');   // the bottle
  for (const [x, y, r] of [[-2, 7, 0], [9, 8, 1], [-1, 9, 1]] as const) { if (r) { v.box(x, y, 5, x + 2, y, 5, 'glass'); } else { v.box(x, y, 5, x, y, 7, 'glass'); } }   // empties on the floor
  return v;
}

/* ---- the Iron Tangle's crew ---- */
// Fire Brandy (3:14): only her head comes through the little hole in the boiler: red skin, black hair in a rockabilly
// up-do tied with a red bandana, two black horns through it, eyes of swirling black with heavy rings under them, steam off her
export function fireBrandy() {
  const v = new Vox(), skin = '#c8392e', hair = '#141114';
  wideBase(v, -3, 10, 82, -2, 11);
  v.chunk = 0;
  // the boiler: an iron firebox, rivets, a glow at the grate
  v.box(-2, -1, 5, 9, 4, 20, 'metalDark');
  for (const [x, z] of [[-2, 7], [-2, 12], [-2, 17], [9, 9], [9, 15]] as const) v.set(x, 5, z, 'metal');
  v.box(-1, 5, 5, 8, 5, 6, '#2a2a2e'); for (const x of [0, 2, 4, 6, 8]) v.set(x, 5, 6, 'ember');
  v.box(-1, 5, 7, 8, 5, 7, 'metal'); v.box(-1, 5, 18, 8, 5, 18, 'metal'); v.box(-1, 5, 7, -1, 5, 18, 'metal'); v.box(8, 5, 7, 8, 5, 18, 'metal');   // the door frame
  v.box(3, 0, 21, 4, 2, 24, 'metalDark'); v.set(3, 1, 25, 'mist'); v.set(4, 0, 26, 'mist');   // the stack
  // the head, out through the hole
  v.box(0, 6, 9, 7, 12, 16, skin);
  v.box(1, 12, 13, 2, 12, 14, 'black'); v.box(5, 12, 13, 6, 12, 14, 'black'); v.set(2, 12, 14, '#3a1414'); v.set(5, 12, 13, '#3a1414');   // swirling black eyes
  v.box(1, 12, 12, 2, 12, 12, '#8a2420'); v.box(5, 12, 12, 6, 12, 12, '#8a2420');   // the rings under them
  v.box(3, 12, 10, 4, 12, 10, '#5a1414');
  v.box(0, 6, 16, 7, 12, 17, hair); v.box(0, 6, 9, 7, 6, 17, hair); v.box(0, 7, 13, 0, 9, 17, hair); v.box(7, 7, 13, 7, 9, 17, hair);
  v.box(1, 9, 18, 6, 12, 20, hair); v.box(2, 11, 21, 5, 12, 21, hair);           // the up-do, rolled high over the brow
  v.box(0, 7, 18, 7, 8, 18, '#c0222a'); v.set(7, 8, 19, '#c0222a'); v.set(7, 7, 19, '#c0222a');   // the bandana
  for (const x of [0, 7]) { v.box(x, 9, 18, x, 9, 21, '#1b1714'); v.box(x + (x < 4 ? -1 : 1), 9, 21, x + (x < 4 ? -1 : 1), 9, 23, '#1b1714'); }   // horns
  for (const [x, y, z] of [[-1, 9, 15], [8, 10, 18], [0, 11, 22], [7, 7, 23], [-1, 7, 20], [8, 12, 14]] as const) v.set(x, y, z, 'mist');   // steam
  return v;
}
// Madison (3:17): a woman in her mid-forties who looks like any suburban soccer mom, in a white business dress covered
// in soot, one shoe on, a black heel
export function madison() {
  const skin = '#e8c1a2', dress = '#ece7dd';
  const v = person({ skin, hair: { color: PLAIN_HAIR, style: 'short' }, top: dress, bottom: dress, legs: twin(skin), seed: 83 });
  v.box(0, 1, 8, 7, 7, 9, dress); v.box(1, 2, 7, 6, 6, 7, dress);                // the skirt, to the knee
  for (const [x, y, z] of [[1, 7, 8], [2, 7, 11], [5, 7, 9], [6, 7, 7], [4, 7, 12], [0, 4, 10], [7, 5, 12], [3, 7, 6], [7, 3, 8], [6, 6, 13]] as const) v.set(x, y, z, x % 2 ? '#5a5652' : '#77726c');   // soot
  v.set(5, 7, 16, '#77726c'); v.set(1, 7, 15, '#77726c');
  v.box(1, 3, 5, 2, 7, 5, '#1b1714'); v.box(1, 3, 6, 2, 3, 6, '#1b1714'); v.box(1, 7, 6, 2, 7, 6, '#1b1714');   // the one black heel
  return v;
}
// Widget (3:17): a grease gremlin, goblin-shaped and tiny, no clothes but black bristly hair all over, a little railroad cap,
// and a toolbelt dragging a wrench three times his length
export function widget() {
  const v = new Vox(), fur = '#2a2525', bristle = '#3a3333';
  wideBase(v, -2, 12, 84, -5, 10);
  v.chunk = 0;
  head(v, fur);
  for (const [x, y] of [[1, 2], [3, 5], [5, 1], [6, 6], [2, 7], [0, 4], [7, 3]] as const) v.set(x, y, H1 + 1, bristle);
  for (const [x, z] of [[1, 15], [6, 16], [0, 19], [7, 18]] as const) v.set(x, 7, z, bristle);
  eyes(v, '#f0e2a8', 17, [2, 5], 2);
  v.box(3, 8, 15, 4, 8, 16, bristle);                                             // the nose
  for (const x of [-1, 8]) { v.box(x, 3, 17, x, 4, 19, fur); v.box(x < 0 ? -2 : 9, 3, 19, x < 0 ? -2 : 9, 4, 20, fur); v.set(x < 0 ? -3 : 10, 3, 20, fur); }   // pointed goblin ears
  cap(v, PLAIN_TOP);
  body(v, { top: fur, skin: fur, bottom: fur, legs: bristle, feet: bristle });
  for (const [x, y, z] of [[2, 6, 12], [5, 6, 11], [0, 4, 12], [7, 4, 10], [1, 6, 7]] as const) v.set(x, y, z, bristle);
  v.box(1, 7, 9, 6, 7, 9, '#5a4026'); v.box(0, 2, 9, 7, 6, 9, '#5a4026');         // the toolbelt
  // the wrench, hooked on the belt and dragging behind along the floor, its jaws far back
  v.box(8, 3, 8, 8, 3, 9, 'metal'); v.box(9, 2, 6, 9, 2, 7, 'metal');
  v.box(10, -4, 5, 10, 1, 5, 'metal');
  v.box(9, -5, 5, 11, -5, 6, 'metal'); v.box(9, -6, 5, 9, -6, 6, 'metal'); v.box(11, -6, 5, 11, -6, 6, 'metal');
  return v;
}
// Levi the Seventh (3:12): a pale, sickly flesher worn over a hobgoblin's skeleton like a poncho that does not fit, green-tinted
// skin hanging off it, naked but for an engineer's hat; the face slumped to its right, the mouth hole below the jaw, the eye
// holes drooping onto yellow bone, a nose like a hook hanging off to one side, clumps of black hair
export function levi() {
  const v = new Vox(), flesh = '#bcc8a4', fold = '#a3b08a', bone = '#d9c97a';
  base(v, 'stoneDark', 'stone', 85);
  v.chunk = 0;
  head(v, flesh);
  // the face slides to its right: the right half sags lower, past the jaw
  v.box(4, 8, 12, 7, 8, 15, fold); v.box(5, 8, 11, 7, 8, 11, fold);
  v.box(1, 7, 16, 2, 7, 18, '#2a2a22'); v.set(2, 7, 17, bone); v.set(1, 7, 16, bone);   // the eye holes, bone in them
  v.box(5, 8, 14, 6, 8, 16, '#2a2a22'); v.set(5, 8, 15, bone); v.set(6, 8, 14, bone);
  v.box(3, 8, 12, 4, 8, 12, '#2a1414');                                            // the mouth hole, under the jaw
  v.set(6, 9, 17, twin(flesh)); v.set(7, 9, 16, twin(flesh)); v.set(7, 9, 15, twin(flesh));   // the nose, dangling
  for (const [x, y] of [[1, 1], [5, 2], [2, 5], [6, 6]] as const) v.box(x, y, H1 + 1, x, y, H1 + 2, '#141114');   // clumps of hair
  cap(v, PLAIN_TOP, H1 + 1);
  // the poncho of flesh, from the shoulders to the knees, ragged at the hem
  for (let x = -1; x <= 8; x++) for (let y = 1; y <= 7; y++) {
    const hem = 7 + ((x * 3 + y) % 3);
    for (let z = hem; z <= 13; z++) if (x === -1 || x === 8 || y === 1 || y === 7 || z === 13) v.set(x, y, z, (x + z) % 4 === 0 ? fold : flesh);
  }
  // the hobgoblin's bones below it
  v.box(1, 3, 6, 2, 4, 8, bone); v.box(5, 3, 6, 6, 4, 8, bone);
  v.box(1, 3, 5, 2, 6, 5, bone); v.box(5, 3, 5, 6, 6, 5, bone);
  return v;
}
// Tizquick's line, the Mango, has no more; the next one is the shopkeeper at station 83 (3:2): a mole man, short and
// squat, an anthropomorphised mole down to the glasses, reading a book in his doorway
export function limpRichard() {
  const v = new Vox(), fur = '#3b3739', nose = '#e3a3a6', paw = '#e6b8b0';
  base(v, 'stoneDark', 'stone', 86);
  v.chunk = 0;
  round(v, -1, 8, -1, 7, H0 - 1, H1, fur);                                        // a round head sunk into the shoulders
  v.box(2, 8, 14, 5, 9, 16, fur); v.box(3, 10, 14, 4, 11, 15, nose); v.set(3, 11, 16, nose); v.set(4, 11, 16, nose);   // the pointed snout, pink at the end
  eyes(v, 'black', 17, [2, 5], 1);
  for (const ex of [2, 5]) { v.box(ex - 1, 8, 16, ex + 1, 8, 16, 'rail'); v.box(ex - 1, 8, 17, ex - 1, 8, 18, 'rail'); v.box(ex + 1, 8, 17, ex + 1, 8, 18, 'rail'); v.box(ex - 1, 8, 18, ex + 1, 8, 18, 'rail'); }   // the glasses
  v.set(1, 7, 17, 'black'); v.set(4, 7, 17, 'black');
  round(v, 0, 7, 1, 7, 6, 13, fur);                                               // squat
  v.box(1, 2, 5, 2, 6, 5, paw); v.box(5, 2, 5, 6, 6, 5, paw);                     // feet
  // the book, held open in big digging paws
  v.box(1, 8, 10, 6, 8, 13, '#6a3a2a'); v.box(1, 9, 11, 6, 9, 13, 'white'); v.box(3, 9, 11, 4, 9, 13, '#d8d0be');
  v.box(0, 7, 10, 0, 9, 12, paw); v.box(7, 7, 10, 7, 9, 12, paw); v.set(-1, 9, 11, paw); v.set(8, 9, 11, paw);
  return v;
}

/* ---- a Borant admin, at last in person (3:end): very like the representative before her, a little taller and thinner,
   no deep-diver suit, only a rebreather round her fish neck, standing in a puddle of brackish water, a shiny blinking pin on
   her breast ---- */
export function loita() {
  const v = new Vox(), skin = '#5f9e8a', fin = '#4d8573', pale = '#7fbfa8';
  base(v, 'stoneDark', 'stone', 87);
  v.chunk = 0;
  head(v, skin);
  v.box(2, 7, 15, 5, 7, 15, '#2f5446'); v.set(1, 7, 15, '#2f5446'); v.set(6, 7, 15, '#2f5446');   // a wide fish mouth
  eyes(v, 'black', 17, [1, 6], 2); v.set(1, 7, 19, pale); v.set(6, 7, 19, pale);
  v.box(3, 1, H1 + 1, 4, 5, H1 + 2, fin); v.box(3, 2, H1 + 3, 4, 3, H1 + 3, fin);   // a fin on top
  for (const x of [-1, 8]) { v.box(x, 3, 16, x, 5, 18, pale); v.set(x, 4, 19, pale); }   // side fins
  for (const z of [16, 17, 18]) v.set(0, 6, z, fin);                                // gills
  // the rebreather, a collar round the neck
  v.box(0, 1, 13, 7, 7, 13, 'metalDark'); v.box(2, 7, 13, 5, 7, 13, 'metal'); v.set(6, 7, 13, 'portal'); v.set(1, 0, 13, 'portal');
  // thin: the body a size down, the same fish skin
  v.box(2, 3, 10, 5, 5, 12, skin); v.box(1, 3, 10, 1, 4, 12, twin(skin)); v.box(6, 3, 10, 6, 4, 12, twin(skin));
  v.box(1, 3, 9, 1, 4, 9, pale); v.box(6, 3, 9, 6, 4, 9, pale);
  v.box(2, 3, 8, 5, 5, 9, twin(skin)); v.box(2, 3, 6, 2, 4, 7, skin); v.box(5, 3, 6, 5, 4, 7, skin);
  v.box(2, 3, 5, 2, 6, 5, fin); v.box(5, 3, 5, 5, 6, 5, fin);
  v.set(3, 6, 12, 'accentGlow');                                                  // the pin
  for (const [x, y] of [[0, 6], [1, 7], [2, 8], [3, 8], [4, 8], [5, 8], [6, 7], [7, 6], [1, 8], [6, 8], [0, 7], [7, 7], [3, 9], [4, 9]] as const) v.set(x, y, 5, (x + y) % 3 ? '#4a6a52' : '#3a5a48');   // the brackish puddle
  return v;
}

/* ---- the System's monster dog (3:31): a dog soldier who looks like a walking, talking German Shepherd, a Vietnam-era helmet
   with holes cut for her ears, the crawler working the flamethrower ---- */
export function tserendolgor() {
  const v = new Vox(), tan = '#c08a4a', black = '#241c18', olive = '#4f5a32';
  base(v, 'stoneDark', 'stone', 88);
  v.chunk = 0;
  head(v, tan);
  v.box(0, 0, 14, 7, 1, 21, black); v.box(0, 7, 19, 7, 7, 21, black);           // the dark saddle over the head
  v.box(2, 8, 14, 5, 11, 16, black); v.box(2, 8, 14, 5, 11, 14, tan); v.box(3, 12, 15, 4, 12, 16, '#0d0a08');   // the long muzzle, dark on top
  eyes(v, '#2a1a10', 17, [1, 6], 2); v.set(1, 7, 18, '#d8a02a'); v.set(6, 7, 18, '#d8a02a');
  // the helmet, ears up through it
  for (let x = -1; x <= 8; x++) for (let y = -1; y <= 8; y++) v.set(x, y, H1, olive);
  v.box(0, 0, H1 + 1, 7, 7, H1 + 2, olive); v.box(1, 1, H1 + 3, 6, 6, H1 + 3, twin(olive));
  for (const x0 of [0, 5]) { v.box(x0, 3, H1 + 3, x0 + 2, 4, H1 + 4, tan); v.box(x0 + (x0 ? 1 : 0), 3, H1 + 5, x0 + (x0 ? 2 : 1), 4, H1 + 6, tan); v.set(x0 + 1, 4, H1 + 4, black); }
  body(v, { top: PLAIN_TOP, skin: tan, bottom: PLAIN_BOTTOM, feet: black });
  // the flamethrower, levelled in both hands, its pilot lit
  v.box(1, 7, 9, 6, 8, 11, 'metalDark'); v.box(2, 7, 11, 4, 8, 11, 'metal'); v.box(5, 9, 10, 6, 13, 11, 'metal'); v.box(5, 13, 10, 6, 13, 11, 'metalDark');
  v.set(5, 14, 10, 'flame'); v.set(6, 14, 11, 'flame'); v.set(5, 15, 11, 'ember');
  v.box(0, 4, 9, 0, 7, 9, tan); v.box(7, 4, 9, 7, 7, 9, tan);
  return v;
}

/* ---- a crawler met on the fourth floor (4:20): about forty-five, five feet tall and solid, First Nations, a glowing metal
   skull cap lined with fur over short dark hair, a no-nonsense metal spear slung over her shoulder, an old double-v tattoo
   faded on her forehead, line tattoos on the backs of her hands, a nose broken many times ---- */
export function gwen() {
  const skin = '#b37a52', hair = '#1b1512';
  const v = person({ skin, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 89 });
  v.box(1, 2, 10, 6, 6, 13, PLAIN_TOP); v.box(1, 7, 10, 6, 7, 11, PLAIN_TOP);      // solid
  v.box(0, 0, 14, 7, 0, 20, hair); v.box(0, 1, 16, 0, 5, 20, hair); v.box(7, 1, 16, 7, 5, 20, hair);   // short dark hair under the cap
  v.box(0, 0, 21, 7, 7, 22, 'rail'); v.box(0, 7, 21, 7, 7, 21, '#8a7660'); v.box(0, 0, 21, 0, 6, 21, '#8a7660'); v.box(7, 0, 21, 7, 6, 21, '#8a7660');   // the cap, the fur at its rim
  v.set(3, 3, 23, 'portal'); v.set(4, 4, 23, 'beam');
  for (const [x, z] of [[1, 20], [2, 19], [3, 20], [4, 20], [5, 19], [6, 20]] as const) v.set(x, 7, z, '#5a5a68');   // the faded tattoo
  v.set(4, 8, 16, twin(skin));                                                       // the nose, crooked
  v.set(0, 5, 9, '#5a5a68'); v.set(7, 5, 9, '#5a5a68');                              // the hand tattoos
  for (let i = 0; i <= 17; i++) v.set(-2 + Math.round(i * 0.7), -1, 7 + i, 'metalDark');   // the spear, across the back
  v.box(10, -1, 24, 10, -1, 27, 'rail'); v.set(9, -1, 25, 'rail'); v.set(11, -1, 25, 'rail');
  return v;
}

/* ---- the Popov brothers, two names and one body (5:40): a two-headed nodling ogre, seven feet tall, wide and solid, skin
   a mottled grey, thick and callused like an elephant's; the left head in a knitted beanie, the right one round, wide and
   bare; a simple tunic, a badge round each neck, the right arm ringed in gold, wide eyes under furrowed brows, and the
   meteor hammer, a flaming ball on a chain. When they die (5:75) they split into two fat, naked baby ogres, about a year old ---- */
export function popovBrothers(stage: 'two-heads' | 'babies') {
  const v = new Vox(), hide = '#8a8683', mottle = '#6f6b68';
  const skin = (x: number, z: number) => ((((x + 8) >> 1) * 73 + (z >> 1) * 37) % 11 < 3 ? mottle : hide);
  if (stage === 'babies') {
    wideBase(v, -3, 15, 90);
    v.chunk = 0;
    for (const x0 of [-2, 8]) {
      round(v, x0, x0 + 6, 1, 7, 5, 10, hide);                                     // a fat round body, sitting
      v.box(x0 + 2, 7, 6, x0 + 4, 7, 9, twin(hide));                               // the belly
      v.box(x0, 7, 5, x0 + 1, 9, 6, twin(hide)); v.box(x0 + 5, 7, 5, x0 + 6, 9, 6, twin(hide));   // stubby legs out in front
      v.box(x0 - 1, 4, 9, x0 - 1, 5, 11, twin(hide)); v.box(x0 + 7, 4, 9, x0 + 7, 5, 11, twin(hide));   // little arms, up
      v.set(x0 - 1, 5, 12, hide); v.set(x0 + 7, 5, 12, hide);
      round(v, x0 - 1, x0 + 7, 0, 8, 11, 18, (x, y, z) => (y === 8 ? hide : skin(x, z)));   // a big baby head
      v.box(x0 + 1, 8, 14, x0 + 1, 8, 15, 'black'); v.box(x0 + 5, 8, 14, x0 + 5, 8, 15, 'black');
      v.set(x0 + 3, 8, 12, '#5a4a4a'); v.set(x0 + 3, 9, 13, twin(hide));             // a little mouth, a button nose
      v.set(x0 - 2, 4, 15, twin(hide)); v.set(x0 + 8, 4, 15, twin(hide));            // ears
    }
    return v;
  }
  wideBase(v, -6, 14, 91, -1, 10);
  v.chunk = 0;
  const tunic = PLAIN_TOP;
  v.box(-3, 2, 9, 11, 6, 14, tunic);                                               // one wide body
  v.box(-2, 2, 8, 10, 6, 8, tunic);
  v.box(-2, 3, 5, 1, 7, 7, (twin(hide))); v.box(7, 3, 5, 10, 7, 7, twin(hide));   // two thick legs
  v.box(-2, 3, 5, 1, 8, 5, mottle); v.box(7, 3, 5, 10, 8, 5, mottle);
  v.box(-5, 3, 9, -4, 5, 14, hide); v.box(12, 3, 9, 13, 5, 14, hide);              // massive arms
  v.box(-5, 4, 7, -4, 5, 8, twin(hide)); v.box(12, 4, 7, 13, 5, 8, twin(hide));
  for (const z of [9, 11, 13]) v.box(12, 3, z, 13, 5, z, 'accent');                // the right arm ringed in gold
  // two heads: the left in a knitted beanie and more chiseled, the right round, wide and bare
  for (const [x0, w] of [[-4, 7], [5, 8]] as const) {
    for (let x = x0; x <= x0 + w; x++) for (let y = 0; y <= 7; y++) for (let z = 15; z <= 22; z++) {
      if (w === 8 && ((x === x0 || x === x0 + w) && (y === 0 || y === 7 || z === 15 || z === 22))) continue;
      v.set(x, y, z, y === 7 ? hide : skin(x, z));
    }
    for (const x of [x0 + 2, x0 + w - 2]) v.box(x, 7, 18, x, 7, 19, 'black');                   // wide eyes
    v.box(x0 + 1, 7, 21, x0 + w - 1, 7, 21, mottle); v.box(x0 + 2, 7, 20, x0 + w - 2, 7, 20, twin(hide));   // furrowed brows
    v.box(x0 + 3, 8, 16, x0 + w - 3, 8, 17, twin(hide)); v.box(x0 + 2, 7, 15, x0 + w - 2, 7, 15, mottle);   // a broad nose, a wide mouth
    v.box(x0 + 2, 6, 14, x0 + w - 2, 6, 14, 'black'); v.box(x0 + 3, 7, 12, x0 + 3, 7, 13, '#eeeae2');   // the badge on its cord
  }
  v.box(-4, 0, 22, 3, 7, 24, '#4a4844'); v.box(-4, 7, 22, 3, 7, 22, '#5c5a55'); v.set(-1, 3, 25, '#5c5a55');   // the beanie
  // the meteor hammer: a chain from the left fist and a flaming ball at the end of it
  v.box(-5, 6, 7, -5, 6, 7, 'metalDark'); v.set(-5, 7, 6, 'metal'); v.set(-5, 8, 6, 'metalDark');
  round(v, -6, -3, 8, 11, 5, 8, 'metalDark'); v.set(-4, 11, 8, 'ember'); v.set(-5, 10, 9, 'flame'); v.set(-3, 11, 7, 'ember'); v.set(-6, 10, 7, 'ember');
  squash(v, 6);
  return v;
}

/* ---- the vulture goddess, on Odette's screen (6:36): a slender, human-like body in a long red flowing dress, the head of
   an Egyptian vulture, yellow, with white feathers spreading round it like an afro, a bow of oak slung over her shoulder,
   no wings, arms covered in bracelets; old and dirty and scarred all over, the yellow beak cracked and chipped ---- */
export function nekhebit() {
  const v = new Vox(), skin = '#c9a084', scar = '#e3c2a8', face = '#e8c23a', dress = '#b8262a';
  base(v, 'stoneDark', 'stone', 92);
  v.chunk = 0;
  // the ruff of white feathers, spread round the head
  for (let x = -2; x <= 9; x++) for (let y = -2; y <= 6; y++) for (let z = 13; z <= 24; z++) {
    if (((x - 3.5) / 6) ** 2 + ((y - 2) / 4.6) ** 2 + ((z - 18.5) / 6) ** 2 <= 1) v.set(x, y, z, (x * 3 + z * 2 + y) % 5 === 0 ? '#d8d2c6' : '#f2eee6');
  }
  v.box(1, 4, 14, 6, 7, 20, face);                                                 // the bare yellow face
  eyes(v, 'black', 18, [2, 5], 1);
  v.box(3, 8, 15, 4, 9, 18, '#e0b020'); v.box(3, 10, 15, 4, 10, 17, '#e0b020'); v.set(3, 11, 15, '#e0b020'); v.set(4, 11, 15, '#b88a18');   // the hooked beak
  v.set(4, 10, 17, '#8a6a20'); v.clear(3, 10, 16, 3, 10, 16);                       // cracked and chipped
  body(v, { top: dress, skin, bottom: dress, legs: dress, feet: dress, sleeves: [null, null] });
  v.box(0, 1, 6, 7, 7, 9, dress); v.box(-1, 1, 5, 8, 8, 5, dress);                 // the long flowing dress
  for (const [x, y, z] of [[2, 7, 7], [6, 8, 5], [1, 6, 11], [5, 6, 12]] as const) v.set(x, y, z, '#7d1b17');   // dirt
  for (const x of [0, 7]) { v.set(x, 5, 12, 'rail'); v.set(x, 5, 11, 'accent'); v.set(x, 5, 10, 'rail'); v.set(x, 3, 13, scar); v.set(x, 4, 10, scar); }   // bracelets and scars
  for (let i = 0; i <= 12; i++) v.set(8 - Math.round(i * 0.7), -1, 8 + i, i === 0 || i === 12 ? 'woodDark' : 'wood');   // the oak bow
  for (let i = 1; i < 12; i++) v.set(8 - Math.round(i * 0.7), 0, 8 + i, i % 2 ? '#e9e1cf' : null);
  return v;
}

/* ---- a former crawler with a show of her own (6:12): a Crest, so no eyebrows; pale, pretty, early twenties, a
   professional pantsuit, and a strange blob of faded yellow hair sitting at an angle on an otherwise bald head; by 7:11
   black shorts, boots and a simple leather top, the blob red now and on the other side, the floral tattoo up her right leg
   glowing, its tendrils showing on her left arm ---- */
export function rosetta(stage: 'pantsuit' | 'leather') {
  const skin = '#efd8c8', leather = stage === 'leather';
  const v = person({ skin, top: leather ? '#6b4a30' : PLAIN_TOP, bottom: leather ? '#1b1714' : PLAIN_TOP, legs: leather ? twin(skin) : undefined,
    feet: PLAIN_SHOES, sleeves: leather ? 'none' : 'long', seed: 93 });
  v.box(3, 7, 15, 4, 7, 15, '#c87a84');                                            // lips; no brows over the eyes
  if (!leather) { v.box(1, 1, H1 + 1, 4, 5, H1 + 1, '#e2cf86'); v.box(0, 1, H1 + 2, 3, 4, H1 + 2, '#e2cf86'); v.set(0, 2, H1 + 3, '#d6c070'); v.set(1, 1, H1 + 3, '#d6c070'); }
  else {
    v.box(3, 1, H1 + 1, 6, 5, H1 + 1, '#c0302a'); v.box(4, 1, H1 + 2, 7, 4, H1 + 2, '#c0302a'); v.set(7, 2, H1 + 3, '#a02420'); v.set(6, 1, H1 + 3, '#a02420');
    v.box(1, 3, 6, 2, 5, 7, PLAIN_SHOES); v.box(5, 3, 6, 6, 5, 7, PLAIN_SHOES);   // boots
    v.box(5, 3, 6, 6, 5, 7, PLAIN_SHOES);
    for (const [x, y, z] of [[6, 5, 8], [5, 6, 9], [6, 6, 8], [0, 5, 10], [0, 4, 11], [7, 5, 12]] as const) v.set(x, y, z, 'portal');   // the tattoo, glowing
    v.box(1, 2, 8, 6, 6, 9, '#1b1714');
    v.set(5, 5, 7, 'portal');
  }
  return v;
}

/* ---- Katia's sponsor, in person (7:37): a large, muscular female orc with pig nostrils and piggy eyes, in a black and
   orange space suit melded to her body, a weapon in her arm that glows blue at its tip ---- */
export function princessFormidable() {
  const v = new Vox(), hide = '#55473f', suit = '#1e1c22', orange = '#e0702a';
  base(v, 'stoneDark', 'stone', 94);
  v.chunk = 0;
  head(v, hide);
  v.box(1, 8, H0, 6, 8, H0 + 3, twin(hide)); v.box(1, 9, H0, 6, 9, H0 + 3, '#9a7a70');   // a pig's snout, a flat disc
  v.box(2, 9, H0 + 1, 2, 9, H0 + 2, '#1b1714'); v.box(5, 9, H0 + 1, 5, 9, H0 + 2, '#1b1714');   // the nostrils, flared
  v.set(1, 7, H0 + 4, 'black'); v.set(6, 7, H0 + 4, 'black'); v.box(0, 8, H0 + 5, 2, 8, H0 + 5, twin(hide)); v.box(5, 8, H0 + 5, 7, 8, H0 + 5, twin(hide));   // small piggy eyes under a heavy brow
  for (const [x, dx] of [[0, -1], [6, 1]] as const) { v.box(x, 4, H1 + 1, x + 1, 6, H1 + 1, hide); v.box(x + (dx < 0 ? 0 : 1), 6, H1 + 2, x + (dx < 0 ? 0 : 1), 7, H1 + 2, hide); v.set(x + (dx < 0 ? 0 : 1), 8, H1 + 2, twin(hide)); }   // pig ears, pricked forward
  body(v, { top: suit, skin: hide, bottom: suit, legs: suit, feet: orange, sleeves: [suit, suit] });
  v.box(-1, 3, 10, 0, 5, 13, suit); v.box(7, 3, 10, 8, 5, 13, suit);             // arms like legs
  v.box(1, 6, 12, 6, 6, 13, orange); v.box(-1, 3, 12, -1, 5, 12, orange); v.box(8, 3, 12, 8, 5, 12, orange); v.box(1, 6, 8, 6, 6, 8, orange);   // the suit's orange panels
  v.box(1, 3, 6, 2, 5, 6, orange); v.box(5, 3, 6, 6, 5, 6, orange);
  v.box(-1, 4, 9, 0, 5, 9, hide);
  v.box(8, 4, 8, 9, 7, 9, 'metalDark'); v.box(9, 8, 9, 9, 8, 9, 'portal'); v.set(9, 9, 9, 'portal');   // the arm weapon, glowing blue
  return v;
}

/* ---- the cookbook's authors, where the books give a body ---- */
// Drakea (4:28): a bune, one of a slight, dragon-like people
export function drakea() {
  const v = new Vox(), hide = '#6c726a', belly = '#a9ad9a', ridge = '#474c46';
  base(v, 'stoneDark', 'stone', 95);
  v.chunk = 0;
  // a narrow, long head: a dragon's, the snout reaching forward and sloping, horns swept back, spines behind
  v.box(1, 0, 14, 6, 7, 20, hide);
  v.box(2, 8, 14, 5, 10, 15, hide); v.box(2, 8, 16, 5, 9, 16, hide); v.box(2, 8, 14, 5, 10, 14, belly);
  v.box(2, 10, 15, 2, 10, 15, '#3a3430'); v.box(5, 10, 15, 5, 10, 15, '#3a3430');      // nostrils
  v.box(1, 8, 15, 1, 9, 15, '#3a3430'); v.box(6, 8, 15, 6, 9, 15, '#3a3430');          // the line of the jaw
  v.box(2, 7, 17, 2, 7, 18, '#e8c21c'); v.box(5, 7, 17, 5, 7, 18, '#e8c21c'); v.set(2, 7, 17, 'black'); v.set(5, 7, 17, 'black');   // yellow eyes, slit
  v.box(1, 8, 19, 2, 8, 19, ridge); v.box(5, 8, 19, 6, 8, 19, ridge);                 // brow ridges
  for (const x of [1, 6]) { v.box(x, 0, 21, x, 1, 21, ridge); v.set(x, -1, 22, ridge); }   // short horns, swept back
  for (const y of [1, 3, 5]) v.box(3, y, 21, 4, y, 22, ridge);                      // a crest of spines along the top
  for (const z of [14, 16, 18, 20]) v.box(3, -1, z, 4, -1, z, ridge);                 // and down the back of the head
  // slight: a thin body, a belly, a tail
  v.box(2, 3, 10, 5, 5, 13, hide); v.box(3, 6, 10, 4, 6, 13, belly);
  v.box(1, 3, 10, 1, 4, 13, twin(hide)); v.box(6, 3, 10, 6, 4, 13, twin(hide)); v.box(1, 4, 9, 1, 5, 9, belly); v.box(6, 4, 9, 6, 5, 9, belly);
  v.box(2, 3, 8, 5, 5, 9, twin(hide)); v.box(2, 3, 6, 2, 4, 7, hide); v.box(5, 3, 6, 5, 4, 7, hide);
  v.box(1, 3, 5, 2, 6, 5, ridge); v.box(5, 3, 5, 6, 6, 5, ridge);
  for (const [x, y, z] of [[3, 2, 8], [4, 2, 8], [3, 1, 7], [3, 0, 6], [3, -1, 5], [2, -2, 5], [1, -2, 5], [0, -1, 5]] as const) v.set(x, y, z, hide);   // the tail, curled round
  for (const z of [9, 11, 13]) { v.set(3, 2, z, ridge); v.set(4, 2, z, ridge); }
  return v;
}
// Milk, in her guild (7:26): clawed, winged, sore-jointed after long sleep, a creature the vampire takes for a clawed frog
export function milk() {
  const v = new Vox(), hide = '#7b7866', belly = '#a8a28a', wing = '#5c5a4c', claw = '#e3dccb';
  base(v, 'stoneDark', 'stone', 96);
  v.chunk = 0;
  // a wide, flat frog head, the eyes up on top
  round(v, -1, 8, 0, 7, 14, 19, hide);
  v.box(0, 8, 14, 7, 8, 15, hide); v.box(0, 8, 14, 7, 8, 14, belly); v.box(1, 9, 15, 6, 9, 15, '#4a4838');   // the wide mouth
  for (const x0 of [0, 5]) { round(v, x0, x0 + 2, 4, 7, 19, 21, hide); v.set(x0 + 1, 8, 20, 'black'); v.set(x0 + 1, 7, 21, '#c9b84a'); }   // eyes on top
  // a squat body, belly pale, wings folded high on the back
  round(v, 0, 7, 1, 7, 7, 13, hide); v.box(2, 7, 8, 5, 7, 12, belly);
  v.box(0, 5, 5, 2, 8, 6, twin(hide)); v.box(5, 5, 5, 7, 8, 6, twin(hide));          // haunches, frog legs folded
  for (const x of [0, 2, 5, 7]) v.set(x, 9, 5, claw);
  v.box(-1, 5, 9, -1, 7, 11, twin(hide)); v.box(8, 5, 9, 8, 7, 11, twin(hide));
  for (const [x, y] of [[-1, 8], [-2, 7], [8, 8], [9, 7]] as const) v.set(x, y, 9, claw);   // claws out
  wings(v, wing, '#45443a', 10, 21, 4, 0);
  return v;
}
// York (7:end): a tenodera, a smaller, flightless cousin of the mantids, writing a poem
export function york() {
  const v = new Vox(), hide = '#8c8566', dark = '#6a644c', eye = '#d8cf8a';
  base(v, 'stoneDark', 'stone', 97);
  v.chunk = 0;
  // the head, a triangle wide at the top with big eyes at its corners, the jaw small, antennae
  for (let z = 14; z <= 21; z++) { const w = Math.min(4, Math.round((z - 13) * 0.6) + 1); v.box(4 - w, 2, z, 3 + w, 6, z, hide); }
  v.box(-1, 3, 19, 0, 7, 21, eye); v.box(7, 3, 19, 8, 7, 21, eye); v.set(0, 7, 20, 'black'); v.set(7, 7, 20, 'black');
  v.box(3, 7, 14, 4, 7, 15, dark);
  for (const [x, dx] of [[2, -1], [5, 1]] as const) for (let i = 1; i <= 5; i++) v.set(x + dx * Math.floor(i / 2), 5 + Math.floor(i / 3), 21 + i, dark);
  // a long thin thorax, the forelegs folded in front, holding a pen
  v.box(3, 3, 11, 4, 5, 13, hide); v.box(2, 2, 6, 5, 4, 10, twin(hide));
  v.box(1, 5, 11, 1, 7, 12, dark); v.box(6, 5, 11, 6, 7, 12, dark); v.box(1, 7, 10, 1, 8, 10, hide); v.box(6, 7, 10, 6, 8, 10, hide);
  v.box(5, 9, 10, 5, 9, 12, '#1b1714');                                              // the pen
  v.box(1, 3, 5, 1, 5, 9, dark); v.box(6, 3, 5, 6, 5, 9, dark); v.box(1, 6, 5, 1, 6, 5, dark); v.box(6, 6, 5, 6, 6, 5, dark);   // legs
  v.box(0, 1, 5, 0, 1, 7, dark); v.box(7, 1, 5, 7, 1, 7, dark);
  return v;
}
// Forkith in Sheol (8:end): a small red demon
export function forkith() {
  return person({ skin: '#c23a2e', hair: { color: PLAIN_HAIR, style: 'buzz' }, top: PLAIN_TOP, bottom: PLAIN_BOTTOM, feet: PLAIN_SHOES, seed: 98 });
}

/* Every figure drawn here, by character id and look. */
export const BOOK3_FIGURES: Record<string, Record<string, () => Vox>> = {
  bomo: { tuxedo: () => bomo('tuxedo'), scrapheap: () => bomo('scrapheap'), unarmored: () => bomo('tuxedo') },
  sledge: { tuxedo: () => sledge('tuxedo'), boa: () => sledge('boa') },
  'clay-ton': { 'arms-crossed': clayTon },
  astrid: { tuxedo: astrid },
  eva: { sabers: eva },
  silfa: { healer: silfa },
  chaco: { 'leisure-suit': () => chaco('leisure-suit'), tuxedo: () => chaco('tuxedo'), wingless: () => chaco('wingless') },
  'gore-gore': { engineer: goreGore },
  vernon: { uniform: vernon },
  tizquick: { tears: tizquick },
  'growler-gary': { bottle: growlerGary },
  'fire-brandy': { boiler: fireBrandy },
  madison: { 'one-heel': madison },
  widget: { wrench: widget },
  'levi-the-seventh': { flesher: levi },
  'limp-richard': { book: limpRichard },
  loita: { rebreather: loita },
  tserendolgor: { helmet: tserendolgor },
  gwen: { spear: gwen },
  'popov-brothers': { 'two-heads': () => popovBrothers('two-heads'), babies: () => popovBrothers('babies') },
  nekhebit: { vulture: nekhebit },
  rosetta: { pantsuit: () => rosetta('pantsuit'), leather: () => rosetta('leather') },
  'princess-formidable': { spacesuit: princessFormidable },
  drakea: { bune: drakea },
  milk: { winged: milk },
  york: { tenodera: york },
  forkith: { demon: forkith },
};
