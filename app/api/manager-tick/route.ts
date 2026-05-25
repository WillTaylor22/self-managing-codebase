import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response('unauthorized', { status: 401 });
    }
  }

  if (
    !process.env.AGENT_ID ||
    !process.env.ENV_ID ||
    !process.env.VAULT_ID ||
    !process.env.GITHUB_PAT ||
    !process.env.ANTHROPIC_API_KEY
  ) {
    return Response.json({ skipped: 'manager env not configured' });
  }

  const client = new Anthropic();

  const session = await client.beta.sessions.create({
    agent: process.env.AGENT_ID,
    environment_id: process.env.ENV_ID,
    vault_ids: [process.env.VAULT_ID],
    resources: [
      {
        type: 'github_repository',
        url: 'https://github.com/WillTaylor22/self-managing-codebase',
        authorization_token: process.env.GITHUB_PAT,
        mount_path: '/workspace/repo',
      },
    ],
    title: `cron-tick ${new Date().toISOString()}`,
  });

  await client.beta.sessions.events.send(session.id, {
    events: [
      {
        type: 'user.message',
        content: [
          {
            type: 'text',
            text: `Wake up. Your session id is ${session.id} — when you open a PR, include "<!-- session-id: ${session.id} -->" as the last line of the PR body so future webhooks can resume this session. Run the operational loop in your system prompt. Stop when there is nothing left.`,
          },
        ],
      },
    ],
  });

  return Response.json({ session: session.id, fired_at: new Date().toISOString() });
}
