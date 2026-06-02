# Sentry `search_issues` rejects `firstSeen:-7d` shape (tool docs are wrong)

The Sentry MCP `search_issues` tool description shows `firstSeen:-24h` /
`lastSeen:-7d` as example query filters, but the Sentry API actually
rejects that syntax:

```
HTTP 400: Error parsing search query: first_seen: Invalid date: >-7d.
Expected +/-duration (e.g. +1h) or ISO 8601-like (e.g. 2026-06-02T...).
```

(MCP-side translation rewrites `firstSeen:-7d` → `first_seen:>-7d`,
which the API then fails to parse — the leading `-` is read as part
of the date, not a relative-duration prefix.)

What works instead:
- Absolute ISO timestamps: `firstSeen:>2026-05-26T00:00:00`
- Just rely on the default time window — `is:unresolved` is
  sufficient for the step-2 sweep; project-wide unresolved count is
  what step 2 actually cares about. If you need a time bound, scope
  with `statsPeriod='7d'` on the tool call instead of putting it in
  `query`.

Don't trust the tool description's relative-time examples.
