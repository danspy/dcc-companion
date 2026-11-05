import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { chamfer } from './itemparts.ts';
import { potion, tome, table } from './itemforms.ts';

/* ---- items, set b3a (book 3) ----
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
/** a block lying in the x-y plane with its corners cut back (null carves) */
function flat(v: Vox, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, cut: number, m: string | null) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    const dx = Math.min(x - x0, x1 - x), dy = Math.min(y - y0, y1 - y);
    if (dx + dy >= cut) for (let z = z0; z <= z1; z++) v.set(x, y, z, m);
  }
}
/** a disc standing in the x-z plane, y0..y1 thick: an octagon, which reads round where a stepped circle reads as a heap */
function disc(v: Vox, cx: number, cz: number, y0: number, y1: number, r: number, m: string | null) {
  for (let x = cx - r; x <= cx + r; x++) for (let z = cz - r; z <= cz + r; z++) {
    if (Math.abs(x - cx) + Math.abs(z - cz) <= r + Math.floor(r / 2)) for (let y = y0; y <= y1; y++) v.set(x, y, z, m);
  }
}
/** rows of characters drawn onto the face at y, top row first, from (x0, z0 + rows - 1) */
function face(v: Vox, x0: number, y: number, z0: number, rows: string[], pick: (c: string) => string | null) {
  rows.forEach((row, j) => [...row].forEach((c, i) => { const m = pick(c); if (m) v.set(x0 + i, y, z0 + rows.length - 1 - j, m); }));
}
/** a ball ten across from chamfered layers (it reads round where a voxel sphere reads as a heap), offset by (ox, oy, oz) */
function ball(v: Vox, ox: number, oy: number, oz: number, m: string) {
  chamfer(v, ox + 2, oy + 2, oz, ox + 7, oy + 7, oz, 2, m);
  chamfer(v, ox + 1, oy + 1, oz + 1, ox + 8, oy + 8, oz + 1, 3, m);
  chamfer(v, ox, oy, oz + 2, ox + 9, oy + 9, oz + 6, 3, m);
  chamfer(v, ox + 1, oy + 1, oz + 7, ox + 8, oy + 8, oz + 7, 3, m);
  chamfer(v, ox + 2, oy + 2, oz + 8, ox + 7, oy + 7, oz + 8, 2, m);
}

/** recolour the first block met looking in from the lit face (+y) at (x, z): a mark on a curved surface */
function litFace(v: Vox, x: number, z: number, m: string) {
  for (let y = 40; y >= -40; y--) if (v.has(x, y, z)) { v.set(x, y, z, m); return; }
}

/* ---- the armorer's table ----
   3:13 one of the crafting tables off the bopca's list, bought with a free
   table coupon; nothing is said of how it looks. The plain crafting table. */
const armorersTable = () => table();

/* ---- the two spell tomes ----
   3:2 "a magical tome for a spell called Bang Bro", out of the boss box, and
   the spellbook in Donut's mailbox that teaches Hole. Neither is described:
   the plain tome. */
const spellTome = () => tome();

/* ---- the invisibility potion ----
   3:5 three potions from a suitcase pocket, one of them "Invisibility Potion".
   No colour is ever given: the plain potion. */
const invisibilityPotion = () => potion();

/* ---- banger spheres ----
   3:16 "spheres made of dwarven robot scrap metal", "the baseball-sized
   ones", hurled from the xistera: "the metal ball rocketed away". A plain
   grey metal ball, a catch of light on it.
   6:42 "one of my spiked ones": the spiked kind beside the plain one, which
   is still thrown in the same fight ("a regular banger sphere"). */
