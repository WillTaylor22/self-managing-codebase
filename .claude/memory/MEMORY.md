# Self-Managing Codebase Agent Memory

This file is the **index**. Each entry is one line: `[type/slug](file.md) — one-line hook`.
Keep this file under 200 lines — anything longer is content bloat, not memory.

## Learnings
- [learnings/sentry-mcp-no-comment-tool](learnings/2026-05-26-sentry-mcp-no-comment-tool.md) — Sentry MCP can't comment on issues; back-link from Linear only
- [learnings/vercel-blocks-unknown-author-email](learnings/2026-05-26-vercel-blocks-unknown-author-email.md) — Vercel preview deploys block when commit author email has no GitHub account; use the noreply alias
- [learnings/sandbox-cant-clone-private-repo](learnings/2026-05-26-sandbox-cant-clone-private-repo.md) — Don't `git clone` from sandbox bash; the `github_repository` resource is auth'd, raw `git clone` is not
- [learnings/github-mcp-strips-html-comments](learnings/2026-05-26-github-mcp-strips-html-comments.md) — `update_pull_request` silently strips `<!-- ... -->` from PR bodies; session-id marker can't be set by agent (ENG-25)

## Decisions
- [decisions/mcp-for-small-writes-checkout-for-big](decisions/2026-05-26-mcp-for-small-writes-checkout-for-big.md) — Single-file writes go through GitHub MCP; multi-file or test-needing changes use the mounted checkout + `git push`
- [decisions/two-agent-builder-reviewer](decisions/2026-05-25-two-agent-builder-reviewer.md) — Separate agents for build vs. review so the reviewer reads diffs cold

## Conventions
- [conventions/pr-session-id-marker](conventions/pr-session-id-marker.md) — PR body MUST end with plain-text `session-id: sesn_...` line so webhooks can resume (HTML-comment shape was stripped by MCP — ENG-25)
- [conventions/agent-review-marker](conventions/agent-review-marker.md) — Reviewer's verdict goes on the first line as `AGENT_REVIEW: APPROVED|REQUEST_CHANGES|ESCALATE — <rationale>`
