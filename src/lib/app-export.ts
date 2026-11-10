/* The iOS app's data, derived from the committed snapshot.

   The app holds the whole companion on the device, so the gate runs there — and
   everything it compares is a resolved integer `key`, the snapshot's `sortKey`.
   No reveal tag crosses over; the Swift side never parses one. Where a stamp is
   printed from a tag ("Book 3 · Ch 8–13") it is rendered here, by the same
   function the page uses.

   Two things are left behind on purpose. A beat's `kind` is a spoiler as a word
   ("fate"), so only `use` survives, as the one bit a view needs to split an
   item's usage log from its history. And beats are numbered in gate order, which
   makes the beats a reader has reached a prefix of the list.

   The version is the hash of the bytes. The snapshot is committed and this is
   deterministic, so the version moves only when the content does. */
import { createHash } from 'node:crypto';
import { parseAt } from './progress.ts';
import { aliasesOf } from './aliases.ts';
import { tierOf } from './awards.ts';
import { span, stampOf } from './stamps.ts';
import { buildLinkIndex, linkifyWith, type LinkIndex } from './linkify.ts';

/* Schema 2 adds what the site grew in November 2026: each floor's guide and map
   layers, its picture and hero keys, the floors foretold past the eleventh, every
   character's and item's looks, and the names linked in every text. Pictures are
   not in here: they are the art pack (scripts/export-app-art.mjs), and this file
   only says when each may be shown. Later in November, still schema 2 because
   an older build ignores them: each entity's recap and each beat's gist, the
   story so far the entry page tells. */
export const APP_SCHEMA = 2;

const SITE = 'https://crawlers-companion.info';

export interface AppContent {
  schema: number;
  source: string;
  books: unknown[];
  floors: unknown[];
  entities: unknown[];
  beats: unknown[];
  relations: unknown[];
  awards: unknown[];
  foretold: unknown[];
}

export interface AppManifest {
  schema: number;
  version: string;
  /** When the content was committed. See scripts/lib/content-date.mjs. */
  generatedAt: string;
  bytes: number;
  counts: Record<string, number>;
}

const arrive = (f: any): number => f.sortKey ?? parseAt(f.revealedAt);

/* A recap is a list of parts; a snapshot from before that still holds one string. */
const partsOf = (f: any): any[] =>
  typeof f.recap === 'string'
    ? (f.recap
      ? [{ title: 'What happened', text: f.recap, from: f.revealedAt, at: f.recapAt,
           sortKey: f.recapSortKey ?? parseAt(f.recapAt) }]
      : [])
    : (f.recap ?? []);

/* The names linked in a text, as the page links them (linkify.ts): UTF-16 start,
   length, and the target, an entity id or `floor-N`. A link depends only on the
   text, its own point and the page it is on, never on the reader, so it is worked
   out once here. Every target is reached by anyone who can see the text. */
const linksIn = (index: LinkIndex, text: string, at: number, self?: string): [number, number, string][] => {
  const out: [number, number, string][] = [];
  let i = 0;
  for (const seg of linkifyWith(index, text, at, self)) {
    if (seg.href) out.push([i, seg.t.length, seg.href.startsWith('/floor/') ? `floor-${seg.href.slice(7)}` : decodeURIComponent(seg.href.slice(8))]);
    i += seg.t.length;
  }
  return out;
};

/* The floor page's own rule (src/pages/floor/[id].astro): a part is written as one
   piece, and a quarter-page block reads as a wall, so it breaks once, at the
   sentence nearest its middle. */
export function paragraphs(text: string): string[] {
  const cuts = [...text.matchAll(/[.!?] (?=[A-Z])/g)].map(m => (m.index ?? 0) + 1);
  if (text.length < 700 || !cuts.length) return [text];
  const mid = text.length / 2;
  const at = cuts.reduce((best, c) => (Math.abs(c - mid) < Math.abs(best - mid) ? c : best));
  return [text.slice(0, at).trim(), text.slice(at).trim()];
}

