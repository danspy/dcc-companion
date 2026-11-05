import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { lathe, chamfer } from './itemparts.ts';
import { potion, bomb } from './itemforms.ts';

/* ---- items, batch b4b (the fifth floor's loot, and a sixth-floor saber) ----
   Drawn like the anchor set in items.ts: one object, floating, three-quarter
   view, smooth (chunk 0), facing +y (the lit left face), z up, each look from
   the edition's own words at its point. A colour the book leaves unsaid is a
   plain one; a thing the book names only by its noun is that noun's plain form.
   Shapes and colours only. */

const fresh = () => { const v = new Vox(); v.chunk = 0; return v; };

/** an eight-sided slice in the plane across an axis: half-width h, its corners cut, which reads round */
const octo = (a: number, b: number, h: number) => Math.abs(a) <= h && Math.abs(b) <= h && Math.abs(a) + Math.abs(b) <= h + Math.floor(h / 2);

/** a rod along x, eight-sided in section, its half-width h(x) and its middle (cy(x), cz(x)) set per slice */
function rodX(v: Vox, x0: number, x1: number, h: (x: number) => number, cy: (x: number) => number, cz: (x: number) => number,
  m: (x: number, dy: number, dz: number, h: number) => string | null) {
  for (let x = x0; x <= x1; x++) {
    const H = h(x), Y = cy(x), Z = cz(x);
    for (let dy = -H; dy <= H; dy++) for (let dz = -H; dz <= H; dz++) if (octo(dy, dz, H)) { const c = m(x, dy, dz, H); if (c) v.set(x, Y + dy, Z + dz, c); }
  }
}

/* ---- the knock-knock ----
   4:2 "The distinctive shape of a refrigerator-sized bomb dangled precariously
   underneath the small airship." Nothing else is said of it, so it is the plain
   shape of a bomb dropped from the air, at a refrigerator's size (a chibi of
   it): a fat round body, its nose to +x, tapering to a tail with four fins, the
   lug it hangs from on its back. Its metal is never coloured: a plain grey,
   banded. */
function knockKnock(): Vox {
  const v = fresh();
  const shell = '#6b737c', band = '#4d545b', nose = '#565d65', shine = '#949ba3', fin = '#5d646e', lug = '#a4abb6';
  const C = 6;
  const H = [2, 2, 3, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 3, 2, 1];       // tail to nose
  rodX(v, 0, H.length - 1, x => H[x], () => C, () => C, (x, dy, dz) => {
    if (x >= 16) return nose;
    if (x === 6 || x === 13) return band;
    return dz === 3 && dy >= 1 && dy <= 2 && x >= 7 && x <= 12 ? shine : shell;   // a catch of light along its upper front
  });
  // the four fins round the tail, broadest at the back
  for (let x = -2; x <= 3; x++) {
    const reach = x === -2 ? 5 : x === 3 ? 4 : 6;
    for (let r = 2; r <= reach; r++) { v.set(x, C + r, C, fin); v.set(x, C - r, C, fin); v.set(x, C, C + r, fin); v.set(x, C, C - r, fin); }
  }
  v.box(-2, C, C, 0, C, C, fin);
  // the lug on its back it hangs from
  v.box(9, C, C + 6, 10, C, C + 6, lug);
  v.set(8, C, C + 7, lug); v.set(11, C, C + 7, lug); v.box(8, C, C + 8, 11, C, C + 8, lug);
  return v;
}

/* ---- the half splat, and the phase lava rock potion ----
   4:13 "Three potions of Half Splat"; 4:34 "A Phase Lava Rock potion". The book
   gives neither a bottle nor a colour, so each is the plain potion. */
const plainPotion = () => potion();

/* ---- the disco ball ----
   A hobgoblin smoke curtain is one of the "round, fused bombs" (2:21). 4:18
   infused, "The round smoke curtain, which was normally red, but it now shined
   with a multi-colored opalescence." The plain round bomb, its shell a pearly
   ground with soft bands of colour playing across it. */
