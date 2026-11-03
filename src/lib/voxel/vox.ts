/* A voxel scene and its isometric renderer, for the floors' illustrations.

   The look is the one readers asked for: chunky cubes in true 2:1 isometric,
   each face lit differently (top bright, left the base tone, right in shade),
   a seam between every block, a hard dark outline round the silhouette, and
   warm light pooling round anything that burns. Scenes are built in code from
   a few primitives with a seeded generator, so a picture is identical on every
   request, and the renderer writes plain RGBA for src/lib/voxel/png.ts.

   x runs to the right and down the screen, y to the left and down, z up. */

export interface Material { color: string; emit?: number; flat?: boolean; noise?: number; small?: boolean; alpha?: number; rim?: boolean }

const hexToRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** The palette every scene draws from; `accent` is the book's own colour. */
export function materials(accent: string): Record<string, Material> {
  return {
    stone: { color: '#8a8a90', noise: 0.09 },
    stoneDark: { color: '#5d5d66', noise: 0.08 },
    tile: { color: '#a7a39a', noise: 0.05 },
    dirt: { color: '#8a5530', noise: 0.12 },
    dirtDark: { color: '#5e3a22', noise: 0.1 },
    sand: { color: '#d7b06a', noise: 0.06 },
    grass: { color: '#4f8a3a', noise: 0.1 },
    leaf: { color: '#2f6b33', noise: 0.14 },
    leafLight: { color: '#4f9a42', noise: 0.12 },
    wood: { color: '#8a5a32', noise: 0.08 },
    woodDark: { color: '#5c3a20', noise: 0.06 },
    plaster: { color: '#d8c7a4', noise: 0.05 },
    roofRed: { color: '#b4472f', noise: 0.06 },
    roofGreen: { color: '#4f6b45', noise: 0.06 },
    roofBlue: { color: '#4b5a78', noise: 0.06 },
    metal: { color: '#7c858e', noise: 0.04 },
    metalDark: { color: '#454b52', noise: 0.04 },
    rail: { color: '#b3b7bd', noise: 0.02 },
    water: { color: '#2f7fb0', noise: 0.05 },
    waterDeep: { color: '#1d5582', noise: 0.04 },
    glass: { color: '#9fe3ff', noise: 0.03, alpha: 0.38, rim: true },
    /* The bubble's skin: a faint sheen over everything inside it, and a bright
       rim where the curve turns away from the eye. */
    dome: { color: '#a8e8ff', noise: 0.02, alpha: 0.11, rim: true },
    domeRim: { color: '#e6fbff', noise: 0.02, alpha: 0.85, rim: true },
    red: { color: '#c22a22', noise: 0.05 },
    redDark: { color: '#7d1b17', noise: 0.05 },
    chitin: { color: '#a8312a', noise: 0.04 },
    bone: { color: '#eadfc4', noise: 0.03 },
    pink: { color: '#e889b0', noise: 0.06 },
    brick: { color: '#e8c24a', noise: 0.07 },
    glassTeal: { color: '#3fc9c0', noise: 0.05 },
    lichen: { color: '#7fb24a', noise: 0.12 },
    purple: { color: '#5a2f86', noise: 0.05 },
    laser: { color: '#ff4fd8', emit: 0.5 },
    beam: { color: '#fff3c4', noise: 0.01, alpha: 0.28 },
    /* Low fog: a pale veil over whatever it lies on, without glass's bright rim. */
    mist: { color: '#e4ecef', noise: 0.02, alpha: 0.42 },
    /* Water in a tank: see-through enough to show what swims in it (Zev's helmet). */
    tank: { color: '#6cc3ea', noise: 0.01, alpha: 0.3 },
    /* An ethereal wing: see-through, coloured like a monarch's. */
    wing: { color: '#f08a24', noise: 0.02, alpha: 0.5 },
    wingDark: { color: '#2a1a12', noise: 0.02, alpha: 0.6 },
    /* An uncharted floor's cover: banks of cloud in big blocks, and a darker
       night cloud and veil where the reader has been told nothing. */
    cloud: { color: '#b4bec6', noise: 0.03 },
    cloudNight: { color: '#58626b', noise: 0.03 },
    nightMist: { color: '#56616b', noise: 0.02, alpha: 0.5 },
    force: { color: '#ff3b2f', noise: 0.02, alpha: 0.32 },
    blue: { color: '#2e4f9c', noise: 0.05 },
    cloth: { color: '#e9e1cf', noise: 0.04 },
    slime: { color: '#5fae46', noise: 0.08 },
    flame: { color: '#ffb340', emit: 1, small: true },
    ember: { color: '#ff7a1f', emit: 0.7 },
    window: { color: '#ffd36a', emit: 0.55 },
    portal: { color: '#8ef3ff', emit: 0.8 },
    void: { color: '#141016', flat: true },
    accent: { color: accent, noise: 0.03 },
    accentGlow: { color: accent, emit: 0.6 },
    black: { color: '#1b1714', noise: 0.02 },
    white: { color: '#eeeae2', noise: 0.02 },
  };
}

