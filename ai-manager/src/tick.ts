import Anthropic from '@anthropic-ai/sdk';

const required = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var: ${k}`);
  return v;
};

const AGENT_ID = required('AGENT_ID');
const ENV_ID = required('ENV_ID');
const VAULT_ID = required('VAULT_ID');
const GITHUB_PAT = required('GITHUB_PAT');
const BLOB_READ_WRITE_TOKEN = required('BLOB_READ_WRITE_TOKEN');

const customGoal = process.argv.slice(2).join(' ').trim();

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
  title: `tick ${new Date().toISOString()}`,
});

console.log(`Session: ${session.id}`);

const sessionEnv = `Session env (export these at the start of your shell, before any other work):
  export BLOB_READ_WRITE_TOKEN='${BLOB_READ_WRITE_TOKEN}'
The token is scoped to the public 'pr-media-2' Vercel Blob store — used by step 4(j) to upload PR preview media.`;

const baseGoal =
  customGoal ||
  `Wake up. Your session id is ${session.id} — when you open a PR, include "<!-- session-id: ${session.id} -->" as the last line of the PR body so future webhooks can resume this session. Run the operational loop in your system prompt. Stop when there is nothing left.`;

const goal = `${baseGoal}\n\n${sessionEnv}`;

const stream = await client.beta.sessions.events.stream(session.id);
await client.beta.sessions.events.send(session.id, {
  events: [{ type: 'user.message', content: [{ type: 'text', text: goal }] }],
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
      process.exit(1);
    case 'session.status_terminated':
      console.log('\n[session terminated]');
      process.exit(0);
    case 'session.status_idle':
      if (event.stop_reason.type === 'requires_action') continue;
      console.log('\n[done]');
      process.exit(0);
  }
}
