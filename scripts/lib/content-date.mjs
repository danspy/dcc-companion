/* When the content was written: the commit that last touched the snapshot.

   The iOS app decides whether the site's content is newer than its own by comparing two
   dates, so both have to be dates of the *content*. "When the export ran" and "when the
   server last started" are clocks that have nothing to do with it: a server restart would
   make old content look new and an app would download a downgrade. The snapshot carries no
   date of its own — a stamp in it would fail the staleness guard on every build — but its
   last commit is exactly the date wanted, and it is the same on a laptop and on the box. */
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { join } from 'node:path';

const SNAPSHOT = 'data/content.snapshot.json';

export function contentDate(root) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', SNAPSHOT],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (out) return new Date(out);
  } catch { /* not a git checkout: fall through to the file itself */ }
  return statSync(join(root, SNAPSHOT)).mtime;
}
