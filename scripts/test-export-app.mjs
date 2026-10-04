import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { exportForApp, packForApp, APP_SCHEMA } from '../src/lib/app-export.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = JSON.parse(readFileSync(join(root, 'data/content.snapshot.json'), 'utf8'));
const content = exportForApp(snapshot);

const TAG = /^\d+(:(\d+|end))?$/;
/* Fields that hold prose, a name or an id, where "5" or "1:2" would be text and not a gate. */
const TEXT = /\.(name|text|title|headline|role|note|premise|previously|blurb|forWhat|box|reward|span|stamp|source|bookSpan|id|from|to|entity|kind|voice|tier|accent|ink)$/;

test('no reveal tag survives into the app export', () => {
  const seen = [];
  const walk = (v, path) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    else if (typeof v === 'string' && TAG.test(v) && !TEXT.test(path.replace(/\[\d+\]$/, ''))) seen.push(`${path}=${v}`);
  };
  walk(content, 'content');
  assert.deepEqual(seen, []);
  assert.equal(content.schema, APP_SCHEMA);
});

test('every gate value is an integer', () => {
  const int = (v, what) => assert.ok(Number.isInteger(v), `${what} is ${JSON.stringify(v)}`);
  for (const e of content.entities) {
    int(e.key, `${e.id} key`);
    for (const a of e.aka) int(a.key, `${e.id} alias ${a.name}`);
    for (const t of e.taglines) int(t.key, `${e.id} tagline`);
    for (const d of e.descriptions) int(d.key, `${e.id} description`);
  }
  for (const b of content.beats) int(b.key, `beat ${b.id}`);
  for (const r of content.relations) int(r.key, `relation ${r.from}->${r.to}`);
  for (const f of content.floors) {
    int(f.nameKey, `floor ${f.id} nameKey`);
    int(f.key, `floor ${f.id} key`);
    for (const p of f.parts) int(p.key, `floor ${f.id} part`);
  }
  for (const a of content.awards) { int(a.key, `${a.id} key`); int(a.at, `${a.id} at`); }
});

test('beats are numbered in gate order and carry no kind', () => {
  assert.equal(content.beats.length, snapshot.beats.length);
  let last = 0;
  content.beats.forEach((b, i) => {
    assert.equal(b.id, i + 1);
    assert.ok(b.key >= last, `beat ${b.id} is in gate order`);
    last = b.key;
    assert.equal('kind' in b, false, 'the kind label is a spoiler and is never exported');
    assert.equal(typeof b.use, 'boolean');
    assert.ok(Number.isInteger(b.book) && Number.isInteger(b.chapter));
    assert.ok(['self', 'system', 'narrator'].includes(b.voice));
  });
  assert.equal(content.beats.filter(b => b.use).length, snapshot.beats.filter(b => b.kind === 'use').length);
});

test('the reached beats are always a prefix of the list', () => {
  for (const frontier of [1022, 2999, 5040, 8999]) {
    const ids = content.beats.filter(b => b.key <= frontier).map(b => b.id);
    assert.deepEqual(ids, ids.map((_, i) => i + 1), `frontier ${frontier}`);
  }
});

test("a floor's name can open before the floor does", () => {
  assert.equal(content.floors.length, 11);
  const over = content.floors.find(f => f.name === 'The Over City');
  assert.equal(over.nameKey, 1044, 'the name is printed at 1:44');
  assert.equal(over.key, 2002, 'the premise opens on arrival');
  assert.equal(over.parts.at(-1).key, 2999);
  assert.ok(over.parts.every(p => p.key >= over.key && p.span.startsWith('Book ') && p.text));
  const first = content.floors.find(f => f.id === 1);
  assert.equal(first.nameKey, first.key, 'no nameAt means the name arrives with the floor');
  for (const f of content.floors) {
    assert.ok(f.nameKey <= f.key, `floor ${f.id}: a name never opens after its floor`);
    assert.ok(f.premise.length > 0, `floor ${f.id} has a premise`);
  }
});

test('a timed alias keeps its own key; a plain one takes the entity reveal', () => {
  const wyrm = content.entities.find(e => e.aka.some(a => a.name === 'Hamed'));
  assert.ok(wyrm, 'the Night Wyrm is exported');
  assert.equal(wyrm.aka.find(a => a.name === 'Hamed').key, 6032);
  const donut = content.entities.find(e => e.id === 'princess-donut');
  assert.ok(donut.aka.every(a => a.key === donut.key));
});