const SCRAP = '#8b939c', SCRAP2 = '#7a838d', SHINE = '#c3c9d0', SPIKE = '#d3d8de';
function bangerBall(v: Vox, ox: number, oy: number, oz: number, m = SCRAP) {
  ball(v, ox, oy, oz, m);
  for (const [x, z] of [[2, 6], [3, 6], [3, 7], [2, 5]] as const) litFace(v, ox + x, oz + z, SHINE);
}
function bangerSphere(): Vox {
  const v = fresh();
  bangerBall(v, 0, 0, 0);
  return v;
}
function bangerSpiked(): Vox {
  const v = fresh();
  // the spiked one, behind and to the right, spikes standing out of every face that shows
  const ox = 8, oy = -4, oz = 3, c: [number, number, number] = [ox + 4, oy + 4, oz + 4];
  ball(v, ox, oy, oz, SCRAP2);
  const out = (s: [number, number, number], d: [number, number, number], n = 2) => {
    const p = [...s];
    while (v.has(p[0], p[1], p[2])) { p[0] += d[0]; p[1] += d[1]; p[2] += d[2]; }
    for (let i = 0; i < n; i++) v.set(p[0] + d[0] * i, p[1] + d[1] * i, p[2] + d[2] * i, SPIKE);
  };
  for (const [i, j] of [[2, 3], [6, 3], [4, 6], [8, 6]] as const) { out([ox + i, c[1], oz + j], [0, 1, 0]); out([c[0], oy + i, oz + j], [1, 0, 0]); }
  for (const [x, y] of [[3, 3], [6, 6], [3, 6], [6, 3]] as const) out([ox + x, oy + y, c[2]], [0, 0, 1]);
  for (const d of [[1, 1, 0], [-1, 1, 0], [1, -1, 0]] as const) for (const z of [3, 5]) out([c[0], c[1], oz + z], [...d]);
  // the plain one, in front
  bangerBall(v, 0, 3, 0);
  return v;
}

/* ---- the battery fabricator ----
   3:4 "about the size of a microwave", "taken from a dwarven automaton
   factory": "You pour a handful of mana potions in, stick one of these metal
   blocks in, and a charged battery comes out on the other side." The batteries
   are "battery rectangles", "about the size and weight of a brick", "piled
   behind the machine". Its metal is never coloured: a plain grey box, a mouth
   on top for the potions, a block going in at the front and a battery coming
   out of the far side, two more behind it. */
function batteryFabricator(): Vox {
  const v = fresh();
  const body = '#6b737c', trim = '#545b63', mouth = '#1f2226', cell = '#b3b7bd', cellEnd = twin('#b3b7bd');
  const brick = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
    v.box(x0, y0, z0, x1, y1, z1, cell);
    if (x1 - x0 >= y1 - y0) { v.box(x1, y0, z0, x1, y1, z1, cellEnd); } else v.box(x0, y1, z0, x1, y1, z1, cellEnd);
  };
  // the batteries piled behind it, against its far corner
  brick(9, -3, 0, 13, -1, 1); brick(9, -3, 2, 13, -1, 3); brick(10, -6, 0, 14, -4, 1);
  // the box itself, a seam round it where the case closes
  chamfer(v, 0, 0, 0, 13, 9, 8, 1, body);
  for (let x = 1; x <= 12; x++) v.set(x, 9, 6, trim);
  for (let y = 1; y <= 8; y++) v.set(13, y, 6, trim);
  // the mouth on top the potions are poured into: a raised rim round a dark hole
  flat(v, 7, 2, 9, 12, 7, 9, 1, trim);
  v.box(8, 3, 9, 11, 6, 9, mouth);
  // the slot in the front, a block half pushed in
  v.box(2, 9, 2, 7, 9, 4, mouth);
  brick(3, 9, 2, 6, 12, 3);
  // the charged battery, coming out of the far side
  v.box(13, 3, 1, 13, 7, 4, mouth);
  brick(13, 4, 2, 17, 6, 3);
  return v;
}

/* ---- the crossbow of the scavenger mother of mothers ----
   3:24 "the large crossbow", "a repeating, ranged weapon", "It appeared to be
   made of gold", "It was inlaid with carvings of a vulture creature." 3:27 it
   is "auto-loading, cocking, and firing". Lying on its side, the stock along
   x and the bow across the front, its string behind it; the box over the stock is
   what makes a crossbow a repeating one, and the bow a deeper gold so it reads. The carving is cut into the gold, a
   vulture with its wings spread on the side of the stock. */
