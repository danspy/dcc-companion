import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAt, describeAt, bookOf, END_OF_BOOK, CHAPTER_STRIDE } from './lib/gate.mjs';
import { lint } from './lib/lint.mjs';
import { entityVoice, beatVoice, VOICES } from './lib/voice.mjs';

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
  // Every branch has to read grammatically after "come back when …" and
  // "the next one opens when …", which is the only place it is used.
  assert.equal(describeAt(parseAt('4:12')), 'you reach book 4, chapter 12');
  for (const tag of ['4', '4:12', '4:end']) {
    assert.ok(describeAt(parseAt(tag)).startsWith('you '), `"${tag}" must read as a clause`);
  }
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

test('a beat in an earlier book than its entity fails the build', () => {
  const { errors } = lint({
    books: [{ id: 1, title: 'One', chapters: 47 }, { id: 4, title: 'Four', chapters: 34 }],
    floors: [],
    entities: [{
      id: 'gate', kind: 'item', name: 'Gate', role: 'r', tagline: 't', revealedAt: '4:9',
      beats: [{ kind: 'use', book: 1, at: '1', headline: 'leak', text: '', confidence: 'draft' }],
      relations: [],
    }],
  });
  assert.ok(errors.some(e => e.includes('unlocks in book 1')));
});

test('a book-level beat under a chapter-level entity is floored, not rejected', () => {
  const { errors, warnings } = lint({
    books: [{ id: 4, title: 'Four', chapters: 34 }],
    floors: [],
    entities: [{
      id: 'gate', kind: 'item', name: 'Gate', role: 'r', tagline: 't', revealedAt: '4:9',
      beats: [{ kind: 'use', book: 4, at: '4', headline: 'same book', text: '', confidence: 'draft' }],
      relations: [],
    }],
  });
  assert.equal(errors.length, 0);
  assert.ok(warnings.some(w => w.includes('floored')));
});

test('a chapter tag past the end of its book fails the build', () => {
  const { errors } = lint({
    books: [{ id: 2, title: 'Two', chapters: 25 }],
    floors: [],
    entities: [{
      id: 'x', kind: 'item', name: 'X', role: 'r', tagline: 't', revealedAt: '2:1',
      beats: [{ kind: 'use', book: 2, at: '2:40', headline: 'off the end', text: '', confidence: 'draft' }],
      relations: [],
    }],
  });
  assert.ok(errors.some(e => e.includes('but book 2 has 25')));
});

/* frontierOf lives in src/lib/progress.ts (TypeScript, imported by Astro).
   Mirror its contract here so the semantics are pinned by a test either way. */
const frontierOf = (pos, chapters) => {
  if (!pos.book) return 0;
  const asked = Math.max(0, pos.chapter | 0);
  const chapter =
    asked === 0 ? END_OF_BOOK
    : chapters && asked >= chapters ? END_OF_BOOK
    : asked;
  return pos.book * CHAPTER_STRIDE + chapter;
};

test('no chapter given means the book is finished, not just started', () => {
  // The opening default — book 1, no chapter — must unseal all of book 1.
  const f = frontierOf({ book: 1, chapter: 0 }, 47);
  assert.ok(f >= parseAt('1:47'), 'should reach the last chapter of book 1');
  assert.ok(f >= parseAt('1:end'), 'should satisfy an end-of-book tag');
  assert.ok(f < parseAt('2'), 'must not reach book 2');
});

test('naming a chapter seals what comes after it', () => {
  const f = frontierOf({ book: 1, chapter: 7 }, 47);
  assert.ok(f >= parseAt('1:7'));
  assert.ok(f < parseAt('1:19'), 'chapter 19 content stays sealed at chapter 7');
  assert.ok(f < parseAt('1:end'));
});

test('the last chapter counts as finished', () => {
  assert.equal(frontierOf({ book: 2, chapter: 25 }, 25), frontierOf({ book: 2, chapter: 0 }, 25));
});

test("a floor's recap may not unseal before the floor is reached", () => {
  const { errors } = lint({
    books: [{ id: 7, title: 'Seven', chapters: 87 }],
    floors: [{ id: 9, revealedAt: '7:1', recapAt: '7:1', premise: 'p' },
             { id: 10, revealedAt: '8:1', recapAt: '7:end', premise: 'p' }],
    entities: [],
  });
  // Reaching a floor and recapping it at the same point is allowed (a floor
  // that resolves immediately); recapping it *before* arrival is not.
  assert.ok(errors.some(e => e.includes('before the floor itself')));
  assert.equal(errors.filter(e => e.includes('floor 9: recap')).length, 0);
});

