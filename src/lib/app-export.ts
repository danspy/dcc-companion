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

export const APP_SCHEMA = 1;

const SITE = 'https://dcc.dev.innovativstud.io';

export interface AppContent {
  schema: number;
  source: string;
  books: unknown[];
  floors: unknown[];
  entities: unknown[];
  beats: unknown[];
  relations: unknown[];
  awards: unknown[];
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

export function exportForApp(snapshot: any): AppContent {
  /* Gate order, ties in the order the curation wrote them: the order every page
     reads an entity's beats in. */
  const beats = snapshot.beats
    .map((b: any, i: number) => ({ b, i }))
    .sort((x: any, y: any) => x.b.sortKey - y.b.sortKey || x.i - y.i)
    .map(({ b }: any, i: number) => ({
      id: i + 1, entity: b.entityId, key: b.sortKey, book: b.book, chapter: b.chapter ?? 0,
      floor: b.floor ?? null, use: b.kind === 'use', headline: b.headline ?? '', text: b.text ?? '',
      voice: b.voice ?? 'narrator', draft: b.confidence === 'draft',
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
      })),
    })),
    entities: snapshot.entities.map((e: any) => ({
      id: e.id, kind: e.kind, name: e.name, role: e.role ?? '', voice: e.voice ?? 'narrator',
      sort: e.sort ?? 0, key: parseAt(e.revealedAt),
      aka: aliasesOf(e).map(a => ({ name: a.name, key: parseAt(a.at) })),
      taglines: (e.taglines ?? []).map((t: any) => ({ key: t.sortKey ?? parseAt(t.at), text: t.text })),
      descriptions: (e.descriptions ?? []).map((d: any) => ({
        key: d.sortKey ?? parseAt(d.at), stamp: stampOf(d.source ?? d.at), text: d.text,
      })),
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
      floors: content.floors.length,
    },
  };
  return { content, json, manifest };
}
