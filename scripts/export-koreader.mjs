#!/usr/bin/env node
/* npm run export:koreader -- --out <dir>

   Writes the KOReader plugin's data from data/content.snapshot.json:

     <dir>/index.json          books, and every entry with its names and taglines
     <dir>/entities/<id>.json  one file per entry: descriptions and beats

   The plugin repo (dcc-companion-koreader) commits the result under
   crawlerscompanion.koplugin/data/. Default output is ./.koreader-export, gitignored. The
   entities directory is emptied first so a removed entry does not linger on the device. */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { exportForKoreader } from './lib/koreader-export.mjs';
import { contentDate } from './lib/content-date.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outArg = args.find((a, i) => args[i - 1] === '--out') ?? args.find(a => a.startsWith('--out='))?.slice(6);
const out = outArg ? (outArg.startsWith('/') ? outArg : join(process.cwd(), outArg)) : join(root, '.koreader-export');

const snapshot = JSON.parse(readFileSync(join(root, 'data/content.snapshot.json'), 'utf8'));
// Dated by the snapshot's commit, as the app export is, so re-running the export over
// unchanged content writes the same bytes and the plugin repo's sync shows no diff.
const { index, entities } = exportForKoreader(snapshot, { now: contentDate(root) });

rmSync(join(out, 'entities'), { recursive: true, force: true });
mkdirSync(join(out, 'entities'), { recursive: true });
writeFileSync(join(out, 'index.json'), JSON.stringify(index));
let bytes = 0;
for (const [id, file] of entities) {
  const s = JSON.stringify(file);
  bytes += s.length;
  writeFileSync(join(out, 'entities', `${id}.json`), s);
}

const beats = [...entities.values()].reduce((n, f) => n + f.beats.length, 0);
console.log(`koreader export -> ${out}`);
console.log(`  index.json: ${index.entries.length} entries, ${index.books.length} books, ${(JSON.stringify(index).length / 1024).toFixed(0)} KB`);
console.log(`  entities/:  ${entities.size} files, ${beats} beats, ${(bytes / 1024).toFixed(0)} KB`);
