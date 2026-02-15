import { Router } from 'express';
import type { PromptFileStore } from './file-store.js';
import { sanitizeName } from './file-store.js';

function createCrudRoutes(store: PromptFileStore, subDir: string, notFoundMsg: string): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const names = store.listFiles(subDir);
    const items = names.map((name) => ({
      name,
      content: store.readFile(`${subDir}/${name}.md`),
    }));
    res.json({ items });
  });

  router.get('/:name', (req, res) => {
    let name: string;
    try {
      name = sanitizeName(req.params.name);
    } catch {
      res.status(400).json({ error: 'Invalid name' });
      return;
    }

    const names = store.listFiles(subDir);
    if (!names.includes(name)) {
      res.status(404).json({ error: notFoundMsg });
      return;
    }
    const content = store.readFile(`${subDir}/${name}.md`);
    res.json({ name, content });
  });

  router.put('/:name', (req, res) => {
    let name: string;
    try {
      name = sanitizeName(req.params.name);
    } catch {
      res.status(400).json({ error: 'Invalid name' });
      return;
    }

    const { content } = req.body;
    store.writeFile(`${subDir}/${name}.md`, content ?? '');
    res.json({ ok: true });
  });

  router.delete('/:name', (req, res) => {
    let name: string;
    try {
      name = sanitizeName(req.params.name);
    } catch {
      res.status(400).json({ error: 'Invalid name' });
      return;
    }

    store.deleteFile(`${subDir}/${name}.md`);
    res.json({ ok: true });
  });

  return router;
}

export function createMemoryRoutes(store: PromptFileStore): Router {
  const router = Router();

  // --- Preferences ---

  router.get('/preferences', (_req, res) => {
    const content = store.readFile('memory/preferences.md');
    res.json({ content });
  });

  router.put('/preferences', (req, res) => {
    const { content } = req.body;
    store.writeFile('memory/preferences.md', content ?? '');
    res.json({ ok: true });
  });

  // --- Projects ---
  router.use('/projects', createCrudRoutes(store, 'memory/projects', 'Not found'));

  // --- Solutions ---
  router.use('/solutions', createCrudRoutes(store, 'memory/solutions', 'Not found'));

  return router;
}
