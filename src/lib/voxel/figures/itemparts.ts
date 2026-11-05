import { Vox } from '../vox.ts';

/* ---- the shapes items are built from ----
   A voxel sphere reads as a stepped heap: every step draws its own edge. So an
   item is built the way a figure is, from deliberate blocks: a chamfered block
   reads round, a lathe for a bottle or a ring, a blob only for something that
   is a lump (a sack, a cloud). Shapes and colours only. */

/** a solid of revolution round the z axis: r(z) gives the radius at each height */
export function lathe(v: Vox, cx: number, cy: number, z0: number, z1: number, r: (z: number) => number, m: (x: number, y: number, z: number) => string | null) {
  for (let z = z0; z <= z1; z++) {
    const R = r(z); if (R <= 0) continue;
    for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) {
      if (Math.hypot(x - cx, y - cy) <= R) { const c = m(x, y, z); if (c) v.set(x, y, z, c); }
    }
  }
}
/** an ellipsoid centred at (cx, cy, cz) */
export function blob(v: Vox, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, m: (x: number, y: number, z: number) => string | null) {
  for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1) { const c = m(x, y, z); if (c) v.set(x, y, z, c); }
  }
}
/** a box with its vertical edges cut back by `cut`: a chunky rounded block, which reads round where a voxel sphere reads as a heap */
export function chamfer(v: Vox, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, cut: number, m: string) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    const dx = Math.min(x - x0, x1 - x), dy = Math.min(y - y0, y1 - y);
    if (dx + dy >= cut) v.box(x, y, z0, x, y, z1, m);
  }
}
