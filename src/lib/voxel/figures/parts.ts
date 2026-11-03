import { Vox, slab } from '../vox.ts';

/* ---- the parts every figure is built from ----
   A character is a small voxel figure on a patch of ground, drawn in the same
   renderer as the floors: a chibi, after the reference the reader pointed at
   (manatoastmedia.com's character portraits: a big head on a short body, dot
   eyes, one or two things that make them who they are), in this site's own
   palette and its iso light. It faces +y, the lit left face of the iso, with x
   across its shoulders (+x is its right), and is drawn smooth (chunk 0: one
   piece per material, no seams inside), or a figure reads as a pile of bricks.
   z: feet 5, legs 6-7, hips 8-9, torso and arms 10-13, hands 9, head 14-21. */
export const H0 = 14, H1 = 21;
/* where the book leaves a colour unsaid, a figure takes a plain, dark one rather than an invented detail */
export const PLAIN_HAIR = '#2e241d', PLAIN_TOP = '#5c5a55', PLAIN_BOTTOM = '#3f3d3a', PLAIN_SHOES = '#2b2724';
export function base(v: Vox, top = 'stoneDark', alt = 'stone', seed = 3) {
  slab(v, -1, 0, 8, 9, 4, { depth: 3, seed, crust: 'stoneDark', under: ['dirt', 'dirtDark'], top: (x, y) => (((x >> 1) * 7 + (y >> 1) * 5) % 9 ? top : alt),
    shape: (x, y) => Math.hypot((x - 3.5) / 5.4, (y - 4.6) / 5) < 1 });
}
// the same colour one step off, so a part that touches another of the same skin keeps its own edge
export const twin = (hex: string) => '#' + (parseInt(hex.slice(1), 16) ^ 1).toString(16).padStart(6, '0');
export function head(v: Vox, skin: string) { v.box(0, 0, H0, 7, 7, H1, skin); }
export function eyes(v: Vox, ink = 'black', z = 17, xs = [2, 5], tall = 2) { for (const x of xs) v.box(x, 7, z, x, 7, z + tall - 1, ink); }
type Body = { top: string; skin: string; bottom: string; legs?: string; feet?: string | null; front?: string; sleeves?: [string | null, string | null] };
export function body(v: Vox, o: Body) {
  const limb = twin(o.skin), sl = (m: string | null) => (m ? twin(m) : limb);
  const [l, r] = o.sleeves ?? [o.top, o.top];
  v.box(1, 2, 10, 6, 6, 13, o.top);                                           // torso
  if (o.front) v.box(3, 6, 10, 4, 6, 13, o.front);                             // what shows down the front
  v.box(0, 3, 10, 0, 5, 13, sl(l)); v.box(7, 3, 10, 7, 5, 13, sl(r));       // arms
  v.box(0, 4, 9, 0, 5, 9, limb); v.box(7, 4, 9, 7, 5, 9, limb);             // hands
  v.box(1, 2, 8, 6, 6, 9, o.bottom);                                          // hips
  v.box(1, 3, 6, 2, 5, 7, o.legs ?? limb); v.box(5, 3, 6, 6, 5, 7, o.legs ?? limb);   // legs
  v.box(1, 3, 5, 2, 7, 5, o.feet ?? limb); v.box(5, 3, 5, 6, 7, 5, o.feet ?? limb);   // feet, toes forward
}

/* ---- a person, from a short description ----
   Most of the cast are people, and a person is a few choices: skin, hair and
   how it is worn, what they wear top and bottom and on their feet, and the one
   or two things that make them who they are (a beard, glasses, a hat, a cape,
   what they carry). Each choice is read off the book at the look's own point. */
