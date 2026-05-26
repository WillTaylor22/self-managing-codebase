import Anthropic from '@anthropic-ai/sdk';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;

const REPO_URL = 'https://github.com/WillTaylor22/self-managing-codebase';

function verifySignature(rawBody: string, sigHeader: string | null, secret: string): boolean {
  if (!sigHeader) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(sigHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function extractSessionId(text: string | undefined | null): string | null {
  if (!text) return null;
  const m = text.match(/<!--\s*session-id:\s*((?:sthr_|sesn_)[A-Za-z0-9]+)\s*-->/);
  return m?.[1] ?? null;
}

async function fetchPrBody(prNumber: number, token: string): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/WillTaylor22/self-managing-codebase/pulls/${prNumber}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { body?: string | null };
  return json.body ?? null;
}

function envReady(): boolean {
  return Boolean(
    process.env.AGENT_ID &&
      process.env.REVIEWER_AGENT_ID &&
      process.env.ENV_ID &&
      process.env.VAULT_ID &&
      process.env.GITHUB_PAT &&
      process.env.ANTHROPIC_API_KEY,
  );
}

function repoResource() {
  return {
    type: 'github_repository' as const,
    url: REPO_URL,
    authorization_token: process.env.GITHUB_PAT!,
    mount_path: '/workspace/repo',
  };
}

async function fireReviewer(prNumber: number, action: string): Promise<string> {
  const client = new Anthropic();
  const session = await client.beta.sessions.create({
    agent: process.env.REVIEWER_AGENT_ID!,
    environment_id: process.env.ENV_ID!,
    vault_ids: [process.env.VAULT_ID!],
    resources: [repoResource()],
    title: `webhook reviewer PR#${prNumber} (${action})`,
  });
  await client.beta.sessions.events.send(session.id, {
    events: [
      {
        type: 'user.message',
        content: [
          {
            type: 'text',
            text: `PR #${prNumber} was ${action === 'opened' ? 'opened' : 'updated with new commits'}. Review it per your system prompt. Then stop.`,
          },
        ],
      },
    ],
  });
  return session.id;
}

async function resumeOrFireManager(prNumber: number, instructionText: string): Promise<string> {
  const client = new Anthropic();
  const body = await fetchPrBody(prNumber, process.env.GITHUB_PAT!);
  const existing = extractSessionId(body);

  if (existing) {
    try {
      await client.beta.sessions.events.send(existing, {
        events: [{ type: 'user.message', content: [{ type: 'text', text: instructionText }] }],
      });
      return existing;
    } catch {
      // Fall through to fresh session
    }
  }

  const session = await client.beta.sessions.create({
    agent: process.env.AGENT_ID!,
    environment_id: process.env.ENV_ID!,
    vault_ids: [process.env.VAULT_ID!],
    resources: [repoResource()],
    title: `webhook manager PR#${prNumber}`,
  });
  await client.beta.sessions.events.send(session.id, {
    events: [
      {
        type: 'user.message',
        content: [
          {
            type: 'text',
            text: `Your session id is ${session.id}. ${instructionText}`,
          },
        ],
      },
    ],
  });
  return session.id;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return Response.json({ skipped: 'GITHUB_WEBHOOK_SECRET not set' });

  const sig = req.headers.get('x-hub-signature-256');
  if (!verifySignature(rawBody, sig, secret)) {
    return new Response('invalid signature', { status: 401 });
  }

  if (!envReady()) return Response.json({ skipped: 'agent env not configured' });

  const event = req.headers.get('x-github-event');
  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const action = payload.action as string | undefined;

  if (event === 'pull_request' && (action === 'opened' || action === 'synchronize')) {
    const pr = payload.pull_request as { number: number };
    const sessionId = await fireReviewer(pr.number, action);
    return Response.json({ event, action, pr: pr.number, reviewer_session: sessionId });
  }

  if (event === 'issue_comment' && action === 'created') {
    const issue = payload.issue as { number: number; pull_request?: unknown };
    const comment = payload.comment as { body: string };
    if (!issue.pull_request) return Response.json({ skipped: 'not a PR comment' });

    const firstLine = comment.body.split('\n')[0]?.trim() ?? '';
    if (firstLine.startsWith('AGENT_REVIEW: APPROVED')) {
      const sessionId = await resumeOrFireManager(
        issue.number,
        `PR #${issue.number} was just APPROVED by the reviewer agent. Verify CI is green, then squash-merge it and move the Linear ticket to Done. If CI is still pending, wait and stop — a future tick will pick this up.`,
      );
      return Response.json({ event, action, pr: issue.number, manager_session: sessionId, decision: 'merge' });
    }
    if (firstLine.startsWith('AGENT_REVIEW: REQUEST_CHANGES')) {
      const sessionId = await resumeOrFireManager(
        issue.number,
        `Reviewer requested changes on PR #${issue.number}. Read the reviewer's comment, address the feedback on the same branch, commit, push. Respect the 3-round limit in your system prompt.`,
      );
      return Response.json({ event, action, pr: issue.number, manager_session: sessionId, decision: 'revise' });
    }
    if (firstLine.startsWith('AGENT_REVIEW: ESCALATE')) {
      return Response.json({ event, action, pr: issue.number, decision: 'escalated to human' });
    }
    return Response.json({ skipped: 'not an AGENT_REVIEW comment' });
  }

  if (event === 'pull_request' && action === 'closed') {
    const pr = payload.pull_request as { number: number; merged: boolean };
    if (pr.merged) {
      const sessionId = await resumeOrFireManager(
        pr.number,
        `PR #${pr.number} was merged. Move the Linear ticket to Done. Then run your operational loop to pick up the next item.`,
      );
      return Response.json({ event, action, pr: pr.number, manager_session: sessionId, decision: 'post-merge' });
    }
  }

  return Response.json({ ignored: { event, action } });
}
