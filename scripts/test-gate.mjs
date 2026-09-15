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

/* ---------------------------------------------------------------------------
   Lane selection. Three views draw from `lanesFor`, so the gate has to hold in
   it and not only in the components that call it. `src/lib/timeline.ts` imports
   only pure modules, which is why this can import it directly.
   --------------------------------------------------------------------------- */

const { lanesFor, makeScale, laneY, arcPath } = await import('../src/lib/timeline.ts');

const gateAt = frontier => ({ frontier, spoilers: true, fresh: false });

const cast = [
  { id: 'a', kind: 'character', name: 'A', aka: [], role: 'r', revealedAt: '1:1', taglines: [] },
  { id: 'b', kind: 'character', name: 'B', aka: [], role: 'r', revealedAt: '4:2', taglines: [] },
  { id: 'c', kind: 'item', name: 'C', aka: [], role: 'r', revealedAt: '1:5', taglines: [] },
];
const log = [
  { entityId: 'a', sortKey: 1001, book: 1, floor: 1, headline: 'a1', text: '' },
  { entityId: 'a', sortKey: 6001, book: 6, floor: 8, headline: 'a2', text: '' },
  { entityId: 'b', sortKey: 4002, book: 4, floor: 5, headline: 'b1', text: '' },
  { entityId: 'c', sortKey: 1005, book: 1, floor: 1, headline: 'c1', text: '' },
];

test('a lane never carries an entry past the frontier', () => {
  const { lanes } = lanesFor(cast, log, gateAt(2000), 24);
  const keys = lanes.flatMap(l => l.beats.map(b => b.sortKey));
  assert.ok(keys.every(k => k <= 2000), 'every beat on a lane is one the reader has reached');
  assert.ok(!lanes.some(l => l.entity.id === 'b'), 'an unmet entity gets no lane');
});

test('an entity met but not yet acted on gets no lane, and no count', () => {
  // B is revealed at 4:2 and its only beat is at 4:2, so at 4:1 it is met by
  // neither test — the count must not hint that it is coming.
  const { lanes, met } = lanesFor(cast, log, gateAt(4001), 24);
  assert.equal(met, 2);
  assert.equal(lanes.length, 2);
});

test('lanes settle into kind order, so an item sits below the people', () => {
  const { lanes } = lanesFor(cast, log, gateAt(9000), 24);
  assert.deepEqual(lanes.map(l => l.entity.id), ['a', 'b', 'c']);
});

test('the lane limit caps what is drawn without changing what was met', () => {
  const { lanes, met } = lanesFor(cast, log, gateAt(9000), 1);
  assert.equal(lanes.length, 1);
  assert.equal(met, 3, 'met counts what the reader has, not what fits on screen');
  assert.equal(lanes[0].entity.id, 'a', 'the cap keeps the entity with the most reached');
});

test('the x scale gives a book the width of its own chapter count', () => {
  const scale = makeScale([
    { id: 1, chapters: 47, accent: '#fff', ink: '#000', title: 'One' },
    { id: 2, chapters: 25, accent: '#fff', ink: '#000', title: 'Two' },
  ]);
  assert.equal(scale.chapters, 72);
  assert.equal(scale.offsetOf(1000 + 999), 47, 'end of book 1 is its last chapter');
  assert.equal(scale.offsetOf(2010), 57, 'book 2 chapter 10 sits after all of book 1');
  assert.equal(scale.offsetOf(9000), 72, 'spoilers off is the whole width, not an overflow');
  assert.equal(scale.offsetOf(0), 0, 'no position recorded draws nothing');
});

test('an arc is drawn between the two lane positions it names', () => {
  const d = arcPath(100, laneY(0), laneY(2));
  assert.ok(d.startsWith(`M 100 ${laneY(0)}`), 'it starts on the first lane');
  assert.ok(d.endsWith(`100 ${laneY(2)}`), 'and ends on the second');
});

