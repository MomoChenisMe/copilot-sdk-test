import { Router } from 'express';
import type { PromptFileStore } from './file-store.js';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_AUTOPILOT_PROMPT, DEFAULT_PLAN_PROMPT } from './defaults.js';

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

  // --- Autopilot Prompt ---

  router.get('/autopilot-prompt', (_req, res) => {
    const content = store.readFile('AUTOPILOT_PROMPT.md');
    res.json({ content });
  });

  router.put('/autopilot-prompt', (req, res) => {
    const { content } = req.body;
    store.writeFile('AUTOPILOT_PROMPT.md', content ?? '');
    res.json({ ok: true });
  });

  router.post('/autopilot-prompt/reset', (_req, res) => {
    store.writeFile('AUTOPILOT_PROMPT.md', DEFAULT_AUTOPILOT_PROMPT);
    res.json({ content: DEFAULT_AUTOPILOT_PROMPT });
  });

  // --- Act Prompt (legacy alias → AUTOPILOT_PROMPT.md) ---

  router.get('/act-prompt', (_req, res) => {
    const content = store.readFile('AUTOPILOT_PROMPT.md');
    res.json({ content });
  });

  router.put('/act-prompt', (req, res) => {
    const { content } = req.body;
    store.writeFile('AUTOPILOT_PROMPT.md', content ?? '');
    res.json({ ok: true });
  });

  router.post('/act-prompt/reset', (_req, res) => {
    store.writeFile('AUTOPILOT_PROMPT.md', DEFAULT_AUTOPILOT_PROMPT);
    res.json({ content: DEFAULT_AUTOPILOT_PROMPT });
  });

  // --- Plan Prompt ---

  router.get('/plan-prompt', (_req, res) => {
    const content = store.readFile('PLAN_PROMPT.md');
    res.json({ content });
  });

  router.put('/plan-prompt', (req, res) => {
    const { content } = req.body;
    store.writeFile('PLAN_PROMPT.md', content ?? '');
    res.json({ ok: true });
  });

  router.post('/plan-prompt/reset', (_req, res) => {
    store.writeFile('PLAN_PROMPT.md', DEFAULT_PLAN_PROMPT);
    res.json({ content: DEFAULT_PLAN_PROMPT });
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