test('an award may be shown no earlier than it happened', () => {
  assert.equal(content.awards.length, snapshot.achievements.length);
  const tiers = [null, 'Bronze', 'Silver', 'Gold', 'Platinum', 'Legendary', 'Celestial'];
  let last = 0;
  for (const a of content.awards) {
    assert.ok(a.key >= a.at, `${a.id}: key ${a.key} before at ${a.at}`);
    assert.ok(a.key >= last, 'awards are in gate order');
    last = a.key;
    assert.ok(tiers.includes(a.tier), `${a.id} tier ${a.tier}`);
    assert.ok(Array.isArray(a.recipients));
  }
});

test('the version is the hash of the bytes and does not depend on the clock', () => {
  const one = packForApp(snapshot, { now: new Date('2026-01-01T00:00:00Z') });
  const two = packForApp(snapshot, { now: new Date('2026-06-01T00:00:00Z') });
  assert.equal(one.json, two.json);
  assert.equal(one.manifest.version, two.manifest.version);
  assert.notEqual(one.manifest.generatedAt, two.manifest.generatedAt);
  assert.equal(one.manifest.version, createHash('sha256').update(one.json).digest('hex'));
  assert.equal(one.manifest.bytes, Buffer.byteLength(one.json));
  assert.equal(one.manifest.schema, APP_SCHEMA);
  assert.equal(one.manifest.counts.entities, snapshot.entities.length);
  assert.equal(one.manifest.counts.beats, snapshot.beats.length);
});

/* ---- The fixtures: what the site's own gate reveals, for the Swift gate to reproduce ---- */
const { fixturesFor, POSITIONS, QUERIES } = await import('./lib/app-fixtures.mjs');
const fixtures = fixturesFor(snapshot, content, 'test');
const at = label => fixtures.positions.find(p => p.label === label);
const find = (label, q) => fixtures.finds.find(f => f.label === label && f.q === q);

test('there is a fixture for every position and every query', () => {
  assert.deepEqual(fixtures.positions.map(p => p.label), POSITIONS.map(p => p.label));
  assert.equal(fixtures.positions.length, 11);
  assert.equal(fixtures.finds.length, QUERIES.length);
  assert.equal(fixtures.version, 'test');
});

test('a reader who has said nothing is shown nothing', () => {
  const none = at('none');
  assert.equal(none.frontier, 0);
  assert.deepEqual(none.entries, []);
  assert.equal(none.beats, 0);
  assert.deepEqual(none.awards.reached, []);
  assert.equal(none.awards.sealed, content.awards.length);
  assert.equal(none.opening.mode, 'welcome');
  assert.ok(none.floors.every(f => !f.open && !f.nameOpen && f.parts === 0));
  assert.deepEqual(find('none', 'carl').hits, []);
});

test('a position meets what it has reached and nothing later', () => {
  const p = at('1:22');
  assert.equal(p.frontier, 1022);
  assert.ok(p.entries.includes('carl'));
  const wyrm = content.entities.find(e => e.aka.some(a => a.name === 'Hamed'));
  assert.ok(!p.entries.includes(wyrm.id));
  assert.ok(p.beats > 0 && p.beats < content.beats.length);
  assert.equal(p.opening.mode, 'previously');
  assert.equal(p.pages.carl.story.shown + p.pages.carl.story.sealed,
    content.beats.filter(b => b.entity === 'carl').length);
});

test('a last chapter is the end of its book, and no chapter means finished', () => {
  assert.equal(at('5:75').frontier, 5999);
  assert.equal(at('1:finished').frontier, 1999);
  assert.equal(at('8:finished').frontier, 8999);
});

test('everything shown reveals every entity, beat and award', () => {
  const all = at('everything');
  assert.equal(all.entries.length, content.entities.length);
  assert.equal(all.beats, content.beats.length);
  assert.equal(all.awards.reached.length, content.awards.length);
  assert.equal(all.awards.sealed, 0);
  assert.equal(all.awards.nextKey, null);
  assert.ok(all.floors.every(f => f.open && f.nameOpen && f.sealedParts === 0));
});

test('an alias with its own reveal point is found only once it is reached', () => {
  assert.deepEqual(find('3:19', 'hamed').hits, []);
  const hits = find('6:32', 'hamed').hits;
  assert.ok(hits.length > 0);
  assert.match(hits[0].target, /^entry:/);
  assert.ok(find('6:32', 'bride').hits.some(h => h.tier === 'name' || h.tier === 'story'));
});