const PEARL = '#d9d3e6';
const OPAL = { pink: '#f0b2cf', teal: '#a2e3d8', gold: '#f0da98', violet: '#bba8ee' };
function discoBall(): Vox {
  const v = bomb({ shell: PEARL });
  for (const { p: [x, y, z], mat } of v.all()) {
    if (mat === '#aeb4bf') { v.set(x, y, z, '#fbf9ff'); continue; }          // the form's own highlight, pearl-white
    if (mat !== PEARL) continue;
    // the play of colour: broad soft patches drifting over a pearl ground
    const s = Math.sin(x * 0.75 + z * 0.55) + Math.cos(y * 0.7 - z * 0.45);
    v.set(x, y, z, s > 0.8 ? OPAL.pink : s < -0.8 ? OPAL.teal : s > 0.15 && z > 4 ? OPAL.gold : s < -0.2 && z <= 5 ? OPAL.violet : PEARL);
  }
  return v;
}

/* ---- the soul crystal necklace ----
   4:17 "It was a necklace. It looked like a walnut." In it "a little,
   purple-hued gem", "housed in a sliding clamshell-like device", which Carl
   keeps "open just a fraction". A walnut-shaped shell in two halves, the upper
   lifted a little off the lower at the front, hinged at the back, the purple
   gem showing in the gap; the cord it hung on looped over it. The shell's
   colour is the walnut's it is likened to; the cord's is never given, so plain. */
function walnutNecklace(): Vox {
  const v = fresh();
  const shell = '#a87c4f', groove = '#7d5733', lip = '#93683f', gem = '#8a45cc', facet = '#c39af0', deep = '#5e2a92', cord = '#7a6a58';
  // the lower half: a rounded bowl, its rim a ridge
  chamfer(v, 2, 3, 0, 8, 7, 0, 2, shell);
  chamfer(v, 1, 1, 1, 9, 9, 1, 3, shell);
  chamfer(v, 0, 0, 2, 10, 10, 3, 4, shell);
  chamfer(v, 0, 0, 4, 10, 10, 4, 4, lip);
  // the gem, sitting in the lower half, showing in the gap
  chamfer(v, 2, 3, 5, 8, 8, 6, 2, gem);
  chamfer(v, 3, 4, 7, 7, 7, 7, 2, gem);
  v.set(4, 8, 6, facet); v.set(5, 8, 6, facet); v.set(3, 7, 6, facet); v.set(8, 6, 6, facet);
  v.set(6, 8, 5, deep); v.set(7, 7, 5, deep); v.set(8, 5, 5, deep);
  // the hinge at the back, holding the halves together
  v.box(3, 0, 5, 7, 1, 7, groove);
  // the upper half, lifted off the lower at the front
  chamfer(v, 0, 0, 8, 10, 10, 8, 4, lip);
  chamfer(v, 0, 0, 9, 10, 10, 10, 4, shell);
  chamfer(v, 1, 1, 11, 9, 9, 11, 3, shell);
  chamfer(v, 2, 3, 12, 8, 7, 12, 2, shell);
  // the wrinkles of a walnut: a few wandering grooves down its front and over its top
  for (const { p: [x, y, z], mat } of v.all()) {
    if (mat !== shell) continue;
    const front = !v.has(x, y + 1, z), right = !v.has(x + 1, y, z), top = !v.has(x, y, z + 1);
    const wave = [0, 1, 1, 0][z % 4];
    if (front && (x === 3 + wave || x === 7 - wave)) v.set(x, y, z, groove);
    else if (right && y === 4 + wave) v.set(x, y, z, groove);
    else if (top && z >= 11 && x === 5 + (y % 3 === 0 ? 1 : 0)) v.set(x, y, z, groove);
  }
  // the bail on top and the cord, a loop rising over it
  v.box(5, 5, 13, 5, 5, 14, '#8c939b');
  const path: [number, number][] = [[5, 15], [4, 16], [3, 16], [2, 17], [1, 18], [1, 19], [1, 20], [2, 21], [3, 22], [4, 22], [5, 22], [6, 22], [7, 22], [8, 21], [9, 20], [9, 19], [9, 18], [8, 17], [7, 16], [6, 16]];
  path.forEach(([x, z], i) => v.set(x, 5, z, i % 2 ? cord : twin(cord)));
  return v;
}

