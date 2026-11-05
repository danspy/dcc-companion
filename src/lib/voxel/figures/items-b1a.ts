import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { chamfer } from './itemparts.ts';
import { potion, scroll, ring } from './itemforms.ts';

/* ---- items, batch b1a (book 1) ----
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
/** every voxel of one sprite copied into another, moved by (dx, dy, dz) */
function stamp(dst: Vox, src: Vox, dx: number, dy: number, dz: number) {
  for (const { p: [x, y, z], mat } of src.all()) dst.set(x + dx, y + dy, z + dz, mat);
}

/* ---- the old woman's shopping cart ----
   1:22 "a shopping cart filled to the brim with blankets and other odds and ends
   including a plastic pink flamingo that had an arrow stuck in its head"; "a blue
   IKEA bag" pulled from it, and at 1:27 one "off the top". 3:34 the flamingo
   "stood in the front of her shopping cart". A wire basket on casters, the handle
   at the back, the front to +x; the blankets' colours are never given, so they
   are plain dull ones, and the arrow is a plain one. */
function cart(): Vox {
  const v = fresh();
  const wire = '#b3b7bd', frame = '#8d949c', tyre = '#2b2b30';
  const L = 15, W = 9, Z0 = 4, Z1 = 10;
  // the casters, and the posts up to the basket
  for (const [x, y] of [[1, 1], [1, W - 1], [L - 1, 1], [L - 1, W - 1]] as const) {
    v.box(x - 1, y, 0, x, y, 1, tyre);
    v.set(x, y, 2, frame);
  }
  // the bottom rack under the basket
  v.box(0, 0, 3, L, W, 3, (x, y) => (x === 0 || x === L || y === 0 || y === W || x % 3 === 0 ? frame : null));
  // the wire basket: upright wires every other voxel, bands round it top, middle and bottom
  for (let x = 0; x <= L; x++) for (let y = 0; y <= W; y++) for (let z = Z0; z <= Z1; z++) {
    const side = y === 0 || y === W, end = x === 0 || x === L;
    if (!side && !end) { if (z === Z0) v.set(x, y, z, frame); continue; }
    const band = z === Z0 || z === Z1 || z === 7;
    const upright = side ? x % 2 === 0 : y % 2 === 0;
    if (band || upright) v.set(x, y, z, z === Z1 ? frame : wire);
  }
  // the handle, up from the back of the basket and across
  for (const y of [0, W]) v.box(-1, y, Z1, -1, y, Z1 + 3, frame);
  v.box(-1, 0, Z1 + 3, -1, W, Z1 + 3, twin(frame));
  // heaped to the brim and over: blankets in dull colours, folded in lumps
  const tan = '#9b8c74', slate = '#6f7480', moss = '#7b7a5c';
  chamfer(v, 1, 1, 5, L - 1, W - 1, 10, 0, tan);
  chamfer(v, 0, 0, 11, 10, W, 12, 3, slate);                      // a blanket heaped over the brim
  chamfer(v, 1, 1, 13, 8, W - 1, 13, 3, slate);
  chamfer(v, 7, 0, 11, L - 1, 7, 11, 2, moss);
  v.box(1, W + 1, 8, 5, W + 1, 11, twin(slate));                  // its corner hanging over the side
  v.box(2, W + 1, 7, 4, W + 1, 7, twin(slate));
  // the blue bag on top of the heap, its handles up
  const bag = '#2e5aa8', handle = twin('#2e5aa8');
  chamfer(v, 2, 3, 14, 6, 7, 16, 1, bag);
  v.box(3, 5, 17, 3, 5, 18, handle); v.box(5, 5, 17, 5, 5, 18, handle); v.set(4, 5, 18, handle);
  // the plastic flamingo standing at the front, its neck up, the arrow through its head
  const pink = '#ef7fb3', deep = '#d86598', shaft = '#8a5a32', vane = '#d9d2c2', head = '#7c858e';
  chamfer(v, 9, 3, 12, 14, 6, 14, 1, pink);                       // the body, tail back
  v.box(8, 4, 14, 8, 5, 14, deep);                                // the tail tip
  v.box(13, 4, 15, 13, 5, 18, pink);                              // the neck
  v.box(12, 4, 19, 14, 5, 20, pink);                              // the head
  v.box(15, 4, 19, 15, 5, 19, deep); v.set(16, 4, 18, deep); v.set(16, 5, 18, deep);   // the beak, curving down
  for (let y = 6; y <= 10; y++) v.set(13, y, y >= 9 ? 21 : 20, shaft);   // the arrow, out of its head to the front
  v.set(13, 3, 20, head);                                         // its point through the far side
  v.box(12, 10, 21, 14, 10, 21, vane); v.box(13, 10, 20, 13, 10, 22, vane);
  return v;
}

