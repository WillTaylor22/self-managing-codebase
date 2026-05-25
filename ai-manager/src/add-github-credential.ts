import Anthropic from '@anthropic-ai/sdk';

const required = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var: ${k}`);
  return v;
};

const VAULT_ID = required('VAULT_ID');
const GITHUB_PAT = required('GITHUB_PAT');

const client = new Anthropic();

const cred = await client.beta.vaults.credentials.create(VAULT_ID, {
  display_name: 'GitHub PAT',
  auth: {
    type: 'static_bearer',
    token: GITHUB_PAT,
    mcp_server_url: 'https://api.githubcopilot.com/mcp/',
  },
});

console.log(`Created credential ${cred.id}`);
