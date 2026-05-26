# PR body session-id marker

Every PR opened by the manager MUST end its body with a session-id
marker. The `/api/github-webhook` route extracts this when a webhook
fires for the PR (e.g. `issue_comment.created` with
`AGENT_REVIEW: APPROVED`) and resumes the original manager session —
full context, no re-explaining.

## Shape (current)

A plain-text line, on its own, at the end of the PR body:

```
session-id: sesn_xxxxxxxxxxxxxxxx
```

Per ENG-25 the GitHub MCP `update_pull_request` tool strips
`<!-- ... -->` HTML comments from PR bodies before persisting, so the
HTML-comment shape that used to be the convention is unwritable from
agent sessions. A plain-text `session-id:` line passes through
unchanged and is what every agent-opened PR should now use.

If your kickoff message or system-prompt example still references the
HTML-comment shape, follow this file instead — it is the canonical
convention.

## Prefix

Use whichever prefix the kickoff `user.message` carries. The current
Anthropic SDK returns `sesn_...`; older sessions had `sthr_...`. The
webhook regex accepts both.

## Legacy shape (matched but do not write)

For back-compat the webhook regex also matches the old HTML-comment
shape:

```
<!-- session-id: sesn_xxxxxxxxxxxxxxxx -->
```

This is matched only so that markers a human landed via the GitHub
web API on an older PR continue to resume. Do not emit it from a new
PR — MCP will strip it on save.

## Without the marker

The webhook falls back to creating a fresh manager session. Functional
but wasteful — the fresh session re-derives all design context.
