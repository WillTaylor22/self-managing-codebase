# Sentry MCP has no comment_on_issue tool

Discovered: 2026-05-26

The Sentry MCP at `https://mcp.sentry.dev/mcp` exposes issue search/get but
**no** way to post a comment on a Sentry issue.

The manager system-prompt's dedupe protocol — "create the Linear ticket,
paste its ID into the Sentry issue as a comment so we can dedupe on the
next tick" — cannot be executed via MCP. Instead:

- File the Linear ticket as normal
- Put the Sentry issue ID (e.g. `APP-1`) and the Sentry URL in the
  Linear ticket description
- On the next observability pass, search Linear for the Sentry issue ID
  before filing a duplicate

This is a one-way back-reference (Linear → Sentry, not both directions).
Acceptable for now.
