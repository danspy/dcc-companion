import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { lathe, chamfer } from './itemparts.ts';

/* ---- items, set a ----
   The anchor set's conventions (items.ts): one object, floating, three-quarter
   view, drawn smooth at a figure's density, facing +y (the lit left face), z up.
   Each look is drawn from the edition's own description at its point, and a
   colour the book leaves unsaid takes a plain one. Shapes and colours only. */

/** a straight bar of voxels from one point to another, stepped along its longest axis */
function bar(v: Vox, a: [number, number, number], b: [number, number, number], m: string) {
  const n = Math.max(...a.map((p, i) => Math.abs(b[i] - p)));
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0;
    v.set(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), m);
  }
}
/** a disc standing in the x-z plane, y0..y1 thick: an octagon, which reads round where a stepped circle reads as a heap */
function disc(v: Vox, cx: number, cz: number, y0: number, y1: number, r: number, m: string) {
  for (let x = cx - r; x <= cx + r; x++) for (let z = cz - r; z <= cz + r; z++) {
    if (Math.abs(x - cx) + Math.abs(z - cz) <= r + Math.floor(r / 2)) v.box(x, y0, z, x, y1, z, m);
  }
}

/* 1:16 the chopper "with attached sidecar": "a crackhead's bicycle", its
   framework "welded-together copper bits of varying patinas", two wheels "solid and
   black", the seat "an alligator skull with white fur lining the top", the engine "in
   the middle of the chassis" with a hopper "opening up near the handlebars". The
   sidecar is "nothing more than a bar, a single wheel affixed to a colossal spring,"
   and a smaller fur-lined skull "from some flat-headed orc creature", a pair of bones
   for a backrest, which the engineers are painting purple. The engine's metal is never
   named, so it is a plain one. A chibi of itself, big-wheeled: it runs along x, the
   front at +x, so its profile is the lit face, and the sidecar stands on the far side,
   where the bike does not hide its spring. */
function copperChopper(): Vox {
  const v = new Vox(); v.chunk = 0;
  const copper = '#c07a3e', patina = '#93603a', verdigris = '#5f9a80', tyre = '#302d35', hub = '#55505c', cap = '#d6955a';
  const engine = '#5d646e', bolt = '#363a41', bone = '#d8c79c', boneDark = twin('#d8c79c'), socket = '#2a2420', fur = '#f7f6f2', paint = '#7440a8';
  const coil = '#b3b7bd', post = '#7c858e';
  const wheel = (cx: number, cz: number, y0: number, y1: number, r: number) => {
    disc(v, cx, cz, y0, y1, r, tyre);
    disc(v, cx, cz, y1, y1, r - 2, hub); v.set(cx, y1 + 1, cz, cap);
  };
  // the two wheels, big solid black discs, a copper cap on each hub
  wheel(4, 4, 0, 1, 4); wheel(15, 4, 0, 1, 4);
  // the frame, copper bits of different ages welded together
  const beam = (a: [number, number], b: [number, number], m: string, ys = [0, 1]) => { for (const y of ys) bar(v, [a[0], y, a[1]], [b[0], y, b[1]], m); };
  beam([4, 5], [6, 9], patina, [-1, 2]);         // the rear stays, either side of the wheel, up under the seat
  beam([7, 9], [13, 9], copper);                 // the top tube
  beam([15, 5], [14, 10], patina, [-1, 2]);      // the fork, either side of the front wheel
  beam([14, 10], [14, 12], copper);              // up to the bars
  // the engine in the middle of the chassis, between the wheels
  chamfer(v, 8, -1, 3, 11, 2, 8, 1, engine);
  v.set(9, 3, 4, bolt); v.set(10, 3, 4, bolt); v.set(9, 3, 7, bolt); v.set(10, 3, 7, bolt);
  // the hopper, up out of the engine to an open mouth by the handlebars
  beam([11, 9], [12, 11], verdigris);
  v.box(11, -1, 12, 13, 2, 12, copper); v.box(12, 0, 12, 12, 1, 12, socket);
  // the handlebars across the top of the fork, black grips at the ends
  v.box(14, -2, 13, 14, 3, 13, copper); v.set(14, -2, 13, tyre); v.set(14, 3, 13, tyre);
  // the seat: an alligator skull, its long flat snout forward, white fur over its crown like a wig
  chamfer(v, 2, -1, 10, 6, 2, 11, 1, bone);
  v.box(7, 0, 10, 10, 1, 10, bone); v.box(7, 0, 11, 8, 1, 11, boneDark);
  v.set(8, 2, 10, socket); v.set(10, 2, 10, socket);   // gaps in the teeth
  v.set(6, 2, 11, socket);                             // the eye socket
  v.box(2, -1, 12, 5, 2, 12, fur); v.set(2, 2, 11, fur); v.set(4, 2, 11, fur); v.set(2, -1, 11, fur);
  // the sidecar, on the far side: a bar out from the frame, a colossal spring up off its one wheel
  const sx = 8, sy = -6;
  v.box(sx, sy + 2, 5, sx, -2, 5, patina);
  wheel(sx, 3, sy - 1, sy, 3);
  for (let z = 6; z <= 10; z++) {
    if (z % 2 === 0) { v.box(sx - 2, sy - 2, z, sx + 1, sy + 1, z, coil); v.clear(sx - 1, sy - 1, z, sx, sy, z); }
    else v.box(sx - 1, sy - 1, z, sx, sy, z, post);
  }
  // on the spring a smaller, flat-headed skull, fur-lined, the two bones behind it painted purple
  chamfer(v, sx - 3, sy - 3, 11, sx + 2, sy + 2, 12, 1, bone);
  v.set(sx + 2, sy - 2, 12, socket); v.set(sx + 2, sy + 1, 12, socket);
  v.box(sx - 2, sy - 2, 13, sx + 1, sy + 1, 13, fur);
  for (const y of [sy - 3, sy + 2]) { v.box(sx - 3, y, 13, sx - 3, y, 15, paint); v.set(sx - 3, y, 16, twin(paint)); }
  return v;
}

