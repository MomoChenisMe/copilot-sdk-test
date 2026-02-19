import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Hoisted mocks (available inside vi.mock factories) ─────────────────
const {
  mockConnect,
  mockClose,
  mockListTools,
  mockCallTool,
  MockClient,
  MockStdioTransport,
  MockHttpTransport,
} = vi.hoisted(() => {
  const mockConnect = vi.fn().mockResolvedValue(undefined);
  const mockClose = vi.fn().mockResolvedValue(undefined);
  const mockListTools = vi.fn();
  const mockCallTool = vi.fn();

  const MockClient = vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    close: mockClose,
    listTools: mockListTools,
    callTool: mockCallTool,
  }));

  const MockStdioTransport = vi.fn().mockImplementation(() => ({
    type: 'stdio',
  }));

  const MockHttpTransport = vi.fn().mockImplementation(() => ({
    type: 'http',
  }));

  return {
    mockConnect,
    mockClose,
    mockListTools,
    mockCallTool,
    MockClient,
    MockStdioTransport,
    MockHttpTransport,
  };
});

vi.mock('@modelcontextprotocol/sdk/client', () => ({
  Client: MockClient,
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: MockStdioTransport,
}));

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: MockHttpTransport,
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
import { McpClient } from '../../src/mcp/mcp-client.js';
import type { McpServerConfig } from '../../src/mcp/mcp-config.js';

describe('McpClient', () => {
  let stdioConfig: McpServerConfig;
  let httpConfig: McpServerConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    stdioConfig = {
      name: 'test-stdio',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@some/mcp-server'],
      env: { FOO: 'bar' },
    };

    httpConfig = {
      name: 'test-http',
      transport: 'http',
      url: 'http://localhost:3001/mcp',
    };
  });

  // ── Construction ────────────────────────────────────────────────────
  it('should store config', () => {
    const client = new McpClient(stdioConfig);
    expect(client.getConfig()).toEqual(stdioConfig);
  });

  it('should not be connected initially', () => {
    const client = new McpClient(stdioConfig);
    expect(client.isConnected()).toBe(false);
  });

  // ── stdio connection ────────────────────────────────────────────────
  describe('stdio connection', () => {
    it('should create StdioClientTransport with command and args', async () => {
      const client = new McpClient(stdioConfig);
      await client.connect();

      expect(MockStdioTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'npx',
          args: ['-y', '@some/mcp-server'],
        }),
      );
    });

    it('should pass env to transport', async () => {
      const client = new McpClient(stdioConfig);
      await client.connect();

      expect(MockStdioTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          env: expect.objectContaining({ FOO: 'bar' }),
        }),
      );
    });

    it('should create Client and call connect', async () => {
      const client = new McpClient(stdioConfig);
      await client.connect();

      expect(MockClient).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'test-stdio' }),
        expect.any(Object),
      );
      expect(mockConnect).toHaveBeenCalled();
    });

    it('should mark as connected after connect', async () => {
      const client = new McpClient(stdioConfig);
      await client.connect();
      expect(client.isConnected()).toBe(true);
    });
  });

  // ── http connection ─────────────────────────────────────────────────
  describe('http connection', () => {
    it('should create StreamableHTTPClientTransport with URL', async () => {
      const client = new McpClient(httpConfig);
      await client.connect();

      expect(MockHttpTransport).toHaveBeenCalledWith(
        expect.any(URL),
      );
    });

    it('should create Client and call connect', async () => {
      const client = new McpClient(httpConfig);
      await client.connect();

      expect(MockClient).toHaveBeenCalled();
      expect(mockConnect).toHaveBeenCalled();
    });

    it('should mark as connected after connect', async () => {
      const client = new McpClient(httpConfig);
      await client.connect();
      expect(client.isConnected()).toBe(true);
    });
  });

  // ── connection failure ──────────────────────────────────────────────
  describe('connection failure', () => {
    it('should throw on connect failure', async () => {
      mockConnect.mockRejectedValueOnce(new Error('Connection refused'));

      const client = new McpClient(stdioConfig);
      await expect(client.connect()).rejects.toThrow('Connection refused');
    });

    it('should remain disconnected on failure', async () => {
      mockConnect.mockRejectedValueOnce(new Error('fail'));

      const client = new McpClient(stdioConfig);
      try { await client.connect(); } catch { /* expected */ }
      expect(client.isConnected()).toBe(false);
    });
  });

  // ── listTools ───────────────────────────────────────────────────────
  describe('listTools', () => {
    it('should return formatted tools', async () => {
      mockListTools.mockResolvedValue({
        tools: [
          {
            name: 'read_file',
            description: 'Read a file',
            inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
          },
          {
            name: 'write_file',
            description: 'Write a file',
            inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } },
          },
        ],
      });

      const client = new McpClient(stdioConfig);
      await client.connect();
      const tools = await client.listTools();

      expect(tools).toHaveLength(2);
      expect(tools[0]).toEqual({
        name: 'read_file',
        description: 'Read a file',
        inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
      });
      expect(tools[1].name).toBe('write_file');
    });

    it('should throw if not connected', async () => {
      const client = new McpClient(stdioConfig);
      await expect(client.listTools()).rejects.toThrow();
    });
  });

  // ── callTool ────────────────────────────────────────────────────────
  describe('callTool', () => {
    it('should proxy to SDK client callTool', async () => {
      mockCallTool.mockResolvedValue({
        content: [{ type: 'text', text: 'result' }],
      });

      const client = new McpClient(stdioConfig);
      await client.connect();
      const result = await client.callTool('read_file', { path: '/tmp/test' });

      expect(mockCallTool).toHaveBeenCalledWith({ name: 'read_file', arguments: { path: '/tmp/test' } });
      expect(result).toEqual({ content: [{ type: 'text', text: 'result' }] });
    });

    it('should throw if not connected', async () => {
      const client = new McpClient(stdioConfig);
      await expect(client.callTool('foo', {})).rejects.toThrow();
    });
  });

  // ── disconnect ──────────────────────────────────────────────────────
  describe('disconnect', () => {
    it('should close the client', async () => {
      const client = new McpClient(stdioConfig);
      await client.connect();
      await client.disconnect();

      expect(mockClose).toHaveBeenCalled();
    });

    it('should mark as disconnected', async () => {
      const client = new McpClient(stdioConfig);
      await client.connect();
      await client.disconnect();
      expect(client.isConnected()).toBe(false);
    });

    it('should be safe to disconnect when not connected', async () => {
      const client = new McpClient(stdioConfig);
      await expect(client.disconnect()).resolves.toBeUndefined();
    });
  });
});