/* ---------------------------------------------------------------------------
   The forward-name screen.

   Every other surface in this app renders text a person wrote and a lint read.
   The achievement page renders a sentence composed at request time, so the
   screen in src/lib/leak.ts is the only thing standing between a generated
   citation and a name the reader has not earned. Tested directly, the same way
   timeline.ts is: the rules are drawn from bugs this project already shipped,
   and a regression in any of them is silent.
   --------------------------------------------------------------------------- */
const { buildScreen, findLeaks } = await import('../src/lib/leak.ts');
const achievement = await import('../src/lib/achievement.ts');
const { pickTier, TIERS } = achievement;

const CAST = [
  { id: 'carl', name: 'Carl', aka: [], revealedAt: '1:1' },
  { id: 'mordecai', name: 'Mordecai', aka: [], revealedAt: '1:2' },
  { id: 'signet', name: 'Signet', aka: [], revealedAt: '2:6' },
  { id: 'milk', name: 'Milk', aka: [], revealedAt: '3:27' },
  { id: 'katia', name: 'Katia', aka: ['Katia'], revealedAt: '2:21' },
  { id: 'dcw', name: 'Dungeon Crawler World', aka: ['the show'], revealedAt: '1:4' },
];
const FLOORS = [
  { id: 1, name: 'The Entrance', revealedAt: '1:2' },
  { id: 7, name: 'The Great Race', revealedAt: '5:end' },
];
const screenAt = frontier => buildScreen(CAST, FLOORS, frontier);
const leaksAt = (text, frontier, supplied = '') =>
  findLeaks(text, screenAt(frontier), supplied).map(h => h.name);

test('the screen holds back what the reader has not reached', () => {
  const at = parseAt('2:3');
  assert.deepEqual(leaksAt('Mordecai would decline it.', at), [],
    'someone met in book 1 is fair game in book 2');
  assert.deepEqual(leaksAt('Signet was unimpressed.', at), ['Signet'],
    'someone three chapters ahead is not');
  assert.deepEqual(leaksAt('Signet was unimpressed.', parseAt('2:6')), [],
    'and is fair game on the exact chapter they are met');
});

test('spoilers off screens nothing, because nothing is sealed', () => {
  assert.equal(screenAt(parseAt('9')).length, 0);
});

test('a floor name is screened exactly like a person', () => {
  // The leak that shipped into the Position page was a floor name, and the
  // in-character register makes this likelier, not less: a speaker names the
  // ground under them.
  assert.deepEqual(leaksAt('You have won the Great Race.', parseAt('4')), ['The Great Race'],
    'case-insensitively, or "the Great Race" walks past "The Great Race"');
  assert.deepEqual(leaksAt('You have won the Great Race.', parseAt('6')), []);
});

test('a single-word name counts only when it is capitalised', () => {
  // Milk, Rust, Ruby, Ping, Feral and Justice are all entity names and all
  // ordinary English words. "burnt the milk" is not a reveal of Milk (3:27).
  const at = parseAt('1:5');
  assert.deepEqual(leaksAt('You burnt the milk.', at), [], 'a common noun is not a name');
  assert.deepEqual(leaksAt('Milk disapproves.', at), ['Milk'], 'capitalised, it is');
});

test('a lower-case alias is a phrase, not a name', () => {
  // Screening "the show" would reject every honest sentence about the
  // broadcast; the build-time lint draws the line in the same place.
  assert.deepEqual(leaksAt('The audience loves the show.', parseAt('1:1')), [],
    'the lower-case alias is a common noun phrase and is left alone');
  assert.deepEqual(leaksAt('Welcome to Dungeon Crawler World.', parseAt('1:1')),
    ['Dungeon Crawler World'],
    'the name itself is still screened until the text reaches it');
  // A capitalised alias is a different matter: "Katia" sat in a tagline three
  // chapters before the reader met her.
  assert.deepEqual(leaksAt('Katia is filing a complaint.', parseAt('2:10')), ['Katia', 'Katia'],
    'name and capitalised alias both catch it');
});

