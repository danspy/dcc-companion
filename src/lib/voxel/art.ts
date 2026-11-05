import { createHash } from 'node:crypto';
import { VOXEL_FLOORS, VOXEL_HEROES } from './floors.ts';
import { VOXEL_MAPS } from './maps/index.ts';
import { render } from './vox.ts';
import { uncharted } from './tiles/uncharted.ts';
import { encodePalettePng } from './png.ts';
import { VOXEL_FIGURES, unpictured } from './figures/cast.ts';
import { unpicturedItem } from './figures/items.ts';
import { entry, ENTRY_HOLE, ENTRY_Z } from './scenes/entry.ts';

/* A floor's tile picture, drawn once per process, and a short hash of its
   bytes. The page puts the hash in the picture's address, so a redrawn tile
   has a new address and no browser can go on showing the old one; the route
   can then let a browser keep what it has for as long as it likes. */

export interface FloorArt {
  png: Uint8Array; version: string; width: number; height: number; stair: [number, number] | null;
  /** Where scene point (0,0,0) lands in the picture, and the scale it is drawn at. */
  origin: [number, number]; scale: number;
  /** The picture's visible blocks, for the homepage to rebuild it from: see `packCubes`. */
  cubes: Uint8Array;
}

/* The visible blocks of a picture as one small binary file: a count (uint32),
   then x, y, z for every block (int16 each), then r, g, b and flags for every
   block (uint8; flag 1 glows, flag 2 is unshaded). Little-endian. The blocks
   are exactly the ones the picture shows, so the file says nothing the
   picture does not, and it is gated with it. */
function packCubes(cubes: { x: number; y: number; z: number; rgb: [number, number, number]; emit: boolean; flat: boolean }[]): Uint8Array {
  const n = cubes.length, buf = new ArrayBuffer(4 + n * 6 + n * 4), dv = new DataView(buf);
  dv.setUint32(0, n, true);
  cubes.forEach((c, i) => { dv.setInt16(4 + i * 6, c.x, true); dv.setInt16(6 + i * 6, c.y, true); dv.setInt16(8 + i * 6, c.z, true); });
  const o = 4 + n * 6;
  cubes.forEach((c, i) => { dv.setUint8(o + i * 4, c.rgb[0]); dv.setUint8(o + i * 4 + 1, c.rgb[1]); dv.setUint8(o + i * 4 + 2, c.rgb[2]); dv.setUint8(o + i * 4 + 3, (c.emit ? 1 : 0) | (c.flat ? 2 : 0)); });
  return new Uint8Array(buf);
}
const cache = new Map<string, Promise<FloorArt>>();

/* Where each floor's way down is, by the map layer that draws it. The homepage
   runs its stairwell from that point to the floor below, but only once the
   reader has finished the floor (the picture is then the hero one): before
   that, a shaft from the stairs would say where the stairs are. Floor 5 has no
   stair layer, so its shaft leaves from the island's underside like any other. */
const STAIRS: Record<number, string> = {
  1: 'stairwell', 2: 'stair-chamber', 3: 'east-stairs', 4: 'stairwell-room', 6: 'stairwell-park',
  7: 'portals', 8: 'capitol', 9: 'pit', 10: 'roof-portals', 11: 'stairwells',
};

/** How many pixels a block is drawn at: big enough to bevel and grain it. */
export const ART_SCALE = 2;

/** Does the floor have a hero picture, and has this reader finished the floor? */
export const showsHero = (id: number, frontier: number, finishedKey: number | null | undefined) =>
  !!VOXEL_HEROES[id] && finishedKey != null && frontier >= finishedKey;

export function floorArt(id: number, accent: string, hero = false): Promise<FloorArt> | null {
  const build = hero ? VOXEL_HEROES[id] : VOXEL_FLOORS[id];
  if (!build) return null;
  const key = `${id}|${accent}|${hero ? 'hero' : 'tile'}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = (async () => {
      const img = render(build(), accent, 10, ART_SCALE);
      const png = await encodePalettePng(img.width, img.height, img.rgba);
      const a = hero && STAIRS[id] ? VOXEL_MAPS[id]?.anchors[STAIRS[id]] : undefined;
      const stair = a ? (([x, y]) => [+(x / img.width).toFixed(4), +(y / img.height).toFixed(4)] as [number, number])(img.project(a[0] + 0.5, a[1] + 0.5, a[2])) : null;
      return { png, version: createHash('sha256').update(png).digest('hex').slice(0, 10), width: img.width, height: img.height, stair,
               origin: img.origin, scale: img.scale, cubes: packCubes(img.cubes) };
    })();
    cache.set(key, hit);
  }
  return hit;
}

/** The accent a picture is drawn in: its book's colour, or the site's gold for a floor not yet reached. */
export const FALLBACK_ACCENT = '#ffc10a';

/* A floor with no picture to show this reader: the uncharted island, fogbound
   under the System's question mark (gold when something is known about the
   floor, black when nothing is). It shows nothing of the floor, so it is not
   gated: its shape is seeded by the number, which every reader already sees. */
export function unchartedArt(id: number, known: boolean): Promise<FloorArt> {
  const key = `uncharted|${id}|${known}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = (async () => {
      const img = render(uncharted(id, known), FALLBACK_ACCENT, 10, ART_SCALE);
      const png = await encodePalettePng(img.width, img.height, img.rgba);
      return { png, version: createHash('sha256').update(png).digest('hex').slice(0, 10), width: img.width, height: img.height, stair: null,
               origin: img.origin, scale: img.scale, cubes: packCubes(img.cubes) };
    })();
    cache.set(key, hit);
  }
  return hit;
}

