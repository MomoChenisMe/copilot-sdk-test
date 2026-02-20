import type { CronToolConfig } from './cron-store.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('cron-tool-assembler');

export interface CronToolAssemblerDeps {
  selfControlTools: any[];
  getMcpTools: () => Promise<any[]>;
  memoryTools: any[];
  webSearchTool: any | null;
  taskTools: any[];
  skillStore: { getSkillDirectories: () => string[] };
}

export interface AssembledCronTools {
  tools: any[];
  skillDirectories?: string[];
  disabledSkills?: string[];
}

export async function assembleCronTools(
  config: CronToolConfig,
  deps: CronToolAssemblerDeps,
): Promise<AssembledCronTools> {
  const tools: any[] = [];
  const result: AssembledCronTools = { tools };

  if (config.selfControlTools) {
    tools.push(...deps.selfControlTools);
  }

  if (config.memoryTools) {
    tools.push(...deps.memoryTools);
  }

  if (config.webSearchTool && deps.webSearchTool) {
    tools.push(deps.webSearchTool);
  }

  if (config.taskTools) {
    tools.push(...deps.taskTools);
  }

  if (config.mcpTools) {
    try {
      let mcpTools = await deps.getMcpTools();
      if (config.mcpServers) {
        mcpTools = mcpTools.filter((tool: any) => {
          // MCP tool names follow format: mcp__serverName__toolName
          const match = tool.name?.match(/^mcp__([^_]+)__/);
          if (!match) return true;
          const serverName = match[1];
          return config.mcpServers![serverName] !== false;
        });
      }
      tools.push(...mcpTools);
    } catch (err) {
      log.warn({ err }, 'Failed to load MCP tools for cron job');
    }
  }

  if (config.skills) {
    result.skillDirectories = deps.skillStore.getSkillDirectories();
    if (config.disabledSkills && config.disabledSkills.length > 0) {
      result.disabledSkills = config.disabledSkills;
    }
  }

  return result;
}
