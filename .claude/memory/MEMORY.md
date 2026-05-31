# Self-Managing Codebase Agent Memory

This file is the **index**. Each entry is one line: `[type/slug](file.md) — one-line hook`.
Keep this file under 200 lines — anything longer is content bloat, not memory.

## Learnings
- [learnings/sentry-mcp-no-comment-tool](learnings/2026-05-26-sentry-mcp-no-comment-tool.md) — Sentry MCP can't comment on issues; back-link from Linear only
- [learnings/vercel-blocks-unknown-author-email](learnings/2026-05-26-vercel-blocks-unknown-author-email.md) — Vercel preview deploys block when commit author email has no GitHub account; use the noreply alias
- [learnings/sandbox-cant-clone-private-repo](learnings/2026-05-26-sandbox-cant-clone-private-repo.md) — Don't `git clone` from sandbox bash; the `github_repository` resource is auth'd, raw `git clone` is not
- [learnings/github-mcp-strips-html-comments](learnings/2026-05-26-github-mcp-strips-html-comments.md) — `create_pull_request` AND `update_pull_request` strip `<!-- ... -->` from PR bodies; ENG-25 resolved by moving the session-id marker to a plain-text line
- [learnings/regex-last-match-semantics](learnings/2026-05-26-regex-last-match-semantics.md) — `String.match(/.../m)` returns FIRST match; for "last line of body" use `matchAll(...).at(-1)` (PR #20 bug)
- [learnings/recheck-open-prs-at-pr-open](learnings/2026-05-26-recheck-open-prs-at-pr-open.md) — session-start grep is insufficient; re-grep `list_pull_requests` right before `create_pull_request` to catch parallel-session races (PR #18 vs #20 ENG-25)
- [learnings/closed-pr-receives-review-after-close](learnings/2026-05-26-closed-pr-receives-review-after-close.md) — Closed PR can still get a REQUEST_CHANGES review seconds after dup-close; don't reopen, surface to sibling PR + Linear (PR #18 vs #20 ENG-25 race)
- [learnings/review-feedback-fanout](learnings/2026-05-26-review-feedback-fanout.md) — multiple REQUEST_CHANGES comments fire multiple manager sessions; fetch + check head-branch commits newer than the reviewer comment before doing work (PR #20)
- [learnings/vercel-bot-status-as-deploy-health-fallback](learnings/2026-05-26-vercel-bot-status-as-deploy-health-fallback.md) — When Vercel MCP/CLI auth is broken, read the GitHub Vercel-bot's commit status on the latest PR HEAD as a deploy-health fallback
- [learnings/manager-agent-yaml-needs-manual-bootstrap](learnings/2026-05-26-manager-agent-yaml-needs-manual-bootstrap.md) — `manager.agent.yaml` edits do NOT auto-deploy; a human must run `npm run bootstrap` from `ai-manager/` with `ANTHROPIC_API_KEY`+`AGENT_ID` to push the prompt to the live agent (ENG-28)
- [learnings/sentry-dedupe-must-check-closed-tickets](learnings/2026-05-27-sentry-dedupe-must-check-closed-tickets.md) — step-2 Sentry dedupe must match closed tickets too, not just open — canary errors (no Sentry write tools / ENG-21) get re-filed forever otherwise (APP-1 → ENG-17 closed → ENG-29 dup)
- [learnings/fetch-before-merge-on-long-lived-branch](learnings/2026-05-27-fetch-before-merge-on-long-lived-branch.md) — On long-lived branches, run `git fetch origin <base>` before `git merge origin/<base>`; local origin ref goes stale during review-feedback rounds (PR #12 round 3 escalation)
- [learnings/git-checkout-theirs-replaces-whole-file](learnings/2026-05-27-git-checkout-theirs-replaces-whole-file.md) — `git checkout --theirs <path>` during a merge replaces the WHOLE file, silently reverting unrelated edits earlier on the branch; verify with `git diff origin/<base>` afterwards (PR #29 round 1)
- [learnings/verify-ticket-issues-still-exist-on-main](learnings/2026-05-28-verify-ticket-issues-still-exist-on-main.md) — Re-read the ticket's target file in current `origin/<base>` before drafting; humans push small fixes direct-to-main between ticket creation and agent pickup (PR #29 ENG-30 round 1)
- [learnings/vercel-mcp-silently-hides-projects](learnings/2026-05-31-vercel-mcp-silently-hides-projects.md) — Vercel MCP can return only a subset of a team's projects even with the right teamId — `get_project(self-managing-codebase)` 404'd despite the project being healthy; use the curl+Vercel-bot fallback, don't assume it was deleted

## Decisions
- [decisions/mcp-for-small-writes-checkout-for-big](decisions/2026-05-26-mcp-for-small-writes-checkout-for-big.md) — Single-file writes go through GitHub MCP; multi-file or test-needing changes use the mounted checkout + `git push`
- [decisions/two-agent-builder-reviewer](decisions/2026-05-25-two-agent-builder-reviewer.md) — Separate agents for build vs. review so the reviewer reads diffs cold

## Conventions
- [conventions/pr-session-id-marker](conventions/pr-session-id-marker.md) — PR body MUST end with plain-text `session-id: sesn_...` on its own line; legacy `<!-- session-id: ... -->` shape also matched but stripped by MCP (ENG-25)
- [conventions/agent-review-marker](conventions/agent-review-marker.md) — Reviewer's verdict goes on the first line as `AGENT_REVIEW: APPROVED|REQUEST_CHANGES|ESCALATE — <rationale>`
- [conventions/check-open-pr-before-ticket-pickup](conventions/check-open-pr-before-ticket-pickup.md) — Before branching for a Linear ticket, grep open PRs for the ticket ID; abort if one already exists (PR #15 vs #16 ENG-26 race)
