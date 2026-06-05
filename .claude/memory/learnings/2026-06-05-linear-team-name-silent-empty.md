# Linear `list_issues` silently returns empty for the wrong team name

The Linear team backing this project is **Engineering** (issue prefix `ENG-*`) — NOT `self-managing-codebase`. The GitHub repo, Vercel project, and Sentry project are all named `self-managing-codebase`, so reaching for `list_issues({ team: 'self-managing-codebase' })` is the natural first guess. It returns `{issues: [], hasNextPage: false}` with no error — looks identical to a genuinely empty queue. Three rounds of state filters (`In Progress`, `Todo`, `Triage`, `Backlog`) all returned empty before I noticed the actual ENG-* prefix on issues already referenced in the manager prompt's memory index and in prior PR titles.

Defensive pattern: before any `list_issues({ team: ... })` call from a fresh session, run `list_teams()` once and use the returned team `name` (or omit `team` entirely and filter client-side). The MCP doesn't validate the team argument against known teams — unknown names return zero issues silently instead of 4xx-ing or warning.

False conclusion this avoids: "Triage and Todo are empty, nothing to pick up, fall through to memory/retro." If you actually had work assigned, you'd skip it for a tick.