/** A small seeded generator (mulberry32), so a scene is the same every time. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const K = (x: number, y: number, z: number) => ((x + 512) * 1024 + (y + 512)) * 256 + (z + 64);

export class Vox {
  private m = new Map<number, string>();
  private pts = new Map<number, [number, number, number]>();
  private tags = new Map<number, string>();
  /* The map layer the next voxels belong to. A floor page lights a layer by
     the pixels its voxels end up on, so every voxel carries its layer's name. */
  tag = '';
  /* How big a block the next voxels belong to. 1 is a detail; 2 or 3 groups
     the voxels of an aligned 2x2x2 or 3x3x3 cell into one big block, drawn
     with one bevel and one tone, so ground and masonry read big and the
     things on them read small. Like `tag`, it is set before drawing. 0 is
     smooth: every voxel of a material drawn at 0 is one piece, bevelled only
     where it meets another, which is how a figure reads as a toy and not as a
     grid of bricks. */
  chunk = 1;
  private chunks = new Map<number, number>();
  sprites: { x: number; y: number; z: number; rows: string[]; palette: Record<string, string>; tag: string }[] = [];

  set(x: number, y: number, z: number, mat: string | null) {
    const k = K(x, y, z);
    if (mat == null) { this.m.delete(k); this.pts.delete(k); this.tags.delete(k); this.chunks.delete(k); return; }
    this.m.set(k, mat); this.pts.set(k, [x, y, z]); this.tags.set(k, this.tag);
    if (this.chunk !== 1) this.chunks.set(k, this.chunk); else this.chunks.delete(k);
  }
  get(x: number, y: number, z: number) { return this.m.get(K(x, y, z)) ?? null; }
  has(x: number, y: number, z: number) { return this.m.has(K(x, y, z)); }

  /** A solid block, corners inclusive. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: string | ((x: number, y: number, z: number) => string | null)) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
        for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++)
          this.set(x, y, z, typeof mat === 'string' ? mat : mat(x, y, z));
  }
  clear(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) { this.box(x0, y0, z0, x1, y1, z1, () => null); }

  /** A column of voxels. */
  col(x: number, y: number, z0: number, z1: number, mat: string) { for (let z = z0; z <= z1; z++) this.set(x, y, z, mat); }

  /** Every voxel, for the renderer. */
  all() { return [...this.pts].map(([k, p]) => ({ p, mat: this.m.get(k)!, tag: this.tags.get(k) ?? '', chunk: this.chunks.get(k) ?? 1 })); }

  /** A hand-drawn pixel sprite standing at a voxel position. */
  sprite(x: number, y: number, z: number, rows: string[], palette: Record<string, string>) { this.sprites.push({ x, y, z, rows, palette, tag: this.tag }); }
}

/* ---- the floating slab every scene stands on ---- */

/**
 * An island of ground: a top surface over a footprint, with a jagged dirt
 * underside that tapers, and loose chunks hanging below it. `shape` says which
 * (x, y) belong to the footprint.
 */
