/* ---------------------------------------------------------------------------
   The forward-name screen.

   Everything else in this app renders text that a person wrote and a lint
   checked. The achievement page does not: it shows a sentence composed at
   request time, and the gate has no purchase on a sentence nobody has read.

   So the System is handed only the entities the reader has already reached,
   and whatever comes back is screened before it is shown. A reply naming
   anything past the frontier is thrown away and asked for again. This is the
   runtime half of the rule `scripts/lib/lint.mjs` applies at build time:
   text may not name an entity revealed later than the text itself.

   Three matching rules, each one a lesson this project has already paid for:

   - **Multi-word names match case-insensitively.** The leak that shipped into
     the Position page read "the Great Race" against a floor named "The Great
     Race", and an exact match sailed straight past it. `check-pages.mjs`
     learned this first.

   - **Single-word names match case-sensitively.** This one is the opposite
     lesson and it is specific to generated prose. Milk, Rust, Ruby, Ping,
     Feral, Justice and Guilds are all entity names, and they are all ordinary
     English words a citation might legitimately use. A name is only a name
     when it is capitalised; "burnt the milk" is not a reveal of Milk (3:27).
     A sentence-initial "Milk" is a false positive, and it costs one retry.

   - **Lower-case aliases are skipped.** Straight from the lint: a lower-case
     alias is a common noun phrase rather than a name. Screening on
     "the show" would reject every honest sentence about the broadcast.

   Word boundaries throughout, or "Tran" matches inside "transparent" and the
   screen rejects everything forever.
   --------------------------------------------------------------------------- */

import { parseAt } from './progress.ts';
import { aliasesOf } from './aliases.ts';

export interface Nameable {
  id: string | number;
  name: string;
  /* `unknown` rather than `string[]`: this arrives from a json column, so it
     is whatever the snapshot put there. Narrowed where it is read. */
  aka?: unknown;
  revealedAt: string | number;
  /* Floors only: the name can open before the floor does. */
  nameAt?: string | number | null;
}

export interface ScreenEntry {
  id: string;
  name: string;
  at: string | number;
  re: RegExp;
}

/* Shorter than this and a name is more word than name: "Zev" and "Bea" would
   reject a citation for containing them inside ordinary text. `check-pages.mjs`
   draws the line in the same place. */
const MIN_NAME = 4;

/* The names the front page already prints to everyone, as back-cover material
   rather than as gated facts — the same argument, and the same list, as the
   documented exemption in `scripts/check-pages.mjs`. A reader who has told us
   nothing has still read the premise, so these can never be a leak. */
const PREMISE_NAMES = new Set(
  ['Carl', 'Donut', 'Princess Donut', 'Borant', 'Borant Corporation', 'Syndicate']
    .map(n => n.toLowerCase()),
);

const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matcher = (name: string) =>
  new RegExp(`\\b${escape(name)}\\b`, name.includes(' ') ? 'i' : '');

/** Is this name still sealed at `frontier`, and solid enough to match on? */
function screenable(name: string, at: string | number, frontier: number): boolean {
  if (name.length < MIN_NAME) return false;
  if (PREMISE_NAMES.has(name.toLowerCase())) return false;
  return frontier < parseAt(at);
}

/**
 * Every name the reader has not reached yet. An empty list means there is
 * nothing to screen for — which is the correct answer with spoilers off, where
 * the frontier is FRONTIER_ALL and nothing is sealed.
 */
export function buildScreen(
  entities: Nameable[],
  floors: Nameable[],
  frontier: number,
): ScreenEntry[] {
  const out: ScreenEntry[] = [];
  const add = (id: string, name: string, at: string | number) => {
    if (screenable(name, at, frontier)) out.push({ id, name, at, re: matcher(name) });
  };

  for (const e of entities) {
    add(String(e.id), e.name, e.revealedAt);
    /* Only capitalised aliases. "Katia" sitting in a tagline three chapters
       before the reader meets her is a leak; "the show" is not a name. */
    /* Each at its own reveal point: "Hamed" is screened until 6:32 even though
       the Night Wyrm is met at 3:19. */
    for (const a of aliasesOf({ aka: e.aka, revealedAt: String(e.revealedAt) })) {
      if (a.name[0] === a.name[0].toUpperCase() && a.name[0] !== a.name[0].toLowerCase()) {
        add(String(e.id), a.name, a.at);
      }
    }
  }
  for (const f of floors) add(`floor ${f.id}`, f.name, f.nameAt ?? f.revealedAt);

  return out;
}

/**
 * What in `text` is still sealed.
 *
 * `supplied` is the reader's own words. A name they typed themselves is not
 * something the System revealed to them, so echoing it back is not a leak —
 * and without this, a reader who mentions milk, a ruby or justice can never
 * get an achievement at all.
 */
export function findLeaks(
  text: string,
  screen: ScreenEntry[],
  supplied = '',
): ScreenEntry[] {
  const hits: ScreenEntry[] = [];
  for (const s of screen) {
    if (!s.re.test(text)) continue;
    if (supplied && s.re.test(supplied)) continue;
    hits.push(s);
  }
  return hits;
}