export function exportForApp(snapshot: any): AppContent {
  const index = buildLinkIndex(snapshot.entities, snapshot.floors);
  const L = (text: string, at: number, self?: string) => linksIn(index, text ?? '', at, self);
  /* Gate order, ties in the order the curation wrote them: the order every page
     reads an entity's beats in. */
  const beats = snapshot.beats
    .map((b: any, i: number) => ({ b, i }))
    .sort((x: any, y: any) => x.b.sortKey - y.b.sortKey || x.i - y.i)
    .map(({ b }: any, i: number) => ({
      id: i + 1, entity: b.entityId, key: b.sortKey, book: b.book, chapter: b.chapter ?? 0,
      floor: b.floor ?? null, use: b.kind === 'use', headline: b.headline ?? '', text: b.text ?? '',
      voice: b.voice ?? 'narrator', draft: b.confidence === 'draft',
      links: L(b.text ?? '', b.sortKey, b.entityId),
      /* The beat in one line, for the story so far; the headline stands in without one. */
      gist: b.gist ?? null, gistDraft: !!b.gistDraft,
      /* The story line's stamp takes the chapter off the beat's own tag, as the entity
         page does: 999 is a book's end, where `chapter` above says 0. */
      tagChapter: b.chapter ?? parseAt(b.at) % 1000,
    }));

  return {
    schema: APP_SCHEMA,
    source: SITE,
    books: snapshot.books.map((b: any) => ({
      /* No blurb: it is prose that names things, and nothing would gate it. */
      id: b.id, title: b.title, chapters: b.chapters ?? null, accent: b.accent, ink: b.ink,
    })),
    floors: snapshot.floors.map((f: any) => ({
      id: f.id, name: f.name, book: f.book, bookSpan: f.bookSpan ?? String(f.book),
      accent: f.accent, ink: f.ink,
      /* The name alone can open first; the premise and the catch-up wait for arrival. */
      nameKey: f.nameAt ? parseAt(f.nameAt) : arrive(f),
      key: arrive(f),
      premise: f.premise ?? '', previously: f.previously ?? '',
      parts: partsOf(f).map((p: any) => ({
        key: p.sortKey ?? parseAt(p.at), span: span(p.from, p.at), title: p.title, text: p.text,
        /* The floor page breaks a part once and links each paragraph on its own. */
        paras: paragraphs(p.text).map(t => ({ text: t, links: L(t, p.sortKey ?? parseAt(p.at)) })),
      })),
      nameStamp: f.nameAt ? stampOf(f.nameAt) : null,
      /* The picture opens at artKey; a floor with a hero picture shows it from recapKey. */
      artKey: f.artKey ?? null,
      recapKey: f.recapSortKey ?? null,
      guide: (f.guide ?? []).map((g: any) => ({
        id: g.id, title: g.title,
        steps: g.steps.map((st: any) => ({ key: st.sortKey, stamp: stampOf(st.at), text: st.text, links: L(st.text, st.sortKey) })),
      })),
      map: f.map ? {
        title: f.map.title ?? null,
        layers: f.map.layers.map((l: any) => ({
          id: l.id, label: l.label ?? null, key: l.sortKey, until: l.untilKey ?? null, stamp: stampOf(l.at),
        })),
      } : null,
    })),
    /* Floors 12 to 18: what the books say of a floor before anyone stands on it. */
    foretold: (snapshot.foretold ?? []).map((f: any) => ({
      id: f.id, name: f.name ?? null, nameKey: f.nameKey ?? null, nameStamp: f.nameAt ? stampOf(f.nameAt) : null,
      artKey: f.artKey ?? null, heroKey: f.heroKey ?? null,
      notes: (f.notes ?? []).map((n: any) => ({ key: n.sortKey, stamp: stampOf(n.at), text: n.text })),
    })),
    entities: snapshot.entities.map((e: any) => ({
      id: e.id, kind: e.kind, name: e.name, role: e.role ?? '', voice: e.voice ?? 'narrator',
      sort: e.sort ?? 0, key: parseAt(e.revealedAt),
      aka: aliasesOf(e).map(a => ({ name: a.name, key: parseAt(a.at) })),
      taglines: (e.taglines ?? []).map((t: any) => {
        const key = t.sortKey ?? parseAt(t.at);
        return { key, text: t.text, links: L(t.text, key, e.id) };
      }),
      descriptions: (e.descriptions ?? []).map((d: any) => {
        const key = d.sortKey ?? parseAt(d.at);
        return { key, stamp: stampOf(d.source ?? d.at), text: d.text, links: L(d.text, key, e.id) };
      }),
      /* The recap: a paragraph per book, keyed at that book's end (src/lib/story.ts). */
      recap: (e.recap ?? []).map((r: any) => ({ key: r.sortKey, text: r.text, draft: r.confidence !== 'verified' })),
      /* Superseding looks; whether one is drawn is the art pack's to say. */
      figures: (e.figures ?? []).map((f: any) => ({ look: f.look, key: f.sortKey, stamp: stampOf(f.at) })),
    })),
    beats,
    relations: snapshot.relations
      .map((r: any, i: number) => ({ r, i }))
      .sort((x: any, y: any) => x.r.sortKey - y.r.sortKey || x.i - y.i)
      .map(({ r }: any) => ({ from: r.fromId, to: r.toId, kind: r.kind, note: r.note ?? '', key: r.sortKey })),
    /* `key` is when it may be shown, `at` is when it happened. They differ when an
       award waits for somebody it names. */
    awards: [...snapshot.achievements]
      .sort((a: any, b: any) => a.sortKey - b.sortKey || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((a: any) => ({
        id: a.id, name: a.name, key: a.sortKey, at: parseAt(a.at), floor: a.floor ?? null,
        forWhat: a.forWhat ?? '', box: a.box ?? '', tier: tierOf(a.box), text: a.text,
        reward: a.reward ?? '', recipients: a.recipients ?? [], everyone: !!a.everyone,
        source: a.source ?? '', draft: a.confidence === 'draft',
      })),
  };
}

/** The export as bytes, with the manifest that names them. */
export function packForApp(snapshot: any, opts: { now?: Date } = {}):
  { content: AppContent; json: string; manifest: AppManifest } {
  const content = exportForApp(snapshot);
  const json = JSON.stringify(content);
  const manifest: AppManifest = {
    schema: APP_SCHEMA,
    version: createHash('sha256').update(json).digest('hex'),
    generatedAt: (opts.now ?? new Date()).toISOString(),
    bytes: Buffer.byteLength(json),
    counts: {
      entities: content.entities.length, beats: content.beats.length,
      relations: content.relations.length, awards: content.awards.length,
      floors: content.floors.length, foretold: content.foretold.length,
    },
  };
  return { content, json, manifest };
}
