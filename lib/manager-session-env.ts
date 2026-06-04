// Single source of truth for the env-injection block that every manager
// kickoff message must include.
//
// Why this exists: the BLOB_READ_WRITE_TOKEN + VERCEL_BLOB_API_URL pair is
// needed for step 4(j) PR preview-media capture. Originally only the local
// `ai-manager/src/tick.ts` CLI inlined them into the kickoff message, so
// cron-fired (`/api/manager-tick`) and webhook-fired review-feedback
// (`/api/github-webhook`) sessions woke up with `BLOB_READ_WRITE_TOKEN
// set: no` and had to skip media capture (ENG-23). Now all three call
// sites build their kickoff text via `managerSessionEnvBlock()`.
//
// Token-injection mechanism: the value is read from `process.env` on the
// process firing the session (the local CLI for tick.ts; the Vercel app
// for the API routes), then inlined into the user message text. The
// agent's system prompt instructs the shell to `export` it as the first
// shell action. If the env var is unset on the firing process, we return
// an empty string — the agent's existing "stop and surface a Linear
// ticket" logic in step 4(j) then kicks in unchanged.
export function managerSessionEnvBlock(): string {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return '';
  return [
    "Session env (export these at the start of your shell, before any other work):",
    `  export BLOB_READ_WRITE_TOKEN='${blobToken}'`,
    "  export VERCEL_BLOB_API_URL='https://blob.vercel-storage.com'",
    "The token is scoped to the public 'pr-media-2' Vercel Blob store — used by step 4(j) to upload PR preview media. VERCEL_BLOB_API_URL pins @vercel/blob's control-plane host to one in the sandbox egress allowlist (the SDK default vercel.com/api/blob is blocked, causing put() to hang in async-retry; ENG-22).",
  ].join('\n');
}

// Convenience: append the block to a kickoff/instruction text with a
// double-newline separator, or return the text unchanged if the block
// is empty.
export function withManagerSessionEnv(text: string): string {
  const block = managerSessionEnvBlock();
  return block ? `${text}\n\n${block}` : text;
}
