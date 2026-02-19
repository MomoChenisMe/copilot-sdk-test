import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Hoisted mocks ──────────────────────────────────────────────────────
const { mockGetAllTools, mockCallTool } = vi.hoisted(() => {
  const mockGetAllTools = vi.fn().mockResolvedValue([]);
  const mockCallTool = vi.fn();

  return { mockGetAllTools, mockCallTool };
});

vi.mock('../../src/utils/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// ── Import after mocks ────────────────────────────────────────────────
import { adaptMcpTools } from '../../src/mcp/mcp-tool-adapter.js';
import type { McpManager } from '../../src/mcp/mcp-manager.js';

function createMockManager(): McpManager {
  return {
    getAllTools: mockGetAllTools,
    callTool: mockCallTool,
  } as unknown as McpManager;
}

describe('adaptMcpTools', () => {
  let manager: McpManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllTools.mockResolvedValue([]);
    manager = createMockManager();
  });

  // ── tool naming format ──────────────────────────────────────────────
  describe('tool naming format', () => {
    it('should name tools as mcp__<serverName>__<toolName>', async () => {
      mockGetAllTools.mockResolvedValue([
        {
          name: 'read_file',
          description: 'Read a file',
          inputSchema: { type: 'object', properties: {} },
          serverName: 'filesystem',
        },
      ]);

      const tools = await adaptMcpTools(manager);
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('mcp__filesystem__read_file');
    });

    it('should handle multiple tools from multiple servers', async () => {
      mockGetAllTools.mockResolvedValue([
        { name: 'read_file', description: 'Read', inputSchema: {}, serverName: 'fs' },
        { name: 'write_file', description: 'Write', inputSchema: {}, serverName: 'fs' },
        { name: 'fetch', description: 'Fetch', inputSchema: {}, serverName: 'web' },
      ]);

      const tools = await adaptMcpTools(manager);
      expect(tools).toHaveLength(3);
      expect(tools.map((t) => t.name)).toEqual([
        'mcp__fs__read_file',
        'mcp__fs__write_file',
        'mcp__web__fetch',
      ]);
    });
  });

  // ── input schema forwarding ─────────────────────────────────────────
  describe('input schema forwarding', () => {
    it('should forward the input schema as parameters', async () => {
      const schema = {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
        },
        required: ['path'],
      };

      mockGetAllTools.mockResolvedValue([
        { name: 'read_file', description: 'Read a file', inputSchema: schema, serverName: 'fs' },
      ]);

      const tools = await adaptMcpTools(manager);
      expect(tools[0].parameters).toEqual(schema);
    });

    it('should forward the description', async () => {
      mockGetAllTools.mockResolvedValue([
        { name: 'read_file', description: 'Read a file from disk', inputSchema: {}, serverName: 'fs' },
      ]);

      const tools = await adaptMcpTools(manager);
      expect(tools[0].description).toBe('Read a file from disk');
    });
  });

  // ── tool execution ──────────────────────────────────────────────────
  describe('tool execution', () => {
    it('should proxy handler to manager.callTool', async () => {
      mockGetAllTools.mockResolvedValue([
        { name: 'read_file', description: 'Read', inputSchema: {}, serverName: 'fs' },
      ]);
      mockCallTool.mockResolvedValue({ content: [{ type: 'text', text: 'file content' }] });

      const tools = await adaptMcpTools(manager);
      const dummyInvocation = { sessionId: 's1', toolCallId: 'tc1', toolName: 'mcp__fs__read_file', arguments: {} };
      const result = await tools[0].handler({ path: '/tmp/test' }, dummyInvocation);

      expect(mockCallTool).toHaveBeenCalledWith('fs', 'read_file', { path: '/tmp/test' });
      expect(result).toEqual({ content: [{ type: 'text', text: 'file content' }] });
    });

    it('should route to the correct server based on tool name', async () => {
      mockGetAllTools.mockResolvedValue([
        { name: 'read_file', description: 'Read', inputSchema: {}, serverName: 'fs' },
        { name: 'fetch', description: 'Fetch', inputSchema: {}, serverName: 'web' },
      ]);

      const tools = await adaptMcpTools(manager);
      const dummyInvocation = { sessionId: 's1', toolCallId: 'tc2', toolName: 'mcp__web__fetch', arguments: {} };
      await tools[1].handler({ url: 'https://example.com' }, dummyInvocation);

      expect(mockCallTool).toHaveBeenCalledWith('web', 'fetch', { url: 'https://example.com' });
    });
  });

  // ── edge cases ──────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('should return empty array when no MCP tools available', async () => {
      mockGetAllTools.mockResolvedValue([]);
      const tools = await adaptMcpTools(manager);
      expect(tools).toEqual([]);
    });
  });
});