const VULTURE = [
  '..#..',
  '#.#.#',
  '#####',
  '.###.',
  '.#.#.',
];
function scavengerCrossbow(): Vox {
  const v = fresh();
  const gold = '#d9a93a', bow = '#c08a26', carve = '#8a5c16', groove = '#a87a22', shine = '#f4d77a', cord = '#efe6cf';
  // the stock, long and slim, deepening into the shoulder stock at the butt
  panel(v, 0, 7, -3, 5, 8, 2, 2, gold);
  v.box(5, 7, -1, 18, 8, 1, gold);
  v.box(1, 7, 2, 4, 8, 2, shine);
  // the vulture, inlaid down the side of the butt, its wings spread
  face(v, 0, 8, -2, VULTURE, c => (c === '#' ? carve : null));
  // the grip and the trigger under it
  v.box(7, 7, -3, 8, 8, -2, gold); v.set(10, 8, -2, carve);
  // the track the bolts run along, on top
  v.box(11, 7, 1, 18, 7, 1, groove);
  // the box that feeds it, low over the middle of the stock, a band of carving round it
  v.box(8, 7, 2, 12, 8, 4, gold);
  v.box(8, 8, 3, 12, 8, 3, carve);
  v.box(8, 7, 4, 12, 8, 4, shine);
  // the bow across the front, a shade deeper, its arms sweeping back to the tips
  for (let dy = 0; dy <= 7; dy++) {
    const x = 17 - Math.floor((dy * dy) / 14);
    for (const y of [7 + dy, 8 - dy]) v.box(x, y, 0, x + 1, y, 1, bow);
  }
  v.box(18, 6, -1, 19, 9, 1, gold);                     // the bow's seat at the front
  // the string, from tip to tip behind the bow, over the stock
  v.box(13, 0, 1, 13, 15, 1, cord);
  v.box(13, 7, 2, 13, 8, 2, cord); v.set(13, 7, 1, gold); v.set(13, 8, 1, gold);
  return v;
}

/* ---- the focusing goggles ----
   3:15 "They were large and round, making her look like a bug", "movie
   star-style sunglasses", and "The frames had no arms". Two big round dark
   lenses in a plain dark frame and a bridge, nothing else, the dark glass
   catching the light as sunglasses do. */
function focusingGoggles(): Vox {
  const v = fresh();
  const frame = '#2c2b31', lens = '#39404f', glint = '#9aa6bd', glint2 = '#6c788f';
  for (const cx of [4, 15]) {
    disc(v, cx, 4, 0, 1, 4, frame);
    disc(v, cx, 4, 1, 1, 3, null);                     // the rim stands proud of the lens
    disc(v, cx, 4, 0, 0, 3, lens);
    // the light across each lens, a long streak and a short one
    for (const [dx, dz] of [[-2, 3], [-1, 2], [0, 1], [1, 0]] as const) v.set(cx + dx, 0, 4 + dz, glint);
    for (const [dx, dz] of [[1, 3], [2, 2]] as const) v.set(cx + dx, 0, 4 + dz, glint2);
  }
  // the bridge between them, high, arched over the nose
  v.box(9, 0, 6, 10, 1, 7, frame);
  return v;
}

/* ---- the auto buckler ----
   3:29 "the wrist bracer. It looked similar to the bracer I had on my right
   wrist", the gauntlet's, which is "charcoal-colored" (1:25). "Forms a
   metallic buckler on command": "I could twist my wrist, and the small shield
   would pop into place." The bracer upright, the round buckler out on its
   face, a boss at its middle. */
