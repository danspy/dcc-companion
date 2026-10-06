/* One call to Ollama's chat endpoint, the way src/lib/achievement.ts makes it:
   a fetch, no SDK. The key comes from .env (gitignored) or the environment —
   on the box it lives in /etc/dcc-companion.env and never in the repo. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function readEnv(root) {
  const e = { ...process.env };
  const p = join(root, '.env');
  if (existsSync(p)) for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !(m[1] in e)) e[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return e;
}

export async function ask(messages, { model, host, key } = {}) {
  if (!key) throw new Error('OLLAMA_API_KEY is not set — put it in .env (it is in /etc/dcc-companion.env on the box)');
  const res = await fetch(`${host ?? 'https://ollama.com'}/api/chat`, {
    method: 'POST',
    // A hung call would otherwise hold a worker forever; the caller treats a throw as a failed try.
    signal: AbortSignal.timeout(90_000),
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model ?? 'gemma4:31b', stream: false, think: false,
      options: { temperature: 0.7, top_p: 0.9 },
      messages,
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  return body?.message?.content ?? '';
}
