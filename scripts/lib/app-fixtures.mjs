/* What the site's own gate reveals, written down for the app to reproduce.

   The iOS app gates on the device, in Swift, which makes it a second place to get the gate
   wrong. These fixtures are how it is held to the first: at each position below, everything
   here is computed by the modules the pages themselves use (`progress.ts`, `spoiler.ts`,
   `aliases.ts`, `quickfind.ts`) over the snapshot, and the Swift tests must arrive at the
   same answer from the export. Nothing in this file decides what is visible; it only asks. */

import { gateFor, reveals } from '../../src/lib/spoiler.ts';
import { aliasesSeen } from '../../src/lib/aliases.ts';
import { quickFind } from '../../src/lib/quickfind.ts';
import { KIND_ORDER } from '../../src/lib/kinds.ts';
import { floorStatus } from '../../src/lib/floorstatus.ts';
import { layersShown, mapSteps } from '../../src/lib/floormap.ts';
import { frontierOf } from '../../src/lib/progress.ts';
import { VOXEL_FLOORS, VOXEL_HEROES } from '../../src/lib/voxel/floors.ts';
import { VOXEL_FIGURES } from '../../src/lib/voxel/figures/cast.ts';
import { showsHero } from '../../src/lib/voxel/art.ts';

/* None, a first chapter, mid-book in several books, a finished book, a floor name printed
   early (2:3), a name on a ring (3:19) and the man it belongs to (6:32), a last chapter, a
   chapter past the end, the windows where a floor is named and not yet reached, the end,
   and the gate switched off with and without a position behind it. */
export const POSITIONS = [
  { label: 'none', book: 0, chapter: 0, spoilers: true },
  { label: '1:1', book: 1, chapter: 1, spoilers: true },
  { label: '1:22', book: 1, chapter: 22, spoilers: true },
  { label: '1:finished', book: 1, chapter: 0, spoilers: true },
  { label: '2:3', book: 2, chapter: 3, spoilers: true },
  { label: '3:19', book: 3, chapter: 19, spoilers: true },
  { label: '4:20', book: 4, chapter: 20, spoilers: true },
  { label: '5:40', book: 5, chapter: 40, spoilers: true },
  /* Floor 7's name is printed at 5:56 and nobody stands on it until the book ends. */
  { label: '5:60', book: 5, chapter: 60, spoilers: true },
  { label: '5:75', book: 5, chapter: 75, spoilers: true },
  /* A stored chapter past the end of its book: finished, never the next book. */
  { label: '5:80', book: 5, chapter: 80, spoilers: true },
  { label: '6:32', book: 6, chapter: 32, spoilers: true },
  { label: '7:30', book: 7, chapter: 30, spoilers: true },
  /* Floor 10 is named as book 7 closes and arrived on as book 8 opens. */
  { label: '7:finished', book: 7, chapter: 0, spoilers: true },
  /* Floor 11 is announced at 8:23 and reached at 8:88. */
  { label: '8:40', book: 8, chapter: 40, spoilers: true },
  { label: '8:finished', book: 8, chapter: 0, spoilers: true },
  { label: 'everything', book: 0, chapter: 0, spoilers: false },
  /* The gate off with a position still recorded behind it. */
  { label: 'everything-at-3:5', book: 3, chapter: 5, spoilers: false },
];

export const QUERIES = [
  ['1:22', 'car'], ['1:22', 'donut'], ['3:19', 'wyrm'], ['3:19', 'hamed'], ['6:32', 'hamed'],
  ['6:32', 'bride'], ['5:40', 'hunting'], ['8:finished', 'floor 9'], ['2:3', 'great race'],
  ['everything', 'mordecai'], ['none', 'carl'], ['5:40', 'the'], ['8:finished', 'feral gods'],
  ['5:60', 'great race'], ['8:40', 'parade'], ['7:30', 'faction'], ['4:20', 'gate'],
];

/* Moves for "what's new since": within a book, across books, a finished book onwards. */
const SINCE = [[[1, 9], [1, 22]], [[4, 9], [4, 12]], [[3, 0], [5, 40]], [[7, 30], [8, 0]], [[1, 1], [1, 2]]];

/* Entries whose whole page is pinned: the two leads, the manager, and an item with a log. */
const PAGES = ['carl', 'princess-donut', 'mordecai', 'gate-of-the-feral-gods'];