export function slab(v: Vox, x0: number, y0: number, x1: number, y1: number, topZ: number,
                     opts: { shape?: (x: number, y: number) => boolean; top?: string | ((x: number, y: number) => string); depth?: number; seed?: number; crust?: string; chunk?: number; under?: [string, string] } = {}) {
  const r = rng(opts.seed ?? 7);
  // the island is built in big blocks; whatever stands on it is drawn at detail size
  const was = v.chunk; v.chunk = opts.chunk ?? 2;
  const inside = opts.shape ?? (() => true);
  const depth = opts.depth ?? 5;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2 + 0.5, ry = (y1 - y0) / 2 + 0.5;
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    if (!inside(x, y)) continue;
    // deeper in the middle, ragged at the edge
    const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
    const below = Math.max(1, Math.round(depth * (1.15 - d * 0.75) + (r() * 2 - 1) * 1.6));
    for (let z = topZ - below; z < topZ; z++) v.set(x, y, z, z === topZ - 1 ? (opts.crust ?? 'stone') : r() < 0.25 ? (opts.under?.[1] ?? 'dirtDark') : (opts.under?.[0] ?? 'dirt'));
    const top = typeof opts.top === 'function' ? opts.top(x, y) : opts.top ?? 'tile';
    v.set(x, y, topZ, top);
  }
  // chunks drifting under the slab
  for (let i = 0; i < 7; i++) {
    const x = Math.round(x0 + r() * (x1 - x0)), y = Math.round(y0 + r() * (y1 - y0));
    if (!inside(x, y)) continue;
    v.set(x + 1, y + 1, topZ - depth - 3 - Math.floor(r() * 4), r() < 0.5 ? (opts.under?.[0] ?? 'dirt') : 'stone');
  }
  v.chunk = was;
}

/**
 * A banner hanging down a face: `len` blocks of cloth from (x, y, zTop) down,
 * `w` wide along the face, with a gold rod over it, an emblem in its middle
 * and a swallowtail at the foot. `along` is the axis the face runs on, and
 * `out` the side of the cell the cloth hangs on.
 */
export function banner(v: Vox, x: number, y: number, zTop: number, len: number, opts: { along?: 'x' | 'y'; w?: number; cloth?: string; trim?: string; emblem?: string } = {}) {
  const along = opts.along ?? 'x', w = opts.w ?? 3, cloth = opts.cloth ?? 'blue', trim = opts.trim ?? 'accent', emblem = opts.emblem ?? trim;
  const at = (i: number, z: number, m: string) => (along === 'x' ? v.set(x + i, y, z, m) : v.set(x, y + i, z, m));
  for (let i = -1; i <= w; i++) at(i, zTop + 1, trim);
  for (let i = 0; i < w; i++) for (let k = 0; k < len; k++) {
    const z = zTop - k, foot = k === len - 1, edge = i === 0 || i === w - 1;
    if (foot && w >= 3 && i === Math.floor(w / 2)) continue;          // the swallowtail's notch
    at(i, z, edge && !foot ? trim : cloth);
  }
  const mid = Math.floor(w / 2), ez = zTop - Math.floor(len / 2);
  at(mid, ez, emblem); if (len >= 5) { at(mid, ez + 1, emblem); at(mid, ez - 1, emblem); }
}

/** A wall along a run of cells, `h` high, with battlements every other block on top. */
export function wall(v: Vox, cells: [number, number][], z: number, h: number, mat = 'stone', crenel = true) {
  cells.forEach(([x, y], i) => {
    v.col(x, y, z, z + h - 1, mat);
    if (crenel && i % 2 === 0) v.set(x, y, z + h, mat);
  });
}

