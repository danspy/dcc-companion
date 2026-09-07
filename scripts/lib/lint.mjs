import { parseAt, bookOf } from './gate.mjs';
import { VOICES, ENTITY_VOICES, entityVoice, beatVoice } from './voice.mjs';

/* ---------------------------------------------------------------------------
   The gate lint. Curated prose is written from knowledge, so this validates
   *structure* and never truth — but structure is where a spoiler gate actually
   leaks, and every rule here is a leak somebody would otherwise ship.
   --------------------------------------------------------------------------- */

const VALID_KINDS = new Set(['character', 'item', 'mechanic', 'faction', 'thread']);
const VALID_BEATS = new Set(['origin', 'arc', 'use', 'fate']);
const VALID_CONFIDENCE = new Set(['verified', 'draft']);

/* Prose that points past its own reveal point. A tagline is the worst offender
   because it is a summary of a whole character shown from the moment they walk
   in — "Nine floors later a warlord calls her an enemy to them all" sat on a
   page that opens in book 1 chapter 22. The rule is the same one floors follow:
   a summary of a span belongs at the end of that span. */
const FORWARD_PHRASE =
  /\b(later|eventually|ends? up|ends the|by the (second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh)|floors? (later|on)|turns out|does not end well|in the end|before the [a-z ]+ (was|were) over|and (then )?(killed|died|dies|dead)|was killed|is killed|settled an account|did not stay|would (go on|later))\b/i;