/* Figures pinned besides the pages': a look that changes often, a character described
   after being named (Zev), an item that changes (the war gauntlet) and one never drawn. */
const FIGURES = ['carl', 'princess-donut', 'mordecai', 'zev', 'katia-grim', 'war-gauntlet',
  'gate-of-the-feral-gods', 'spunky-jefferson', 'enhanced-pet-biscuit'];

/* `figureFor` in art.ts: the latest look reached that is drawn, or none (-1, the shadow). */
const lookOf = (e, reached) => {
  let n = -1;
  (e.figures ?? []).forEach((s, i) => { if (reached(s.sortKey) && VOXEL_FIGURES[e.id]?.[s.look]) n = i; });
  return n;
};

const gateOf = (pos, snapshot) => {
  const chapters = snapshot.books.find(b => b.id === pos.book)?.chapters ?? null;
  return gateFor({ book: pos.book, chapter: pos.chapter }, pos.spoilers, pos.book === 0, chapters);
};

/* The order /who lists in: kind, then `sort`, then name as the database compares it. */
const bytes = s => Buffer.from(s, 'utf8');
const ordered = entities => [...entities].sort((a, b) =>
  KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
  || (a.sort ?? 0) - (b.sort ?? 0)
  || Buffer.compare(bytes(a.name), bytes(b.name)));

/* Everything below gates on the snapshot's own `sortKey` — the number the pages compare.
   The export is the thing under test, so its keys are never read here; it is consulted only
   for the id it gave each beat, which is a name and not a gate. */
const log = (rows, frontier, idOf) => {
  const shown = rows.filter(b => frontier >= b.sortKey);
  const hidden = rows.filter(b => frontier < b.sortKey);
  return {
    shown: shown.length,
    sealed: hidden.length,
    nextKey: hidden.length ? Math.min(...hidden.map(b => b.sortKey)) : null,
    ids: shown.map(b => idOf.get(b)),
  };
};

/* The snapshot's beats in the order every page reads them (gate order, ties as written),
   each with the id the export numbered it. They must be the same beats in the same order. */
function beatsInOrder(snapshot, content) {
  const ordered = snapshot.beats
    .map((b, i) => ({ b, i }))
    .sort((x, y) => x.b.sortKey - y.b.sortKey || x.i - y.i)
    .map(({ b }) => b);
  if (ordered.length !== content.beats.length) throw new Error('the export dropped or invented a beat');
  const idOf = new Map();
  ordered.forEach((b, k) => {
    const exported = content.beats[k];
    if (exported.entity !== b.entityId || exported.headline !== (b.headline ?? '')) {
      throw new Error(`beat ${k + 1} of the export is not beat ${k + 1} of the snapshot`);
    }
    idOf.set(b, exported.id);
  });
  return { ordered, idOf };
}

