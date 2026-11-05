import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { lathe, chamfer } from './itemparts.ts';
import { tome, key, piercing } from './itemforms.ts';

/* ---- items, batch b8b (book 8, with a cactus from book 2) ----
   Drawn like the anchor set in items.ts: one object, floating, three-quarter
   view, smooth (chunk 0), facing +y (the lit left face), z up. Each look from
   the edition's own description at its point; a colour the book leaves unsaid
   is a plain one. Shapes and colours only. */

const fresh = () => { const v = new Vox(); v.chunk = 0; return v; };

/** a block standing up in the xz plane with its corners cut back by `cut`: a panel seen face on */
function panel(v: Vox, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, cut: number, m: string | null) {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const dx = Math.min(x - x0, x1 - x), dz = Math.min(z - z0, z1 - z);
    if (dx + dz >= cut) for (let y = y0; y <= y1; y++) v.set(x, y, z, m);
  }
}
/** rows of characters drawn onto the face at y, top row first */
function face(v: Vox, x0: number, y: number, z0: number, rows: string[], pick: (c: string) => string | null) {
  rows.forEach((row, j) => [...row].forEach((c, i) => { const m = pick(c); if (m) v.set(x0 + i, y, z0 + rows.length - 1 - j, m); }));
}

/* ---- the cactus from the earth box ----
   2:5 "a small cactus plant in a clay pot. The short, squat cactus was only
   about three inches tall and was covered in yellow spikes. The pot still had a
   price tag on it." A squat ribbed barrel in a terracotta pot, the tag on its
   front. The plant's own green is the noun's.
   8:61 "The cactus glowed blue": a dread trap cast on it. (This chapter calls
   the pot plastic; its colour is never given, so it stays the pot it was.)
   8:67 "A single flower just bloomed on the cactus", on its top; the flower's
   colour is never given, so a plain pale one. */
type Glow = 'none' | 'blue' | 'bloom';
function cactus(glow: Glow): Vox {
  const v = fresh();
  const clay = '#b0613a', rim = '#97502e', soil = '#4a3020', tag = '#f1ede2', ink = '#7a2f2a';
  const lit = glow !== 'none';
  const green = lit ? '#58b9ef' : '#4f8a3a', groove = lit ? '#3a92d2' : '#3c6e2f', spike = '#e8c84a';
  const c = 5;
  // the pot: a tapered clay tub, a thicker rim, soil showing inside it
  const R = (z: number) => (z === 0 ? 3.3 : z <= 4 ? 3.6 + z * 0.12 : 4.6);
  lathe(v, c, c, 0, 6, R, (x, y, z) => {
    const inside = Math.hypot(x - c, y - c) <= R(z) - 1.1;
    if (z === 6) return inside ? soil : rim;
    return z === 5 ? rim : clay;
  });
  // the price tag, a little white sticker on the front, two lines of ink on it
  v.box(4, 10, 2, 6, 10, 3, tag); v.set(4, 10, 3, ink); v.set(5, 10, 2, ink);
  // the squat barrel, built from chamfered layers, ribbed: grooves at every other eighth of the way round
  const layer = (a: number, b: number, z0: number, z1: number, cut: number) => chamfer(v, a, a, z0, b, b, z1, cut, green);
  layer(2, 8, 7, 7, 2); layer(1, 9, 8, 10, 3); layer(2, 8, 11, 11, 2); layer(3, 7, 12, 12, 1);
  for (const { p: [x, y, z], mat } of v.all()) {
    if (mat !== green) continue;
    const sector = Math.floor(((Math.atan2(y - c, x - c) + Math.PI) / (Math.PI * 2)) * 12) % 2;
    if (sector) v.set(x, y, z, groove);
  }
  // the yellow spikes, standing off the ribs
  const out: [number, number][] = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  for (const { p: [x, y, z], mat } of v.all()) {
    if (mat !== green || z < 8 || z > 11 || (x + y + z) % 3) continue;
    for (const [dx, dy] of out) if (!v.has(x + dx, y + dy, z)) { v.set(x + dx, y + dy, z, spike); break; }
  }
  for (const [x, y] of [[4, 4], [6, 6], [4, 6], [6, 4]] as const) v.set(x, y, 13, spike);
  if (glow === 'bloom') {
    // the single flower, open on the crown: a ring of pale petals round its heart
    const petal = '#f5f1e8', heart = '#d8cdb4';
    v.box(4, 4, 13, 6, 6, 13, petal);
    for (const [x, y] of [[5, 3], [5, 7], [3, 5], [7, 5]] as const) v.set(x, y, 14, petal);
    v.box(4, 4, 14, 6, 6, 14, petal);
    v.set(5, 5, 14, heart); v.set(5, 5, 15, heart);
    for (const [x, y] of [[4, 4], [6, 6], [4, 6], [6, 4]] as const) v.set(x, y, 15, petal);
  }
  return v;
}