export type HairStyle = 'short' | 'messy' | 'long' | 'bun' | 'ponytail' | 'bob' | 'curly' | 'buzz' | 'bald' | 'mohawk' | 'pigtails';
export interface Person {
  skin: string;
  hair?: { color: string; style: HairStyle };
  eyes?: string;
  top: string; front?: string;
  outfit?: 'shirt' | 'jacket' | 'robe' | 'dress' | 'coat' | 'armor';
  sleeves?: 'long' | 'short' | 'none';
  bottom?: string; legs?: string; feet?: string | null;
  beard?: string; moustache?: string; glasses?: string;
  hat?: { color: string; kind: 'cap' | 'beanie' | 'crown' | 'hood' | 'tophat' | 'helmet'; trim?: string };
  cape?: string;
  held?: { kind: 'sword' | 'staff' | 'spear' | 'bow' | 'bag' | 'clipboard' | 'mic'; color?: string; tip?: string };
  ground?: [string, string];
  seed?: number;
  bare?: boolean;                 // no patch of ground: for a figure set into a wider scene
}
export function hair(v: Vox, color: string, style: HairStyle, skin: string) {
  if (style === 'bald') return;
  if (style === 'buzz') { v.box(0, 0, H1, 7, 7, H1, color); v.box(0, 0, H0 + 3, 7, 0, H1, color); return; }
  v.box(0, 0, H1 - 1, 7, 7, H1, color);                       // over the top
  v.box(0, 0, H0, 7, 1, H1, color);                           // the back
  v.box(0, 2, H1 - 4, 0, 4, H1, color); v.box(7, 2, H1 - 4, 7, 4, H1, color);   // over the ears
  v.box(0, 7, H1 - 2, 7, 7, H1 - 2, color); v.set(4, 7, H1 - 2, skin);         // the fringe, parted
  v.set(0, 7, H1 - 3, color); v.set(7, 7, H1 - 3, color);
  if (style === 'messy') for (const [x, y] of [[1, 2], [3, 4], [5, 1], [6, 5], [2, 6], [4, 1]] as const) v.set(x, y, H1 + 1, color);
  // curls: tight puffs over the top and round the back, not out at the sides
  if (style === 'curly') { for (const [x, y] of [[0, 0], [3, 0], [6, 0], [1, 3], [4, 3], [0, 6], [3, 6], [6, 5]] as const) v.box(x, y, H1 + 1, x + 1, y + 1, H1 + 1, color); v.box(0, -1, H0 + 2, 7, -1, H1, color); }
  if (style === 'long' || style === 'pigtails') { v.box(0, -1, H0 - 4, 7, -1, H1 - 1, color); v.box(0, 0, H0 - 3, 0, 6, H1 - 3, color); v.box(7, 0, H0 - 3, 7, 6, H1 - 3, color); }
  if (style === 'pigtails') { v.box(-2, 3, H0 - 2, -1, 4, H0 + 3, color); v.box(8, 3, H0 - 2, 9, 4, H0 + 3, color); }
  if (style === 'bob') { v.box(0, 0, H0 + 1, 0, 6, H1 - 3, color); v.box(7, 0, H0 + 1, 7, 6, H1 - 3, color); v.box(0, -1, H0 + 1, 7, -1, H1 - 1, color); }
  if (style === 'bun') v.box(2, 1, H1 + 1, 5, 4, H1 + 3, color);
  if (style === 'ponytail') { v.box(3, -1, H0 - 2, 4, -1, H1 - 1, color); v.box(3, -2, H0 - 4, 4, -2, H0 + 1, color); }
  if (style === 'mohawk') { v.box(0, 0, H1 - 1, 7, 7, H1, skin); v.box(3, 0, H1 - 1, 4, 7, H1 + 2, color); v.box(0, 7, H1 - 2, 7, 7, H1 - 2, skin); }
}
export function person(p: Person): Vox {
  const v = new Vox();
  if (!p.bare) base(v, p.ground?.[0] ?? 'stoneDark', p.ground?.[1] ?? 'stone', p.seed ?? 21);
  v.chunk = 0;
  const outfit = p.outfit ?? 'shirt', limb = twin(p.skin);
  head(v, p.skin); eyes(v, p.eyes ?? 'black');
  if (p.hair) hair(v, p.hair.color, p.hair.style, p.skin);
  const sleeve = p.sleeves === 'none' ? null : p.top;
  body(v, { top: p.top, skin: p.skin, bottom: p.bottom ?? p.top, legs: p.legs, feet: p.feet, front: p.front, sleeves: [sleeve, sleeve] });
  if (p.sleeves === 'short') { v.box(0, 3, 10, 0, 5, 11, limb); v.box(7, 3, 10, 7, 5, 11, limb); }
  if (outfit === 'dress') { v.box(0, 1, 6, 7, 7, 9, p.bottom ?? p.top); v.box(1, 2, 5, 6, 6, 5, p.bottom ?? p.top); }
  if (outfit === 'robe') { v.box(1, 2, 6, 6, 6, 9, p.bottom ?? p.top); v.box(0, 2, 5, 7, 7, 5, p.bottom ?? p.top); }
  if (outfit === 'coat') { v.box(1, 2, 6, 6, 6, 9, p.top); v.box(3, 6, 6, 4, 6, 9, p.bottom ?? p.top); }
  if (outfit === 'armor') { v.box(-1, 2, 12, 0, 6, 13, twin(p.top)); v.box(7, 2, 12, 8, 6, 13, twin(p.top)); }
  if (p.beard) { v.box(1, 7, H0, 6, 7, H0 + 1, p.beard); v.box(2, 8, H0 - 1, 5, 8, H0 + 1, p.beard); v.box(3, 8, H0 - 2, 4, 8, H0 - 2, p.beard); }
  if (p.moustache) v.box(2, 8, H0 + 2, 5, 8, H0 + 2, p.moustache);
  // glasses: square frames drawn on the face round each eye, meeting at the bridge
  if (p.glasses) for (const ex of [2, 5]) { v.box(ex - 1, 7, H0 + 2, ex + 1, 7, H0 + 2, p.glasses); v.box(ex - 1, 7, H0 + 3, ex - 1, 7, H0 + 4, p.glasses); v.box(ex + 1, 7, H0 + 3, ex + 1, 7, H0 + 4, p.glasses); }
  if (p.hat) {
    const { color, kind, trim } = p.hat;
    if (kind === 'cap') { v.box(0, 0, H1, 7, 7, H1 + 1, color); v.box(1, 8, H1 - 1, 6, 9, H1 - 1, trim ?? color); }
    if (kind === 'beanie') { v.box(0, 0, H1 - 1, 7, 7, H1 + 1, color); v.box(0, 7, H1 - 2, 7, 7, H1 - 2, trim ?? color); v.box(3, 3, H1 + 2, 4, 4, H1 + 2, trim ?? color); }
    if (kind === 'tophat') { v.box(-1, -1, H1 + 1, 8, 8, H1 + 1, color); v.box(1, 1, H1 + 2, 6, 6, H1 + 6, color); v.box(1, 6, H1 + 2, 6, 6, H1 + 2, trim ?? color); }
    if (kind === 'crown') { v.box(1, 1, H1 + 1, 6, 6, H1 + 1, color); for (const [x, y] of [[1, 1], [6, 1], [1, 6], [6, 6], [3, 6], [6, 3]] as const) v.set(x, y, H1 + 2, color); if (trim) v.set(3, 6, H1 + 2, trim); }
    // a hood: a shell round the back, sides and top of the head, its rim framing the face
    if (kind === 'hood') { v.box(-1, -1, H0 + 1, 8, -1, H1 + 1, color); v.box(-1, -1, H0 + 1, -1, 8, H1 + 1, color); v.box(8, -1, H0 + 1, 8, 8, H1 + 1, color);
      v.box(-1, -1, H1 + 1, 8, 8, H1 + 1, color); v.box(-1, 8, H1 - 1, 8, 8, H1 + 1, trim ?? color); }
    if (kind === 'helmet') { v.box(-1, -1, H0 + 4, 8, 8, H1 + 1, color); v.box(0, 8, H0 + 2, 7, 8, H0 + 4, trim ?? color); v.box(1, 8, H0 + 3, 6, 8, H0 + 4, 'black'); }
  }
  if (p.cape) { v.box(0, 1, 6, 7, 1, 13, p.cape); }
  if (p.held) {
    const c = p.held.color ?? 'metal', t = p.held.tip ?? c;
    if (p.held.kind === 'sword') { v.box(8, 5, 9, 8, 5, 9, 'woodDark'); v.box(8, 5, 10, 8, 5, 10, 'metalDark'); v.box(8, 5, 11, 8, 5, 17, c); }
    if (p.held.kind === 'staff' || p.held.kind === 'spear') { v.box(8, 5, 5, 8, 5, 19, p.held.kind === 'staff' ? c : 'woodDark'); v.box(8, 5, 20, 8, 5, p.held.kind === 'staff' ? 21 : 22, t); }
    if (p.held.kind === 'bow') { v.box(8, 5, 8, 8, 5, 15, c); v.set(8, 6, 7, c); v.set(8, 6, 16, c); }
    if (p.held.kind === 'bag') v.box(8, 4, 7, 9, 6, 9, c);
    if (p.held.kind === 'clipboard') v.box(8, 5, 9, 8, 7, 12, c);
    if (p.held.kind === 'mic') { v.box(8, 5, 9, 8, 5, 11, 'metalDark'); v.box(8, 5, 12, 8, 5, 13, c); }
  }
  return v;
}

