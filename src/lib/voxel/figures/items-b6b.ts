import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { lathe, chamfer } from './itemparts.ts';
import { potion, patch, piercing, tgheeCard, tgheeBack } from './itemforms.ts';

/* ---- items, set b6b (book 6, and what it carries on) ----
   Drawn like the anchor set in items.ts: one object, floating, three-quarter
   view, smooth (chunk 0), facing +y (the lit left face), z up. Each look from
   the edition's own description at its point; a colour the book leaves unsaid
   is a plain one. Shapes and colours only. */

const fresh = () => { const v = new Vox(); v.chunk = 0; return v; };
type P = [number, number, number];

/** a straight bar of voxels from one point to another, stepped along its longest axis */
function bar(v: Vox, a: P, b: P, m: string | ((i: number, n: number) => string)) {
  const n = Math.max(...a.map((p, i) => Math.abs(b[i] - p)));
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0;
    v.set(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), typeof m === 'string' ? m : m(i, n));
  }
}
/** a disc standing in the x-z plane, y0..y1 thick: an octagon, which reads round where a stepped circle reads as a heap */
function disc(v: Vox, cx: number, cz: number, y0: number, y1: number, r: number, m: string) {
  for (let x = cx - r; x <= cx + r; x++) for (let z = cz - r; z <= cz + r; z++) {
    if (Math.abs(x - cx) + Math.abs(z - cz) <= r + Math.floor(r / 2)) v.box(x, y0, z, x, y1, z, m);
  }
}
/** rows of characters drawn onto the face at y, top row first, from (x0, z0 + rows - 1) */
function face(v: Vox, x0: number, y: number, z0: number, rows: string[], pick: (c: string) => string | null) {
  rows.forEach((row, j) => [...row].forEach((c, i) => { const m = pick(c); if (m) v.set(x0 + i, y, z0 + rows.length - 1 - j, m); }));
}

/* ---- the cards ----
   6:4 a T'Ghee card is "a large, rectangular card, just about the size of a
   postcard", "rigid, but it still felt like it was made of paper"; "The back was
   decorated with the now-familiar logo of the Syndicate government. The 3D image
   moved and undulated on its own." That logo, from the top down (3:30), is "a
   group of overlapping circles, similar to the Olympics logo, though the rings
   were all a different size". In play the cards shrink "to the size of playing
   cards" (6:9), so a T'Ghee card is drawn a size up from the plain card form,
   standing, a little turned. A card whose face the book never describes shows
   its back, the one side every T'Ghee card has in common; a card whose face is
   described shows that. A border takes its rarity's colour only where the book
   gives it: "Green, which was the color of a common card" (6:16), "the black
   border of mythical rareness" (6:17). Otherwise it is the plain form's slate. */
const tghee = tgheeCard, cardBack = tgheeBack;

/* 6:11 Hobbled, "a 'very rare,' consumable card": "It featured a pair of legs
   tied together." The rarity's colour is never given, and nor are the picture's,
   so the legs are a plain skin, the shoes plain, the cord a plain one. */
const HOBBLE = [
  '..lllLLL..',
  '..lllLLL..',
  '...llLL...',
  '...llLL...',
  '.rrrrrrrr.',
  '...llLL...',
  '...llLL...',
  '...llLL...',
  '.rrrrrrrr.',
  '...llLL...',
  '...llLL...',
  '.sssllSSS.',
  'sssss.SSSS',
  '..........',
];
function hobbled(): Vox {
  const v = tghee();
  const skin = '#c98a62', shoe = '#2b2724', cord = '#8a5a35';
  face(v, 1, 1, 1, HOBBLE, c => ({ l: skin, L: twin(skin), s: shoe, S: twin(shoe), r: cord } as Record<string, string>)[c] ?? null);
  v.set(9, 2, 10, cord); v.set(9, 2, 6, cord); v.set(10, 2, 5, cord);   // the knots, standing off the face
  return v;
}

/* 6:59 The Midnight Express, "a consumable special card, and it featured two,
   large men in tights"; 6:68 "The card featured a pair of tag-team wrestlers."
   Their colours are never given: plain skin, one plain dark for the tights. */
