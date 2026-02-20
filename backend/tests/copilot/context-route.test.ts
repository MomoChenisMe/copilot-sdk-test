import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { createContextRoute, type ContextRouteDeps } from '../../src/copilot/context-route.js';

// Mock SdkUpdateChecker
vi.mock('../../src/copilot/sdk-update.js', () => ({
  SdkUpdateChecker: vi.fn().mockImplementation(() => ({
    getInstalledVersion: vi.fn().mockReturnValue('0.15.0'),
  })),
}));

function makeMockDeps(overrides?: Partial<ContextRouteDeps>): ContextRouteDeps {
  return {
    promptStore: {
      readFile: vi.fn().mockImplementation((path: string) => {
        if (path === 'SYSTEM_PROMPT.md') return 'You are an AI assistant.';
        if (path === 'PROFILE.md') return '';
        if (path === 'AGENT.md') return 'Be helpful.';
        if (path === 'presets/devops.md') return 'DevOps preset content';
        if (path === 'memory/preferences.md') return 'User prefers TypeScript';
        return '';
      }),
      listFiles: vi.fn().mockImplementation((subDir: string) => {
        if (subDir === 'presets') return ['devops'];
        return [];
      }),
    } as any,
    skillStore: {
      listSkills: vi.fn().mockReturnValue([
        { name: 'code-review', description: 'Review code', content: '...' },
      ]),
    } as any,
    builtinSkillStore: {
      listSkills: vi.fn().mockReturnValue([
        { name: 'explain', description: 'Explain code', content: '...', builtin: true },
        { name: 'fix', description: 'Fix code', content: '...', builtin: true },
      ]),
    } as any,
    mcpManager: {
      getServers: vi.fn().mockReturnValue(
        new Map([
          ['sqlite', { config: { name: 'sqlite', transport: 'stdio' }, connected: true }],
        ]),
      ),
      getAllTools: vi.fn().mockResolvedValue([
        { name: 'query', serverName: 'sqlite' },
        { name: 'execute', serverName: 'sqlite' },
      ]),
    } as any,
    ...overrides,
  };
}

