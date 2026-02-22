import { Router } from 'express';
import type { McpManager } from './mcp-manager.js';
import { addToMcpConfig, removeFromMcpConfig } from './mcp-config.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('mcp-routes');

export function createMcpRoutes(manager: McpManager, configPath?: string): Router {
  const router = Router();

  router.get('/servers', (_req, res) => {
    const servers = manager.getServers();
    const result = Array.from(servers.entries()).map(([name, info]) => ({
      name,
      transport: info.config.transport,
      connected: info.connected,
      config: info.config,
    }));
    res.json({ servers: result });
  });

  router.post('/servers', async (req, res) => {
    try {
      const { name, transport, command, args, url, env } = req.body;
      await manager.startServer({ name, transport, command, args, url, env });
      if (configPath) {
        addToMcpConfig(configPath, { name, transport, command, args, url, env });
      }
      res.json({ ok: true });
    } catch (err: any) {
      log.error('Failed to add MCP server:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/servers/:name', async (req, res) => {
    try {
      await manager.stopServer(req.params.name);
      if (configPath) {
        removeFromMcpConfig(configPath, req.params.name);
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/servers/:name/restart', async (req, res) => {
    try {
      await manager.restartServer(req.params.name);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/tools', async (_req, res) => {
    try {
      const tools = await manager.getAllTools();
      res.json({ tools });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