/* ---- the gift in the cardboard box ----
   1:43 "a brand-new pair of Bates zip-up tactical boots. They were identical to
   the service boots I wore on active duty." The colour is never given, so a
   plain dark leather; zip-up, so a zip down the side that is seen; laces down
   the front and a pull tab at the back, as service boots have. A pair in profile,
   toes to +x, the near one's side on the lit face. The box and the socks are the
   wrapping, left out. */
function boot(v: Vox, x0: number, y0: number) {
  const leather = '#4f3e31', cap = twin('#4f3e31'), sole = '#242428', tread = '#3a3a40', zip = '#a4abb6', lace = '#2c2622';
  const Y = y0 + 3;
  // the chunky sole, a heel at the back, the toe rounded up
  v.box(x0, y0, 0, x0 + 10, Y, 1, sole);
  for (let x = x0 + 1; x <= x0 + 9; x += 2) v.box(x, y0, 0, x, Y, 0, tread);
  v.clear(x0 + 4, y0, 0, x0 + 5, Y, 0);                         // the arch between heel and tread
  // the foot, the toe cap rounded
  v.box(x0, y0, 2, x0 + 9, Y, 4, leather);
  v.box(x0 + 7, y0, 2, x0 + 10, Y, 3, cap); v.box(x0 + 7, y0, 4, x0 + 8, Y, 4, cap);
  v.set(x0 + 10, y0, 3, null); v.set(x0 + 10, Y, 3, null);
  // the tall shaft
  v.box(x0, y0, 5, x0 + 4, Y, 13, leather);
  v.box(x0 + 5, y0, 5, x0 + 6, Y, 6, leather);                     // the instep
  // the laces, crossing down the front of the shaft and over the instep
  for (let z = 6; z <= 13; z += 2) v.box(x0 + 5, y0 + 1, z, x0 + 5, Y - 1, z, lace);
  v.box(x0 + 7, y0 + 1, 5, x0 + 7, Y - 1, 5, lace);
  // the top rim, and the pull tab at the back
  v.box(x0, y0, 13, x0 + 4, Y, 13, cap);
  v.box(x0 - 1, y0 + 1, 11, x0 - 1, Y - 1, 14, cap);
  // the zip, down the side that faces the light
  v.box(x0 + 2, Y, 4, x0 + 2, Y, 12, zip); v.set(x0 + 2, Y + 1, 12, zip);
}
function serviceBoots(): Vox {
  const v = fresh();
  boot(v, 2, 0);                                                  // the far one, a little ahead
  boot(v, 0, 5);
  return v;
}

/* ---- the boss box's boxers ----
   1:35 "a white pair of boxers covered in little red hearts". Standing as if hung
   on a line, the front to +y, the hearts printed on the cloth. */
const HEART = ['##.##', '#####', '.###.', '..#..'];
function heartBoxers(): Vox {
  const v = fresh();
  const white = '#f1ece4', band = '#d9d2c7', hem = twin('#f1ece4'), red = '#c8261c';
  const W = 14, D = 1;
  v.box(0, 0, 11, W - 1, D, 12, band);                            // the elastic waistband
  v.box(0, 0, 6, W - 1, D, 10, white);                            // the seat
  v.box(-1, 0, 0, 6, D, 5, white); v.box(7, 0, 0, W, D, 5, white);   // the two wide legs, splayed
  v.clear(5, 0, 0, 8, D, 2); v.clear(6, 0, 3, 7, D, 4);           // the gap up between them to the crotch
  v.box(-1, 0, 0, 4, D, 0, hem); v.box(9, 0, 0, W, D, 0, hem);    // their hems
  v.box(0, D, 10, W - 1, D, 10, hem);                             // the seam under the band
  v.box(6, D, 6, 6, D, 9, hem);                                   // the fly
  // the little hearts, printed all over the front, and a few round the side
  const print = (x: number, z: number) => face(v, x, D, z, HEART, c => (c === '#' ? red : null));
  for (const [x, z] of [[-1, 1], [9, 1], [0, 6], [8, 6]] as const) print(x, z);
  v.set(W - 1, 0, 8, red); v.set(W, 0, 3, red); v.set(W, 1, 1, red);
  return v;
}

