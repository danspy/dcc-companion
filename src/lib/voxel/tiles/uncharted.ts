import { Vox, rng, slab } from '../vox.ts';

/* ---- a floor with nothing to draw yet ----
   The crawl has not reached it, or the books have said too little to picture
   it. Every such floor gets an island in the same style as the rest, and as
   big as its neighbours, so the descent never shrinks around it: dark rock in
   big blocks with a terrace and a loose chunk, rock spires standing in it,
   banks of cloud piled over the floor so that whatever is there is lost in
   them, and the System's question mark standing over it all. Gold where the
   books have said something about the floor; cold stone over night cloud where
   the reader has been told nothing at all. The shape is seeded by the floor's
   number, so no two are alike and none of them says anything: there is no
   fact in it to leak. */

/* the mark, two blocks deep, its gap wide enough that the dot never runs into the hook */
const MARK = [
  '..####..',
  '.######.',
  '##....##',
  '##....##',
  '......##',
  '.....##.',
  '....##..',
  '...##...',
  '...##...',
  '........',
  '........',
  '...##...',
  '...##...',
];

export function uncharted(id: number, known: boolean): Vox {
  const v = new Vox(), r = rng(9001 + id * 131);
  const W = 35 + Math.floor(r() * 6), D = 20 + Math.floor(r() * 4);
  const cx = (W - 1) / 2, cy = (D - 1) / 2;
  const p1 = r() * 6.28, p2 = r() * 6.28, p3 = r() * 6.28;
  /* A ragged outline: a rounded oblong (an oval would come out narrow in the
     iso, where the corners are what make an island wide) pushed in and out by
     a few slow waves. */
  const edge = (x: number, y: number, rx: number, ry: number, ox = cx, oy = cy, p = 2) => {
    const dx = (x - ox) / rx, dy = (y - oy) / ry, a = Math.atan2(dy, dx);
    return (Math.abs(dx) ** p + Math.abs(dy) ** p) ** (1 / p) < 1 + 0.1 * Math.sin(3 * a + p1) + 0.06 * Math.sin(5 * a + p2) + 0.04 * Math.sin(7 * a + p3);
  };
  const main = (x: number, y: number) => edge(x, y, W / 2, D / 2, cx, cy, 3.4);
  // dark flagstones in big blocks, a few cracked black
  const ground = (x: number, y: number) => (((x >> 1) * 7 + (y >> 1) * 13 + id) % 3 === 0 ? 'black' : 'stoneDark');
  const rock = { crust: 'stoneDark', under: ['dirtDark', 'black'] as [string, string], top: ground };
  slab(v, 0, 0, W - 1, D - 1, 0, { depth: 8, seed: 700 + id, shape: main, ...rock });
  // a terrace a step down on one side, and a loose chunk drifting off a corner
  const right = r() < 0.5;
  const tx0 = right ? W - 3 : -9, ty0 = Math.floor(D * (0.2 + r() * 0.3));
  const terrace = (x: number, y: number) => edge(x, y, 5.5, 4.5, tx0 + 5.5, ty0 + 4.5);
  slab(v, tx0, ty0, tx0 + 11, ty0 + 9, -2, { depth: 5, seed: 800 + id, shape: terrace, ...rock });
  const lx = right ? -6 : W + 2, ly = D - 5 - Math.floor(r() * 4);
  slab(v, lx, ly, lx + 4, ly + 4, -5, { depth: 3, seed: 900 + id, ...rock });

  /* What stands in the cloud: rock, in spires and broken stumps. Shapes, never
     a fact: whatever is on this floor is still lost in it. */
  const spires: [number, number, number][] = [];
  const n = 7 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const x = Math.round(2 + r() * (W - 6)), y = Math.round(3 + r() * (D - 10)), h = i < 3 ? 7 + Math.floor(r() * 4) : 2 + Math.floor(r() * 4);
    if (!main(x, y) || !main(x + 1, y + 1)) continue;
    spires.push([x, y, h]);
    v.chunk = 2; v.box(x, y, 1, x + 1, y + 1, Math.max(1, Math.floor(h * 0.55)), 'stoneDark'); v.chunk = 1;
    if (h > 5) { v.box(x, y, Math.floor(h * 0.55) + 1, x, y, h, 'stoneDark'); v.set(x + 1, y, Math.floor(h * 0.55) + 1, 'stone'); }
  }

  /* The cloud: banks of it lying on the floor in big soft blocks, piled into
     puffs, with the dark ground and the rock showing between them; a thin veil
     spills over the rim. See-through it is not: whatever is on this floor is
     still lost in it. */
  const cloud = known ? 'cloud' : 'cloudNight', veil = known ? 'mist' : 'nightMist';
  const puffs: [number, number, number, number, number, number][] = [];
  const np = 6 + Math.floor(r() * 3);
  for (let i = 0; i < np; i++) {
    const a = r() * 6.28, d = Math.sqrt(r()) * 0.62;
    puffs.push([cx + Math.cos(a) * d * W / 2, cy + Math.sin(a) * d * D / 2, 1.2 + r() * 1.5, 3.2 + r() * 3.2, 2.6 + r() * 2.4, 2 + r() * 2.2]);
  }
  for (let x = -2; x <= W + 1; x += 2) for (let y = -2; y <= D + 1; y += 2) for (let z = 1; z <= 9; z += 2) {
    const px = x + 1, py = y + 1, pz = z + 1;
    let inside = false;
    for (const [ox, oy, oz, rx, ry, rz] of puffs) if (((px - ox) / rx) ** 2 + ((py - oy) / ry) ** 2 + ((pz - oz) / rz) ** 2 < 1) { inside = true; break; }
    if (!inside || !main(px, py)) continue;
    for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++) if (!v.get(x + dx, y + dy, z + dz)) { v.chunk = 2; v.set(x + dx, y + dy, z + dz, cloud); }
  }
  v.chunk = 1;
  const cell = (x: number, y: number) => ((x >> 1) * 92821 + (y >> 1) * 68917 + id * 7) % 1000 / 1000;
  for (let x = -10; x <= W + 8; x++) for (let y = -2; y <= D + 2; y++) {
    const on = main(x, y), onT = terrace(x, y) && !on;
    if (on && !v.get(x, y, 1) && cell(x + 2, y + 5) < 0.55) v.set(x, y, 1, veil);
    if (onT && cell(x, y) < 0.6) v.set(x, y, -1, veil);
    if (on && !main(x + 1, y + 1) && cell(x + 5, y + 3) < 0.4) for (let z = 0; z > -3 - Math.floor(cell(x, y + 9) * 3); z--) if (!v.get(x + 1, y + 1, z)) v.set(x + 1, y + 1, z, veil);
  }

  /* The mark, floating near the front and well above the cloud: in the iso
     whatever stands in front covers what is higher up behind it, so further
     back its foot and its dot would vanish. */
  const mx = Math.round(cx - 4 + (r() - 0.5) * 6), my = D - 6, mz = 11 + MARK.length - 1;
  const ink = known ? 'accentGlow' : 'stone', side = known ? 'accent' : 'stoneDark';
  MARK.forEach((row, j) => [...row].forEach((c, i) => {
    if (c !== '#') return;
    v.set(mx + i, my + 1, mz - j, ink);
    v.set(mx + i, my, mz - j, side);
  }));
  // a few sparks round it, where something is known
  if (known) for (let i = 0; i < 7; i++) v.set(mx + Math.round(-2 + r() * 12), my + Math.round(r() * 3), mz - Math.round(r() * 13), 'ember');
  return v;
}