test('a floor with no premise fails the build', () => {
  const { errors } = lint({
    books: [{ id: 7, title: 'Seven', chapters: 87 }],
    floors: [{ id: 9, revealedAt: '7:1', recapAt: '7:end' }],
    entities: [],
  });
  assert.ok(errors.some(e => e.includes('no premise')));
});

test('an unset position reveals nothing at all', () => {
  const f = frontierOf({ book: 0, chapter: 0 }, null);
  assert.equal(f, 0);
  // Every reveal tag in the data is at least 1:1, so none of them can pass.
  assert.ok(f < parseAt('1:1'), 'must not reach even the first chapter');
  assert.ok(f < parseAt('1'), 'must not reach a book-level tag');
});

test('choosing book 1 is what unseals book 1', () => {
  assert.ok(frontierOf({ book: 1, chapter: 0 }, 47) >= parseAt('1:end'));
  assert.ok(frontierOf({ book: 0, chapter: 0 }, 47) < parseAt('1:2'));
});

test('a character speaks for itself once there is a voice sheet; nothing else does', () => {
  const carl = { id: 'carl', kind: 'character', voiceNote: 'deadpan' };
  const unwritten = { id: 'zev', kind: 'character' };
  const dossier = { id: 'quasar', kind: 'character', voice: 'system' };
  const gate = { id: 'gate', kind: 'item' };
  assert.equal(entityVoice(carl), 'self');
  assert.equal(entityVoice(unwritten), 'narrator');
  assert.equal(entityVoice(dossier), 'system');
  assert.equal(entityVoice(gate), 'narrator');
  assert.deepEqual([...VOICES].sort(), ['narrator', 'self', 'system']);
});

test('a fate is reported by the dungeon, everything else follows the entity', () => {
  const carl = { id: 'carl', kind: 'character', voiceNote: 'deadpan' };
  const unwritten = { id: 'zev', kind: 'character' };
  const gate = { id: 'gate', kind: 'item' };
  assert.equal(beatVoice(carl, { kind: 'arc' }), 'self');
  assert.equal(beatVoice(carl, { kind: 'fate' }), 'system');
  assert.equal(beatVoice(carl, { kind: 'arc', voice: 'narrator' }), 'narrator');
  // Until someone has written how a character speaks, the narrator keeps the
  // whole page, fate included: a page should not change register halfway.
  assert.equal(beatVoice(unwritten, { kind: 'arc' }), 'narrator');
  assert.equal(beatVoice(unwritten, { kind: 'fate' }), 'narrator');
  assert.equal(beatVoice(gate, { kind: 'use' }), 'narrator');
  assert.equal(beatVoice(gate, { kind: 'fate' }), 'narrator');
});

const one = { id: 1, title: 'One', chapters: 47 };
const mk = (over) => ({ id: 'x', kind: 'item', name: 'Thing', role: 'r', tagline: 't', revealedAt: '1:5', beats: [], relations: [], ...over });

test('only a character may speak for itself', () => {
  const { errors } = lint({ books: [one], floors: [], entities: [
    mk({ voice: 'self' }),
    mk({ id: 'y', beats: [{ kind: 'use', book: 1, at: '1:5', voice: 'self', headline: 'h', text: '' }] }),
  ] });
  assert.equal(errors.filter(e => e.includes('only a character')).length, 2);
});

test("a fate in the character's own voice is an error", () => {
  const { errors } = lint({ books: [one], floors: [], entities: [
    mk({ kind: 'character', voiceNote: 'n', beats: [
      { kind: 'fate', book: 1, at: '1:20', voice: 'self', headline: 'h', text: '' },
      { kind: 'fate', book: 1, at: '1:21', headline: 'default is fine', text: '' },
    ] }),
  ] });
  assert.equal(errors.filter(e => e.includes('a fate')).length, 1);
});