function autoBuckler(): Vox {
  const v = fresh();
  const bracer = '#4c4c55', band = '#5b5b65', hole = '#26262c';
  const steel = '#a4abb6', rim = '#7c858e', boss = '#c9ccd1';
  // the bracer: a cuff for the forearm, open top and bottom, banded at both ends
  chamfer(v, 0, 0, 0, 8, 8, 9, 3, bracer);
  chamfer(v, 2, 2, 2, 6, 6, 9, 1, hole);
  for (const z of [1, 8]) for (let x = 0; x <= 8; x++) for (let y = 0; y <= 8; y++) if (v.get(x, y, z) === bracer) v.set(x, y, z, band);
  // the buckler, popped out on the bracer's face, a boss at its middle
  v.box(3, 9, 4, 5, 9, 6, rim);                        // its mount
  disc(v, 4, 5, 10, 10, 5, rim);
  disc(v, 4, 5, 11, 11, 4, steel);
  chamfer(v, 3, 12, 4, 5, 12, 6, 0, boss);
  v.set(4, 13, 5, boss);
  for (const [x, z] of [[1, 8], [2, 9], [0, 7]] as const) v.set(x, 11, z, boss);   // light on its rim
  return v;
}

/* ---- the mongoliensis saddle ----
   3:7 "the blue and red, tassel-covered, obscenely garish saddle", "There
   were no straps on the saddle", "It was just a seat and a pommel. And a
   bunch of tassels. There were no reins." Adjusted to fit a cat. In profile,
   its pommel to +x: a blue seat on a red skirt that would drape a back,
   tassels hanging off every edge, blue on the red and red on the blue. */
function mongoSaddle(): Vox {
  const v = fresh();
  const blue = '#2e4f9c', seatTop = '#3a5fb0', red = '#c22a22', redT = '#e0473a', blueT = '#4a73c8', knot = '#f0d9a0';
  // the skirt: an arch over where the back would be, its flaps down both sides
  v.box(2, 0, 4, 12, 9, 4, red);
  v.box(2, 0, 1, 12, 0, 3, red); v.box(2, 9, 1, 12, 9, 3, red);
  // the seat, dipping in the middle, the cantle curling up at the back and the pommel at the front
  v.box(3, 2, 5, 11, 7, 5, blue);
  v.box(4, 3, 5, 10, 6, 5, seatTop);
  v.box(1, 2, 5, 2, 7, 6, blue); v.box(1, 2, 7, 2, 7, 8, blue); v.box(1, 3, 9, 1, 6, 9, blue);
  v.box(12, 2, 5, 13, 7, 6, blue); v.box(12, 3, 7, 13, 6, 8, blue); v.box(12, 4, 9, 13, 5, 10, blue);
  v.box(12, 4, 11, 13, 5, 11, red);                    // the pommel's cap
  // tassels: a knot and a fringe off the flaps, the cantle and the pommel
  const tassel = (x: number, y: number, z: number, m: string, n = 2) => { v.set(x, y, z, knot); for (let i = 1; i <= n; i++) v.set(x, y, z - i, m); };
  for (let x = 2; x <= 12; x += 2) { tassel(x, 10, 1, x % 4 ? blueT : blue); tassel(x, -1, 1, blueT); }
  for (let y = 1; y <= 8; y += 2) tassel(13, y, 2, blueT);
  for (const y of [2, 7]) tassel(0, y, 8, redT, 3);
  for (const y of [3, 6]) tassel(14, y, 9, redT, 3);
  for (let x = 4; x <= 10; x += 3) tassel(x, 9, 6, redT, 1);
  return v;
}

/* ---- the necklace of the haute bourgeoisie ----
   3:2 "a simple, silver-colored chain with a quarter-sized charm at the end.
   A tiny, yellow jewel was encrusted in the charm." Each jewel on it is a
   settlement held. The round charm hung from its loop of chain.
   5:43 the next tyrant's box: "a sliver of an amethyst, smaller than the
   'poor sapphire' I already had on my necklace": a second, smaller stone. */
