# Re-read the ticket's target file in current `origin/<base>` before drafting fixes

For docs/copy tickets — and any ticket where the acceptance criteria are
described by line/snippet against a specific file — the criteria can be
moot by the time the agent starts drafting. Humans push small fixes
direct-to-main (no PR, no ticket reference) constantly, especially on
README and other docs. The window between ticket creation and agent
pickup is wide enough for entire sections to be rewritten.

Mitigation: after `git checkout -b`, before writing any code, run

```sh
git fetch origin <base>
git log origin/<base> --since=<ticket.createdAt> -- <target-files>
```

and re-read each target file at `origin/<base>:<path>`. If the file has
been touched since the ticket was filed, manually re-validate each
acceptance criterion against current content. Drop any criterion whose
fix is already in main; narrow the PR scope before pushing.

## Anchor — PR #29 / ENG-30 (2026-05-27)

Timeline:

- `15:20:26Z` PR #28 (human) merged — README install section rewritten.
- `15:22:26Z` reviewer agent files ENG-30 with **4** acceptance criteria
  based on the just-merged PR #28 state.
- **`15:23:01Z` human pushes `a028eb3` directly to `main`** (no PR,
  no ticket reference) — rewrites the install section AGAIN, addressing
  3 of ENG-30's 4 criteria.
- `15:23:20Z` manager agent opens PR #29, forked off `a028eb3` (so the
  fetch was current), but drafted all 4 fixes from the ticket without
  re-reading the file in current main.
- Round 1: reviewer flags 3 of 4 fixes as already-applied. Agent merges
  main, drops 3 fixes, narrows to 1 line, ships. Cost: one extra review
  round, one extra build/lint pass, one stale draft on the wire.

The agent's fetch was current; the bug was trusting the ticket's
snapshot of the file over the file itself. Re-reading the file at
`origin/main:README.md` before drafting would have caught all 3
already-fixed criteria in seconds.

## Distinct from existing learnings

- `check-open-pr-before-ticket-pickup` / `recheck-open-prs-at-pr-open` —
  agent-vs-agent races at ticket-pickup and PR-open time. Direct-to-main
  commits don't show up in `list_pull_requests` so the PR-grep
  mitigation doesn't catch them.
- `fetch-before-merge-on-long-lived-branch` — staleness at merge time,
  on a long-lived branch. This is staleness at draft time, on a fresh
  branch.
- The shape is: "reviewer-filed ticket snapshots a file; humans rewrite
  the file in the gap; agent drafts against the snapshot."

## Doesn't apply when

- The ticket's acceptance criteria don't reference specific file
  content (feature tickets, infra tickets).
- The branch was opened within seconds of the ticket (no realistic
  window for a direct-to-main commit).
- The reviewer agent's filing timestamp matches the ticket's described
  base SHA — implies the reviewer read against current main.
