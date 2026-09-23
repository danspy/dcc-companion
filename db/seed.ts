import { db, Book, Floor, Entity, Beat, Relation, Achievement } from 'astro:db';
import { readFileSync } from 'node:fs';

/* No network, no cleverness: the snapshot is committed, so a build is
   reproducible and a deploy needs nothing but the repo. Regenerate it with
   `npm run content:build` after editing anything under data/. */

const snapshot = JSON.parse(readFileSync('./data/content.snapshot.json', 'utf8'));

/* SQLite caps a statement at 32,766 bound variables. One insert of every beat
   was fine at 692 beats and failed the build at 3,159 (× 11 columns), with
   nothing in the content wrong. Rows go in batches well under the cap. */
async function insertAll(table: any, rows: any[], size = 500) {
  for (let i = 0; i < rows.length; i += size) await db.insert(table).values(rows.slice(i, i + size));
}

export default async function () {
  await db.insert(Book).values(
    snapshot.books.map((b: any) => ({
      id: b.id, slug: b.slug, title: b.title, published: b.published,
      chapters: b.chapters, pages: b.pages, blurb: b.blurb,
      accent: b.accent, ink: b.ink,
    })),
  );

  await db.insert(Floor).values(
    snapshot.floors.map((f: any) => ({
      id: f.id, name: f.name, book: f.book, bookSpan: f.bookSpan ?? null,
      accent: f.accent, ink: f.ink, revealedAt: f.revealedAt, nameAt: f.nameAt ?? null, recapAt: f.recapAt,
      recapSortKey: f.recapSortKey, premise: f.premise, previously: f.previously ?? null, recap: f.recap,
    })),
  );

  await insertAll(Entity, snapshot.entities);
  await insertAll(Beat, snapshot.beats);
  await insertAll(Relation, snapshot.relations);
  await insertAll(Achievement, snapshot.achievements ?? []);
}
