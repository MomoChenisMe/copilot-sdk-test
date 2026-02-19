import { Router } from 'express';
import type { PromptFileStore } from './file-store.js';
import { sanitizeName } from './file-store.js';
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

  // --- Presets Export/Import (before :name routes) ---

  router.get('/presets/export', (_req, res) => {
    const names = store.listFiles('presets');
    const presets = names.map((name) => ({
      name,
      content: store.readFile(`presets/${name}.md`),
    }));
    res.json({ presets });
  });

  router.post('/presets/import', (req, res) => {
    const { presets } = req.body;
    if (!Array.isArray(presets)) {
      res.status(400).json({ error: 'Invalid format: presets must be an array' });
      return;
    }
    for (const preset of presets) {
      if (!preset.name || typeof preset.content !== 'string') continue;
      try {
        const name = sanitizeName(preset.name);
        store.writeFile(`presets/${name}.md`, preset.content);
      } catch {
        // skip invalid names
      }
    }
    res.json({ ok: true, imported: presets.length });
  });

  // --- Presets ---

  router.get('/presets', (_req, res) => {
    const names = store.listFiles('presets');
    const presets = names.map((name) => ({
      name,
      content: store.readFile(`presets/${name}.md`),
    }));
    res.json({ presets });
  });

  router.get('/presets/:name', (req, res) => {
    let name: string;
    try {
      name = sanitizeName(req.params.name);
    } catch {
      res.status(400).json({ error: 'Invalid preset name' });
      return;
    }

    const content = store.readFile(`presets/${name}.md`);
    // Check if file actually exists (readFile returns '' for missing files)
    const names = store.listFiles('presets');
    if (!names.includes(name)) {
      res.status(404).json({ error: 'Preset not found' });
      return;
    }
    res.json({ name, content });
  });

  router.put('/presets/:name', (req, res) => {
    let name: string;
    try {
      name = sanitizeName(req.params.name);
    } catch {
      res.status(400).json({ error: 'Invalid preset name' });
      return;
    }

    const { content } = req.body;
    store.writeFile(`presets/${name}.md`, content ?? '');
    res.json({ ok: true });
  });

  router.delete('/presets/:name', (req, res) => {
    let name: string;
    try {
      name = sanitizeName(req.params.name);
    } catch {
      res.status(400).json({ error: 'Invalid preset name' });
      return;
    }

    store.deleteFile(`presets/${name}.md`);
    res.json({ ok: true });
  });

  return router;
}