/* ---- the nemes ----
   8:8 "a fabric hat with shiny blue and gold stripes on it. It had two wide
   bands on either side that were designed to hang down, almost like large,
   floppy ears. It was the same sort of hat a pharaoh would have worn, though it
   looked more like something from a cheap costume shop." The headcloth
   floating empty, its face to +y: the striped crown, the band over the
   brow, the cloth flaring out behind the ears and the two lappets hanging down
   in front, striped across. */
function nemes(): Vox {
  const v = fresh();
  const blue = '#2f64c8', gold = '#efbe3c', shine = '#ffe58a', inside = '#161c33';
  const stripe = (z: number) => (z % 2 ? gold : blue);
  // the crown, close over the head: striped round its sides, the stripes running back over its top
  for (let z = 9; z <= 14; z++) chamfer(v, 2, 1, z, 11, 10, z, z >= 13 ? 3 + (z - 13) : 2, stripe(z));
  for (const { p: [x, y, z] } of v.all()) if (z === 14) v.set(x, y, z, x % 2 ? gold : blue);
  // the cloth behind the ears, flaring out wider as it falls, open at the front where the face would be
  for (let z = 0; z <= 8; z++) {
    const w = 5.6 + (8 - z) * 0.4, x0 = Math.round(6.5 - w), x1 = Math.round(6.5 + w);
    for (let x = x0; x <= x1; x++) for (let y = 1; y <= 9; y++) {
      if (x === x0 || x === x1 || y <= 2) v.set(x, y, z, stripe(z));
      else if (x === x0 + 1 || x === x1 - 1 || y === 3) v.set(x, y, z, inside);   // the hollow, dark inside, seen through the face
    }
  }
  // the brow band across the front of the crown
  v.box(2, 11, 8, 11, 11, 9, gold); v.set(6, 11, 9, shine);
  // the two lappets, the floppy bands hanging down in front, striped across
  for (const a of [2, 9]) for (let z = -2; z <= 7; z++) {
    const wide = z <= 0 ? 1 : 0;
    v.box(a - (a === 2 ? wide : 0), 10, z, a + 2 + (a === 9 ? wide : 0), 11, z, stripe(z));
  }
  // the gathered tail behind
  v.box(5, 0, -1, 8, 0, 3, gold); v.box(6, -1, -2, 7, 0, 0, blue);
  // the cheap shine of the stripes
  v.set(3, 11, 7, shine); v.set(10, 11, 3, shine); v.set(1, 9, 5, shine);
  return v;
}

/* ---- the wrap ----
   8:8 "more a headband than a hat. It was just a red piece of fabric,
   Rambo-style. But when you looked more closely, the rich red fabric was
   covered with an intricate pattern that I couldn't quite make out." A loop of
   red cloth, knotted at the back with the two ends hanging off the knot; the
   knot is turned to +y, where it is seen, and the pattern is a fine tracery a
   tone off the red. */
function wrap(): Vox {
  const v = fresh();
  const red = '#b31e24', fine = '#80141a', tail = twin('#b31e24');
  const N = 11;
  // the band: an eight-sided loop, four high, one thick, a fine zigzag tracery running round it
  const tri = (u: number) => [0, 1, 2, 3, 2, 1][((u % 6) + 6) % 6];
  for (let x = 0; x <= N; x++) for (let y = 0; y <= N; y++) {
    const dx = Math.min(x, N - x), dy = Math.min(y, N - y);
    const onRing = dx + dy >= 3 && (dx === 0 || dy === 0 || dx + dy === 3);
    if (onRing) for (let z = 5; z <= 8; z++) v.set(x, y, z, z - 5 === tri(x + y) ? fine : red);
  }
  // the knot at the back, bunched
  chamfer(v, 4, N, 4, 7, N + 1, 9, 1, red);
  v.set(5, N + 1, 7, fine); v.set(6, N + 1, 5, fine); v.set(4, N + 1, 6, fine);
  // the two ends, hanging off the knot and parting as they fall
  const fall: [number, number][] = [[0, 3], [0, 2], [-1, 1], [-1, 0], [-1, -1], [-2, -2], [-2, -3]];
  fall.forEach(([dx, z], i) => {
    v.box(4 + dx, N + 2, z, 5 + dx, N + 2, z, i % 2 ? tail : red);
    v.box(6 - dx, N + 2, z + 1, 7 - dx, N + 2, z + 1, i % 2 ? red : tail);
  });
  return v;
}

