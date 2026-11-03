import { Vox, rng, slab, house, disc, ring, palm, tree } from '../vox.ts';
import { CARL, DONUT, PALETTE } from '../../maps/sprites.ts';
import type { VoxelMap } from './index.ts';

/* Floor 8's page map, composed as one diorama: Havana a few weeks before the
   end, and the Keys across the strait. Not to scale, and it says so.

   The capitol is the hero object and fills the middle: a pale plinth and two
   wings in big blocks, a columned portico over a broad stair, a drum and a
   green dome. Old Havana climbs behind it in blocks of coloured stucco with
   terracotta roofs and palms; the Prado runs before the stair; the coast
   highway and the sea wall run down the right-hand edge, rocks and surf below
   them on a lower shelf of sea. A lower terrace at the front holds the
   cemetery and, later, the church. The Keys float apart across the strait.
   Three cards stand in front of it all, because the floor is a card game.

   The ground, the sea, the rocks and the cards carry no layer: they are there
   in every state. The tile is this same scene at its artAt; the hero picture
   is this scene at its end. */

const SEA_X = 34;                   // the sea shelf starts here
const HWY = 28;                     // the coast highway, four cells wide
const CAP = [14, 22] as const;      // the capitol's centre (even, so its blocks sit on the grid)
const CEM = [8, 38] as const;       // the cemetery on the front terrace
const CH = [20, 35] as const;       // the church's corner
const TALL = [8, 8] as const;       // the tallest roof in the west: where the snake stands
const KEYS = [50, 0, 61, 12] as const;

/* Faded stucco: pink, yellow, turquoise, cream; roofs of terracotta, slate or a terrace. */
const WALLS = ['pink', 'brick', 'glassTeal', 'cloth', 'plaster', 'pink', 'brick', 'white', 'blue'];
const ROOFS = ['roofRed', 'roofRed', 'accent', 'roofRed', 'tile', 'roofRed'];

/** A street lamp: a black post with a lit head. */
const lamp = (v: Vox, x: number, y: number, z = 1) => { v.col(x, y, z, z + 2, 'black'); v.set(x, y, z + 3, 'window'); };

/** A fifties car: a coloured body two blocks wide, a glass cabin. */
const car = (v: Vox, x: number, y: number, body: string, alongX = true) => {
  const [dx, dy] = alongX ? [1, 0] : [0, 1];
  for (let i = 0; i < 3; i++) v.set(x + dx * i, y + dy * i, 1, body);
  for (let i = 0; i < 3; i++) v.set(x + dx * i + dy, y + dy * i + dx, 1, body);
  v.set(x + dx, y + dy, 2, 'glass'); v.set(x + dx + dy, y + dy + dx, 2, 'glass');
};

/** A colonial block in big blocks: stucco walls, rows of lit shutters, a roof. */
function building(v: Vox, x0: number, y0: number, x1: number, y1: number, h: number, wall: string, roof: string) {
  v.chunk = 2; v.box(x0, y0, 1, x1, y1, h, wall); v.chunk = 1;
  for (let z = 2; z <= h; z += 2) {
    for (let x = x0; x <= x1; x++) if (x % 2) v.set(x, y1, z, (x + z) % 4 === 1 ? 'window' : 'woodDark');
    for (let y = y0; y <= y1; y++) if (y % 2) v.set(x1, y, z, (y + z) % 4 === 1 ? 'window' : 'woodDark');
  }
  if (h >= 4) for (let x = x0; x <= x1; x++) v.set(x, y1 + 1, 2, x % 2 ? 'black' : null);   // a balcony rail
  if (roof === 'tile') {
    v.box(x0, y0, h + 1, x1, y1, h + 1, 'tile');
    for (let x = x0; x <= x1; x++) { v.set(x, y0, h + 2, wall); v.set(x, y1, h + 2, wall); }
    for (let y = y0; y <= y1; y++) { v.set(x0, y, h + 2, wall); v.set(x1, y, h + 2, wall); }
    v.set(x0 + 1, y0 + 1, h + 2, 'stone'); v.set(x0 + 1, y0 + 1, h + 3, 'stoneDark');
  } else {
    v.chunk = 2; v.box(x0, y0, h + 1, x1, y1, h + 1, roof); v.chunk = 1;
    v.box(x0 + 1, y0 + 1, h + 2, x1 - 1, y1 - 1, h + 2, roof);
  }
}

