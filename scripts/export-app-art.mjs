#!/usr/bin/env node
/* npm run export:app-art -- --out <dir>

   The iOS app's pictures: everything the site draws in voxels, drawn by the
   site's own renderer, written as files for the app to bundle.

     <dir>/art/index.json   which picture is which, its size, and for a map
                            state its layers, markers, title plate and masks
     <dir>/art/*.png        the pictures

   Nothing here says when a picture may be shown. That is content: content.json
   carries every floor's artKey and recapKey, every foretold floor's artKey and
   heroKey, every look's key and every map layer's key and until, and the app's
   Reader decides, as the site's routes do. A map state is named by the set of
   layers it draws, so the Reader picks the state from the layers it has reached.

   Default output is ./.app-export, gitignored. */

import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { floorArt, unchartedArt, entryArt, figureArt, unpicturedArt, unpicturedItemArt, FALLBACK_ACCENT } from '../src/lib/voxel/art.ts';
import { VOXEL_FLOORS, VOXEL_HEROES } from '../src/lib/voxel/floors.ts';
import { VOXEL_MAPS } from '../src/lib/voxel/maps/index.ts';
import { VOXEL_FIGURES } from '../src/lib/voxel/figures/cast.ts';
import { mapScene } from '../src/lib/voxel/mapscene.ts';
import { placeCallouts } from '../src/lib/voxel/placement.ts';
import { mapSteps, layersShown } from '../src/lib/floormap.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outArg = args.find((a, i) => args[i - 1] === '--out') ?? args.find(a => a.startsWith('--out='))?.slice(6);
const out = join(outArg ? (outArg.startsWith('/') ? outArg : join(process.cwd(), outArg)) : join(root, '.app-export'), 'art');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const snapshot = JSON.parse(readFileSync(join(root, 'data/content.snapshot.json'), 'utf8'));
let bytes = 0, files = 0;
const put = (name, art) => {
  writeFileSync(join(out, name), art.png);
  bytes += art.png.byteLength; files++;
  return { file: name, w: art.width, h: art.height };
};

/* Floors: the tile in its book's colour (the site's gold for a floor past the
   published eight), the hero picture where there is one, and both uncharted
   islands for every floor. */
const floors = {};
for (let id = 1; id <= 18; id++) {
  const f = snapshot.floors.find(x => x.id === id);
  const accent = f ? f.accent : FALLBACK_ACCENT;
  const tile = VOXEL_FLOORS[id] ? await floorArt(id, accent, false) : null;
  const hero = VOXEL_HEROES[id] ? await floorArt(id, accent, true) : null;
  floors[id] = {
    tile: tile ? put(`floor-${id}.png`, tile) : null,
    hero: hero ? put(`floor-${id}-hero.png`, hero) : null,
    known: put(`uncharted-${id}-known.png`, await unchartedArt(id, true)),
    sealed: put(`uncharted-${id}-sealed.png`, await unchartedArt(id, false)),
  };
}

const e = await entryArt();
const entry = { ...put('entry.png', e), beam: e.beam };

/* Figures: every drawn look of every character and item, page size and small. */
const figures = {};
for (const [id, looks] of Object.entries(VOXEL_FIGURES)) {
  figures[id] = {};
  for (const look of Object.keys(looks)) {
    figures[id][look] = {
      l: put(`fig-${id}--${look}.png`, await figureArt(id, look, false)),
      s: put(`fig-${id}--${look}-s.png`, await figureArt(id, look, true)),
    };
  }
}
const shadows = {
  character: { l: put('unpictured.png', await unpicturedArt(false)), s: put('unpictured-s.png', await unpicturedArt(true)) },
  item: { l: put('unpictured-item.png', await unpicturedItemArt(false)), s: put('unpictured-item-s.png', await unpicturedItemArt(true)) },
};

/* Maps: one picture per state the timeline can stop on, named by its layers. The
   markers are placed by the page's own placement (placement.ts) for the labels the
   state shows; a mask is the runs of cells a layer owns, x y w, flattened. */
const maps = {};
for (const f of snapshot.floors) {
  const vmap = VOXEL_MAPS[f.id];
  if (!f.map || !vmap) continue;
  const states = {};
  for (const step of mapSteps(f.map, Infinity)) {
    const layers = layersShown(f.map, { frontier: step });
    const ids = layers.map(l => l.id);
    const name = [...ids].sort().join(',');
    if (states[name]) continue;
    const scene = await mapScene(vmap, ids, f.accent);
    const callouts = layers.filter(l => l.label && vmap.anchors[l.id]).map((l, i) => ({ n: i + 1, id: l.id, label: l.label }));
    const title = f.map.title ?? f.name;
    const { titleBox, placed } = placeCallouts(scene, callouts, title);
    const file = `map-${f.id}-${Object.keys(states).length + 1}.png`;
    const png = Buffer.from(scene.src.slice('data:image/png;base64,'.length), 'base64');
    writeFileSync(join(out, file), png); bytes += png.byteLength; files++;
    const masks = {};
    for (const [id, d] of Object.entries(scene.masks)) {
      const runs = [];
      for (const m of d.matchAll(/M(-?\d+) (-?\d+)h(-?\d+)/g)) runs.push(+m[1], +m[2], +m[3]);
      masks[id] = runs;
    }
    states[name] = {
      file, w: scene.width, h: scene.height, title: titleBox,
      markers: placed.map(c => ({ id: c.id, n: c.n, tx: c.tx, ty: c.ty, x: c.x, y: c.y, lx: c.lx, ly: c.ly, lw: c.lw })),
      masks,
    };
  }
  maps[f.id] = states;
}

const index = { scale: 2, floors, entry, figures, shadows, maps };
const json = JSON.stringify(index);
writeFileSync(join(out, 'index.json'), json);
console.log(`app art -> ${out}`);
console.log(`  ${files} pictures, ${(bytes / 1048576).toFixed(1)} MB; index.json ${(json.length / 1024).toFixed(0)} KB`);
console.log(`  ${Object.keys(maps).length} maps, ${Object.values(maps).reduce((n, s) => n + Object.keys(s).length, 0)} states; ${Object.values(figures).reduce((n, l) => n + Object.keys(l).length, 0)} looks`);