/** The cells along a straight line between two points (a Bresenham walk). */
export function line(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const out: [number, number][] = [];
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
  for (;;) {
    out.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
  return out;
}

/** A torch on a wall: a wooden stem and a flame that lights its surroundings. */
export function torch(v: Vox, x: number, y: number, z: number) {
  v.set(x, y, z, 'woodDark');
  v.set(x, y, z + 1, 'flame');
}

/** A house: plaster walls, a door, a lit window, a pitched roof of `roof`. */
export function house(v: Vox, x: number, y: number, z: number, w: number, d: number, h: number, roof = 'roofRed', wallMat = 'plaster') {
  v.box(x, y, z, x + w - 1, y + d - 1, z + h - 1, wallMat);
  v.set(x + Math.floor(w / 2), y + d - 1, z, 'woodDark');
  if (h > 1) v.set(x + w - 1, y + Math.floor(d / 2), z + 1, 'window');
  // a roof that steps in from both long sides
  for (let i = 0; i <= Math.floor(d / 2); i++) v.box(x, y + i, z + h + i, x + w - 1, y + d - 1 - i, z + h + i, roof);
}

/* ---- rendering ---- */

export interface Image {
  width: number; height: number; rgba: Uint8Array;
  /* Which layer each pixel shows (index into `layers`, -1 for none), and where
     a point in the scene lands in the picture. */
  layerAt: Int16Array; layers: string[];
  project: (x: number, y: number, z: number) => [number, number];
  /** The picture's extent in projected units, before padding: pass it back as
      `frame` to draw a part of the same scene at exactly the same size and place. */
  bounds: Bounds;
  /** Where scene point (0,0,0) lands in the picture, in its pixels, and the scale it was drawn at. */
  origin: [number, number]; scale: number;
  /** Every opaque block that shows at least one pixel in the picture, with the
      colour its faces are lit from: what a viewer could rebuild the scene with. */
  cubes: Cube[];
}
export interface Cube { x: number; y: number; z: number; rgb: [number, number, number]; emit: boolean; flat: boolean }
export interface Bounds { x0: number; y0: number; x1: number; y1: number }

const TW = 4, TH = 2, ZH = 4;   // half a tile across, half a tile down, a block's height
const proj = (x: number, y: number, z: number): [number, number] => [(x - y) * TW, (x + y) * TH - z * ZH];

/** Fill a polygon, testing pixel centres, writing colour and a face id per pixel. */
function fill(img: Uint8Array, ids: Int32Array, W: number, H: number, pts: [number, number][], rgb: [number, number, number], id: number, alpha = 1, glass?: Uint8Array, glassOwner?: Map<number, number>) {
  let minY = Infinity, maxY = -Infinity;
  for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  for (let py = Math.max(0, Math.floor(minY)); py <= Math.min(H - 1, Math.ceil(maxY)); py++) {
    const cy = py + 0.5, xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      for (let px = Math.max(0, Math.ceil(xs[i] - 0.5)); px <= Math.min(W - 1, Math.floor(xs[i + 1] - 0.5)); px++) {
        const o = (py * W + px) * 4;
        if (alpha < 1) {
          /* See-through: blend over what is already there. Over empty air it
             is drawn as a faint tint, and it never takes the seam id, so glass
             does not grid the scene behind it with block lines. */
          if (img[o + 3]) {
            glassOwner?.set(py * W + px, id >> 2);
            img[o] = Math.round(img[o] * (1 - alpha) + rgb[0] * alpha); img[o + 1] = Math.round(img[o + 1] * (1 - alpha) + rgb[1] * alpha);
            img[o + 2] = Math.round(img[o + 2] * (1 - alpha) + rgb[2] * alpha);
          } else {
            // over open air the glass is its own colour, only partly opaque, so the page shows through it
            img[o] = rgb[0]; img[o + 1] = rgb[1]; img[o + 2] = rgb[2]; img[o + 3] = Math.round(255 * Math.min(1, alpha * 2.2));
            if (glass) glass[py * W + px] = 1;
            glassOwner?.set(py * W + px, id >> 2);
          }
          continue;
        }
        img[o] = rgb[0]; img[o + 1] = rgb[1]; img[o + 2] = rgb[2]; img[o + 3] = 255;
        ids[py * W + px] = id;
      }
    }
  }
}

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const shade = ([r, g, b]: [number, number, number], k: number): [number, number, number] => [clamp(r * k), clamp(g * k), clamp(b * k)];
const hash = (x: number, y: number, z: number) => {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/**
 * Render a scene. `scale` draws every block that many pixels larger, which is
 * what gives a block room for a bevel and a grain: at scale 1 a block is a 4px
 * cube and a scene reads as noise; at 2 and up each block catches light on its
 * upper edges, shades on its lower ones and carries a little texture, and a
 * flame is a real teardrop of fire. Everything a caller measures (`project`,
 * width, height) is in the scaled picture's own pixels.
 */
let GRAIN = true;
export function setGrain(on: boolean) { GRAIN = on; }
export function render(v: Vox, accent: string, pad = 10, scale = 1, frame?: Bounds): Image {
  const S = scale;
  const M = materials(accent);
  // a colour written as a material ('#c28a5c') is a material of its own: a figure's skin, hair or cloth
  for (const { mat } of v.all()) if (!M[mat] && /^#[0-9a-f]{6}$/i.test(mat)) M[mat] = { color: mat, noise: 0.03 };
  const vox = v.all().sort((a, b) => (a.p[0] + a.p[1]) - (b.p[0] + b.p[1]) || a.p[2] - b.p[2] || a.p[0] - b.p[0]);
  const pj = (x: number, y: number, z: number): [number, number] => { const [a, b] = proj(x, y, z); return [a * S, b * S]; };
  const cubeTone: [number, number, number][] = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const { p: [x, y, z] } of vox) {
    const [ax] = pj(x, y + 1, z), [bx] = pj(x + 1, y, z), [, ay] = pj(x, y, z + 1), [, by] = pj(x + 1, y + 1, z);
    x0 = Math.min(x0, ax); x1 = Math.max(x1, bx); y0 = Math.min(y0, ay); y1 = Math.max(y1, by);
  }
  for (const s of v.sprites) { const [sx, sy] = pj(s.x, s.y, s.z); y0 = Math.min(y0, sy - (s.rows.length + 2) * S); x0 = Math.min(x0, sx - 8 * S); x1 = Math.max(x1, sx + 8 * S); }
  // room above the top for flames, which rise past their block
  y0 -= 6 * S;
  const bounds: Bounds = { x0, y0, x1, y1 };
  if (frame) ({ x0, y0, x1, y1 } = frame);
  const PAD = pad * S;
  const W = Math.ceil(x1 - x0) + PAD * 2, H = Math.ceil(y1 - y0) + PAD * 2;
  const ox = -x0 + PAD, oy = -y0 + PAD;
  const img = new Uint8Array(W * H * 4);
  const ids = new Int32Array(W * H).fill(-1);
  // pixels that are only glass over open air: their silhouette gets a bright rim, not a dark one
  const glass = new Uint8Array(W * H);
  const glassTag = new Map<number, number>();   // pixel -> voxel index, for the glass's own layer
  const P = (x: number, y: number, z: number): [number, number] => { const [a, b] = pj(x, y, z); return [a + ox, b + oy]; };
  const matOf: (Material | undefined)[] = [];
  /* Which big block each voxel belongs to: its own index for a detail, one
     shared number for every voxel of the same material in an aligned chunk. */
  const groupOf = new Int32Array(vox.length);
  {
    const groups = new Map<string, number>();
    vox.forEach(({ p: [x, y, z], mat, chunk }, i) => {
      if (chunk === 1) { groupOf[i] = i; return; }
      const key = chunk === 0 ? `smooth|${mat}` : `${chunk}|${Math.floor(x / chunk)}|${Math.floor(y / chunk)}|${Math.floor(z / chunk)}|${mat}`;
      if (!groups.has(key)) groups.set(key, vox.length + groups.size);
      groupOf[i] = groups.get(key)!;
    });
  }

  const lights: [number, number, number, number][] = [];
  const flames: [number, number][] = [];
  vox.forEach(({ p: [x, y, z], mat, chunk }, i) => {
    const m = M[mat] ?? M.stone;
    matOf[i] = m;
    const base = hexToRgb(m.color);
    // a big block takes one tone across all its voxels
    const [hx, hy, hz] = chunk === 0 ? [mat.length * 131, 7, 11] : chunk > 1 ? [Math.floor(x / chunk) * 977, Math.floor(y / chunk) * 977, Math.floor(z / chunk) * 977] : [x, y, z];
    const j = 1 + ((hash(hx, hy, hz) * 2 - 1) * (m.noise ?? 0.05) * (chunk > 1 ? 1.4 : chunk === 0 ? 0.5 : 1));
    // glass is lit evenly: a shaded pane reads as a dark block rather than a clear one
    const lit = (k: number) => shade(base, m.emit ? Math.max(k, 1) : (m.alpha ?? 1) < 1 ? j : k * j);
    cubeTone[i] = shade(base, j);
    if (m.small) {
      const [cx, cy] = P(x + 0.5, y + 0.5, z + 0.35);
      if (S === 1) {
        /* A flame is not a block: a small bright lozenge with a hot core. */
        fill(img, ids, W, H, [[cx, cy - 4], [cx + 2, cy - 1], [cx, cy + 1], [cx - 2, cy - 1]], hexToRgb('#ff8a1f'), i * 4);
        fill(img, ids, W, H, [[cx, cy - 3], [cx + 1, cy - 1], [cx, cy], [cx - 1, cy - 1]], hexToRgb('#fff1b0'), i * 4);
      } else flames.push([cx, cy]);
      lights.push([cx, cy, m.emit ?? 1, i]);
      return;
    }
    /* A face shows when what is in front of it does not cover it: open air, or
       something see-through (glass in front of stone still shows the stone). For
       a see-through block, only where it meets something that is not the same
       glass, or a pane would draw every block inside it. */
    const opaqueAt = (xx: number, yy: number, zz: number) => { const mm = v.get(xx, yy, zz); return mm != null && (M[mm]?.alpha ?? 1) === 1; };
    const sameAt = (xx: number, yy: number, zz: number) => v.get(xx, yy, zz) === mat;
    const see = (m.alpha ?? 1) < 1;
    const top = see ? !sameAt(x, y, z + 1) && !opaqueAt(x, y, z + 1) : !opaqueAt(x, y, z + 1);
    const left = see ? !sameAt(x, y + 1, z) && !opaqueAt(x, y + 1, z) : !opaqueAt(x, y + 1, z);
    const right = see ? !sameAt(x + 1, y, z) && !opaqueAt(x + 1, y, z) : !opaqueAt(x + 1, y, z);
    const a = m.alpha ?? 1;
    if (left) fill(img, ids, W, H, [P(x, y + 1, z + 1), P(x + 1, y + 1, z + 1), P(x + 1, y + 1, z), P(x, y + 1, z)], lit(m.flat ? 1 : 0.86), i * 4 + 1, a, m.rim ? glass : undefined, glassTag);
    if (right) fill(img, ids, W, H, [P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x + 1, y + 1, z), P(x + 1, y, z)], lit(m.flat ? 1 : 0.64), i * 4 + 2, a, m.rim ? glass : undefined, glassTag);
    if (top) fill(img, ids, W, H, [P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)], lit(m.flat ? 1 : 1.12), i * 4 + 3, a, m.rim ? glass : undefined, glassTag);
    if (m.emit) { const [cx, cy] = P(x + 0.5, y + 0.5, z + 0.5); lights.push([cx, cy, m.emit, i]); }
  });

  // which layer each pixel shows: the frontmost opaque face, or the glass over open air
  const layers: string[] = [], layerIdx = new Map<string, number>();
  const tagIdx = vox.map(({ tag }) => { if (!layerIdx.has(tag)) { layerIdx.set(tag, layers.length); layers.push(tag); } return layerIdx.get(tag)!; });
  const layerAt = new Int16Array(W * H).fill(-1);
  for (let i = 0; i < W * H; i++) if (ids[i] >= 0) layerAt[i] = tagIdx[ids[i] >> 2];
  for (const [i, t] of glassTag) if (layerAt[i] < 0) layerAt[i] = tagIdx[t];

  /* Block edges. At scale 1, a pixel whose neighbour belongs to a different
     block face goes a shade darker: a seam. Larger, every block is bevelled:
     its upper and left edges catch the light, its lower and right edges fall
     into shadow, and its face carries a fine grain, so a wall reads as stones
     rather than as a grid. */
  const tone = new Float32Array(W * H).fill(1);
  // edges are between big blocks, not between the voxels inside one
  const gids = new Int32Array(W * H).fill(-1);
  for (let i = 0; i < W * H; i++) if (ids[i] >= 0) gids[i] = groupOf[ids[i] >> 2] * 4 + (ids[i] & 3);
  const other = (a: number, b: number) => b >= 0 && b !== a && (b >> 2) !== (a >> 2);
  const edge = (a: number, b: number) => b < 0 || other(a, b);
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const i = py * W + px, a = gids[i];
    if (a < 0) continue;
    const m = matOf[ids[i] >> 2];
    if (S === 1) {
      const r = px + 1 < W ? gids[i + 1] : -1, d = py + 1 < H ? gids[i + W] : -1;
      if (other(a, r) || other(a, d)) tone[i] = 0.8;
      continue;
    }
    if (m?.emit || m?.flat) { if ((px + 1 < W && other(a, gids[i + 1])) || (py + 1 < H && other(a, gids[i + W]))) tone[i] = 0.85; continue; }
    const up = py > 0 ? gids[i - W] : -1, lf = px > 0 ? gids[i - 1] : -1;
    const dn = py + 1 < H ? gids[i + W] : -1, rt = px + 1 < W ? gids[i + 1] : -1;
    if (other(a, dn) || other(a, rt)) tone[i] = 0.72;
    else if (edge(a, up) || edge(a, lf)) tone[i] = (a & 3) === 3 ? 1.2 : 1.12;
    else {
      // grain: a speckle per 2x2 cell, scaled to the material's own roughness
      // three steps, not a smooth spread: it reads the same and compresses to half
      const h = hash(px >> 1, py >> 1, ids[i] >> 2), g = GRAIN ? (h < 0.22 ? -1 : h > 0.84 ? 1 : 0) * (m?.noise ?? 0.05) * 0.9 : 0;
      tone[i] = 1 + g;
    }
  }
  for (let i = 0; i < W * H; i++) if (tone[i] !== 1) { const o = i * 4; img[o] = clamp(img[o] * tone[i]); img[o + 1] = clamp(img[o + 1] * tone[i]); img[o + 2] = clamp(img[o + 2] * tone[i]); }

  // sprites, drawn over the blocks, each of their pixels a block of S
  for (const s of v.sprites) {
    const [sx, sy] = P(s.x + 0.5, s.y + 0.5, s.z);
    const w = Math.max(...s.rows.map(r => r.length));
    if (!layerIdx.has(s.tag)) { layerIdx.set(s.tag, layers.length); layers.push(s.tag); }
    s.rows.forEach((row, ry) => [...row].forEach((ch, rx) => {
      if (ch === ' ') return;
      const [r, g, b] = hexToRgb(s.palette[ch] ?? '#ff00ff');
      for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
        const px = Math.round(sx + (-w / 2 + rx) * S) + dx, py = Math.round(sy + (-s.rows.length + ry) * S) + dy;
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        const o = (py * W + px) * 4;
        img[o] = r; img[o + 1] = g; img[o + 2] = b; img[o + 3] = 255; ids[py * W + px] = -2;
        layerAt[py * W + px] = layerIdx.get(s.tag)!;
      }
    }));
  }

  // warm light round anything that burns
  for (const [cx, cy, k] of lights) {
    const R = (16 * k + 4) * S;
    for (let py = Math.max(0, Math.floor(cy - R)); py < Math.min(H, cy + R); py++)
      for (let px = Math.max(0, Math.floor(cx - R)); px < Math.min(W, cx + R); px++) {
        const o = (py * W + px) * 4;
        if (!img[o + 3]) continue;
        const d = Math.hypot(px - cx, (py - cy) * 1.4) / R;
        if (d >= 1) continue;
        const f = (1 - d) ** 2 * 0.55 * k;
        img[o] = clamp(img[o] + 255 * f * 0.9); img[o + 1] = clamp(img[o + 1] + 170 * f * 0.9); img[o + 2] = clamp(img[o + 2] + 60 * f * 0.6);
      }
  }

  /* Fire, drawn last so nothing paints over it: a teardrop in four heats, red at
     the edge to white at the core, taller than the block it burns on. */
  for (const [cx, cy] of flames) {
    const u = S;
    const drop = (h: number, w: number, dy: number): [number, number][] => [
      [cx, cy - h * u + dy], [cx + w * 0.55 * u, cy - h * 0.45 * u + dy], [cx + w * 0.5 * u, cy + dy - 0.2 * u],
      [cx, cy + w * 0.35 * u + dy], [cx - w * 0.5 * u, cy + dy - 0.2 * u], [cx - w * 0.55 * u, cy - h * 0.45 * u + dy]];
    for (const [h, w, dy, c] of [[6.5, 4.2, 0, '#c8321a'], [5.4, 3.2, 0.2 * u, '#ff7a1f'], [4, 2.2, 0.4 * u, '#ffc23d'], [2.4, 1.2, 0.6 * u, '#fff4c2']] as const) {
      const rgb = hexToRgb(c);
      for (const [px, py] of rasterize(drop(h, w, dy), W, H)) { const o = (py * W + px) * 4; img[o] = rgb[0]; img[o + 1] = rgb[1]; img[o + 2] = rgb[2]; img[o + 3] = 255; }
    }
  }

  // a hard dark outline round the silhouette, a pixel wider for every two of scale
  let out = new Uint8Array(img);
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const passes = S === 1 ? 1 : Math.max(1, Math.round(S * 0.75));
  for (let pass = 0; pass < passes; pass++) {
    const src = out; const next = new Uint8Array(src);
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const o = (py * W + px) * 4;
      if (src[o + 3]) continue;
      const n = N4.some(([dx, dy]) => { const qx = px + dx, qy = py + dy; return qx >= 0 && qy >= 0 && qx < W && qy < H && src[(qy * W + qx) * 4 + 3]; });
      if (!n) continue;
      const onGlass = N4.some(([dx, dy]) => { const qx = px + dx, qy = py + dy; return qx >= 0 && qy >= 0 && qx < W && qy < H && glass[qy * W + qx]; });
      if (onGlass) {
        if (pass > 0) continue;
        next[o] = 120; next[o + 1] = 226; next[o + 2] = 255; next[o + 3] = 255;
        // inward, fading, so the rim reads as the curve of the glass
        for (const [dx, dy] of N4) for (const [k, a] of [[1, 210], [2, 120]] as const) for (let s2 = 0; s2 < S; s2++) {
          const kk = k * S - s2, qx = px + dx * kk, qy = py + dy * kk, q = (qy * W + qx) * 4;
          if (qx >= 0 && qy >= 0 && qx < W && qy < H && glass[qy * W + qx] && next[q + 3] < a) { next[q] = 170; next[q + 1] = 236; next[q + 2] = 255; next[q + 3] = a; }
        }
      }
      else { next[o] = 18; next[o + 1] = 12; next[o + 2] = 12; next[o + 3] = 255; }
    }
    out = next;
  }
  // the blocks that show: the owner of every frontmost opaque face
  const seen = new Uint8Array(vox.length);
  for (let i = 0; i < W * H; i++) if (ids[i] >= 0) seen[ids[i] >> 2] = 1;
  const cubes: Cube[] = [];
  vox.forEach(({ p: [x, y, z], mat }, i) => {
    const m = M[mat] ?? M.stone;
    if (seen[i] && !m.small && (m.alpha ?? 1) === 1) cubes.push({ x, y, z, rgb: cubeTone[i], emit: !!m.emit, flat: !!m.flat });
  });
  return { width: W, height: H, rgba: out, layerAt, layers, project: (x, y, z) => P(x, y, z), bounds: frame ?? bounds, origin: [ox, oy], scale: S, cubes };
}