test('the premise is never a leak, even with no position at all', () => {
  // A reader who has told us nothing has still read the front page.
  assert.deepEqual(leaksAt('Carl is not available for comment.', 0), []);
});

test('a name the reader typed themselves is not a reveal', () => {
  // Otherwise anyone who writes "I drank milk" or "I met Signet" can never be
  // granted anything: every candidate echoes their own words and is rejected.
  const at = parseAt('1:5');
  assert.deepEqual(leaksAt('Signet declines to comment.', at), ['Signet']);
  assert.deepEqual(leaksAt('Signet declines to comment.', at, 'I arm-wrestled Signet'), []);
});

test('a short name is left alone, or it matches inside ordinary words', () => {
  // "Zev" is three letters; screening it rejects every citation containing it
  // as a fragment. check-pages.mjs draws the line at four for the same reason.
  const short = buildScreen([{ id: 'zev', name: 'Zev', aka: [], revealedAt: '1:35' }], [], 0);
  assert.equal(short.length, 0);
});

test('the house sets the odds, and Celestial is vanishingly rare', () => {
  // The model is told its tier, never asked to pick one: ask a model for a
  // rarity and everything is Legendary by Thursday.
  assert.equal(pickTier(0).name, 'Bronze', 'the bottom of the roll is the common case');
  assert.equal(pickTier(0.9999).name, 'Celestial', 'the very top is the rare one');
  const total = TIERS.reduce((n, t) => n + t.weight, 0);
  const celestial = TIERS.find(t => t.name === 'Celestial');
  assert.ok(celestial.weight / total < 0.005, 'under half a percent, as the books have it');
  for (const t of TIERS) assert.ok(t.accent && t.ink, `${t.name} needs a readable pair`);
});

test('a style blemish is not a leak, and must not cost the reader the award', () => {
  // The two screens run in the same loop and they are not the same severity:
  // a name the reader has not earned can never be shown, but the System
  // talking about its own paperwork is only a flat joke.
  const { narratesItself } = achievement;
  const tic = at => ({ title: 'X', citation: at, reward: 'r', tier: TIERS[0] });
  assert.ok(narratesItself(tic('The dungeon logs this as a minor infraction.')));
  assert.ok(narratesItself(tic('Your audacity is noted.')));
  assert.ok(narratesItself(tic('The System records the attempt.')));
  assert.ok(!narratesItself(tic('You are predictably mediocre, and the sponsors yawned.')),
    'an ordinary verdict is left alone');
});

/* The screens above are tested in isolation, which proves they work and not
   that anything calls them. That is the `npm run smoke` lesson in miniature —
   a component that was never wired in type-checks perfectly. So: stub the
   model, hand the loop a reply that names something sealed, and assert the
   reader never sees it. No network, no key, deterministic. */
test('a candidate naming something sealed never reaches the reader', async () => {
  const realFetch = globalThis.fetch;
  const realKey = process.env.OLLAMA_API_KEY;
  process.env.OLLAMA_API_KEY = 'test-key';

  const reply = grant => ({
    ok: true,
    json: async () => ({ message: { content: JSON.stringify(grant) } }),
  });
  const cast = [{ id: 'signet', name: 'Signet', aka: [], revealedAt: '2:6' }];
  const call = () => achievement.grantAchievement({
    deed: 'burned the dinner', lore: [], entities: cast, floors: [],
    frontier: parseAt('1:5'), tier: TIERS[0], attempts: 2,
  });

  try {
    globalThis.fetch = async () => reply({
      title: 'Kitchen Failure',
      citation: 'Signet would not have burned it.',
      reward: '-1 Cooking',
    });
    await assert.rejects(call(), 'a sealed name is refused rather than shown');

    globalThis.fetch = async () => reply({
      title: 'Kitchen Failure',
      citation: 'You burned it, and the sponsors saw.',
      reward: '-1 Cooking',
    });
    const { grant } = await call();
    assert.equal(grant.citation, 'You burned it, and the sponsors saw.',
      'and the same loop passes a clean one straight through');
    assert.equal(grant.tier.name, 'Bronze', 'the house keeps the tier it drew');
  } finally {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env.OLLAMA_API_KEY;
    else process.env.OLLAMA_API_KEY = realKey;
  }
});