describe('GET /api/copilot/context', () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;
  let deps: ContextRouteDeps;

  beforeEach(() => {
    deps = makeMockDeps();
    app = express();
    app.use('/api/copilot', createContextRoute(deps));
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server?.close();
  });

  it('should return systemPrompt layers, skills, mcp, model, sdkVersion', async () => {
    const res = await fetch(`${baseUrl}/api/copilot/context`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Top-level structure
    expect(body).toHaveProperty('systemPrompt');
    expect(body).toHaveProperty('skills');
    expect(body).toHaveProperty('mcp');
    expect(body).toHaveProperty('model');
    expect(body).toHaveProperty('sdkVersion');
  });

  it('should return system prompt layers with correct names and char counts', async () => {
    const res = await fetch(`${baseUrl}/api/copilot/context`);
    const body = await res.json();
    const { layers, totalChars, maxChars } = body.systemPrompt;

    // Should have core layers + preset + memory
    expect(layers.length).toBe(5); // SYSTEM_PROMPT, PROFILE, AGENT, preset:devops, memory:preferences

    // SYSTEM_PROMPT is active
    const sysLayer = layers.find((l: any) => l.name === 'SYSTEM_PROMPT');
    expect(sysLayer).toBeDefined();
    expect(sysLayer.active).toBe(true);
    expect(sysLayer.charCount).toBe('You are an AI assistant.'.length);

    // PROFILE is empty, so not active
    const profileLayer = layers.find((l: any) => l.name === 'PROFILE');
    expect(profileLayer).toBeDefined();
    expect(profileLayer.active).toBe(false);
    expect(profileLayer.charCount).toBe(0);

    // AGENT is active
    const agentLayer = layers.find((l: any) => l.name === 'AGENT');
    expect(agentLayer).toBeDefined();
    expect(agentLayer.active).toBe(true);

    // Preset layer
    const presetLayer = layers.find((l: any) => l.name === 'preset:devops');
    expect(presetLayer).toBeDefined();
    expect(presetLayer.active).toBe(true);
    expect(presetLayer.charCount).toBe('DevOps preset content'.length);

    // Memory preferences
    const memLayer = layers.find((l: any) => l.name === 'memory:preferences');
    expect(memLayer).toBeDefined();
    expect(memLayer.active).toBe(true);

    // totalChars should be sum of all layers
    const expectedTotal = layers.reduce((sum: number, l: any) => sum + l.charCount, 0);
    expect(totalChars).toBe(expectedTotal);

    // maxChars should be 50_000 by default
    expect(maxChars).toBe(50_000);
  });

  it('should return builtin and user skills', async () => {
    const res = await fetch(`${baseUrl}/api/copilot/context`);
    const body = await res.json();

    expect(body.skills.builtin).toHaveLength(2);
    expect(body.skills.builtin[0].name).toBe('explain');
    expect(body.skills.builtin[1].name).toBe('fix');
    expect(body.skills.builtin[0].enabled).toBe(true);

    expect(body.skills.user).toHaveLength(1);
    expect(body.skills.user[0].name).toBe('code-review');
    expect(body.skills.user[0].description).toBe('Review code');
    expect(body.skills.user[0].enabled).toBe(true);
  });

  it('should return MCP servers with tool counts', async () => {
    const res = await fetch(`${baseUrl}/api/copilot/context`);
    const body = await res.json();

    expect(body.mcp.servers).toHaveLength(1);
    expect(body.mcp.servers[0].name).toBe('sqlite');
    expect(body.mcp.servers[0].transport).toBe('stdio');
    expect(body.mcp.servers[0].toolCount).toBe(2);
  });

  it('should return sdkVersion', async () => {
    const res = await fetch(`${baseUrl}/api/copilot/context`);
    const body = await res.json();

    expect(body.sdkVersion).toBe('0.15.0');
  });

  it('should return model as null (server-side)', async () => {
    const res = await fetch(`${baseUrl}/api/copilot/context`);
    const body = await res.json();

    expect(body.model).toBeNull();
  });

  it('should handle empty MCP servers', async () => {
    const emptyDeps = makeMockDeps({
      mcpManager: {
        getServers: vi.fn().mockReturnValue(new Map()),
        getAllTools: vi.fn().mockResolvedValue([]),
      } as any,
    });
    const emptyApp = express();
    emptyApp.use('/api/copilot', createContextRoute(emptyDeps));
    const emptyServer = emptyApp.listen(0);
    const emptyAddr = emptyServer.address();
    const emptyPort = typeof emptyAddr === 'object' && emptyAddr ? emptyAddr.port : 0;
    const emptyBaseUrl = `http://localhost:${emptyPort}`;

    const res = await fetch(`${emptyBaseUrl}/api/copilot/context`);
    const body = await res.json();

    expect(body.mcp.servers).toHaveLength(0);
    emptyServer.close();
  });

  it('should handle MCP tool listing errors gracefully', async () => {
    const errorDeps = makeMockDeps({
      mcpManager: {
        getServers: vi.fn().mockReturnValue(
          new Map([
            ['broken-server', { config: { name: 'broken-server', transport: 'http' }, connected: false }],
          ]),
        ),
        getAllTools: vi.fn().mockRejectedValue(new Error('Connection refused')),
      } as any,
    });
    const errorApp = express();
    errorApp.use('/api/copilot', createContextRoute(errorDeps));
    const errorServer = errorApp.listen(0);
    const errorAddr = errorServer.address();
    const errorPort = typeof errorAddr === 'object' && errorAddr ? errorAddr.port : 0;
    const errorBaseUrl = `http://localhost:${errorPort}`;

    const res = await fetch(`${errorBaseUrl}/api/copilot/context`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.mcp.servers).toHaveLength(1);
    expect(body.mcp.servers[0].name).toBe('broken-server');
    expect(body.mcp.servers[0].toolCount).toBe(0);
    errorServer.close();
  });

  it('should respect custom maxPromptLength', async () => {
    const customDeps = makeMockDeps();
    const customApp = express();
    customApp.use('/api/copilot', createContextRoute({ ...customDeps, maxPromptLength: 100_000 }));
    const customServer = customApp.listen(0);
    const customAddr = customServer.address();
    const customPort = typeof customAddr === 'object' && customAddr ? customAddr.port : 0;
    const customBaseUrl = `http://localhost:${customPort}`;

    const res = await fetch(`${customBaseUrl}/api/copilot/context`);
    const body = await res.json();

    expect(body.systemPrompt.maxChars).toBe(100_000);
    customServer.close();
  });
});