/* 3:7 "the fizzy, dark blue coloring" of a skill potion. A potion comes in a vial
   (3:6) with a cork in it (1:24). */
function skillPotion(): Vox {
  const v = new Vox(); v.chunk = 0;
  const blue = '#101c55', fizz = '#6f8de0', cork = '#b08758';
  const c = 4.5;
  const R = (z: number) => (z <= 0 ? 2.7 : z <= 7 ? 3.6 : z === 8 ? 2.7 : z <= 10 ? 1.6 : z === 11 ? 2.2 : 0);
  // the glass skin, the liquid in it up to the shoulder, air above
  lathe(v, c, c, 0, 11, R, (x, y, z) => {
    const inside = Math.hypot(x - c, y - c) <= R(z) - 1 && z >= 1 && z <= 10;
    if (!inside) return 'glass';
    return z <= 6 ? blue : null;
  });
  // fizz: bubbles coming up through the liquid and breaking at its top
  for (const [x, y, z] of [[3, 6, 6], [5, 6, 4], [6, 4, 6], [4, 5, 2], [5, 5, 7], [4, 4, 9]] as const) v.set(x, y, z, fizz);
  // the cork
  v.box(3, 3, 12, 6, 6, 12, cork); v.box(4, 3, 13, 5, 6, 13, cork); v.box(3, 4, 13, 6, 5, 13, cork);
  return v;
}

/* 1:25 the wrist bracer is "charcoal-colored"; made a fist, the gauntlet is
   "black, angular with multiple, gleaming spikes", "nothing ornate about it". A
   raised fist over the bracer, the fingers to the lit side.
   4:13 a platinum sharpening stone: "the actual spikes grew a little longer", and
   the weapon looks "extra oily and mean". */
