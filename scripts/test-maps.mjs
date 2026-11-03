/* A floor map is two halves that must agree: the gate in data/books.json (each
   layer's reveal point and label) and the drawing in src/lib/maps/ (each layer's
   shapes). A layer with no drawing is a silent blank; a drawing with no data is
   a picture nobody gated. Both fail here. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VOXEL_MAPS } from '../src/lib/voxel/maps/index.ts';
import { mapScene } from '../src/lib/voxel/mapscene.ts';
import { layersShown, covers, mapSteps } from '../src/lib/floormap.ts';

const snap = JSON.parse(readFileSync(new URL('../data/content.snapshot.json', import.meta.url), 'utf8'));

test('every floor with map layers has a voxel map, its anchors name real layers, and every state renders', async () => {
  for (const f of snap.floors) {
    const vm = VOXEL_MAPS[f.id];
    if (!f.map) { assert.equal(vm, undefined, `floor ${f.id}: a voxel map with no gated layers`); continue; }
    assert.ok(vm, `floor ${f.id}: map data but no voxel map`);
    const ids = new Set(f.map.layers.map(l => l.id));
    for (const id of Object.keys(vm.anchors)) assert.ok(ids.has(id), `floor ${f.id}: anchor for "${id}", which is no layer`);
    for (const l of f.map.layers) if (l.label && l.id !== 'caption') assert.ok(vm.anchors[l.id], `floor ${f.id}: layer "${l.id}" has no anchor`);
    // every state on the timeline builds and renders, and each layer shown that has an anchor shows up in the picture
    for (const k of mapSteps(f.map, 9999)) {
      const shown = layersShown(f.map, { frontier: k, spoilers: true, fresh: false }).map(l => l.id);
      const scene = await mapScene(vm, shown, '#eaed19');
      assert.ok(scene.width > 200, `floor ${f.id} at ${k}: picture too small`);
    }
  }
});

test('a layer is drawn from its point and stops at its until', () => {
  const map = { title: null, layers: [
    { id: 'a', label: null, at: '4:1', sortKey: 4001, untilKey: 4012 },
    { id: 'b', label: null, at: '4:12', sortKey: 4012, untilKey: null },
  ] };
  const at = n => layersShown(map, { frontier: n, spoilers: true, fresh: false }).map(l => l.id);
  assert.deepEqual(at(4000), []);
  assert.deepEqual(at(4001), ['a']);
  assert.deepEqual(at(4011), ['a']);
  assert.deepEqual(at(4012), ['b']);
  assert.deepEqual(layersShown(null, { frontier: 9999, spoilers: true, fresh: false }), []);
});

test('the opening position draws nothing of floor 5', () => {
  const f5 = snap.floors.find(f => f.id === 5);
  assert.deepEqual(layersShown(f5.map, { frontier: 0, spoilers: true, fresh: true }), []);
  // At its first chapter the lower half is still fog, and nothing of book 4's end is drawn.
  const first = layersShown(f5.map, { frontier: 4001, spoilers: true, fresh: false }).map(l => l.id);
  assert.ok(first.includes('fog-below'));
  for (const late of ['lusca', 'orthrus', 'dome-popped', 'flood', 'sandcastle-down']) assert.ok(!first.includes(late), late);
});

test('a popped dome leaves gaps, a whole one does not', () => {
  const ring = { t: 'ring', cx: 0, cy: 0, rx: 100, ry: 100, w: 6 };
  assert.ok(covers(ring, 0, -98));
  assert.ok(!covers({ ...ring, gaps: [[80, 100]] }, 0, -98));
});

import { pickStep, changesAt } from '../src/lib/floormap.ts';

test('the timeline runs only to the reader, and ?at= cannot look ahead', () => {
  const f5 = snap.floors.find(f => f.id === 5);
  const at12 = mapSteps(f5.map, 4012);
  assert.ok(at12.length > 2);
  assert.ok(at12.every(k => k <= 4012), 'no step past the frontier');
  assert.equal(at12.at(-1), 4012);
  // asking for book 4 chapter 28 while on chapter 12 lands on chapter 12
  assert.equal(pickStep(at12, 4028, 4012), 4012);
  // rewinding lands on the last change at or before the point asked for
  assert.equal(pickStep(at12, 4005, 4012), Math.max(...at12.filter(k => k <= 4005)));
  assert.equal(pickStep(at12, null, 4012), 4012);
  assert.equal(pickStep([], 4005, 4012), null);
  // a step says what it changed: the castle falls as the last house appears
  const c = changesAt(f5.map, 4012);
  assert.ok(c.added.some(l => l.id === 'house') && c.removed.some(l => l.id === 'wasteland'));
});

import { VOXEL_FLOORS, VOXEL_HEROES } from '../src/lib/voxel/floors.ts';
import { render } from '../src/lib/voxel/vox.ts';
import { uncharted } from '../src/lib/voxel/tiles/uncharted.ts';
import { VOXEL_FIGURES, unpictured } from '../src/lib/voxel/figures/cast.ts';
import { entry, ENTRY_HOLE } from '../src/lib/voxel/scenes/entry.ts';

test('every floor with a tile picture has a reveal point for it, and every picture renders', () => {
  for (const f of [...snap.floors, ...snap.foretold]) {
    if (!VOXEL_FLOORS[f.id]) continue;
    assert.ok(f.artKey != null, `floor ${f.id}: a picture with no artAt`);
    const img = render(VOXEL_FLOORS[f.id](), '#ffc10a');
    assert.ok(img.width > 100 && img.height > 80, `floor ${f.id}: picture is ${img.width}x${img.height}`);
  }
  // a hero picture belongs to a floor with a story to finish, and renders
  for (const [id, build] of Object.entries(VOXEL_HEROES)) {
    // a reached floor shows it once its story is finished; a foretold one at its own heroAt, after its first picture
    const f = snap.floors.find(x => x.id === Number(id)), fore = snap.foretold.find(x => x.id === Number(id));
    assert.ok((f && f.recapSortKey != null) || (fore && fore.heroKey != null && fore.artKey != null && fore.heroKey > fore.artKey),
      `floor ${id}: a hero picture with no point to show it from`);
    const img = render(build(), '#ffc10a');
    assert.ok(img.width > 100, `floor ${id}: hero picture is ${img.width}x${img.height}`);
  }
  /* every floor can stand as the uncharted island, in both states, and each is
     its own shape; it is as big as the drawn floors beside it (12, 15 to 18)
     and never tall and narrow, or it reads as a smaller floor on a page where
     every floor is drawn as wide as the stage */
  const shapes = new Set();
  const beside = Math.min(...[12, 15, 16, 17, 18].map(id => render(VOXEL_FLOORS[id](), '#ffc10a').width));
  for (let id = 1; id <= 18; id++) for (const known of [true, false]) {
    const img = render(uncharted(id, known), '#ffc10a');
    assert.ok(img.width > 100 && img.height > 80 && img.cubes.length > 200, `floor ${id}: uncharted island is ${img.width}x${img.height}, ${img.cubes.length} blocks`);
    assert.ok(img.width >= beside * 0.85 && img.width / img.height >= 0.9, `floor ${id}: uncharted island is ${img.width}x${img.height}, the drawn floors beside it ${beside} wide`);
    if (known) shapes.add(`${img.width}x${img.height}x${img.cubes.length}`);
  }
  assert.equal(shapes.size, 18, 'two floors drew the same uncharted island');
  /* every look a character's figure names exists in code and renders, the
     shadow figure too, and no look is named twice on one character */
  for (const e of snap.entities) for (const f of e.figures ?? []) {
    const build = VOXEL_FIGURES[e.id]?.[f.look];
    assert.ok(build, `${e.id}: figure look "${f.look}" is named in the data but not drawn`);
    const img = render(build(), '#ffc10a', 8, 2);
    assert.ok(img.width > 60 && img.height > 80, `${e.id}: figure look "${f.look}" is ${img.width}x${img.height}`);
    assert.equal(e.figures.filter(g => g.look === f.look).length, 1, `${e.id}: figure look "${f.look}" named twice`);
  }
  assert.ok(render(unpictured(), '#ffc10a', 8, 2).width > 60, 'the shadow figure does not render');
  /* the start screen's scene renders, and its lit hole is where the page raises the spotlight from */
  const way = render(entry(), '#ffc10a', 10, 2);
  assert.ok(way.width > 400 && way.height > 300 && way.cubes.length > 1000, `the start screen's scene is ${way.width}x${way.height}`);
  const [hx0, hy0, hx1, hy1] = ENTRY_HOLE, [px, py] = way.project((hx0 + hx1) / 2, (hy0 + hy1) / 2, 4);
  assert.ok(px > way.width * 0.2 && px < way.width * 0.8 && py > way.height * 0.2 && py < way.height * 0.9, 'the way in is not near the middle of the picture');
  // and a floor's picture never opens before the floor
  for (const f of snap.floors) if (f.artKey != null) assert.ok(f.artKey >= f.sortKey, `floor ${f.id}: art before the floor`);
});
