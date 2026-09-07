import { db, Book, Floor, Entity, Beat, Relation } from 'astro:db';
import { readFileSync } from 'node:fs';

/* No network, no cleverness: the snapshot is committed, so a build is
   reproducible and a deploy needs nothing but the repo. Regenerate it with
   `npm run content:build` after editing anything under data/. */

const snapshot = JSON.parse(readFileSync('./data/content.snapshot.json', 'utf8'));

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
      accent: f.accent, ink: f.ink, revealedAt: f.revealedAt, recapAt: f.recapAt,
      recapSortKey: f.recapSortKey, premise: f.premise, recap: f.recap,
    })),
  );

  await db.insert(Entity).values(snapshot.entities);
  if (snapshot.beats.length) await db.insert(Beat).values(snapshot.beats);
  if (snapshot.relations.length) await db.insert(Relation).values(snapshot.relations);
}