const awardsInOrder = snapshot => [...snapshot.achievements]
  .sort((a, b) => a.sortKey - b.sortKey || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

function positionLabel(gate) {
  if (!gate.spoilers) return 'You are reading with everything shown';
  const book = Math.floor(gate.frontier / 1000), chapter = gate.frontier % 1000;
  return chapter >= 999 || chapter === 0
    ? `You have finished book ${book}` : `You are in book ${book}, chapter ${chapter}`;
}

function fixtureAt(pos, snapshot, beats) {
  const gate = gateOf(pos, snapshot);
  const { frontier } = gate;
  const met = ordered(snapshot.entities).filter(e => reveals(gate, e.revealedAt));

  const taglines = {}, descriptions = {}, aliases = {};
  for (const e of met) {
    const rows = e.taglines ?? [];
    let t = rows.length ? 0 : -1;
    rows.forEach((row, i) => { if (frontier >= row.sortKey) t = i; });
    taglines[e.id] = t;
    let d = -1;
    (e.descriptions ?? []).forEach((row, i) => { if (frontier >= row.sortKey) d = i; });
    if (d >= 0) descriptions[e.id] = d;
    const seen = aliasesSeen(e, gate);
    if (seen.length) aliases[e.id] = seen;
  }

  const pages = {};
  for (const id of PAGES) {
    const e = met.find(x => x.id === id);
    if (!e) continue;
    const own = beats.ordered.filter(b => b.entityId === id);
    const usable = e.kind === 'item' || e.kind === 'mechanic';
    const rels = snapshot.relations
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.fromId === id || r.toId === id)
      .sort((x, y) => x.r.sortKey - y.r.sortKey || x.i - y.i)
      .map(({ r }) => r);
    const shownRels = rels.filter(r => frontier >= r.sortKey);
    pages[id] = {
      uses: log(usable ? own.filter(b => b.kind === 'use') : [], frontier, beats.idOf),
      story: log(usable ? own.filter(b => b.kind !== 'use') : own, frontier, beats.idOf),
      connections: shownRels.length,
      sealedConnections: rels.length - shownRels.length,
      others: shownRels.map(r => (r.fromId === id ? r.toId : r.fromId)),
    };
  }

  const floors = snapshot.floors.map(f => {
    const open = reveals(gate, f.revealedAt);
    const nameOpen = open || (f.nameAt != null && reveals(gate, f.nameAt));
    const parts = Array.isArray(f.recap) ? f.recap : [];
    const shown = open ? parts.filter(p => frontier >= p.sortKey) : [];
    const next = open ? parts.find(p => frontier < p.sortKey) : undefined;
    return {
      id: f.id, nameOpen, open, parts: shown.length,
      sealedParts: open ? parts.length - shown.length : 0, nextKey: next ? next.sortKey : null,
    };
  });

  /* The eighteen floors as the homepage and the floor pages see them (floorstatus.ts),
     and which picture each shows (index.astro: own at artKey, hero per showsHero). */
  const foretold = snapshot.foretold ?? [];
  const atlas = Array.from({ length: 18 }, (_, i) => {
    const id = i + 1;
    const st = floorStatus(id, snapshot.floors, foretold, gate);
    const f = snapshot.floors.find(x => x.id === id), fo = foretold.find(x => x.id === id);
    const artKey = f ? f.artKey : fo?.artKey;
    const art = st.kind !== 'sealed' && !!VOXEL_FLOORS[id] && artKey != null && frontier >= artKey
      && (st.kind === 'reached' || st.kind === 'foretold');
    const hero = art && showsHero(id, frontier, st.kind === 'reached' ? f.recapSortKey : fo?.heroKey);
    return { id, kind: st.kind, name: st.name, notes: st.notes.length, picture: hero ? 'hero' : art ? 'tile' : st.kind === 'sealed' ? 'sealed' : 'known' };
  });

  /* Each reached floor's page: the guide step shown per section, the map's timeline
     and the layers it draws, and the line-up with the look each figure stands in. */
  const floorPages = {};
  for (const f of snapshot.floors.filter(x => reveals(gate, x.revealedAt))) {
    const guide = Object.fromEntries((f.guide ?? []).map(g => [g.id, g.steps.filter(st => frontier >= st.sortKey).at(-1)?.sortKey ?? null]));
    const steps = mapSteps(f.map, frontier);
    const layers = layersShown(f.map, gate).map(l => l.id).sort();
    const seen = new Map();
    for (const b of beats.ordered) if (b.floor === f.id && frontier >= b.sortKey) seen.set(b.entityId, (seen.get(b.entityId) ?? 0) + 1);
    const floorEnd = f.recapSortKey ?? Infinity;
    const lineup = [...seen].map(([id, n]) => {
      const e = snapshot.entities.find(x => x.id === id);
      if (!e) return null;
      let look = null;
      if (e.kind === 'character' || e.kind === 'item') {
        const steps = e.figures ?? [];
        look = lookOf(e, k => frontier >= k && k <= floorEnd);
        if (look < 0 && steps.length) look = lookOf(e, k => frontier >= k && k <= steps[0].sortKey);
      }
      return [id, n, look];
    }).filter(Boolean);
    floorPages[f.id] = { guide, steps, layers, lineup };
  }

  const figures = {};
  for (const id of FIGURES) {
    const e = met.find(x => x.id === id);
    if (e) figures[id] = lookOf(e, k => frontier >= k);
  }

  /* An entry page's Latest and the book it opens on (entity/[id].astro). */
  const opens = {};
  for (const id of PAGES) {
    const e = met.find(x => x.id === id);
    if (!e) continue;
    const shownAll = beats.ordered.filter(b => b.entityId === id && frontier >= b.sortKey);
    const counts = new Map();
    for (const b of shownAll) counts.set(b.book, (counts.get(b.book) ?? 0) + 1);
    const books = [...counts.keys()].sort((a, b) => a - b);
    const filterable = shownAll.length > 12 && books.length > 1;
    opens[id] = {
      book: filterable && shownAll.length > 24 ? books.at(-1) : 0,
      latest: shownAll.length > 6 ? [...shownAll].reverse().slice(0, 3).map(b => beats.idOf.get(b)) : [],
    };
  }

  const reachedFloors = snapshot.floors.filter(f => reveals(gate, f.revealedAt));
  const lastFloor = reachedFloors.at(-1) ?? null;
  const lastPart = lastFloor
    ? (Array.isArray(lastFloor.recap) ? lastFloor.recap : []).filter(p => frontier >= p.sortKey).at(-1)
    : undefined;

  const awards = awardsInOrder(snapshot);
  const reachedAwards = awards.filter(a => frontier >= a.sortKey);
  const nextAward = awards.find(a => frontier < a.sortKey);
  const reachedBeats = snapshot.beats.filter(b => frontier >= b.sortKey).length;

  return {
    label: pos.label, book: pos.book, chapter: pos.chapter, spoilers: pos.spoilers,
    frontier, fresh: gate.fresh,
    entries: met.map(e => e.id),
    taglines, descriptions, aliases,
    beats: reachedBeats,
    pages, floors, atlas, floorPages, figures, opens,
    opening: {
      mode: gate.spoilers && gate.fresh ? 'welcome' : 'previously',
      floor: lastFloor ? lastFloor.id : null,
      previously: !!lastFloor?.previously,
      lastPart: lastPart ? lastPart.title : null,
      label: positionLabel(gate),
    },
    awards: {
      reached: reachedAwards.map(a => a.id),
      sealed: awards.length - reachedAwards.length,
      nextKey: nextAward ? nextAward.sortKey : null,
    },
    stats: {
      entries: met.length, entriesTotal: snapshot.entities.length,
      beats: reachedBeats, beatsTotal: snapshot.beats.length,
    },
  };
}

