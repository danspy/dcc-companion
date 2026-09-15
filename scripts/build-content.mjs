#!/usr/bin/env node
/* Reads the curation files, lints them, resolves every reveal tag to the
   integer the app compares, and writes one snapshot the seed can read with no
   network and no surprises. `--check` validates without writing. */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseAt } from './lib/gate.mjs';
import { lint } from './lib/lint.mjs';
import { entityVoice, beatVoice } from './lib/voice.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(readFileSync(join(root, p), 'utf8'));
const checkOnly = process.argv.includes('--check');

const { books, floors } = read('data/books.json');

/* Chapter counts come from data/chapters.json (npm run chapters:refresh), not
   from books.json — one source, refreshed on its own schedule. A book with no
   entry keeps a null count, which switches the chapter dial off for it. */
const chapterIndex = new Map(read('data/chapters.json').books.map(b => [b.book, b]));
for (const b of books) {
  const entry = chapterIndex.get(b.id);
  b.chapters = entry ? entry.count : null;
  b.divisions = entry ? entry.divisions : [];
  b.chapterTitles = entry ? entry.titles : [];
}

/* Each book's own colour, as published on mattdinniman.com, plus the ink that
   is readable on it (npm run colors:refresh). A floor takes the colour of the
   book it is told in — two floors from one book therefore match, which is the
   honest answer rather than a coincidence to design around. */
const colorIndex = new Map(read('data/book-colors.json').books.map(c => [c.book, c]));
for (const b of books) {
  const c = colorIndex.get(b.id);
  if (!c) throw new Error(`book ${b.id} has no colour in data/book-colors.json`);
  b.accent = c.accent;
  b.ink = c.ink;
}
const entities = ['characters', 'items', 'mechanics', 'factions', 'places', 'threads']
  .flatMap(f => read(`data/entities/${f}.json`).entities);

/* The awards, from npm run achievements:refresh. Quotations rather than
   curation, so they are linted for gate correctness and never for prose. */
const { achievements } = read('data/achievements.json');

const { errors, warnings, tightened } = lint({ books, floors, entities, achievements });

for (const w of warnings) console.warn(`  warn  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ERROR ${e}`);
  console.error(`\n${errors.length} error(s). Content not written.`);
  process.exit(1);
}

const byId = new Map(entities.map(e => [e.id, e]));
const resolvedEntities = [];
const resolvedBeats = [];
const resolvedRelations = [];

for (const e of entities) {
  const entityAt = parseAt(e.revealedAt);
  /* A bare string is the common case and means "safe from revealedAt". */
  const taglines = (typeof e.tagline === 'string'
    ? [{ at: e.revealedAt, text: e.tagline }]
    : e.tagline
  ).map(t => ({ at: t.at, sortKey: Math.max(parseAt(t.at), entityAt), text: t.text }))
   .sort((a, b) => a.sortKey - b.sortKey);

  /* The System's own words, quoted. Same shape and same rule as taglines: a
     string is safe from revealedAt, a list supersedes as the reader advances,
     and every entry is floored to the entity's own reveal point. */
  const descriptions = (e.description == null ? []
    : typeof e.description === 'string' ? [{ at: e.revealedAt, text: e.description }]
    : e.description
  ).map(d => ({ at: d.at, source: d.source ?? d.at, sortKey: Math.max(parseAt(d.at), entityAt), text: d.text }))
   .sort((a, b) => a.sortKey - b.sortKey);

  resolvedEntities.push({
    id: e.id, kind: e.kind, name: e.name, aka: e.aka ?? [],
    role: e.role, taglines, revealedAt: e.revealedAt, sort: e.sort ?? 0,
    // voiceNote stays in the curation file: it is guidance, not content.
    voice: entityVoice(e), descriptions,
  });

  for (const b of e.beats ?? []) {
    resolvedBeats.push({
      entityId: e.id, kind: b.kind, book: b.book, chapter: b.chapter ?? null,
      floor: b.floor ?? null, at: b.at,
      // Gate inheritance: a beat can never surface before its own entity.
      sortKey: Math.max(parseAt(b.at), entityAt),
      headline: b.headline, text: b.text, confidence: b.confidence ?? 'draft',
      // Who speaks, already decided, so no view has to know the defaults.
      voice: beatVoice(e, b),
    });
  }

  for (const r of e.relations ?? []) {
    // Gate inheritance, applied here so no view has to remember to do it.
    const sortKey = Math.max(parseAt(r.at), entityAt, parseAt(byId.get(r.to).revealedAt));
    resolvedRelations.push({
      fromId: e.id, toId: r.to, kind: r.kind, note: r.note ?? null,
      revealedAt: r.at, sortKey,
    });
  }
}

resolvedBeats.sort((a, b) => a.sortKey - b.sortKey || a.entityId.localeCompare(b.entityId));

/* No timestamp in here on purpose. This file is a derived artifact, and the
   deploy's staleness guard works by rebuilding it and diffing — which only
   means anything if the build is byte-for-byte reproducible. When it was
   written it defeated the guard on the guard's first run. Git records when.
   (data/chapters.json keeps its timestamp: that one is a record of a network
   fetch, not a derivation, and nothing diffs it.) */
const snapshot = {
  books,
  floors: floors.map(f => ({
    ...f,
    accent: colorIndex.get(f.book).accent,
    ink: colorIndex.get(f.book).ink,
    sortKey: parseAt(f.revealedAt),
    // A recap can never surface before its own floor does.
    recapSortKey: Math.max(parseAt(f.recapAt), parseAt(f.revealedAt)),
  })),
  entities: resolvedEntities,
  beats: resolvedBeats,
  relations: resolvedRelations,
  achievements: achievements
    .map(a => ({
      id: a.id, name: a.name, at: a.at,
      /* Gate inheritance, the same rule beats and relations follow: an award
         cannot surface before everything it names has. The lint works out the
         floor; the build applies it, so no view has to know. */
      sortKey: Math.max(parseAt(a.at), tightened.get(a.id) ?? 0),
      floor: a.floor ?? null, forWhat: a.for ?? null, box: a.box ?? null,
      text: a.text, reward: a.reward ?? null,
      trimmed: !!a.trimmed, confidence: a.confidence ?? 'draft',
    }))
    .sort((x, y) => x.sortKey - y.sortKey || x.id.localeCompare(y.id)),
};

const drafts = resolvedBeats.filter(b => b.confidence === 'draft').length;
const chapterTotal = books.reduce((a, b) => a + (b.chapters ?? 0), 0);
const summary =
  `${books.length} books · ${chapterTotal} chapters · ${floors.length} floors · ` +
  `${resolvedEntities.length} entities · ${resolvedBeats.length} beats (${drafts} draft) · ` +
  `${resolvedRelations.length} relations · ${snapshot.achievements.length} achievements`;

if (checkOnly) {
  console.log(`\nOK — ${summary}`);
  console.log(`${warnings.length} warning(s). Nothing written.`);
} else {
  writeFileSync(join(root, 'data/content.snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`\nWrote data/content.snapshot.json — ${summary}`);
}