test('an unknown voice is an error at either level', () => {
  const { errors } = lint({ books: [one], floors: [], entities: [
    mk({ kind: 'character', voice: 'shouting', voiceNote: 'n' }),
    mk({ id: 'y', kind: 'character', voice: 'narrator', voiceNote: 'n' }),
    mk({ id: 'z', beats: [{ kind: 'use', book: 1, at: '1:5', voice: 'loud', headline: 'h', text: '' }] }),
  ] });
  assert.equal(errors.filter(e => e.includes('voice')).length, 3);
});

test('a speaking character without a voice note is a warning', () => {
  const { errors, warnings } = lint({ books: [one], floors: [], entities: [
    mk({ kind: 'character' }),
    mk({ id: 'y', kind: 'character', voice: 'system' }),
  ] });
  assert.equal(errors.length, 0);
  assert.equal(warnings.filter(w => w.includes('voice note')).length, 1);
});

test('a quoted description may say "later"; a summary may not; neither may name the unmet', () => {
  const { errors } = lint({ books: [one], floors: [], entities: [
    mk({ description: 'Feed it to your pet. Later you will wish you had not.' }),
    mk({ id: 'y', tagline: 'Later it all goes wrong.' }),
    mk({ id: 'z', description: 'Katia will love this.' }),
    mk({ id: 'katia', kind: 'character', name: 'Katia', revealedAt: '1:30', voiceNote: 'n' }),
  ] });
  assert.equal(errors.filter(e => e.includes('entity x')).length, 0);
  assert.ok(errors.some(e => e.includes('entity y') && /later/i.test(e)));
  assert.ok(errors.some(e => e.includes('entity z') && e.includes('Katia')));
});

test('descriptions are a list in reading order, floored to the entity', () => {
  const { errors, warnings } = lint({ books: [one], floors: [], entities: [
    mk({ description: [{ at: '1:5', text: 'a' }, { at: '1:4', text: 'b' }] }),
    mk({ id: 'y', description: [{ at: '1:2', text: 'early' }] }),
  ] });
  assert.ok(errors.some(e => e.includes('entity x description 2')));
  assert.ok(warnings.some(w => w.includes('y: description 1')));
});

test("a floor's name may not appear before the floor does", () => {
  const base = {
    books: [{ id: 4, title: 'Four', chapters: 34 }, { id: 5, title: 'Five', chapters: 77 }],
    floors: [{ id: 7, name: 'The Great Race', revealedAt: '5:end', recapAt: '5:end', premise: 'p' }],
  };
  const mkE = (text) => ([{
    id: 'carl', kind: 'character', name: 'Carl', role: 'r', tagline: 't', revealedAt: '4',
    voiceNote: 'n', relations: [],
    beats: [{ kind: 'arc', book: 4, at: '4', headline: 'h', text, confidence: 'draft' }],
  }]);
  const leak = lint({ ...base, entities: mkE('They are already talking about the Great Race.') });
  assert.ok(leak.errors.some(e => e.includes('The Great Race')), 'a floor named early must fail');
  const fine = lint({ ...base, entities: mkE('They are already talking about what comes next.') });
  assert.equal(fine.errors.length, 0);
});

test('an alias is a gated name, unless it is a common noun phrase', () => {
  const base = { books: [{ id: 1, title: 'One', chapters: 47 }, { id: 2, title: 'Two', chapters: 25 }], floors: [] };
  const other = {
    id: 'katia', kind: 'character', name: 'Katia Grim', aka: ['Katia'], role: 'r',
    tagline: 't', revealedAt: '2:21', voiceNote: 'n', beats: [], relations: [],
  };
  const show = {
    id: 'dcw', kind: 'mechanic', name: 'Dungeon Crawler World', aka: ['the show'],
    role: 'r', tagline: 't', revealedAt: '1:4', beats: [], relations: [],
  };
  const namer = (text) => ({
    id: 'daughters', kind: 'faction', name: 'The Daughters', role: 'r',
    tagline: text, revealedAt: '1:20', beats: [], relations: [],
  });
  const leak = lint({ ...base, entities: [other, show, namer('The one Katia came in with.')] });
  assert.ok(leak.errors.some(e => e.includes('"Katia"')), 'a capitalised alias must be gated');

  // "the show" is lower case: a phrase, not a name. Gating it would flag every
  // honest sentence about the broadcast.
  const fine = lint({ ...base, entities: [other, show, namer('They are on the show every week.')] });
  assert.equal(fine.errors.length, 0);
});