/* ---- the borrowed sandals ----
   1:1 "a pair of pink Crocs sandals that barely fit me." The noun's own shape: a
   rubber clog, a rounded toe box with holes on top, a strap round the heel from a
   rivet at each side. A pair in profile, toes to +x. */
function clog(v: Vox, x0: number, y0: number) {
  const pink = '#f08cc0', sole = '#e27bb0', bed = '#cf6c9c', strap = '#e884b8', hole = '#b0507d', rivet = '#f7bcd9';
  const Y = y0 + 5;
  chamfer(v, x0, y0, 0, x0 + 11, Y, 1, 2, sole);                  // the thick sole
  // the open back: the footbed in a shallow heel cup
  v.box(x0 + 1, y0, 2, x0 + 5, Y, 2, pink);
  v.box(x0 + 1, y0 + 1, 2, x0 + 5, Y - 1, 2, bed);
  v.box(x0, y0 + 1, 2, x0, Y - 1, 2, pink);
  // the big rounded toe box, domed on top, holes in rows over it
  chamfer(v, x0 + 5, y0, 2, x0 + 11, Y, 4, 2, pink);
  chamfer(v, x0 + 6, y0, 5, x0 + 10, Y, 5, 2, pink);
  chamfer(v, x0 + 7, y0 + 1, 6, x0 + 9, Y - 1, 6, 1, pink);
  for (const [x, y, z] of [[x0 + 8, y0 + 2, 6], [x0 + 8, y0 + 4, 6], [x0 + 6, y0 + 1, 5], [x0 + 6, Y - 1, 5], [x0 + 10, y0 + 2, 5], [x0 + 10, Y - 2, 5]] as const) v.set(x, y, z, hole);
  for (const x of [x0 + 7, x0 + 9]) v.set(x, Y, 3, hole);
  // the strap: from a rivet high at each side, down and round behind the heel
  for (const y of [y0, Y]) { v.set(x0 + 6, y, 4, rivet); v.set(x0 + 5, y, 3, strap); v.box(x0 + 1, y, 3, x0 + 4, y, 3, strap); }
  v.box(x0 - 1, y0 + 1, 2, x0 - 1, Y - 1, 3, strap); v.set(x0, y0, 3, strap); v.set(x0, Y, 3, strap);
}
function clogs(): Vox {
  const v = fresh();
  clog(v, 3, 0);                                                  // the far one, a little ahead
  clog(v, 0, 7);
  return v;
}

/* ---- two rings of constitution ----
   1:9 "a silver ring I found in the silver box". 1:19 "another ring of
   constitution", never described: the plain ring, beside the first. */
const SILVER = '#c8ccd4';
function ringPair(): Vox {
  const v = fresh();
  stamp(v, ring(), 6, 0, 2);                                      // the second, behind
  stamp(v, ring({ metal: SILVER }), 0, 4, 0);
  return v;
}

/* ---- the foot-care kit ----
   1:30 "a little black folder with a zipper. I zipped it open, revealing
   multiple, miniature tools"; its description gives "12 essential items",
   "from a pumice stone to a cuticle pusher". Shown open, the lid standing at the
   back with six tools in its loops, six more in the tray; the tools' metal is
   never named, so a plain one, the pumice its own pale stone. */