const EXPRESS = [
  '.sss..sss.',
  '.sss..sss.',
  '..s....S..',
  'sssssSSSSS',
  'sTTTsSUUUS',
  'sTTTsSUUUS',
  '.TTT..UUU.',
  '.TTT..UUU.',
  '.T.T..U.U.',
  '.T.T..U.U.',
  '.T.T..U.U.',
  '.T.T..U.U.',
  '.b.b..B.B.',
  '..........',
];
function midnightExpress(): Vox {
  const v = tghee();
  const skin = '#c98a62', tights = '#3d3f4c', boot = '#2b2724';
  face(v, 1, 1, 1, EXPRESS, c => ({ s: skin, S: twin(skin), T: tights, U: twin(tights), b: boot, B: twin(boot) } as Record<string, string>)[c] ?? null);
  return v;
}

/* ---- the motorcycle ----
   3:7 "A 1965 Harley Davidson FLH Panhead Electra Glide!", "the red and beige
   motorcycle", and "the small dent on the gas tank". 6:44 the same bike in the
   yard: "the dirty and cracked leather seat", "all the dust on the truck and
   motorcycle"; the weeds grow up round its tyres from the ground, not on it. A
   heavy road bike (7:20), as a chibi of itself: it runs along x, its front at
   +x, so its side is the lit face and the dent is on it. The seat's leather and
   the engine's metal are never coloured, so they are plain ones. */
function harley(dusty: boolean): Vox {
  const v = fresh();
  const red = dusty ? '#8e4a40' : '#b8322a', redLow = dusty ? '#7a3f37' : '#972820', dent = dusty ? '#55302a' : '#5e1612';
  const beige = dusty ? '#b5a88c' : '#dccba0', leather = dusty ? '#5a4a3e' : '#4a3226', crack = '#8a7a68';
  const tyre = '#2a292e', hub = dusty ? '#7d828a' : '#a4abb6', chrome = dusty ? '#9aa0a8' : '#c8ccd4', engine = dusty ? '#6e737a' : '#7c858e', fin = '#4f555c';
  const lens = dusty ? '#b9b6a8' : '#eeeae2', dust = '#a8987c';
  // the two wheels, fat and black, a hub on the near side of each
  for (const cx of [4, 16]) { disc(v, cx, 4, 0, 3, 4, tyre); disc(v, cx, 4, 4, 4, 1, hub); v.set(cx, 5, 4, chrome); }
  // the fenders, deep, over the top of each wheel
  for (let x = 0; x <= 7; x++) { const z = x === 0 ? 6 : x === 1 ? 8 : 9; v.box(x, 0, z, x, 3, z, red); }
  v.box(0, 0, 4, 0, 3, 5, redLow);
  for (let x = 13; x <= 19; x++) { const z = x >= 19 ? 7 : x === 18 ? 8 : 9; v.box(x, 1, z, x, 2, z, red); }
  // the engine low in the middle, its two cylinders up in a vee, finned
  chamfer(v, 8, 0, 2, 12, 3, 6, 1, engine);
  for (const [x0, x1] of [[8, 9], [11, 12]] as const) { v.box(x0, 0, 7, x1, 3, 8, fin); v.box(x0, 1, 7, x1, 2, 8, engine); }
  v.box(7, -1, 3, 7, -1, 3, chrome); v.box(1, -1, 3, 6, -1, 3, chrome);   // the exhaust, on the far side
  // the side cover under the seat, beige
  v.box(5, 0, 6, 7, 3, 8, beige);
  // the tank: red over beige, rounded at its ends, the dent on the near side
  chamfer(v, 8, 0, 9, 13, 3, 9, 1, beige);
  chamfer(v, 8, 0, 10, 13, 3, 12, 1, red);
  v.box(9, 1, 13, 12, 2, 13, red);
  v.set(11, 3, 11, null); v.set(11, 2, 11, dent); v.set(10, 3, 11, dent);
  // the leather seat, sprung, longest at the back
  chamfer(v, 2, 0, 10, 7, 3, 11, 1, leather);
  v.box(5, 1, 12, 7, 2, 12, leather);
  // the fork up from the front wheel, the headlight, the bars
  bar(v, [16, 0, 5], [14, 0, 13], chrome); bar(v, [16, 3, 5], [14, 3, 13], chrome);
  chamfer(v, 15, 1, 10, 16, 2, 12, 0, chrome);
  v.box(17, 1, 11, 17, 2, 12, lens);
  v.box(14, -2, 14, 14, 5, 14, chrome); v.set(14, -2, 14, tyre); v.set(14, 5, 14, tyre); v.set(13, -2, 14, tyre); v.set(13, 5, 14, tyre);
  if (dusty) {
    // dust on what faces up, and the leather cracked across the seat
    for (const [x, y] of [[3, 1], [6, 2], [9, 2], [12, 1], [13, 3], [2, 3], [17, 2]] as const) {
      let z = 16; while (z > 0 && !v.has(x, y, z)) z--;
      if (z > 0) v.set(x, y, z, dust);
    }
    for (const [x, y, z] of [[3, 3, 11], [4, 3, 10], [6, 2, 12], [5, 3, 11], [2, 1, 11]] as const) if (v.has(x, y, z)) v.set(x, y, z, crack);
  }
  return v;
}

