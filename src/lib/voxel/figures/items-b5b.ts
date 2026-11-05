import { Vox } from '../vox.ts';
import { twin, person } from './parts.ts';
import { lathe, chamfer } from './itemparts.ts';
import { potion, scroll, piercing } from './itemforms.ts';

/* ---- items, set b5b (book 5, and what it carries on) ----
   Drawn like the anchor set in items.ts: one object, floating, three-quarter
   view, smooth (chunk 0), facing +y (the lit left face), z up. Each look from
   the edition's own description at its point; a colour the book leaves unsaid
   is a plain one. Shapes and colours only. */

const fresh = () => { const v = new Vox(); v.chunk = 0; return v; };
/** the same colour a step darker */
const shade = (hex: string, k = 0.84) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');

/** a block standing in the x-z plane with its corners cut back: a panel seen face on */
function panel(v: Vox, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, cut: number, m: string) {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const dx = Math.min(x - x0, x1 - x), dz = Math.min(z - z0, z1 - z);
    if (dx + dz >= cut) v.box(x, y0, z, x, y1, z, m);
  }
}
/** rows of characters drawn onto the face at y, top row first, from (x0, z0 + rows - 1) */
function face(v: Vox, x0: number, y: number, z0: number, rows: string[], pick: (c: string) => string | null) {
  rows.forEach((row, j) => [...row].forEach((c, i) => { const m = pick(c); if (m) v.set(x0 + i, y, z0 + rows.length - 1 - j, m); }));
}
/** a round tube lying along y, centred on (cx, cz) */
function tube(v: Vox, cx: number, cz: number, y0: number, y1: number, r: number, m: (x: number, y: number, z: number) => string | null) {
  for (let y = y0; y <= y1; y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
    if (Math.hypot(x - cx, z - cz) <= r) { const c = m(x, y, z); if (c) v.set(x, y, z, c); }
  }
}

/* ---- the potions the book names and leaves at that ----
   5:14 "a set of nine potions of Levitation"; 5:22 the Major Charlie potion
   Mordecai made, "usually called Brain Juice"; 4:10 Feather Fall, the potion
   Mordecai has no materials for; 5:55 Pawna's Cries, "a highly-valuable and
   familiar potion". None is ever given a colour: the plain potion. */
const plainPotion = () => potion();

/* ---- the size up scrolls, which turn into potions ----
   5:48 "over forty scrolls of something called Size Up": the plain scroll.
   5:67 the same things are "those Size Up potions I'd taken from Miriam Dom",
   and 8:80 Donut "downed a Size Up potion": from then on the plain potion. */
const sizeUpScroll = () => scroll();

/* ---- katia's knit beanie ----
   5:62 "a small, knit beanie"; it sinks into her mass when she puts it on, and
   at 5:74 it sits on Carl's head. No colour: a plain dull grey, a ribbed cuff
   folded up round its rim and the crown rounding over it. */
function beanie(): Vox {
  const v = fresh();
  const wool = '#80838b', rib = shade('#80838b', 0.86), crown = twin('#80838b');
  // the folded cuff, ribbed, a little wider than the crown over it
  const R = (z: number) => (z <= 3 ? 6.3 : [5.8, 5.8, 5.7, 5.5, 5.2, 4.7, 3.9, 2.6][z - 4] ?? 0);
  lathe(v, 6, 6, 0, 11, R, (x, y, z) => (z <= 3 ? ((x + y) % 2 ? rib : wool) : crown));
  return v;
}

/* ---- the shrink wand ----
   5:67 "a shrink wand like Zhang had before", and Zhang's, at 3:31: "He held up
   a stick. ... It's a magic wand. It shrinks." A plain wooden stick, tapering
   to its tip, nothing more. */
function shrinkWand(): Vox {
  const v = fresh();
  const wood = '#8a5a35', side = twin('#8a5a35');
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const x = Math.round(1 + (i * 9) / n), z = i;
    v.set(x, 0, z, wood);
    if (i <= 14) v.set(x, 1, z, side);
    if (i <= 7) { v.set(x + 1, 0, z, wood); v.set(x + 1, 1, z, side); }
  }
  return v;
}