/* ---- the scurrying spell book ----
   8:7 "A spell book scurried out, trailing slime. It rushed across the room
   like an escaped rat"; "The book wriggled, and it was covered in little legs.
   It was oozing a clear liquid." Its binding is never coloured, so the plain
   tome, lifted on a fringe of little legs, clear slime oozing off its edges and
   dripping under it. */
function oozyBook(): Vox {
  const book = tome();
  const v = fresh();
  // the plain tome, turned so its spine is away and the pages show on both seen sides, lifted on its legs
  for (const { p: [x, y, z], mat } of book.all()) v.set(11 - x, y, z + 3, mat);
  const leg = '#4a3d33', foot = '#352a23', ooze = 'glass';
  // the little legs, bent out under every edge
  const legOut = (x: number, y: number, dx: number, dy: number) => {
    v.set(x, y, 2, leg); v.set(x + dx, y + dy, 1, leg); v.set(x + 2 * dx, y + 2 * dy, 0, foot);
  };
  for (const x of [1, 3, 5, 7, 9, 11]) { legOut(x, 13, 0, 1); legOut(x, 0, 0, -1); }
  for (const y of [2, 4, 6, 8, 10]) { legOut(11, y, 1, 0); legOut(0, y, -1, 0); }
  // clear slime: a slick on the cover, oozing over its edges and dripping off
  for (const [x, y] of [[2, 4], [3, 4], [3, 5], [7, 9], [8, 9], [8, 10], [5, 11], [9, 3], [10, 12], [11, 12], [11, 11]] as const) v.set(x, y, 9, ooze);
  for (const [x, y, z0, z1] of [[3, 14, 5, 8], [8, 14, 7, 8], [12, 6, 6, 8], [12, 11, 4, 8]] as const) v.box(x, y, z0, x, y, z1, ooze);
  v.set(3, 14, 2, ooze); v.set(12, 11, 1, ooze);
  return v;
}

/* ---- the quadruped baby backpack ----
   8:10 "the pink backpack thing", "like one of those BabyBjörn baby backpacks",
   "a baby backpack, but it only carries quadrupeds. It's to carry you on my
   chest." The padded pink front of a baby carrier, its pocket proud of it,
   four leg holes in its face, the shoulder straps looping back over the top and
   a waist belt buckled round. The straps and buckles are never coloured: a
   darker pink, plain grey clasps.
   8:94 "Mordecai had modified it to fit the giant pig": the same carrier,
   made over much bigger, its straps let out. */
function carrier(big: boolean): Vox {
  const v = fresh();
  const pink = '#e889b0', pad = '#f2a9c7', strap = '#c4598a', clasp = '#b3b7bd', hole = '#3a1d2b';
  const W = big ? 14 : 10, H = big ? 17 : 13, cx = W / 2, sw = big ? 2 : 1;
  /** the carrier's outline: narrow at the foot, full width from a third of the way up, its top corners rounded */
  const half = (z: number) => (z < H * 0.35 ? cx - 2 + (z / (H * 0.35)) * 2 : cx) - (z === H ? 2 : z === H - 1 ? 1 : 0);
  const fill = (y: number, inset: number, z0: number, z1: number, m: string) => {
    for (let z = z0; z <= z1; z++) { const h = half(z) - inset; for (let x = Math.round(cx - h); x <= Math.round(cx + h); x++) v.set(x, y, z, m); }
  };
  // the padded back, and the pocket the animal sits in, proud of it in two steps
  fill(4, 0, 2, H, pink); fill(5, 0, 2, H, pink);
  fill(6, 1, 2, H - 1, strap); fill(7, 2, 3, H - 2, pad);
  // the open top of the pocket, where the animal goes in
  for (let x = Math.round(cx - half(H - 1)) + 2; x <= Math.round(cx + half(H - 1)) - 2; x++) v.set(x, 6, H - 1, hole);
  // four leg holes, at the pocket's corners: a pair low for the hind legs, a pair high for the front
  for (const z of [3, H - 5]) {
    const h = Math.round(half(z)) - 1, lo = Math.round(cx - h), hi = Math.round(cx + h);
    for (const x of [lo, hi - 1]) v.box(x, 6, z, x + 1, 7, z + (big ? 2 : 1), hole);
  }
  // the shoulder straps: off the top corners, back over the top and down behind, a clasp where each meets the front
  for (const sx of [Math.round(cx - half(H)), Math.round(cx + half(H)) - sw]) {
    v.box(sx, 1, H + 1, sx + sw, 5, H + 1, strap);
    v.box(sx, 0, 4, sx + sw, 0, H, strap);
    v.box(sx, 6, H - 1, sx + sw, 6, H, clasp);
  }
  // the waist belt, round from the foot of either side to the back, a clasp at the front of each side
  const lo = Math.round(cx - half(2)), hi = Math.round(cx + half(2));
  v.box(lo - 1, 1, 2, lo - 1, 5, 3, strap); v.box(hi + 1, 1, 2, hi + 1, 5, 3, strap);
  v.box(lo - 1, 0, 2, hi + 1, 0, 3, strap);
  v.box(lo - 1, 6, 2, lo - 1, 6, 3, clasp); v.box(hi + 1, 6, 2, hi + 1, 6, 3, clasp);
  return v;
}