/* 6:3 the peace symbol patch: "small and round, almost identical in size to my
   earth patch. It was just black with a white, screen-printed peace symbol on
   it." The round patch form, black through to its edge, the symbol printed flat. */
function peacePatch(): Vox {
  const black = '#2a2a30', white = '#eeeae2';
  const v = patch({ shape: 'round', field: black, rim: twin(black) });
  // the symbol: a ring inside the edge, the stem down its middle, the two legs down from the centre
  const cx = 5, cz = 6;
  const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - ax - t * dx, z - az - t * dz);
  };
  for (let x = 0; x <= 10; x++) for (let z = 0; z <= 12; z++) {
    if (!v.has(x, 1, z)) continue;
    const d = Math.hypot((x - cx) / 3.9, (z - cz) / 4.6);
    const ringed = d <= 1.08 && d >= 0.8;
    const stem = x === cx && d < 0.9;
    const legs = d < 0.9 && z <= cz && (seg(x, z, cx, cz, 1.8, 2.6) < 0.55 || seg(x, z, cx, cz, 8.2, 2.6) < 0.55);
    if (ringed || stem || legs) v.set(x, 1, z, white);
  }
  return v;
}

/* 6:52 the Valtay shield: "simply a round, pinback button that looked a little
   like the planet Saturn", "clipped to me". A domed button facing out, its ring
   tilted across it and out past its edge either side, in front below and behind
   above. Its colours are never given, so they are plain. */
function persoShield(): Vox {
  const v = fresh();
  const body = '#c4c9d2', edge = '#9ea5b0', ringC = '#5d646e', ringLit = '#7f8792', pin = '#454b52';
  const cx = 7, cz = 6, r = 4.6;
  // the button, domed to the front
  for (let x = 0; x <= 14; x++) for (let z = 0; z <= 12; z++) {
    const d = Math.hypot(x - cx, z - cz);
    if (d > r) continue;
    const top = 1 + Math.floor(2.6 * Math.sqrt(1 - (d / r) ** 2));
    v.box(x, 0, z, x, top, z, d > r - 0.9 ? edge : body);
  }
  v.box(cx - 1, -1, cz - 1, cx + 1, -1, cz + 1, pin);                      // the clasp behind
  // the ring, round its middle and out past it, tipped a little
  for (let x = -1; x <= 15; x++) for (let y = -3; y <= 7; y++) {
    const e = ((x - cx) / 7.4) ** 2 + ((y - 1.5) / 4.6) ** 2;
    if (e > 1 || e < 0.6) continue;
    const z = Math.round(cz + (x - cx) * 0.22);
    if (!v.has(x, y, z)) v.set(x, y, z, y >= 2 ? ringLit : ringC);
  }
  return v;
}

/* ---- the flamethrower ----
   5:64 "Ren's flamethrower, which she wore like a backpack. It reminded me those
   backpacks from the Ghostbusters movies, only hers was also part of her shirt";
   6:58 she holds it "flamethrower in her hands"; 6:59 she "unsnapped her
   flamethrower attachment, and the whole apparatus toppled", "the enchanted
   flamethrower, which was really part breastplate, part weapon". So a
   breastplate standing as if worn, the tanks on its back over the shoulders,
   a hose round to the gun across its front. Its metal is never coloured, so it is
   a plain one. 7:65 refitted to Jamal's harness: "Little tendrils of flame kept
   leaking from Jamal's flamethrower." */
