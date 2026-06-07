# Sentry `search_issues` silently returns empty without `projectSlugOrId`

`search_issues({ organizationSlug: 'self-managing-codebase', query: 'is:unresolved' })` (with or without `regionUrl`, with or without an explicit query) returns "No issues found" — but adding `projectSlugOrId: 'app'` to the same call returns `APP-1` (the canary `SentryExampleAPIError`, still unresolved on Sentry from May). Verified by running both shapes back-to-back in the same tick and getting opposite answers.

Step 2 (observability) of the manager loop says "query Sentry MCP for unresolved issues in the self-managing-codebase project". The natural first call is org-scoped — but on this org's setup, that returns false-empty. Future sessions would silently miss new errors and never file tickets for them. **Always pass `projectSlugOrId: 'app'`** (or whatever `find_projects({organizationSlug})` returns) when running the step-2 sweep — there's only one project here so it's just a constant.

Adjacent to `vercel-mcp-silently-hides-projects` and `linear-team-name-silent-empty`: a third shape of the same MCP failure mode (silently-empty rather than error on a query that should hit data). Pattern: don't trust a zero-result list response from any of the read MCPs without a positive control. Either query a known-existing entity, or scope the call to the narrowest filter the docs allow.
