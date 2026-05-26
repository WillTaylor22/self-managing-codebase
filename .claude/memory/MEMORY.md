# Self-Managing Codebase Agent Memory

This file is the **index**. Each entry is one line: `[type/slug](file.md) — one-line hook`.
Keep this file under 200 lines — anything longer is content bloat, not memory.

## Learnings
- [learnings/sentry-mcp-no-comment-tool](learnings/2026-05-26-sentry-mcp-no-comment-tool.md) — Sentry MCP can't comment on issues; back-link from Linear only
- [learnings/vercel-blocks-unknown-author-email](learnings/2026-05-26-vercel-blocks-unknown-author-email.md) — Vercel preview deploys block when commit author email has no GitHub account; use the noreply alias
- [learnings/sandbox-cant-clone-private-repo](learnings/2026-05-26-sandbox-cant-clone-private-repo.md) — Don't `git clone` from sandbox bash; the `github_repository` resource is auth'd, raw `git clone` is not
- [learnings/github-mcp-strips-html-comments](learnings/2026-05-26-github-mcp-strips-html-comments.md) — `update_pull_request` silently strips `<!-- ... -->` from PR bodies; session-id marker can't be set by agent (ENG-25)
- [learnings/recheck-open-prs-at-pr-open](learnings/2026-05-26-recheck-open-prs-at-pr-open.md) — session-start grep is insufficient; re-grep `list_pull_requests` right before `create_pull_request` to catch parallel-session races (PR #18 vs #20 ENG-25)
- [learnings/review-feedback-fanout](learnings/2026-05-26-review-feedback-fanout.md) — multiple REQUEST_CHANGES comments fire multiple manager sessions; fetch + check head-branch commits newer than the reviewer comment before doing work (PR #20)

## Decisions
- [decisions/mcp-for-small-writes-checkout-for-big](decisions/2026-05-26-mcp-for-small-writes-checkout-for-big.md) — Single-file writes go through GitHub MCP; multi-file or test-needing changes use the mounted checkout + `git push`
- [decisions/two-agent-builder-reviewer](decisions/2026-05-25-two-agent-builder-reviewer.md) — Separate agents for build vs. review so the reviewer reads diffs cold

## Conventions
- [conventions/pr-session-id-marker](conventions/pr-session-id-marker.md) — PR body MUST end with `<!-- session-id: sesn_... -->` (or legacy `sthr_...`) so webhooks can resume
- [conventions/agent-review-marker](conventions/agent-review-marker.md) — Reviewer's verdict goes on the first line as `AGENT_REVIEW: APPROVED|REQUEST_CHANGES|ESCALATE — <rationale>`
- [conventions/check-open-pr-before-ticket-pickup](conventions/check-open-pr-before-ticket-pickup.md) — Before branching for a Linear ticket, grep open PRs for the ticket ID; abort if one already exists (PR #15 vs #16 ENG-26 race)
