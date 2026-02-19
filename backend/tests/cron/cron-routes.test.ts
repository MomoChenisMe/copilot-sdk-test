import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDb } from '../../src/conversation/db.js';
import { CronStore } from '../../src/cron/cron-store.js';
import { CronScheduler } from '../../src/cron/cron-scheduler.js';
import { createCronRoutes } from '../../src/cron/cron-routes.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `cron-routes-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

describe('Cron REST API', () => {
  let db: Database.Database;
  let store: CronStore;
  let scheduler: CronScheduler;
  let app: express.Express;
  let dbPath: string;

  beforeEach(() => {
    dbPath = tempDbPath();
    db = initDb(dbPath);
    store = new CronStore(db);
    scheduler = new CronScheduler(store, {
      executeAiTask: vi.fn().mockResolvedValue({ output: 'done' }),
      executeShellTask: vi.fn().mockResolvedValue({ output: 'done' }),
    });
    app = express();
    app.use(express.json());
    app.use('/api/cron', createCronRoutes(store, scheduler));
  });

  afterEach(async () => {
    await scheduler.shutdown();
    db.close();
    try { fs.unlinkSync(dbPath); } catch { /* ignore */ }
  });

  describe('GET /api/cron/jobs', () => {
    it('should return empty array initially', async () => {
      const res = await request(app).get('/api/cron/jobs');
      expect(res.status).toBe(200);
      expect(res.body.jobs).toEqual([]);
    });

    it('should return all jobs', async () => {
      store.create({ name: 'Job A', type: 'ai', scheduleType: 'cron', scheduleValue: '0 9 * * *', config: { prompt: 'hi' } });
      const res = await request(app).get('/api/cron/jobs');
      expect(res.status).toBe(200);
      expect(res.body.jobs).toHaveLength(1);
      expect(res.body.jobs[0].name).toBe('Job A');
    });
  });

  describe('POST /api/cron/jobs', () => {
    it('should create a new job and return 201', async () => {
      const res = await request(app).post('/api/cron/jobs').send({
        name: 'New Job',
        type: 'ai',
        scheduleType: 'cron',
        scheduleValue: '0 9 * * 1-5',
        config: { prompt: 'daily check' },
      });
      expect(res.status).toBe(201);
      expect(res.body.job.name).toBe('New Job');
      expect(res.body.job.id).toBeDefined();
    });

    it('should reject invalid type', async () => {
      const res = await request(app).post('/api/cron/jobs').send({
        name: 'Bad',
        type: 'invalid',
        scheduleType: 'cron',
        scheduleValue: '* * * * *',
      });
      expect(res.status).toBe(400);
    });

    it('should reject missing name', async () => {
      const res = await request(app).post('/api/cron/jobs').send({
        type: 'ai',
        scheduleType: 'cron',
        scheduleValue: '* * * * *',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/cron/jobs/:id', () => {
    it('should update a job', async () => {
      const job = store.create({ name: 'Old', type: 'ai', scheduleType: 'cron', scheduleValue: '0 9 * * *', config: { prompt: 'hi' } });
      const res = await request(app).put(`/api/cron/jobs/${job.id}`).send({ name: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.job.name).toBe('Updated');
    });

    it('should return 404 for non-existent job', async () => {
      const res = await request(app).put('/api/cron/jobs/nonexistent').send({ name: 'x' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/cron/jobs/:id', () => {
    it('should delete a job and return 204', async () => {
      const job = store.create({ name: 'Delete Me', type: 'ai', scheduleType: 'cron', scheduleValue: '0 9 * * *', config: { prompt: 'del' } });
      const res = await request(app).delete(`/api/cron/jobs/${job.id}`);
      expect(res.status).toBe(204);
      expect(store.getById(job.id)).toBeNull();
    });

    it('should return 404 for non-existent job', async () => {
      const res = await request(app).delete('/api/cron/jobs/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/cron/jobs/:id/trigger', () => {
    it('should trigger a job and return 202', async () => {
      const job = store.create({ name: 'Trigger Me', type: 'ai', scheduleType: 'cron', scheduleValue: '0 9 * * *', config: { prompt: 'now' } });
      const res = await request(app).post(`/api/cron/jobs/${job.id}/trigger`);
      expect(res.status).toBe(202);
    });

    it('should return 404 for non-existent job', async () => {
      const res = await request(app).post('/api/cron/jobs/nonexistent/trigger');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/cron/jobs/:id/history', () => {
    it('should return history for a job', async () => {
      const job = store.create({ name: 'History', type: 'ai', scheduleType: 'cron', scheduleValue: '0 9 * * *', config: { prompt: 'hist' } });
      store.addHistory({ jobId: job.id, startedAt: new Date().toISOString(), status: 'success', output: 'ok' });
      const res = await request(app).get(`/api/cron/jobs/${job.id}/history`);
      expect(res.status).toBe(200);
      expect(res.body.history).toHaveLength(1);
      expect(res.body.history[0].status).toBe('success');
    });
  });
});
