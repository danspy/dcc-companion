import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { chamfer } from './itemparts.ts';

/* ---- items, set b ----
   Drawn the way the anchor set in items.ts is: one object, floating, smooth
   (chunk 0), facing +y, z up, from the edition's own description at its point.
   Plain colours where the book is silent. Shapes and colours only. */

/** a block with its edges in the x-z plane cut back: something standing up and facing +y */
function chamferXZ(v: Vox, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, cut: number, m: string | null) {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const dx = Math.min(x - x0, x1 - x), dz = Math.min(z - z0, z1 - z);
    if (dx + dz >= cut) for (let y = y0; y <= y1; y++) v.set(x, y, z, m);
  }
}

/* 3:7 the prize carousel's sixth book, "similar to the last" (that one "small,
   and leather-bound") "but the book was much thicker, about the size of a large
   dictionary". No title on the cover, "but it did have a symbol... the familiar A
   in a circle", and a glint "off the gold-leafed pages". It stands on its tail,
   the cover to +y and the spine to -x, so the gilt shows along the top and the
   fore-edge. The leather's colour is never given: a plain brown, the symbol
   tooled dark into it. */
const ANARCHY = [
  '.....#.....',
  '...#####...',
  '.##.#.#.##.',
  '.#.#...#.#.',
  '#..#...#..#',
  '#..#...#..#',
  '#.#.....#.#',
  '#.#######.#',
  '#.#.....#.#',
  '.#.......#.',
  '.##.....##.',
  '.#.#####.#.',
  '#.........#',
];
function anarchyTome(): Vox {
  const v = new Vox(); v.chunk = 0;
  const leather = '#6e4023', tooled = '#2a160c', gilt = '#d9a93a', giltShade = '#b98a2c';
  const W = 12, T = 6, H = 15;              // across, thick, tall
  // the gold-leafed page block, set back inside the boards
  v.box(1, 1, 1, W - 1, T - 1, H - 2, gilt);
  for (let z = 3; z <= H - 3; z += 3) v.box(W - 1, 1, z, W - 1, T - 1, z, giltShade);   // a line of the leaves on the fore-edge
  // the boards, front and back, a lip proud of the pages on three sides
  v.box(0, T, 0, W, T, H - 1, leather);
  v.box(0, 0, 0, W, 0, H - 1, leather);
  // the spine, rounded out past the boards
  v.box(0, 0, 0, 0, T, H - 1, leather);
  v.box(-1, 1, 1, -1, T - 1, H - 2, leather);
  // the circled A, tooled into the front board
  ANARCHY.forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') v.set(i + 1, T, H - 2 - j, tooled); }));
  return v;
}

/* 3:19 left on the bar: "a magical ring. Green glass with a red jewel. It glowed
   with enchantment." It stands up, the band facing +y and the jewel on top. No red
   that glows is in the palette, so the glow is left to the glass's own shine. */
function divineRing(): Vox {
  const v = new Vox(); v.chunk = 0;
  const glass = '#3f9a5a', shine = '#9fe0b2', deep = '#2b6e40', jewel = '#c22a22', facet = '#e8574a', spark = '#ffb0a3';
  const setting = twin('#3f9a5a');
  // the band: a chamfered square ring, two thick and two deep
  chamferXZ(v, 0, 0, 0, 11, 1, 11, 3, glass);
  chamferXZ(v, 2, 0, 2, 9, 1, 9, 2, null);
  // glass: a shine along its upper left, the light gathering dark along the lower right
  for (const [x, z] of [[0, 5], [0, 6], [1, 7], [1, 8], [2, 9]] as const) v.set(x, 1, z, shine);
  for (const [x, z] of [[10, 4], [10, 3], [9, 2], [8, 1]] as const) v.set(x, 1, z, deep);
  // the setting on top of the band, and the red jewel in it, proud front and back
  chamfer(v, 3, -1, 11, 8, 2, 12, 1, setting);
  chamfer(v, 3, -1, 13, 8, 2, 14, 2, jewel);
  chamfer(v, 4, 0, 15, 7, 1, 15, 1, facet);
  v.set(4, 2, 14, spark); v.set(5, 1, 15, spark);
  return v;
}

/* 3:29 the benefactor box's "single, small item": "It was a crossbow bolt." The
   book says nothing more of it, so it is a plain one: a wooden shaft, a grey
   head, short dull vanes. It lies along y, its point to +y, where it is seen. */