function hauteNecklace(two: boolean): Vox {
  const v = fresh();
  const chain = '#c2c7cf', link = twin('#c2c7cf'), charm = '#aab0b9', charmRim = '#8f96a0', yellow = '#e8c22a', glint = '#fff3a8', amethyst = '#9b5fc8';
  // the charm, a coin of silver, its edge a shade darker
  disc(v, 4, 4, 0, 1, 3, charmRim);
  disc(v, 4, 4, 1, 1, 2, charm);
  // the yellow jewel, set proud of it
  v.box(3, 2, 4, 4, 2, 5, yellow); v.set(3, 2, 5, glint);
  if (two) { v.set(6, 2, 3, amethyst); v.set(6, 2, 2, twin(amethyst)); }
  // the bail and the chain, a wide loop of links rising over it
  v.box(4, 1, 8, 4, 1, 9, chain);
  const path: [number, number][] = [[4, 10], [3, 11], [2, 11], [1, 12], [0, 13], [-1, 14], [-1, 15], [0, 16], [1, 17], [2, 18], [3, 18], [4, 18], [5, 18], [6, 18], [7, 17], [8, 16], [9, 15], [9, 14], [8, 13], [7, 12], [6, 11], [5, 11]];
  path.forEach(([x, z], i) => v.set(x, 1, z, i % 2 ? chain : link));
  return v;
}

/* ---- the tiara of mana genita ----
   3:2 "It looked similar to her last one. The jewels on this one were white
   instead of purple." "A crystal tiara fit for royalty." So the shape of the
   last one, a band with a fan of peaks rising to a centre stone, in pale
   crystal, every jewel white. */
function manaGenitaTiara(): Vox {
  const v = fresh();
  const crystal = '#9fb3c8', facet = '#8aa0b8', gem = '#f4f7fb', spark = '#ffffff';
  // the band: an eight-sided ring, two high, white gems set round it
  for (let x = 0; x <= 9; x++) for (let y = 0; y <= 9; y++) {
    const dx = Math.min(x, 9 - x), dy = Math.min(y, 9 - y);
    if (dx + dy >= 2 && !(dx >= 1 && dy >= 1 && dx + dy >= 4)) v.box(x, y, 0, x, y, 1, crystal);
  }
  for (const [x, y] of [[0, 3], [0, 6], [9, 3], [9, 6], [3, 0], [6, 0]] as const) v.set(x, y, 1, gem);
  // the front rises in a fan of peaks to the stone, a jewel on each, the facets in two tones
  [[1, 3], [2, 5], [3, 7], [4, 10], [5, 10], [6, 7], [7, 5], [8, 3]].forEach(([x, t]) => v.box(x, 9, 2, x, 9, t, x % 2 ? crystal : facet));
  for (const [x, z] of [[1, 4], [2, 6], [3, 8], [6, 8], [7, 6], [8, 4]] as const) v.set(x, 9, z, gem);
  v.set(4, 9, 11, spark); v.set(5, 9, 11, gem);
  for (const [x, y, t] of [[0, 7, 3], [9, 7, 3]] as const) { v.box(x, y, 2, x, y, t, crystal); v.set(x, y, t + 1, gem); }
  // the centre stone, white, proud of the front
  v.box(3, 10, 4, 6, 10, 7, gem);
  v.box(4, 11, 5, 5, 11, 6, gem);
  v.set(4, 10, 7, spark); v.set(3, 10, 6, spark); v.set(5, 11, 6, spark);
  return v;
}

/* ---- the fragmenting potion ball ----
   3:7 "It felt like a hardened rubber ball. I squeezed it, and a split in the
   rubber appeared." "A full potion vial may be transferred to this ball." The
   rubber's colour is never given: a plain dull one, the split across its top. */
function potionBall(): Vox {
  const v = fresh();
  const rubber = '#6a655d', shine = '#8f897e', split = '#24211d';
  ball(v, 0, 0, 0, rubber);
  for (const [x, z] of [[2, 6], [3, 6], [3, 7]] as const) litFace(v, x, z, shine);
  // the split, a dark slit across the top where the potion goes in
  for (const [x, y] of [[3, 3], [4, 4], [5, 4], [6, 5], [7, 6]] as const) v.set(x, y, 8, split);
  v.set(2, 3, 7, split); v.set(8, 6, 7, split);
  return v;
}

