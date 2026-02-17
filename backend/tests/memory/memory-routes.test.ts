import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createAutoMemoryRoutes } from '../../src/memory/memory-routes.js';
import { MemoryStore } from '../../src/memory/memory-store.js';
import { MemoryIndex } from '../../src/memory/memory-index.js';

describe('Auto Memory Routes', () => {
  let tmpDir: string;
  let store: MemoryStore;
  let index: MemoryIndex;
  let db: Database.Database;
  let app: express.Express;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-routes-'));
    store = new MemoryStore(tmpDir);
    store.ensureDirectories();
    db = new Database(':memory:');
    index = new MemoryIndex(db);
    app = express();
    app.use(express.json());
    app.use('/api/auto-memory', createAutoMemoryRoutes(store, index, tmpDir));
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('GET /main', () => {
    it('returns empty content initially', async () => {
      const res = await request(app).get('/api/auto-memory/main');
      expect(res.status).toBe(200);
      expect(res.body.content).toBe('');
    });

    it('returns MEMORY.md content', async () => {
      store.writeMemory('- Fact 1\n- Fact 2');
      const res = await request(app).get('/api/auto-memory/main');
      expect(res.body.content).toBe('- Fact 1\n- Fact 2');
    });
  });

  describe('PUT /main', () => {
    it('writes MEMORY.md content', async () => {
      const res = await request(app)
        .put('/api/auto-memory/main')
        .send({ content: '- New memory content' });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(store.readMemory()).toBe('- New memory content');
    });
  });

  describe('GET /daily', () => {
    it('lists daily logs', async () => {
      store.appendDailyLog('2026-02-17', 'entry 1');
      store.appendDailyLog('2026-02-16', 'entry 2');
      const res = await request(app).get('/api/auto-memory/daily');
      expect(res.status).toBe(200);
      expect(res.body.dates).toEqual(['2026-02-17', '2026-02-16']);
    });
  });

  describe('GET /daily/:date', () => {
    it('returns daily log content', async () => {
      store.appendDailyLog('2026-02-17', 'entry 1');
      const res = await request(app).get('/api/auto-memory/daily/2026-02-17');
      expect(res.status).toBe(200);
      expect(res.body.content).toContain('entry 1');
    });

    it('returns 400 for invalid date', async () => {
      const res = await request(app).get('/api/auto-memory/daily/invalid');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /search', () => {
    it('searches memory index', async () => {
      index.addFact('User prefers TypeScript', 'preferences', 'MEMORY.md');
      const res = await request(app).get('/api/auto-memory/search?q=TypeScript');
      expect(res.status).toBe(200);
      expect(res.body.results.length).toBeGreaterThanOrEqual(1);
    });

    it('returns 400 without query', async () => {
      const res = await request(app).get('/api/auto-memory/search');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /config', () => {
    it('returns default config', async () => {
      const res = await request(app).get('/api/auto-memory/config');
      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(true);
      expect(res.body.autoExtract).toBe(true);
    });
  });

  describe('PUT /config', () => {
    it('updates config', async () => {
      const res = await request(app)
        .put('/api/auto-memory/config')
        .send({ enabled: false, autoExtract: false });
      expect(res.status).toBe(200);
      const check = await request(app).get('/api/auto-memory/config');
      expect(check.body.enabled).toBe(false);
    });
  });

  describe('GET /stats', () => {
    it('returns stats', async () => {
      index.addFact('fact 1', 'general', 'MEMORY.md');
      index.addFact('fact 2', 'general', 'MEMORY.md');
      const res = await request(app).get('/api/auto-memory/stats');
      expect(res.status).toBe(200);
      expect(res.body.totalFacts).toBe(2);
    });
  });
});