function velma(leaking: boolean): Vox {
  const v = fresh();
  const plate = '#9aa1aa', ridge = '#c3c8d0', trim = '#6b727c', tank = '#55595f', band = '#3f4247', valve = '#7c858e', strap = '#4a3a2c';
  const hose = '#26252a', gun = '#4a4f57', gunTop = '#6b727c', muzzle = '#3b3f47', ring = '#1d1e22';
  // the breastplate, standing as if worn: broad shoulders, a scoop for the neck, in to the waist
  for (let z = 2; z <= 13; z++) {
    const half = z >= 11 ? 6.5 : z >= 6 ? 5.5 : 4.5;
    for (let x = 0; x <= 13; x++) {
      const o = Math.abs(x - 6.5);
      if (o > half) continue;
      if (z >= 12 && o <= 2) continue;                                    // the neck
      if (z >= 8 && z <= 10 && o > 5) continue;                           // under the arms
      const rim = o > half - 1 || z === 2 || (z >= 12 && o <= 3);
      v.box(x, 7, z, x, 8, z, rim ? trim : o < 1 ? ridge : plate);
    }
  }
  // the pack on its back: two tall tanks, banded, their round tops up over the shoulders
  for (const tx of [3.5, 9.5]) lathe(v, tx, 3.5, 1, 18, z => (z >= 18 ? 1.3 : z === 17 ? 2.1 : 2.6), (_x, _y, z) => (z === 5 || z === 14 ? band : tank));
  for (const tx of [3, 9]) v.box(tx, 3, 19, tx + 1, 4, 19, valve);
  v.box(5, 2, 4, 8, 4, 12, band);                                          // the frame between them
  // the straps over the shoulders, from the plate back to the pack
  for (const x of [2, 3, 10, 11]) v.box(x, 6, 14, x, 6, 14, strap);
  // the hose, out from the bottom of the pack, round the near corner to the gun
  bar(v, [12, 4, 1], [14, 6, 1], hose); bar(v, [14, 6, 1], [14, 10, 1], hose); bar(v, [14, 10, 1], [13, 10, 4], hose);
  // the gun, held across the front of the plate, its nozzle out to the left
  v.box(2, 10, 4, 12, 11, 5, gun); v.box(2, 10, 6, 12, 11, 6, gunTop);
  v.box(9, 11, 2, 10, 11, 3, gun);                                         // the grip
  v.box(-1, 9, 3, 1, 12, 7, muzzle); v.box(-1, 10, 4, -1, 11, 6, ring);
  if (leaking) {
    for (const [x, y, z, m] of [[-2, 10, 5, 'ember'], [-2, 11, 4, 'ember'], [-3, 11, 6, 'flame'], [-2, 10, 7, 'flame'], [-3, 10, 8, 'flame'], [-2, 12, 6, 'ember'], [-3, 12, 5, 'flame']] as const) v.set(x, y, z, m);
  }
  return v;
}

/* ---- the staff totem ----
   6:42 as the ogre wields it: "A small tree appeared, rising out of the ground,
   made of gnarled roots and leaves, twisting together and withering as it rose".
   "Feathers and turkey claws erupted from it in various places. What appeared to
   be a black, beating human heart hung off a branch at the top, like a fat, ripe
   apple. Atop the whole thing grew the shining, golden skull of a large lizard. It
   had gems for eyes." "The jewels in the skull's eyes flashed bright as a purple
   light spread". The feathers and claws are never coloured, so they are plain.
   6:43 "it looks different depending on what spell it's holding"; 6:46 with
   Clockwork Triplicate in it: "The staff was made of brass with a little cog at
   the top that spun on its own." */
