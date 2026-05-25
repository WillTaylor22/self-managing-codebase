import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const CLIENT_ID = process.env.LINEAR_MCP_CLIENT_ID;
const CLIENT_SECRET = process.env.LINEAR_MCP_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set LINEAR_MCP_CLIENT_ID and LINEAR_MCP_CLIENT_SECRET in ai-manager/.env first.');
  process.exit(1);
}

const REDIRECT = 'http://localhost:8765/callback';
const SCOPE = 'read,write,issues:create,comments:create';
const state = randomBytes(16).toString('hex');

const authUrl = new URL('https://linear.app/oauth/authorize');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPE);
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('prompt', 'consent');

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost:8765');
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

  const tokenRes = await fetch('https://api.linear.app/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  const tok = (await tokenRes.json()) as {
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
    '<h1>Linear connected ✓</h1><p>You can close this tab and return to the terminal.</p>',
  );

  console.log('\nAdd these to ai-manager/.env:\n');
  console.log(`LINEAR_MCP_ACCESS_TOKEN=${tok.access_token}`);
  console.log(`LINEAR_MCP_REFRESH_TOKEN=${tok.refresh_token ?? ''}`);
  console.log(`LINEAR_MCP_EXPIRES_AT=${expiresAt}`);
  console.log(`\n(LINEAR_MCP_CLIENT_ID and LINEAR_MCP_CLIENT_SECRET should already be set.)`);

  if (!tok.refresh_token) {
    console.log('\n⚠️  No refresh_token returned. The access token will expire and not auto-renew.');
  }

  setTimeout(() => {
    server.close();
    process.exit(0);
  }, 500);
});

server.listen(8765, () => {
  console.log(`Opening Linear authorize URL:\n  ${authUrl.toString()}\n`);
  console.log('Listening on http://localhost:8765 for the OAuth callback...');
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(opener, [authUrl.toString()], { stdio: 'ignore', detached: true }).unref();
});
