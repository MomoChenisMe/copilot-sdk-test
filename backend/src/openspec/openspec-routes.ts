import { Router, type Request } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { OpenSpecService, OpenSpecMetadataRepository } from './openspec-service.js';

export function createOpenSpecRoutes(defaultBasePath: string, db?: Database.Database): Router {
  const router = Router();
  const metaRepo = db ? new OpenSpecMetadataRepository(db) : null;

  /** Walk up from dir to find an openspec/ directory. */
  function findOpenspecUp(startDir: string): string | null {
    let dir = startDir;
    while (dir !== path.dirname(dir)) {
      const candidate = path.join(dir, 'openspec');
      if (fs.existsSync(candidate)) return candidate;
      dir = path.dirname(dir);
    }
    return null;
  }

  /**
   * Resolve OpenSpec service from ?cwd= query.
   * - If CWD is provided and openspec found → use it
   * - If CWD is provided but NOT found → return null (don't fall back)
   * - If no CWD → use default
   */
  function resolveService(req: Request): { service: OpenSpecService | null; resolvedPath: string | null } {
    const cwd = typeof req.query.cwd === 'string' ? req.query.cwd : undefined;
    if (cwd && path.isAbsolute(cwd)) {
      const found = findOpenspecUp(cwd);
      if (found) {
        return { service: new OpenSpecService(found), resolvedPath: found };
      }
      // CWD explicitly provided but no openspec found — don't fall back
      return { service: null, resolvedPath: null };
    }
    // No CWD provided — use default
    return { service: new OpenSpecService(defaultBasePath), resolvedPath: defaultBasePath };
  }

  /** Extract CWD from query for metadata lookups. */
  function resolveCwd(req: Request): string {
    const cwd = typeof req.query.cwd === 'string' ? req.query.cwd : undefined;
    return cwd && path.isAbsolute(cwd) ? cwd : defaultBasePath;
  }

  // GET /overview — project overview stats + resolvedPath
  router.get('/overview', (req, res) => {
    try {
      const { service, resolvedPath } = resolveService(req);
      if (!service) {
        res.json({ changesCount: 0, specsCount: 0, archivedCount: 0, config: null, resolvedPath: null });
        return;
      }
      const overview = service.getOverview();
      res.json({ ...overview, resolvedPath });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // GET /changes — list all active changes (with optional metadata)
  router.get('/changes', (req, res) => {
    try {
      const { service } = resolveService(req);
      if (!service) {
        res.json({ changes: [] });
        return;
      }
      const changes = service.listChanges();
      if (metaRepo) {
        const cwd = resolveCwd(req);
        const enriched = changes.map((c) => {
          const meta = metaRepo.queryOne(c.name, 'change', cwd);
          return { ...c, metadata: meta ?? null };
        });
        res.json({ changes: enriched });
      } else {
        res.json({ changes });
      }
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // GET /changes/:name/specs/:specName — get delta spec content
  router.get('/changes/:name/specs/:specName', (req, res) => {
    try {
      const { service } = resolveService(req);
      if (!service) {
        res.status(404).json({ error: 'No openspec found at specified CWD' });
        return;
      }
      const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
      const specName = Array.isArray(req.params.specName) ? req.params.specName[0] : req.params.specName;
      const content = service.getDeltaSpecFile(name, specName);
      if (content === null) {
        res.status(404).json({ error: 'Delta spec not found' });
        return;
      }
      res.json({ name: specName, content });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // GET /changes/:name — get single change detail
  router.get('/changes/:name', (req, res) => {
    try {
      const { service } = resolveService(req);
      if (!service) {
        res.status(404).json({ error: 'No openspec found at specified CWD' });
        return;
      }
      const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
      const change = service.getChange(name);
      if (!change) {
        res.status(404).json({ error: 'Change not found' });
        return;
      }
      res.json(change);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // PATCH /changes/:name/task — toggle a task checkbox
  router.patch('/changes/:name/task', (req, res) => {
    try {
      const { service } = resolveService(req);
      if (!service) {
        res.status(404).json({ error: 'No openspec found at specified CWD' });
        return;
      }
      const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
      const { taskLine, checked } = req.body ?? {};
      if (typeof taskLine !== 'string' || typeof checked !== 'boolean') {
        res.status(400).json({ error: 'taskLine (string) and checked (boolean) are required' });
        return;
      }
      const ok = service.updateTask(name, taskLine, checked);
      if (!ok) {
        res.status(404).json({ error: 'Task not found or already in requested state' });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // POST /changes/:name/archive — archive a change
  router.post('/changes/:name/archive', (req, res) => {
    try {
      const { service } = resolveService(req);
      if (!service) {
        res.status(404).json({ error: 'No openspec found at specified CWD' });
        return;
      }
      const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
      const ok = service.archiveChange(name);
      if (!ok) {
        res.status(404).json({ error: 'Change not found' });
        return;
      }
      // Update metadata: mark as archived
      if (metaRepo) {
        const cwd = resolveCwd(req);
        const today = new Date().toISOString().slice(0, 10);
        const archivedName = `${today}-${name}`;
        metaRepo.markArchived(name, cwd, archivedName);
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // DELETE /changes/:name — delete a change
  router.delete('/changes/:name', (req, res) => {
    try {
      const { service } = resolveService(req);
      if (!service) {
        res.status(404).json({ error: 'No openspec found at specified CWD' });
        return;
      }
      const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
      const ok = service.deleteChange(name);
      if (!ok) {
        res.status(404).json({ error: 'Change not found' });
        return;
      }
      // Clean up metadata
      if (metaRepo) {
        const cwd = resolveCwd(req);
        metaRepo.delete(name, 'change', cwd);
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // GET /specs — list all specs
  router.get('/specs', (req, res) => {
    try {
      const { service } = resolveService(req);
      if (!service) {
        res.json({ specs: [] });
        return;
      }
      const specs = service.listSpecs();
      res.json({ specs });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // GET /specs/:name — get full spec file content
  router.get('/specs/:name', (req, res) => {
    try {
      const { service } = resolveService(req);
      if (!service) {
        res.status(404).json({ error: 'No openspec found at specified CWD' });
        return;
      }
      const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
      const content = service.getSpecFile(name);
      if (content === null) {
        res.status(404).json({ error: 'Spec not found' });
        return;
      }
      res.json({ name, content });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // GET /archived — list all archived changes (with optional metadata)
  router.get('/archived', (req, res) => {
    try {
      const { service } = resolveService(req);
      if (!service) {
        res.json({ archived: [] });
        return;
      }
      const archived = service.listArchived();
      if (metaRepo) {
        const cwd = resolveCwd(req);
        const enriched = archived.map((a) => {
          const meta = metaRepo.queryOne(a.name, 'archived', cwd);
          return { ...a, metadata: meta ?? null };
        });
        res.json({ archived: enriched });
      } else {
        res.json({ archived });
      }
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // GET /archived/:name — get archived change detail
  router.get('/archived/:name', (req, res) => {
    try {
      const { service } = resolveService(req);
      if (!service) {
        res.status(404).json({ error: 'No openspec found at specified CWD' });
        return;
      }
      const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
      const change = service.getChange(name, true);
      if (!change) {
        res.status(404).json({ error: 'Archived change not found' });
        return;
      }
      res.json(change);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // DELETE /delete — delete openspec folder in the given CWD
  router.delete('/delete', (req, res) => {
    try {
      const cwd = typeof req.query.cwd === 'string' ? req.query.cwd : undefined;
      if (!cwd || !path.isAbsolute(cwd)) {
        res.status(400).json({ error: 'Valid absolute cwd query parameter is required' });
        return;
      }
      const result = OpenSpecService.deleteOpenspecFolder(cwd);
      if (result.success) {
        res.json({ ok: true });
      } else {
        res.status(404).json({ error: result.error || 'Delete failed' });
      }
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // POST /init — initialize openspec in the given CWD
  router.post('/init', async (req, res) => {
    try {
      const cwd = typeof req.query.cwd === 'string' ? req.query.cwd : undefined;
      if (!cwd || !path.isAbsolute(cwd)) {
        res.status(400).json({ error: 'Valid absolute cwd query parameter is required' });
        return;
      }
      if (!OpenSpecService.isCliAvailable()) {
        res.status(503).json({
          error: 'openspec CLI is not installed. Install it with: npm install -g openspec',
        });
        return;
      }
      const result = await OpenSpecService.initOpenspec(cwd);
      if (result.success) {
        res.json({ ok: true });
      } else {
        res.status(500).json({ error: result.error || 'Init failed' });
      }
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  return router;
}
