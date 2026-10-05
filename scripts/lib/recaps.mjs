/* The drafting library: what the model is asked, how its answer is checked,
   and how a clean answer is written into the curation files. Pure — the CLIs
   in draft-recaps.mjs and draft-gists.mjs wire it to the network and the disk,
   and test-recaps.mjs drives it with a fake ask(). The screens are the lint's
   own rules, not a copy: a candidate is linted as the entity it would join. */
import { lint } from './lint.mjs';

export const RECAP_WORDS = 80;
export const GIST_WORDS = 18;

/* The voice is shown, not described (the lesson from /achievement): the rules
   are a list, and the register is carried by worked examples in the
   assistant's own turn. The examples are everyday enough not to be handed
   back verbatim, and name only what their own notes name. */
const RULES = `You write for a reader's companion to Dungeon Crawler Carl. Rules, all of them:
- The narrator's voice: third person, present tense, plain and dry. Never first person, even when the notes are.
- Name only people, places, things and numbers that the notes name. Invent nothing. Add nothing you merely remember about these books.
- Never write "book", "the series", "chapter", "later", "eventually", "ends up", "in the end", "the reader", or any phrase that points past the notes.
- Never mention a floor by name unless the notes do.
- No preamble, no title, no quotation marks, no markdown. The paragraph or sentence alone.`;

const RECAP_EXAMPLES = `Notes for Carl, one stretch:
1:1 "Pink Crocs" — I'm Carl. My ex's cat gets out and I go after her in Bea's Crocs. The sky opens and everyone inside dies.
1:2 "Down the stairs" — Donut and I take the stairs. A box. A guide named Mordecai who smells of whisky.

Carl follows his ex-girlfriend's cat Donut into the freezing night in a pair of pink Crocs, and the collapse of every building on Earth leaves the two of them alive on the stairs down. A guide named Mordecai, smelling of whisky, meets them at the bottom with a box.

Notes for the Enhanced Pet Biscuit, one stretch:
1:5 "A biscuit for a cat" — Mordecai says even a bronze one beats a plain gold box. Donut eats it and starts to talk.

Mordecai rates even a bronze biscuit above a plain gold box. Donut eats one and begins to talk.`;

const GIST_EXAMPLES = `Note: 1:2 "Down the stairs" — Donut and I take the stairs. A box. A guide named Mordecai who smells of whisky.
Carl and Donut take the stairs and meet Mordecai, a whisky-smelling guide, beside a box.

Note: 4:1 "Every bounty on me, doubled" — The stairwell drops us into a sandstorm and an achievement. The Quarry is open.
The stairwell drops them into a sandstorm; the Quarry opens and every bounty on Carl doubles.`;

const beatLine = b => `${b.at} "${b.headline}" — ${b.text}`;
const who = e => `${e.name}${e.aka?.length ? ` (also ${e.aka.map(a => typeof a === 'string' ? a : a.name).join(', ')})` : ''}, ${e.kind}${e.role ? `, ${e.role}` : ''}`;

export function recapMessages(entity, book, beats) {
  return [
    { role: 'system', content: `${RULES}\n- A recap is 2 to 4 sentences, at most ${RECAP_WORDS} words, telling only what these notes tell.` },
    { role: 'user', content: 'Two examples, then mine.' },
    { role: 'assistant', content: RECAP_EXAMPLES },
    { role: 'user', content: `Notes for ${who(entity)}, one stretch:\n${beats.map(beatLine).join('\n')}\n\nThe recap:` },
  ];
}

export function gistMessages(entity, beat) {
  return [
    { role: 'system', content: `${RULES}\n- A gist is one sentence, at most ${GIST_WORDS} words, restating the note.` },
    { role: 'user', content: 'Two examples, then mine.' },
    { role: 'assistant', content: GIST_EXAMPLES },
    { role: 'user', content: `Note for ${who(entity)}: ${beatLine(beat)}\nThe gist:` },
  ];
}