/** El Capitolio: plinth and wings in big blocks, the portico and stair, the drum, the dome or the hole where it was. */
function capitol(v: Vox, fallen: boolean) {
  const [cx, cy] = CAP;
  v.chunk = 2;
  v.box(cx - 12, cy - 4, 1, cx + 11, cy + 3, 2, 'plaster');                   // the plinth
  v.box(cx - 12, cy - 4, 3, cx + 11, cy + 3, 8, 'plaster');                   // the two wings
  v.box(cx - 4, cy - 4, 9, cx + 3, cy + 3, 10, 'plaster');                    // the centre, a storey up
  v.box(cx - 12, cy - 4, 9, cx - 5, cy + 3, 9, 'tile'); v.box(cx + 4, cy - 4, 9, cx + 11, cy + 3, 9, 'tile');
  v.chunk = 1;
  // pilasters and tall windows down both wings, on the faces the eye sees
  for (let x = cx - 12; x <= cx + 11; x++) if (Math.abs(x - cx + 0.5) > 5) for (let z = 3; z <= 7; z++) v.set(x, cy + 3, z, x % 2 ? (z >= 4 && z <= 6 ? 'woodDark' : 'plaster') : 'white');
  for (let y = cy - 4; y <= cy + 3; y++) for (let z = 3; z <= 7; z++) v.set(cx + 11, y, z, y % 2 ? (z >= 4 && z <= 6 ? 'woodDark' : 'plaster') : 'white');
  v.box(cx - 11, cy - 3, 10, cx - 6, cy + 2, 10, 'roofGreen'); v.box(cx + 5, cy - 3, 10, cx + 10, cy + 2, 10, 'roofGreen');   // skylit courts
  // the portico: white columns before a dark doorway, a pediment over them
  v.box(cx - 4, cy + 4, 3, cx + 3, cy + 4, 9, (x, _y, z) => (z <= 8 && x >= cx - 1 && x <= cx && fallen ? 'void' : 'woodDark'));
  for (let x = cx - 4; x <= cx + 3; x += 2) v.col(x, cy + 5, 3, 9, 'white');
  v.col(cx + 3, cy + 5, 3, 9, 'white');
  v.chunk = 2; v.box(cx - 4, cy + 4, 10, cx + 3, cy + 5, 11, 'plaster'); v.chunk = 1;
  v.box(cx - 2, cy + 4, 12, cx + 1, cy + 5, 12, 'plaster');
  // the broad stair down to the Prado
  for (let i = 0; i < 4; i++) v.box(cx - 6, cy + 6 + i, 1, cx + 5, cy + 6 + i, 2 - Math.floor(i / 2), 'cloth');
  // the drum: white, with dark windows between columns
  ring(v, cx - 0.5, cy - 0.5, 4.6, 1.4, 11, 15, (x, y, z) => (z >= 12 && z <= 14 && (x + y) % 2 === 0 ? 'woodDark' : 'white'));
  if (!fallen) {
    disc(v, cx - 0.5, cy - 0.5, 3.4, 3.4, 11, 15, 'white');
    v.box(cx - 6, cy - 6, 16, cx + 5, cy + 5, 16, (x, y) => (Math.hypot(x - cx + 0.5, y - cy + 0.5) <= 5.6 ? 'white' : null));
    const shells = [5, 5, 4.8, 4.4, 3.9, 3.2, 2.3, 1.2];
    const rib = (x: number, y: number) => { const a = Math.atan2(y - cy + 0.5, x - cx + 0.5) / (Math.PI / 6); return Math.abs(a - Math.round(a)) < 0.14; };
    shells.forEach((r, i) => disc(v, cx - 0.5, cy - 0.5, r, r, 17 + i, 17 + i, (x, y) => (rib(x, y) ? 'glassTeal' : 'roofGreen')));
    v.box(cx - 1, cy - 1, 25, cx, cy, 27, 'plaster'); v.box(cx - 1, cy - 1, 28, cx, cy, 28, 'roofGreen'); v.set(cx, cy, 29, 'accent');
  } else {
    for (let x = cx - 5; x <= cx + 4; x++) for (let y = cy - 5; y <= cy + 4; y++) if ((x * 7 + y * 3) % 4 === 0) v.clear(x, y, 14, x, y, 15);
    disc(v, cx - 0.5, cy - 0.5, 3.2, 3.2, 9, 11, 'void');
    const r = rng(812);
    for (let i = 0; i < 26; i++) v.set(cx - 7 + Math.floor(r() * 14), cy + 6 + Math.floor(r() * 4), 1 + Math.floor(r() * 3), i % 3 ? 'plaster' : i % 2 ? 'roofGreen' : 'white');
  }
}

