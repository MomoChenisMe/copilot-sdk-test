import { Router } from 'express';
import { SdkUpdateChecker } from './sdk-update.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('sdk-update-route');

export function createSdkUpdateRoute(): Router {
  const router = Router();
  const checker = new SdkUpdateChecker();

  router.get('/sdk-version', async (_req, res) => {
    try {
      const result = await checker.checkForUpdate();
      res.json(result);
    } catch (err) {
      log.error({ err }, 'Failed to check SDK version');
      res.status(500).json({ error: 'Failed to check SDK version' });
    }
  });

  router.post('/sdk-update', async (_req, res) => {
    try {
      const result = await checker.performUpdate();
      res.json(result);
    } catch (err) {
      log.error({ err }, 'Failed to update SDK');
      res.status(500).json({ error: 'Failed to update SDK' });
    }
  });

  return router;
}
