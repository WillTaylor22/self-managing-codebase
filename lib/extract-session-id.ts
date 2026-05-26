// Pulled out of `app/api/github-webhook/route.ts` so it can be unit-tested
// without instantiating Next's route module. Pure, no I/O.
//
// Accepts two shapes (see .claude/memory/conventions/pr-session-id-marker.md):
//   1. Plain-text line:   session-id: sesn_xxxx   (preferred — MCP-survivable, ENG-25)
//   2. HTML comment:      <!-- session-id: sesn_xxxx -->   (legacy, read-only-accepted)
//
// Convention says the marker is the LAST non-empty line of the PR body. We
// honor that for the plain shape so a placeholder inside a fenced code block
// earlier in the body doesn't beat the real trailer (PR #20 review).
//
// The HTML shape is left first-wins: distinctive token, and we don't author
// it anymore so duplicate-in-prose risk is low.
export function extractSessionId(text: string | undefined | null): string | null {
  if (!text) return null;
  const html = text.match(/<!--\s*session-id:\s*((?:sthr_|sesn_)[A-Za-z0-9]+)\s*-->/);
  if (html) return html[1];
  const plain = [...text.matchAll(/^\s*session-id:\s*((?:sthr_|sesn_)[A-Za-z0-9]+)\s*$/gm)];
  if (plain.length) return plain[plain.length - 1][1];
  return null;
}
