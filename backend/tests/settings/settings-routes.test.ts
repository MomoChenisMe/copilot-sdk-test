import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import request from 'supertest';
import { PromptFileStore } from '../../src/prompts/file-store.js';
import { SettingsStore } from '../../src/settings/settings-store.js';
import { createSettingsRoutes } from '../../src/settings/routes.js';

describe('Settings routes', () => {
  let tmpDir: string;
  let promptStore: PromptFileStore;
  let settingsStore: SettingsStore;
  let app: ReturnType<typeof express>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-routes-'));
    promptStore = new PromptFileStore(path.join(tmpDir, 'prompts'));
    promptStore.ensureDirectories();
    settingsStore = new SettingsStore(promptStore);

    app = express();
    app.use(express.json());
    app.use('/api/settings', createSettingsRoutes(settingsStore));
  });

  describe('GET /api/settings', () => {
    it('should return empty defaults when no settings exist', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });

    it('should return stored settings', async () => {
      settingsStore.write({ theme: 'dark', language: 'zh-TW' });
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body.theme).toBe('dark');
      expect(res.body.language).toBe('zh-TW');
    });
  });

  describe('PATCH /api/settings', () => {
    it('should merge partial settings', async () => {
      settingsStore.write({ theme: 'dark', language: 'en' });
      const res = await request(app)
        .patch('/api/settings')
        .send({ language: 'zh-TW' });
      expect(res.status).toBe(200);
      expect(res.body.theme).toBe('dark');
      expect(res.body.language).toBe('zh-TW');
    });

    it('should create settings from scratch', async () => {
      const res = await request(app)
        .patch('/api/settings')
        .send({ theme: 'light' });
      expect(res.status).toBe(200);
      expect(res.body.theme).toBe('light');

      // Verify persistence
      const getRes = await request(app).get('/api/settings');
      expect(getRes.body.theme).toBe('light');
    });

    it('should handle disabledSkills array', async () => {
      const res = await request(app)
        .patch('/api/settings')
        .send({ disabledSkills: ['skill-a', 'skill-b'] });
      expect(res.status).toBe(200);
      expect(res.body.disabledSkills).toEqual(['skill-a', 'skill-b']);
    });
  });

  describe('PUT /api/settings', () => {
    it('should fully replace settings', async () => {
      settingsStore.write({ theme: 'dark', language: 'en', lastSelectedModel: 'gpt-4o' });
      const res = await request(app)
        .put('/api/settings')
        .send({ theme: 'light' });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      // Verify it replaced (not merged)
      const getRes = await request(app).get('/api/settings');
      expect(getRes.body.theme).toBe('light');
      expect(getRes.body.language).toBeUndefined();
      expect(getRes.body.lastSelectedModel).toBeUndefined();
    });
  });
});
