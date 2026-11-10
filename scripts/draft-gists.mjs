#!/usr/bin/env node
/* npm run gists:draft [-- --entity carl --book 4 --redo --limit 20 --dry]

   One sentence per beat, drafted and screened like a recap; see
   draft-recaps.mjs. Only beats with no gist are drafted unless --redo. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadBooks } from './lib/books.mjs';
import { ask, readEnv } from './lib/ollama.mjs';
import { askClaude } from './lib/claude.mjs';
import { gistWork, gistMessages, screenGist, draftOne, applyGist } from './lib/recaps.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const only = flag('entity');
const onlyBook = flag('book') ? Number(flag('book')) : undefined;
const limit = flag('limit') ? Number(flag('limit')) : Infinity;
const redo = args.includes('--redo'), dry = args.includes('--dry');
/* --via claude drafts with the Claude Code CLI instead of Ollama (scripts/lib/claude.mjs). */
const via = flag('via') ?? 'ollama';
const PARALLEL = 4;

const env = readEnv(root);
const opts = { key: env.OLLAMA_API_KEY, host: env.OLLAMA_HOST, model: env.OLLAMA_MODEL };
const { books } = loadBooks(root);

const FILES = ['characters', 'items', 'mechanics', 'factions', 'places', 'threads'];
const files = FILES.map(f => {
  const path = join(root, `data/entities/${f}.json`);
  return { path, data: JSON.parse(readFileSync(path, 'utf8')) };
});
const entities = files.flatMap(f => f.data.entities);

/* --redo asks for the chosen gists again; the old text stands until a new one passes. */
const again = (e, b) => redo && (!only || e.id === only) && (!onlyBook || b.book === onlyBook);
let work = gistWork(entities, { redo: again });
if (only) work = work.filter(w => w.entity.id === only);
if (onlyBook) work = work.filter(w => w.beat.book === onlyBook);
work = work.slice(0, limit);
console.log(`${work.length} gist(s) to draft${dry ? ' (dry run)' : ''}`);
if (dry) process.exit(0);
if (via === 'ollama' && !opts.key) { console.error('OLLAMA_API_KEY is not set in .env'); process.exit(1); }
const askModel = via === 'claude' ? m => askClaude(m) : m => ask(m, opts);

const failed = [];
let done = 0;
function save() {
  for (const f of files) writeFileSync(f.path, JSON.stringify(f.data, null, 2) + '\n');
}
async function worker() {
  while (work.length) {
    const w = work.shift();
    const { text, problems } = await draftOne(
      gistMessages(w.entity, w.beat),
      t => screenGist(t, w.entity, w.beat, books),
      askModel,
    );
    if (problems.length) failed.push(`${w.entity.id} "${w.beat.headline}": ${problems.join('; ')}`);
    else applyGist(w.beat, text);
    done++;
    if (done % 100 === 0) { save(); console.log(`  ${done} done, ${failed.length} failed`); }
  }
}

await Promise.all(Array.from({ length: PARALLEL }, worker));
save();
console.log(`\n${done - failed.length} drafted, ${failed.length} failed`);
for (const f of failed) console.log(`  ✗ ${f}`);
console.log('\nNow: npm run content:build');