function deityBolt(): Vox {
  const v = new Vox(); v.chunk = 0;
  const shaft = '#8a5a32', head = '#8c939b', edge = '#c5cad0', vane = '#b3a891', nock = '#5c3a20';
  const L = 21;
  v.box(4, 1, 4, 5, L - 7, 5, shaft);
  v.box(4, 0, 4, 5, 0, 5, nock);
  // the head: a flat blade, barbed at the back and tapering to the point
  v.box(4, L - 6, 4, 5, L - 6, 5, head);
  v.box(2, L - 5, 4, 7, L - 4, 5, head);
  v.box(3, L - 3, 4, 6, L - 2, 5, head);
  v.box(4, L - 1, 4, 5, L, 5, head);
  v.set(4, L, 5, edge); v.set(4, L - 1, 5, edge); v.set(3, L - 2, 5, edge); v.set(2, L - 4, 5, edge);
  // the fletching: vanes out to either side and a short one on top, broadest at the back
  [3, 3, 2, 2, 1].forEach((h, i) => {
    const y = i + 1;
    v.box(6, y, 5, 5 + h, y, 5, vane); v.box(4 - h, y, 5, 3, y, 5, vane);
    if (i < 4) v.box(4, y, 6, 5, y, 6 + (i < 2 ? 1 : 0), twin(vane));
  });
  return v;
}

/* 3:30 the room's housekeeping upgrade: "a frisbee-shaped robot, similar to the
   Mexx-class robots... basically a flying Roomba", humming about the room,
   "blinking disdainfully at the mess". Its colour is never given (the white one
   of 7:68 is "the same model as our own—but painted solid white", so not white);
   it takes the plain dark metal of the frisbee robots it is likened to, whose
   one blue light flashes on the edge (1:41). The blink is that light. */
function cleanerDisc(): Vox {
  const v = new Vox(); v.chunk = 0;
  const under = '#3a3f46', rim = '#4d535b', top = '#6b737c', cap = twin('#6b737c');
  const D = 13;
  chamfer(v, 2, 2, 0, D - 3, D - 3, 0, 3, under);
  chamfer(v, 0, 0, 1, D - 1, D - 1, 2, 4, rim);
  chamfer(v, 1, 1, 3, D - 2, D - 2, 3, 4, top);
  chamfer(v, 3, 3, 4, D - 4, D - 4, 4, 3, cap);
  // the one light, on the edge it faces with
  v.set(5, D - 1, 2, 'portal'); v.set(6, D - 1, 2, 'portal'); v.set(7, D - 1, 2, 'portal');
  return v;
}

/* 4:4 built at the engineering and metalworking tables: "nothing more than a
   glorified, oversized ATV", the metal tires given up for "a wide, treadmill
   track, like on the back of a snowmobile", "two, steerable wheels in the front"
   of rubber, no roll cage, and the second seat "higher than hers" that "could
   swivel". The optional wagon is left off. Its metal is never coloured: a plain
   grey. Drawn as a chibi of itself in profile, its nose to +x and its left side
   to the lit +y face, where the track and the wheels are seen.
   4:9 "a four-chamber missile tube to the right of my seat", swinging up and down
   on a handle at its side: it sits up beside the raised seat, its mouths forward. */