/* ---- the gangway chock ----
   3:5 "just a giant, rectangular hunk of metal with rounded edges", a
   swordsman's breastplate thinned "to about a fifth of an inch", "solid and
   heavy as shit". That plate was "maybe made from actual iron" (3:4): a plain
   iron grey. Standing on its edge, face on.
   4:7 hit by an explosive: "The chock was bent over and dislodged with a hole
   right in the center, peeled open like a baked potato." Its top folded
   forward, the hole's petals torn out toward the room, bright where it tore. */
function gangwayChock(blasted: boolean): Vox {
  const v = fresh();
  const iron = '#6f767e', back = '#5d636b', torn = '#b3b7bd';
  const W = 13, H = 16, bend = 11;
  // the plate, two thick, its corners rounded; past the bend its rows step forward as it folds over
  for (let x = 0; x <= W; x++) for (let z = 0; z <= H; z++) {
    const dx = Math.min(x, W - x), dz = Math.min(z, H - z);
    if (dx + dz < 3) continue;
    const k = blasted ? 2 * Math.max(0, z - bend) : 0;
    v.set(x, k, z, back); v.set(x, k + 1, z, iron);
    if (k > 0) { v.set(x, k - 1, z, back); v.set(x, k, z - 1, iron); v.set(x, k + 1, z - 1, iron); }   // close the steps of the fold
  }
  if (!blasted) return v;
  // the hole in the middle, its petals peeled out toward the room
  const cx = 6.5, cz = 6;
  for (let x = 0; x <= W; x++) for (let z = 0; z <= bend; z++) {
    const d = Math.hypot(x - cx, z - cz);
    if (d <= 2.6) { v.set(x, 0, z, null); v.set(x, 1, z, null); }
    else if (d <= 3.3 && v.has(x, 1, z)) v.set(x, 1, z, torn);
  }
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, -0.7]] as const) {
    for (let k = 1; k <= 3; k++) {
      const x = Math.round(cx + dx * (3.4 - k * 0.5)), z = Math.round(cz + dz * (3.4 - k * 0.5)), y = 1 + k;
      v.set(x, y, z, k === 3 ? torn : iron);
    }
  }
  return v;
}

/* ---- the wrestling belt of the great gorgo ----
   3:25 "a gold wrestling belt, like any regular heavyweight champion belt
   they'd give to a WWE star." The plain form of a champion's belt: a big gold
   plate at the front with a raised boss, smaller gold plates along the strap.
   The strap's colour is never given: a plain dark leather, buckled round. */
function gorgoBelt(): Vox {
  const v = fresh();
  const leather = '#3f2f27', gold = '#d9a93a', deep = '#b98a2c', bright = '#f2cf6a', edge = twin('#d9a93a');
  // the strap, fastened in a loop
  flat(v, 0, 0, 0, 13, 10, 2, 4, leather);
  flat(v, 2, 2, 0, 11, 8, 2, 3, null);
  // the side plates set into the strap, where it turns and down its right
  for (const [x, y] of [[13, 4], [13, 5], [13, 6], [12, 8], [11, 9], [12, 2], [11, 1]] as const) v.box(x, y, 0, x, y, 2, gold);
  for (const [x, y] of [[13, 5], [11, 9], [11, 1]] as const) v.set(x, y, 1, deep);
  // the centre plate, big and standing proud at the front: a gold shield, a ring cut into it round a raised boss
  panel(v, 1, 11, -3, 12, 11, 6, 4, edge);
  panel(v, 2, 12, -2, 11, 12, 5, 4, gold);
  panel(v, 3, 12, -1, 10, 12, 4, 4, deep);
  panel(v, 4, 12, 0, 9, 12, 3, 3, gold);
  panel(v, 5, 13, 0, 8, 13, 3, 1, bright);
  v.set(5, 13, 3, gold); v.set(6, 14, 2, bright); v.set(7, 14, 1, bright);
  return v;
}