/* ---- Old Havana's blocks, laid out once so every state has the same streets ---- */
type Lot = { x0: number; y0: number; x1: number; y1: number; h: number; wall: string; roof: string } | { square: true; x0: number; y0: number; x1: number; y1: number };
const LOTS: Lot[] = (() => {
  const r = rng(804), out: Lot[] = [];
  // blocks on a six-cell period, streets two cells wide, everything on the big-block grid
  for (let bx = 0; bx < 4; bx++) for (let by = 0; by < 3; by++) {
    const x0 = 6 * bx + 2, y0 = 6 * by + 2, x1 = x0 + 3, y1 = y0 + 3;
    if (x0 === TALL[0] && y0 === TALL[1]) continue;
    if (r() < 0.14) { out.push({ square: true, x0, y0, x1, y1 }); continue; }
    const pick = () => ({ h: [3, 4, 4, 5, 6][Math.floor(r() * 5)] + (2 - by), wall: WALLS[Math.floor(r() * WALLS.length)], roof: ROOFS[Math.floor(r() * ROOFS.length)] });
    if (r() < 0.5) out.push({ x0, y0, x1, y1, ...pick() });
    else { out.push({ x0, y0, x1: x0 + 1, y1, ...pick() }); out.push({ x0: x0 + 2, y0, x1, y1, ...pick() }); }
  }
  // two lots on the strip beside the capitol's right wing
  out.push({ x0: 26, y0: 2, x1: 27, y1: 5, h: 4, wall: 'pink', roof: 'roofRed' }, { x0: 26, y0: 8, x1: 27, y1: 11, h: 5, wall: 'brick', roof: 'accent' });
  return out;
})();

/** Is (x, y) part of the city's ground? A main block with notches, not a rectangle. */
const cityGround = (x: number, y: number) => !(x <= 1 && y <= 5) && !(x <= 3 && y >= 30) && !(x >= 26 && x <= 27 && y >= 30);

