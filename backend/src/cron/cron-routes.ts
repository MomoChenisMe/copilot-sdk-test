import { Router } from 'express';
import type { CronStore } from './cron-store.js';
import type { CronScheduler } from './cron-scheduler.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('cron-routes');

const VALID_TYPES = ['ai', 'shell'] as const;
const VALID_SCHEDULE_TYPES = ['cron', 'interval', 'once'] as const;

export function createCronRoutes(store: CronStore, scheduler: CronScheduler): Router {
  const router = Router();

  // GET /jobs - list all
  router.get('/jobs', (_req, res) => {
    const jobs = store.listAll();
    res.json({ jobs });
  });

  // POST /jobs - create
  router.post('/jobs', (req, res) => {
    const { name, type, scheduleType, scheduleValue, config } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
    }
    if (!VALID_SCHEDULE_TYPES.includes(scheduleType)) {
      return res.status(400).json({ error: `scheduleType must be one of: ${VALID_SCHEDULE_TYPES.join(', ')}` });
    }
    if (!scheduleValue || typeof scheduleValue !== 'string') {
      return res.status(400).json({ error: 'scheduleValue is required' });
    }

    try {
      const job = store.create({ name, type, scheduleType, scheduleValue, config });
      scheduler.registerJob(job);
      res.status(201).json({ job });
    } catch (err: any) {
      log.error({ err }, 'Failed to create cron job');
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /jobs/:id - update
  router.put('/jobs/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const updated = store.update(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Re-register if schedule changed or enabled toggled
    if (updated.enabled) {
      scheduler.registerJob(updated);
    } else {
      scheduler.unregisterJob(updated.id);
    }

    res.json({ job: updated });
  });

  // DELETE /jobs/:id - delete
  router.delete('/jobs/:id', (req, res) => {
    const { id } = req.params;
    scheduler.unregisterJob(id);
    const deleted = store.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.status(204).send();
  });

  // POST /jobs/:id/trigger - manual trigger
  router.post('/jobs/:id/trigger', async (req, res) => {
    const { id } = req.params;
    const job = store.getById(id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Fire and forget - respond immediately
    scheduler.triggerJob(id).catch((err) => {
      log.error({ err, jobId: id }, 'Manual trigger failed');
    });

    res.status(202).json({ message: 'Job triggered' });
  });

  // GET /jobs/:id/history - execution history
  router.get('/jobs/:id/history', (req, res) => {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const history = store.getHistory(id, limit);
    res.json({ history });
  });

  return router;
}
