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
    !process.env.RETRO_AGENT_ID ||
    !process.env.ENV_ID ||
    !process.env.VAULT_ID ||
    !process.env.GITHUB_PAT ||
    !process.env.ANTHROPIC_API_KEY
  ) {
    return Response.json({ skipped: 'retro env not configured' });
  }

  const client = new Anthropic();

  const session = await client.beta.sessions.create({
    agent: process.env.RETRO_AGENT_ID,
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
    title: `retro-tick ${new Date().toISOString()}`,
  });

  await client.beta.sessions.events.send(session.id, {
    events: [
      {
        type: 'user.message',
        content: [
          {
            type: 'text',
            text: 'Wake up. Run the daily retrospective per your system prompt. Then stop.',
          },
        ],
      },
    ],
  });

  return Response.json({ session: session.id, fired_at: new Date().toISOString() });
}