function footKit(): Vox {
  const v = fresh();
  const black = '#27262c', lining = '#3d3c45', teeth = '#6c6d77', pull = '#b3b7bd';
  const steel = '#b3b7bd', dark = '#7c858e', pumice = '#c2baa8', pore = '#a39b8a', loop = '#1d1c21';
  const W = 14, D = 8;
  // the tray: the bottom half lying flat, a zip round its rim
  v.box(0, 0, 0, W - 1, D, 1, black);
  v.box(1, 1, 1, W - 2, D - 1, 1, lining);
  for (let x = 0; x < W; x++) for (const y of [D]) v.set(x, y, 2, x % 2 ? teeth : black);
  for (let y = 1; y <= D; y++) { v.set(0, y, 2, y % 2 ? teeth : black); v.set(W - 1, y, 2, y % 2 ? teeth : black); }
  v.set(W, D, 2, pull); v.set(W + 1, D, 2, pull);                 // the zip's pull
  // the lid, standing open at the back, its lining facing the light
  v.box(0, -1, 2, W - 1, 0, 11, black);
  v.box(1, 1, 3, W - 2, 1, 10, lining);
  for (let x = 0; x < W; x++) v.set(x, 1, 11, x % 2 ? teeth : black);
  for (let z = 3; z <= 10; z++) { v.set(0, 1, z, z % 2 ? teeth : black); v.set(W - 1, 1, z, z % 2 ? teeth : black); }
  // six standing in the lid's loops, the pumice stone among them; the rest are never named, so plain shapes
  const tools: { x: number; z0: number; z1: number; tip: [number, number][] }[] = [
    { x: 2, z0: 4, z1: 10, tip: [] },                              // a long one
    { x: 4, z0: 4, z1: 8, tip: [[3, 9], [5, 9], [4, 9]] },         // one with a wider head
    { x: 6, z0: 4, z1: 9, tip: [[6, 10]] },                        // the cuticle pusher, its flat end
    { x: 8, z0: 5, z1: 9, tip: [[9, 9]] },                         // one with a bent tip
    { x: 10, z0: 4, z1: 9, tip: [[10, 10]] },                      // a short one
  ];
  for (const t of tools) {
    v.box(t.x, 2, t.z0, t.x, 2, t.z1, steel);
    for (const [x, z] of t.tip) v.set(x, 2, z, dark);
  }
  v.box(11, 2, 5, 12, 2, 8, pumice); v.set(11, 2, 6, pore); v.set(12, 2, 7, pore);   // the pumice stone
  v.box(1, 3, 6, W - 2, 3, 6, loop);                              // the elastic loop holding them
  // six more lying in the tray, heads to the front
  for (const x of [2, 4, 6, 8, 10]) {
    v.box(x, 2, 2, x, D - 2, 2, steel);
    v.set(x, D - 1, 2, x % 4 ? dark : steel);
  }
  v.box(12, 2, 2, 12, 4, 2, dark); v.set(12, 5, 2, steel);         // and a short one
  v.box(1, 4, 3, W - 2, 4, 3, loop);
  return v;
}

/* ---- the first armour of the cat ----
   1:19 "the silver, scale armor appeared draped over the back half of her body.
   It reached about halfway down to the floor... It was like a skirt, almost,
   though it didn't cover her stomach. It had a slot especially for her tail."
   1:33 it "poofed out like a skirt". A shell of silver scales, open underneath,
   its sides flaring at the hem, the rump to -x with the slot for the tail down its
   top, the scales in the figure's own two tones. */
function scaleSkirt(): Vox {
  const v = fresh();
  const hi = '#c9cdd6', mid = '#a3a8b3', lo = '#8a8f9a';
  const L = 13, W = 11, T = 7, XR = 5;
  const cy = (W - 1) / 2;
  // a long, low shell: round across the back and round down over the rump (at -x), open at the
  // front (+x), where the rest of the cat comes out, and open underneath
  const e = (x: number, y: number, z: number, k: number) => {
    const ry = W / 2 + 0.4 + (z <= 1 ? 0.7 : 0) - k, rx = XR + 0.5 - k, rz = T + 0.5 - k;
    return Math.hypot(x < XR ? (XR - x) / rx : 0, (y - cy) / ry, z / rz);
  };
  for (let x = 0; x <= L; x++) for (let y = -2; y <= W + 1; y++) for (let z = 0; z <= T; z++) {
    if (e(x, y, z, 0) > 1 || e(x, y, z, 1.2) <= 1) continue;
    // the scales, in two tones a scale at a time, the way the figure wears them
    const s = z >= T - 1 ? y : z;
    v.set(x, y, z, ((x >> 1) + (s >> 1)) % 2 ? hi : mid);
  }
  // the hem: every other scale hangs one lower, so it falls like a skirt
  for (let x = 0; x <= L; x++) for (let y = -2; y <= W + 1; y++) if (v.has(x, y, 0) && (x + y) % 2 === 0) v.set(x, y, -1, lo);
  // the slot for the tail, down the top of the rump
  v.clear(-1, cy, 3, 2, cy, T + 1);
  return v;
}