/* ---- the never-ending duct tape ----
   4:11 "It was a thick, enchanted roll of duct tape", "fabric-based tape". No
   colour is given, so it is the plain grey of the noun, on a plain card core.
   It stands on its edge, the hole to the lit side, the loose end hanging off
   its bottom. */
function ductTape(): Vox {
  const v = fresh();
  const tape = '#a9aeb5', layer = '#8e949b', core = '#b8975f', end = twin('#a9aeb5');
  const c = 7, R = 6.6, Y = 5;
  for (let x = 0; x <= 2 * c; x++) for (let z = 0; z <= 2 * c; z++) {
    const d = Math.hypot(x - c, z - c);
    if (d > R || d < 2.4) continue;
    for (let y = 0; y <= Y; y++) {
      const face = y === 0 || y === Y;
      v.set(x, y, z, d < 3.4 ? core : face && Math.round(d) === 5 ? layer : tape);
    }
  }
  // the loose end, peeled off the bottom and hanging
  for (const [x, z] of [[c + 7, 6], [c + 7, 5], [c + 7, 4], [c + 7, 3], [c + 7, 2], [c + 8, 1], [c + 8, 0]] as const) v.box(x, 0, z, x, Y, z, end);
  return v;
}

/* ---- the left fang ----
   3:21 Eva carries "a pair of wide sabers over her back"; 3:27 one is found in
   the gore, "one of Eva's two sabers", an "enchanted saber". Nothing is said of
   its metal or hilt, so they are plain: a steel blade, broad and curving, a grey
   guard, a dark wrapped grip. It stands point up, the flat of the blade to +y.
   4:33 "It glinted with green, venomous light": its edge takes the green. */
function saber(venom: boolean): Vox {
  const v = fresh();
  const steel = '#b9bfc7', fuller = '#949ba4', edge = venom ? '#a8efb4' : '#e3e7ec', back = '#8f969f';
  const guard = '#6b737c', grip = '#4a3326', wrap = '#3a271c', pommel = '#7c858e', glint = '#62f07c';
  const off = (z: number) => Math.round(((z - 5) / 16) ** 2 * 5);
  for (let z = 5; z <= 21; z++) {
    const w = z >= 20 ? 22 - z : 3;                     // broad, then tapering to the point
    for (let i = 0; i < w; i++) {
      const x = 5 + off(z) + i;
      const m = i === 0 ? edge : i === w - 1 && w > 2 ? back : i === 1 && z >= 7 && z <= 16 ? fuller : steel;
      v.set(x, 0, z, m); v.set(x, 1, z, m);
    }
  }
  if (venom) {
    for (const z of [7, 8, 12, 13, 17, 18]) v.set(5 + off(z), 1, z, glint);
    v.set(4, 2, 10, glint); v.set(7, 2, 15, glint); v.set(3, 1, 14, glint); v.set(5, 1, 21, glint);
  }
  // the guard across the blade's root, the wrapped grip, the pommel
  v.box(2, -1, 4, 10, 2, 4, guard);
  v.box(2, -1, 3, 2, 2, 3, guard); v.box(10, -1, 5, 10, 2, 5, guard);
  for (let z = 1; z <= 3; z++) v.box(5, 0, z, 6, 1, z, z % 2 ? grip : wrap);
  chamfer(v, 4, -1, 0, 7, 2, 0, 1, pommel);
  return v;
}

/* ---- the live ammo ball ----
   4:13 "fist-sized grenade balls" hanging off a bandolier "like fist-sized
   Christmas ornaments": "round, clamshell spheres". No colour is given, so a
   plain grey metal, the two halves of the shell meeting at a dark seam round
   the middle, hinged on its right, the lug it hangs by on top. */
