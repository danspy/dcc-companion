import { Vox } from '../vox.ts';
import { twin } from './parts.ts';
import { chamfer } from './itemparts.ts';
import { ITEMS_A } from './items-a.ts';
import { ITEMS_B } from './items-b.ts';
import { ITEMS_C } from './items-c.ts';
import { ITEMS_B1A } from './items-b1a.ts';
import { ITEMS_B1B } from './items-b1b.ts';
import { ITEMS_B1C } from './items-b1c.ts';
import { ITEMS_B2 } from './items-b2.ts';
import { ITEMS_B3A } from './items-b3a.ts';
import { ITEMS_B3B } from './items-b3b.ts';
import { ITEMS_B4A } from './items-b4a.ts';
import { ITEMS_B4B } from './items-b4b.ts';
import { ITEMS_B4C } from './items-b4c.ts';
import { ITEMS_B5A } from './items-b5a.ts';
import { ITEMS_B5B } from './items-b5b.ts';
import { ITEMS_B6A } from './items-b6a.ts';
import { ITEMS_B6B } from './items-b6b.ts';
import { ITEMS_B7A } from './items-b7a.ts';
import { ITEMS_B7B } from './items-b7b.ts';
import { ITEMS_B8A } from './items-b8a.ts';
import { ITEMS_B8B } from './items-b8b.ts';
import { ITEMS_B9 } from './items-b9.ts';

/* ---- an item is a voxel sprite, floating ----
   The reference is the reader's again: manatoastmedia.com's item sprites, one
   object each, three-quarter view, a hard outline and a few strong colours,
   floating with no slot or ground under it. Take the essence, not the pixels,
   and draw each look from the edition's own description at its point, never
   from the reference (theirs gives the enhanced biscuit a bone where the book's
   is small, round and crumbly). Drawn smooth (chunk 0) like a figure, at about
   a figure's density: a figure is 8 voxels across, an item 9 to 16. It faces
   +y, the lit left face of the iso, z up. Shapes and colours only. */

/* 1:5 "small, smaller than my fingernail, brown, hard, and round with a crumbly
   texture": a cat treat. "It looks like a regular pet biscuit", so no glow. */
function petBiscuit(): Vox {
  const v = new Vox(); v.chunk = 0;
  const brown = '#8a5530', crumb = '#ad7843';
  chamfer(v, 2, 2, 0, 7, 7, 0, 2, brown);
  chamfer(v, 1, 1, 1, 8, 8, 1, 2, brown);
  chamfer(v, 0, 0, 2, 9, 9, 4, 2, brown);
  chamfer(v, 1, 1, 5, 8, 8, 5, 2, brown);
  chamfer(v, 2, 2, 6, 7, 7, 6, 2, brown);
  // the crumbly texture: pale crumbs in its skin, and a few come away
  for (const [x, y, z] of [[3, 9, 3], [7, 9, 2], [9, 4, 3], [9, 7, 4], [4, 6, 6], [6, 3, 6], [2, 8, 5]] as const) v.set(x, y, z, crumb);
  for (const [x, y, z] of [[11, 7, -1], [3, 12, -1], [6, 12, -2]] as const) v.set(x, y, z, crumb);
  return v;
}

/* 1:32 a clay jug of the hobgoblins' toilet-grade moonshine, and "the use of a
   standard torch instead of a cloth wick": the torch stands in its neck, lit. */
function jugOBoom(): Vox {
  const v = new Vox(); v.chunk = 0;
  const clay = '#a8683f', rim = '#7a4527', handle = twin('#a8683f');
  chamfer(v, 1, 1, 0, 8, 8, 0, 2, clay);
  chamfer(v, 0, 0, 1, 9, 9, 6, 2, clay);
  chamfer(v, 1, 1, 7, 8, 8, 7, 2, clay);
  chamfer(v, 2, 2, 8, 7, 7, 8, 2, clay);
  v.box(4, 4, 9, 5, 5, 10, rim);                                   // the neck
  // the handle, a loop off its right side with daylight through it
  v.box(10, 4, 3, 10, 5, 3, handle); v.box(11, 4, 3, 11, 5, 8, handle); v.box(10, 4, 8, 10, 5, 8, handle);
  // the torch: a wooden stick in the neck, its oily wrapped head, and the flame
  v.box(4, 4, 11, 5, 5, 13, 'woodDark');
  chamfer(v, 3, 3, 14, 6, 6, 16, 1, '#3b2a20');
  v.box(4, 4, 17, 5, 5, 17, 'ember');
  v.set(4, 4, 18, 'flame'); v.set(5, 5, 18, 'flame'); v.set(4, 5, 19, 'flame');
  return v;
}