/* ---- the cat's first bracelet ----
   1:25 "it wrapped snuggly around her front leg"; 2:6 "I could barely see it
   through all the fur". No colour or shape beyond a slim bracelet: a plain grey
   metal bangle, thinner and wider than a ring, a little open to the light. */
function bangle(): Vox {
  const v = fresh();
  const metal = '#a4abb6', inner = twin('#a4abb6'), shine = '#d3d7dd';
  const c = 7, R = 6.6;
  for (let x = 0; x <= 2 * c; x++) for (let z = 0; z <= 2 * c; z++) {
    const d = Math.hypot(x - c, z - c);
    if (d <= R && d >= R - 1.5) for (let y = 0; y <= 3; y++) v.set(x, y, z, y === 3 ? metal : inner);
  }
  for (const [x, z] of [[2, 10], [3, 11], [1, 8]] as const) if (v.has(x, 3, z)) v.set(x, 3, z, shine);
  return v;
}

/* ---- the cat's scratch-off ticket ----
   1:39 "a lottery scratch-off ticket", "red and green and had a small graphic of
   a troll-like creature throwing gold coins in the air... She had six spots to
   scratch off"; "the little cardboard ticket". Upright, a green border round a red
   field, the creature with its arms up under a spray of coins, the six spots
   below it in the plain grey a scratch-off is coated with. */
const CREATURE = [
  'o..o..o.',
  '.o....o.',
  '#.##.#.#',
  '.######.',
  '..####..',
  '..#..#..',
];
function scratchTicket(): Vox {
  const v = fresh();
  const red = '#c22a22', green = '#2f8f3a', beast = '#1f5f2a', gold = '#e8b923', spot = '#b9bcc2', back = twin('#c22a22');
  const W = 11, H = 15;
  for (let x = 0; x <= W; x++) for (let z = 0; z <= H; z++) {
    if ((x === 0 || x === W) && (z === 0 || z === H)) continue;
    const rim = x === 0 || x === W || z === 0 || z === H;
    v.set(x, 1, z, rim ? green : red);
    v.set(x, 0, z, back);
  }
  face(v, 2, 2, 8, CREATURE, c => (c === '#' ? beast : c === 'o' ? gold : null));
  for (const x of [2, 5, 8]) for (const z of [2, 5]) v.box(x, 2, z, x + 1, 2, z + 1, spot);
  return v;
}

/* ---- the cat's enchanted brush ----
   1:35 "an Enchanted Fur Brush", the noun and no more (7:56 says it "looked like
   a regular hairbrush"). A plain paddle brush standing on its handle, the
   bristles to the light, in a plain wood with a plain dark pad. */
function furBrush(): Vox {
  const v = fresh();
  const wood = '#8a5a32', grain = twin('#8a5a32'), pad = '#3a3940', pin = '#ddd7ca', knob = '#f1ede2';
  chamfer(v, 3, 0, 0, 5, 2, 8, 1, wood);                          // the handle
  v.box(3, 0, 2, 5, 2, 2, grain);
  panel(v, 0, 0, 9, 8, 2, 19, 3, wood);                           // the paddle
  panel(v, 1, 3, 10, 7, 3, 18, 3, pad);                           // the cushion
  for (let x = 1; x <= 7; x++) for (let z = 10; z <= 18; z++) {
    if ((x + z) % 2 || !v.has(x, 3, z)) continue;
    v.set(x, 4, z, pin); v.set(x, 5, z, knob);                    // the bristles, each with its knob
  }
  return v;
}

/* ---- the cloak from the demon's wing ----
   1:6 "The black, leathery, and hooded nightgaunt cloak... made from the wing of
   some sort of demon creature. The skin was stretched between rows of long,
   body-length fingerbones. When I put the hood up, I noticed it had pointed ear
   things on either side"; "a dollar store Batman". Hung from its hood and seen
   from behind, the skin falling in scallops between the bones, the hood up with
   its two points. The bones are the figure's: ridges a shade lighter than the skin. */