function ammoBall(): Vox {
  const v = fresh();
  const shell = '#9aa1a9', lower = '#6f767e', seam = '#2e3237', shine = '#c1c6cc', lugc = '#cfd3d8', hinge = '#5d646e';
  chamfer(v, 2, 2, 0, 7, 7, 0, 2, lower);
  chamfer(v, 1, 1, 1, 8, 8, 1, 3, lower);
  chamfer(v, 0, 0, 2, 9, 9, 3, 3, lower);
  chamfer(v, 1, 1, 4, 8, 8, 4, 3, seam);                // the seam, a groove round its middle
  chamfer(v, 0, 0, 5, 9, 9, 6, 3, shell);
  chamfer(v, 1, 1, 7, 8, 8, 7, 3, shell);
  chamfer(v, 2, 2, 8, 7, 7, 8, 2, shell);
  v.set(3, 9, 6, shine); v.set(2, 9, 6, shine); v.set(3, 8, 7, shine);
  v.box(10, 4, 3, 10, 5, 5, hinge); v.set(9, 4, 4, hinge); v.set(9, 5, 4, hinge);
  v.box(4, 4, 9, 5, 5, 9, hinge);                       // the lug
  v.set(4, 5, 10, lugc); v.set(5, 5, 10, lugc); v.set(4, 5, 11, lugc); v.set(5, 5, 11, lugc);
  return v;
}

/* ---- the toraline ----
   4:8 "The box opened, revealing what looked like a sweet potato"; "Thanks for
   the yam". A long tuber tapering at both ends, a little bowed, its skin
   a plain earthy brown (the skin's colour is never given), with a few dark eyes
   and a rootlet off each end. 7:11 "All I had left was a finger-sized slice":
   the tip of it, cut flat, the cut to the lit side, the flesh a plain pale one. */
const SKIN = '#94603e', SKIN_DARK = '#764a2e', FLESH = '#dcc09a', ROOT = '#6e4a32';
function rootTuber(): Vox {
  const v = fresh();
  const H = [1, 2, 2, 3, 3, 4, 4, 4, 4, 4, 3, 3, 3, 2, 2, 1];
  rodX(v, 0, 15, x => H[x], x => 5 + (x > 9 ? 1 : 0), x => 4 + Math.round(((x - 7.5) / 7.5) ** 2 * 2),
    (x, dy, dz) => ((x === 4 && dy === 2 && dz === 2) || (x === 9 && dy === 4 && dz === 0) || (x === 12 && dy === 2 && dz === 1) || (x === 7 && dy === 1 && dz === 4)) ? SKIN_DARK : SKIN);
  // the long dark streaks of the skin
  for (const x of [5, 6]) v.set(x, 9, 4, SKIN_DARK);
  for (const x of [10, 11]) v.set(x, 7, 7, SKIN_DARK);
  // a thin rootlet off each end
  v.set(-1, 5, 6, ROOT); v.set(-2, 5, 7, ROOT); v.set(-3, 5, 7, ROOT);
  v.set(16, 6, 6, ROOT); v.set(17, 6, 7, ROOT);
  return v;
}
function rootTuberSlice(): Vox {
  const v = fresh();
  // the tip end, lying along y, its cut face to +y showing the flesh in a ring of skin
  const H = [1, 1, 2, 2, 3, 3, 3, 3];
  for (let y = 0; y < H.length; y++) {
    const h = H[y];
    for (let dx = -h; dx <= h; dx++) for (let dz = -h; dz <= h; dz++) {
      if (!octo(dx, dz, h)) continue;
      const rim = !octo(dx, dz, h - 1) || h < 2;
      v.set(4 + dx, y, 3 + dz + (y < 3 ? 1 : 0), y === H.length - 1 && !rim ? FLESH : SKIN);
    }
  }
  v.set(3, 3, 6, SKIN_DARK); v.set(7, 5, 3, SKIN_DARK);
  v.set(4, -1, 5, ROOT); v.set(4, -2, 6, ROOT);          // its rootlet
  return v;
}

