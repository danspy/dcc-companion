import test from 'node:test';
import assert from 'node:assert/strict';
import { unwrap, recapWork, gistWork, recapMessages, gistMessages, screenRecap, screenGist, draftOne, applyRecap, applyGist } from './lib/recaps.mjs';

const books = [{ id: 1, title: 'One', chapters: 47 }, { id: 2, title: 'Two', chapters: 25 }];
const xan = () => ({
  id: 'xan', kind: 'character', name: 'Xan', aka: [], role: 'Crawler', revealedAt: '1:1', tagline: 'A crawler.', voice: 'system',
  beats: [
    { kind: 'arc', book: 1, at: '1:3', headline: 'Down the stairs', text: 'Xan takes the stairs with Bea and finds a Boon Box.', confidence: 'verified' },
    { kind: 'arc', book: 2, at: '2:4', headline: 'The second floor', text: 'Xan reaches the Over City.', confidence: 'verified', gist: 'Xan reaches the Over City.' },
  ],
});

test('unwrap strips fences, quotes and labels', () => {
  assert.equal(unwrap('```\nXan descends.\n```'), 'Xan descends.');
  assert.equal(unwrap('"Xan descends."'), 'Xan descends.');
  assert.equal(unwrap('Recap: Xan  descends.\n'), 'Xan descends.');
});

test('the work lists name what is missing and nothing else', () => {
  const e = xan();
  assert.deepEqual(recapWork([e]).map(w => w.book), [1, 2]);
  e.recap = [{ at: '1:end', text: 'done', confidence: 'draft' }];
  assert.deepEqual(recapWork([e]).map(w => w.book), [2]);
  assert.deepEqual(gistWork([e]).map(w => w.beat.headline), ['Down the stairs']);
});

test('the messages carry the voice by example, the rules, and the beats', () => {
  const m = recapMessages(xan(), 1, xan().beats.filter(b => b.book === 1));
  assert.equal(m[0].role, 'system');
  assert.ok(m.some(x => x.role === 'assistant'), 'worked examples in the assistant turn');
  const user = m[m.length - 1];
  assert.equal(user.role, 'user');
  assert.match(user.content, /Xan/);
  assert.match(user.content, /Down the stairs/);
  assert.match(user.content, /Boon Box/);
  assert.doesNotMatch(user.content, /Over City/, 'only this book\'s beats');
  const g = gistMessages(xan(), xan().beats[0]);
  assert.match(g[g.length - 1].content, /Boon Box/);
});

test('screening uses the lint: faithfulness, forward phrases, and the length cap', () => {
  const e = xan();
  assert.deepEqual(screenRecap('Xan takes the stairs with Bea and finds a Boon Box.', e, 1, books), []);
  assert.ok(screenRecap('Xan takes the stairs with Donut.', e, 1, books).some(p => /"Donut"/.test(p)));
  assert.ok(screenRecap('Xan takes the stairs and later dies.', e, 1, books).some(p => /"later"/.test(p)));
  assert.ok(screenRecap(Array(81).fill('word').join(' '), e, 1, books).some(p => /too long: 81 words/.test(p)));
  assert.deepEqual(screenGist('Xan finds a Boon Box.', e, e.beats[0]), []);
  assert.ok(screenGist('Xan finds a Celestial Box.', e, e.beats[0]).some(p => /"Celestial"/.test(p)));
  assert.ok(screenGist(Array(19).fill('w').join(' '), e, e.beats[0]).some(p => /too long: 19 words/.test(p)));
});

test('draftOne retries with the problems named and gives up after three', async () => {
  const seen = [];
  const answers = ['"Xan meets Donut."', 'Xan takes the stairs with Bea.'];
  const fakeAsk = async msgs => { seen.push(msgs[msgs.length - 1].content); return answers.shift(); };
  const e = xan();
  const r = await draftOne(recapMessages(e, 1, e.beats.slice(0, 1)), t => screenRecap(t, e, 1, books), fakeAsk);
  assert.equal(r.text, 'Xan takes the stairs with Bea.');
  assert.deepEqual(r.problems, []);
  assert.match(seen[1], /Not acceptable: .*"Donut"/);
  const stubborn = await draftOne([{ role: 'user', content: 'x' }], () => ['bad'], async () => 'nope', 3);
  assert.deepEqual(stubborn.problems, ['bad']);
});

test('applyRecap keeps book order and applyGist marks the gist draft', () => {
  const e = xan();
  applyRecap(e, 2, 'Two.');
  applyRecap(e, 1, 'One.');
  assert.deepEqual(e.recap.map(r => r.at), ['1:end', '2:end']);
  assert.equal(e.recap[0].confidence, 'draft');
  applyGist(e.beats[0], 'Xan finds a Boon Box.');
  assert.equal(e.beats[0].gist, 'Xan finds a Boon Box.');
  assert.equal(e.beats[0].gistDraft, true);
});