/* ---- the stuffed grulke infantry figure ----
   3:29 "A brown frog wearing a spiked helmet. It still had the tag on it", a
   bean bag. On the tag, "a symbol of a smiley-faced star on the other side".
   A squat, soft toad sitting up, its wide mouth, its eyes bulging on top, the
   helmet a plain grey with its spike, the paper tag turned to show the star. */
function grulkeFigure(): Vox {
  const v = fresh();
  const brown = '#7a5634', limb = twin('#7a5634'), mouth = '#3e2a19', eye = '#1b1714', helm = '#7c858e', helmTop = '#8d949c', spike = '#b3b7bd';
  const paper = '#efe9da', ink = '#3a3f55', thread = '#cfc6b2';
  // the body, a sagging bean bag, and the head on it wider still and flat, as a toad's is
  chamfer(v, 1, 1, 0, 10, 9, 0, 3, brown);
  chamfer(v, 0, 0, 1, 11, 10, 4, 3, brown);
  chamfer(v, -1, 0, 5, 12, 10, 7, 3, brown);
  chamfer(v, 0, 1, 8, 11, 9, 8, 3, brown);
  // the wide mouth across the front, wrapping round its corners
  for (let x = 1; x <= 10; x++) v.set(x, 10, 5, mouth);
  v.set(0, 9, 6, mouth); v.set(11, 9, 6, mouth);
  // the eyes, bulging up out of the top of the head at its front corners
  for (const x0 of [0, 8]) { chamfer(v, x0, 6, 9, x0 + 3, 9, 11, 1, limb); v.box(x0 + 1, 9, 10, x0 + 2, 9, 11, eye); }
  // the haunches folded at its sides and the two front feet
  for (const x0 of [-1, 11]) chamfer(v, x0, 2, 0, x0 + 1, 7, 3, 1, limb);
  v.box(2, 10, 0, 3, 11, 1, limb); v.box(8, 10, 0, 9, 11, 1, limb);
  // the helmet, a grey cap on its crown behind the eyes, its spike up out of the top
  chamfer(v, 2, 0, 9, 9, 5, 9, 2, helm);
  chamfer(v, 3, 1, 10, 8, 4, 10, 2, helmTop);
  v.box(5, 2, 11, 6, 3, 11, helm);
  v.set(5, 2, 12, spike); v.set(5, 2, 13, spike);
  // the tag, on a short thread off its right foot, turned to show the star
  v.set(10, 12, 1, thread);
  v.box(10, 13, -3, 13, 13, 1, paper);
  for (const [x, z] of [[12, 0], [11, -1], [12, -1], [13, -1], [11, -2], [13, -2]] as const) v.set(x, 13, z, ink);
  return v;
}

/* ---- the interdiction rapid-response railway repair cart ----
   3:26 "about twice as long as the auxiliary ones", "three sets of wheels",
   "A line of seats filled the first half of the open-top cart, with cargo
   space in the back", "a raised platform in the center with a small, enclosed
   driver cabin above the main deck", "accessed via a small ladder", "The
   engine took up the entire back". In front, "a wide blade ... almost like a
   flat squeegee", "close to the ground", with "two track-shaped
   indentations", and "the port side of the blade ... rose at two 90-degree
   angles" for the third rail: the mobile portal, off. 3:29 the deck is metal.
   No colour is given: plain greys, a plain dark seat. A chibi of itself, its
   nose to +x, its port side to the lit +y face. */
