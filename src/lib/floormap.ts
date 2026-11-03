import type { Gate } from './spoiler.ts';

/* A floor map is a stack of layers, each one a piece of the floor the reader
   has been shown. The *gate* lives in the data (data/books.json: every layer's
   `at`, and `until` for a state that is replaced — a castle that falls); the
   *drawing* lives in src/lib/maps/, keyed by layer id. That split is the point:
   a geometry file holds shapes and no words, so nothing in it can name anything,
   and check-pages.mjs reads it like any other source to make sure of that.

   The server renders only the layers reached, so a sealed layer is not hidden
   in the document: it was never drawn. */

export interface MapLayer {
  id: string;
  label: string | null;
  at: string;
  sortKey: number;
  untilKey: number | null;
}

export interface FloorMapData { title: string | null; layers: MapLayer[] }

/** The layers a reader at this gate is shown: reached, and not yet replaced. */
export function layersShown(map: FloorMapData | null | undefined, gate: Gate): MapLayer[] {
  if (!map) return [];
  return map.layers.filter(l => gate.frontier >= l.sortKey && (l.untilKey == null || gate.frontier < l.untilKey));
}

export type Pt = [number, number];

export type Shape =
  | { t: 'rect'; x: number; y: number; w: number; h: number }
  | { t: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { t: 'poly'; pts: Pt[] }
  /* An ellipse's edge, `w` thick; `gaps` are angle ranges in degrees (0 = east,
     counter-clockwise) left open, which is how a popped dome is drawn. */
  | { t: 'ring'; cx: number; cy: number; rx: number; ry: number; w: number; gaps?: [number, number][] }
  /* An open stroke, `w` wide (default 1.5). */
  | { t: 'line'; pts: Pt[]; w?: number }
  /* Hand-placed pixels: one character per grid cell from (x, y), a space is
     empty, every other character is a key into `palette`. Only the pixel
     renderer draws these; it is how a crawler is two dozen deliberate pixels
     rather than an ellipse. */
  | { t: 'sprite'; x: number; y: number; rows: string[]; palette: Record<string, string> };

/* What a part *is*, not what colour it is: each renderer decides how a role
   looks. Adding a role means teaching both renderers. */
export type Role =
  | 'edge'      // the dome, and anything drawn as a boundary
  | 'sand' | 'rock' | 'stone' | 'void' | 'ground' | 'shelf' | 'water' | 'deep'
  | 'build' | 'roof' | 'glow'
  | 'ruin'
  | 'cloth'     // balloons, sails, awnings
  | 'craft'     // hulls: the slab, the submarine
  | 'rope'
  | 'coral'
  | 'beast' | 'beastline'
  | 'fog'       // what the reader knows is there but has not been shown
  | 'cliff' | 'scrub' | 'cloud' | 'glass' | 'sprite';

/* `tone` pins a part to one step of its material's ramp (0 lit, 1 base, 2
   shade, 3 darkest), which is how a 3/4 view says which face is a top and
   which a wall. Left alone, the renderer lights exposed edges itself. */
export interface Part {
  shape: Shape; role: Role; clip?: boolean; tone?: 0 | 1 | 2 | 3;
  /* A curved face: shade it as a cylinder around this axis (centre x, radius),
     lit on the left, rolling into shadow on the right, dithered between steps. */
  cyl?: [number, number];
}

export interface LayerGeometry {
  parts: Part[];
  /* Where its callout sits, and the point the leader runs to. */
  callout?: { x: number; y: number; to: Pt };
}

export interface MapGeometry {
  width: number;
  height: number;
  /* Sea level, for the elevation ruler. */
  seaLevel: number;
  /* The world's own boundary; parts with `clip` are kept inside it. */
  clip: Shape;
  /* Draw order, bottom first. A layer id with no geometry is a data error the
     test suite catches, not something a page should guess about. */
  order: string[];
  layers: Record<string, LayerGeometry>;
}

/* Point-in-shape, for the pixel renderer, which colours a grid cell by the
   topmost part covering its centre. */
export function covers(s: Shape, x: number, y: number): boolean {
  switch (s.t) {
    case 'rect': return x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h;
    case 'ellipse': return ((x - s.cx) / s.rx) ** 2 + ((y - s.cy) / s.ry) ** 2 <= 1;
    case 'poly': {
      let inside = false;
      const p = s.pts;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const [xi, yi] = p[i], [xj, yj] = p[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
    case 'ring': {
      const d = Math.sqrt(((x - s.cx) / s.rx) ** 2 + ((y - s.cy) / s.ry) ** 2);
      const band = s.w / Math.min(s.rx, s.ry);
      if (d > 1 || d < 1 - band) return false;
      if (!s.gaps) return true;
      const a = ((Math.atan2(-(y - s.cy) / s.ry, (x - s.cx) / s.rx) * 180) / Math.PI + 360) % 360;
      return !s.gaps.some(([lo, hi]) => a >= lo && a <= hi);
    }
    case 'sprite': {
      const cell = SPRITE_CELL;
      const cx = Math.floor((x - s.x) / cell), cy = Math.floor((y - s.y) / cell);
      const row = s.rows[cy];
      return !!row && cx >= 0 && cx < row.length && row[cx] !== ' ';
    }
    case 'line': {
      const half = (s.w ?? 1.5) / 2 + 0.6;
      for (let i = 1; i < s.pts.length; i++) {
        const [x1, y1] = s.pts[i - 1], [x2, y2] = s.pts[i];
        const dx = x2 - x1, dy = y2 - y1;
        const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
        if (Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) <= half) return true;
      }
      return false;
    }
  }
}

/** A shape's bounding box, so the rasteriser can skip parts nowhere near a cell. */
export function boundsOf(s: Shape): [number, number, number, number] {
  switch (s.t) {
    case 'rect': return [s.x, s.y, s.x + s.w, s.y + s.h];
    case 'ellipse': case 'ring': return [s.cx - s.rx, s.cy - s.ry, s.cx + s.rx, s.cy + s.ry];
    case 'sprite': return [s.x, s.y, s.x + Math.max(...s.rows.map(r => r.length)) * SPRITE_CELL, s.y + s.rows.length * SPRITE_CELL];
    case 'poly': case 'line': {
      const pad = s.t === 'line' ? (s.w ?? 1.5) + 2 : 0;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of s.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
    }
  }
}

/** The size of one sprite pixel, in drawing units: one cell of the pixel grid. */
export const SPRITE_CELL = 3;

export interface Callout { n: number; id: string; label: string; at: string; x: number; y: number; to: Pt }

/* The numbered callouts, in draw order. The page's legend and both renderers
   read this one list, so the number on the map and the number in the key
   cannot disagree. Numbering follows what is shown, so it is stable within a
   position and moves with the reader. */
export function calloutsOf(g: MapGeometry, layers: MapLayer[]): Callout[] {
  const byId = new Map(layers.map(l => [l.id, l]));
  const out: Callout[] = [];
  for (const id of g.order) {
    const l = byId.get(id), c = g.layers[id]?.callout;
    if (!l || !l.label || !c) continue;
    out.push({ n: out.length + 1, id, label: l.label, at: l.at, x: c.x, y: c.y, to: c.to });
  }
  return out;
}

/* ---- rewinding the map ----

   A map changes only at the points its layers are drawn or replaced, so the
   timeline is those points and nothing else, cut off at the reader's own
   frontier: a reader can scrub back through every state they have read past
   and never one step forward. The clamp is applied to whatever the address
   asks for, so `?at=` cannot be used to look ahead either. */

/** The points at which the map changes, up to and including the reader's frontier. */
export function mapSteps(map: FloorMapData | null | undefined, frontier: number): number[] {
  if (!map) return [];
  const keys = new Set<number>();
  for (const l of map.layers) {
    if (l.sortKey <= frontier) keys.add(l.sortKey);
    if (l.untilKey != null && l.untilKey <= frontier) keys.add(l.untilKey);
  }
  return [...keys].sort((a, b) => a - b);
}

/** The step to show for a requested point: the last change at or before it, never past the frontier. */
export function pickStep(steps: number[], requested: number | null, frontier: number): number | null {
  if (!steps.length) return null;
  const want = requested == null || !Number.isFinite(requested) ? frontier : Math.min(requested, frontier);
  let out = steps[0];
  for (const k of steps) if (k <= want) out = k;
  return out;
}

/** What a step changes: the layers it draws and the layers it takes away. */
export function changesAt(map: FloorMapData | null | undefined, key: number): { added: MapLayer[]; removed: MapLayer[] } {
  if (!map) return { added: [], removed: [] };
  return {
    added: map.layers.filter(l => l.sortKey === key && l.label),
    removed: map.layers.filter(l => l.untilKey === key && l.label),
  };
}

/** A point on the timeline as a reader says it: "Ch 12", or with the book when it differs. */
export function stepLabel(key: number, book: number | null = null): string {
  const b = Math.floor(key / 1000), c = key % 1000;
  const ch = c === 0 ? 'Start' : c >= 999 ? 'End' : `Ch ${c}`;
  return book != null && b === book ? ch : `Book ${b} · ${ch}`;
}
