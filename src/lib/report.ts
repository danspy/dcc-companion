/* Filing a report with the achievement desk.

   There are two doors onto it: the form on /achievement, and the JSON endpoint the
   iOS app posts to. Both come through here, so there is one limiter, one prompt
   and one leak screen, and a reader cannot double their allowance by using both. */
import { getEntities, getFloors, taglineFor } from './content';
import { reveals, type Gate } from './spoiler';
import { aliasesSeen } from './aliases';
import {
  grantAchievement, SystemOffline, MAX_DEED,
  type Grant, type LoreEntry,
} from './achievement';
import { SUGGESTIONS } from './deeds';

/* A public endpoint that costs a model call needs a ceiling. In memory and per
   process, which is all this needs: there is one process, and a limiter that
   outlives a restart would be a database — and this app deliberately has no
   user state on the server. */
const WINDOW_MS = 10 * 60 * 1000;
const PER_WINDOW = 15;
const seen = new Map<string, number[]>();

function overLimit(ip: string): boolean {
  const now = Date.now();
  const hits = (seen.get(ip) ?? []).filter(t => now - t < WINDOW_MS);
  hits.push(now);
  seen.set(ip, hits);
  if (seen.size > 2000) for (const [k, v] of seen) if (!v.some(t => now - t < WINDOW_MS)) seen.delete(k);
  return hits.length > PER_WINDOW;
}

/** A refusal, in character. `status` is for the JSON door; the page ignores it. */
export interface ReportProblem { head: string; body: string; status: number }

export interface ReportOutcome {
  /** The report as filed: trimmed, capped, or chosen by "Surprise me". */
  deed: string;
  grant: Grant | null;
  problem: ReportProblem | null;
}

export async function fileReport(o: {
  deed: string; surprise: boolean; gate: Gate; ip: string;
}): Promise<ReportOutcome> {
  let deed = o.deed.replace(/\s+/g, ' ').trim().slice(0, MAX_DEED);

  /* Surprise me. The server picks, not the script, so there is one source of
     randomness and no copy of the list in the document — and the button works
     with no JavaScript at all, which a client-side filler would not. It
     overrides whatever is in the box, because that is what the button says it
     does. */
  if (o.surprise) deed = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];

  if (!deed) {
    return { deed, grant: null, problem: {
      status: 422,
      head: 'Nothing filed',
      body: 'You have submitted an empty report, crawler. Even the vending machines manage a noun.',
    } };
  }
  if (overLimit(o.ip)) {
    return { deed, grant: null, problem: {
      status: 429,
      head: 'Throttled',
      body: 'Production notes that you have filed a great many reports in a short window. ' +
            'The department handling them is on a break. Try again shortly.',
    } };
  }

  /* Only what the reader has reached, with the tagline they have reached for
     it. Shuffled and capped: the whole cast in one prompt is slower, and a
     fixed order makes the System reach for the same three names every time. */
  const { gate } = o;
  const [entities, floors] = await Promise.all([getEntities(), getFloors()]);
  /* `revealedAt` is a curation tag ("4:12"), not an integer — `reveals`
     parses it. Comparing it to the frontier directly is silently always
     false, which would hand the System an empty world. */
  const reached = entities.filter(e => reveals(gate, e.revealedAt));
  const lore: LoreEntry[] = reached
    .map(e => ({ e, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .slice(0, 45)
    .map(({ e }) => ({
      id: e.id, name: e.name, aka: aliasesSeen(e, gate),
      revealedAt: e.revealedAt, role: e.role, kind: e.kind,
      tagline: taglineFor(e, gate),
    }));

  try {
    const result = await grantAchievement({
      deed, lore, entities, floors, frontier: gate.frontier,
    });
    if (result.screened.length) {
      /* Not shown to the reader — the screen working is not their problem.
         It is worth knowing which names the System keeps reaching for. */
      console.warn(
        `[achievement] screened ${result.screened.length} sealed name(s) in ` +
        `${result.attempts} attempt(s): ` +
        result.screened.map(s => `${s.name} (${s.at})`).join(', '),
      );
    }
    return { deed, grant: result.grant, problem: null };
  } catch (e) {
    console.error('[achievement]', e);
    return { deed, grant: null, problem: e instanceof SystemOffline
      ? {
          status: 503,
          head: 'Transmission interrupted',
          body: 'The department that issues achievements is not answering. This is ' +
                'either a scheduling error or a labour dispute. Production apologises ' +
                'for nothing.',
        }
      : {
          status: 502,
          head: 'Citation redacted',
          body: 'Three drafts were written and all three said something you have not ' +
                'earned the right to hear. The record has been destroyed. File again.',
        } };
  }
}
