#!/usr/bin/env node
/* Reads the curation files, lints them, resolves every reveal tag to the
   integer the app compares, and writes one snapshot the seed can read with no
   network and no surprises. `--check` validates without writing. */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseAt } from './lib/gate.mjs';
import { lint } from './lib/lint.mjs';

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
const entities = ['characters', 'items', 'mechanics', 'factions', 'threads']
  .flatMap(f => read(`data/entities/${f}.json`).entities);

const { errors, warnings } = lint({ books, floors, entities });

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
  resolvedEntities.push({
    id: e.id, kind: e.kind, name: e.name, aka: e.aka ?? [],
    role: e.role, tagline: e.tagline, revealedAt: e.revealedAt, sort: e.sort ?? 0,
  });

  for (const b of e.beats ?? []) {
    resolvedBeats.push({
      entityId: e.id, kind: b.kind, book: b.book, chapter: b.chapter ?? null,
      floor: b.floor ?? null, at: b.at,
      // Gate inheritance: a beat can never surface before its own entity.
      sortKey: Math.max(parseAt(b.at), entityAt),
      headline: b.headline, text: b.text, confidence: b.confidence ?? 'draft',
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

const snapshot = {
  generatedAt: new Date().toISOString(),
  books,
  floors: floors.map(f => ({ ...f, sortKey: parseAt(f.revealedAt) })),
  entities: resolvedEntities,
  beats: resolvedBeats,
  relations: resolvedRelations,
};

const drafts = resolvedBeats.filter(b => b.confidence === 'draft').length;
const chapterTotal = books.reduce((a, b) => a + (b.chapters ?? 0), 0);
const summary =
  `${books.length} books · ${chapterTotal} chapters · ${floors.length} floors · ` +
  `${resolvedEntities.length} entities · ${resolvedBeats.length} beats (${drafts} draft) · ` +
  `${resolvedRelations.length} relations`;

if (checkOnly) {
  console.log(`\nOK — ${summary}`);
  console.log(`${warnings.length} warning(s). Nothing written.`);
} else {
  writeFileSync(join(root, 'data/content.snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`\nWrote data/content.snapshot.json — ${summary}`);
}