function warGauntlet(sharp: boolean): Vox {
  const v = new Vox(); v.chunk = 0;
  const bracer = '#4c4c55', band = '#5b5b65', black = sharp ? '#25252e' : '#2b2a31', plate = sharp ? '#3c4052' : '#43424c';
  const steel = '#c3c8d0', tip = '#f1f3f6', sheen = '#56607e';
  const long = sharp ? 1 : 0;
  const spike = (x: number, y: number, z: number, d: [number, number, number], n: number) => {
    for (let i = 0; i < n; i++) v.set(x + d[0] * i, y + d[1] * i, z + d[2] * i, i === n - 1 ? tip : steel);
  };
  // the bracer at the wrist, a flared rim under the fist
  chamfer(v, 1, 0, 0, 8, 7, 4, 2, bracer);
  chamfer(v, 1, 0, 2, 8, 7, 2, 2, band);
  chamfer(v, 0, -1, 5, 9, 8, 5, 2, plate);
  // the back of the fist, angular
  chamfer(v, 0, 0, 6, 9, 6, 13, 1, black);
  // four curled fingers on the front, each its own plate, and the thumb across them
  [[1, 2], [3, 4], [5, 6], [7, 8]].forEach(([a, b], i) => v.box(a, 7, 9, b, 8, 13, i % 2 ? plate : twin(plate)));
  v.box(1, 9, 9, 8, 9, 10, plate);
  v.box(2, 7, 7, 8, 9, 8, black);
  // the spikes: up off each knuckle, out of the little-finger side, round the wrist
  for (const x of [1, 3, 5, 7]) { v.box(x, 7, 14, x + 1, 8, 14, steel); spike(x, 8, 15, [0, 0, 1], 2 + long); }
  spike(10, 2, 8, [1, 0, 0], 2 + long); spike(10, 4, 11, [1, 0, 0], 2 + long); spike(10, 2, 12, [1, 0, 0], 1 + long);
  spike(9, 3, 5, [1, 0, 0], 1 + long); spike(4, 8, 5, [0, 1, 0], 1 + long);
  if (sharp) for (const [x, y, z] of [[2, 6, 13], [9, 5, 9], [0, 4, 10], [6, 6, 12], [4, 8, 12]] as const) v.set(x, y, z, sheen);   // the oily sheen
  return v;
}

/* 2:16 "round bombs", the fused kind, "a hair smaller than a baseball, but it was
   dense and heavy". The book never gives its colour, so it is a plain dark iron,
   and the fuse is a plain cord. */
function hobLobber(): Vox {
  const v = new Vox(); v.chunk = 0;
  const iron = '#4f535b', shine = '#7b818b', cap = '#34373d', cord = '#c9b384';
  // built the way the biscuit is, from a few chamfered layers: a narrow foot, the wide
  // middle with its corners cut, and a narrower shoulder and top
  chamfer(v, 2, 2, 0, 7, 7, 0, 2, iron);
  chamfer(v, 1, 1, 1, 8, 8, 1, 3, iron);
  chamfer(v, 0, 0, 2, 9, 9, 5, 3, iron);
  chamfer(v, 1, 1, 6, 8, 8, 6, 3, iron);
  chamfer(v, 2, 2, 7, 7, 7, 7, 2, iron);
  v.set(4, 9, 5, shine);                         // one catch of light on its upper left
  // the fuse's seat on top, and the cord curling up out of it
  v.box(4, 4, 8, 5, 5, 8, cap);
  v.set(5, 5, 9, cord); v.set(5, 6, 10, cord); v.set(5, 7, 11, cord); v.set(4, 7, 12, cord);
  return v;
}

/* 2:17 the xistera: "While it appeared to be made of wicker, it was really made of a
   light, metallic substance." The "rounded scoop extended about two and a half feet
   past my right hand, almost like a single, massive fingernail", buckled on at the
   wrist and "just before my elbow", where the second strap has "a small pull-ring",
   and "the plastic-like slit just above my palm". The straps' colour is never given,
   so they are a plain brown. It lies open side up, the sleeve at the back.
   4:34 the extension slot, "a curved piece of wicker basket, though it glowed with
   enchantment", slides onto the end of the scoop. */
