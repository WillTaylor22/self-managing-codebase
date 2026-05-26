# Don't `git clone` the repo from sandbox bash

Discovered: 2026-05-26.

The managed-agent sandbox has no git credentials available to bash, so
`git clone https://github.com/<org>/<repo>` against a private repo
hangs and times out after ~295s.

The repo IS available — mounted at `/workspace/repo` via the
`github_repository` session resource (authorized with a PAT passed by
the orchestrator). The mount has push auth wired up.

**Always start with `cd /workspace/repo`.** Never `git clone`.

If `/workspace/repo` is empty or missing, the orchestrator forgot to
attach the resource — file a ticket, don't try to work around it.
