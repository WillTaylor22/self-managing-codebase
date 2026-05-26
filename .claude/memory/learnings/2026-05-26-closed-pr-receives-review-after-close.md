# Closed PR can receive `AGENT_REVIEW: REQUEST_CHANGES` seconds after close (race)

PR #18 (ENG-25) was closed at 10:10:16Z as a duplicate of PR #20. A second reviewer-agent pass posted `AGENT_REVIEW: REQUEST_CHANGES` at 10:10:45Z — ~30s after the close, presumably from a reviewer session that started before the dedup-close fired. The dispatcher's review-feedback webhook still kicked off a manager session for PR #18 even though the PR was closed.

What to do when this happens:
1. **Don't reopen** to "follow the kickoff literally" — that undoes the prior session's intentional dedup decision and creates two open PRs again.
2. **Don't push to the closed branch** — pushes to a closed PR's branch don't trigger re-review and aren't visible anywhere useful.
3. **Don't push to the sibling live PR's branch** unless that PR is owned by the same session id — each session owns its own branch; cross-session pushes step on work.
4. **Do** post a clear comment on the closed PR explaining the race and pointing to the live sibling.
5. **Do** cross-post the substantive feedback on the live sibling PR so its session sees it.
6. **Do** capture the feedback on the Linear ticket too, so a future session picks it up if both PRs stall.

Round-limit accounting: a `REQUEST_CHANGES` on a closed PR doesn't count toward the 3-round limit on the live sibling (different PR, different review thread). But the substantive ask still has to land somewhere; surfacing on the ticket is what keeps it from rotting.
