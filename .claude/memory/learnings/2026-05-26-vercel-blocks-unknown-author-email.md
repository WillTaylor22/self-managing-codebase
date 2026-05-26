# Vercel preview deploys block commits with no GitHub-recognized author

Discovered: 2026-05-26 from ENG-12 PR #2.

Vercel runs a check on every PR commit: "Does the commit author email
map to a GitHub user?" If not, the preview deploy is BLOCKED and the
`Vercel` status check goes FAILURE. Manager's merge gate (requires
green CI) then refuses to merge.

**Fix**: use the GitHub noreply alias as the agent's git identity.

```
git config user.email "7004983+WillTaylor22@users.noreply.github.com"
git config user.name  "Self-Managing Codebase Manager"
```

The number `7004983` is the GitHub user ID for `WillTaylor22`. If the
account changes, look it up via `gh api users/<login> --jq .id`.

PRs opened before this fix carry the broken email and stay BLOCKED;
the only non-destructive unblock is to merge `main` into the PR
branch — the merge commit carries the new identity and retriggers
Vercel. Hard rule: don't force-push to fix it.
