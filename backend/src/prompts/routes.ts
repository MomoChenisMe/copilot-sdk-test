import { Router } from 'express';
import type { PromptFileStore } from './file-store.js';
import { DEFAULT_SYSTEM_PROMPT } from './defaults.js';

export function createPromptsRoutes(store: PromptFileStore): Router {
  const router = Router();

  // --- System Prompt ---

  router.get('/system-prompt', (_req, res) => {
    const content = store.readFile('SYSTEM_PROMPT.md');
    res.json({ content });
  });

  router.put('/system-prompt', (req, res) => {
    const { content } = req.body;
    store.writeFile('SYSTEM_PROMPT.md', content ?? '');
    res.json({ ok: true });
  });

  router.post('/system-prompt/reset', (_req, res) => {
    store.writeFile('SYSTEM_PROMPT.md', DEFAULT_SYSTEM_PROMPT);
    res.json({ content: DEFAULT_SYSTEM_PROMPT });
  });

  // --- Profile ---

  router.get('/profile', (_req, res) => {
    const content = store.readFile('PROFILE.md');
    res.json({ content });
  });

  router.put('/profile', (req, res) => {
    const { content } = req.body;
    store.writeFile('PROFILE.md', content ?? '');
    res.json({ ok: true });
  });

  // --- Agent (deprecated shim — merged into PROFILE.md) ---

  router.get('/agent', (_req, res) => {
    res.json({ content: '' });
  });

  router.put('/agent', (req, res) => {
    const { content } = req.body;
    if (content && content.trim()) {
      const existing = store.readFile('PROFILE.md');
      const separator = existing.trim() ? '\n\n## Agent Rules\n\n' : '## Agent Rules\n\n';
      store.writeFile('PROFILE.md', existing + separator + content);
    }
    res.json({ ok: true });
  });

  // --- OpenSpec SDD ---

  router.get('/openspec-sdd', (_req, res) => {
    const content = store.readFile('OPENSPEC_SDD.md');
    res.json({ content });
  });

  router.put('/openspec-sdd', (req, res) => {
    const { content } = req.body;
    store.writeFile('OPENSPEC_SDD.md', content ?? '');
    res.json({ ok: true });
  });

  return router;
}
