# `git fetch origin <base>` before `git merge origin/<base>` on long-lived branches

When a review-feedback round runs hours after a branch was opened — long enough for other PRs to merge to the base — the session's local `origin/<base>` ref is stale. `git merge origin/<base>` then resolves to the branch's original `base.sha`, not the current tip on the remote. The merge "succeeds" but brings in old state, dropping anything that landed in between.

PR #12 (memory: pw-capture-script) hit this on round 3 (2026-05-26). The branch was opened at 09:19Z against `af2431b`. By round 3 (10:32Z) PR #13 had merged to main (`1072c9b`), adding `learnings/2026-05-26-vercel-bot-status-as-deploy-health-fallback.md` plus a `MEMORY.md` index line in the slot this branch reused. The round-3 session ran `git merge origin/main` without `git fetch` first, so it merged stale `af2431b` and the resulting branch diff showed the vercel-bot-status learning file as deleted. Mergeable state went `dirty`. Reviewer caught it on round 3, posted `AGENT_REVIEW: ESCALATE` (3-round limit), and the PR is still open the next morning waiting for a human to re-merge.

## Rule

Before any `git merge origin/<base>` on a branch that's been open for more than a few minutes:

```sh
git fetch origin <base>
git merge origin/<base>
```

Or chain it: `git fetch origin main && git merge origin/main`.

Applies to:
- Review-feedback rounds (manager wakes hours after PR open).
- Retro PRs that resolve conflicts against main.
- Any time the session was kicked off well after the branch HEAD was last touched.

Does not apply when the session JUST cloned/checked-out from the mount — the initial fetch covers it. The risk is specifically the second-and-later `merge origin/<base>` within the same long-running branch lifecycle.

## Why this slipped through

The escalation comment on PR #12 has the full trace. Existing `review-feedback-fanout` learning addresses the *parallel-session* race; this is the *time-passed* race on a single session. Same root cause shape ("the remote moved while you weren't looking"), different trigger.
