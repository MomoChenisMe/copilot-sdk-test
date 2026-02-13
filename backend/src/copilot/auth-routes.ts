import { Router } from 'express';
import type { ClientManager } from './client-manager.js';
import { startDeviceFlow, pollDeviceFlow } from './device-flow.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('copilot-auth');

export function createCopilotAuthRoutes(clientManager: ClientManager): Router {
  const router = Router();

  // GET /status — check current Copilot auth status
  router.get('/status', async (_req, res) => {
    try {
      const status = await clientManager.getAuthStatus();
      res.json({
        isAuthenticated: status.isAuthenticated,
        method: status.authType,
        login: status.login,
      });
    } catch {
      res.json({ isAuthenticated: false });
    }
  });

  // POST /device-flow/start — initiate GitHub OAuth Device Flow
  router.post('/device-flow/start', async (_req, res) => {
    const clientId = clientManager.getGithubClientId();
    if (!clientId) {
      res.status(400).json({ error: 'GITHUB_CLIENT_ID not configured' });
      return;
    }

    try {
      const result = await startDeviceFlow(clientId);
      res.json({
        userCode: result.userCode,
        verificationUri: result.verificationUri,
        deviceCode: result.deviceCode,
        expiresIn: result.expiresIn,
      });
    } catch (err) {
      log.error({ err }, 'Failed to start device flow');
      res.status(502).json({ error: 'Failed to start device flow' });
    }
  });

  // POST /device-flow/complete — poll until authorization completes
  router.post('/device-flow/complete', async (req, res) => {
    const { deviceCode } = req.body ?? {};

    if (!deviceCode || typeof deviceCode !== 'string') {
      res.status(400).json({ error: 'deviceCode is required' });
      return;
    }

    const clientId = clientManager.getGithubClientId();
    if (!clientId) {
      res.status(400).json({ error: 'GITHUB_CLIENT_ID not configured' });
      return;
    }

    try {
      const token = await pollDeviceFlow(clientId, deviceCode);
      await clientManager.setGithubToken(token);
      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error({ err }, 'Device flow completion failed');

      if (message.includes('denied')) {
        res.status(403).json({ error: message });
      } else if (message.includes('timed out')) {
        res.status(408).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  });

  return router;
}
