import { Router } from 'express';
import type { ClientManager } from './client-manager.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('copilot-models');

export function createModelsRoute(clientManager: ClientManager): Router {
  const router = Router();

  router.get('/models', async (_req, res) => {
    try {
      const models = await clientManager.listModels();
      res.json(models);
    } catch (err) {
      log.error({ err }, 'Failed to list models');
      res.status(500).json({ error: 'Failed to list models' });
    }
  });

  return router;
}