/* ---- composing ---- */
/** Copy a figure (or any scene) into another, moved by (dx, dy, dz). */
export function copyInto(dst: Vox, src: Vox, dx = 0, dy = 0, dz = 0) {
  const was = dst.chunk;
  for (const { p: [x, y, z], mat, chunk } of src.all()) { dst.chunk = chunk; dst.set(x + dx, y + dy, z + dz, mat); }
  dst.chunk = was;
}
/** A wider patch of ground, for two figures or a figure and what it has with it. */
export function wideBase(v: Vox, x0: number, x1: number, seed = 5, y0 = 0, y1 = 10) {
  slab(v, x0, y0, x1, y1, 4, { depth: 3, seed, crust: 'stoneDark', under: ['dirt', 'dirtDark'], top: (x, y) => (((x >> 1) * 7 + (y >> 1) * 5) % 9 ? 'stoneDark' : 'stone'),
    shape: (x, y) => Math.hypot((x - (x0 + x1) / 2) / ((x1 - x0) / 2 + 0.4), (y - (y0 + y1) / 2) / ((y1 - y0) / 2 + 0.2)) < 1 });
}
/** A figure floating over its ground, a soft glow under it. */
export function floating(fig: Vox, lift: number, glow = 'portal', seed = 23): Vox {
  const v = new Vox();
  base(v, 'stoneDark', 'stone', seed);
  copyInto(v, fig, 0, 0, lift);
  v.chunk = 0;
  for (const [x, y] of [[2, 4], [5, 4], [3, 5], [4, 3]] as const) v.set(x, y, 5, glow);
  return v;
}