/* ---- the fang caps ----
   4:13 "A pair of fang caps"; the book says no more of these, so they are the
   plain form fang caps take where it first shows a pair (2:13): "twin, metallic
   metal caps ... like a pair of loose vampire teeth". Two long canines, point
   down, each open at its top where the tooth goes in, in a plain metal. */
function fangCaps(): Vox {
  const v = fresh();
  const metal = '#a4abb6', shine = '#d6dadf', shade = '#7c858e', hollow = '#2a2420';
  const fang = (x0: number, y0: number, z0: number) => {
    const rows: [number, number][] = [[0, 3], [0, 3], [0, 3], [1, 3], [1, 3], [1, 2], [1, 2], [2, 2], [2, 2]];
    rows.forEach(([a, b], i) => {
      const z = z0 + rows.length - 1 - i;
      for (let x = a; x <= b; x++) for (let y = 0; y <= 3 - (i > 4 ? 1 : 0); y++) {
        if (i <= 2 && (x === 0 || x === 3) && (y === 0 || y === 3)) continue;   // its collar rounded
        if (i >= 5 && y < 1) continue;
        v.set(x0 + x, y0 + y, z, metal);
      }
    });
    v.box(x0 + 1, y0 + 1, z0 + 8, x0 + 2, y0 + 2, z0 + 8, hollow);           // the open top
    v.set(x0, y0 + 2, z0 + 6, shine); v.set(x0 + 1, y0 + 3, z0 + 7, shine); v.set(x0 + 1, y0 + 3, z0 + 5, shine);
    v.set(x0 + 3, y0 + 1, z0 + 5, shade); v.set(x0 + 2, y0 + 1, z0 + 2, shade);
    v.set(x0 + 2, y0 + 2, z0 - 1, metal);                                     // the point
  };
  fang(0, 0, 2); fang(6, 2, 0);
  return v;
}

/* ---- the neural enhancer ----
   3:13 the first of these pills: "It was a regular sized, blue and yellow
   capsule." 4:8 "It looked identical to the last one". A capsule lying along
   x, a blue half and a yellow half, each lit along its upper front. */
function capsule(): Vox {
  const v = fresh();
  const blue = '#2f5fc0', blueLight = '#7099e6', yellow = '#efc63a', yellowLight = '#fbe58a';
  const H = [1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 1];
  rodX(v, 0, 13, x => H[x], () => 3, () => 3, (x, dy, dz, h) => {
    const lit = h === 3 && dy === 1 && dz === 3;            // the gloss along its upper front
    return x <= 6 ? (lit ? blueLight : blue) : (lit ? yellowLight : yellow);
  });
  return v;
}

/* ---- the tears ----
   4:2 "It looked different than most potions. The bottle was rounded and more
   ornate, like an expensive perfume bottle. Smoke rose from the glass." A
   round-bellied glass bottle on a little foot, a band round its belly, a collar
   at its neck and a tall cut stopper, wisps of smoke curling up off it. No
   colour is given for the glass, the liquid or the metal: plain ones. */
