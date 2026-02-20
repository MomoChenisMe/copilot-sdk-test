import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import request from 'supertest';
import { PromptFileStore } from '../src/prompts/file-store.js';
import { createConfigRoutes } from '../src/config-routes.js';

describe('Config routes', () => {
  let tmpDir: string;
  let promptStore: PromptFileStore;
  let app: ReturnType<typeof express>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-routes-'));
    promptStore = new PromptFileStore(path.join(tmpDir, 'prompts'));
    promptStore.ensureDirectories();

    app = express();
    app.use(express.json());
    app.use('/api/config', createConfigRoutes(promptStore));
  });

  describe('GET /api/config/brave-api-key', () => {
    it('should return empty when no key is set', async () => {
      const res = await request(app).get('/api/config/brave-api-key');
      expect(res.status).toBe(200);
      expect(res.body.hasKey).toBe(false);
      expect(res.body.maskedKey).toBe('');
    });

    it('should return masked key when key is set', async () => {
      promptStore.writeFile('CONFIG.json', JSON.stringify({ braveApiKey: 'BSA_1234567890abcdef' }));
      const res = await request(app).get('/api/config/brave-api-key');
      expect(res.status).toBe(200);
      expect(res.body.hasKey).toBe(true);
      expect(res.body.maskedKey).toMatch(/\*+/);
      // Should not expose the full key
      expect(res.body.maskedKey).not.toBe('BSA_1234567890abcdef');
    });
  });

  describe('PUT /api/config/brave-api-key', () => {
    it('should save the API key', async () => {
      const res = await request(app)
        .put('/api/config/brave-api-key')
        .send({ apiKey: 'BSA_newkey123' });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      // Verify it's stored
      const raw = promptStore.readFile('CONFIG.json');
      const config = JSON.parse(raw);
      expect(config.braveApiKey).toBe('BSA_newkey123');
    });

    it('should clear the API key when empty string is sent', async () => {
      promptStore.writeFile('CONFIG.json', JSON.stringify({ braveApiKey: 'old-key' }));
      const res = await request(app)
        .put('/api/config/brave-api-key')
        .send({ apiKey: '' });
      expect(res.status).toBe(200);

      const raw = promptStore.readFile('CONFIG.json');
      const config = JSON.parse(raw);
      expect(config.braveApiKey).toBe('');
    });

    it('should preserve other config values', async () => {
      promptStore.writeFile('CONFIG.json', JSON.stringify({ braveApiKey: 'old', otherSetting: true }));
      await request(app)
        .put('/api/config/brave-api-key')
        .send({ apiKey: 'new-key' });

      const raw = promptStore.readFile('CONFIG.json');
      const config = JSON.parse(raw);
      expect(config.braveApiKey).toBe('new-key');
      expect(config.otherSetting).toBe(true);
    });
  });

  // --- OpenSpec SDD Config ---

  describe('GET /api/config/openspec-sdd', () => {
    it('should return enabled: false when not set', async () => {
      const res = await request(app).get('/api/config/openspec-sdd');
      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);
    });

    it('should return enabled: true when set', async () => {
      promptStore.writeFile('CONFIG.json', JSON.stringify({ openspecSddEnabled: true }));
      const res = await request(app).get('/api/config/openspec-sdd');
      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(true);
    });

    it('should return enabled: false when CONFIG.json does not exist', async () => {
      const res = await request(app).get('/api/config/openspec-sdd');
      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);
    });
  });

  describe('PUT /api/config/openspec-sdd', () => {
    it('should save enabled: true', async () => {
      const res = await request(app)
        .put('/api/config/openspec-sdd')
        .send({ enabled: true });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const raw = promptStore.readFile('CONFIG.json');
      const config = JSON.parse(raw);
      expect(config.openspecSddEnabled).toBe(true);
    });

    it('should save enabled: false', async () => {
      promptStore.writeFile('CONFIG.json', JSON.stringify({ openspecSddEnabled: true }));
      const res = await request(app)
        .put('/api/config/openspec-sdd')
        .send({ enabled: false });
      expect(res.status).toBe(200);

      const raw = promptStore.readFile('CONFIG.json');
      const config = JSON.parse(raw);
      expect(config.openspecSddEnabled).toBe(false);
    });

    it('should preserve other config values (braveApiKey)', async () => {
      promptStore.writeFile('CONFIG.json', JSON.stringify({ braveApiKey: 'my-key' }));
      await request(app)
        .put('/api/config/openspec-sdd')
        .send({ enabled: true });

      const raw = promptStore.readFile('CONFIG.json');
      const config = JSON.parse(raw);
      expect(config.openspecSddEnabled).toBe(true);
      expect(config.braveApiKey).toBe('my-key');
    });

    it('should auto-create OPENSPEC_SDD.md from default template on first enable', async () => {
      await request(app)
        .put('/api/config/openspec-sdd')
        .send({ enabled: true });

      const content = promptStore.readFile('OPENSPEC_SDD.md');
      expect(content).toBeTruthy();
      expect(content).toContain('OpenSpec SDD');
      expect(content).toContain('Core Philosophy');
    });

    it('should not overwrite existing OPENSPEC_SDD.md when enabling again', async () => {
      promptStore.writeFile('OPENSPEC_SDD.md', 'My custom OpenSpec rules');
      await request(app)
        .put('/api/config/openspec-sdd')
        .send({ enabled: true });

      const content = promptStore.readFile('OPENSPEC_SDD.md');
      expect(content).toBe('My custom OpenSpec rules');
    });

    it('should not create OPENSPEC_SDD.md when disabling', async () => {
      await request(app)
        .put('/api/config/openspec-sdd')
        .send({ enabled: false });

      const content = promptStore.readFile('OPENSPEC_SDD.md');
      expect(content).toBe('');
    });

    it('should not delete OPENSPEC_SDD.md when disabling', async () => {
      promptStore.writeFile('OPENSPEC_SDD.md', 'Custom content');
      await request(app)
        .put('/api/config/openspec-sdd')
        .send({ enabled: false });

      const content = promptStore.readFile('OPENSPEC_SDD.md');
      expect(content).toBe('Custom content');
    });
  });
});
