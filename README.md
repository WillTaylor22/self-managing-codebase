# Self-managing codebase

> A demo app maintained — observed, fixed, reviewed, and shipped — by an autonomous agent. Humans only step in for hard cases.

## TL;DR

- **What.** A live Next.js travel-planner app whose maintenance work (bug fixes, error triage, dependency upkeep, small features) is done by a long-running AI agent.
- **How.** A cloud-hosted Anthropic Managed Agent runs every 30 minutes (and on GitHub webhooks). It checks Vercel + Sentry, files Linear tickets for new issues, picks up tickets, writes code, runs Playwright tests against a local dev server, opens PRs.
- **Reviewed by another agent.** A separate reviewer agent reads each PR cold, builds, runs tests, posts approve / request-changes / escalate. Three rounds of changes → escalates to a human.
- **Learns.** Each session can append to `.claude/memory/`. A retro agent runs daily, summarises 24h of activity in a Linear project update, and proposes memory edits as a PR.

## Why

Production apps need constant care: stack traces to triage, slow endpoints to investigate, libraries to upgrade, regressions to roll back. That work eats focus time and often demands on-call rotations.

This repo is a working demo of pushing that work onto an AI agent — with another agent as a safety net.

## How it works

**Two cron-driven loops + webhook-driven resumes**

1. **Manager** (`/api/manager-tick`, every 30 min). Reads memory, checks Vercel + Sentry, files tickets, picks up one Linear ticket, runs the dev loop locally in a sandbox (install, dev server, Playwright, build, lint), opens a PR.
2. **Reviewer** (`/api/reviewer-tick`, every 30 min). Reads each open PR cold, builds, runs e2e, posts `AGENT_REVIEW: APPROVED | REQUEST_CHANGES | ESCALATE`.
3. **Webhooks** (`/api/github-webhook`). PR opens → reviewer fires immediately. Reviewer approval → manager session resumes (full context) and squash-merges.

**Daily retro** (`/api/retro-tick`, 07:00 UTC). Reads 24h of activity, posts a Linear project update with a health field, and proposes `.claude/memory/` edits as a PR.

**Stack**

- **Anthropic Managed Agents** — three agents (manager, reviewer, retro), all running in cloud sandboxes with a mounted clone of this repo.
- **Linear MCP** — tickets, comments, project updates.
- **GitHub MCP** — PRs, reviews, files.
- **Vercel MCP** — deployments, logs.
- **Sentry MCP** — runtime errors.
- **Vercel** — hosting + cron + webhooks for the orchestration routes.
- **Playwright** — e2e tests inside the sandbox.

**Structure**

```
app/                Next.js travel-planner (the demo product)
ai-manager/         Agent YAML configs, OAuth helpers, bootstrap scripts
app/api/*-tick/     Vercel cron entry points
app/api/github-webhook/  Event-driven trigger
.claude/memory/     Persistent agent memory (learnings, decisions, conventions)
tests/e2e/          Playwright suite
```

## Quick start

```bash
npm run manager           # interactive REPL into a manager session
npm run manager:tick      # one-shot operational loop, prints transcript
npm run manager:bootstrap # apply agent YAML changes to the live agent
```

## Limitations

- **Bring your own infrastructure.** The agent cannot create Vercel projects, set env vars, register OAuth apps, or pay for services. Bootstrapping is human-only.
- **Account-scoped credentials.** The Vercel MCP credential covers the whole account, not just this project. Acceptable for a demo, not for a multi-tenant deployment.
- **No product analytics or feedback loop.** Easy to add (PostHog MCP, etc.), not done here.
- **Single-agent throughput.** WIP limit of 1 — the manager won't pick up a second ticket while another is in flight. Keeps things simple, caps throughput.

## Contact

If this inspired you to wire up your own — or if you want to swap notes — reach me at [willtay.com](https://willtay.com/).
