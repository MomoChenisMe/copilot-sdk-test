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

  router.get('/sdk-changelog', async (req, res) => {
    try {
      const from = req.query.from as string;
      const to = req.query.to as string;
      if (!from || !to) {
        res.status(400).json({ error: 'Missing "from" and "to" query parameters' });
        return;
      }
      const changelog = await checker.getChangelog(from, to);
      res.json({ changelog });
    } catch (err) {
      log.error({ err }, 'Failed to fetch SDK changelog');
      res.status(500).json({ error: 'Failed to fetch SDK changelog' });
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