function necroStaff(): Vox {
  const v = fresh();
  const bark = '#5a4630', bark2 = '#6e5a3e', leaf = '#7d7a3c', leaf2 = '#8a6a36', feather = '#7a5638', tip = '#ded3bd', claw = '#cbbd94';
  const heart = '#1d1518', heartLit = '#5a1e26', gold = '#e3b53b', goldDark = '#b98d25', shine = '#f6dd7a', gem = '#b46cf2', tooth = '#f1ead2';
  // the roots, splayed and gnarled
  for (const [x, y, z] of [[0, 4, 0], [11, 6, 0], [6, 0, 0], [3, 11, 0], [10, 10, 1]] as const) {
    bar(v, [5, 5, 3], [x, y, z], (i) => (i % 2 ? bark : bark2));
    bar(v, [5, 5, 2], [Math.round((x + 5) / 2), Math.round((y + 5) / 2), 1], bark);    // thick where it leaves the trunk
  }
  // the trunk, two thick, twisting as it rises
  const tw: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  for (let z = 2; z <= 16; z++) {
    const [dx, dy] = tw[Math.floor(z / 3) % 4];
    v.box(4 + dx, 4 + dy, z, 5 + dx, 5 + dy, z, Math.floor(z / 3) % 2 ? bark : bark2);
  }
  // the branches, and withering leaves at their ends
  bar(v, [6, 6, 13], [8, 10, 15], bark);
  bar(v, [4, 5, 10], [1, 3, 13], bark2);
  bar(v, [6, 4, 14], [10, 3, 16], bark);
  for (const [x, y, z, m] of [[1, 3, 14, leaf], [0, 3, 13, leaf2], [1, 2, 13, leaf], [10, 3, 17, leaf2], [11, 3, 16, leaf], [10, 2, 16, leaf2], [9, 11, 15, leaf2], [8, 11, 16, leaf], [3, 7, 8, leaf2], [7, 7, 6, leaf]] as const) v.set(x, y, z, m);
  // feathers and turkey claws out of it here and there
  for (const [a, b] of [[[6, 6, 8], [9, 8, 10]], [[4, 4, 11], [2, 2, 12]]] as [P, P][]) bar(v, a, b, (i, n) => (i === n ? tip : feather));
  for (const [x, y, z] of [[3, 6, 6], [8, 3, 9]] as const) { v.set(x, y, z, claw); v.set(x, y + 1, z - 1, claw); v.set(x - 1, y, z - 1, claw); v.set(x, y, z - 1, claw); }
  // the heart, hanging off the branch at the top like an apple
  v.set(8, 10, 14, bark2);
  chamfer(v, 6, 9, 10, 9, 12, 13, 1, heart);
  chamfer(v, 7, 10, 9, 8, 11, 9, 0, heart);
  for (const [x, y, z] of [[7, 12, 12], [8, 12, 11], [6, 11, 12], [7, 12, 11]] as const) v.set(x, y, z, heartLit);
  // the golden lizard skull on top, its long snout to the front, gems in its eyes
  chamfer(v, 3, 3, 17, 7, 7, 20, 1, gold);
  v.box(4, 4, 21, 6, 6, 21, goldDark);
  chamfer(v, 4, 8, 17, 6, 11, 18, 1, gold);
  v.box(4, 8, 17, 6, 11, 17, goldDark);
  for (const x of [4, 6]) v.set(x, 11, 18, goldDark);                  // the nostrils
  for (const x of [4, 5, 6]) v.set(x, 12, 17, tooth);
  v.set(3, 7, 19, gem); v.set(7, 7, 19, gem); v.set(7, 6, 19, gem);
  v.set(5, 7, 20, shine); v.set(4, 7, 20, shine);
  return v;
}
function clockworkStaff(): Vox {
  const v = fresh();
  const brass = '#b5913a', brassLit = '#d6b25a', brassDark = '#8a6a26', hub = '#6e5320';
  // the shaft, a foot at the bottom and collars up it
  v.box(4, 4, 0, 5, 5, 15, brass);
  v.box(3, 3, 0, 6, 6, 1, brassDark);
  for (const z of [6, 12]) v.box(3, 3, z, 6, 6, z, brassLit);
  v.box(3, 3, 15, 6, 6, 16, brassDark);
  // the little cog at the top, standing face to the light, its teeth round it
  const cx = 4.5, cz = 20.5;
  for (let x = -1; x <= 10; x++) for (let z = 16; z <= 25; z++) {
    const d = Math.hypot(x - cx, z - cz), ang = Math.atan2(z - cz, x - cx);
    const tooth = Math.cos(ang * 8) > 0.35;
    if (d <= 3.2 || (tooth && d <= 4.6)) v.box(x, 4, z, x, 5, z, d <= 1.5 ? hub : d <= 3.2 ? brass : brassLit);
  }
  v.box(4, 6, 20, 5, 6, 21, brassLit);                              // the axle it spins on
  return v;
}

/* 6:2 the Beguiler's box opened, "revealing a single, shining nipple ring. It
   glowed red." The plain piercing, red and lit from within. */
function fireRing(): Vox {
  const red = '#d8302a';
  const v = piercing({ metal: red, bead: twin(red) });
  for (const { p: [x, y, z] } of v.all()) if ((x + z) % 4 === 0 && y === 1) v.set(x, y, z, 'ember');
  v.set(6, 2, 12, 'ember'); v.set(5, 2, 13, 'ember');
  return v;
}

