import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAt, describeAt, bookOf, END_OF_BOOK } from './lib/gate.mjs';
import { lint } from './lib/lint.mjs';

test('reveal tags parse to a total order', () => {
  assert.equal(parseAt('4'), 4000);
  assert.equal(parseAt('4:12'), 4012);
  assert.equal(parseAt('4:end'), 4000 + END_OF_BOOK);
  assert.ok(parseAt('4') < parseAt('4:12'));
  assert.ok(parseAt('4:12') < parseAt('4:end'));
  assert.ok(parseAt('4:end') < parseAt('5'));
});

test('a book-level tag is chapter zero, so it never hides mid-book content', () => {
  assert.equal(parseAt('7'), parseAt('7:start'));
  assert.ok(parseAt('7') <= parseAt('7:1'));
});

test('describeAt renders the three shapes', () => {
  assert.equal(describeAt(parseAt('4')), 'you reach book 4');
  assert.equal(describeAt(parseAt('4:end')), 'you finish book 4');
  assert.equal(describeAt(parseAt('4:12')), 'book 4, chapter 12');
  assert.equal(bookOf(parseAt('4:12')), 4);
});

test('a beat may not unlock before its own entity', () => {
  const { errors } = lint({
    books: [{ id: 1, title: 'One', chapters: 47 }, { id: 4, title: 'Four', chapters: 50 }],
    floors: [{ id: 5, revealedAt: '4' }],
    entities: [{
      id: 'x', kind: 'item', name: 'X', role: 'r', tagline: 't', revealedAt: '4',
      beats: [{ kind: 'use', book: 1, at: '1', headline: 'leak', text: '', confidence: 'draft' }],
      relations: [],
    }],
  });
  assert.ok(errors.some(e => e.includes('not revealed until')));
});

test('a beat whose declared book disagrees with its tag is an error', () => {
  const { errors } = lint({
    books: [{ id: 4, title: 'Four', chapters: 50 }],
    floors: [],
    entities: [{
      id: 'x', kind: 'item', name: 'X', role: 'r', tagline: 't', revealedAt: '4',
      beats: [{ kind: 'use', book: 5, at: '4', headline: 'mismatch', text: '', confidence: 'draft' }],
      relations: [],
    }],
  });
  assert.ok(errors.some(e => e.includes('resolves to book 4')));
});

test('a relation looser than its endpoints is tightened, with a warning', () => {
  const { errors, warnings } = lint({
    books: [{ id: 2, title: 'Two', chapters: 40 }, { id: 7, title: 'Seven', chapters: 60 }],
    floors: [],
    entities: [
      { id: 'katia', kind: 'character', name: 'Katia', role: 'r', tagline: 't', revealedAt: '2',
        beats: [], relations: [{ to: 'orchid', kind: 'used-by', at: '2' }] },
      { id: 'orchid', kind: 'item', name: 'Orchid', role: 'r', tagline: 't', revealedAt: '7:end',
        beats: [], relations: [] },
    ],
  });
  assert.equal(errors.length, 0);
  assert.ok(warnings.some(w => w.includes('tightened')));
});

test('a relation to a missing entity is an error', () => {
  const { errors } = lint({
    books: [{ id: 1, title: 'One', chapters: 47 }],
    floors: [],
    entities: [{ id: 'a', kind: 'character', name: 'A', role: 'r', tagline: 't', revealedAt: '1',
                 beats: [], relations: [{ to: 'nope', kind: 'ally', at: '1' }] }],
  });
  assert.ok(errors.some(e => e.includes('no such entity')));
});
