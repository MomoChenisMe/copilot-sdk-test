import { describe, it, expect, vi } from 'vitest';
import { assembleCronTools } from '../../src/cron/cron-tool-assembler.js';
import type { CronToolAssemblerDeps } from '../../src/cron/cron-tool-assembler.js';
import type { CronToolConfig } from '../../src/cron/cron-store.js';

function makeTool(name: string) {
  return { name, description: `tool ${name}`, execute: vi.fn() };
}

function makeDeps(overrides: Partial<CronToolAssemblerDeps> = {}): CronToolAssemblerDeps {
  return {
    selfControlTools: [makeTool('read_profile'), makeTool('update_profile')],
    getMcpTools: vi.fn().mockResolvedValue([
      makeTool('mcp__server1__tool_a'),
      makeTool('mcp__server2__tool_b'),
      makeTool('mcp__server3__tool_c'),
    ]),
    memoryTools: [makeTool('read_memory'), makeTool('append_memory')],
    webSearchTool: makeTool('web_search'),
    taskTools: [makeTool('task_create'), makeTool('task_list')],
    skillStore: {
      getSkillDirectories: () => ['/skills/user', '/skills/builtin'],
    },
    ...overrides,
  };
}

describe('assembleCronTools', () => {
  it('should return empty tools when everything is disabled', async () => {
    const config: CronToolConfig = {
      skills: false,
      selfControlTools: false,
      memoryTools: false,
      webSearchTool: false,
      taskTools: false,
      mcpTools: false,
    };

    const result = await assembleCronTools(config, makeDeps());

    expect(result.tools).toEqual([]);
    expect(result.skillDirectories).toBeUndefined();
  });

  it('should include selfControlTools when enabled', async () => {
    const config: CronToolConfig = {
      selfControlTools: true,
      skills: false,
      memoryTools: false,
      webSearchTool: false,
      taskTools: false,
      mcpTools: false,
    };

    const result = await assembleCronTools(config, makeDeps());

    expect(result.tools.map((t: any) => t.name)).toEqual(['read_profile', 'update_profile']);
  });

  it('should include memoryTools when enabled', async () => {
    const config: CronToolConfig = {
      selfControlTools: false,
      skills: false,
      memoryTools: true,
      webSearchTool: false,
      taskTools: false,
      mcpTools: false,
    };

    const result = await assembleCronTools(config, makeDeps());

    expect(result.tools.map((t: any) => t.name)).toContain('read_memory');
    expect(result.tools.map((t: any) => t.name)).toContain('append_memory');
  });

  it('should include webSearchTool when enabled', async () => {
    const config: CronToolConfig = {
      selfControlTools: false,
      skills: false,
      memoryTools: false,
      webSearchTool: true,
      taskTools: false,
      mcpTools: false,
    };

    const result = await assembleCronTools(config, makeDeps());

    expect(result.tools.map((t: any) => t.name)).toContain('web_search');
  });

  it('should not include webSearchTool when dep is null', async () => {
    const config: CronToolConfig = { webSearchTool: true };

    const result = await assembleCronTools(config, makeDeps({ webSearchTool: null }));

    expect(result.tools.map((t: any) => t.name)).not.toContain('web_search');
  });

  it('should include taskTools when enabled', async () => {
    const config: CronToolConfig = {
      selfControlTools: false,
      skills: false,
      memoryTools: false,
      webSearchTool: false,
      taskTools: true,
      mcpTools: false,
    };

    const result = await assembleCronTools(config, makeDeps());

    expect(result.tools.map((t: any) => t.name)).toContain('task_create');
    expect(result.tools.map((t: any) => t.name)).toContain('task_list');
  });

  it('should include all MCP tools when mcpTools enabled without per-server config', async () => {
    const config: CronToolConfig = {
      selfControlTools: false,
      skills: false,
      memoryTools: false,
      webSearchTool: false,
      taskTools: false,
      mcpTools: true,
    };

    const deps = makeDeps();
    const result = await assembleCronTools(config, deps);

    expect(deps.getMcpTools).toHaveBeenCalled();
    expect(result.tools.map((t: any) => t.name)).toEqual([
      'mcp__server1__tool_a',
      'mcp__server2__tool_b',
      'mcp__server3__tool_c',
    ]);
  });

  it('should filter MCP tools by per-server config', async () => {
    const config: CronToolConfig = {
      selfControlTools: false,
      skills: false,
      memoryTools: false,
      webSearchTool: false,
      taskTools: false,
      mcpTools: true,
      mcpServers: {
        server1: true,
        server2: false,
        server3: true,
      },
    };

    const result = await assembleCronTools(config, makeDeps());

    const toolNames = result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('mcp__server1__tool_a');
    expect(toolNames).not.toContain('mcp__server2__tool_b');
    expect(toolNames).toContain('mcp__server3__tool_c');
  });

  it('should not call getMcpTools when mcpTools disabled', async () => {
    const config: CronToolConfig = { mcpTools: false };
    const deps = makeDeps();

    await assembleCronTools(config, deps);

    expect(deps.getMcpTools).not.toHaveBeenCalled();
  });

  it('should include skillDirectories when skills enabled', async () => {
    const config: CronToolConfig = {
      skills: true,
      selfControlTools: false,
      memoryTools: false,
      webSearchTool: false,
      taskTools: false,
      mcpTools: false,
    };

    const result = await assembleCronTools(config, makeDeps());

    expect(result.skillDirectories).toEqual(['/skills/user', '/skills/builtin']);
  });

  it('should apply disabledSkills when skills enabled', async () => {
    const config: CronToolConfig = {
      skills: true,
      disabledSkills: ['skill-a', 'skill-b'],
      selfControlTools: false,
    };

    const result = await assembleCronTools(config, makeDeps());

    expect(result.skillDirectories).toEqual(['/skills/user', '/skills/builtin']);
    expect(result.disabledSkills).toEqual(['skill-a', 'skill-b']);
  });

  it('should combine multiple enabled categories', async () => {
    const config: CronToolConfig = {
      selfControlTools: true,
      skills: true,
      memoryTools: true,
      webSearchTool: true,
      taskTools: true,
      mcpTools: true,
    };

    const result = await assembleCronTools(config, makeDeps());

    const toolNames = result.tools.map((t: any) => t.name);
    // selfControlTools
    expect(toolNames).toContain('read_profile');
    // memory
    expect(toolNames).toContain('read_memory');
    // web search
    expect(toolNames).toContain('web_search');
    // task
    expect(toolNames).toContain('task_create');
    // MCP
    expect(toolNames).toContain('mcp__server1__tool_a');

    expect(result.skillDirectories).toEqual(['/skills/user', '/skills/builtin']);
  });

  it('should handle getMcpTools failure gracefully', async () => {
    const config: CronToolConfig = {
      mcpTools: true,
      selfControlTools: true,
    };

    const deps = makeDeps({
      getMcpTools: vi.fn().mockRejectedValue(new Error('MCP unavailable')),
    });

    const result = await assembleCronTools(config, deps);

    // Should still have selfControlTools despite MCP failure
    expect(result.tools.map((t: any) => t.name)).toContain('read_profile');
    // MCP tools should be absent but no error thrown
    expect(result.tools.map((t: any) => t.name)).not.toContain('mcp__server1__tool_a');
  });

  it('should use default values (all false) when config properties are undefined', async () => {
    const config: CronToolConfig = {};

    const deps = makeDeps();
    const result = await assembleCronTools(config, deps);

    expect(result.tools).toEqual([]);
    expect(result.skillDirectories).toBeUndefined();
    expect(deps.getMcpTools).not.toHaveBeenCalled();
  });
});