test('the foot thing fires on feet and stays out of everything else', () => {
  const { mentionsFeet, buildMessages, TIERS: T } = achievement;
  for (const yes of ['walked to the shop barefoot', 'bought new SHOES', 'clipped my toenails',
                     'darned a sock', 'got a blister on my heel']) {
    assert.ok(mentionsFeet(yes), `"${yes}" should give the System an excuse`);
  }
  // Word boundaries, or the gag fires on half the language.
  for (const no of ['watched the football', 'reviewed the footage', 'changed the wheels',
                    'rebooted the router', 'ate a footlong']) {
    assert.ok(!mentionsFeet(no), `"${no}" must not trigger it`);
  }
  // Told to be interested at all times, it works feet into reports about
  // spreadsheets. The instruction and its example are added per request.
  const plain = JSON.stringify(buildMessages('filed my taxes', [], T[0]));
  const footy = JSON.stringify(buildMessages('filed my taxes barefoot', [], T[0]));
  // A single-line phrase: JSON.stringify escapes the newlines inside FOOT_NOTE,
  // so a pattern spanning one would never match the serialised messages.
  assert.ok(!/thing about feet/i.test(plain), 'absent when feet are not mentioned');
  assert.ok(/thing about feet/i.test(footy), 'present when they are');
  assert.ok(!/Unshod Commute/.test(plain) && /Unshod Commute/.test(footy),
    'and the worked example rides with it');
});

test('an excuse taken is a lapse; an idiom echoed back is not', () => {
  const { showsTheLapse } = achievement;
  // The two that shipped flat: the crawler's own idiom repeated, and a foot
  // word used as an ordinary insult. Neither is the System losing composure.
  assert.ok(!showsTheLapse('You navigated a public thoroughfare on foot to acquire bread.'),
    'the idiom is stripped before looking, so it cannot pass on its own');
  assert.ok(!showsTheLapse('It is a miracle you have not yet tripped over your own feet.'),
    'a foot word with nobody breaking in is not a lapse');
  // And the one that worked.
  assert.ok(showsTheLapse('Mundane. Though the way your toes curled was — ahem. Anyway.'));
  assert.ok(showsTheLapse('On foot, you say. I have the gait analysis up and the heel strike is lovely.'),
    'the idiom is stripped, but the real comment beside it still counts');
});

test('every suggestion is filable, and some of them bait the System', async () => {
  const { SUGGESTIONS } = await import('../src/lib/deeds.ts');
  const { MAX_DEED, mentionsFeet } = achievement;
  assert.ok(SUGGESTIONS.length >= 20, 'enough that the button does not repeat itself');
  assert.equal(new Set(SUGGESTIONS).size, SUGGESTIONS.length, 'no duplicates');
  for (const d of SUGGESTIONS) {
    assert.ok(d.length <= MAX_DEED, `"${d}" would be truncated on the way in`);
    assert.equal(d, d.trim(), `"${d}" has stray whitespace`);
    assert.ok(!/[A-Z]/.test(d[0]), `"${d}" should read as something the reader typed`);
  }
  // The running gag should turn up on its own for someone who would never
  // think to type "barefoot", without the button being mostly about feet.
  const feet = SUGGESTIONS.filter(mentionsFeet).length;
  assert.ok(feet >= 3, 'some suggestions reach for the gag');
  assert.ok(feet / SUGGESTIONS.length < 0.3, 'but the button is not a foot button');
});

