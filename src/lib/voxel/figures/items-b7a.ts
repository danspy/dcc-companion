import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { lathe, chamfer } from './itemparts.ts';
import { potion, tome, ring } from './itemforms.ts';

/* ---- items, set b7a (books 6 to 8) ----
   Drawn like the anchor set in items.ts: one object, floating, three-quarter
   view, smooth (chunk 0), facing +y (the lit left face), z up. Each look from
   the edition's own description at its point; a colour the book leaves unsaid
   is a plain one. Shapes and colours only. */

const fresh = () => { const v = new Vox(); v.chunk = 0; return v; };

/** a block standing in the x-z plane with its corners cut back: a panel seen face on (null carves) */
function panel(v: Vox, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, cut: number, m: string | null) {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const dx = Math.min(x - x0, x1 - x), dz = Math.min(z - z0, z1 - z);
    if (dx + dz >= cut) for (let y = y0; y <= y1; y++) v.set(x, y, z, m);
  }
}
/** rows of characters drawn onto the face at y, top row first, from (x0, z0 + rows - 1) */
function face(v: Vox, x0: number, y: number, z0: number, rows: string[], pick: (c: string) => string | null) {
  rows.forEach((row, j) => [...row].forEach((c, i) => { const m = pick(c); if (m) v.set(x0 + i, y, z0 + rows.length - 1 - j, m); }));
}
/** a round solid from chamfered layers, [inset, cut] per layer from the bottom up, `n` across */
function rounded(v: Vox, x0: number, y0: number, z0: number, n: number, rows: [number, number][], m: (x: number, y: number, z: number) => string | null) {
  rows.forEach(([inset, cut], k) => {
    for (let x = x0 + inset; x < x0 + n - inset; x++) for (let y = y0 + inset; y < y0 + n - inset; y++) {
      const dx = Math.min(x - x0 - inset, x0 + n - 1 - inset - x), dy = Math.min(y - y0 - inset, y0 + n - 1 - inset - y);
      if (dx + dy >= cut) { const c = m(x, y, z0 + k); if (c) v.set(x, y, z0 + k, c); }
    }
  });
}
/** a voxel whose six neighbours are all set: inside the solid, not on its skin */
const enclosed = (v: Vox, x: number, y: number, z: number) =>
  [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].every(([a, b, c]) => v.has(x + a, y + b, z + c));

/* ---- annie, the skull-headed totem ----
   6:67 "The totem was a large, cat-sized raven, but its head was a skull of an
   infant human. The skull was punctuated with little holes filled with teeth."
   The bird itself, side on to the light, its head to the front. */
const RAVEN = '#302d38', WING = '#3f3b4a', TAIL = '#26242c', SKULL = '#e7ddc6', SKULL2 = '#d6cbb2', HOLE = '#2a2420', TOOTH = '#fbf7ee', LEG = '#55525c';
function annieBird(): Vox {
  const v = fresh();
  // the body, a raven's, sitting up, its folded wings along either side and their tips crossing behind
  chamfer(v, 2, 2, 3, 7, 8, 9, 2, RAVEN);
  for (const x of [1, 8]) { v.box(x, 2, 4, x, 7, 8, WING); v.box(x, 1, 3, x, 1, 5, WING); v.set(x, 0, 3, WING); }
  // the tail, sloping out and down behind
  v.box(3, 1, 3, 6, 1, 4, TAIL); v.box(3, 0, 2, 6, 0, 3, TAIL); v.box(4, -1, 2, 5, -2, 2, TAIL); v.box(4, -1, 3, 5, -1, 3, TAIL);
  // the legs and their toes
  for (const x of [3, 6]) { v.box(x, 6, 0, x, 6, 2, LEG); v.box(x, 7, 0, x, 8, 0, LEG); v.set(x, 5, 0, LEG); }
  // the head: a baby's skull, a big round crown over a small face, set forward on the body
  rounded(v, 1, 5, 9, 8, [[2, 1], [1, 2], [0, 3], [0, 3], [0, 3], [1, 2]], () => SKULL);
  v.box(2, 13, 9, 7, 13, 11, SKULL2);                                   // the face, a little proud
  v.box(2, 13, 10, 3, 13, 11, HOLE); v.box(6, 13, 10, 7, 13, 11, HOLE);   // the sockets
  v.set(4, 13, 9, HOLE); v.set(5, 13, 9, HOLE);                         // the nose
  // the little holes, each with a tooth in it: along the jaw, down the side and over the crown
  for (const [x, y, z, t] of [[2, 13, 8, 0], [3, 13, 8, 1], [4, 13, 8, 0], [5, 13, 8, 1], [6, 13, 8, 0], [7, 13, 8, 1],
    [8, 10, 10, 0], [8, 9, 10, 1], [8, 8, 11, 1], [8, 9, 11, 0], [3, 9, 14, 0], [4, 9, 14, 1], [6, 8, 14, 1], [6, 9, 14, 0]] as const) if (v.has(x, y, z) || y === 13) v.set(x, y, z, t ? TOOTH : HOLE);
  v.box(3, 12, 8, 6, 12, 8, SKULL2);                                    // the jaw under the teeth
  return v;
}
/* 7:87 "Katia's card from the previous floor. The one depicting Annie the
   skull-headed bird": a card of the game, "a large, rectangular card, just
   about the size of a postcard. It was rigid" (6:4). Standing, the picture to
   the light; the back's logo is never drawn in words, so the back is plain. */