function tears(smokeMat: string): Vox {
  const v = fresh();
  const liquid = '#8c9aa8', metal = '#c3c8cf', metalShade = twin('#c3c8cf'), inset = '#8f969f';
  const c = 6;
  const R = (z: number) => (z === 1 ? 4 : z === 2 ? 5 : z <= 7 ? 5.6 : z === 8 ? 5 : z === 9 ? 4 : z === 10 ? 2.6 : z <= 12 ? 1.6 : 0);
  lathe(v, c, c, 1, 12, R, (x, y, z) => {
    const d = Math.hypot(x - c, y - c);
    if (z === 5 && d > R(z) - 1) return (Math.round((Math.atan2(y - c, x - c) + Math.PI) * 2.5) % 2 ? metal : metalShade);   // the band round its belly, studded
    const inside = d <= R(z) - 1 && z >= 2 && z <= 11;
    return !inside ? 'glass' : z <= 7 ? liquid : null;
  });
  lathe(v, c, c, 0, 0, () => 3.6, () => metal);                         // the foot
  lathe(v, c, c, 12, 13, () => 2.6, () => metal);                       // the collar at the neck
  // the stopper: a round knob, ringed, a bead on top
  const S = [1.6, 2.6, 3.1, 3.1, 2.6, 1.6];
  lathe(v, c, c, 14, 19, z => S[z - 14], (x, y, z) => (z === 16 ? inset : z % 2 ? metal : metalShade));
  v.set(c, c, 20, metalShade);
  // smoke rising off the glass, two curling wisps either side
  const wisp = (pts: [number, number, number][]) => pts.forEach(([x, y, z]) => v.set(x, y, z, smokeMat));
  wisp([[c - 5, c + 3, 9], [c - 5, c + 3, 10], [c - 6, c + 3, 11], [c - 6, c + 4, 12], [c - 5, c + 4, 13], [c - 5, c + 4, 14], [c - 6, c + 5, 15], [c - 7, c + 5, 16], [c - 7, c + 5, 17], [c - 6, c + 6, 18]]);
  wisp([[c + 3, c + 4, 10], [c + 4, c + 4, 11], [c + 4, c + 5, 12], [c + 3, c + 5, 13], [c + 3, c + 6, 14], [c + 4, c + 6, 15], [c + 5, c + 6, 16], [c + 5, c + 7, 17]]);
  wisp([[c - 6, c + 2, 10], [c - 7, c + 4, 13], [c + 4, c + 5, 14], [c - 6, c + 5, 18]]);
  return v;
}

/* ---- the nightmare ii ----
   4:3 the type: "an open-air, twin-engine biplane, with each engine nestled
   between the wings", the gunner "facing backward". 4:15 this one: "like
   something a drunk dude had built in his backyard out of scrap metal", no
   bombs left under the wings, "a frothing, rabid koala bear thing painted on
   the nose", the stencilled name above it covered over with spray paint, and
   the new name sprayed "on the side"; a "rear-facing gunner's chair" with "the
   large gun". The metal and the paint are never
   coloured: patched plain greys, the koala grey (4:3), the spray paint black.
   A chibi of itself, its nose to +x, its left side, where the koala and the
   sprayed name are, to the lit +y face. The crew are not the plane, so left out. */
