import { readFileSync } from 'node:fs';
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
