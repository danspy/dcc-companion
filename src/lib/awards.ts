/* ---------------------------------------------------------------------------
   Filtering the awards on /achievement.

   One predicate, imported by the page and by its script. Two copies would let
   the first paint and the first keystroke disagree about what matches — the
   same reason `findRe` and `keeps` live in `timeline.ts` rather than in
   `/when` and its script separately.

   The filter is safe for the same reason `/who`'s is: a sealed award is not in
   the document at all. It has no row, no name and no `data-find`, so no query
   can surface one. There is no second copy of the data to gate, and therefore
   no second place to get the gate wrong.
   --------------------------------------------------------------------------- */

/** Rarest last. The books' own ladder, and the order the chips appear in. */
export const BOX_TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Legendary', 'Celestial'] as const;
export type BoxTier = (typeof BOX_TIERS)[number];

/**
 * Which tier a payout belongs to, or null.
 *
 * The wiki's reward field is only sometimes a loot box — it is just as often
 * the joke ("Ha.", "Pride", "Nothing") — so this answers null rather than
 * guessing, and the chips carry a count of what actually matched.
 */
export function tierOf(box: string | null | undefined): BoxTier | null {
  if (!box) return null;
  for (const t of BOX_TIERS) {
    if (new RegExp(`\\b${t}\\b`, 'i').test(box)) return t;
  }
  return null;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Matching is at word starts, the line `/who` and `check-pages.mjs` both draw:
 * without a boundary "ran" finds "Tran" and "cat" finds "catastrophe". Three
 * letters means the start of a word.
 */
export function findRe(query: string): RegExp | null {
  const q = query.trim();
  if (!q) return null;
  return new RegExp(`\\b${escape(q)}`, 'i');
}

export interface AwardRow {
  /** Everything worth searching, lower-cased: name, what earns it, the text, who earned it. */
  find: string;
  tier: BoxTier | null;
}

/** Does this row survive the current search and chip selection? */
export function keeps(row: AwardRow, re: RegExp | null, tiers: Set<string>): boolean {
  if (tiers.size && (!row.tier || !tiers.has(row.tier))) return false;
  if (re && !re.test(row.find)) return false;
  return true;
}