const KOALA = ['e....e', 'kxkkxk', 'kkbbkk', 'kmmmmk', 'ftftf.'];
const SCRAWL = ['#.##..#.#', '.#..##.#.', '#.#..#..#'];
function nightmare(): Vox {
  const v = fresh();
  const panels = ['#6b737c', '#5d646e', '#737b84', '#626a73'], rust = '#86583a';
  const wing = '#8d949c', wingEdge = twin('#8d949c'), cowl = '#4d545b', strut = '#454b52', pit = '#1b1714';
  const prop = '#5c3a20', hubc = '#a4abb6', cyl = '#5d646e', gun = '#2b2e32', seat = '#3b3530';
  const koala = '#b4b9bf', ear = '#d6d9dd', mouth = '#5a1414', white = '#eeeae2', eye = '#1b1714', paint = '#1b1714';
  const C = 7, W0 = 10, W1 = 12;          // the fuselage's middle across; the wings' chord
  // the fuselage: a box rounded along its edges, its belly rising to the tail, patched from odd panels
  for (let x = 0; x <= 20; x++) {
    const t = x < 3 ? 3 - x : 0;
    const y0 = C - 2, y1 = C + 2, z0 = 3 + t, z1 = 8;
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const dy = Math.min(y - y0, y1 - y), dz = Math.min(z - z0, z1 - z);
      if (dy + dz < 1) continue;
      const m = x >= 19 ? cowl : (x >= 6 && x <= 8 && z <= 5) ? rust : panels[Math.floor((x + (z > 5 ? 2 : 0)) / 4) % panels.length];
      v.set(x, y, z, m);
    }
  }
  for (let y = C - 1; y <= C + 1; y++) for (let z = 4; z <= 7; z++) v.set(21, y, z, cowl);   // the rounded nose
  // the koala on the nose's side, and the old stencil over it sprayed out
  KOALA.forEach((row, j) => [...row].forEach((ch, i) => {
    const m = ch === 'e' ? ear : ch === 'k' ? koala : ch === 'x' || ch === 'b' ? eye : ch === 'm' ? mouth : ch === 't' || ch === 'f' ? white : null;
    if (m) v.set(15 + i, C + 2, 7 - j, m);
  }));
  for (const x of [15, 16, 17, 19, 20]) v.set(x, C + 2, 8, paint);
  v.set(18, C + 1, 8, paint); v.set(16, C + 1, 8, paint);
  // the new name, sprayed along the side behind the wings
  SCRAWL.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') v.set(1 + i, C + 2, 7 - j, paint); }));
  // the open cockpits: the pilot's under the wing, the gunner's behind it, the gunner's chair facing back
  v.box(W0, C - 1, 8, W0 + 1, C + 1, 8, pit); v.box(5, C - 1, 8, 7, C + 1, 8, pit);
  v.box(8, C - 1, 9, 8, C + 1, 10, seat);                               // the gunner's chair back, to the front
  // the large gun on its post, pointing back over the tail
  v.box(6, C + 1, 9, 6, C + 1, 10, strut);
  v.box(4, C, 11, 7, C + 1, 11, gun);
  v.box(-2, C + 1, 12, 3, C + 1, 12, gun); v.set(-2, C + 1, 13, gun);
  // the tail: the tailplane on top of it and a fin
  v.box(0, C - 4, 8, 2, C + 4, 8, wing);
  v.box(0, C, 9, 2, C, 11, wing); v.box(0, C, 12, 1, C, 12, wing);
  // the two wings, the lower through the belly and the upper on struts over it
  const span0 = 0, span1 = 2 * C;
  v.box(W0, span0, 3, W1 + 1, span1, 3, wing); v.box(W1 + 1, span0, 3, W1 + 1, span1, 3, wingEdge);
  v.box(W0, span0, 11, W1 + 1, span1, 11, wing); v.box(W1 + 1, span0, 11, W1 + 1, span1, 11, wingEdge);
  for (const y of [C - 2, C + 2]) v.box(W1, y, 9, W1, y, 10, strut);
  for (const y of [span0, span1]) v.box(W0 + 1, y, 4, W0 + 1, y, 10, strut);
  // the two engines, nestled between the wings, a propeller on each
  for (const y of [C - 4, C + 4]) {
    chamfer(v, W0, y - 1, 5, W1 + 2, y + 1, 9, 1, cowl);
    v.box(W0 + 1, y, 4, W1 + 1, y, 4, strut); v.box(W0 + 1, y, 10, W1 + 1, y, 10, strut);
    v.box(W1 + 3, y - 1, 6, W1 + 3, y + 1, 8, cyl);                       // the engine's face
    v.set(W1 + 4, y, 7, hubc);
    v.box(W1 + 5, y, 4, W1 + 5, y, 10, prop);
  }
  return v;
}

export const ITEMS_B4B: Record<string, Record<string, () => Vox>> = {
  'gnomish-knock-knock': { hanging: knockKnock },
  'half-splat': { plain: plainPotion },
  'hobgoblin-disco-ball': { opalescent: discoBall },
  'bonnies-soul-crystal-necklace': { ajar: walnutNecklace },
  'roll-of-never-ending-duct-tape': { roll: ductTape },
  'left-fang-of-green-sultan': { saber: () => saber(false), venomous: () => saber(true) },
  'live-ammo-ball': { clamshell: ammoBall },
  'toraline-root-vegetable': { whole: rootTuber, slice: rootTuberSlice },
  'phase-lava-rock-potion': { plain: plainPotion },
  'mongos-speed-and-strength-fang-caps': { plain: fangCaps },
  'neural-enhancer-275': { capsule },
  'pawnas-tears': { smoking: () => tears('mist') },
  'nightmare-ii': { painted: nightmare },
};