function duneBuggy(armed: boolean): Vox {
  const v = new Vox(); v.chunk = 0;
  const body = '#646d76', cowl = '#4d545b', tread = '#2b2e32', lug = '#40454b', road = '#8d949c', rubber = '#232326', hub = '#a4abb6';
  const seat = '#3b3530', post = '#4f555c';
  // drawn in the vehicle's own terms: f forward from the tail, s across from its left, z up
  const S = 11;
  const at = (f: number, s: number): [number, number] => [f, S - s];   // nose to +x, its left side to +y
  const box = (f0: number, s0: number, z0: number, f1: number, s1: number, z1: number, m: string | null) => {
    for (let f = Math.min(f0, f1); f <= Math.max(f0, f1); f++) for (let s = Math.min(s0, s1); s <= Math.max(s0, s1); s++)
      for (let z = z0; z <= z1; z++) { const [x, y] = at(f, s); v.set(x, y, z, m); }
  };
  /** rounded in the side view: a wheel, a track's ends */
  const side = (f0: number, s0: number, z0: number, f1: number, s1: number, z1: number, cut: number, m: string) => {
    for (let f = f0; f <= f1; f++) for (let z = z0; z <= z1; z++)
      if (Math.min(f - f0, f1 - f) + Math.min(z - z0, z1 - z) >= cut) box(f, s0, z, f, s1, z, m);
  };
  /** rounded seen from above */
  const top = (f0: number, s0: number, z0: number, f1: number, s1: number, z1: number, cut: number, m: string) => {
    for (let f = f0; f <= f1; f++) for (let s = s0; s <= s1; s++)
      if (Math.min(f - f0, f1 - f) + Math.min(s - s0, s1 - s) >= cut) box(f, s, z0, f, s, z1, m);
  };
  // the wide track under the back: a loop of tread, ridged, its toothed wheels showing on the sides
  side(0, 2, 0, 9, 9, 5, 2, tread);
  for (let f = 1; f <= 8; f += 2) { box(f, 2, 0, f, 9, 0, lug); box(f, 2, 5, f, 9, 5, lug); }
  for (const f of [1, 4, 7]) for (const s of [2, 9]) { box(f, s, 2, f + 1, s, 3, road); }
  // the two rubber wheels in front, big and fat, out on either side, a fender over each
  for (const s of [0, 10]) {
    side(10, s, 0, 17, s + 1, 7, 3, rubber);
    const out = s === 0 ? 0 : 11;
    box(13, out, 3, 14, out, 4, hub);
    box(11, s, 8, 16, s + 1, 8, body); box(10, s, 7, 10, s + 1, 7, body); box(17, s, 7, 17, s + 1, 7, body);
  }
  // the body over the track and between the wheels, the engine cowled in front
  box(0, 2, 6, 17, 9, 6, body);
  top(12, 3, 7, 17, 8, 8, 2, cowl);
  box(18, 3, 5, 18, 8, 6, post);                                // the bumper
  // the handlebars, and the driver's saddle behind them
  box(12, 5, 9, 12, 6, 9, post);
  box(12, 1, 10, 12, 10, 10, post);
  box(12, 1, 10, 12, 1, 11, rubber); box(12, 10, 10, 12, 10, 11, rubber);
  top(6, 3, 7, 11, 8, 7, 1, seat);
  // the second seat, raised on its swivel post so it sees over the driver
  box(2, 5, 7, 3, 6, 9, post);
  top(1, 3, 10, 5, 8, 10, 1, seat);
  box(1, 3, 11, 1, 8, 13, twin(seat));
  if (armed) {
    // the four-chamber tube at the seat's right, four mouths to the front
    const tube = '#4a5058';
    box(0, 9, 11, 7, 10, 12, tube);
    box(7, 9, 11, 7, 10, 12, 'black');
    box(3, 9, 10, 3, 9, 10, post);                              // its mount
    box(2, 11, 11, 2, 11, 12, rubber);                          // the handle at its side
  }
  return v;
}

/* 4:15 the quest: the artifact is in pieces, two watches and a box. 4:17 the
   watch: "the bronze watch", "identical to the other one", "the tab on top of
   the watch". 4:21 the box: "a thick, wooden case with a
   glass window", "the dark wood of the box felt old", like "a humidor or a large
   music box"; inside "two little knobs and two round cutouts, one for each
   watch". Shown open, the lid with its window standing at the back, the two
   watches in their cutouts.
   7:87 "the now-broken, blood-soaked winding box", made into the permanent portal
   into the Nothing: the lid gone, a corner broken out, and nothing but dark inside. */
function windingBox(broken: boolean): Vox {
  const v = new Vox(); v.chunk = 0;
  const wood = '#4a2c18', lid = twin('#4a2c18'), lining = '#2a1a10', bronze = '#b07a3a', face = '#ddd0b0', mark = '#9a8a6a', hand = '#2a2420', knob = '#8c939b';
  const W = broken ? 15 : 16, D = 10;
  chamfer(v, 0, 0, 0, W - 1, D - 1, 4, 1, wood);
  if (!broken) {
    // the tray, two round cutouts and the bronze watches in them, face up
    v.box(1, 1, 4, W - 2, D - 2, 4, lining);
    for (const cx of [4, 11]) {
      const cy = 5;
      for (let x = cx - 3; x <= cx + 3; x++) for (let y = cy - 3; y <= cy + 3; y++) {
        const r = Math.hypot(x - cx, y - cy);
        if (r <= 3.2) v.set(x, y, 4, r <= 2.3 ? face : bronze);
      }
      // the hour marks, and the hands from the middle to twelve and to four
      for (const [dx, dy] of [[0, -2], [2, 0], [0, 2], [-2, 0]] as const) v.set(cx + dx, cy + dy, 4, mark);
      v.set(cx, cy, 4, hand); v.set(cx, cy - 1, 4, hand); v.set(cx + 1, cy + 1, 4, hand);
      v.set(cx, cy - 4, 4, bronze);                               // the tab on top
    }
    v.set(7, 3, 5, knob); v.set(8, 7, 5, knob);                   // the two little knobs
    // the lid, open, standing at the back: a frame round its glass window
    v.box(0, -1, 5, W - 1, 0, 11, lid);
    v.box(2, 0, 7, W - 3, 0, 10, 'glass');
    v.clear(2, -1, 7, W - 3, -1, 10);
    v.box(2, -1, 7, W - 3, -1, 10, 'glass');
    return v;
  }
  // broken: the lid gone, the inside open onto the dark
  v.clear(2, 2, 2, W - 3, D - 3, 4);
  v.box(2, 2, 2, W - 3, D - 3, 2, 'void');
  // a corner broken out of the front, splintered pale where it broke
  const fresh = '#7a5232';
  v.clear(W - 4, D - 3, 1, W - 1, D - 1, 4); v.clear(W - 2, D - 5, 2, W - 1, D - 3, 4);
  for (const [x, y, z] of [[W - 5, D - 1, 4], [W - 5, D - 1, 3], [W - 3, D - 4, 1], [W - 2, D - 6, 4], [W - 1, D - 6, 3]] as const) v.set(x, y, z, fresh);
  v.set(W - 5, D - 1, 5, fresh); v.set(W - 1, D - 6, 5, fresh);
  // a split down the back wall
  v.clear(5, 0, 3, 5, 1, 4);
  // soaked in blood: over the rim and down the front
  const blood = '#7d1b17', wet = '#a3221b';
  for (const [x, y, z] of [[1, D - 1, 4], [2, D - 1, 4], [2, D - 1, 3], [3, D - 1, 4], [3, D - 1, 3], [3, D - 1, 2], [3, D - 1, 1], [6, D - 1, 4], [7, D - 1, 4], [7, D - 1, 3], [0, 3, 4], [0, 4, 4], [0, 4, 3], [0, 5, 4], [1, 1, 4], [4, 0, 4], [8, 1, 4], [9, 1, 4]] as const) v.set(x, y, z, blood);
  for (const [x, y, z] of [[2, D - 2, 4], [1, 2, 4], [8, 0, 4], [7, D - 2, 4]] as const) v.set(x, y, z, wet);
  return v;
}

