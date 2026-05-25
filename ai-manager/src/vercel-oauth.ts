import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';

const REDIRECT = 'http://localhost:8766/callback';
const AUTH = 'https://vercel.com/oauth/authorize';
const TOKEN = 'https://vercel.com/api/login/oauth/token';
const REGISTER = 'https://vercel.com/api/login/oauth/register';
const SCOPE = 'openid email offline_access profile';

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
const state = b64url(randomBytes(16));
const verifier = b64url(randomBytes(32));
const challenge = b64url(createHash('sha256').update(verifier).digest());

const regRes = await fetch(REGISTER, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_name: 'Self-Managing Codebase Manager',
    redirect_uris: [REDIRECT],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    scope: SCOPE,
  }),
});
const reg = (await regRes.json()) as { client_id?: string; error?: string; error_description?: string };
if (!reg.client_id) {
  console.error('Client registration failed:', reg);
  process.exit(1);
}
console.log(`Registered client: ${reg.client_id}`);

const authUrl = new URL(AUTH);
authUrl.searchParams.set('client_id', reg.client_id);
authUrl.searchParams.set('redirect_uri', REDIRECT);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPE);
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('code_challenge', challenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost:8766');
  if (url.pathname !== '/callback') {
    res.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  if (!code || returnedState !== state) {
    res.writeHead(400).end('Missing code or state mismatch');
    server.close();
    process.exit(1);
  }

  const tokRes = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT,
      client_id: reg.client_id!,
      code_verifier: verifier,
    }),
  });
  const tok = (await tokRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!tok.access_token) {
    res.writeHead(500).end(`Token exchange failed: ${JSON.stringify(tok)}`);
    console.error('\nToken exchange failed:', tok);
    server.close();
    process.exit(1);
  }

  const expiresAt = new Date(Date.now() + (tok.expires_in ?? 0) * 1000).toISOString();
  res.writeHead(200, { 'Content-Type': 'text/html' }).end(
    '<h1>Vercel connected ✓</h1><p>You can close this tab.</p>',
  );

  console.log('\nAdd these to ai-manager/.env:\n');
  console.log(`VERCEL_MCP_CLIENT_ID=${reg.client_id}`);
  console.log(`VERCEL_MCP_ACCESS_TOKEN=${tok.access_token}`);
  console.log(`VERCEL_MCP_REFRESH_TOKEN=${tok.refresh_token ?? ''}`);
  console.log(`VERCEL_MCP_EXPIRES_AT=${expiresAt}`);

  setTimeout(() => {
    server.close();
    process.exit(0);
  }, 500);
});

server.listen(8766, () => {
  console.log(`\nOpening Vercel authorize URL:\n  ${authUrl.toString()}\n`);
  console.log('Listening on http://localhost:8766 for the OAuth callback...');
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(opener, [authUrl.toString()], { stdio: 'ignore', detached: true }).unref();
});
