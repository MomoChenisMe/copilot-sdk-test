import { Router } from 'express';
import type { OpenSpecService } from './openspec-service.js';

export function createOpenSpecRoutes(service: OpenSpecService): Router {
  const router = Router();

  // GET /overview — project overview stats
  router.get('/overview', (_req, res) => {
    try {
      const overview = service.getOverview();
      res.json(overview);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // GET /changes — list all active changes
  router.get('/changes', (_req, res) => {
    try {
      const changes = service.listChanges();
      res.json({ changes });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // GET /changes/:name — get single change detail
  router.get('/changes/:name', (req, res) => {
    try {
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
      const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
      const ok = service.archiveChange(name);
      if (!ok) {
        res.status(404).json({ error: 'Change not found' });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // DELETE /changes/:name — delete a change
  router.delete('/changes/:name', (req, res) => {
    try {
      const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
      const ok = service.deleteChange(name);
      if (!ok) {
        res.status(404).json({ error: 'Change not found' });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // GET /specs — list all specs
  router.get('/specs', (_req, res) => {
    try {
      const specs = service.listSpecs();
      res.json({ specs });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // GET /specs/:name — get full spec file content
  router.get('/specs/:name', (req, res) => {
    try {
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

  // GET /archived — list all archived changes
  router.get('/archived', (_req, res) => {
    try {
      const archived = service.listArchived();
      res.json({ archived });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // GET /archived/:name — get archived change detail
  router.get('/archived/:name', (req, res) => {
    try {
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

  return router;
}
