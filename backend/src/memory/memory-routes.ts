import { Router } from 'express';
import type { MemoryStore } from './memory-store.js';
import type { MemoryIndex } from './memory-index.js';
import type { MemoryCompactor } from './memory-compaction.js';
import { readMemoryConfig, writeMemoryConfig } from './memory-config.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function createAutoMemoryRoutes(
  store: MemoryStore,
  index: MemoryIndex,
  configPath: string,
  compactor?: MemoryCompactor,
): Router {
  const router = Router();

  // GET /main — read MEMORY.md
  router.get('/main', (_req, res) => {
    res.json({ content: store.readMemory() });
  });

  // PUT /main — write MEMORY.md
  router.put('/main', (req, res) => {
    const { content } = req.body;
    store.writeMemory(content ?? '');
    res.json({ ok: true });
  });

  // GET /daily — list daily logs
  router.get('/daily', (_req, res) => {
    res.json({ dates: store.listDailyLogs() });
  });

  // GET /daily/:date — read daily log
  router.get('/daily/:date', (req, res) => {
    const { date } = req.params;
    if (!DATE_RE.test(date)) {
      res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
      return;
    }
    res.json({ content: store.readDailyLog(date) });
  });

  // GET /search — search memory index
  router.get('/search', (req, res) => {
    const query = req.query.q as string | undefined;
    if (!query) {
      res.status(400).json({ error: 'Missing query parameter q' });
      return;
    }
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const results = index.searchBM25(query, limit);
    res.json({
      results: results.map((r) => ({
        content: r.content,
        category: r.category,
        source: r.source,
      })),
    });
  });

  // GET /config — read memory config
  router.get('/config', (_req, res) => {
    res.json(readMemoryConfig(configPath));
  });

  // PUT /config — update memory config
  router.put('/config', (req, res) => {
    const current = readMemoryConfig(configPath);
    const updated = { ...current, ...req.body };
    writeMemoryConfig(configPath, updated);
    res.json({ ok: true });
  });

  // GET /stats — memory statistics
  router.get('/stats', (_req, res) => {
    const stats = index.getStats();
    const dailyCount = store.listDailyLogs().length;
    res.json({ ...stats, dailyLogCount: dailyCount });
  });

  // POST /compact — trigger memory compaction
  router.post('/compact', async (req, res) => {
    if (!compactor) {
      res.status(400).json({ error: 'Memory compaction is not enabled' });
      return;
    }
    const result = await compactor.compact();
    if (result) {
      res.json(result);
    } else {
      res.json({ message: 'Compaction skipped or failed. No changes made.' });
    }
  });

  return router;
}