function interdictionCart(): Vox {
  const v = fresh();
  const deck = '#7c858e', frame = '#4d545b', wheel = '#2b2e32', hub = '#a4abb6', engine = '#4f555c', vent = '#2f3338', lid = '#636a72';
  const cab = '#8d949c', roof = '#5d646e', seat = '#4a3f36', back = twin('#4a3f36'), blade = '#b3b7bd', rung = '#a4abb6';
  // the wheels, three sets, on both sides under the deck
  for (const cx of [3, 10, 16]) for (const y of [0, 9]) {
    disc(v, cx, 2, y, y, 2, wheel);
    if (y === 9) v.set(cx, 9, 2, hub);
  }
  // the chassis and the metal deck over it
  v.box(0, 1, 3, 19, 8, 4, frame);
  v.box(0, 0, 5, 19, 9, 5, deck);
  for (let x = 0; x <= 19; x++) v.set(x, 9, 4, frame);
  // the engine, the whole back of the cart, vents down its side and the battery lid on top
  chamfer(v, 0, 0, 6, 4, 9, 10, 1, engine);
  for (const z of [7, 9]) v.box(1, 9, z, 3, 9, z, vent);
  v.box(1, 2, 11, 3, 7, 11, lid);
  // the cargo space: open deck, a low rail round its edge
  for (const x of [5, 6, 7]) { v.set(x, 9, 6, frame); v.set(x, 0, 6, frame); }
  // the raised platform in the middle, and the small enclosed cabin on it
  for (const [x, y] of [[8, 2], [12, 2], [8, 7], [12, 7]] as const) v.box(x, y, 6, x, y, 7, frame);
  v.box(8, 1, 8, 12, 8, 8, frame);
  v.box(8, 2, 9, 12, 7, 12, cab);
  v.box(11, 7, 10, 11, 7, 11, 'glass'); v.box(9, 7, 10, 9, 7, 11, 'glass');
  v.box(12, 3, 10, 12, 6, 11, 'glass');
  v.box(7, 1, 13, 13, 8, 13, roof);
  // the small ladder up to it, on the port side
  v.box(13, 8, 6, 13, 8, 8, rung); v.box(13, 9, 6, 13, 9, 8, rung);
  // the line of seats in the front half, their backs to the cabin
  for (const x of [14, 17]) {
    v.box(x, 1, 6, x + 1, 8, 6, seat);
    v.box(x, 1, 7, x, 8, 8, back);
  }
  // the blade across the front, low, on two arms; notched for the rails, stepped up on the port side
  for (const y of [2, 7]) { v.box(20, y, 3, 20, y, 4, frame); v.set(21, y, 3, frame); }
  v.box(21, 0, 0, 21, 9, 2, blade);
  v.box(22, 0, 2, 22, 9, 2, blade);
  for (const y of [1, 6]) v.clear(21, y, 0, 21, y + 1, 0);
  v.clear(21, 8, 0, 21, 9, 1);
  return v;
}

export const ITEMS_B3A: Record<string, Record<string, () => Vox>> = {
  'armorers-table': { plain: armorersTable },
  'bang-bro-tome': { plain: spellTome },
  'banger-spheres': { ball: bangerSphere, spiked: bangerSpiked },
  'battery-fabricator': { machine: batteryFabricator },
  'crossbow-of-scavenger-mother-of-mothers': { gilded: scavengerCrossbow },
  'prism-focusing-goggles': { round: focusingGoggles },
  'auto-buckler-of-peach-pit': { popped: autoBuckler },
  'mongoliensis-saddle': { tasselled: mongoSaddle },
  'necklace-of-haute-bourgeoisie': { sapphire: () => hauteNecklace(false), amethyst: () => hauteNecklace(true) },
  'tiara-of-mana-genita': { crystal: manaGenitaTiara },
  'fragmenting-potion-ball': { plain: potionBall },
  'gangway-chock': { sheet: () => gangwayChock(false), blasted: () => gangwayChock(true) },
  'wrestling-belt-of-great-gorgo': { champion: gorgoBelt },
  'grulke-infantry-figure': { tagged: grulkeFigure },
  'hole-tome': { plain: spellTome },
  'interdiction-cart': { 'rapid-response': interdictionCart },
  'invisibility-potion': { plain: invisibilityPotion },
};