const escapeRe = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function lint({ books, floors, entities }) {
  const errors = [];
  const warnings = [];
  const byId = new Map(entities.map(e => [e.id, e]));
  const bookIds = new Set(books.map(b => b.id));

  const at = (value, where) => {
    try { return parseAt(value); }
    catch (e) { errors.push(`${where}: ${e.message}`); return null; }
  };

  for (const floor of floors) {
    const f = at(floor.revealedAt, `floor ${floor.id}`);
    if (f !== null && !bookIds.has(bookOf(f))) {
      errors.push(`floor ${floor.id}: reveals in book ${bookOf(f)}, which is not published`);
    }
    /* The recap is the account of what happened on a floor, which is a
       whole-book spoiler if it unseals the moment the crawlers arrive. It has
       to be gated at least as late as the floor itself, and in practice at the
       point they leave it. */
    const r = at(floor.recapAt, `floor ${floor.id} recap`);
    if (r !== null && f !== null && r < f) {
      errors.push(`floor ${floor.id}: recap unseals at "${floor.recapAt}", before the floor itself ("${floor.revealedAt}")`);
    }
    if (!floor.premise) errors.push(`floor ${floor.id}: no premise — nothing safe to show on arrival`);
  }

  /* Names that are not safe from the very beginning, for the forward-reference
     check below. Short names are skipped — too many false hits. */
  const gatedNames = entities
    .filter(e => e.name.length >= 4)
    .map(e => ({ name: e.name, at: at(e.revealedAt, `entity ${e.id}`) ?? 0,
                 re: new RegExp(`\\b${escapeRe(e.name)}\\b`, 'i') }));

  /* One text, one reveal point: does it point past itself? A verbatim quotation
     of something the reader has already seen in the book cannot point forward
     by construction, and the book's own text does say "eventually" — so a
     quotation skips the phrase heuristic and keeps the name check. That is a
     rule about a category of text, not an exemption list for entries. */
  const checkForward = (text, atValue, where, { quotation = false } = {}) => {
    if (!text) return;
    const phrase = quotation ? null : text.match(FORWARD_PHRASE);
    if (phrase) {
      errors.push(`${where}: "${phrase[0]}" points past its own reveal point — split it, or gate it later`);
    }
    for (const n of gatedNames) {
      if (n.at > atValue && n.re.test(text)) {
        errors.push(`${where}: names "${n.name}", which is not revealed until later`);
      }
    }
  };

  for (const e of entities) {
    const where = `entity ${e.id}`;
    if (!VALID_KINDS.has(e.kind)) errors.push(`${where}: unknown kind "${e.kind}"`);
    const entityAt = at(e.revealedAt, where);
    if (entityAt === null) continue;

    /* Voice. A character speaks for themself unless marked as a dossier; nothing
       else has a voice of its own. */
    if (e.voice != null) {
      if (e.kind !== 'character') errors.push(`${where}: voice "${e.voice}" — only a character speaks for itself`);
      else if (!ENTITY_VOICES.has(e.voice)) errors.push(`${where}: voice must be "self" or "system", not "${e.voice}"`);
    }
    if (e.kind === 'character' && entityVoice(e) === 'self' && !e.voiceNote) {
      warnings.push(`no voice note — ${e.id}: whoever writes the next beat in this voice needs one`);
    }

    /* Descriptions: the System's own words, quoted. A string is "safe from
       revealedAt"; a list supersedes as the reader advances, like taglines. */
    const descriptions = e.description == null ? []
      : typeof e.description === 'string' ? [{ at: e.revealedAt, text: e.description }]
      : e.description;
    if (!Array.isArray(descriptions)) {
      errors.push(`${where}: description must be a string or a list of { at, text }`);
    } else {
      let prevD = -1;
      descriptions.forEach((d, i) => {
        const dw = `${where} description ${i + 1}`;
        const dAt = at(d.at, dw);
        if (dAt === null) return;
        if (!d.text) errors.push(`${dw}: no text`);
        if (dAt < entityAt) warnings.push(`floored — ${e.id}: description ${i + 1} tag "${d.at}" raised to "${e.revealedAt}"`);
        if (dAt <= prevD) errors.push(`${dw}: does not come after the one before it`);
        prevD = dAt;
        checkForward(d.text, Math.max(dAt, entityAt), dw, { quotation: true });
      });
    }

    /* Taglines: a string means "safe from revealedAt"; a list supersedes as the
       reader advances, and each entry is checked against its own point. */
    const taglines = typeof e.tagline === 'string'
      ? [{ at: e.revealedAt, text: e.tagline }]
      : e.tagline;
    if (!Array.isArray(taglines) || !taglines.length) {
      errors.push(`${where}: no tagline`);
    } else {
      let prev = -1;
      taglines.forEach((t, i) => {
        const tAt = at(t.at, `${where} tagline ${i + 1}`);
        if (tAt === null) return;
        if (i === 0 && tAt !== entityAt) {
          errors.push(`${where}: the first tagline must open at "${e.revealedAt}", not "${t.at}"`);
        }
        if (tAt <= prev) errors.push(`${where}: tagline ${i + 1} does not come after the one before it`);
        prev = tAt;
        checkForward(t.text, tAt, `${where} tagline ${i + 1}`);
      });
    }

    for (const b of e.beats ?? []) {
      const bw = `${where} beat "${b.headline}"`;
      if (!VALID_BEATS.has(b.kind)) errors.push(`${bw}: unknown beat kind "${b.kind}"`);
      if (!VALID_CONFIDENCE.has(b.confidence ?? 'draft')) {
        errors.push(`${bw}: confidence must be "verified" or "draft"`);
      }
      if (b.voice != null && !VOICES.has(b.voice)) errors.push(`${bw}: unknown voice "${b.voice}"`);
      if (b.voice === 'self' && e.kind !== 'character') {
        errors.push(`${bw}: voice "self" — only a character speaks for itself`);
      }
      if (b.kind === 'fate' && beatVoice(e, b) === 'self') {
        errors.push(`${bw}: a fate cannot be in the character's own voice — the dungeon reports a death`);
      }
      const beatAt = at(b.at, bw);
      if (beatAt === null) continue;

      /* A beat that unlocks before its own entity is a leak: the reader gets
         the fact without ever having been introduced to who it is about.
         Across books that is a curation mistake and fails the build. Within one
         book it is usually a book-level tag sitting under a chapter-level
         entity, which the build floors to the entity's own reveal — the same
         inheritance relations already get. */
      if (beatAt < entityAt) {
        if (bookOf(beatAt) < bookOf(entityAt)) {
          errors.push(`${bw}: unlocks in book ${bookOf(beatAt)} but ${e.id} is not revealed until "${e.revealedAt}"`);
        } else {
          warnings.push(`floored — ${e.id}: "${b.headline}" tag "${b.at}" raised to "${e.revealedAt}"`);
        }
      }
      if (b.book !== bookOf(beatAt)) {
        errors.push(`${bw}: declares book ${b.book} but its tag "${b.at}" resolves to book ${bookOf(beatAt)}`);
      }
      if (!bookIds.has(b.book)) errors.push(`${bw}: book ${b.book} is not published`);
      if (b.floor != null && !floors.some(f => f.id === b.floor)) {
        errors.push(`${bw}: floor ${b.floor} does not exist`);
      }
      /* A chapter-level tag has to name a chapter the book actually has,
         or the content silently never unseals. */
      const book = books.find(bk => bk.id === b.book);
      const tagChapter = beatAt % 1000;
      if (book?.chapters && tagChapter !== 999 && tagChapter > book.chapters) {
        errors.push(`${bw}: tag "${b.at}" names chapter ${tagChapter}, but book ${b.book} has ${book.chapters}`);
      }
      if (b.chapter != null && book?.chapters && b.chapter > book.chapters) {
        errors.push(`${bw}: chapter ${b.chapter} is past the end of book ${b.book} (${book.chapters})`);
      }
      /* A beat may not name something the reader has not met yet either. */
      checkForward(b.text, beatAt, `${bw}`);

      if ((b.confidence ?? 'draft') === 'draft') {
        warnings.push(`draft — ${e.id}: ${b.headline}`);
      }
    }

    for (const r of e.relations ?? []) {
      const rw = `${where} -> ${r.to}`;
      const target = byId.get(r.to);
      if (!target) { errors.push(`${rw}: no such entity`); continue; }
      const relAt = at(r.at, rw);
      const targetAt = at(target.revealedAt, `entity ${target.id}`);
      if (relAt === null || targetAt === null) continue;

      /* Gate inheritance: an edge can never be looser than either endpoint.
         "Wielded by Carl" on an item Carl does not hold yet is a spoiler about
         the item, and "Katia: used the Orchid boon" leaks book 7 onto a page
         that opens in book 2. The resolved sortKey is what the app compares,
         so a too-loose tag is tightened rather than rejected — but say so. */
      const inherited = Math.max(relAt, entityAt, targetAt);
      if (inherited > relAt) {
        warnings.push(`${rw}: tag "${r.at}" tightened to match its endpoints`);
      }
    }
  }

  for (const b of books) {
    if (b.chapters == null) {
      warnings.push(`book ${b.id} (${b.title}): no chapter count — chapter-level gating and the % dial are unavailable for it`);
    }
  }

  return { errors, warnings };
}
