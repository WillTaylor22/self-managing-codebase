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

const client = new Anthropic();

const session = await client.beta.sessions.create({
  agent: AGENT_ID,
  environment_id: ENV_ID,
  vault_ids: [VAULT_ID],
  title: `Manager session ${new Date().toISOString()}`,
});

console.log(`Session: ${session.id}`);
console.log('Type a message and hit enter. Ctrl-C to exit.\n');

const rl = readline.createInterface({ input: stdin, output: stdout });

async function turn(userText: string): Promise<void> {
  const stream = await client.beta.sessions.events.stream(session.id);

  await client.beta.sessions.events.send(session.id, {
    events: [{ type: 'user.message', content: [{ type: 'text', text: userText }] }],
  });

  for await (const event of stream) {
    switch (event.type) {
      case 'agent.message':
        for (const block of event.content) {
          if (block.type === 'text') process.stdout.write(block.text);
        }
        break;
      case 'agent.mcp_tool_use':
        process.stdout.write(`\n[linear:${event.name}] `);
        break;
      case 'agent.tool_use':
        process.stdout.write(`\n[${event.name}] `);
        break;
      case 'session.error':
        console.error('\n[error]', event);
        return;
      case 'session.status_terminated':
        console.log('\n[session terminated]');
        process.exit(0);
      case 'session.status_idle':
        if (event.stop_reason.type === 'requires_action') continue;
        process.stdout.write('\n');
        return;
    }
  }
}

while (true) {
  const input = (await rl.question('> ')).trim();
  if (!input) continue;
  await turn(input);
}