function build(shown: Set<string>): Vox {
  const v = new Vox();
  const has = (id: string) => shown.has(id);
  const T = (id: string) => { v.tag = id; return has(id); };
  const hero = has('hero');

  /* ---- the ground: the city, the front terrace, the sea shelf, the Keys ---- */
  v.tag = '';
  const street = (x: number, y: number) => x % 6 < 2 || y % 6 < 2;
  slab(v, 0, 0, SEA_X - 1, 33, 0, { depth: 9, seed: 801, shape: cityGround, crust: 'sand', under: ['dirt', 'dirtDark'],
    top: (x, y) => (x >= HWY ? 'stoneDark' : y >= 28 ? (((x >> 1) + (y >> 1)) % 2 ? 'tile' : 'plaster') : street(x, y) ? 'stone' : 'tile') });
  // the sea: a shelf a step down, deeper away from the shore, with rocks along the wall
  slab(v, SEA_X, 0, 47, 35, -2, { depth: 6, seed: 803, shape: (x, y) => !(x >= 44 && y >= 32) && !(x >= 46 && y <= 3), crust: 'sand', under: ['dirt', 'dirtDark'],
    top: (x) => (x <= SEA_X + 3 ? 'water' : 'waterDeep') });
  {
    const r = rng(809);
    for (let y = 0; y <= 34; y += 2) {
      v.chunk = 2; v.box(SEA_X, y, -1, SEA_X + 1, y + 1, -1 + (r() < 0.5 ? 1 : 0), r() < 0.3 ? 'dirt' : 'sand'); v.chunk = 1;
      v.set(SEA_X + 2, y + (r() < 0.5 ? 0 : 1), -1, 'white');
      if (r() < 0.4) v.set(SEA_X + 3 + Math.floor(r() * 2), y + 1, -1, 'white');
    }
    for (const [x, y] of [[40, 6], [43, 16], [39, 24], [44, 28], [41, 13]]) { v.chunk = 2; v.box(x, y, -1, x + 1, y + 1, -1, 'sand'); v.chunk = 1; v.set(x - 1, y + 1, -1, 'white'); v.set(x + 2, y, -1, 'white'); }
  }
  // a loose chunk of the city's corner, drifting off
  slab(v, 0, 36, 3, 39, -4, { depth: 3, seed: 806, crust: 'sand', under: ['dirt', 'dirtDark'], top: 'grass' });

  /* ---- three cards stand in front of it all: the floor is a card game ---- */
  for (const [i, c] of (['blue', 'red', 'accent'] as const).entries()) {
    const x0 = 31 + i * 6, y = 39 + i, z0 = -6 + i;
    v.box(x0, y, z0, x0 + 4, y, z0 + 7, 'white');
    v.box(x0 + 1, y, z0 + 1, x0 + 3, y, z0 + 6, c);
    v.box(x0 + 2, y, z0 + 2, x0 + 2, y, z0 + 5, 'cloth'); v.set(x0 + 1, y, z0 + 3, 'cloth'); v.set(x0 + 3, y, z0 + 3, 'cloth'); v.set(x0 + 1, y, z0 + 4, 'cloth'); v.set(x0 + 3, y, z0 + 4, 'cloth');
  }

  /* ---- the capitol, and later the hole where its dome was ---- */
  if (T('capitol')) capitol(v, false);
  if (T('capitol-down')) capitol(v, true);

  /* ---- before the floor unlocks: smoke over everything but the capitol ---- */
  if (T('smoke')) {
    const r = rng(807);
    for (let x = 0; x <= 47; x++) for (let y = 0; y <= 43; y++) {
      if (x >= CAP[0] - 13 && x <= CAP[0] + 12 && y >= CAP[1] - 5 && y <= CAP[1] + 9) continue;
      const g = v.get(x, y, 0) ?? v.get(x, y, -2);
      if (g == null || r() < 0.2) continue;
      const z0 = v.has(x, y, 0) ? 1 : -1;
      v.col(x, y, z0, z0 + Math.floor(r() * 4), r() < 0.5 ? 'black' : 'stoneDark');
    }
  }

  /* ---- Old Havana: the blocks, the Prado, palms, lamps and old cars ---- */
  if (T('old-havana')) {
    for (const l of LOTS) {
      if ('square' in l) {
        v.box(l.x0, l.y0, 0, l.x1, l.y1, 0, 'grass');
        palm(v, l.x0 + 1, l.y0 + 1, 1, 5); palm(v, l.x1, l.y1, 1, 4); v.set(l.x0, l.y1, 1, 'leafLight'); v.set(l.x1, l.y0, 1, 'leaf');
      } else building(v, l.x0, l.y0, l.x1, l.y1, l.h, l.wall, l.roof);
    }
    building(v, TALL[0], TALL[1], TALL[0] + 3, TALL[1] + 3, 13, 'plaster', 'tile');
    // the Prado: palms and lamps down the promenade before the stair
    for (let x = 4; x <= 26; x += 4) if (Math.abs(x - CAP[0]) > 7) palm(v, x, 30, 1, 5);
    for (let x = 2; x <= 26; x += 4) if (Math.abs(x - CAP[0]) > 6) lamp(v, x, 32);
    for (let x = 6; x <= 26; x += 2) if (Math.abs(x - CAP[0]) > 6) v.set(x, 28, 1, 'leaf');
    const r = rng(808), cols = ['red', 'blue', 'accent', 'glassTeal', 'white', 'pink'];
    for (const [x, y, ax] of [[2, 12, true], [12, 0, false], [20, 12, true], [24, 6, false], [6, 33, true], [18, 0, false]] as const) car(v, x, y, cols[Math.floor(r() * cols.length)], ax);
  }

  /* ---- the coast highway, the sea wall, its lamps ---- */
  if (T('coast-highway')) {
    for (let y = 0; y <= 33; y++) { v.set(HWY + 1, y, 0, y % 4 < 2 ? 'cloth' : 'stoneDark'); }
    v.box(HWY + 5, 0, 1, HWY + 5, 33, 1, 'plaster');
    for (let y = 1; y <= 33; y += 5) lamp(v, HWY + 3, y);
    car(v, HWY + 2, 8, 'glassTeal', false); car(v, HWY, 20, 'pink', false);
  }
  if (T('pileups')) for (const [x, y, ax] of [[HWY, 26, false], [18, 32, true], [6, 12, true]] as const) {
    const r = rng(x * 7 + y);
    for (let i = 0; i < 3; i++) car(v, x + (ax ? i * 2 : (i % 2)), y + (ax ? (i % 2) - 1 : i * 2), ['red', 'blue', 'accent', 'white', 'glassTeal'][Math.floor(r() * 5)], !ax);
    v.box(x + 1, y, 3, x + 2, y + 1, 3, 'stoneDark'); v.set(x + 1, y, 4, 'black'); v.set(x + 2, y + 1, 5, 'stoneDark');
  }
  if (T('seals')) for (const [x, y] of [[40, 6], [43, 16], [39, 24], [41, 13]]) {
    v.box(x, y, 0, x + 1, y, 0, 'stone'); v.set(x + 1, y + 1, 0, 'stone'); v.set(x, y, 1, 'stoneDark'); v.set(x + 2, y + 1, 0, 'stoneDark');
  }

  /* ---- the cemetery on the front terrace: a black fence, a white arch, a lane to the church ---- */
  const [ex, ey] = CEM, Z = -2;
  if (T('cemetery')) {
    // the terrace it stands on: a step down from the city, arriving with it
    slab(v, 0, 34, 27, 43, -2, { depth: 7, seed: 802, shape: (x, y) => !(x >= 24 && y >= 42) && !(x <= 1 && y >= 42), crust: 'sand', under: ['dirt', 'dirtDark'], top: 'grass' });
    const [x0, y0, x1, y1] = [ex - 6, ey - 3, ex + 7, ey + 4];
    for (let x = x0; x <= x1; x++) for (const y of [y0, y1]) if (x % 2 === 0) v.col(x, y, Z + 1, Z + 2, 'black');
    for (let y = y0; y <= y1; y++) for (const x of [x0, x1]) if (y % 2 === 0) v.col(x, y, Z + 1, Z + 2, 'black');
    v.chunk = 2; v.box(x1, ey, Z + 1, x1 + 1, ey + 1, Z + 6, 'plaster'); v.chunk = 1;
    v.box(x1, ey - 2, Z + 1, x1, ey - 1, Z + 5, 'plaster'); v.box(x1, ey + 2, Z + 1, x1, ey + 3, Z + 5, 'plaster');
    v.box(x1, ey - 2, Z + 6, x1, ey + 3, Z + 6, 'white'); v.clear(x1, ey, Z + 1, x1 + 1, ey + 1, Z + 4);
    for (let x = x0 + 1; x < x1; x++) v.set(x, ey, Z, 'stone');
    for (let x = x0 + 1; x < x1; x += 2) for (let y = y0 + 1; y < y1; y += 2) if (y !== ey && Math.abs(x - ex) > 1) v.set(x, y, Z + 1, 'white');
  }
  if (T('ghommid-fog')) { const r = rng(810); for (let x = -5; x <= 6; x++) for (let y = -2; y <= 3; y++) if (r() < 0.8) v.col(ex + x, ey + y, Z + 1, Z + 1 + Math.floor(r() * 3), r() < 0.9 ? 'mist' : 'portal'); }
  if (T('ghommid-village')) {
    for (const [dx, dy] of [[-5, -2], [3, 2], [-5, 2]]) house(v, ex + dx, ey + dy, Z + 1, 2, 2, 2, 'roofRed');
    v.col(ex + 4, ey - 2, Z + 1, Z + 5, 'accent'); v.set(ex + 4, ey - 2, Z + 6, 'accentGlow');
  }
  if (T('iglesia')) {
    disc(v, ex, ey, 2.2, 2.2, Z + 1, Z + 4, 'brick'); disc(v, ex, ey, 1.4, 1.4, Z + 5, Z + 5, 'brick');
    v.col(ex, ey, Z + 6, Z + 7, 'brick'); v.set(ex, ey, Z + 8, 'white'); v.set(ex + 2, ey, Z + 2, 'void'); v.set(ex, ey + 2, Z + 2, 'void');
  }
  if (T('web')) for (const [x, y, s] of [[2, 42, 1], [25, 41, 2], [1, 36, 3]]) { tree(v, x, y, Z + 1, 3, 820 + s); disc(v, x, y, 2.2, 2.2, Z + 3, Z + 5, (_x, _y, z) => (z === Z + 5 ? 'white' : 'cloth')); }
  if (T('church')) {
    const [cx, cy] = CH;
    v.chunk = 2; v.box(cx, cy, Z + 1, cx + 5, cy + 5, Z + 6, 'cloth'); v.box(cx, cy + 4, Z + 7, cx + 1, cy + 5, Z + 16, 'cloth'); v.chunk = 1;
    for (let i = 0; i <= 2; i++) v.box(cx + 2, cy + i, Z + 7 + i, cx + 5, cy + 5 - i, Z + 7 + i, 'roofRed');
    v.box(cx, cy + 4, Z + 17, cx + 1, cy + 5, Z + 17, 'roofRed'); v.set(cx, cy + 5, Z + 18, 'accent');
    v.set(cx + 1, cy + 5, Z + 14, 'void'); v.set(cx + 1, cy + 5, Z + 13, 'void'); v.set(cx + 5, cy + 4, Z + 13, 'void');
    v.box(cx + 3, cy + 5, Z + 1, cx + 4, cy + 5, Z + 3, 'woodDark'); v.set(cx + 5, cy + 2, Z + 4, 'window'); v.set(cx + 5, cy + 3, Z + 4, 'window');
  }
  if (T('crabs')) { const r = rng(811); for (let i = 0; i < 70; i++) { const x = HWY - 2 + Math.floor(r() * 10), y = 14 + Math.floor(r() * 20); const z = x >= SEA_X ? -1 : x >= HWY + 4 ? 2 : 1; if (!v.has(x, y, z)) v.set(x, y, z, r() < 0.8 ? 'red' : 'redDark'); } }

  /* ---- the Keys across the strait ---- */
  if (T('keys')) {
    slab(v, KEYS[0], KEYS[1], KEYS[2], KEYS[3], -1, { depth: 5, seed: 805, shape: (x, y) => !(x >= 60 && y >= 10) && !(x <= 51 && y <= 1), crust: 'sand', under: ['dirt', 'dirtDark'], top: 'sand' });
    v.box(KEYS[0] + 1, KEYS[1] + 7, -1, KEYS[2] - 1, KEYS[3] - 1, -1, 'grass');
    for (const [x, y, rf] of [[52, 9, 'roofBlue'], [56, 10, 'roofRed'], [59, 7, 'roofBlue']] as const) house(v, x, y, 0, 2, 2, 1, rf);
    palm(v, 51, 4, 0, 4); palm(v, 60, 3, 0, 3);
    for (let x = 48; x < KEYS[0]; x++) v.set(x, 10, -1, 'stoneDark');      // the overseas road, out to the shelf
  }
  if (T('earth-wall')) disc(v, 55, 5, 5, 4, 0, 9, (x, y, z) => (z === 9 ? 'grass' : (x + y + z) % 5 === 0 ? 'dirtDark' : 'dirt'));
  if (T('iowa')) {
    house(v, 53, 3, 10, 3, 2, 2, 'roofRed'); v.box(57, 3, 10, 58, 5, 12, 'red'); v.box(57, 3, 13, 58, 5, 13, 'stone');
    v.col(59, 7, 10, 14, 'metal'); v.set(59, 7, 15, 'metalDark');
    for (let x = 52; x <= 58; x++) v.set(x, 7, 10, x % 2 ? 'brick' : 'leafLight');
  }
  if (T('iowa-gone')) for (let i = 0; i < 5; i++) disc(v, 55 - i * 0.6, 5 + i * 1.2, 5.5 - i * 0.6, 3.2, 0, 2 - Math.floor(i / 2), i % 2 ? 'dirtDark' : 'dirt');

  /* ---- the end ---- */
  if (T('madre')) for (let a = 0; a < Math.PI * 3; a += 0.1) {
    const x = Math.round(39 + Math.cos(a) * (1.5 + a * 0.8)), y = Math.round(26 + Math.sin(a) * (1.2 + a * 0.6));
    if (x >= SEA_X + 1) v.box(x, y, -1, x, y, 0, a < 0.3 ? 'redDark' : Math.floor(a / 0.5) % 2 ? 'slime' : 'leaf');
  }
  if (T('burning')) {
    const r = rng(813), lots = LOTS.filter((l): l is Extract<Lot, { h: number }> => 'h' in l);
    for (let i = 0; i < 14; i++) {
      const l = lots[Math.floor(r() * lots.length)], top = l.h + 2;
      v.set(l.x0, l.y1, top + 1, 'flame'); v.set(l.x0, l.y1, top, 'ember'); v.set(l.x1, l.y0, top, 'ember');
      for (let z = top + 2; z <= top + 4 + Math.floor(r() * 4); z++) v.set(l.x0 + (z % 2), l.y0, z, z % 3 ? 'black' : 'stoneDark');
    }
  }
  // Amayon: the snake, upright on the tallest roof in the west, pouring fire into the sky
  if (T('amayon') && !hero) {
    v.box(TALL[0] + 1, TALL[1] + 1, 16, TALL[0] + 2, TALL[1] + 2, 20, 'slime');
    for (let z = 21; z <= 31; z++) v.set(TALL[0] + 1 + (z % 2), TALL[1] + 1, z, z % 3 ? 'flame' : 'ember');
  }

  /* The hero picture only: the end of the floor. The serpent Amayon is trapped
     in coils round the tallest roof in the west and rears over the burning
     city, casting the spell that pulls every soul upward: a column of fire out
     of its jaws and the souls spiralling up into it. Carl and Donut at the
     church's door, the stairwell. */
  if (hero) {
    v.tag = 'amayon';
    const [tx, ty] = [TALL[0] + 1.5, TALL[1] + 1.5];
    const pts: [number, number, number][] = [];
    for (let t = 0; t <= 1.0001; t += 0.004) {
      if (t < 0.5) { const a = t / 0.5 * Math.PI * 4 + 1, rr = 3.6; pts.push([tx + Math.cos(a) * rr, ty + Math.sin(a) * rr, 2 + t / 0.5 * 13]); }
      else { const u = (t - 0.5) / 0.5; pts.push([tx + 2 + Math.sin(u * Math.PI * 1.3) * 4 + u * 5, ty + 3 + u * 8, 15 + u * 15]); }
    }
    pts.forEach(([x, y, z], i) => {
      const seg = Math.floor(i / 7), rad = 1.9;
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++)
        if (dx * dx + dy * dy + dz * dz <= rad * rad) v.set(Math.round(x + dx), Math.round(y + dy), Math.round(z + dz), dz <= -1 ? 'brick' : seg % 3 === 0 ? 'leaf' : 'slime');
    });
    // the head: a broad wedge, jaws wide open to the sky
    const [hx, hy, hz] = pts[pts.length - 1].map(Math.round) as [number, number, number];
    v.box(hx - 2, hy - 1, hz, hx + 2, hy + 4, hz + 2, 'slime');                     // the skull
    v.box(hx - 2, hy + 2, hz + 3, hx + 2, hy + 6, hz + 3, 'leaf');                  // the upper jaw, lifted
    v.box(hx - 2, hy + 4, hz - 1, hx + 2, hy + 7, hz - 1, 'slime');                 // the lower jaw, dropped
    v.box(hx - 1, hy + 4, hz, hx + 1, hy + 6, hz + 2, 'red');                       // the mouth
    for (const dx of [-2, 2]) { v.set(hx + dx, hy + 1, hz + 3, 'accentGlow'); v.set(hx + dx, hy + 6, hz + 2, 'white'); v.set(hx + dx, hy + 7, hz, 'white'); }
    // fire out of the jaws, straight up
    for (let z = hz + 3; z <= hz + 15; z++) { v.set(hx, hy + 5, z, z % 3 ? 'flame' : 'ember'); if (z % 2 && z < hz + 11) v.set(hx + 1, hy + 4, z, 'flame'); if (z % 3 === 1 && z < hz + 8) v.set(hx - 1, hy + 5, z, 'flame'); }
    // the souls, spiralling up out of the city into the spell
    const r = rng(814);
    for (let i = 0; i < 46; i++) {
      const t = r(), a = t * Math.PI * 5 + r() * 0.5, rr = 4 + (1 - t) * 14;
      const x = Math.round(hx + Math.cos(a) * rr), y = Math.round(hy + 4 + Math.sin(a) * rr * 0.8), z = Math.round(6 + t * (hz + 6));
      v.set(x, y, z, 'portal'); if (r() < 0.5) v.set(x, y, z + 1, 'white');
    }
    // the crab eggs, an ocean of them, red in the surf
    for (let i = 0; i < 40; i++) { const x = SEA_X + 1 + Math.floor(r() * 12), y = Math.floor(r() * 34); if (v.get(x, y, -2)?.startsWith('water')) v.set(x, y, -1, r() < 0.7 ? 'red' : 'redDark'); }
    v.tag = 'church';
    v.sprite(CH[0] + 3, CH[1] + 7, Z + 1, CARL, PALETTE); v.sprite(CH[0] + 5, CH[1] + 7, Z + 1, DONUT, PALETTE);
  }
  if (has('carl-donut')) { v.tag = 'capitol'; v.sprite(CAP[0] - 3, CAP[1] + 9, 1, CARL, PALETTE); v.sprite(CAP[0] - 1, CAP[1] + 10, 1, DONUT, PALETTE); }

  return v;
}

