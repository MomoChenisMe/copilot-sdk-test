import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Hoisted mocks ──────────────────────────────────────────────────────
const {
  mockConnect,
  mockDisconnect,
  mockListTools,
  mockCallTool,
  mockIsConnected,
  mockGetConfig,
  MockMcpClient,
  mockParseMcpConfig,
} = vi.hoisted(() => {
  const mockConnect = vi.fn().mockResolvedValue(undefined);
  const mockDisconnect = vi.fn().mockResolvedValue(undefined);
  const mockListTools = vi.fn().mockResolvedValue([]);
  const mockCallTool = vi.fn();
  const mockIsConnected = vi.fn().mockReturnValue(true);
  const mockGetConfig = vi.fn();

  const MockMcpClient = vi.fn().mockImplementation((config: any) => {
    mockGetConfig.mockReturnValue(config);
    return {
      connect: mockConnect,
      disconnect: mockDisconnect,
      listTools: mockListTools,
      callTool: mockCallTool,
      isConnected: mockIsConnected,
      getConfig: () => config,
    };
  });

  const mockParseMcpConfig = vi.fn().mockReturnValue([]);

  return {
    mockConnect,
    mockDisconnect,
    mockListTools,
    mockCallTool,
    mockIsConnected,
    mockGetConfig,
    MockMcpClient,
    mockParseMcpConfig,
  };
});

vi.mock('../../src/mcp/mcp-client.js', () => ({
  McpClient: MockMcpClient,
}));

vi.mock('../../src/mcp/mcp-config.js', () => ({
  parseMcpConfig: mockParseMcpConfig,
}));

