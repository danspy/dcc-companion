import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { exportForKoreader, ALTERNATE_EDITIONS } from './lib/koreader-export.mjs';
import { parseAt } from './lib/gate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = JSON.parse(readFileSync(join(root, 'data/content.snapshot.json'), 'utf8'));

const TAG = /^\d+(:(\d+|end))?$/;

test('every key in the export is a resolved integer, never a tag string', () => {
  const { index, entities } = exportForKoreader(snapshot);
  const seen = [];
  const walk = (v, path) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    else if (typeof v === 'string' && TAG.test(v) && !/\.(name|text|title|headline|role|source)$/.test(path)) seen.push(`${path}=${v}`);
  };
  walk(index, 'index');
  for (const [id, e] of entities) walk(e, `entities/${id}`);
  assert.deepEqual(seen, []);
  for (const e of index.entries) {
    assert.ok(Number.isInteger(e.revealedAt), `${e.id} revealedAt`);
    for (const a of e.aka) assert.ok(Number.isInteger(a.key), `${e.id} alias ${a.name}`);
    for (const t of e.taglines) assert.ok(Number.isInteger(t.key), `${e.id} tagline`);
  }
});

test('every index entry has an entity file and nothing else does', () => {
  const { index, entities } = exportForKoreader(snapshot);
  const ids = new Set(index.entries.map(e => e.id));
  assert.equal(ids.size, index.entries.length, 'ids are unique');
  for (const id of ids) assert.ok(entities.has(id), `${id} has a file`);
  for (const id of entities.keys()) assert.ok(ids.has(id), `${id} is in the index`);
});

test('an entity carries its beats in gate order, with stamp and key both present', () => {
  const { entities } = exportForKoreader(snapshot);
  const carl = entities.get('carl');
  assert.ok(carl.beats.length > 100);
  let last = 0;
  for (const b of carl.beats) {
    assert.ok(b.key >= last, 'sorted by key');
    last = b.key;
    assert.ok(Number.isInteger(b.book) && Number.isInteger(b.chapter));
    assert.equal(typeof b.headline, 'string');
    assert.equal(typeof b.text, 'string');
    assert.ok(['self', 'system', 'narrator'].includes(b.voice));
    assert.equal(b.kind, undefined, 'the kind label is a spoiler and is never exported');
  }
  // A beat's own chapter and its key can differ (inheritance pushes the key later), but
  // the key is never earlier than the chapter it is stamped with.
  for (const b of carl.beats) assert.ok(b.key >= b.book * 1000 + b.chapter);
});

test('a timed alias keeps its own key; a plain one takes the entity reveal', () => {
  const { index } = exportForKoreader(snapshot);
  const wyrm = index.entries.find(e => e.id === 'night-wyrm' || e.aka.some(a => a.name === 'Hamed'));
  assert.ok(wyrm, 'the Night Wyrm is exported');
  const hamed = wyrm.aka.find(a => a.name === 'Hamed');
  assert.equal(hamed.key, parseAt('6:32'));
  const plain = wyrm.aka.find(a => a.name !== 'Hamed');
  if (plain) assert.equal(plain.key, wyrm.revealedAt);
});

test('floors are entries whose name opens at nameAt and whose premise waits for arrival', () => {
  const { index, entities } = exportForKoreader(snapshot);
  const overCity = index.entries.find(e => e.kind === 'floor' && e.name === 'The Over City');
  assert.ok(overCity);
  assert.equal(overCity.revealedAt, parseAt('1:44'), 'the name is printed at 1:44');
  assert.equal(overCity.taglines.length, 1);
  assert.equal(overCity.taglines[0].key, parseAt('2:2'), 'the premise opens on arrival');
  const file = entities.get(overCity.id);
  assert.ok(file.beats.length >= 4, 'the recap parts are its beats');
  assert.ok(file.beats.every(b => b.key >= parseAt('2:2')));
  assert.equal(file.beats.at(-1).key, parseAt('2:end'));
  const hunting = index.entries.find(e => e.kind === 'floor' && e.name === 'The Hunting Grounds');
  assert.equal(hunting.revealedAt, parseAt('2:3'));
  const first = index.entries.find(e => e.kind === 'floor' && e.id === 'floor-1');
  assert.equal(first.revealedAt, parseAt('1:2'), 'no nameAt means the name arrives with the floor');
});

test('books carry their chapter count and the alternative edition for book 5', () => {
  const { index } = exportForKoreader(snapshot);
  assert.equal(index.books.length, 8);
  const five = index.books.find(b => b.id === 5);
  assert.equal(five.chapters, 75);
  assert.deepEqual(five.alternates, [{ chapters: 77, map: ALTERNATE_EDITIONS[5].map }]);
  assert.equal(five.alternates[0].map[77], 75);
  const one = index.books.find(b => b.id === 1);
  assert.deepEqual(one.alternates, []);
  assert.equal(one.title, 'Dungeon Crawler Carl');
});

test('a tagline step carries the stamp of its own point', () => {
  const { index } = exportForKoreader(snapshot);
  const lucia = index.entries.find(e => e.id === 'lucia-mar');
  assert.ok(lucia.taglines.length > 1);
  for (const t of lucia.taglines) {
    assert.equal(t.key, t.book * 1000 + t.chapter);
    assert.ok(t.text.length > 0);
  }
});