/* ---- the patches ----
   5:36 the bomb patch is "a white, rectangular piece of fabric with a little,
   circular bomb hand stitched on it with fine, black thread. It almost looked
   like a pencil drawing of a bomb", the stitching raised. 5:43 the Midnight
   Epicure's is "identical in size to my white bomb one, but this was made of a
   black, denim-like material with a gray goat head screen-printed on it", "a
   weird, satanic goat". Both stand face on to +y, the same rectangle. */
const PW = 14, PH = 10;
function patchBlank(v: Vox, field: string, rim: string) {
  panel(v, 0, 0, 0, PW, 0, PH, 1, twin(field));
  panel(v, 0, 1, 0, PW, 1, PH, 1, field);
  for (let x = 0; x <= PW; x++) for (let z = 0; z <= PH; z++) {
    if (!v.has(x, 1, z)) continue;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !v.has(x + a, 1, z + b));
    if (edge) v.set(x, 1, z, rim);
  }
}
function bombPatch(): Vox {
  const v = fresh();
  const white = '#ece8de', hem = '#d9d3c4', thread = '#1d1b20';
  patchBlank(v, white, hem);
  // the bomb, as a pencil drawing in raised thread: its round outline, strokes of shading
  // on its lower right, the cap set on its shoulder and the fuse curling up out of it
  const cx = 5, cz = 4, r = 3;
  for (let x = 1; x <= 9; x++) for (let z = 0; z <= 8; z++) {
    const d = Math.hypot(x - cx, z - cz);
    if (Math.abs(d - r) <= 0.5) v.set(x, 2, z, thread);
    else if (d < r - 0.5 && (x - z) % 3 === 0 && x - cx - (z - cz) >= 0) v.set(x, 2, z, thread);
  }
  v.box(7, 2, 6, 8, 3, 7, thread);
  for (const [x, z] of [[9, 8], [10, 9], [11, 9], [12, 8]] as const) v.set(x, 2, z, thread);
  return v;
}
// the goat, front on: horns sweeping up and out, ears out to the sides, the long face down to a beard
const GOAT = [
  '#.........#',
  '##.......##',
  '.##.....##.',
  '..#######..',
  '###.###.###',
  '...#####...',
  '....###....',
  '.....#.....',
  '.....#.....',
];
function epicurePatch(sewn: boolean): Vox {
  const v = fresh();
  const denim = '#25252c', twill = '#2c2d35', gray = '#9a9ca2', thread = '#bcb6a8';
  patchBlank(v, denim, shade(denim, 0.8));
  // the denim's twill, a faint diagonal in the weave
  for (let x = 1; x < PW; x++) for (let z = 1; z < PH; z++) if ((x + z) % 3 === 0 && v.get(x, 1, z) === denim) v.set(x, 1, z, twill);
  // the goat, printed flat into the cloth, not raised
  face(v, 2, 1, 1, GOAT, c => (c === '#' ? gray : null));
  /* 5:44 Carl sews it on beside the bomb patch himself, "my wide stitches",
     and "it's not straight": big stitches over its edge, wide apart and crooked. */
  if (sewn) {
    const st: [number, number, number, number][] = [   // [x, z, dx, dz]: where a stitch crosses the edge, and which way it runs in
      [2, 0, 0, 1], [5, 0, 1, 1], [9, 0, 0, 1], [12, 0, -1, 1],
      [14, 3, -1, 0], [14, 7, -1, 1],
      [11, 10, 0, -1], [7, 10, 1, -1], [3, 10, 0, -1],
      [0, 6, 1, 0], [0, 2, 1, 1],
    ];
    st.forEach(([x, z, dx, dz], i) => {
      const n = i % 3 === 1 ? 3 : 2;
      for (let k = 0; k < n; k++) { const px = x + dx * k, pz = z + dz * k; if (v.has(px, 1, pz)) v.set(px, 1, pz, thread); }
    });
  }
  return v;
}

/* ---- prepotente's spray applicator ----
   5:49 "It looked like a handheld bicycle pump with a tin can welded underneath
   the nozzle", "a vintage-style spray applicator": the poison goes in the can and
   the pump pushes out a mist. The pump lies along y, its nozzle to the front, the
   plunger's handle at the back; the pump's metal is never named, so it is a plain
   one, and the can is tin. */
