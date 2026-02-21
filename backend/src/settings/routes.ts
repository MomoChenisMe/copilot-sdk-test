import { Router } from 'express';
import type { SettingsStore } from './settings-store.js';

export function createSettingsRoutes(settingsStore: SettingsStore): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(settingsStore.read());
  });

  router.patch('/', (req, res) => {
    const merged = settingsStore.patch(req.body);
    res.json(merged);
  });

  router.put('/', (req, res) => {
    settingsStore.write(req.body);
    res.json({ ok: true });
  });

  return router;
}
