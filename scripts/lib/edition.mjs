/* The chapter numbering this site uses is the Ace/Penguin edition's — the
   print and ebook most readers are holding — not the Fandom wiki's.

   They agree everywhere except the end of book 5. The wiki numbers The
   Butcher's Masquerade to 77; the edition has 75, because twice it runs as one
   chapter what the wiki splits in two. Matched by reading the edition's text
   against the wiki's summaries, event by event (data/index/books/, gitignored).

   Where a wiki chapter's events straddle two edition chapters, it maps to the
   *later* one. A reveal that lands a chapter late is cautious; one that lands
   early is a leak.

   Anything pulled from the wiki with a chapter number — the chapter tables, an
   achievement's {{cite}} — goes through `toEdition` on the way in. */

export const WIKI_TO_EDITION = {
  5: {
    count: 75,
    /* Edition chapter 63 (Everly's cookbook notes, the talent-show planning,
       the queen's identity) has no summary row of its own on the wiki. The
       chapter exists; the wiki folds it into its neighbours. */
    unsummarised: [63],
    map: {
      62: 61, 63: 62, 64: 64, 65: 64, 66: 64, 67: 65, 68: 66, 69: 67, 70: 68,
      71: 69, 72: 70, 73: 71, 74: 72, 75: 73, 76: 74, 77: 75,
    },
  },
};

export function toEdition(book, chapter) {
  return WIKI_TO_EDITION[book]?.map[chapter] ?? chapter;
}

export function unsummarised(book) {
  return WIKI_TO_EDITION[book]?.unsummarised ?? [];
}

export function editionCount(book, wikiCount) {
  return WIKI_TO_EDITION[book]?.count ?? wikiCount;
}

/* "5:77" -> "5:75"; book-level and ":end" tags pass through untouched. */
export function tagToEdition(tag) {
  const m = /^(\d+):(\d+)$/.exec(tag);
  return m ? `${m[1]}:${toEdition(+m[1], +m[2])}` : tag;
}
