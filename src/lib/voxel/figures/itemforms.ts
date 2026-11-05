import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { lathe, chamfer } from './itemparts.ts';

/* ---- the plain form of a kind of thing ----
   Most items the book names by what they are and leaves at that: "a potion", "a
   scroll", "a tome", a card, a ring. What the noun says is the form; what the
   book does not say is not drawn. So a thing the text gives only as its noun is
   that noun's plain form, the same for every one of its kind, coloured only
   where the book gives a colour (the options), and a drawer adds the one or two
   traits the text does give. Every form faces +y, z up, about an item's size
   (9 to 16 across), drawn smooth like every item. Shapes and colours only. */

type C = string;
const fresh = () => { const v = new Vox(); v.chunk = 0; return v; };

/** a round-bellied flask with a cork; the liquid fills it to the shoulder */
export function potion(o: { liquid?: C; cork?: C; fill?: number } = {}): Vox {
  const v = fresh(), liquid = o.liquid ?? '#8c9aa8', cork = o.cork ?? '#b08758', top = o.fill ?? 7;
  const c = 5;
  const R = (z: number) => (z === 0 ? 3 : z <= 2 ? 4.3 : z <= 6 ? 4.8 : z === 7 ? 4.2 : z === 8 ? 3 : z <= 11 ? 1.6 : z === 12 ? 2.2 : 0);
  lathe(v, c, c, 0, 12, R, (x, y, z) => {
    const inside = Math.hypot(x - c, y - c) <= R(z) - 1 && z >= 1 && z <= 11;
    return !inside ? 'glass' : z <= top ? liquid : null;
  });
  v.box(4, 4, 13, 6, 6, 14, cork);
  return v;
}

/** a tall thin vial with a stopper */
export function vial(o: { liquid?: C; cork?: C } = {}): Vox {
  const v = fresh(), liquid = o.liquid ?? '#8c9aa8', cork = o.cork ?? '#b08758';
  const c = 3;
  const R = (z: number) => (z === 0 ? 1.6 : z <= 11 ? 2.6 : z === 12 ? 1.6 : z <= 14 ? 1.2 : 0);
  lathe(v, c, c, 0, 14, R, (x, y, z) => (Math.hypot(x - c, y - c) <= R(z) - 1 && z >= 1 && z <= 12 ? (z <= 9 ? liquid : null) : 'glass'));
  v.box(2, 2, 15, 4, 4, 16, cork);
  return v;
}

/** a rolled scroll lying along x, tied at its middle, its loose edge curling off to the front */
export function scroll(o: { paper?: C; tie?: C; edge?: C } = {}): Vox {
  const v = fresh(), paper = o.paper ?? '#dccba1', tie = o.tie ?? '#8a3a2c', edge = o.edge ?? twin(paper);
  for (let x = 0; x <= 14; x++) for (let y = 0; y <= 6; y++) for (let z = 0; z <= 6; z++) {
    const d = Math.hypot(y - 3, z - 3);
    if (x >= 6 && x <= 8 && d <= 3.7) v.set(x, y, z, d > 3.1 ? tie : paper);   // the tie stands proud of the roll
    else if (d <= 3.1) v.set(x, y, z, (x === 0 || x === 14) && d <= 1.3 ? edge : paper);
  }
  v.box(1, 7, 0, 5, 7, 2, paper); v.box(9, 7, 0, 13, 7, 2, paper);             // the loose sheet, either side of the tie
  v.box(1, 8, 0, 5, 9, 0, paper); v.box(9, 8, 0, 13, 9, 0, paper);
  return v;
}

/** a thick book lying on its back, the boards overhanging the pages, which show on the two lit sides */
export function tome(o: { cover?: C; pages?: C; band?: C } = {}): Vox {
  const v = fresh(), cover = o.cover ?? '#5b3a26', pages = o.pages ?? '#e3d7b8', spine = twin(cover);
  v.box(0, 0, 0, 11, 13, 0, cover);            // the back board
  v.box(0, 1, 1, 10, 12, 4, pages);            // the block of pages
  v.box(11, 0, 1, 11, 13, 4, spine);           // the spine, on the dark side
  v.box(0, 0, 5, 11, 13, 5, cover);            // the front board
  if (o.band) { v.box(0, 3, 5, 11, 3, 5, o.band); v.box(0, 10, 5, 11, 10, 5, o.band); }
  return v;
}

/** an upright playing card, a border round its face, a little turned */
export function card(o: { face?: C; border?: C; back?: C } = {}): Vox {
  const v = fresh(), face = o.face ?? '#e8e2d2', border = o.border ?? '#3a3f55', back = o.back ?? border;
  for (let x = 0; x <= 8; x++) for (let z = 0; z <= 12; z++) {
    const corner = (x === 0 || x === 8) && (z === 0 || z === 12);
    if (corner) continue;
    const rim = x === 0 || x === 8 || z === 0 || z === 12;
    v.set(x, 1, z, rim ? border : face);
    v.set(x, 0, z, back);
  }
  return v;
}

