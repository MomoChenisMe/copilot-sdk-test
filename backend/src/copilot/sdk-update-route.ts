import { Router } from 'express';
import { SdkUpdateChecker } from './sdk-update.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('sdk-update-route');

export function createSdkUpdateRoute(): Router {
  const router = Router();
  const checker = new SdkUpdateChecker();

  router.get('/sdk-version', (_req, res) => {
    try {
      const currentVersion = checker.getInstalledVersion();
      res.json({ currentVersion });
    } catch (err) {
      log.error({ err }, 'Failed to check SDK version');
      res.status(500).json({ error: 'Failed to check SDK version' });
    }
  });

  return router;
}
