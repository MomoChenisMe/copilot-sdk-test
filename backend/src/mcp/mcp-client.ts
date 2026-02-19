import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { McpServerConfig } from './mcp-config.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('mcp-client');

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export class McpClient {
  private client: InstanceType<typeof Client> | null = null;
  private transport: Transport | null = null;
  private connected = false;

  constructor(private readonly config: McpServerConfig) {}

  async connect(): Promise<void> {
    try {
      if (this.config.transport === 'stdio') {
        this.transport = new StdioClientTransport({
          command: this.config.command!,
          args: this.config.args ?? [],
          env: { ...process.env, ...this.config.env } as Record<string, string>,
        });
      } else {
        this.transport = new StreamableHTTPClientTransport(
          new URL(this.config.url!),
        );
      }

      this.client = new Client(
        { name: this.config.name, version: '1.0.0' },
        { capabilities: {} },
      );

      await this.client.connect(this.transport);
      this.connected = true;
      log.info(`Connected to MCP server: ${this.config.name}`);
    } catch (err) {
      this.connected = false;
      this.client = null;
      this.transport = null;
      log.error(`Failed to connect to MCP server ${this.config.name}:`, err);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.close();
      log.info(`Disconnected from MCP server: ${this.config.name}`);
    } finally {
      this.client = null;
      this.transport = null;
      this.connected = false;
    }
  }

  async listTools(): Promise<McpTool[]> {
    if (!this.client || !this.connected) {
      throw new Error(`Not connected to MCP server: ${this.config.name}`);
    }
    const result = await this.client.listTools();
    return result.tools.map((t) => ({
      name: t.name,
      description: t.description ?? '',
      inputSchema: t.inputSchema as Record<string, unknown>,
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.client || !this.connected) {
      throw new Error(`Not connected to MCP server: ${this.config.name}`);
    }
    return this.client.callTool({ name, arguments: args });
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConfig(): McpServerConfig {
    return this.config;
  }
}