/** a ring standing on its edge, the hole facing the lit side, a stone on top if it has one */
export function ring(o: { metal?: C; stone?: C; size?: number } = {}): Vox {
  const v = fresh(), metal = o.metal ?? '#a4abb6', R = o.size ?? 5.6;
  const c = Math.ceil(R) + 1;
  for (let x = 0; x <= 2 * c; x++) for (let z = 0; z <= 2 * c; z++) {
    const d = Math.hypot(x - c, z - c);
    if (d <= R && d >= R - 2.1) { v.set(x, 0, z, metal); v.set(x, 1, z, metal); v.set(x, 2, z, twin(metal)); }
  }
  if (o.stone) { const t = Math.round(c + R); v.box(c - 1, 0, t, c + 1, 2, t + 2, o.stone); v.set(c, 3, t + 1, twin(o.stone)); }
  return v;
}

/** a ticket or a pass: a stiff slip standing a little turned, a stub on its left past a line of holes */
export function ticket(o: { paper?: C; ink?: C; stub?: C } = {}): Vox {
  const v = fresh(), paper = o.paper ?? '#e6d9b0', ink = o.ink ?? '#7a2f2a', stub = o.stub ?? paper;
  for (let x = 0; x <= 14; x++) for (let z = 0; z <= 7; z++) {
    if (x === 4 && z % 2 === 1) continue;                 // the perforation
    v.set(x, 0, z, x < 4 ? stub : paper);
    v.set(x, 1, z, x < 4 ? twin(stub) : twin(paper));
  }
  v.box(6, -1, 2, 12, -1, 2, ink); v.box(6, -1, 5, 10, -1, 5, ink); v.box(1, -1, 3, 2, -1, 4, ink);
  return v;
}

/** an embroidered patch: a stitched rim round a field, two thick, standing */
export function patch(o: { field?: C; rim?: C; shape?: 'round' | 'shield' } = {}): Vox {
  const v = fresh(), field = o.field ?? '#4b5a3a', rim = o.rim ?? '#d8c48a', shield = o.shape === 'shield';
  const W = 10, H = 12, cx = W / 2, cz = H / 2;
  const inside = (x: number, z: number) => shield
    ? (z >= 4 ? x >= 0 && x <= W : Math.abs(x - cx) <= (z / 4) * cx + 0.5)
    : ((x - cx) / (cx + 0.4)) ** 2 + ((z - cz) / (cz + 0.4)) ** 2 <= 1;
  for (let x = 0; x <= W; x++) for (let z = 0; z <= H; z++) {
    if (!inside(x, z)) continue;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !inside(x + a, z + b));
    v.set(x, 0, z, edge ? twin(rim) : twin(field)); v.set(x, 1, z, edge ? rim : field);
  }
  return v;
}

/** a cut crystal: a shard square in plan and turned to stand on its edge, pointed at the top, a glint on its lit face */
export function crystal(o: { stone?: C; glint?: C } = {}): Vox {
  const v = fresh(), stone = o.stone ?? '#9fb3c8', glint = o.glint ?? '#eef4fb';
  const c = 3, R = [1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 1, 1, 0, 0];
  R.forEach((r, z) => { for (let x = c - r; x <= c + r; x++) for (let y = c - r; y <= c + r; y++) if (Math.abs(x - c) + Math.abs(y - c) <= r) v.set(x, y, z, stone); });
  // the glint: a few lighter blocks on the lit face, on its surface
  for (const [x, z] of [[1, 6], [1, 7], [2, 8], [2, 9], [1, 4]] as const) { const y = c + (r => r - Math.abs(x - c))(R[z]); if (v.has(x, y, z)) v.set(x, y, z, glint); }
  return v;
}

/** a key standing on its bit: a ring bow on top, a shaft, the bit to the front */
export function key(o: { metal?: C } = {}): Vox {
  const v = fresh(), metal = o.metal ?? '#b59a5a', dark = twin(metal);
  for (let x = 0; x <= 8; x++) for (let z = 10; z <= 18; z++) { const d = Math.hypot(x - 4, z - 14); if (d <= 4.2 && d >= 2.1) { v.set(x, 0, z, metal); v.set(x, 1, z, dark); } }
  v.box(3, 0, 0, 5, 1, 10, metal);
  v.box(5, 0, 1, 8, 1, 2, metal); v.box(5, 0, 4, 7, 1, 5, metal);
  return v;
}