function sprayer(): Vox {
  const v = fresh();
  const barrel = '#6f767f', ring = '#5a6068', tin = '#c6cacf', lid = '#a4a9b0', seam = '#5f656d', handle = '#3e4148', nozzle = '#4c5158';
  // the pump barrel, a band at either end
  tube(v, 5, 10, 0, 9, 2.6, (x, y) => (y === 0 || y === 8 ? ring : barrel));
  // the nozzle end
  tube(v, 5, 10, 10, 10, 1.6, () => ring);
  v.box(5, 11, 10, 5, 12, 10, nozzle); v.set(5, 13, 10, '#2b2e33');
  // the plunger rod out of the back, and its handle across
  v.box(5, -2, 10, 5, -1, 10, seam);
  chamfer(v, 1, -4, 10, 9, -3, 11, 1, handle);
  // the tin can, welded on under the nozzle end
  lathe(v, 5, 9, 0, 6, z => (z === 0 ? 2.6 : 3.3), (x, y, z) => (z === 6 ? lid : z === 1 || z === 5 ? twin(tin) : tin));
  v.box(4, 8, 7, 6, 10, 7, seam);
  return v;
}

/* ---- uncle morty's insta lawn-kill ----
   5:50 "a set of four moonshine jugs", "Each were full of a bubbling, yellow
   liquid", one "almost as big as him". The moonshine jugs of this dungeon are
   clay with "the little round handle" (1:32); this one is open, full to the
   neck, and its yellow stuff bubbles up out of the mouth. */
function lawnKill(): Vox {
  const v = fresh();
  const clay = '#a8683f', rim = '#7a4527', handle = twin('#a8683f'), yellow = '#e2c22b', bubble = '#f4e27c';
  chamfer(v, 1, 1, 0, 8, 8, 0, 2, clay);
  chamfer(v, 0, 0, 1, 9, 9, 6, 2, clay);
  chamfer(v, 1, 1, 7, 8, 8, 7, 2, clay);
  chamfer(v, 2, 2, 8, 7, 7, 8, 2, clay);
  v.box(4, 4, 9, 5, 5, 10, rim);                                   // the neck
  v.box(10, 4, 3, 10, 5, 3, handle); v.box(11, 4, 3, 11, 5, 8, handle); v.box(10, 4, 8, 10, 5, 8, handle);
  // the yellow liquid at the mouth, bubbling over the lip
  v.box(4, 4, 10, 5, 5, 10, yellow);
  v.set(4, 5, 11, yellow); v.set(5, 4, 11, bubble); v.set(4, 4, 12, bubble); v.set(5, 6, 10, yellow); v.set(5, 6, 9, yellow);
  v.set(3, 6, 13, bubble); v.set(6, 5, 14, bubble);
  return v;
}

/* ---- the quarter fall nipple ring ----
   5:55 "The glowing, gold ring was about the size of a half dollar", the third
   of the hunter's nipple rings: the plain piercing, in gold, lit. */
function quarterFall(): Vox {
  const v = piercing({ metal: '#d9a83c' });
  for (const { p: [x, y, z] } of v.all()) if (y === 1) v.set(x, y, z, 'window');
  for (const [x, y, z] of [[-2, 1, 9], [14, 1, 3], [11, 1, -2], [1, 1, 1]] as const) v.set(x, y, z, 'window');
  return v;
}

/* ---- the enchanted obsidian bracelet ----
   5:23 "It's black, and it looks like it's made from glass. It's just a plain
   bangle", "This murky bracelet is light", "made of obsidian glass". A deep band
   standing on its edge, its hole to the front, glossy where it turns to the light. */
function obsidianBangle(): Vox {
  const v = fresh();
  const black = '#211e26', murk = '#2d2934', gloss = '#6c6878', shine = '#9d9aab';
  const c = 7, R = 6.8;
  for (let x = 0; x <= 14; x++) for (let z = 0; z <= 14; z++) {
    const d = Math.hypot(x - c, z - c);
    if (d <= R && d >= R - 2) for (let y = 0; y <= 3; y++) v.set(x, y, z, y === 3 ? murk : black);
  }
  // the gloss: a streak along the upper left of its front edge, and a glint on the right
  for (let x = 0; x <= 14; x++) for (let z = 0; z <= 14; z++) {
    const d = Math.hypot(x - c, z - c), a = Math.atan2(z - c, x - c);
    if (d <= R && d >= R - 0.9 && a > 1.7 && a < 2.9) v.set(x, 3, z, gloss);
  }
  v.set(2, 3, 11, shine); v.set(12, 3, 4, gloss);
  return v;
}