/* 1:7 "A small, jeweled tiara. The cat-sized crown glittered with smoky, dark
   gems. The deep purple stone in the center swirled internally with clouds."
   A tiara stands up at the front; the metal is never named, so it is a plain one. */
function sepsisCrown(): Vox {
  const v = new Vox(); v.chunk = 0;
  const metal = '#a4abb6', gem = '#3e3848', glint = '#77708a', stone = '#5b1f8a', cloud = '#a587d0';
  // the band: an eight-sided ring, two high, smoky gems set round it
  for (let x = 0; x <= 9; x++) for (let y = 0; y <= 9; y++) {
    const dx = Math.min(x, 9 - x), dy = Math.min(y, 9 - y);
    if (dx + dy >= 2 && !(dx >= 1 && dy >= 1 && dx + dy >= 4)) v.box(x, y, 0, x, y, 1, metal);
  }
  for (const [x, y] of [[0, 3], [0, 6], [9, 3], [9, 6], [3, 0], [6, 0]] as const) v.set(x, y, 1, gem);
  // the front rises in a fan of peaks to the stone, a gem glittering on each
  const col = (x: number, top: number) => v.box(x, 9, 2, x, 9, top, metal);
  [[1, 3], [2, 5], [3, 7], [4, 10], [5, 10], [6, 7], [7, 5], [8, 3]].forEach(([x, t]) => col(x, t));
  for (const [x, z] of [[1, 4], [2, 6], [3, 8], [6, 8], [7, 6], [8, 4]] as const) v.set(x, 9, z, gem);
  v.set(4, 9, 11, glint); v.set(5, 9, 11, gem);
  for (const [x, y, t] of [[0, 7, 3], [9, 7, 3]] as const) { v.box(x, y, 2, x, y, t, metal); v.set(x, y, t + 1, gem); }
  // the centre stone, proud of the front, clouds swirling in it
  v.box(3, 10, 4, 6, 10, 7, stone);
  v.box(4, 11, 5, 5, 11, 6, stone);
  v.set(4, 10, 6, cloud); v.set(5, 10, 5, cloud); v.set(3, 10, 5, cloud); v.set(5, 11, 6, cloud);
  return v;
}

/* An item not drawn yet, or whose first look the reader has not reached: an
   unidentified pouch, dark, with the System's question mark on it. It says
   nothing, and is the same for everyone. */
const MARK = ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'];
export function unpicturedItem(): Vox {
  const v = new Vox(); v.chunk = 0;
  const cloth = '#34353c', tie = '#25262b';
  chamfer(v, 1, 1, 0, 10, 10, 0, 3, cloth);
  chamfer(v, 0, 0, 1, 11, 11, 7, 3, cloth);
  chamfer(v, 1, 1, 8, 10, 10, 9, 3, cloth);
  chamfer(v, 3, 3, 10, 8, 8, 10, 2, cloth);
  v.box(4, 4, 11, 7, 7, 11, tie);                                  // the drawstring
  chamfer(v, 3, 3, 12, 8, 8, 13, 2, twin(cloth));                  // the gathered neck
  MARK.forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') { v.set(i + 4, 12, 8 - j, 'accentGlow'); v.set(i + 4, 11, 8 - j, 'accent'); } }));
  return v;
}

export const ITEM_FIGURES: Record<string, Record<string, () => Vox>> = {
  'enhanced-pet-biscuit': { treat: petBiscuit },
  'jug-o-boom': { lit: jugOBoom },
  'crown-of-the-sepsis-whore': { tiara: sepsisCrown },
  ...ITEMS_A,               // books 1 and 2
  ...ITEMS_B,               // books 3 and 4
  ...ITEMS_C,               // books 5 to 7
  // every other item in the books, batch by book (the reader asked for all of manatoast's guide)
  ...ITEMS_B1A,
  ...ITEMS_B1B,
  ...ITEMS_B1C,
  ...ITEMS_B2,
  ...ITEMS_B3A,
  ...ITEMS_B3B,
  ...ITEMS_B4A,
  ...ITEMS_B4B,
  ...ITEMS_B4C,
  ...ITEMS_B5A,
  ...ITEMS_B5B,
  ...ITEMS_B6A,
  ...ITEMS_B6B,
  ...ITEMS_B7A,
  ...ITEMS_B7B,
  ...ITEMS_B8A,
  ...ITEMS_B8B,
  ...ITEMS_B9,                // the ones the review pass found missing
};