/** a round bomb with a fuse, from chamfered layers so it reads round, a highlight on its shoulder and a cap for the fuse */
export function bomb(o: { shell?: C; fuse?: C; lit?: boolean } = {}): Vox {
  const v = fresh(), shell = o.shell ?? '#3b3f47', fuse = o.fuse ?? '#6e5a3c', shine = '#aeb4bf', cap = '#a4abb6';
  chamfer(v, 2, 2, 0, 8, 8, 0, 2, shell);
  chamfer(v, 1, 1, 1, 9, 9, 1, 3, shell);
  chamfer(v, 0, 0, 2, 10, 10, 6, 4, shell);
  chamfer(v, 1, 1, 7, 9, 9, 7, 3, shell);
  chamfer(v, 2, 2, 8, 8, 8, 8, 2, shell);
  // the highlight, on the shell's own surface where it faces the light (front and up)
  for (let x = 1; x <= 4; x++) for (let z = 4; z <= 8; z++) for (let y = 10; y >= 0; y--) if (v.has(x, y, z)) { if ((x + z) % 3 !== 0) v.set(x, y, z, shine); break; }
  v.box(4, 4, 9, 6, 6, 9, cap);
  v.box(5, 5, 10, 5, 5, 11, fuse); v.set(6, 5, 12, fuse);
  if (o.lit) { v.set(6, 5, 13, 'ember'); v.set(6, 5, 14, 'flame'); }
  return v;
}

/** a crafting table: a thick top on four legs, chibi, with room for its one tool on top */
export function table(o: { top?: C; legs?: C } = {}): Vox {
  const v = fresh(), top = o.top ?? '#8a5a35', legs = o.legs ?? twin(top);
  v.box(0, 0, 6, 15, 9, 7, top);
  for (const [x, y] of [[1, 1], [13, 1], [1, 7], [13, 7]] as const) v.box(x, y, 0, x + 1, y + 1, 5, legs);
  v.box(2, 2, 2, 13, 7, 2, legs);              // the stretcher shelf
  return v;
}

/** a small piercing: a hoop with a bead, drawn at an item's size (a chibi of itself) */
export function piercing(o: { metal?: C; bead?: C } = {}): Vox {
  const v = fresh(), metal = o.metal ?? '#c8ccd4', bead = o.bead ?? metal;
  for (let x = 0; x <= 12; x++) for (let z = 0; z <= 12; z++) { const d = Math.hypot(x - 6, z - 6); if (d <= 6 && d >= 4.3) { v.set(x, 0, z, metal); v.set(x, 1, z, twin(metal)); } }
  v.clear(4, 0, 11, 8, 1, 12);                 // the gap the bead closes
  chamfer(v, 3, -1, 10, 9, 2, 14, 2, bead);
  return v;
}

/* ---- a T'Ghee card ----
   6:4 "a large, rectangular card, just about the size of a postcard", "rigid, but
   it still felt like it was made of paper"; the back carries the Syndicate's logo,
   a group of overlapping rings "all a different size" (3:30). A size up from the
   plain card, standing, a little turned. A card whose face the book never
   describes shows its back, the one side every T'Ghee card has in common; a rim
   takes its rarity's colour only where the book gives it (green for common at
   6:16, black for mythic at 6:17). */
const TG_W = 11, TG_H = 15, TG_PAPER = '#e8e2d2', TG_SLATE = '#3a3f55', TG_BACK = '#4f5670', TG_LOGO = '#d6dae2';
export function tgheeCard(o: { rim?: C; field?: C; back?: C } = {}): Vox {
  const v = fresh(), rim = o.rim ?? TG_SLATE, field = o.field ?? TG_PAPER, back = o.back ?? rim;
  for (let x = 0; x <= TG_W; x++) for (let z = 0; z <= TG_H; z++) {
    if ((x === 0 || x === TG_W) && (z === 0 || z === TG_H)) continue;
    const edge = x === 0 || x === TG_W || z === 0 || z === TG_H;
    v.set(x, 1, z, edge ? rim : field);
    v.set(x, 0, z, back);
  }
  return v;
}
/** a T'Ghee card's back turned to the light: the rings of different sizes, standing a little proud */
export function tgheeBack(rim: C = TG_SLATE): Vox {
  const v = tgheeCard({ rim, field: TG_BACK });
  const rings: [number, number, number][] = [[6, 9.6, 3.6], [3.4, 4.6, 2.3], [8.4, 4.4, 1.8]];
  for (let x = 1; x < TG_W; x++) for (let z = 1; z < TG_H; z++) {
    if (rings.some(([cx, cz, r]) => { const d = Math.hypot(x - cx, z - cz); return d <= r + 0.4 && d >= r - 0.55; })) v.set(x, 2, z, TG_LOGO);
  }
  return v;
}