/* 6:11 the Bard's Golden Throat, an "Enchanted Headset Microphone": "This
   golden, amethyst-encrusted microphone", and "Look, there's a purple jewel on
   it." A headband arching over, an earpiece at either end, the boom out of the
   near one to the little microphone in front; amethysts set along the band and
   the purple jewel on the earpiece. */
function goldenThroat(): Vox {
  const v = fresh();
  const gold = '#e0b33a', goldDark = '#b88a22', shine = '#f5d36a', ame = '#9a5cc8', jewel = '#6f34a8', jewelLit = '#c79af0', grille = '#7a5a1c';
  // the band, an arch in the x-z plane
  const cx = 6, a = 6, b = 9;
  for (let x = 0; x <= 12; x++) for (let z = 4; z <= 14; z++) {
    const e = ((x - cx) / a) ** 2 + ((z - 4) / b) ** 2;
    if (e <= 1.08 && e >= 0.58) v.box(x, 3, z, x, 4, z, gold);
  }
  // amethysts along its face
  for (const [x, z] of [[1, 9], [3, 12], [6, 13], [9, 12], [11, 9]] as const) { const y = 5; if (v.has(x, 4, z)) v.set(x, y, z, ame); }
  // the two earpieces
  chamfer(v, -1, 1, 0, 2, 6, 5, 2, gold); chamfer(v, 10, 1, 0, 13, 6, 5, 2, gold);
  v.box(-1, 7, 2, 1, 7, 4, goldDark);
  v.box(11, 2, 2, 11, 5, 4, goldDark);
  // the purple jewel on the near earpiece
  v.box(0, 7, 3, 1, 8, 4, jewel); v.set(0, 8, 4, jewelLit);
  // the boom, forward out of the earpiece and in, and the microphone at its end
  bar(v, [1, 7, 2], [1, 11, 2], gold); bar(v, [1, 11, 2], [5, 13, 2], gold);
  chamfer(v, 5, 12, 1, 7, 14, 3, 1, gold);
  v.set(6, 15, 2, grille); v.set(7, 14, 2, grille);
  v.set(6, 13, 3, shine); v.set(3, 4, 13, shine); v.set(4, 4, 13, shine);
  for (const [x, y, z] of [[2, 11, 2], [4, 12, 2]] as const) v.set(x, y + 1, z, ame);
  return v;
}

/* 6:71 the Eye of the Bedlam Bride, tattooed "right into the center of my chest,
   just above my sternum", with the ink Shi Maria brewed, "bubbling, black liquid";
   "It wasn't a big image." "the eye blinked, and then it closed, completely
   disappearing against my skin." Drawn open, on a patch of the skin it is in,
   black ink and nothing else. */
const EYE = [
  '.............',
  '.....kkk.....',
  '...kk...kk...',
  '..k..kkk..k..',
  '.k..kkkkk..k.',
  'k...kk.kk...k',
  '.k..kkkkk..k.',
  '..k..kkk..k..',
  '...kk...kk...',
  '.....kkk.....',
  '.............',
];
function bedlamEye(): Vox {
  const v = fresh();
  const skin = '#e3a77c', edge = twin('#e3a77c'), ink = '#1d1a1e';
  const W = 14, H = 12, cx = W / 2, cz = H / 2;
  for (let x = 0; x <= W; x++) for (let z = 0; z <= H; z++) {
    const e = ((x - cx) / (cx + 0.3)) ** 2 + ((z - cz) / (cz + 0.3)) ** 2;
    if (e <= 1) { v.set(x, 0, z, edge); v.set(x, 1, z, e > 0.8 ? edge : skin); }
  }
  face(v, 1, 1, 1, EYE, c => (c === 'k' ? ink : null));
  return v;
}

/* 6:2 "The book was thick, like a dictionary, with a bumpy, leather cover. It was
   chained shut with a lock, and it bounced around on its own. Purple wisps of
   smoke came off it." A thick tome on its back, the chain across both ways and
   down its sides to a padlock on the front edge, the smoke rising. The leather,
   the chain and the lock are never coloured, so they are plain. */
