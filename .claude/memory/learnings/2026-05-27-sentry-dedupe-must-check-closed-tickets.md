# Step-2 Sentry dedupe must search closed tickets too

The manager-loop step 2 rule says "for each unresolved Sentry issue NOT
already linked to an **open** Linear ticket, create a Linear ticket".
Read literally, that scope (open-only) is wrong for any Sentry issue
that can never be resolved by the agent — the canonical case being the
`SentryExampleAPIError` canary (APP-1).

Concretely, today (`sesn_01NdbdP8`): I queried `list_issues(state:Todo)`
+ `list_issues(state:Triage)` for the dedupe check, got nothing, and
filed ENG-29 for APP-1. Then noticed ENG-17 (Done, 2026-05-25) was
already a ticket for the same Sentry issue — the previous session
deleted the route, marked the ticket Done, but the Sentry issue stayed
unresolved because the Sentry MCP has no write tools (ENG-21). So
every subsequent tick re-files the canary as a "new" ticket forever.

Defensive shape until ENG-21 (Sentry write tools) lands:

- When dedupe-searching Linear for a Sentry issue, query **with no
  state filter** (`mcp__linear__list_issues({query: 'APP-1'})`)
  — catches both open AND closed/canceled tickets.
- Match on the bare Sentry shortId (`APP-1`, `APP-2`, …) in either
  the title or description.
- If any prior ticket exists for the same Sentry shortId — open or
  closed — skip ticket creation. The Sentry issue itself stays
  unresolved; that's tracked by ENG-21, not by re-filing.
- If you DID file a duplicate before catching it, cancel it with
  `save_issue({id, state:'Canceled', duplicateOf: 'ENG-XX'})`.

The literal-rule fix (broaden step 2 in `manager.agent.yaml` from
"open" to "any") is itself a YAML edit that needs the manual
bootstrap run per `learnings/manager-agent-yaml-needs-manual-bootstrap`.
Worth doing once the canary stops being a per-tick footgun.
