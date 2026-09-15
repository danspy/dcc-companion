#!/usr/bin/env node
/* A view switch on /when swaps the stage's contents for HTML parsed by
   DOMParser, and **a script inside parsed HTML never executes**. So a component
   that renders inside the stage may not depend on a script of its own to reach
   its working state.

   This shipped: DetailPanel.astro set the `one-at-a-time` class — the class its
   own CSS uses to show one card instead of all of them — from an inline script.
   It ran on the first load and never again, so after a switch the panel showed
   all 243 cards stacked, plus the "nothing open" invitation. Nothing in
   `astro check`, the lint or the smoke test could see it, because the page was
   perfectly correct until the moment it was swapped.

   The rule: anything a swapped component needs doing to it on arrival belongs
   in `refresh()` in when.astro, which runs on load *and* after every swap. */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = 'src/components';

/* Components whose markup a fetch-and-swap replaces: everything when.astro
   renders inside <div id="stage">, and the achievement card, which arrives the
   same way into <div id="grant">. The rule is the same wherever DOMParser is
   how a component reaches the page. */
const IN_STAGE = [
  'BraidView.astro', 'GridView.astro', 'DownstreamView.astro', 'DetailPanel.astro',
  'EntryRow.astro', 'EntryList.astro', 'StageHead.astro', 'EmptyState.astro',
  'BeatEntry.astro', 'AchievementCard.astro',
];

const files = (await readdir(DIR)).filter(f => IN_STAGE.includes(f));
const missing = IN_STAGE.filter(f => !files.includes(f));

let failed = 0;
for (const name of files) {
  const src = await readFile(join(DIR, name), 'utf8');
  /* Comments explain this rule constantly and legitimately, so strip them
     first — the same lesson check-pages.mjs learned. */
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  if (/<script[\s>]/.test(code)) {
    console.error(`FAIL ${name} renders inside the stage and carries a <script>.`);
    console.error('     A view swap parses this markup with DOMParser and will not run it.');
    console.error('     Move the work into refresh() in src/pages/when.astro.');
    failed++;
  }
  /* The mirror image, and the nastier one: DOMParser parses with scripting
     disabled, so <noscript> contents become real elements and the swap adopts
     them into a page that has scripting. A fallback stylesheet written this way
     switched itself on in exactly the browsers it was meant to sit out. */
  if (/<noscript[\s>]/.test(code)) {
    console.error(`FAIL ${name} renders inside the stage and carries a <noscript>.`);
    console.error('     DOMParser materialises noscript content, so a view swap adopts it live.');
    console.error('     Put the fallback outside #stage, in src/pages/when.astro.');
    failed++;
  }
}

if (missing.length) {
  console.error(`FAIL check-stage.mjs lists components that no longer exist: ${missing.join(', ')}`);
  console.error('     Update IN_STAGE, or the check is silently guarding nothing.');
  failed++;
}

if (failed) process.exit(1);
console.log(`OK — ${files.length} in-stage components, none depending on a script a swap would drop.`);
