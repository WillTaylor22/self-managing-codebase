import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

type AgentYaml = {
  name: string;
  model: string;
  description?: string;
  system?: string;
  tools?: Array<Record<string, unknown>>;
  mcp_servers?: Array<{ type: 'url'; name: string; url: string }>;
};

type EnvYaml = {
  name: string;
  description?: string;
  config: {
    type: 'cloud';
    networking?: {
      type: 'package_managers_and_custom' | 'limited' | 'unrestricted';
      allowed_hosts?: string[];
    };
  };
};

const agentDoc = parseYaml(readFileSync(resolve(root, 'manager.agent.yaml'), 'utf8')) as AgentYaml;
const envDoc = parseYaml(readFileSync(resolve(root, 'manager.environment.yaml'), 'utf8')) as EnvYaml;

const client = new Anthropic();

const net = envDoc.config.networking;
const networking =
  net?.type === 'package_managers_and_custom'
    ? { type: 'limited' as const, allow_package_managers: true, allowed_hosts: net.allowed_hosts ?? [] }
    : net?.type === 'limited'
      ? { type: 'limited' as const, allowed_hosts: net.allowed_hosts ?? [] }
      : { type: 'unrestricted' as const };

const existingEnvId = process.env.ENV_ID;
const environment = existingEnvId
  ? await (async () => {
      console.log(`Updating environment ${existingEnvId}...`);
      return client.beta.environments.update(existingEnvId, {
        name: envDoc.name,
        description: envDoc.description,
        config: { type: 'cloud', networking },
      });
    })()
  : await (async () => {
      console.log(`Creating environment "${envDoc.name}"...`);
      return client.beta.environments.create({
        name: envDoc.name,
        description: envDoc.description,
        config: { type: 'cloud', networking },
      });
    })();
console.log(`  ENV_ID=${environment.id}`);

const existingAgentId = process.env.AGENT_ID;
const agent = existingAgentId
  ? await (async () => {
      console.log(`Updating agent ${existingAgentId}...`);
      const current = await client.beta.agents.retrieve(existingAgentId);
      return client.beta.agents.update(existingAgentId, {
        version: current.version,
        name: agentDoc.name,
        model: agentDoc.model,
        description: agentDoc.description,
        system: agentDoc.system,
        tools: agentDoc.tools as never,
        mcp_servers: agentDoc.mcp_servers,
      });
    })()
  : await (async () => {
      console.log(`Creating agent "${agentDoc.name}"...`);
      return client.beta.agents.create({
        name: agentDoc.name,
        model: agentDoc.model,
        description: agentDoc.description,
        system: agentDoc.system,
        tools: agentDoc.tools as never,
        mcp_servers: agentDoc.mcp_servers,
      });
    })();
console.log(`  AGENT_ID=${agent.id}`);

if (!existingEnvId || !existingAgentId) {
  console.log('\nAdd these to ai-manager/.env:');
  if (!existingAgentId) console.log(`AGENT_ID=${agent.id}`);
  if (!existingEnvId) console.log(`ENV_ID=${environment.id}`);
}
