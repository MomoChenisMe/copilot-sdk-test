import { Router } from 'express';
import type { CronStore } from './cron-store.js';
import type { CronScheduler } from './cron-scheduler.js';
import type { ConversationRepository } from '../conversation/repository.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('cron-routes');

const VALID_TYPES = ['ai', 'shell'] as const;
const VALID_SCHEDULE_TYPES = ['cron', 'interval', 'once'] as const;

export function createCronRoutes(store: CronStore, scheduler: CronScheduler, repo?: ConversationRepository): Router {
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

  // --- New endpoints ---

  // GET /history/recent - global recent history across all jobs
  router.get('/history/recent', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = store.getAllRecentHistory(limit);
    res.json({ history });
  });

  // GET /history/unread-count - badge counts
  router.get('/history/unread-count', (req, res) => {
    const since = (req.query.since as string) || new Date(0).toISOString();
    const unread = store.getUnreadCount(since);
    const failed = store.getFailedCount(since);
    res.json({ unread, failed });
  });

  // DELETE /history/:historyId - delete a single history entry
  router.delete('/history/:historyId', (req, res) => {
    const { historyId } = req.params;
    const deleted = store.deleteHistory(historyId);
    if (!deleted) {
      return res.status(404).json({ error: 'History record not found' });
    }
    res.status(204).send();
  });

  // DELETE /history - clear all history or prune to keep N entries
  router.delete('/history', (req, res) => {
    const keep = req.query.keep ? parseInt(req.query.keep as string) : undefined;
    let deleted: number;
    if (keep != null && keep >= 0) {
      deleted = store.pruneHistory(keep);
    } else {
      deleted = store.clearHistory();
    }
    res.json({ deleted });
  });

  // POST /history/:historyId/open-conversation - create conversation from history
  router.post('/history/:historyId/open-conversation', (req, res) => {
    if (!repo) {
      return res.status(500).json({ error: 'Conversation repository not configured' });
    }

    const { historyId } = req.params;
    const history = store.getHistoryById(historyId);
    if (!history) {
      return res.status(404).json({ error: 'History record not found' });
    }

    try {
      // Build a summary from the history record
      const prompt = history.prompt ?? 'Cron job execution';
      const contentPreview = history.content ? history.content.slice(0, 500) : history.output ?? 'No output';
      const toolCount = Array.isArray(history.toolRecords) ? history.toolRecords.length : 0;
      const usageInfo = history.usage
        ? `Tokens: ${history.usage.inputTokens} in / ${history.usage.outputTokens} out`
        : '';

      const summary = [
        `**Cron Job Execution Summary**`,
        `- **Prompt:** ${prompt}`,
        `- **Status:** ${history.status}`,
        `- **Started:** ${history.startedAt}`,
        history.finishedAt ? `- **Finished:** ${history.finishedAt}` : '',
        toolCount > 0 ? `- **Tool calls:** ${toolCount}` : '',
        usageInfo ? `- **${usageInfo}**` : '',
        '',
        '---',
        '',
        contentPreview,
      ].filter(Boolean).join('\n');

      // Create a new conversation
      const cwd = (history.configSnapshot as any)?.cwd || process.cwd();
      const model = (history.configSnapshot as any)?.model || 'gpt-4o';

      const conversation = repo.create({ model, cwd });
      repo.update(conversation.id, { title: `Cron: ${prompt.slice(0, 50)}` });

      // Add the summary as an assistant message with metadata
      repo.addMessage(conversation.id, {
        role: 'assistant',
        content: summary,
        metadata: {
          cronExecution: true,
          historyId: history.id,
          jobId: history.jobId,
          turnSegments: history.turnSegments,
          toolRecords: history.toolRecords,
          usage: history.usage,
        },
      });

      res.status(201).json({ conversation });
    } catch (err: any) {
      log.error({ err, historyId }, 'Failed to create conversation from cron history');
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
