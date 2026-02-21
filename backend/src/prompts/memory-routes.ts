import { Router } from 'express';
import type { PromptFileStore } from './file-store.js';

export function createMemoryRoutes(store: PromptFileStore): Router {
  const router = Router();

  // --- Preferences (deprecated shim — merged into PROFILE.md) ---

  router.get('/preferences', (_req, res) => {
    res.json({ content: '' });
  });

  router.put('/preferences', (req, res) => {
    const { content } = req.body;
    if (content && content.trim()) {
      const existing = store.readFile('PROFILE.md');
      const separator = existing.trim() ? '\n\n## Preferences\n\n' : '## Preferences\n\n';
      store.writeFile('PROFILE.md', existing + separator + content);
    }
    res.json({ ok: true });
  });

  return router;
}
