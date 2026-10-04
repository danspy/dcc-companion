#!/usr/bin/env node
/* npm run export:app -- --out <dir>

   Writes the iOS app's data from data/content.snapshot.json:

     <dir>/content.json        everything the app shows, every gate an integer
     <dir>/manifest.json       the schema, and the hash that names those bytes
     <dir>/gate-fixtures.json  what the site's own gate reveals at eleven positions

   The app repo (dcc-companion-ios) bundles the first two and tests its Swift gate
   against the third. The site serves the same content and manifest at /app/. Default
   output is ./.app-export, gitignored. */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { packForApp } from '../src/lib/app-export.ts';
import { fixturesFor } from './lib/app-fixtures.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outArg = args.find((a, i) => args[i - 1] === '--out') ?? args.find(a => a.startsWith('--out='))?.slice(6);
const out = outArg ? (outArg.startsWith('/') ? outArg : join(process.cwd(), outArg)) : join(root, '.app-export');

const snapshot = JSON.parse(readFileSync(join(root, 'data/content.snapshot.json'), 'utf8'));
const { content, json, manifest } = packForApp(snapshot);
const fixtures = JSON.stringify(fixturesFor(snapshot, content, manifest.version));

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'content.json'), json);
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest));
writeFileSync(join(out, 'gate-fixtures.json'), fixtures);

const kb = n => `${(n / 1024).toFixed(0)} KB`;
console.log(`app export -> ${out}`);
console.log(`  content.json:       ${manifest.counts.entities} entities, ${manifest.counts.beats} beats, ${manifest.counts.awards} awards, ${kb(manifest.bytes)}`);
console.log(`  manifest.json:      schema ${manifest.schema}, version ${manifest.version.slice(0, 12)}`);
console.log(`  gate-fixtures.json: ${kb(Buffer.byteLength(fixtures))}`);
