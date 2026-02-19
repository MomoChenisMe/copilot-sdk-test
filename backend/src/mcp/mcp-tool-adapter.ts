import type { Tool } from '@github/copilot-sdk';
import type { McpManager } from './mcp-manager.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('mcp-tool-adapter');

export async function adaptMcpTools(manager: McpManager): Promise<Tool[]> {
  const mcpTools = await manager.getAllTools();

  return mcpTools.map((mcpTool) => {
    const tool: Tool = {
      name: `mcp__${mcpTool.serverName}__${mcpTool.name}`,
      description: mcpTool.description,
      parameters: mcpTool.inputSchema as Record<string, unknown>,
      handler: async (args: any) => {
        log.debug(`Calling MCP tool ${mcpTool.serverName}/${mcpTool.name}`);
        return manager.callTool(mcpTool.serverName, mcpTool.name, args as Record<string, unknown>);
      },
    };
    return tool;
  });
}