/* A quick-find href, as the place in the app it lands on. */
const targetOf = href => {
  const floor = /^\/(?:#floor-|floor\/)(\d+)$/.exec(href);
  if (floor) return `floor:${floor[1]}`;
  const [, id, beat] = /^\/entity\/([^#]+)(?:#b(\d+))?$/.exec(href);
  return beat ? `entry:${id}#${beat}` : `entry:${id}`;
};

export function fixturesFor(snapshot, content, version) {
  const beats = beatsInOrder(snapshot, content);
  /* Quick-find reads the snapshot's beats too; only the id a story hit lands on is the export's. */
  const findable = beats.ordered.map(b => ({
    id: beats.idOf.get(b), entityId: b.entityId, headline: b.headline ?? '', text: b.text ?? '',
    sortKey: b.sortKey, book: b.book, chapter: b.chapter ?? 0,
  }));
  const finds = QUERIES.map(([label, q]) => {
    const gate = gateOf(POSITIONS.find(p => p.label === label), snapshot);
    const hits = quickFind(q, snapshot.entities, snapshot.floors, gate, 12, findable)
      .map(h => ({ name: h.name, kind: h.kind, detail: h.detail, tier: h.tier, target: targetOf(h.href) }));
    return { label, q, hits };
  });
  /* What's new since a move (since.astro): from one position to another, the parts of
     the crawl and the beats that opened between them, grouped by entry. */
  const keyOf = (book, chapter) => frontierOf({ book, chapter }, snapshot.books.find(b => b.id === book)?.chapters ?? null);
  const since = SINCE.map(([from, to]) => {
    const lo = keyOf(...from), hi = keyOf(...to);
    const inRange = k => k > lo && k <= hi;
    const parts = snapshot.floors.flatMap(f => (Array.isArray(f.recap) ? f.recap : []).filter(p => inRange(p.sortKey)).map(p => `${f.id}:${p.title}`));
    const groups = new Map();
    for (const b of beats.ordered) if (inRange(b.sortKey)) groups.set(b.entityId, (groups.get(b.entityId) ?? 0) + 1);
    const byId = new Map(snapshot.entities.map(e => [e.id, e]));
    const rows = [...groups].filter(([id]) => byId.has(id))
      .sort((a, b) => b[1] - a[1] || byId.get(a[0]).name.localeCompare(byId.get(b[0]).name));
    return { from, to, parts, rows: rows.map(([id, n]) => [id, n]), total: rows.reduce((n, r) => n + r[1], 0) };
  });
  return {
    schema: content.schema, version,
    positions: POSITIONS.map(pos => fixtureAt(pos, snapshot, beats)),
    finds, since,
  };
}
