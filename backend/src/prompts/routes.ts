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

  // --- Agent ---

  router.get('/agent', (_req, res) => {
    const content = store.readFile('AGENT.md');
    res.json({ content });
  });

  router.put('/agent', (req, res) => {
    const { content } = req.body;
    store.writeFile('AGENT.md', content ?? '');
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
