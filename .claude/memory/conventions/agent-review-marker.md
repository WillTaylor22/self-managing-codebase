# Reviewer verdict marker: `AGENT_REVIEW:`

The reviewer posts ONE comment per review round on each PR. The
**first line** of that comment is the verdict, in this exact format:

```
AGENT_REVIEW: APPROVED — <one-sentence rationale>
AGENT_REVIEW: REQUEST_CHANGES — <one-sentence summary>
AGENT_REVIEW: ESCALATE — 3 review rounds reached, needs human
```

- `APPROVED` → manager may merge (still needs green CI)
- `REQUEST_CHANGES` → manager addresses, pushes more commits
- `ESCALATE` → manager STOPS; waits for human

Round limit: counted by counting `AGENT_REVIEW:` comments on the PR
before posting. If reviewer would post a 3rd `REQUEST_CHANGES`, it
posts `ESCALATE` instead.

Manager never approves its own PR. Reviewer never merges. Period.
