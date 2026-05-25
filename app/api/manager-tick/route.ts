import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 300;

const need = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var: ${k}`);
  return v;
};

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response('unauthorized', { status: 401 });
    }
  }

  if (!process.env.AGENT_ID || !process.env.ENV_ID || !process.env.VAULT_ID || !process.env.ANTHROPIC_API_KEY) {
    return Response.json({ skipped: 'manager env not configured' });
  }
  const AGENT_ID = need('AGENT_ID');
  const ENV_ID = need('ENV_ID');
  const VAULT_ID = need('VAULT_ID');

  const client = new Anthropic();

  const session = await client.beta.sessions.create({
    agent: AGENT_ID,
    environment_id: ENV_ID,
    vault_ids: [VAULT_ID],
    title: `cron-tick ${new Date().toISOString()}`,
  });

  const stream = await client.beta.sessions.events.stream(session.id);
  await client.beta.sessions.events.send(session.id, {
    events: [
      {
        type: 'user.message',
        content: [
          {
            type: 'text',
            text: 'Wake up. Run the operational loop in your system prompt. Stop when there is nothing left.',
          },
        ],
      },
    ],
  });

  const transcript: string[] = [];
  for await (const event of stream) {
    if (event.type === 'agent.message') {
      for (const block of event.content) {
        if (block.type === 'text') transcript.push(block.text);
      }
    } else if (event.type === 'session.error') {
      return Response.json({ session: session.id, error: event }, { status: 500 });
    } else if (event.type === 'session.status_terminated') {
      break;
    } else if (event.type === 'session.status_idle') {
      if (event.stop_reason.type === 'requires_action') continue;
      break;
    }
  }

  return Response.json({ session: session.id, transcript: transcript.join('') });
}