/* 4:14 in the impostor's hand: "a round, spiked ball", and in the inventory Carl
   checks "the pin hadn't yet been yanked free". It fits in a hand; its metal is
   never coloured, so a plain dark grey with lighter spikes, the pin's ring on top. */
function spikedGrenade(): Vox {
  const v = new Vox(); v.chunk = 0;
  const ball = '#5d636b', spike = '#a4abb6', pin = '#c9ccd1';
  // the ball, built from chamfered blocks so it reads round
  chamfer(v, 2, 2, 0, 7, 7, 0, 2, ball);
  chamfer(v, 1, 1, 1, 8, 8, 1, 2, ball);
  chamfer(v, 0, 0, 2, 9, 9, 6, 3, ball);
  chamfer(v, 1, 1, 7, 8, 8, 7, 2, ball);
  chamfer(v, 2, 2, 8, 7, 7, 8, 2, ball);
  // the spikes, standing straight out of every face
  const stud = (x: number, y: number, z: number, dx: number, dy: number, dz: number) => {
    v.set(x + dx, y + dy, z + dz, spike); v.set(x + 2 * dx, y + 2 * dy, z + 2 * dz, spike);
  };
  for (const [i, j] of [[3, 2], [6, 2], [3, 6], [6, 6]] as const) {
    stud(i, 9, j, 0, 1, 0); stud(9, i, j, 1, 0, 0); stud(i, 0, j, 0, -1, 0); stud(0, i, j, -1, 0, 0);
  }
  for (const [x, y] of [[3, 3], [6, 6], [3, 6], [6, 3]] as const) { stud(x, y, 8, 0, 0, 1); stud(x, y, 0, 0, 0, -1); }
  // the diagonal faces get one each, stepped out from the corner
  for (const [x, y, dx, dy] of [[8, 8, 1, 1], [1, 8, -1, 1], [8, 1, 1, -1], [1, 1, -1, -1]] as const) {
    for (const z of [3, 5]) { v.set(x + dx, y, z, spike); v.set(x + dx, y + dy, z, spike); }
  }
  // the pin: a short stem through the top and its pull ring
  v.box(4, 4, 9, 5, 5, 10, spike);
  v.box(4, 5, 11, 5, 5, 11, pin);
  v.box(6, 5, 11, 8, 5, 11, pin); v.box(8, 5, 12, 8, 5, 14, pin); v.box(5, 5, 14, 7, 5, 14, pin); v.box(5, 5, 12, 5, 5, 13, pin);
  return v;
}

export const ITEMS_B: Record<string, Record<string, () => Vox>> = {
  'dungeon-anarchists-cookbook': { tome: anarchyTome },
  'ring-of-divine-suffering': { ring: divineRing },
  'bolt-of-ophiotaurus': { bolt: deityBolt },
  'cleaner-bot': { disc: cleanerDisc },
  'royal-chariot': { buggy: () => duneBuggy(false), armed: () => duneBuggy(true) },
  'gate-of-the-feral-gods': { assembled: () => windingBox(false), broken: () => windingBox(true) },
  'celestial-grenade': { spiked: spikedGrenade },
};
