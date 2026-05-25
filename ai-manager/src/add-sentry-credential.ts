import Anthropic from '@anthropic-ai/sdk';

const required = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var: ${k}`);
  return v;
};

const VAULT_ID = required('VAULT_ID');

const client = new Anthropic();

const cred = await client.beta.vaults.credentials.create(VAULT_ID, {
  display_name: 'Sentry MCP',
  auth: {
    type: 'mcp_oauth',
    mcp_server_url: 'https://mcp.sentry.dev',
    access_token: required('SENTRY_MCP_ACCESS_TOKEN'),
    expires_at: required('SENTRY_MCP_EXPIRES_AT'),
    refresh: {
      refresh_token: required('SENTRY_MCP_REFRESH_TOKEN'),
      client_id: required('SENTRY_MCP_CLIENT_ID'),
      token_endpoint: 'https://mcp.sentry.dev/oauth/token',
      token_endpoint_auth: { type: 'none' },
    },
  },
});

console.log(`Created credential ${cred.id}`);