/* ---- the nipple ring ----
   8:95 "a nipple ring called Petey Motteux's Little Secret", "the large,
   thick ring". The plain piercing, made heavier: a wide, deep hoop and a big
   bead. Its metal is never named, so a plain one. */
function thickRing(): Vox {
  const v = piercing();
  const metal = '#c8ccd4', dark = twin('#c8ccd4'), glint = '#f1f3f6';
  for (let x = -1; x <= 13; x++) for (let z = -1; z <= 13; z++) {
    const d = Math.hypot(x - 6, z - 6);
    if (d <= 7 && d >= 3.8) { v.set(x, -1, z, metal); v.set(x, 0, z, metal); v.set(x, 1, z, dark); v.set(x, 2, z, metal); }
  }
  // the gap at the top, closed by a big round bead
  v.clear(3, -2, 9, 9, 3, 15);
  chamfer(v, 4, -1, 10, 8, 3, 14, 2, metal);
  chamfer(v, 3, 0, 11, 9, 2, 13, 2, metal);
  v.set(4, 3, 13, glint); v.set(5, 3, 13, glint); v.set(4, 3, 12, glint);
  return v;
}

/* ---- splooge ----
   8:47 "Louis said, bringing the bucket he'd purchased for me", "It says it's
   'secretions'", "those disgusting-smelling buckets". A bucket of it, the
   wire handle up. Neither the bucket nor what is in it is ever coloured: a
   plain grey pail, and the plain liquid every potion here takes (8:95 "The
   splooge is a type of potion"). */
function bucket(): Vox {
  const v = fresh();
  const tin = '#7c858e', band = '#5d646e', rail = '#b3b7bd', liquid = '#8c9aa8', scum = '#a3afba';
  const c = 5.5;
  const R = (z: number) => 3.9 + z * 0.16;
  lathe(v, c, c, 0, 9, R, (x, y, z) => {
    const inside = Math.hypot(x - c, y - c) <= R(z) - 1.1 && z >= 1;
    if (inside) return z <= 7 ? liquid : null;
    return z === 9 || z === 1 ? band : tin;
  });
  for (const [x, y] of [[4, 6], [6, 4], [7, 7]] as const) v.set(x, y, 7, scum);
  // the ears and the wire handle, arcing over
  v.box(0, 5, 7, 0, 6, 8, band); v.box(11, 5, 7, 11, 6, 8, band);
  const arc: [number, number][] = [[0, 9], [0, 10], [0, 11], [1, 12], [1, 13], [2, 14], [3, 15], [4, 16], [5, 16], [6, 16], [7, 16], [8, 15], [9, 14], [10, 13], [10, 12], [11, 11], [11, 10], [11, 9]];
  for (const [x, z] of arc) v.set(x, 5, z, rail);
  return v;
}

/* ---- the pet throne ----
   8:30 "At first glance, the new chair on the passenger's side of the van was
   just a regular bucket seat", but "the moment the chair's assigned 'princess'
   sat upon it, a small, fluffy, rectangular bed appeared." A car's bucket
   seat, its front to +y: the cushion, the backrest with its side bolsters and
   the headrest on two posts, and the little bed on the cushion. The upholstery
   is never coloured, so a plain dark one; the bed a plain pale cloth. */