/* The start screen's picture: the way into the dungeon as the first chapter has
   it, Carl and the cat either side of it. It shows the back cover and the opening
   pages and nothing past them, so it is the same for everyone and served to
   anyone. `beam` is where the hole's mouth is in the picture (its centre and its
   width, as fractions), for the spotlight the page raises out of it. */
export interface EntryArt { png: Uint8Array; version: string; width: number; height: number; beam: { x: number; y: number; w: number } }
let entryHit: Promise<EntryArt> | null = null;
export function entryArt(): Promise<EntryArt> {
  return entryHit ??= (async () => {
    const img = render(entry(), FALLBACK_ACCENT, 10, ART_SCALE);
    const png = await encodePalettePng(img.width, img.height, img.rgba);
    const [x0, y0, x1, y1] = ENTRY_HOLE, corners = [[x0, y0], [x1 + 1, y0], [x0, y1 + 1], [x1 + 1, y1 + 1]].map(([x, y]) => img.project(x, y, ENTRY_Z + 1));
    const xs = corners.map(c => c[0]), ys = corners.map(c => c[1]);
    const f = (n: number, of: number) => +(n / of).toFixed(4);
    return { png, version: createHash('sha256').update(png).digest('hex').slice(0, 10), width: img.width, height: img.height,
             beam: { x: f((Math.min(...xs) + Math.max(...xs)) / 2, img.width), y: f((Math.min(...ys) + Math.max(...ys)) / 2, img.height), w: f(Math.max(...xs) - Math.min(...xs), img.width) } };
  })();
}

/** Everything a page needs to show a floor's picture, whichever picture it is. */
export interface Picture { src: string; cubes: string; version: string; width: number; height: number; origin: [number, number]; scale: number; stair: [number, number] | null; own: boolean }

/* The floor's own picture where the caller has decided the reader may see it
   (`show`), the uncharted island otherwise. The gate stays with the caller. */
export async function pictureFor(id: number, show: { accent: string; hero: boolean } | null, known: boolean): Promise<Picture> {
  const own = show ? await floorArt(id, show.accent, show.hero) : null;
  if (own) return { src: `/art/floor-${id}.png?v=${own.version}`, cubes: `/art/cubes-${id}.bin?v=${own.version}`, version: own.version,
                    width: own.width, height: own.height, origin: own.origin, scale: own.scale, stair: own.stair, own: true };
  const u = await unchartedArt(id, known), k = known ? 'known' : 'sealed';
  return { src: `/art/uncharted/${id}-${k}.png?v=${u.version}`, cubes: `/art/uncharted/${id}-${k}.bin?v=${u.version}`, version: u.version,
           width: u.width, height: u.height, origin: u.origin, scale: u.scale, stair: null, own: false };
}

/* ---- a character's figure, and an item's sprite ----
   Drawn once per process and look, like a floor's picture, and gated the same
   way: `/art/figure/<id>-<n>.png` answers only a reader past the entity's
   reveal and past look n's own point. A character not drawn yet, or whose
   first look the reader has not reached, gets the shadow figure, which shows
   nothing and is the same for everyone. */
export interface FigureArt { png: Uint8Array; version: string; width: number; height: number }
const figureCache = new Map<string, Promise<FigureArt>>();
/* Two sizes: the page's own (ART_SCALE, every block bevelled) and a small one
   at scale 1 for a cell or a cast list, drawn rather than scaled down, which
   would smear the blocks. */
function drawFigure(key: string, build: () => import('./vox.ts').Vox, small: boolean): Promise<FigureArt> {
  const k = `${key}|${small ? 's' : 'l'}`;
  let hit = figureCache.get(k);
  if (!hit) {
    hit = (async () => {
      const img = render(build(), FALLBACK_ACCENT, small ? 4 : 8, small ? 1 : ART_SCALE);
      const png = await encodePalettePng(img.width, img.height, img.rgba);
      return { png, version: createHash('sha256').update(png).digest('hex').slice(0, 10), width: img.width, height: img.height };
    })();
    figureCache.set(k, hit);
  }
  return hit;
}
export const figureArt = (id: string, look: string, small = false): Promise<FigureArt> | null => {
  const build = VOXEL_FIGURES[id]?.[look];
  return build ? drawFigure(`${id}|${look}`, build, small) : null;
};
export const unpicturedArt = (small = false) => drawFigure('unpictured', unpictured, small);
/* an item not drawn yet, or not reached: the unidentified pouch, public like the shadow figure */
export const unpicturedItemArt = (small = false) => drawFigure('unpictured-item', unpicturedItem, small);

export interface FigureStep { look: string; at: string; sortKey: number }
export interface FigureImage { src: string; width: number; height: number }
export interface Figure extends FigureImage { small: FigureImage; own: boolean; at: string | null; changes: boolean }
/** The figure a page shows for a character or an item: the latest look the reader has reached, or the shadow (the unidentified pouch for an item). */
export async function figureFor(id: string, steps: FigureStep[], reached: (sortKey: number) => boolean, kind = 'character'): Promise<Figure> {
  let n = -1;
  steps.forEach((s, i) => { if (reached(s.sortKey) && VOXEL_FIGURES[id]?.[s.look]) n = i; });
  const own = n >= 0, shadow = kind === 'item' ? unpicturedItemArt : unpicturedArt;
  const [big, small] = own ? await Promise.all([figureArt(id, steps[n].look)!, figureArt(id, steps[n].look, true)!]) : await Promise.all([shadow(), shadow(true)]);
  const name = own ? `${id}-${n}` : kind === 'item' ? 'unpictured-item' : 'unpictured';
  return { src: `/art/figure/${name}.png?v=${big.version}`, width: big.width, height: big.height,
           small: { src: `/art/figure/${name}-s.png?v=${small.version}`, width: small.width, height: small.height },
           own, at: own ? steps[n].at : null, changes: steps.length > 1 };
}