const TOTEM_CARD = [
  '...sss...',
  '..sssss..',
  '..sksks..',
  '..sssss..',
  '...tst...',
  'w..bbb..w',
  'ww.bbb.ww',
  'wwwbbbwww',
  '.wwbbbww.',
  '..bbbbb..',
  '...bbb...',
  '..b.b.b..',
  '...l.l...',
  '..l...l..',
];
function annieCard(): Vox {
  const v = fresh();
  const paper = '#e8e2d2', border = '#3a3f55';
  for (let x = 0; x <= 10; x++) for (let z = 0; z <= 16; z++) {
    if ((x === 0 || x === 10) && (z === 0 || z === 16)) continue;
    v.set(x, 1, z, x === 0 || x === 10 || z === 0 || z === 16 ? border : paper);
    v.set(x, 0, z, border);
  }
  face(v, 1, 1, 2, TOTEM_CARD, c => ({ s: SKULL, k: HOLE, t: TOOTH, b: RAVEN, w: WING, l: LEG } as Record<string, string>)[c] ?? null);
  return v;
}

/* ---- the princess's banquet ----
   7:85 "I GOT A BOOK ... IT'S FILLED WITH PICTURES": a book, its cover never
   described. The plain tome. */
const banquetBook = () => tome();

/* ---- the book of boom ----
   7:85 "I pulled the second, heavy book from my inventory", one of "about 500
   pages". Its cover is never described: the plain tome, its page block deeper. */
function bookOfBoom(): Vox {
  const v = fresh();
  const cover = '#5b3a26', pages = '#e3d7b8', spine = twin(cover);
  v.box(0, 0, 0, 11, 13, 0, cover);
  v.box(0, 1, 1, 10, 12, 7, pages);
  v.box(11, 0, 1, 11, 13, 7, spine);
  v.box(0, 0, 8, 11, 13, 8, cover);
  for (const z of [2, 4, 6]) v.box(0, 12, z, 9, 12, z, '#d6c9a6');      // the edges of the pages, a few shades
  return v;
}

/* ---- the cape of odds ----
   7:57 "Zhang's new cape fluttered behind him. It was white with the standard
   black, blue, red, and yellow circles of an archery target on it", "the target
   on the back" (7:56). Hung from its collar and seen from behind, the target to
   the light, the sides wrapping round where the shoulders would be. */
function capeOfOdds(): Vox {
  const v = fresh();
  const white = '#ecebe5', shade = '#d8d7cf', black = '#25232a', blue = '#2c5cb8', red = '#c9302a', gold = '#f2c12e', collar = '#c9c7be', clasp = '#a4abb6';
  const cx = 7, cz = 7, H = 17;
  for (let z = 0; z <= H; z++) {
    // narrow at the collar, falling wider to the hem, and flaring out behind him as it flutters
    const half = z >= 14 ? 3 + Math.round((H - z) * 0.7) : z >= 9 ? 5 + Math.round((13 - z) * 0.4) : 7;
    const out = z <= 3 ? 2 : z <= 8 ? 1 : 0;
    for (let x = cx - half; x <= cx + half; x++) {
      const fold = (x - cx + 9) % 4 === 0;
      if (z === 0 && fold) continue;                                    // the hem, falling in soft folds
      const u = Math.abs(x - cx) / half, back = u > 0.9 ? 2 : u > 0.65 ? 1 : 0;
      const y = out + 1 - back;
      const d = Math.hypot(x - cx, z - cz);
      const ring = d <= 1.5 ? gold : d <= 2.9 ? red : d <= 4.3 ? blue : d <= 5.7 ? black : null;
      const m = z >= H - 1 ? collar : ring ?? (back || (fold && z <= 6) ? shade : white);
      v.set(x, y, z, m); v.set(x, y - 1, z, back ? shade : white);
    }
  }
  v.set(cx, 2, H, clasp); v.set(cx, 2, H - 1, clasp);                    // the clasp at the collar
  return v;
}