test('the citation does not spend a sentence on the box beside it', () => {
  const { namesTheBox } = achievement;
  const cite = t => ({ title: 'X', citation: t, reward: 'r', tier: TIERS[0] });
  assert.ok(namesTheBox(cite('This is a Gold Box level of insignificance.')));
  assert.ok(namesTheBox(cite('You have earned a legendary box.')), 'case does not save it');
  // The bare colour is ordinary English and must stay available.
  assert.ok(!namesTheBox(cite('There is no silver lining here, crawler.')));
  assert.ok(!namesTheBox(cite('A gold star for effort. The effort was poor.')));
});

test('an award waits for everything it names, and is never listed early', () => {
  // The books' own awards are quotations, so the phrase heuristic is off — but
  // a quotation can still name somebody the reader has not met, and the award's
  // NAME is a spoiler by itself: "Apex Predator" says how a floor ends.
  const base = {
    books: [{ id: 1, title: 'One', chapters: 47 }, { id: 5, title: 'Five', chapters: 60 }],
    floors: [{ id: 1, revealedAt: '1:2', recapAt: '1:29', premise: 'p' }],
    entities: [{
      id: 'guilds', kind: 'mechanic', name: 'The Guild System', aka: ['Guilds'],
      role: 'r', tagline: 't', revealedAt: '5:8', beats: [], relations: [],
    }],
  };
  const run = a => lint({ ...base, achievements: [a] });

  const early = run({ id: 'sign', name: 'Dungeon Sign', at: '1:2',
    text: 'You read a sign.', reward: 'Nearby Guilds appear on your minimap.' });
  assert.equal(early.errors.length, 0, 'a quotation is tightened, never rejected');
  assert.equal(early.tightened.get('sign'), parseAt('5:8'),
    'it waits for the thing it names, the way a relation waits for its endpoints');

  const clean = run({ id: 'ok', name: 'Empty Pockets', at: '1:2',
    text: 'You did not bring any supplies. None.', reward: 'A bronze box.' });
  assert.equal(clean.errors.length, 0);
  assert.equal(clean.tightened.has('ok'), false, 'and an award naming nothing is left alone');

  // The name is checked too, not only the body.
  const named = run({ id: 'n', name: 'Guilds Are Open', at: '1:2', text: 'You did a thing.' });
  assert.equal(named.tightened.get('n'), parseAt('5:8'), 'the award name is screened as well');

  const unpublished = run({ id: 'u', name: 'Later', at: '9:1', text: 'x' });
  assert.ok(unpublished.errors.some(e => /not published/.test(e)),
    'an award in an unpublished book is still an error');
});

test('a floor number on an award the reader can see is a spoiler too', () => {
  // The wiki files Loot — book 1, chapter 6 — under the Ninth Floor, which put
  // "Bk 1 · Floor 9" on a stamp a book-1 reader could see. Structure leaks, not
  // just prose: it is the same bug as the sealed beat stamps that read
  // "Bk 7 · Fate · Floor 9".
  const base = {
    books: [{ id: 1, title: 'One', chapters: 47 }, { id: 7, title: 'Seven', chapters: 60 }],
    floors: [
      { id: 1, revealedAt: '1:2', recapAt: '1:29', premise: 'p' },
      { id: 9, revealedAt: '7:1', recapAt: '7:end', premise: 'p' },
    ],
    entities: [],
  };
  const award = floor => lint({ ...base,
    achievements: [{ id: 'loot', name: 'Loot', at: '1:6', floor, text: 'You got loot.' }] });

  assert.ok(award(9).errors.some(e => /not reached until/.test(e)),
    'a floor the reader has not arrived at may not be stamped');
  assert.equal(award(1).errors.length, 0, 'the floor it is actually on is fine');
  assert.ok(award(4).errors.some(e => /does not exist/.test(e)),
    'and a floor that does not exist is a data error');
});
