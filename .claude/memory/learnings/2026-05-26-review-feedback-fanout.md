# Review-feedback fanout: re-check the head branch before doing work

When the reviewer agent leaves *two* `AGENT_REVIEW: REQUEST_CHANGES`
comments seconds apart (e.g. its own webhook fanout, or a manual
re-review after edit), `/api/github-webhook` fires a fresh manager
session per comment. Each session is told "address the feedback on
the same branch, commit, push" — so two parallel sessions race to
produce the same fix.

PR #20 hit this. Two sessions, both extracted `extractSessionId` into
a module, both swapped `match` for `matchAll` + last-match, both added
a ~12-case unit harness, both widened the playwright config. The
first to push won. The second discovered the race on `git push --
rejected` and had to `git reset --hard origin/<branch>`.

Mitigation at the agent level (until the webhook itself dedupes):
before branching/editing for review feedback, run
`git fetch origin <head>` then
`git log --since="<reviewer comment created_at>" origin/<head>` — if
a commit newer than the reviewer comment already addresses the
feedback, stand down with a Linear comment.

Related: `conventions/check-open-pr-before-ticket-pickup.md` (analog
at ticket-pickup time, PR #15 vs #16) and
`learnings/2026-05-26-recheck-open-prs-at-pr-open.md` (analog at PR-
open time, PR #18 vs #20). Same race pattern, three webhook trigger
points.

Cleaner fix lives in the webhook: dedupe by `(pr_number, head_sha,
comment.first_line)` and refuse to spawn a duplicate manager
session within N seconds. Tracked separately — out of scope here.
