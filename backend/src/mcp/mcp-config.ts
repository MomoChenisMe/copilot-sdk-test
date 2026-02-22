import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createLogger } from '../utils/logger.js';

const log = createLogger('mcp-config');

export interface McpServerConfig {
  name: string;
  transport: 'stdio' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

interface McpConfigFile {
  mcpServers: Record<string, {
    command?: string;
    args?: string[];
    url?: string;
    transport?: 'stdio' | 'http';
    env?: Record<string, string>;
  }>;
}

function expandEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_match, varName) => {
    return process.env[varName] ?? '';
  });
}

export function parseMcpConfig(filePath: string): McpServerConfig[] {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const config: McpConfigFile = JSON.parse(raw);

    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      return [];
    }

    return Object.entries(config.mcpServers).map(([name, server]) => ({
      name,
      transport: server.transport ?? 'stdio',
      command: server.command,
      args: server.args?.map(expandEnvVars),
      url: server.url,
      env: server.env,
    }));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.warn('Failed to parse MCP config:', err);
    }
    return [];
  }
}

function readConfigFile(filePath: string): McpConfigFile {
  if (!existsSync(filePath)) {
    return { mcpServers: {} };
  }
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const config = JSON.parse(raw);
    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      return { mcpServers: {} };
    }
    return config as McpConfigFile;
  } catch {
    return { mcpServers: {} };
  }
}

export function addToMcpConfig(filePath: string, server: McpServerConfig): void {
  const config = readConfigFile(filePath);
  const entry: Record<string, unknown> = { transport: server.transport };
  if (server.command) entry.command = server.command;
  if (server.args?.length) entry.args = server.args;
  if (server.url) entry.url = server.url;
  if (server.env && Object.keys(server.env).length > 0) entry.env = server.env;
  config.mcpServers[server.name] = entry as McpConfigFile['mcpServers'][string];
  writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  log.info({ name: server.name }, 'Saved MCP server to config');
}

export function removeFromMcpConfig(filePath: string, name: string): void {
  const config = readConfigFile(filePath);
  if (!(name in config.mcpServers)) return;
  delete config.mcpServers[name];
  writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  log.info({ name }, 'Removed MCP server from config');
}
