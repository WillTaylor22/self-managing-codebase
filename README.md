# Autonomous Coding Agent

A demo showcasing an app maintained by a 100% autonomous, self-learning agent.

<img width="1842" height="1110" alt="image" src="https://github.com/user-attachments/assets/da888f32-5e40-474a-b9f0-f1fb116cc445" />

_This same agent pushing to prod at our startup [Versey](https://www.versey.ai)._

## Install
```
# temporarily clone the codebase
git clone https://github.com/WillTaylor22/self-managing-codebase temp 

# start an agent
claude [--dangerously-skip-permissions]

# let the agent drive
On a new worktree, implement the full AI manager setup demonstrated in temp/self-managing-codebase
```

## Motivation

Even firing up Codex or Claude Code means context switching. Think a level higher. Imagine a super-intelligent and proactive engineer that both receives tasks and creates it own tasks by monitoring it's environment. You can send it messages in Slack or tickets in Linear, and it monitors various observability surfaces such as Sentry, Posthog, Snyk and Vercel to identify tasks. All PRs have screenshots and a video for verification, and it is paired with an independent review agent which confirms quality and security.

Production apps need constant care: errors and stack traces to triage, slow endpoints to investigate, libraries to upgrade, regressions to roll back. That work eats developer time and can require on-call rotations.

This repo is demo that showcases what is possible in pushing those tasks onto a long-horizon agent.

## What's in the repo?

- **The demo product.** The demo product is a Next.js travel-planner app.
- **The managing agent.** A cloud-hosted Anthropic Managed Agent runs every 30 minutes (and on GitHub webhooks). It monitors Vercel + Sentry, files Linear tickets for new issues, picks up tickets, writes code, runs Playwright to view it's own work in a local dev server, and opens PRs.
- **The review agent.** A separate reviewer agent reads each PR cold, builds, runs tests, posts approve / request-changes / escalate. Three rounds of changes → escalates to a human.
- **The retro agent.** The agent system is self-learning. Each session can append to `.claude/memory/`. A retro agent runs daily, summarises 24h of activity in a Linear project update, and proposes memory edits as a PR.

## How it works

**Two cron-driven loops + webhook-driven resumes**

1. **Manager** (`/api/manager-tick`, every 30 min). Reads memory, checks Vercel + Sentry, files tickets, picks up one Linear ticket, runs the dev loop locally in a sandbox (install, dev server, Playwright, build, lint), opens a PR.
2. **Reviewer** (`/api/reviewer-tick`, every 30 min). Reads each open PR cold, builds, runs e2e, posts `AGENT_REVIEW: APPROVED | REQUEST_CHANGES | ESCALATE`.
3. **Webhooks** (`/api/github-webhook`). PR opens → reviewer fires immediately. Reviewer approval → manager session resumes (full context) and squash-merges.

**Daily retro** (`/api/retro-tick`, 07:00 UTC). Reads 24h of activity, posts a Linear project update with a health field, and proposes `.claude/memory/` edits as a PR.

**Stack**

- **Anthropic Managed Agents** — three agents (manager, reviewer, retro), all running in filesystem-backed cloud sandboxes with a mounted clone of this repo.
- **Linear MCP** — Store and control plane for tasks; also the location where the agent provides project updates.
- **GitHub MCP** — PRs, reviews, files.
- **Vercel MCP** — deployments, logs.
- **Sentry MCP** — runtime errors.
- **Vercel** — hosting + cron + webhooks for the orchestration routes.
- **Playwright** — e2e tests inside the sandbox.

## Quick start

```bash
npm run manager           # interactive REPL into a manager session
npm run manager:tick      # one-shot operational loop, prints transcript
npm run manager:bootstrap # apply agent YAML changes to the live agent
```

## Known limitations

- **Set cost controls** Managed agents could run up the bill quickly. Set a limit before you begin and consider using cheaper models wbere possible.
- **Bring your own infrastructure.** The agent cannot create infrastructure, set env vars, register OAuth apps, or pay for services. Bootstrapping is human-only.
- **Setting up per-PR screenshots & videos** This can be fiddly to set up inside the Managed Agents. The best approach I've found is to create a Vercel preview environment and have photos taken against that.
- **Further observability.** Product analytics, metrics and so on are trivial to add once the agent is running, and thus not done here.
- **Single-agent throughput.** WIP limit of 1 — the manager won't pick up a second ticket while another is in flight. Keeps things simple, caps throughput.

## Contact

I hope this inspires you to set up your own. If you would like to swap notes, I can be reached at [willtay.com](https://willtay.com/).