function xistera(extended: boolean): Vox {
  const v = new Vox(); v.chunk = 0;
  const wicker = '#c9a467', weave = '#b8925a', inner = '#8e6c3c', strap = '#6b4428', buckle = '#b3b7bd', slit = '#2a2622';
  const rib = (x: number) => (x % 2 ? wicker : weave);
  // the sleeve the forearm goes into, closed, two straps round it
  chamfer(v, 0, 0, 0, 6, 4, 3, 1, wicker);
  for (const x of [1, 4]) { v.box(x, -1, 0, x, 5, 3, strap); v.box(x, 0, 4, x, 4, 4, strap); v.set(x, 5, 2, buckle); }
  v.set(1, 6, 1, buckle); v.set(1, 6, 0, buckle); v.set(1, 6, -1, buckle);   // the pull-ring, hanging off the elbow strap
  v.box(6, 1, 3, 6, 3, 3, slit);                                                 // the slit above the palm
  // the scoop: a trough open on top, reaching on past the hand and curving up like a fingernail
  const floor = [0, 0, 0, 0, 0, 1, 1, 2, 3, 4, 6, 8];
  floor.forEach((z, i) => {
    const x = 7 + i, wall = i >= 10 ? 0 : i >= 8 ? 1 : 2;
    v.box(x, 0, z, x, 4, z, rib(x));
    if (i >= 8) v.box(x, 0, z + 1, x, 4, z + 1, rib(x));                     // the steep tip is two thick
    if (i === 11) { v.set(x, 0, z + 1, null); v.set(x, 4, z + 1, null); }    // its end rounded off
    for (const y of [0, 4]) for (let k = 1; k <= wall; k++) v.set(x, y, z + k, rib(x));
    if (i < 8) v.clear(x, 1, z + 1, x, 3, z + 1);
  });
  for (let x = 7; x <= 14; x++) v.box(x, 1, floor[x - 7], x, 3, floor[x - 7], inner);
  if (extended) {
    // the curved, glowing piece slid onto the scoop's end, going on up
    [[18, 10], [18, 11], [19, 12], [19, 13]].forEach(([x, z], i) => v.box(x, 0, z, x, 4, z, i % 2 ? 'window' : '#f2d48a'));
    v.box(20, 0, 14, 20, 4, 14, 'window');
  }
  return v;
}

/* 2:24 a "small, glass case", its door "a small, hinged flap held closed by a
   cheap-looking hook and eyebolt", shut round "a golf ball-sized, amber-hued jewel"
   floating in the air. 2:25 what it became: "Light streamed from the container like
   a miniature, caged sun". The glass has no frame in the book; its edges catch the
   light. */
function doomsdayScenario(): Vox {
  const v = new Vox(); v.chunk = 0;
  const N = 9, H = 10;
  // the glass case, hollow, its edges bright where they turn
  for (let x = 0; x <= N; x++) for (let y = 0; y <= N; y++) for (let z = 0; z <= H; z++) {
    const ex = x === 0 || x === N, ey = y === 0 || y === N, ez = z === 0 || z === H;
    if (!(ex || ey || ez)) continue;
    v.set(x, y, z, (ex ? 1 : 0) + (ey ? 1 : 0) + (ez ? 1 : 0) >= 2 ? 'domeRim' : 'glass');
  }
  // the flap in the front, its edge catching the light, hinged at the left, hook and eyebolt at the right
  for (let x = 2; x <= 7; x++) for (let z = 2; z <= 8; z++) if (x === 2 || x === 7 || z === 2 || z === 8) v.set(x, N, z, 'domeRim');
  v.set(2, N, 3, 'metal'); v.set(2, N, 7, 'metal');
  v.set(7, N, 5, 'metal'); v.set(8, N, 5, 'metalDark'); v.set(8, N + 1, 5, 'metal');
  // the jewel, amber, burning like a small sun in the middle of the case
  const amber = '#f2a33a';
  chamfer(v, 3, 3, 4, 6, 6, 6, 2, amber);
  chamfer(v, 3, 3, 3, 6, 6, 7, 3, amber);
  for (const [x, y, z] of [[4, 6, 5], [5, 6, 5], [5, 6, 4], [6, 4, 5], [6, 5, 5], [6, 5, 6], [4, 5, 7], [5, 4, 7]] as const) v.set(x, y, z, 'ember');
  v.set(5, 5, 7, 'window'); v.set(4, 6, 6, 'window');
  return v;
}

export const ITEMS_A: Record<string, Record<string, () => Vox>> = {
  'goblin-copper-chopper': { sidecar: copperChopper },
  'skill-potion': { vial: skillPotion },
  'war-gauntlet': { formed: () => warGauntlet(false), sharpened: () => warGauntlet(true) },
  'hob-lobber': { fused: hobLobber },
  'xistera': { scoop: () => xistera(false), extended: () => xistera(true) },
  'carls-doomsday-scenario': { 'caged-sun': doomsdayScenario },
};