function wingCloak(): Vox {
  const v = fresh();
  const skin = '#332e3a', rib = '#5a5365', inside = twin('#332e3a');
  const C = 7, TOP = 14;
  const RIBS = [-1, -0.5, 0, 0.5, 1];
  for (let z = 0; z <= TOP; z++) {
    const w = 7.5 - (z / TOP) * 4;                                // narrow at the shoulders, wide at the hem
    for (let x = Math.round(C - w); x <= Math.round(C + w); x++) {
      const u = Math.max(-1, Math.min(1, (x - C) / w));
      // the hem: down to the bottom at each bone, up in an arc between two
      const k = (u + 1) * 2, f = k - Math.floor(k);
      if (z < Math.round(2.4 * Math.sin(Math.PI * f))) continue;
      const yf = 2 - Math.round(u * u);                             // it hangs round, its edges a little back
      const onRib = z <= TOP - 2 && RIBS.some(r => Math.abs(u - r) * w < 0.5);
      v.set(x, yf - 1, z, inside);
      v.set(x, yf, z, onRib ? rib : skin);
    }
  }
  // the hood, up, a rounded shell with a point to each side
  chamfer(v, 4, -1, TOP + 1, 10, 3, TOP + 4, 2, skin);
  chamfer(v, 5, 0, TOP + 5, 9, 2, TOP + 5, 1, skin);
  for (const x of [4, 10]) { v.box(x, 1, TOP + 4, x, 1, TOP + 6, skin); v.set(x, 1, TOP + 7, rib); }
  v.box(4, 3, TOP + 1, 10, 3, TOP + 1, twin(skin));              // the hood's edge over the shoulders
  return v;
}

/* ---- a set of throwing stars ----
   1:25 "a pile of ninja stars", a hundred: "the same black stars you wannabe
   ninjas purchased at the knife shop". Four-pointed, holed in the middle, black
   metal with its ground edges catching the light: one standing up in front of a
   few lying in a pile. */
function star(v: Vox, R: number, turned: boolean, set: (a: number, b: number, m: string) => void) {
  const black = '#2c2b32', edge = '#3e414b';
  const inside = (a: number, b: number) => {
    const p = turned ? (a - b) / Math.SQRT2 : a, q = turned ? (a + b) / Math.SQRT2 : b;
    return !(a === 0 && b === 0) && Math.abs(p) ** 0.72 + Math.abs(q) ** 0.72 <= R ** 0.72;
  };
  for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) {
    if (!inside(a, b)) continue;
    const rim = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([p, q]) => !inside(a + p, b + q) && !(a + p === 0 && b + q === 0));
    set(a, b, rim ? edge : black);
  }
}
function throwingStars(): Vox {
  const v = fresh();
  // three of the hundred, standing one before another, the front one facing the light
  const stand = (cx: number, y: number, cz: number) => star(v, 6, false, (a, b, m) => { v.set(cx + a, y, cz + b, m); v.set(cx + a, y - 1, cz + b, twin(m)); });
  stand(4, 4, 11);
  stand(12, 6, 10);
  stand(8, 11, 7);
  return v;
}

export const ITEMS_B1A: Record<string, Record<string, () => Vox>> = {
  'agathas-shopping-cart': { heaped: cart },
  'bates-tactical-boots': { pair: serviceBoots },
  'bigboi-boxers': { hearts: heartBoxers },
  'pink-crocs': { pair: clogs },
  'carls-constitution-rings': { one: () => ring({ metal: SILVER }), pair: ringPair },
  'pedicure-kit-of-sylph': { open: footKit },
  'cheat-code-potion': { plain: () => potion() },
  'scroll-of-confusing-fog': { plain: () => scroll() },
  'crupper-of-fleet': { scale: scaleSkirt },
  'donuts-dexterity-bracelet': { plain: bangle },
  'dungeon-gold-rush-ticket': { unscratched: scratchTicket },
  'fur-brush-of-ecclesiastic': { plain: furBrush },
  'nightgaunt-cloak-of-stoutness': { hooded: wingCloak },
  'shuriken-of-bloodlust': { stars: throwingStars },
};
