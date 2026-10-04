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

/* None, a first chapter, mid-book, a finished book, a floor name printed early (2:3), a
   name on a ring (3:19) and the man it belongs to (6:32), a last chapter, the end, and the
   gate switched off. */
export const POSITIONS = [
  { label: 'none', book: 0, chapter: 0, spoilers: true },
  { label: '1:1', book: 1, chapter: 1, spoilers: true },
  { label: '1:22', book: 1, chapter: 22, spoilers: true },
  { label: '1:finished', book: 1, chapter: 0, spoilers: true },
  { label: '2:3', book: 2, chapter: 3, spoilers: true },
  { label: '3:19', book: 3, chapter: 19, spoilers: true },
  { label: '5:40', book: 5, chapter: 40, spoilers: true },
  { label: '5:75', book: 5, chapter: 75, spoilers: true },
  { label: '6:32', book: 6, chapter: 32, spoilers: true },
  { label: '8:finished', book: 8, chapter: 0, spoilers: true },
  { label: 'everything', book: 0, chapter: 0, spoilers: false },
];

export const QUERIES = [
  ['1:22', 'car'], ['1:22', 'donut'], ['3:19', 'wyrm'], ['3:19', 'hamed'], ['6:32', 'hamed'],
  ['6:32', 'bride'], ['5:40', 'hunting'], ['8:finished', 'floor 9'], ['2:3', 'great race'],
  ['everything', 'mordecai'], ['none', 'carl'], ['5:40', 'the'], ['8:finished', 'feral gods'],
];

/* Entries whose whole page is pinned: the two leads, the manager, and an item with a log. */
const PAGES = ['carl', 'princess-donut', 'mordecai', 'gate-of-the-feral-gods'];

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

const log = (rows, frontier) => {
  const hidden = rows.filter(b => frontier < b.key);
  return {
    shown: rows.length - hidden.length,
    sealed: hidden.length,
    nextKey: hidden.length ? Math.min(...hidden.map(b => b.key)) : null,
  };
};

function positionLabel(gate) {
  if (!gate.spoilers) return 'You are reading with everything shown';
  const book = Math.floor(gate.frontier / 1000), chapter = gate.frontier % 1000;
  return chapter >= 999 || chapter === 0
    ? `You have finished book ${book}` : `You are in book ${book}, chapter ${chapter}`;
}

function fixtureAt(pos, snapshot, content) {
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
    const own = content.beats.filter(b => b.entity === id);
    const usable = e.kind === 'item' || e.kind === 'mechanic';
    const rels = content.relations.filter(r => r.from === id || r.to === id);
    const shownRels = rels.filter(r => frontier >= r.key).length;
    pages[id] = {
      uses: log(usable ? own.filter(b => b.use) : [], frontier),
      story: log(usable ? own.filter(b => !b.use) : own, frontier),
      connections: shownRels,
      sealedConnections: rels.length - shownRels,
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

  const reachedFloors = snapshot.floors.filter(f => reveals(gate, f.revealedAt));
  const lastFloor = reachedFloors.at(-1) ?? null;
  const lastPart = lastFloor
    ? (Array.isArray(lastFloor.recap) ? lastFloor.recap : []).filter(p => frontier >= p.sortKey).at(-1)
    : undefined;

  const reachedAwards = content.awards.filter(a => frontier >= a.key);
  const nextAward = content.awards.find(a => frontier < a.key);

  return {
    label: pos.label, book: pos.book, chapter: pos.chapter, spoilers: pos.spoilers,
    frontier, fresh: gate.fresh,
    entries: met.map(e => e.id),
    taglines, descriptions, aliases,
    beats: content.beats.filter(b => frontier >= b.key).length,
    pages, floors,
    opening: {
      mode: gate.spoilers && gate.fresh ? 'welcome' : 'previously',
      floor: lastFloor ? lastFloor.id : null,
      previously: !!lastFloor?.previously,
      lastPart: lastPart ? lastPart.title : null,
      label: positionLabel(gate),
    },
    awards: {
      reached: reachedAwards.map(a => a.id),
      sealed: content.awards.length - reachedAwards.length,
      nextKey: nextAward ? nextAward.key : null,
    },
    stats: {
      entries: met.length, entriesTotal: snapshot.entities.length,
      beats: content.beats.filter(b => frontier >= b.key).length, beatsTotal: content.beats.length,
    },
  };
}

/* A quick-find href, as the place in the app it lands on. */
const targetOf = href => {
  const floor = /^\/#floor-(\d+)$/.exec(href);
  if (floor) return `floor:${floor[1]}`;
  const [, id, beat] = /^\/entity\/([^#]+)(?:#b(\d+))?$/.exec(href);
  return beat ? `entry:${id}#${beat}` : `entry:${id}`;
};

export function fixturesFor(snapshot, content, version) {
  /* The export's own beats, so a story hit names the id the app will scroll to. */
  const beats = content.beats.map(b => ({
    id: b.id, entityId: b.entity, headline: b.headline, text: b.text, sortKey: b.key,
    book: b.book, chapter: b.chapter,
  }));
  const finds = QUERIES.map(([label, q]) => {
    const gate = gateOf(POSITIONS.find(p => p.label === label), snapshot);
    const hits = quickFind(q, snapshot.entities, snapshot.floors, gate, 12, beats)
      .map(h => ({ name: h.name, kind: h.kind, detail: h.detail, tier: h.tier, target: targetOf(h.href) }));
    return { label, q, hits };
  });
  return {
    schema: content.schema, version,
    positions: POSITIONS.map(pos => fixtureAt(pos, snapshot, content)),
    finds,
  };
}
