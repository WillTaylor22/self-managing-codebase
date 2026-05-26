# PR body session-id marker

Every PR opened by the manager MUST end with this HTML comment as the
**last line** of the PR body:

```
<!-- session-id: sesn_xxxxxxxxxxxxxxxx -->
```

The `/api/github-webhook` route extracts this marker when a webhook
fires for the PR (e.g. `issue_comment.created` with
`AGENT_REVIEW: APPROVED`). With it, the webhook resumes the original
manager session — full implementation context, no re-explaining.

The webhook regex accepts both the legacy `sthr_` prefix and the
current `sesn_` prefix returned by `client.beta.sessions.create()`.
Use whichever prefix the kickoff `user.message` carries.

Without it, the webhook falls back to creating a fresh session. The
fresh session loses all design rationale and re-derives everything.
Functional but wasteful.

The kickoff `user.message` includes the actual session id. Substitute
it verbatim; don't paraphrase or omit.
