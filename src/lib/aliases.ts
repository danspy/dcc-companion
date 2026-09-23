/* An alias is a name, and a name is gated.

   Most aliases reach the reader with the entity: "Katia" and "Katia Grim" are
   the same first mention. Some do not. The Night Wyrm is on a ring at 3:19 and
   his own name, Hamed, is not printed until 6:32; an alias that revealed with
   the entity would put "Hamed" on a page twenty-nine chapters early. So an
   alias is either a plain string, which reveals with its entity, or
   `{ name, at }`, which reveals at its own tag. Every reader of `aka` goes
   through here so none of them has to know the two shapes. */
import { reveals, type Gate } from './spoiler.ts';

export interface Alias { name: string; at: string }

interface Named { aka?: unknown; revealedAt: string }

/** Every alias with its own reveal point, the entity's where none is given. */
export function aliasesOf(e: Named): Alias[] {
  const list = Array.isArray(e.aka) ? e.aka : [];
  return list.flatMap((a: unknown): Alias[] => {
    if (typeof a === 'string') return a ? [{ name: a, at: e.revealedAt }] : [];
    if (a && typeof a === 'object' && typeof (a as Alias).name === 'string') {
      const { name, at } = a as Partial<Alias>;
      return name ? [{ name, at: at ?? e.revealedAt }] : [];
    }
    return [];
  });
}

/** The aliases this reader has reached, as names — for display and search. */
export const aliasesSeen = (e: Named, gate: Gate): string[] =>
  aliasesOf(e).filter(a => reveals(gate, a.at)).map(a => a.name);
