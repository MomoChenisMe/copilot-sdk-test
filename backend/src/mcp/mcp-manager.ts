import { McpClient, type McpTool } from './mcp-client.js';
import { parseMcpConfig, type McpServerConfig } from './mcp-config.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('mcp-manager');

export class McpManager {
  private clients = new Map<string, McpClient>();

  async startServer(config: McpServerConfig): Promise<void> {
    const client = new McpClient(config);
    await client.connect();
    this.clients.set(config.name, client);
    log.info(`Started MCP server: ${config.name}`);
  }

  async stopServer(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (!client) return;
    await client.disconnect();
    this.clients.delete(name);
    log.info(`Stopped MCP server: ${name}`);
  }

  async stopAll(): Promise<void> {
    const names = [...this.clients.keys()];
    await Promise.all(names.map((name) => this.stopServer(name)));
  }

  async restartServer(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (!client) {
      throw new Error(`MCP server not found: ${name}`);
    }
    const config = client.getConfig();
    await client.disconnect();
    this.clients.delete(name);

    const newClient = new McpClient(config);
    await newClient.connect();
    this.clients.set(name, newClient);
    log.info(`Restarted MCP server: ${name}`);
  }

  getServers(): Map<string, { config: McpServerConfig; connected: boolean }> {
    const result = new Map<string, { config: McpServerConfig; connected: boolean }>();
    for (const [name, client] of this.clients) {
      result.set(name, {
        config: client.getConfig(),
        connected: client.isConnected(),
      });
    }
    return result;
  }

  async getAllTools(): Promise<Array<McpTool & { serverName: string }>> {
    const allTools: Array<McpTool & { serverName: string }> = [];
    for (const [name, client] of this.clients) {
      try {
        const tools = await client.listTools();
        for (const tool of tools) {
          allTools.push({ ...tool, serverName: name });
        }
      } catch (err) {
        log.warn(`Failed to list tools from ${name}:`, err);
      }
    }
    return allTools;
  }

  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server not found: ${serverName}`);
    }
    return client.callTool(toolName, args);
  }

  async loadFromConfig(configPath: string): Promise<void> {
    const configs = parseMcpConfig(configPath);
    for (const config of configs) {
      try {
        await this.startServer(config);
      } catch (err) {
        log.error(`Failed to start MCP server ${config.name}:`, err);
      }
    }
  }

  async reloadConfig(configPath: string): Promise<void> {
    const newConfigs = parseMcpConfig(configPath);
    const newNames = new Set(newConfigs.map((c) => c.name));
    const currentNames = new Set(this.clients.keys());

    // Remove servers no longer in config
    for (const name of currentNames) {
      if (!newNames.has(name)) {
        await this.stopServer(name);
      }
    }

    // Add new or restart changed servers
    for (const config of newConfigs) {
      const existing = this.clients.get(config.name);
      if (!existing) {
        // New server
        try {
          await this.startServer(config);
        } catch (err) {
          log.error(`Failed to start MCP server ${config.name}:`, err);
        }
      } else {
        // Check if config changed
        const currentConfig = existing.getConfig();
        if (JSON.stringify(currentConfig) !== JSON.stringify(config)) {
          await this.stopServer(config.name);
          try {
            await this.startServer(config);
          } catch (err) {
            log.error(`Failed to restart MCP server ${config.name}:`, err);
          }
        }
      }
    }
  }
}
