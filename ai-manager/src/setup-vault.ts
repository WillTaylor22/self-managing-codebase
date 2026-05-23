import Anthropic from '@anthropic-ai/sdk';

const required = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var: ${k}`);
  return v;
};

const client = new Anthropic();

const vault = await client.beta.vaults.create({
  display_name: 'trip-planner-linear-vault',
});

await client.beta.vaults.credentials.create(vault.id, {
  display_name: 'Linear MCP',
  auth: {
    type: 'mcp_oauth',
    mcp_server_url: 'https://mcp.linear.app/mcp',
    access_token: required('LINEAR_MCP_ACCESS_TOKEN'),
    expires_at: required('LINEAR_MCP_EXPIRES_AT'),
    refresh: {
      refresh_token: required('LINEAR_MCP_REFRESH_TOKEN'),
      client_id: required('LINEAR_MCP_CLIENT_ID'),
      token_endpoint: 'https://api.linear.app/oauth/token',
      token_endpoint_auth: { type: 'none' },
    },
  },
});

console.log(`VAULT_ID=${vault.id}`);
console.log('Add this to .env, then run `npm run run`.');
