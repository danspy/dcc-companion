import { defineDb, defineTable, column } from 'astro:db';

/* Everything in this schema is content. There is no user data here — reading
   position lives in a cookie today and moves to its own DB when accounts land.
   `astro build` force-resets whatever ASTRO_DATABASE_FILE points at, so this
   split is what lets a content deploy never touch a reader's progress. */

const Book = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),          // 1..8
    slug: column.text({ unique: true }),
    title: column.text(),
    published: column.text(),
    chapters: column.number({ optional: true }),      // null until counted from the book
    pages: column.number({ optional: true }),
    blurb: column.text(),
    accent: column.text(),                            // the book's own colour
    ink: column.text(),                               // readable on that colour
  },
});

const Floor = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),          // 1..18
    name: column.text(),
    /* A floor belongs to the book it is *told* in. Floor 7 straddles books 5
       and 6, which is exactly why gating runs on books and not on floors. */
    book: column.number(),
    bookSpan: column.text({ optional: true }),        // "5–6" when it straddles
    accent: column.text(),                            // inherited from the book
    ink: column.text(),
    /* A floor has two reveal points. `revealedAt` is where the crawlers set
       foot on it, and unseals only the blurb-safe `premise`. `recapAt` is where
       they leave it, and unseals the `recap` — the account of what actually
       happened, which is a whole-book spoiler if shown on arrival. */
    revealedAt: column.text(),
    recapAt: column.text(),
    recapSortKey: column.number(),
    premise: column.text(),
    recap: column.text(),
  },
});

const Entity = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    kind: column.text(),        // character | item | mechanic | faction | thread
    name: column.text(),
    aka: column.json({ default: [] }),
    role: column.text(),        // short label, shown under the name
    /* Taglines are progressive. A tagline is a summary, and a summary of a
       span has to be gated at the end of that span — the same rule floors
       follow. One entry is the common case (safe from `revealedAt`); a
       character whose one-liner changes as their story does gets several, and
       the page shows the latest one the reader has reached. */
    taglines: column.json(),
    revealedAt: column.text(),  // when the entity may be *named* at all
    sort: column.number({ default: 0 }),
    /* Who speaks on this page: self | system | narrator. Resolved in the build
       (scripts/lib/voice.mjs); characters default to self, everything else to
       narrator. */
    voice: column.text({ default: 'narrator' }),
    /* The System's own words about this thing, quoted verbatim and gated like
       taglines: [{ at, source, sortKey, text }], ascending. Items carry these
       ahead of their usage log. */
    descriptions: column.json({ default: [] }),
  },
});

/* One table for every kind of timeline entry: a character's arc, an item's
   usage log, a mechanic's evolution. One query helper, one renderer, one
   ordering path — instead of three near-identical sets. */
const Beat = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    entityId: column.text({ references: () => Entity.columns.id }),
    kind: column.text(),                              // arc | use | fate | origin
    book: column.number(),
    chapter: column.number({ optional: true }),
    floor: column.number({ optional: true }),
    at: column.text(),                                // revealedAt for this beat alone
    sortKey: column.number(),                         // resolved frontier, for ordering
    headline: column.text(),
    text: column.text(),
    confidence: column.text({ default: 'draft' }),    // verified | draft
    voice: column.text({ default: 'narrator' }),      // self | system | narrator, resolved in the build
  },
});

/* Declared one-directional in the curation files and mirrored at read time,
   so an edge is written once on whichever side reads more naturally. */
const Relation = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    fromId: column.text({ references: () => Entity.columns.id }),
    toId: column.text({ references: () => Entity.columns.id }),
    kind: column.text(),
    note: column.text({ optional: true }),
    revealedAt: column.text(),
    sortKey: column.number(),
  },
});

/* The awards the System actually handed out, pulled from the wiki's own
   `AI Description` sections with their chapter citations — the same source and
   the same quoting rule as an item's description. An award's *name* is a
   spoiler on its own ("Apex Predator" says how a floor ends), so these are
   gated like everything else and a sealed one is never listed by name. */
const Achievement = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    name: column.text(),
    at: column.text(),                                // the curation tag
    sortKey: column.number(),                         // resolved frontier
    floor: column.number({ optional: true }),
    forWhat: column.text({ optional: true }),         // what earns it
    box: column.text({ optional: true }),             // the loot box it pays out
    text: column.text(),                              // the System's own words
    reward: column.text({ optional: true }),          // its reward line, often a joke
    trimmed: column.boolean({ default: false }),      // quoted in part, not whole
    confidence: column.text({ default: 'draft' }),    // verified | draft
  },
});

export default defineDb({ tables: { Book, Floor, Entity, Beat, Relation, Achievement } });