/* ---- the purple charging pillow ----
   7:3 "another charging pillow. It was almost identical to the one that'd come
   with the tiara", that one "a red, fluffy pillow" that felt "as if was made of
   velvet"; "This one was purple instead of red." The tiara's cushion, purple. */
function purplePillow(): Vox {
  const v = fresh();
  const velvet = '#7a3aa8', plush = twin('#7a3aa8');
  chamfer(v, 1, 1, 0, 11, 11, 0, 3, velvet);
  chamfer(v, 0, 0, 1, 12, 12, 2, 3, velvet);
  chamfer(v, 2, 2, 3, 10, 10, 3, 3, plush);
  chamfer(v, 4, 4, 4, 8, 8, 4, 2, plush);
  return v;
}

/* ---- the cloak of the benevolent champion ----
   7:3 "the long, glowing cloak", "made of a silky fabric that was black on one
   side and blue on the other, almost like a magician's cape. But unlike regular
   capes, it had short arms also, which made it more robe-like, though there was
   no vest part"; "The whole cloak glowed with a soft, white light." Hung up and
   seen from the front, open down the middle so the blue side shows inside and
   where the edges turn back, the short arms out at the shoulders, a pale haze
   round all of it for the glow. */
function championCloak(): Vox {
  const v = fresh();
  const black = '#2a2830', sheen = '#3b3845', blue = '#3063c4', blueDark = twin('#3063c4');
  const cx = 6, top = 17;
  // narrow at the neck, out over the shoulders, then falling long and a little wider to the hem
  const half = (z: number) => (z >= 16 ? 2 : z >= 14 ? 4 : z <= 3 ? 6 : 5);
  for (let z = 0; z <= top; z++) {
    const h = half(z);
    // the fronts hang open down the middle below the collar, their edges turned back to the blue
    const gap = z >= 15 ? -1 : z >= 12 ? 0 : z >= 6 ? 1 : 2;
    for (let x = cx - h; x <= cx + h; x++) {
      v.set(x, 0, z, blueDark);                                          // the back, its blue side facing in
      if (x === cx - h || x === cx + h) v.box(x, 1, z, x, 2, z, black);  // the sides, wrapping forward
      const off = Math.abs(x - cx);
      if (off > gap) v.set(x, 3, z, off === gap + 1 && z < 15 ? blue : (x + z) % 5 === 0 ? sheen : black);
    }
  }
  v.box(cx - 2, 1, 0, cx + 2, 2, 14, blueDark);                          // the inside, seen down the opening
  v.box(cx - 2, 0, top + 1, cx + 2, 3, top + 1, blue);                   // the collar, turned down
  // the short arms, out from the shoulders and hanging a little, their cuffs turned back to the blue
  for (const s of [-1, 1]) {
    const x0 = cx + s * 5;
    v.box(x0, 1, 11, x0 + s, 3, 14, black);
    v.box(x0 + s * 2, 1, 10, x0 + s * 2, 3, 13, black);
    v.box(x0 + s * 2, 1, 9, x0 + s * 2, 3, 9, blue);
  }
  // the glow: a soft, pale haze round its edges (never over the faces that show, which it would grey)
  const shell: [number, number, number][] = [];
  for (const { p: [x, y, z] } of v.all()) for (const [a, b, c] of [[-1, 0, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    if (c === 1 && z < top + 1 && Math.abs(x - cx) > 2) continue;
    if (!v.has(x + a, y + b, z + c)) shell.push([x + a, y + b, z + c]);
  }
  for (const [x, y, z] of shell) v.set(x, y, z, 'mist');
  return v;
}

/* ---- the aura potion ----
   7:50 "I pulled one of the yellow, bubbling potions"; "He popped the cork".
   The plain potion, yellow, bubbles rising through it. */
function auraPotion(): Vox {
  const v = potion({ liquid: '#e9c62a' });
  const bubble = '#fff1a6';
  for (const [x, y, z] of [[4, 8, 2], [6, 8, 4], [3, 7, 5], [5, 8, 6], [7, 7, 3], [8, 6, 6], [4, 5, 7], [6, 6, 7]] as const) v.set(x, y, z, bubble);
  v.set(5, 6, 8, bubble); v.set(4, 5, 9, bubble);
  return v;
}

/* ---- the ghillie suit ----
   7:2 "the small, cat-sized ghillie suit", "made of long, shredded bits of
   color-changing fabric that blended into the background"; "like one of
   Signet's tattoo people fell through a paper shredder. If I put that on, I'll
   look like a tassel." Laid out, a cat-sized shaggy coat with a hood at the
   front, strips hanging from it all round like a tassel. It changes colour to
   blend in, so it is in the plain greens and browns of a camouflage suit, a
   strip at a time. */
const CAMO = ['#5a6a3a', '#6e5d3b', '#7f7b4e', '#465234', '#8a7a52', '#5e5236'];
function ghillieSuit(): Vox {
  const v = fresh();
  const hash = (x: number, y: number) => (((x + 7) * 73856093) ^ ((y + 7) * 19349663)) >>> 0;
  const strip = (n: number) => CAMO[n % CAMO.length];
  const W = 10, L = 12;
  for (let x = 0; x <= W; x++) for (let y = 0; y <= L; y++) {
    const dx = Math.min(x, W - x), dy = Math.min(y, L - y);
    if (dx + dy < 2) continue;
    const top = 6 + (dx >= 1 ? 1 : 0) + (dx >= 3 && dy >= 2 ? 1 : 0);
    const edge = dx === 0 || dy === 0 || dx + dy === 2;
    if (edge) {
      // a strip hanging from the edge, one colour down its length, frayed out at its end
      const h = hash(x, y), low = 1 + (h % 3), m = strip(h >> 3);
      v.box(x, y, low, x, y, top, m);
      if (h % 5 < 2) v.set(x + (x === 0 ? -1 : x === W ? 1 : 0), y + (y === 0 ? -1 : y === L ? 1 : 0), low, m);
    } else v.box(x, y, 5, x, y, top, strip(x * 3 + (y >> 2)));          // the back: strips laid along it
  }
  // the hood at the front, shaggy too, open toward the light
  chamfer(v, 2, 9, 8, 8, 13, 11, 2, strip(3));
  for (let x = 2; x <= 8; x++) for (let z = 8; z <= 11; z++) if (v.has(x, 13, z)) v.set(x, 13, z, strip(x + 1));
  v.box(4, 12, 9, 6, 13, 10, '#2c3020');
  for (const [x, z] of [[3, 12], [5, 12], [7, 12], [2, 11], [8, 11]] as const) v.set(x, 12, z, strip(x + z));
  // loose ends lying over the back
  for (const [x, y, c] of [[3, 3, 0], [6, 5, 3], [4, 7, 1], [7, 2, 4], [5, 1, 2], [2, 6, 5]] as const) v.set(x, y, 9, CAMO[c]);
  return v;
}

/* ---- the dog tattoo ----
   7:74 "Donut now had a small, round bald patch on her right flank." 7:75 "It
   was a simple, rather adorable line art tattoo of a dog", on "her mottled
   skin"; "It lifted its leg and started to lick itself", "its leg up in the
   air". Over it Milk's Words of Power, black ink, then purple: "The letters
   started to glow with blue light". The patch itself, ringed by her fur, the
   dog in a plain dark ink with its hind leg up in the air, and the letters a
   ring of bright blue and purple round it (bright, but not burning: the site's
   glow is a fire's). 8:9 "the shaved patch of skin with the tattoo of the dog
   licking itself": the letters are not spoken of again. */
const DOG = [
  '..........#.',
  '.#.......##.',
  '###.....##..',
  '#o###..##...',
  '.#########..',
  '.#########..',
  '.#.#....#...',
  '.#.#....#...',
  '.#.#....##..',
];
function dogTattoo(lettered: boolean): Vox {
  const v = fresh();
  const skin = '#cfa99c', mottle = '#b08a80', ink = '#1f1b1d', gap = '#dcbcb1', choc = '#6a4630', ginger = '#cf8038';
  const c = 7.5;
  for (let x = 0; x <= 15; x++) for (let z = 0; z <= 15; z++) {
    const d = Math.hypot(x - c, z - c);
    if (d > 7.9) continue;
    // the bare skin, mottled, and round it a rim of her coat, ginger and brown on this flank
    const a = Math.atan2(z - c, x - c);
    const m = d <= 6.9 ? ((x * 5 + z * 3) % 17 === 0 ? mottle : skin) : a < -0.6 || a > 2.4 ? ginger : choc;
    v.set(x, 1, z, m); v.set(x, 0, z, d <= 6.9 ? choc : twin(m));
  }
  face(v, 2, 1, 3, DOG, ch => (ch === '#' ? ink : ch === 'o' ? gap : null));
  // the words of power, a ring of glowing script round the dog, blue and the later purple
  if (lettered) for (let x = 0; x <= 15; x++) for (let z = 0; z <= 15; z++) {
    const d = Math.hypot(x - c, z - c), a = Math.atan2(z - c, x - c), k = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 30);
    if (d > 5.6 && d <= 6.9 && k % 3 !== 2 && v.get(x, 1, z) !== ink) v.set(x, 1, z, k % 7 < 2 ? '#a468e4' : '#6cc6ff');
  }
  return v;
}

/* ---- the boonie hat ----
   7:2 "I'm not a huge fan of beige-colored items as a rule, but it is extra
   floppy"; "We call those boonie hats ... It's what snipers wear." A round
   crown with a band, the wide brim drooping in waves all round. */
function boonieHat(): Vox {
  const v = fresh();
  const beige = '#cbb68b', fold = '#b8a379', band = '#a99368';
  const c = 7;
  // the brim, wide and floppy: it sags lower in four soft waves round its edge
  for (let x = 0; x <= 14; x++) for (let y = 0; y <= 14; y++) {
    const d = Math.hypot(x - c, y - c); if (d > 7.4) continue;
    const a = Math.atan2(y - c, x - c), wave = Math.sin(a * 2 + 0.7);
    const sag = d > 6.2 ? (wave > -0.2 ? 1 : 0) + (wave > 0.6 ? 1 : 0) : d > 5 && wave > 0.6 ? 1 : 0;
    v.set(x, y, 3 - sag, sag ? fold : beige);
  }
  // the crown, its band at the foot
  lathe(v, c, c, 4, 8, z => (z <= 7 ? 3.9 : 3.2), (_x, _y, z) => (z === 4 ? band : beige));
  lathe(v, c, c, 9, 9, () => 2.2, () => fold);
  return v;
}

/* ---- the beefmaster's hairbrush ----
   7:56 "The hairbrush appeared floating in the air ... Unlike Donut's magical
   hairbrush, which looked like a regular hairbrush, this one was made of
   shining gold with a jeweled handle." The paddle brush of Donut's drawn in
   gold, a row of jewels set down its handle. The jewels' colour is never
   given: a plain clear stone. */
function beefmasterBrush(): Vox {
  const v = fresh();
  const gold = '#e0aa34', shine = '#f8dc7c', deep = '#b98424', pin = '#efe6cc', knob = '#fff8e4', gem = '#d4e9f6', gemDark = '#9fbdd2';
  chamfer(v, 3, 0, 0, 5, 2, 9, 1, gold);                          // the handle
  v.box(3, 0, 0, 5, 2, 0, deep);
  for (const z of [2, 5, 8]) { v.set(4, 3, z, gem); v.set(4, 3, z + 1, gemDark); v.set(3, 3, z, deep); v.set(5, 3, z, deep); }   // its jewels, each in a setting
  panel(v, 0, 0, 10, 8, 2, 20, 3, gold);                          // the paddle
  panel(v, 1, 3, 11, 7, 3, 19, 3, deep);                          // the cushion
  for (let x = 1; x <= 7; x++) for (let z = 11; z <= 19; z++) {
    if ((x + z) % 2 || !v.has(x, 3, z)) continue;
    v.set(x, 4, z, pin); v.set(x, 5, z, knob);
  }
  // it shines: light along the paddle's rim and down the handle
  for (const [x, y, z] of [[3, 2, 20], [4, 2, 20], [5, 2, 20], [1, 2, 18], [0, 2, 14], [0, 2, 13], [3, 2, 7], [3, 2, 6], [3, 2, 4]] as const) if (v.has(x, y, z)) v.set(x, y, z, shine);
  return v;
}

/* ---- the kneepads of the goddess ----
   7:56 "These are knee pads. They are literally made of the eyelashes of the
   sea goddess Kina", a "sea-urchin-like" goddess, and "Spiked"; Carl's own
   spiked knee pads and these "even look similar". One pad of the pair, built
   like his: a sleeve for the leg and a cap over the knee to the light, here
   all of it lashes, which bristle off the cap like an urchin's spines. No
   colour is given: a plain dark lash. */
function kinaKneepad(): Vox {
  const v = fresh();
  const lash = '#4b4048', line = '#3a3138', inner = '#241e23', cap = '#5a4d56', spine = '#6c5e68', tip = '#cdbfc6';
  // the sleeve, open top and bottom, woven of lashes running round it
  chamfer(v, 0, 0, 0, 8, 6, 8, 2, lash);
  v.clear(2, 1, 0, 6, 4, 8);
  v.box(2, 1, 1, 6, 4, 1, inner);
  for (const z of [1, 3, 5, 7]) for (let x = 0; x <= 8; x++) for (let y = 0; y <= 6; y++) if (v.get(x, y, z) === lash) v.set(x, y, z, line);
  // the cap over the knee: a dome standing off the front
  chamfer(v, 1, 7, 1, 7, 7, 7, 0, cap);
  v.clear(1, 7, 1, 1, 7, 1); v.clear(7, 7, 1, 7, 7, 1); v.clear(1, 7, 7, 1, 7, 7); v.clear(7, 7, 7, 7, 7, 7);
  panel(v, 2, 8, 2, 6, 8, 6, 2, cap);
  // the spines: long lashes bristling out of the cap, each along the dome's own slope
  const spike = (x: number, y: number, z: number, n: number) => {
    const dx = (x - 4) * 0.5, dz = (z - 4) * 0.5, len = Math.hypot(dx, 1, dz);
    for (let i = 1; i <= n; i++) v.set(Math.round(x + (dx / len) * i * 1.2), Math.round(y + (1 / len) * i), Math.round(z + (dz / len) * i * 1.2), i === n ? tip : spine);
  };
  for (const [x, z] of [[2, 2], [4, 2], [6, 2], [2, 4], [6, 4], [2, 6], [4, 6], [6, 6], [3, 3], [5, 5], [3, 5], [5, 3]] as const) {
    const y = v.has(x, 8, z) ? 8 : 7;
    spike(x, y, z, x === 4 || z === 4 ? 5 : 4);
  }
  spike(4, 8, 4, 6);
  // and a few short ones off the sleeve's rim
  for (const [x, y] of [[0, 3], [8, 3], [4, 0]] as const) v.set(x + (x === 0 ? -1 : x === 8 ? 1 : 0), y - (y === 0 ? 1 : 0), 9, spine);
  return v;
}

/* ---- the toe ring ----
   7:4 "a simple, silver, unadorned toe ring", "dainty". The plain ring, silver. */
const toeRing = () => ring({ metal: '#c6cbd3', size: 4.8 });

/* ---- the engine of tomorrow ----
   7:57 "His new eye, which at the moment was a swirling orb of black": a round
   eye from chamfered layers, black, the swirl a few darker-and-lighter runs
   across its faces. "When it was working, the black changed to look like a
   miniature, clockwork engine, all contained in the round eye"; 8:61 "The
   other, mechanical eye twitched, clockwork gears spinning." Working, the same
   round eye is clockwork: a gear on each face, in a plain metal. */
const ORB: [number, number][] = [[4, 1], [2, 2], [1, 3], [0, 3], [0, 3], [0, 3], [0, 3], [0, 3], [1, 3], [2, 2], [4, 1]];
function engineEye(working: boolean): Vox {
  const v = fresh();
  const black = '#1f1d27', swirl = '#4c4566', swirl2 = '#332f44', glint = '#8a85a6';
  const steel = '#b7bdc7', steelLit = '#dde1e7', steelDark = '#858c98', works = '#353941', axle = '#1c1f24';
  rounded(v, 0, 0, 0, 11, ORB, () => (working ? works : black));
  if (!working) {
    // the swirl: runs of a lighter black wound round the middle of each face
    const facing = (x: number, y: number, z: number): [number, number, number] | null =>
      !v.has(x, y + 1, z) ? [0, x - 5, z - 5] : !v.has(x, y, z + 1) ? [1, x - 5, y - 5] : !v.has(x + 1, y, z) ? [2, y - 5, z - 5] : null;
    for (const { p: [x, y, z] } of [...v.all()]) {
      const f = facing(x, y, z); if (!f) continue;
      const [k, u, w] = f, r = Math.hypot(u, w), a = Math.atan2(w, u), sw = Math.sin(a * 2 + r * 1.3 + k * 2);
      v.set(x, y, z, sw > 0.5 ? swirl : sw > 0 ? swirl2 : black);
    }
    for (const [x, y, z] of [[3, 10, 7], [3, 10, 6], [4, 10, 8]] as const) if (v.has(x, y, z)) v.set(x, y, z, glint);
    return v;
  }
  // working: the eye is clockwork, a gear standing proud of each face over the dark works
  const gear = (put: (u: number, w: number, m: string) => void, R: number, n: number) => {
    for (let u = -5; u <= 5; u++) for (let w = -5; w <= 5; w++) {
      const r = Math.hypot(u, w), a = Math.atan2(w, u);
      const tooth = r > R && r <= R + 1.1 && Math.floor(((a + Math.PI) / (Math.PI * 2)) * n * 2) % 2 === 0;
      if (r <= 0.8) put(u, w, axle);
      else if (r <= R) { if (!(r > 1.4 && r < R - 0.9 && Math.abs(Math.sin(a * 2)) > 0.72)) put(u, w, u + w < -1.5 ? steelLit : steel); }
      else if (tooth) put(u, w, steelDark);
    }
  };
  gear((u, w, m) => v.set(5 + u, 11, 5 + w, m), 3.2, 6);            // the big one, to the light
  gear((u, w, m) => v.set(4 + u, 4 + w, 11, m), 2.1, 5);            // a smaller one on top, off to the back
  gear((u, w, m) => v.set(11, 6 + u, 6 + w, m), 1.9, 5);            // and one on the far side
  return v;
}

/* ---- the mini tactical nuke ----
   7:80 a sentry dog "the size of a goddamn lion, and the back half of the dog
   had a massive, glowing bomb notification over it"; "the dog turned to a ball
   of ice"; "I picked up the block of ice ... It burned, but to my relief, it
   allowed me to pull it all into my inventory". 7:83 "I actually had one, too,
   still attached to one of the dogs." What sits in the inventory: a block of
   ice gone round at the corners, the dog frozen inside it. The robot dog and
   its bomb are never described, so the dog is a plain metal one and the bomb
   is not drawn apart from it. */
function frozenNuke(): Vox {
  const v = fresh();
  const metal = '#8d959f', joint = '#5f6670', visor = '#2b2f36';
  // the dog, mid-skid, its head to the front
  v.box(4, 3, 4, 8, 8, 7, metal);                                  // the body
  v.box(4, 8, 6, 8, 11, 9, metal);                                 // the head
  v.box(5, 12, 6, 7, 13, 7, metal);                                // the snout
  v.box(4, 11, 8, 8, 11, 8, visor);
  for (const x of [4, 8]) v.box(x, 9, 10, x, 10, 11, metal);       // the ears
  for (const [x, y] of [[4, 3], [7, 3], [4, 7], [7, 7]] as const) { v.box(x, y, 1, x + 1, y + 1, 3, joint); }
  v.box(6, 1, 7, 6, 2, 8, joint);                                  // the tail
  // the ice: a block with its corners worn round, set wherever the dog is not
  rounded(v, 0, -1, 0, 13, [[2, 3], [1, 4], [0, 5], [0, 5], [0, 5], [0, 5], [0, 5], [0, 5], [0, 5], [0, 5], [1, 4], [2, 3]], (x, y, z) => (v.has(x, y, z) ? null : 'glass'));
  // and the same reaching a little further toward the front, where the snout is
  for (let x = 3; x <= 9; x++) for (let z = 3; z <= 9; z++) if (!v.has(x, 12, z)) v.set(x, 12, z, 'glass');
  for (let x = 4; x <= 8; x++) for (let z = 4; z <= 8; z++) if (!v.has(x, 13, z)) v.set(x, 13, z, 'glass');
  // frost where the ice turns
  for (const [x, y, z] of [[1, 11, 9], [2, 11, 10], [12, 2, 8], [12, 3, 9], [6, 11, 11], [7, 10, 11], [3, 0, 2], [0, 6, 4]] as const) if (v.get(x, y, z) === 'glass') v.set(x, y, z, 'domeRim');
  return v;
}

/* ---- the potion of conscription ----
   7:48 "I pulled the potion of Conscription back into my inventory": a potion,
   no more, so the plain one. 7:71 the hell-kissed one: "The large, warm bottle
   was in the shape of a demonic head with no eyes and with multiple tentacles
   coming off it. The tentacles waved back and forth, despite the whole thing
   being made of glass"; "the eyeless face started to scream. Several mouths
   upon the tentacles also began to scream. Within, a purple, bubbling potion
   roiled". A glass head, its face to the light with a brow and no eyes and
   its mouth wide, tentacles hanging off its jaw with a mouth at each tip, the
   purple inside it. A potion is corked, so it is too. */
const plainConscription = () => potion();
function hellKissed(): Vox {
  const v = fresh();
  const purple = '#7b2fb3', deep = '#3a1060', bubble = '#c48ce8', cork = '#b08758';
  // the head: wide at the crown, narrowing to the jaw
  rounded(v, 0, 0, 5, 11, [[3, 1], [2, 2], [1, 3], [1, 3], [0, 4], [0, 4], [0, 4], [0, 4], [0, 4], [1, 3], [2, 2]], () => 'glass');
  v.box(2, 11, 11, 8, 11, 12, 'glass');                            // the heavy brow, where eyes would be
  v.box(4, 11, 13, 6, 11, 13, 'glass');
  for (const { p: [x, y, z] } of [...v.all()]) if (enclosed(v, x, y, z)) v.set(x, y, z, purple);
  // the screaming mouth: the face pushed in, its glass lining a dark hole
  v.clear(3, 10, 6, 7, 10, 9); v.box(3, 9, 6, 7, 9, 9, 'glass'); v.box(3, 8, 6, 7, 8, 9, deep);
  v.box(4, 10, 5, 6, 10, 5, 'glass');
  // the bubbling, just under the skin
  for (const [x, y, z] of [[2, 9, 10], [8, 9, 11], [9, 7, 9], [9, 3, 12], [6, 3, 14], [3, 6, 14], [9, 5, 7], [1, 7, 12]] as const) if (v.get(x, y, z) === purple) v.set(x, y, z, bubble);
  // the tentacles off the jaw, curling down and out: glass round a purple core, a screaming mouth at each tip
  const arms: [number, number, number][][] = [
    [[2, 8, 5], [1, 9, 4], [0, 10, 3], [0, 10, 2], [1, 11, 1]],
    [[5, 9, 4], [5, 10, 3], [5, 11, 2], [6, 12, 1]],
    [[8, 8, 5], [9, 9, 4], [10, 10, 3], [10, 10, 2], [11, 11, 1]],
    [[9, 3, 5], [10, 3, 4], [11, 2, 3], [11, 2, 2], [11, 3, 1]],
    [[2, 2, 5], [1, 2, 4], [0, 1, 3], [-1, 1, 2]],
  ];
  for (const arm of arms) {
    for (const [x, y, z] of arm) for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (!v.has(x + a, y + b, z) || v.get(x + a, y + b, z) === 'glass') v.set(x + a, y + b, z, a || b ? 'glass' : purple);
    const [x, y, z] = arm[arm.length - 1];
    v.set(x, y, z - 1, deep);
  }
  // the neck on the crown, and its cork
  v.box(4, 4, 16, 6, 6, 16, 'glass'); v.set(5, 5, 16, purple);
  v.box(4, 4, 17, 6, 6, 18, cork);
  return v;
}

export const ITEMS_B7A: Record<string, Record<string, () => Vox>> = {
  'annie-utburdur': { totem: annieBird, card: annieCard },
  'banquet-fit-for-a-princess': { plain: banquetBook },
  'cape-of-odds': { target: capeOfOdds },
  'purple-charging-pillow': { pillow: purplePillow },
  'carls-book-of-boom': { heavy: bookOfBoom },
  'cloak-of-benevolent-champion': { glowing: championCloak },
  'mordecais-aura-potion': { bubbling: auraPotion },
  'donuts-ghillie-suit': { shredded: ghillieSuit },
  'donuts-dog-tattoo': { lettered: () => dogTattoo(true), healed: () => dogTattoo(false) },
  'donuts-boonie-hat': { floppy: boonieHat },
  'hairbrush-of-beefmaster': { gold: beefmasterBrush },
  'spiked-kneepads-of-munificent-goddess-kina': { spiked: kinaKneepad },
  'toe-ring-of-well-balanced': { plain: toeRing },
  'engine-of-tomorrow': { orb: () => engineEye(false), clockwork: () => engineEye(true) },
  'mini-tactical-nuke': { frozen: frozenNuke },
  'potion-of-conscription': { plain: plainConscription, 'hell-kissed': hellKissed },
};
