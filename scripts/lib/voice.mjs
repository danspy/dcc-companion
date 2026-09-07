/* Who speaks on a page. A character speaks for themself in the present tense of
   the beat they are in; a dead crawler does not narrate their own death, so a
   fate is the dungeon's notice; everything that is not a character keeps the
   narrator. Resolved in the build so no view has to know these defaults. */

export const VOICES = new Set(['self', 'system', 'narrator']);
/* At the entity level only these two make sense: a character either speaks or
   gets the showrunner's dossier. `narrator` is what non-characters get. */
export const ENTITY_VOICES = new Set(['self', 'system']);

export function entityVoice(e) {
  if (e.kind !== 'character') return 'narrator';
  return e.voice ?? 'self';
}

export function beatVoice(e, b) {
  if (b.voice) return b.voice;
  if (e.kind === 'character' && b.kind === 'fate') return 'system';
  return entityVoice(e);
}