/* Models wrap answers in fences and quotes and label them; all of that would
   fail faithfulness on the punctuation alone, so it comes off first. */
export function unwrap(raw) {
  let t = (raw ?? '').trim();
  t = t.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
  t = t.replace(/^(recap|gist|summary)\s*:\s*/i, '');
  t = t.replace(/^["“'‘]+|["”'’]+$/g, '');
  return t.replace(/\s+/g, ' ').trim();
}

const words = t => t.split(/\s+/).filter(Boolean).length;
const clone = x => JSON.parse(JSON.stringify(x));

/* A candidate is screened by linting the entity it would join, so the screen
   and the build can never disagree. Only the messages about this candidate
   are returned, stripped of their prefix. */
export function screenRecap(text, entity, book, books) {
  const e = clone(entity);
  e.recap = [...(e.recap ?? []).filter(r => parseInt(r.at) !== book), { at: `${book}:end`, text, confidence: 'draft' }]
    .sort((a, b) => parseInt(a.at) - parseInt(b.at));
  const idx = e.recap.findIndex(r => r.at === `${book}:end`) + 1;
  const { errors } = lint({ books, floors: [], entities: [e] });
  const prefix = `entity ${e.id} recap ${idx}: `;
  const problems = errors.filter(m => m.startsWith(prefix)).map(m => m.slice(prefix.length));
  if (!text) problems.push('empty');
  if (words(text) > RECAP_WORDS) problems.push(`too long: ${words(text)} words`);
  return problems;
}

export function screenGist(text, entity, beat, books = [{ id: beat.book, title: '', chapters: null }]) {
  const e = clone(entity);
  const b = e.beats.find(x => x.headline === beat.headline && x.at === beat.at);
  b.gist = text;
  const { errors } = lint({ books, floors: [], entities: [e] });
  const prefix = `entity ${e.id} beat "${beat.headline}" gist: `;
  const problems = errors.filter(m => m.startsWith(prefix)).map(m => m.slice(prefix.length));
  if (words(text) > GIST_WORDS) problems.push(`too long: ${words(text)} words`);
  return problems;
}

/* Ask, unwrap, screen; on a problem, say what was wrong and ask again. After
   `tries` the last answer comes back with its problems, for the caller to
   leave blank and list. */
export async function draftOne(messages, screen, askFn, tries = 3) {
  let msgs = [...messages];
  let text = '', problems = [];
  for (let i = 0; i < tries; i++) {
    text = unwrap(await askFn(msgs));
    problems = screen(text);
    if (!problems.length) return { text, problems };
    msgs = [...msgs, { role: 'assistant', content: text }, { role: 'user', content: `Not acceptable: ${problems.join('; ')}. Write it again, obeying every rule.` }];
  }
  return { text, problems };
}

/* What is missing: every (entity, book) with a beat and no step, every beat
   with no gist. Re-running drafts only these, so the pass is resumable. */
export function recapWork(entities) {
  const out = [];
  for (const e of entities) {
    const have = new Set((e.recap ?? []).map(r => parseInt(r.at)));
    const byBook = new Map();
    for (const b of e.beats ?? []) {
      if (!byBook.has(b.book)) byBook.set(b.book, []);
      byBook.get(b.book).push(b);
    }
    for (const book of [...byBook.keys()].sort((a, b) => a - b)) {
      if (!have.has(book)) out.push({ entity: e, book, beats: byBook.get(book) });
    }
  }
  return out;
}

export function gistWork(entities) {
  return entities.flatMap(e => (e.beats ?? []).filter(b => b.gist == null).map(beat => ({ entity: e, beat })));
}

export function applyRecap(entity, book, text) {
  entity.recap = [...(entity.recap ?? []).filter(r => parseInt(r.at) !== book), { at: `${book}:end`, text, confidence: 'draft' }]
    .sort((a, b) => parseInt(a.at) - parseInt(b.at));
}

export function applyGist(beat, text) {
  beat.gist = text;
  beat.gistDraft = true;
}