vi.mock('../../src/utils/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// ── Import after mocks ────────────────────────────────────────────────
import { McpManager } from '../../src/mcp/mcp-manager.js';
import type { McpServerConfig } from '../../src/mcp/mcp-config.js';

describe('McpManager', () => {
  let manager: McpManager;

  const stdioConfig: McpServerConfig = {
    name: 'fs-server',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@mcp/fs-server'],
  };

  const httpConfig: McpServerConfig = {
    name: 'web-server',
    transport: 'http',
    url: 'http://localhost:3001/mcp',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default MockMcpClient implementation (getAllTools test overrides it)
    MockMcpClient.mockImplementation((config: any) => ({
      connect: mockConnect,
      disconnect: mockDisconnect,
      listTools: mockListTools,
      callTool: mockCallTool,
      isConnected: mockIsConnected,
      getConfig: () => config,
    }));
    mockConnect.mockResolvedValue(undefined);
    mockDisconnect.mockResolvedValue(undefined);
    mockListTools.mockResolvedValue([]);
    mockIsConnected.mockReturnValue(true);
    mockParseMcpConfig.mockReturnValue([]);
    manager = new McpManager();
  });

  // ── start / stop / list servers ─────────────────────────────────────
  describe('startServer', () => {
    it('should create and connect an MCP client', async () => {
      await manager.startServer(stdioConfig);

      expect(MockMcpClient).toHaveBeenCalledWith(stdioConfig);
      expect(mockConnect).toHaveBeenCalled();
    });

    it('should register the server in the servers map', async () => {
      await manager.startServer(stdioConfig);

      const servers = manager.getServers();
      expect(servers.has('fs-server')).toBe(true);
      expect(servers.get('fs-server')!.config).toEqual(stdioConfig);
      expect(servers.get('fs-server')!.connected).toBe(true);
    });

    it('should support multiple servers', async () => {
      await manager.startServer(stdioConfig);
      await manager.startServer(httpConfig);

      const servers = manager.getServers();
      expect(servers.size).toBe(2);
    });
  });

  describe('stopServer', () => {
    it('should disconnect and remove the server', async () => {
      await manager.startServer(stdioConfig);
      await manager.stopServer('fs-server');

      expect(mockDisconnect).toHaveBeenCalled();
      expect(manager.getServers().has('fs-server')).toBe(false);
    });

    it('should be safe to stop a non-existent server', async () => {
      await expect(manager.stopServer('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('getServers', () => {
    it('should return empty map initially', () => {
      expect(manager.getServers().size).toBe(0);
    });
  });

  // ── restartServer ───────────────────────────────────────────────────
  describe('restartServer', () => {
    it('should disconnect then reconnect the server', async () => {
      await manager.startServer(stdioConfig);
      vi.clearAllMocks();

      await manager.restartServer('fs-server');

      expect(mockDisconnect).toHaveBeenCalled();
      expect(MockMcpClient).toHaveBeenCalledWith(stdioConfig);
      expect(mockConnect).toHaveBeenCalled();
    });

    it('should throw for non-existent server', async () => {
      await expect(manager.restartServer('nonexistent')).rejects.toThrow();
    });
  });

  // ── getAllTools ──────────────────────────────────────────────────────
  describe('getAllTools', () => {
    it('should aggregate tools from multiple servers', async () => {
      // Set up tools per client instance
      let callCount = 0;
      MockMcpClient.mockImplementation((config: any) => {
        callCount++;
        const tools = callCount === 1
          ? [{ name: 'read_file', description: 'Read', inputSchema: {} }]
          : [{ name: 'fetch', description: 'Fetch URL', inputSchema: {} }];
        return {
          connect: vi.fn().mockResolvedValue(undefined),
          disconnect: vi.fn().mockResolvedValue(undefined),
          listTools: vi.fn().mockResolvedValue(tools),
          callTool: vi.fn(),
          isConnected: vi.fn().mockReturnValue(true),
          getConfig: () => config,
        };
      });

      await manager.startServer(stdioConfig);
      await manager.startServer(httpConfig);

      const allTools = await manager.getAllTools();
      expect(allTools).toHaveLength(2);
      expect(allTools[0]).toMatchObject({ name: 'read_file', serverName: 'fs-server' });
      expect(allTools[1]).toMatchObject({ name: 'fetch', serverName: 'web-server' });
    });

    it('should return empty array when no servers', async () => {
      const tools = await manager.getAllTools();
      expect(tools).toEqual([]);
    });
  });

  // ── callTool ────────────────────────────────────────────────────────
  describe('callTool', () => {
    it('should route to the correct server', async () => {
      mockCallTool.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
      await manager.startServer(stdioConfig);

      const result = await manager.callTool('fs-server', 'read_file', { path: '/tmp' });

      expect(mockCallTool).toHaveBeenCalledWith('read_file', { path: '/tmp' });
      expect(result).toEqual({ content: [{ type: 'text', text: 'ok' }] });
    });

    it('should throw for unknown server', async () => {
      await expect(manager.callTool('nonexistent', 'foo', {})).rejects.toThrow();
    });
  });

  // ── loadFromConfig ──────────────────────────────────────────────────
  describe('loadFromConfig', () => {
    it('should read .mcp.json and start servers', async () => {
      mockParseMcpConfig.mockReturnValue([stdioConfig, httpConfig]);

      await manager.loadFromConfig('/path/to/.mcp.json');

      expect(mockParseMcpConfig).toHaveBeenCalledWith('/path/to/.mcp.json');
      expect(MockMcpClient).toHaveBeenCalledTimes(2);
      expect(manager.getServers().size).toBe(2);
    });

    it('should handle empty config', async () => {
      mockParseMcpConfig.mockReturnValue([]);

      await manager.loadFromConfig('/path/to/.mcp.json');
      expect(manager.getServers().size).toBe(0);
    });
  });

  // ── stopAll ─────────────────────────────────────────────────────────
  describe('stopAll', () => {
    it('should disconnect all servers', async () => {
      await manager.startServer(stdioConfig);
      await manager.startServer(httpConfig);

      await manager.stopAll();

      expect(mockDisconnect).toHaveBeenCalledTimes(2);
      expect(manager.getServers().size).toBe(0);
    });

    it('should be safe when no servers', async () => {
      await expect(manager.stopAll()).resolves.toBeUndefined();
    });
  });

  // ── reloadConfig (hot-reload) ────────────────────────────────────────
  describe('reloadConfig', () => {
    it('should add new servers from updated config', async () => {
      // Start with one server
      await manager.startServer(stdioConfig);

      // Reload with two servers
      mockParseMcpConfig.mockReturnValue([stdioConfig, httpConfig]);
      await manager.reloadConfig('/path/to/.mcp.json');

      expect(manager.getServers().size).toBe(2);
      expect(manager.getServers().has('web-server')).toBe(true);
    });

    it('should remove servers no longer in config', async () => {
      await manager.startServer(stdioConfig);
      await manager.startServer(httpConfig);
      expect(manager.getServers().size).toBe(2);

      // Reload with only stdio
      mockParseMcpConfig.mockReturnValue([stdioConfig]);
      await manager.reloadConfig('/path/to/.mcp.json');

      expect(manager.getServers().size).toBe(1);
      expect(manager.getServers().has('fs-server')).toBe(true);
      expect(manager.getServers().has('web-server')).toBe(false);
    });

    it('should restart servers whose config changed', async () => {
      await manager.startServer(stdioConfig);
      const initialCallCount = MockMcpClient.mock.calls.length;

      // Reload with modified config for same server name
      const modifiedConfig = { ...stdioConfig, args: ['--new-flag'] };
      mockParseMcpConfig.mockReturnValue([modifiedConfig]);
      await manager.reloadConfig('/path/to/.mcp.json');

      expect(manager.getServers().size).toBe(1);
      // Should have created a new client for the restarted server
      expect(MockMcpClient.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });
});
