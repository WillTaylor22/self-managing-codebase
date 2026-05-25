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

### 1. GitHub access for the agent
The agent prompt tells it to use `gh` with `GH_TOKEN`. That token does not exist yet.

Option A (simplest): create a fine-grained PAT scoped to `workflow-design/self-managing-codebase` with `contents: write`, `pull_requests: write`, `issues: write`, `metadata: read`, `actions: read`. Add as a **static_bearer** credential to the existing vault, name it `GH_TOKEN`. Adapt `setup-vault.ts` (copy the existing `vaults.credentials.create` call but with `type: 'static_bearer'`).

Option B (cleaner long-term): create a GitHub App for the repo, install it, use its installation token. More setup.

### 2. Vercel access for the agent
Same pattern as GitHub. Create a token at https://vercel.com/account/tokens, add to the vault as `VERCEL_TOKEN`.

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
