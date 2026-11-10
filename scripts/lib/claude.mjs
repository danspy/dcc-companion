/* The drafting scripts' second model: the Claude Code CLI, headless, for when
   the Ollama account cannot answer (it said 402, no credits, on 2026-11-10).
   Same messages as ollama.mjs's ask(): the system turn becomes the system
   prompt and the rest is laid out as a transcript, the example answers
   included, so the prompts by example carry over unchanged. No tools, no
   project settings, no session left behind. */
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';

export function transcript(messages) {
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const turns = messages.filter(m => m.role !== 'system')
    .map(m => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`).join('\n\n');
  /* The length rule is the system prompt's last line; laid out as a transcript the model
     loses it and retells the whole note, so it is said again at the point of answering. */
  const length = system.trim().split('\n').pop().replace(/^-\s*/, '');
  /* Asked for "at most N" it lands just past N, so the aim is a fifth under the cap. */
  const cap = Number(/at most (\d+) words/.exec(length)?.[1]);
  const aim = cap ? ` Aim for ${Math.floor(cap * 0.8)} words or fewer.` : '';
  return { system, prompt: `${turns}\n\nAnswer the last request with the text alone. ${length}${aim}` };
}

export function askClaude(messages, { model = 'sonnet' } = {}) {
  const { system, prompt } = transcript(messages);
  return new Promise((resolve, reject) => {
    const child = execFile('claude', [
      '-p', '--model', model, '--system-prompt', system,
      '--tools', '', '--setting-sources', '', '--no-session-persistence',
    ], { cwd: tmpdir(), timeout: 120_000, maxBuffer: 1 << 20 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`claude: ${(stderr || err.message).slice(0, 200)}`));
      resolve(stdout);
    });
    child.stdin.end(prompt);
  });
}
