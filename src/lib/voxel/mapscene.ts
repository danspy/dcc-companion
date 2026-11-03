import { render } from './vox.ts';
import { encodePalettePng } from './png.ts';
import { ART_SCALE } from './art.ts';
import type { VoxelMap } from './maps/index.ts';

/* A floor map, rendered for one set of reached layers: the picture as a data
   URI, its size, a mask per layer (the pixels where that layer shows, as SVG
   path runs, for the page's highlighting), and where each callout's anchor
   lands. Cached per floor and layer set: content only changes on deploy. */

export interface MapScene {
  width: number; height: number; src: string;
  masks: Record<string, string>;
  points: Record<string, [number, number]>;
}

const cache = new WeakMap<VoxelMap, Map<string, Promise<MapScene>>>();

/* The picture is drawn at ART_SCALE, but its size, masks and points are given
   at scale 1, so the page's callouts, labels and title keep the sizes they were
   designed at and the image simply carries more pixels into the same box. */
export function mapScene(map: VoxelMap, shown: string[], accent: string): Promise<MapScene> {
  if (!cache.has(map)) cache.set(map, new Map());
  const c = cache.get(map)!;
  const key = `${accent}|${[...shown].sort().join(',')}`;
  const hit = c.get(key);
  if (hit) return hit;

  const scene = (async (): Promise<MapScene> => {
    const S = ART_SCALE;
    const img = render(map.build(new Set(shown)), accent, 14, S);
    const png = await encodePalettePng(img.width, img.height, img.rgba);
    const w = Math.ceil(img.width / S), h = Math.ceil(img.height / S);
    // a layer owns a cell when it owns the cell's centre pixel
    const at = (x: number, y: number) => { const px = Math.min(img.width - 1, x * S + (S >> 1)), py = Math.min(img.height - 1, y * S + (S >> 1)); return img.layerAt[py * img.width + px]; };
    const runs: Record<string, string[]> = {};
    for (let y = 0; y < h; y++) {
      let cur = -1, start = 0;
      for (let x = 0; x <= w; x++) {
        const l = x < w ? at(x, y) : -1;
        if (l !== cur) {
          if (cur >= 0) (runs[img.layers[cur]] ??= []).push(`M${start} ${y}h${x - start}v1h${start - x}z`);
          cur = l; start = x;
        }
      }
    }
    const points: Record<string, [number, number]> = {};
    for (const [id, [x, y, z]] of Object.entries(map.anchors)) { const [px, py] = img.project(x + 0.5, y + 0.5, z); points[id] = [px / S, py / S]; }
    return {
      width: img.width / S, height: img.height / S,
      src: `data:image/png;base64,${Buffer.from(png).toString('base64')}`,
      masks: Object.fromEntries(Object.entries(runs).filter(([k]) => k).map(([k, v]) => [k, v.join('')])),
      points,
    };
  })();
  if (c.size > 300) c.clear();
  c.set(key, scene);
  return scene;
}