/** The pixels inside a polygon, by their centres. */
function rasterize(pts: [number, number][], W: number, H: number): [number, number][] {
  const res: [number, number][] = [];
  let minY = Infinity, maxY = -Infinity;
  for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  for (let py = Math.max(0, Math.floor(minY)); py <= Math.min(H - 1, Math.ceil(maxY)); py++) {
    const cy = py + 0.5, xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2)
      for (let px = Math.max(0, Math.ceil(xs[i] - 0.5)); px <= Math.min(W - 1, Math.floor(xs[i + 1] - 0.5)); px++) res.push([px, py]);
  }
  return res;
}

/* ---- more primitives ---- */

/** A filled disc of columns: every (x, y) within the ellipse, from z0 to z1. */
export function disc(v: Vox, cx: number, cy: number, rx: number, ry: number, z0: number, z1: number, mat: string | ((x: number, y: number, z: number) => string | null)) {
  for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1)
        for (let z = z0; z <= z1; z++) v.set(x, y, z, typeof mat === 'string' ? mat : mat(x, y, z));
}

/** A ring wall: the cells between two ellipses, from z0 to z1. */
export function ring(v: Vox, cx: number, cy: number, r: number, thick: number, z0: number, z1: number, mat: string | ((x: number, y: number, z: number) => string | null)) {
  for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r && d > r - thick) for (let z = z0; z <= z1; z++) v.set(x, y, z, typeof mat === 'string' ? mat : mat(x, y, z));
    }
}

/** A tree: a trunk and a lumpy crown. */
export function tree(v: Vox, x: number, y: number, z: number, h: number, seed: number, leaf = 'leaf') {
  const r = rng(seed);
  v.col(x, y, z, z + h - 1, 'woodDark');
  const top = z + h;
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -1; dz <= 1; dz++) {
    if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 3 || r() < 0.18) continue;
    v.set(x + dx, y + dy, top + dz, dz === 1 || r() < 0.3 ? 'leafLight' : leaf);
  }
}

/** A palm: a tall thin trunk and a flat star of fronds. */
export function palm(v: Vox, x: number, y: number, z: number, h: number) {
  v.col(x, y, z, z + h - 1, 'wood');
  const t = z + h;
  v.set(x, y, t, 'leafLight');
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) v.set(x + dx, y + dy, t - (Math.abs(dx) + Math.abs(dy) > 1 ? 1 : 0), 'leaf');
}
