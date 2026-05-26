# Builder and Reviewer are separate agents

Decision: 2026-05-25.

The manager (builder) opens PRs. A second agent (reviewer) reviews
them. They share infrastructure (vault, environment, MCPs) but have
distinct system prompts and distinct `agent_id`s.

**Why separate**: a builder reviewing its own PR has confirmation
bias — same model, same context, same recent reasoning. A fresh
reviewer session with read-only tools and no implementation memory
gives an independent read.

**Why not just spawn a new session of the builder for review**: the
prompts differ. Builder's prompt mentions "open PRs, write tests,
push." Reviewer's prompt mentions "don't merge, don't edit, post a
verdict." Mixing them confuses the model.

**Trade-off**: same PAT identity on both, so GitHub's formal PR review
approval can't distinguish "self-approval." Workaround: reviewer posts
a comment with the `AGENT_REVIEW:` marker; manager parses the comment
as the approval signal. See `conventions/agent-review-marker.md`.
