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
import { ConversationRepository } from '../../src/conversation/repository.js';
import { createCronRoutes } from '../../src/cron/cron-routes.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `cron-routes-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

describe('Cron REST API', () => {
  let db: Database.Database;
  let store: CronStore;
  let scheduler: CronScheduler;
  let repo: ConversationRepository;
  let app: express.Express;
  let dbPath: string;

  beforeEach(() => {
    dbPath = tempDbPath();
    db = initDb(dbPath);
    store = new CronStore(db);
    repo = new ConversationRepository(db);
    scheduler = new CronScheduler(store, {
      executeAiTask: vi.fn().mockResolvedValue({ output: 'done' }),
      executeShellTask: vi.fn().mockResolvedValue({ output: 'done' }),
    });
    app = express();
    app.use(express.json());
    app.use('/api/cron', createCronRoutes(store, scheduler, repo));
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

  // --- New endpoints ---

  describe('GET /api/cron/history/recent', () => {
    it('should return recent history across all jobs', async () => {
      const jobA = store.create({ name: 'Job A', type: 'ai', scheduleType: 'cron', scheduleValue: '0 9 * * *', config: { prompt: 'a' } });
      const jobB = store.create({ name: 'Job B', type: 'ai', scheduleType: 'cron', scheduleValue: '0 9 * * *', config: { prompt: 'b' } });
      store.addHistory({ jobId: jobA.id, startedAt: '2026-02-20T00:00:00Z', status: 'success', output: 'a ok' });
      store.addHistory({ jobId: jobB.id, startedAt: '2026-02-20T01:00:00Z', status: 'error', output: 'b fail' });

      const res = await request(app).get('/api/cron/history/recent');
      expect(res.status).toBe(200);
      expect(res.body.history).toHaveLength(2);
      // Most recent first
      expect(res.body.history[0].jobName).toBe('Job B');
      expect(res.body.history[1].jobName).toBe('Job A');
    });

    it('should respect limit param', async () => {
      const job = store.create({ name: 'Job', type: 'ai', scheduleType: 'cron', scheduleValue: '0 9 * * *', config: { prompt: 'x' } });
      for (let i = 0; i < 5; i++) {
        store.addHistory({ jobId: job.id, startedAt: `2026-02-${String(i + 1).padStart(2, '0')}T00:00:00Z`, status: 'success' });
      }
      const res = await request(app).get('/api/cron/history/recent?limit=3');
      expect(res.body.history).toHaveLength(3);
    });
  });

  describe('GET /api/cron/history/unread-count', () => {
    it('should return unread and failed counts', async () => {
      const job = store.create({ name: 'Job', type: 'ai', scheduleType: 'cron', scheduleValue: '0 9 * * *', config: { prompt: 'x' } });
      store.addHistory({ jobId: job.id, startedAt: '2026-02-20T00:00:00Z', status: 'success' });
      store.addHistory({ jobId: job.id, startedAt: '2026-02-20T01:00:00Z', status: 'error', output: 'fail' });
      store.addHistory({ jobId: job.id, startedAt: '2026-02-20T02:00:00Z', status: 'error', output: 'fail2' });

      const res = await request(app).get('/api/cron/history/unread-count?since=2020-01-01T00:00:00Z');
      expect(res.status).toBe(200);
      expect(res.body.unread).toBe(3);
      expect(res.body.failed).toBe(2);
    });
  });

  describe('POST /api/cron/history/:historyId/open-conversation', () => {
    it('should create a conversation from history and return 201', async () => {
      const job = store.create({ name: 'Open Test', type: 'ai', scheduleType: 'cron', scheduleValue: '0 9 * * *', config: { prompt: 'check disk', model: 'gpt-4o', cwd: '/tmp' } });
      const history = store.addHistory({
        jobId: job.id,
        startedAt: '2026-02-20T00:00:00Z',
        finishedAt: '2026-02-20T00:01:00Z',
        status: 'success',
        output: 'Disk is fine',
        prompt: 'check disk',
        configSnapshot: { model: 'gpt-4o', cwd: '/tmp' },
        turnSegments: [{ type: 'text', content: 'Disk is fine' }],
        toolRecords: [{ toolCallId: 't1', toolName: 'bash', status: 'success' }],
        usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0 },
        content: 'Disk is fine, no issues found.',
      });

      const res = await request(app).post(`/api/cron/history/${history.id}/open-conversation`);
      expect(res.status).toBe(201);
      expect(res.body.conversation).toBeDefined();
      expect(res.body.conversation.id).toBeDefined();

      // Verify conversation has messages
      const messages = repo.getMessages(res.body.conversation.id);
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('assistant');
      expect(messages[0].content).toContain('check disk');
      expect(messages[0].content).toContain('Disk is fine');
    });

    it('should return 404 for non-existent history', async () => {
      const res = await request(app).post('/api/cron/history/nonexistent/open-conversation');
      expect(res.status).toBe(404);
    });
  });
});
