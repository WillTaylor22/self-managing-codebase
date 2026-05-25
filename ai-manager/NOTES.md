# Manager handoff notes

## What's wired up

- **Agent + Environment** — created via `npm run manager:bootstrap`. YAML in `manager.agent.yaml` / `manager.environment.yaml` is the source of truth; re-run bootstrap after editing.
- **Linear MCP** — vault credential created via `linear-oauth.ts` + `setup-vault.ts`. The agent can read/write Linear tickets.
- **Live app access** — sandbox can `curl https://self-managing-codebase.vercel.app`.
- **Repo write** — the agent toolset has write/edit enabled; the sandbox gets a checkout of the working tree on session start.
- **Hourly cron** — `vercel.json` schedules `GET /api/manager-tick` every hour. The route is a no-op until env vars are set in Vercel (see below).
- **Three entry points**:
  - `npm run manager` — interactive REPL.
  - `npm run manager:tick "optional prompt"` — non-interactive single run, prints transcript, exits.
  - `GET /api/manager-tick` — same as `tick`, but server-side.

## What's NOT wired up — needs your input

### 1. GitHub access for the agent ✅ DONE
GitHub MCP server (`https://api.githubcopilot.com/mcp/`) is wired up. A fine-grained PAT was added to the vault as a `static_bearer` credential (`vcrd_01UURu4AEsXTv1kQfWmdBuTX`). The agent uses GitHub via MCP tools — no `gh` CLI / env var.

To rotate: get a new PAT at https://github.com/settings/personal-access-tokens/new (scoped to `WillTaylor22/self-managing-codebase` with contents/PRs/issues r/w + actions read), set `GITHUB_PAT` in `.env`, then re-run `npm run add-github-credential` (you'll want to delete the old credential first via the SDK).

### 2. Vercel access for the agent
Vercel has no first-party MCP server (yet — there's a "Vercel MCP" project but it's not GA). For now the agent uses the live app via `curl` (allowed_hosts already covers `api.vercel.com`). If you want deployment/log control, create a token at https://vercel.com/account/tokens and decide whether to: (a) shell out to `vercel` CLI from sandbox bash with the token via a session-injected env, or (b) curl `api.vercel.com` directly with `Authorization: Bearer <token>`. Option (b) is simpler — write a small wrapper script the agent invokes.

### 3. Vercel env vars for the cron
The cron route needs to know who to invoke. Add these in Vercel project settings → Environment Variables (production):
- `ANTHROPIC_API_KEY`
- `AGENT_ID`
- `ENV_ID`
- `VAULT_ID`
- `CRON_SECRET` (optional but recommended — any random string; Vercel sends it as `Authorization: Bearer …`)

Until these are set, the cron returns `{ skipped: 'manager env not configured' }` and does nothing.

### 4. Browser / Playwright
Not started. The agent prompt currently uses `curl` only. If you want it to actually drive the app and read console logs, options:
- Install Playwright in the sandbox at session start (requires `package_managers_and_custom` networking, which we already have). Add a step like `npx playwright install chromium` to the agent's bash plays.
- Or run Playwright outside the sandbox (e.g., from a separate Vercel function) and feed results to the agent.

### 5. Autonomous PR merging
The prompt allows merging IFF there's already a human approval. The agent never approves its own work. If you want fully autonomous merge-on-green, flip that rule.

## Sanity checks before you turn the cron on

1. Test the non-interactive runner end-to-end: `npm run manager:tick "Just list my Linear issues and stop."` — should print the list and exit cleanly. If it hangs, the agent is sitting on a tool approval; revisit `permission_policy` in `manager.agent.yaml`.
2. Hit the route locally: `curl http://localhost:3000/api/manager-tick` (with all env vars in `.env.local`). Should return a transcript JSON within ~30s.
3. Only after both pass: push to prod and add the Vercel env vars. The cron fires at the top of every hour.