const anchors: VoxelMap['anchors'] = {
  capitol: [CAP[0], CAP[1], 29], 'capitol-down': [CAP[0], CAP[1], 15], smoke: [6, 14, 3], 'old-havana': [20, 8, 7],
  'coast-highway': [HWY + 2, 4, 1], pileups: [HWY + 1, 28, 3], seals: [43, 16, 1], cemetery: [CEM[0] + 7, CEM[1], 4],
  'ghommid-fog': [CEM[0] - 3, CEM[1], 1], 'ghommid-village': [CEM[0] + 4, CEM[1] - 2, 4], iglesia: [CEM[0], CEM[1], 6],
  crabs: [HWY + 4, 24, 2], web: [2, 42, 3], keys: [56, 10, 1], 'earth-wall': [55, 5, 9], iowa: [59, 7, 15], 'iowa-gone': [55, 7, 2],
  church: [CH[0] + 1, CH[1] + 5, 16], madre: [40, 26, 0], burning: [20, 4, 9], amayon: [TALL[0] + 1, TALL[1] + 1, 31],
};

export const FLOOR_8_VOXEL: VoxelMap = { build, anchors };
export const buildFloor8 = build;

/** The tile: Havana as it stands when its picture opens (artAt 6:4), the
    capitol, the old city, the coast road and its pile-ups, Carl and Donut on
    the Prado, and nothing from later. */
export const TILE_8_LAYERS = ['capitol', 'old-havana', 'coast-highway', 'pileups', 'carl-donut'];
/** The hero picture, once the floor is finished: Amayon's spell over a burning Havana. */
export const HERO_8_LAYERS = ['capitol-down', 'old-havana', 'coast-highway', 'pileups', 'cemetery', 'ghommid-village', 'iglesia', 'keys', 'iowa-gone', 'church', 'burning', 'amayon', 'hero'];
