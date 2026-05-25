import Anthropic from '@anthropic-ai/sdk';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const required = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var: ${k} — run setup first (see README).`);
  return v;
};

const AGENT_ID = required('AGENT_ID');
const ENV_ID = required('ENV_ID');
const VAULT_ID = required('VAULT_ID');
const GITHUB_PAT = required('GITHUB_PAT');

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

const client = new Anthropic();

const session = await client.beta.sessions.create({
  agent: AGENT_ID,
  environment_id: ENV_ID,
  vault_ids: [VAULT_ID],
  resources: [
    {
      type: 'github_repository',
      url: 'https://github.com/WillTaylor22/self-managing-codebase',
      authorization_token: GITHUB_PAT,
      mount_path: '/workspace/repo',
    },
  ],
  title: `Manager session ${new Date().toISOString()}`,
});

console.log(c.dim(`session ${session.id}`));
console.log(c.dim('type a message, ctrl-c to exit\n'));

const rl = readline.createInterface({ input: stdin, output: stdout });

let spinnerTimer: NodeJS.Timeout | null = null;
let spinnerActive = false;
function startSpinner(label: string) {
  stopSpinner();
  spinnerActive = true;
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const render = () => stdout.write(`\r${c.dim(`${frames[i++ % frames.length]} ${label}`)}   `);
  render();
  spinnerTimer = setInterval(render, 80);
}
function stopSpinner() {
  if (spinnerTimer) clearInterval(spinnerTimer);
  if (spinnerActive) stdout.write('\r\x1b[K');
  spinnerTimer = null;
  spinnerActive = false;
}

function previewInput(input: unknown): string {
  try {
    const s = JSON.stringify(input);
    return s.length > 100 ? s.slice(0, 100) + '…' : s;
  } catch {
    return '';
  }
}

async function turn(userText: string): Promise<void> {
  const stream = await client.beta.sessions.events.stream(session.id);
  await client.beta.sessions.events.send(session.id, {
    events: [{ type: 'user.message', content: [{ type: 'text', text: userText }] }],
  });

  startSpinner('thinking');

  for await (const event of stream) {
    switch (event.type) {
      case 'agent.thinking':
        startSpinner('thinking');
        break;

      case 'agent.tool_use':
        stopSpinner();
        console.log(c.cyan(`◆ ${event.name}`) + ' ' + c.dim(previewInput(event.input)));
        startSpinner('running');
        break;

      case 'agent.mcp_tool_use':
        stopSpinner();
        console.log(c.cyan(`◆ ${event.mcp_server_name}.${event.name}`) + ' ' + c.dim(previewInput(event.input)));
        startSpinner('running');
        break;

      case 'agent.tool_result':
      case 'agent.mcp_tool_result':
        stopSpinner();
        if ((event as { is_error?: boolean }).is_error) {
          console.log(c.red('  ✗ error'));
        } else {
          console.log(c.green('  ✓'));
        }
        startSpinner('thinking');
        break;

      case 'agent.message':
        stopSpinner();
        for (const block of event.content) {
          if (block.type === 'text') process.stdout.write(c.bold(block.text));
        }
        process.stdout.write('\n');
        break;

      case 'agent.thread_context_compacted':
        stopSpinner();
        console.log(c.yellow('  ⚡ context compacted'));
        startSpinner('thinking');
        break;

      case 'session.error':
        stopSpinner();
        console.error(c.red('\n✗ ' + JSON.stringify(event)));
        return;

      case 'session.status_terminated':
        stopSpinner();
        console.log(c.dim('\n[session terminated]'));
        process.exit(0);

      case 'session.status_idle':
        if (event.stop_reason.type === 'requires_action') {
          startSpinner('waiting on tool approval');
          continue;
        }
        stopSpinner();
        process.stdout.write('\n');
        return;
    }
  }
}

while (true) {
  const input = (await rl.question(c.bold('› '))).trim();
  if (!input) continue;
  await turn(input);
}
