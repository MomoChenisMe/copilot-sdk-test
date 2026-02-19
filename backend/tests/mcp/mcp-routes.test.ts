import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';

const mockManager = {
  getServers: vi.fn().mockReturnValue(new Map()),
  startServer: vi.fn().mockResolvedValue(undefined),
  stopServer: vi.fn().mockResolvedValue(undefined),
  restartServer: vi.fn().mockResolvedValue(undefined),
  getAllTools: vi.fn().mockResolvedValue([]),
  reloadConfig: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../src/mcp/mcp-manager.js', () => ({
  McpManager: vi.fn(() => mockManager),
}));

import { createMcpRoutes } from '../../src/mcp/routes.js';

describe('MCP REST API', () => {
  let server: Server;
  let port: number;

  beforeEach(async () => {
    vi.clearAllMocks();
    const app = express();
    app.use(express.json());
    app.use('/api/mcp', createMcpRoutes(mockManager as any));
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        port = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterEach(() => {
    server?.close();
  });

  describe('GET /api/mcp/servers', () => {
    it('should return list of servers', async () => {
      mockManager.getServers.mockReturnValue(new Map([
        ['fs', { config: { name: 'fs', transport: 'stdio' }, connected: true }],
      ]));

      const res = await fetch(`http://localhost:${port}/api/mcp/servers`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.servers).toHaveLength(1);
      expect(body.servers[0].name).toBe('fs');
      expect(body.servers[0].connected).toBe(true);
    });
  });

  describe('POST /api/mcp/servers', () => {
    it('should add a new server', async () => {
      const res = await fetch(`http://localhost:${port}/api/mcp/servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'test',
          transport: 'stdio',
          command: 'node',
          args: ['server.js'],
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(mockManager.startServer).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'test', transport: 'stdio' }),
      );
    });
  });

  describe('DELETE /api/mcp/servers/:name', () => {
    it('should stop a server', async () => {
      const res = await fetch(`http://localhost:${port}/api/mcp/servers/test`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);
      expect(mockManager.stopServer).toHaveBeenCalledWith('test');
    });
  });

  describe('POST /api/mcp/servers/:name/restart', () => {
    it('should restart a server', async () => {
      const res = await fetch(`http://localhost:${port}/api/mcp/servers/test/restart`, {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      expect(mockManager.restartServer).toHaveBeenCalledWith('test');
    });
  });

  describe('GET /api/mcp/tools', () => {
    it('should return aggregated tools', async () => {
      mockManager.getAllTools.mockResolvedValue([
        { name: 'read', description: 'Read file', inputSchema: {}, serverName: 'fs' },
      ]);

      const res = await fetch(`http://localhost:${port}/api/mcp/tools`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.tools).toHaveLength(1);
      expect(body.tools[0].name).toBe('read');
    });
  });
});
