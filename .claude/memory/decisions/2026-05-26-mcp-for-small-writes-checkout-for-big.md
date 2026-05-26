# When to write via GitHub MCP vs. the mounted checkout

Decision: 2026-05-26.

Both paths can produce commits. Pick by ticket size:

**GitHub MCP `create_or_update_file` + `create_pull_request`** when:
- The change is 1-2 files, no tests, no dependency install needed
- You need the PR opened FAST (single MCP roundtrip per file)
- The author identity will be the PAT owner (`WillTaylor22`)

**Mounted checkout + `git commit && git push`** when:
- Multiple files change together
- You need to run `npm install`, `npm run build`, `npm run e2e`
- The change is UI-touching (per the dev-loop in the system prompt)
- You want a single commit with a real diff, not file-by-file API calls

Rule of thumb: if the dev-loop steps (d)-(h) of the manager prompt
apply, use the checkout. Otherwise either works.
