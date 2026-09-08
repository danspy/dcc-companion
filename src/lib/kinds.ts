/* The kinds, their headings and their order, kept clear of the database module
   so anything that only needs to *order* entities can import it without pulling
   in `astro:db`. That is what lets the lane arithmetic be unit-tested. */

export const KIND_LABELS: Record<string, string> = {
  character: 'Characters',
  item: 'Items & artifacts',
  mechanic: 'Mechanics',
  faction: 'Factions',
  place: 'Places',
  thread: 'Open threads',
};

export const KIND_ORDER = ['character', 'item', 'mechanic', 'faction', 'place', 'thread'];