function chainedTome(): Vox {
  const v = fresh();
  const leather = '#5b3a26', bump = '#6f4a31', pages = '#e3d7b8', spine = twin('#5b3a26'), chain = '#8c939b', link = '#b3b9c1', lock = '#a4abb6', hole = '#2a2622';
  const smoke = '#9b6fd0', smoke2 = '#7d4fb5';
  v.box(0, 0, 0, 11, 13, 0, leather);
  v.box(0, 1, 1, 10, 12, 6, pages);
  v.box(11, 0, 1, 11, 13, 6, spine);
  v.box(0, 0, 7, 11, 13, 7, leather);
  // the bumps in the leather
  for (const [x, y] of [[2, 2], [5, 3], [8, 2], [3, 6], [7, 7], [9, 5], [2, 10], [5, 11], [9, 10], [4, 8]] as const) v.set(x, y, 8, bump);
  // the chain, both ways round, links alternating, proud of the book
  for (let y = 0; y <= 13; y++) v.set(5, y, 8, y % 2 ? link : chain);
  for (let x = 0; x <= 11; x++) v.set(x, 7, 8, x % 2 ? link : chain);
  for (let z = 0; z <= 7; z++) { v.set(5, 14, z, z % 2 ? link : chain); v.set(12, 7, z, z % 2 ? link : chain); }
  // the padlock where the chain comes down the front
  v.box(4, 15, 2, 6, 15, 4, lock); v.box(4, 16, 2, 6, 16, 4, lock); v.set(5, 17, 3, hole);
  v.set(4, 15, 5, chain); v.set(6, 15, 5, chain); v.set(5, 15, 6, chain);
  // the purple smoke coming off it
  for (const [x, y, z, m] of [[2, 4, 10, smoke], [2, 5, 11, smoke2], [1, 5, 12, smoke], [8, 9, 10, smoke2], [9, 9, 11, smoke], [9, 10, 13, smoke2], [5, 2, 11, smoke], [6, 2, 13, smoke2], [10, 3, 10, smoke]] as const) v.set(x, y, z, m);
  return v;
}

/* 6:49 the Wand of Nighty-Night: "a simple, gnarled wooden wand". A plain wooden
   wand, thicker at the end it is held by, kinked and knotted along its length. */
function nightyWand(): Vox {
  const v = fresh();
  const wood = '#7a5032', grain = twin('#7a5032'), knot = '#5a3a22';
  const pts: P[] = [[0, 8, 0], [2, 7, 3], [3, 6, 5], [5, 5, 7], [5, 4, 10], [7, 3, 12], [8, 2, 15], [10, 1, 17]];
  for (let i = 0; i < pts.length - 1; i++) bar(v, pts[i], pts[i + 1], j => ((i + j) % 2 ? wood : grain));
  // thicker at the handle
  for (const [x, y, z] of [[1, 8, 0], [0, 7, 1], [1, 7, 1], [2, 8, 2], [1, 8, 2], [3, 7, 4], [2, 6, 3]] as const) v.set(x, y, z, wood);
  for (const [x, y, z] of [[3, 7, 5], [6, 5, 9], [6, 4, 11], [8, 3, 14]] as const) v.set(x, y, z, knot);
  return v;
}

/* 6:25 Liquid Therapy, "a protection potion" Mordecai brews. Nothing else is
   said of how it looks, so it is the plain potion. */
const liquidTherapy = () => potion();

export const ITEMS_B6B: Record<string, Record<string, () => Vox>> = {
  'hobbled': { face: hobbled },
  'hole-in-the-bag': { back: () => cardBack() },
  'lamp-card': { back: () => cardBack() },
  'time-extend': { back: () => cardBack(), common: () => cardBack('#3f9a4a') },
  'thief-card': { mythic: () => cardBack('#1b1a1f') },
  'midnight-express': { wrestlers: midnightExpress },
  'liquid-therapy': { plain: liquidTherapy },
  'harley-davidson-electra-glide': { carousel: () => harley(false), neglected: () => harley(true) },
  'peace-symbol-patch': { printed: peacePatch },
  'valtay-perso-shield': { button: persoShield },
  'velma': { apparatus: () => velma(false), leaking: () => velma(true) },
  'sentient-necro-staff': { necro: necroStaff, clockwork: clockworkStaff },
  'nipple-ring-of-superior-fire-demons-hand-maiden': { glowing: fireRing },
  'bards-golden-throat': { headset: goldenThroat },
  'eye-of-the-bedlam-bride': { inked: bedlamEye },
  'tome-of-legionnaires-of-the-damned': { chained: chainedTome },
  'wand-of-nighty-night': { gnarled: nightyWand },
};
