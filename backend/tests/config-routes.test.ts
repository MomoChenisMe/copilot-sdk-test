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
});