function throne(): Vox {
  const v = fresh();
  const seat = '#3f3d3a', inset = '#55524d', post = '#a4abb6', rail = '#5d646e', bed = '#ece4d2', fluff = '#f7f2e8';
  // the cushion, its bolsters raised along both sides
  chamfer(v, 1, 3, 1, 12, 11, 3, 1, seat);
  v.box(3, 5, 3, 10, 10, 3, inset);
  v.box(1, 4, 4, 2, 10, 5, seat); v.box(11, 4, 4, 12, 10, 5, seat);
  // the rails it is bolted down on
  v.box(3, 3, 0, 3, 10, 0, rail); v.box(10, 3, 0, 10, 10, 0, rail);
  // the backrest, leaning a little back, bolsters standing proud of it
  for (let z = 4; z <= 14; z++) {
    const lean = z >= 10 ? 1 : 0;
    v.box(1, 0 - lean, z, 12, 2 - lean, z, seat);
    if (z <= 12) { v.box(1, 3 - lean, z, 2, 4 - lean, z, seat); v.box(11, 3 - lean, z, 12, 4 - lean, z, seat); }
    if (z >= 5 && z <= 12) v.box(3, 3 - lean, z, 10, 3 - lean, z, inset);
  }
  // the headrest on its two posts
  v.set(4, 0, 15, post); v.set(9, 0, 15, post);
  chamfer(v, 3, -1, 16, 10, 1, 18, 1, seat);
  v.box(4, 2, 16, 9, 2, 17, inset);
  // the small, fluffy, rectangular bed on the cushion
  v.box(3, 5, 4, 10, 10, 4, bed);
  v.box(3, 5, 5, 10, 5, 5, fluff); v.box(3, 10, 5, 10, 10, 5, fluff);
  v.box(3, 6, 5, 3, 9, 5, fluff); v.box(10, 6, 5, 10, 9, 5, fluff);
  return v;
}

/* ---- the paperback ----
   8:89 "The book was, strangely, a paperback", "it didn't look like a spell
   book at all. The cover featured a drawing of a gate with a human woman
   standing in front of it, looking angry." A thin book standing on its tail,
   the cover to +y with the drawing on it, the pages showing along the top and
   the fore-edge. No colour is given for any of it: a plain cream cover, the
   gate grey, the woman a dark figure before it. */
const COVER = [
  '..#######..',
  '.##.....##.',
  '##..kkk..##',
  '#.b.kkk.b.#',
  '#.b..k..b.#',
  '#.bkkkkkb.#',
  '#.bkkkkkb.#',
  '#.bk.k.kb.#',
  '#.b.kkk.b.#',
  '#.b.k.k.b.#',
  '#.b.k.k.b.#',
  '###########',
];
function paperback(): Vox {
  const v = fresh();
  const cover = '#e6dcc4', back = twin('#e6dcc4'), pages = '#f4efe2', line = '#ddd5c2';
  const gate = '#6f737c', bar = '#4a4e57', figure = '#2a2426';
  const W = 13, T = 3, H = 16;
  // the page block, thin, between the soft covers
  v.box(1, 1, 0, W - 1, T - 1, H - 1, pages);
  for (let z = 2; z <= H - 2; z += 3) v.box(W - 1, 1, z, W - 1, T - 1, z, line);
  v.box(0, T, 0, W - 1, T, H - 1, cover);
  v.box(0, 0, 0, W - 1, 0, H - 1, back);
  v.box(0, 0, 0, 0, T, H - 1, back);              // the spine, flat, as a paperback's is
  // the drawing, printed on the cover
  face(v, 1, T, 2, COVER, c => (c === '#' ? gate : c === 'b' ? bar : c === 'k' ? figure : null));
  return v;
}

/* ---- the garage key ----
   8:40 "the team that wins is given a key. That key will open a single garage
   of a defeated team." Only the noun is given, so the plain key. */
function garageKey(): Vox { return key(); }

export const ITEMS_B8B: Record<string, Record<string, () => Vox>> = {
  'carls-cactus': { potted: () => cactus('none'), glowing: () => cactus('blue'), bloomed: () => cactus('bloom') },
  'nemes-of-pestilence': { striped: nemes },
  'wrap-of-sekhmets-compassion': { tied: wrap },
  'oozy-form-spellbook': { scurrying: oozyBook },
  'quadruped-baby-backpack': { carrier: () => carrier(false), enlarged: () => carrier(true) },
  'petey-motteuxs-little-secret': { thick: thickRing },
  'splooge': { bucket },
  'smart-companion-royal-pet-throne': { seat: throne },
  'tome-of-gatekeeper': { paperback },
  'garage-key': { plain: garageKey },
};