/* ---- satchel bombs ----
   5:55 "Basically little bags with leather handles". The bag's stuff is never
   given, so it is a plain drab cloth, its flap folded over the front; the two
   handles are leather. */
function satchel(): Vox {
  const v = fresh();
  const cloth = '#8a7f69', flap = twin('#8a7f69'), leather = '#6b4428';
  chamfer(v, 0, 0, 0, 11, 6, 8, 2, cloth);
  // the flap folded over the front from the top
  panel(v, 1, 7, 4, 10, 7, 8, 1, flap);
  // the two leather handles arching over the top, one off the front edge and one off the back
  for (const y of [1, 5]) {
    v.box(3, y, 9, 3, y, 10, leather); v.box(8, y, 9, 8, y, 10, leather);
    v.box(4, y, 11, 7, y, 11, leather);
  }
  return v;
}

/* ---- the stuffed slate butterfly figure ----
   5:57 "a gray and brown, fuzzy moth or butterfly thing", a stuffed figure
   "(With tags.)"; 5:65 "hand-sized". A plush: a fat fuzzy body with its head to
   the front, the wings spread and lifted a little, gray with brown at the root,
   a brown spot on each, two stubby feelers, and its tag hanging off it, plain
   pale card. */
/** is (x, z) inside the polygon? */
function inside(pts: [number, number][], x: number, z: number) {
  let r = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) r = !r;
  }
  return r;
}
/* Laid out on the diagonal, its body running toward the eye and its wings across: u = x - y runs
   across the picture, w = x + y toward the viewer, so both wings face the light alike. */
// one wing, open: |u| out from the body, w along it (the head at +w); the forewing sweeping
// forward and out to its tip, the rounder hindwing behind it
const FOREWING: [number, number][] = [[1, -1], [1, 6], [5, 9.5], [10.5, 9], [13.5, 6], [11, 2], [5, -1.5]];
function slateButterfly(): Vox {
  const v = fresh();
  const gray = '#97948f', grayDark = shade('#97948f', 0.86), brown = '#6a4d35', fuzz = '#7c5c41', head = '#4e3828', tag = '#e8e3d6', tagEdge = '#c9c2b2';
  for (let x = -10; x <= 14; x++) for (let y = -14; y <= 10; y++) {
    const u = x - y, w = x + y, a = Math.abs(u);
    // the body, fat and fuzzy, and the head at its front
    if (a <= 2 && w >= -9 && w <= 8) { v.box(x, y, 0, x, y, 2, brown); v.box(x, y, 3, x, y, a <= 1 ? 4 : 3, fuzz); }
    if (a <= 2 && w >= 9 && w <= 12) v.box(x, y, 1, x, y, 4, head);
    // the wings, spread and lifted a little, plush and two thick: gray, brown at the
    // root, a brown spot on each forewing and the hindwing's tail brown
    const f = a >= 2 && inside(FOREWING, a, w), hr = Math.hypot((a - 5.5) / 5.2, (w + 5) / 5), h = a >= 2 && hr <= 1;
    if (!f && !h) continue;
    const m = a <= 2 ? brown : f ? (Math.hypot(a - 8, w - 5.5) < 1.8 ? brown : gray) : hr > 0.7 && w < -6 ? brown : gray;
    const z = 3 + Math.floor(a / 5);
    if (!v.has(x, y, z)) { v.set(x, y, z, m); v.set(x, y, z - 1, m === gray ? grayDark : twin(m)); }
  }
  // the feelers, out toward the eye and up
  for (const [x, y, z] of [[7, 6, 5], [8, 6, 6], [9, 6, 7], [6, 7, 5], [6, 8, 6], [6, 9, 7]] as const) v.set(x, y, z, head);
  // the tag, hanging on its loop from under the head
  v.set(6, 5, 0, tagEdge);
  v.box(5, 5, -5, 6, 6, -1, tag); v.box(5, 5, -5, 6, 6, -5, tagEdge);
  return v;
}

