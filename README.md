# Self-managing codebase

A production-ready app uses observability systems to allow developers monitor the app's state and correct any issues raised. These tasks include diagnosing and fixing errors, fixing user-reported bugs, improving slow performance, roll-backs after a new release, security patches and library upgrades. These maintence tasks distract to the team and can require round-the-clock "on-call" rotations of developers in the team to take ressponsibility.

To reduce the burden of maintenence tasks, this codebase provides a demo of a cloud-based long-running "manager" agent which monitors the app, create tasks, implements and deploy fixes. A second "reviewer" agent reviews and comments on changes before they are deployed. Large changes and pull requests that have receive multiple rounds of review can be escalated to a human for final approval. In practice a team might approve all of the changes created while they get comfortable with the agent's decision making.

## Implementation

The agent using an Anthropic managed agent to run Claude Code in a serverless, file-system backed function as needed. A 1 hour cron job triggers the agent to monitor observability signals, create tasks, and pick up any available tasks. Tasks are managed in a Linear board via MCP, providing a control plane.

To deploy new code without human intervention the agent runs the app locally to test work in progress, and can monitor and manage the deployment pipeline in Vercel. The agent can run the app in the browser locally using Playwrite and for any front-end changes will add screenshots and a video of any changes to the pull request, which improves reliability.

The repository is structured as a standard NextJS app for the core product (a travel planner AI), with the managing agent in `./ai-manager`. Start a REPL session into a new agent using `npm run manager`.

The agent posts a daily project update to Linear, including and flagging actions that need human review.

Long term memory is stored in `.claude/memory`. The agent updates this after each session and does a broader review for patterns across sessions every 24 hours ("dreaming").

## Limitations and extensions

- The agent cannot add new infrastructure or pay for services beyond what is available over MCP. It cannot manage or set-up environment variables. This means you cannot ask it, or any other agent, to bootstrap itself onto a new app.
- The review process is slow. For robustness the manager and reviewer agent both run on a cron job, which means there can be a delay between the manager finishing and the reviewer starting. Ideally this would use an event-based system.
- No attempt to set up product analytics, user- managementfeedback, cross-browser issue support via BrowserStack MCP, however these are relatively trivial to add to the agent once it is running.
- Non-portable - setting up the agent requires a fair amount of human infrastructure work

My hope is that this inspires you to set up your own ai-manager for your repos. You can reach me at (willtay.com)[https://willtay.com/]
