import { Vox, slab } from '../vox.ts';

/* Floor 18's homepage tile. The crawl has not reached it, so it has no page map.

   The bottom of the dungeon, with a single exit (1:1), and one of Scolopendra's
   lair levels (3:19): a deep lair of dark red rock with two stairways down its
   rim, the one door in the back wall, and Scolopendra coiled in the hollow
   before it, head raised. */
export function tile18(): Vox {
  const v = new Vox();
  const C = [26, 20] as const, AX = 26, AY = 19;
  const inLair = (x: number, y: number) => ((x - C[0]) / AX) ** 2 + ((y - C[1]) / AY) ** 2 <= 1;
  slab(v, 0, 0, 52, 40, 0, { depth: 10, seed: 1801, shape: inLair, crust: 'redDark', under: ['redDark', 'black'],
    top: (x, y) => (((x >> 1) + (y >> 1)) % 3 ? 'stoneDark' : 'black') });

  // the rim: ragged big blocks, high at the back, low at the front
  v.chunk = 2;
  for (let x = 0; x <= 52; x++) for (let y = 0; y <= 40; y++) {
    if (!inLair(x, y)) continue;
    const d = ((x - C[0]) / AX) ** 2 + ((y - C[1]) / AY) ** 2;
    if (d < 0.74) continue;
    const back = x + y < 46, h = back ? 5 + ((x * 7 + y * 3) >> 2) % 4 : 1 + ((x * 5 + y) >> 2) % 2;
    v.box(x, y, 1, x, y, h, ((x >> 1) + (y >> 1)) % 4 ? 'stoneDark' : 'redDark');
  }
  v.chunk = 1;

  // two stairways down the rim, each lit either side
  for (const [x0, y0] of [[4, 12], [40, 6]] as const) {
    for (let i = 0; i < 4; i++) { v.clear(x0 + i, y0, 1, x0 + i + 2, y0 + 2, 10); v.box(x0 + i, y0, 1, x0 + i + 2, y0 + 2, 5 - i, 'stone'); }
    for (const dy of [-1, 3]) { v.col(x0 - 1, y0 + dy, 1, 6, 'stone'); v.set(x0 - 1, y0 + dy, 7, 'flame'); }
  }

  // the final door, set in the back wall and facing the way in: black and gold, a seam of light
  const DX = 24, DY = 5;
  v.chunk = 2; v.box(DX - 4, DY - 4, 1, DX + 7, DY - 1, 18, 'stoneDark'); v.chunk = 1;
  v.box(DX, DY, 1, DX + 3, DY, 11, 'black');
  for (let z = 1; z <= 12; z++) { v.set(DX - 1, DY, z, 'accent'); v.set(DX + 4, DY, z, 'accent'); }
  for (let x = DX - 1; x <= DX + 4; x++) { v.set(x, DY, 12, 'accent'); v.set(x, DY, 13, 'accent'); }
  v.set(DX + 1, DY, 14, 'accentGlow'); v.set(DX + 2, DY, 14, 'accentGlow');
  v.box(DX + 1, DY, 2, DX + 1, DY, 10, 'window');
  for (const x of [DX, DX + 3]) v.box(x, DY, 4, x, DY, 7, 'accent');
  for (const x of [DX - 4, DX + 7]) { v.box(x, DY + 1, 1, x + 1, DY + 2, 2, 'stone'); v.box(x, DY + 1, 3, x + 1, DY + 2, 3, 'accent'); v.set(x, DY + 1, 4, 'flame'); v.set(x + 1, DY + 2, 4, 'flame'); }

  /* Scolopendra, coiled round the hollow: plates along a spiral path, lit on
     their crowns with a dark seam between, legs under every plate, and her head
     lifted at the end of the coil before the door, feelers raised. */
  const path = (t: number): [number, number, number] => {
    if (t < 0.82) { const a = 0.6 + t * Math.PI * 2.6, r = 15 - t * 9; return [C[0] + Math.cos(a) * r * 1.2, C[1] + 3 + Math.sin(a) * r * 0.85, 4]; }
    const u = (t - 0.82) / 0.18, [x0, y0] = path(0.8199);
    return [x0 + (DX + 2 - x0) * u * 0.55, y0 + (DY + 9 - y0) * u * 0.55, 4 + u * 9];
  };
  const N = 900, pts = Array.from({ length: N + 1 }, (_, i) => path(i / N));
  let len = 0;
  pts.forEach((p, i) => {
    if (i) len += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]);
    const t = i / N, g = t < 0.08 ? 0.45 + t * 6 : t > 0.93 ? 1.1 : 1, r = 3.4 * g, seam = len % 5 < 0.35;
    const [x, y, z] = p;
    for (let dx = -4; dx <= 4; dx++) for (let dy = -4; dy <= 4; dy++) for (let dz = -3; dz <= 4; dz++) {
      const q = (dx * dx + dy * dy) / (r * r) + (dz * dz) / ((r * 0.9) ** 2);
      if (q > 1) continue;
      const X = Math.round(x + dx), Y = Math.round(y + dy), Z = Math.round(z + dz);
      if (Z < 1) continue;
      const crown = dz > r * 0.55;
      if (seam && q > 0.55) v.set(X, Y, Z, 'black');
      else if (!v.has(X, Y, Z) || v.get(X, Y, Z) === 'black') v.set(X, Y, Z, crown ? 'red' : dz < -r * 0.3 ? 'redDark' : 'chitin');
    }
    // a leg either side under every plate, hooked into the floor with a bone claw
    if (seam && t > 0.06 && t < 0.86 && i % 3 === 0) {
      const [nx, ny] = pts[Math.min(N, i + 4)], tx = nx - x, ty = ny - y, tl = Math.hypot(tx, ty) || 1, px = -ty / tl, py = tx / tl;
      for (const s of [-1, 1]) {
        for (let k = 3; k <= 6; k++) v.set(Math.round(x + px * s * k), Math.round(y + py * s * k), Math.max(1, Math.round(z + 1 - (k - 3))), k > 5 ? 'redDark' : 'chitin');
        v.set(Math.round(x + px * s * 7), Math.round(y + py * s * 7), 1, 'bone');
      }
    }
  });
  // the head at the end of the coil: pincers, and two feelers curling up and forward
  const [hx, hy, hz] = pts[N], [bx, by] = pts[N - 30];
  const fx = hx - bx, fy = hy - by, fl = Math.hypot(fx, fy) || 1, ux = fx / fl, uy = fy / fl;
  for (const s of [-1, 1]) {
    for (let k = 1; k <= 4; k++) v.set(Math.round(hx + ux * (3 + k) - uy * s * (2 - k * 0.3)), Math.round(hy + uy * (3 + k) + ux * s * (2 - k * 0.3)), Math.round(hz - 2), k > 3 ? 'white' : 'bone');
    for (let k = 1; k <= 16; k++) v.set(Math.round(hx + ux * k * 0.8 - uy * s * (2 + k * 0.25)), Math.round(hy + uy * k * 0.8 + ux * s * (2 + k * 0.25)), Math.round(hz + 3 + k * 0.6 - (k > 11 ? (k - 11) * 1.4 : 0)), 'chitin');
  }
  return v;
}