/* ---- princess lunette, the flesh golem ----
   6:26 "It appeared in my arms, rigid like a board. It was a full-sized, pure
   naiad", "She wore a flowing dress made of seaweed", "Her silky, white hair
   hung down, so long it hit the pavement", and laid down on the asphalt "She
   appeared as if she was sleeping"; at 5:73 "The harsh eyes of the creature
   were closed". A full naiad is "blue-tinged" (5:10). Her figure is the
   cast's, laid out flat on her back as Carl lays her down, her feet to the
   front, her face up, the long hair spread out round her head. 7:84 "she has
   gills": slits at the neck. */
function lunette(gills: boolean): Vox {
  const skin = '#9cb9c6', hair = '#f1f0ec', weed = '#4b6a36', weed2 = '#5f7f3d', lid = '#33424c', slit = '#4a5f6b';
  const up = person({ bare: true, skin, hair: { color: hair, style: 'long' }, top: weed, bottom: weed2, outfit: 'dress', sleeves: 'none', feet: null });
  // bare feet out from under the hem
  up.clear(1, 2, 5, 6, 6, 5); up.box(1, 3, 5, 2, 7, 5, twin(skin)); up.box(5, 3, 5, 6, 7, 5, twin(skin));
  // the eyes closed, hard lids slanting down to the nose
  for (const x of [2, 5]) { up.set(x, 7, 17, skin); up.set(x, 7, 18, skin); }
  up.set(1, 7, 18, lid); up.set(2, 7, 17, lid); up.set(6, 7, 18, lid); up.set(5, 7, 17, lid);
  // the seaweed dress in streaks, and its hem in long strands
  for (let x = 0; x <= 7; x++) for (let z = 5; z <= 13; z++) for (let y = 1; y <= 7; y++) if (up.get(x, y, z) === weed && x % 2 === 0) up.set(x, y, z, weed2);
  for (const x of [0, 2, 4, 6]) up.set(x, 7, 4, x % 4 ? weed : weed2);
  // the hair over her ears falls away to the ground once she lies down
  for (const x of [0, 7]) for (let y = 0; y <= 6; y++) for (let z = 11; z <= 18; z++) if (up.get(x, y, z) === hair) up.set(x, y, z, y >= 2 && z >= 14 ? skin : null);
  if (gills) for (const x of [0, 7]) for (const y of [3, 5]) up.box(x, y, 14, x, y, 15, slit);
  // laid on her back: up is now the front of her, and her head lies to the back
  const v = fresh();
  for (const { p: [x, y, z], mat } of up.all()) v.set(x, 27 - z, y + 1, mat);
  // the hair, spread on the ground beyond her head and down beside her shoulders
  for (let y = 0; y <= 5; y++) for (let x = -3; x <= 10; x++) {
    const w = 6 - y;
    if (x < -Math.min(3, Math.floor(w / 2)) || x > 7 + Math.min(3, Math.floor(w / 2))) continue;
    if (y === 0 && (x < 1 || x > 6)) continue;
    v.set(x, y, 0, hair); if (y >= 3 && x >= -1 && x <= 8) v.set(x, y, 1, (x + y) % 3 ? hair : twin(hair));
  }
  for (const x of [-1, 8]) for (let y = 6; y <= 15; y++) { v.set(x, y, 0, hair); if (y <= 11) v.set(x, y, 1, twin(hair)); }
  return v;
}

export const ITEMS_B5B: Record<string, Record<string, () => Vox>> = {
  'katias-knit-beanie': { plain: beanie },
  'levitation-potion': { plain: plainPotion },
  'princess-lunette': { golem: () => lunette(false), gilled: () => lunette(true) },
  'major-charlie': { plain: plainPotion },
  'shrink-wand': { stick: shrinkWand },
  'feather-fall-potion': { plain: plainPotion },
  'midnight-epicure-patch': { printed: () => epicurePatch(false), sewn: () => epicurePatch(true) },
  'pawnas-cries': { plain: plainPotion },
  'prepotentes-spray-applicator': { plain: sprayer },
  'uncle-mortys-insta-lawn-kill': { jug: lawnKill },
  'quarter-fall-nipple-ring': { plain: quarterFall },
  'raggle-rouser-bracelet': { plain: obsidianBangle },
  'satchel-bomb': { plain: satchel },
  'size-up-potion': { scroll: sizeUpScroll, potion: plainPotion },
  'bomb-patch': { blackwork: bombPatch },
  'stuffed-slate-butterfly': { plush: slateButterfly },
};
