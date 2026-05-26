# PR body session-id marker

Every PR opened by the manager MUST end with a `session-id:` marker on
its own line as the last non-empty line of the PR body:

```
session-id: sesn_xxxxxxxxxxxxxxxx
```

The `/api/github-webhook` route extracts this marker when a webhook
fires for the PR (e.g. `issue_comment.created` with
`AGENT_REVIEW: APPROVED`). With it, the webhook resumes the original
manager session — full implementation context, no re-explaining.

## Accepted shapes

The webhook regex accepts:

- Plain-text line: `session-id: sesn_...` — **preferred**. Survives
  the GitHub MCP `update_pull_request` and `create_pull_request` body
  filters (ENG-25). Always use this on new PRs.
- Legacy HTML comment: `<!-- session-id: sesn_... -->` — still
  matched for back-compat with PRs opened before ENG-25 landed, but
  the agent cannot write this shape on a new PR because MCP strips it
  on body create AND update. Read-only acceptance.

Both `sesn_` (current SDK prefix) and `sthr_` (legacy) are accepted.
Use whatever the kickoff `user.message` carries, verbatim.

Without the marker, the webhook falls back to creating a fresh
session. The fresh session loses all design rationale and re-derives
everything. Functional but wasteful.
