import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDb } from '../../src/conversation/db.js';
import { CronStore } from '../../src/cron/cron-store.js';
import { CronScheduler } from '../../src/cron/cron-scheduler.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `cron-sched-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

describe('CronScheduler', () => {
  let db: Database.Database;
  let store: CronStore;
  let scheduler: CronScheduler;
  let dbPath: string;
  let executorFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dbPath = tempDbPath();
    db = initDb(dbPath);
    store = new CronStore(db);
    executorFn = vi.fn().mockResolvedValue({ output: 'done' });
    scheduler = new CronScheduler(store, {
      executeAiTask: executorFn,
      executeShellTask: executorFn,
    });
  });

  afterEach(async () => {
    await scheduler.shutdown();
    db.close();
    try { fs.unlinkSync(dbPath); } catch { /* ignore */ }
  });

  describe('loadAll', () => {
    it('should load enabled jobs from store and register them', () => {
      store.create({ name: 'Job A', type: 'ai', scheduleType: 'cron', scheduleValue: '0 9 * * 1-5', config: { prompt: 'hi' } });
      const disabled = store.create({ name: 'Job B', type: 'shell', scheduleType: 'cron', scheduleValue: '0 0 * * *', config: { command: 'ls' } });
      store.update(disabled.id, { enabled: false });

      scheduler.loadAll();
      expect(scheduler.getActiveJobIds()).toHaveLength(1);
    });
  });

  describe('registerJob / unregisterJob', () => {
    it('should register a cron job and track it', () => {
      const job = store.create({ name: 'Test', type: 'ai', scheduleType: 'cron', scheduleValue: '0 9 * * *', config: { prompt: 'check' } });
      scheduler.registerJob(job);
      expect(scheduler.getActiveJobIds()).toContain(job.id);
    });

    it('should unregister a job', () => {
      const job = store.create({ name: 'Test', type: 'ai', scheduleType: 'cron', scheduleValue: '0 9 * * *', config: { prompt: 'check' } });
      scheduler.registerJob(job);
      scheduler.unregisterJob(job.id);
      expect(scheduler.getActiveJobIds()).not.toContain(job.id);
    });

    it('should handle interval schedule type', () => {
      const job = store.create({ name: 'Interval', type: 'shell', scheduleType: 'interval', scheduleValue: '60000', config: { command: 'echo hi' } });
      scheduler.registerJob(job);
      expect(scheduler.getActiveJobIds()).toContain(job.id);
    });

    it('should handle once schedule type', () => {
      const future = new Date(Date.now() + 60000).toISOString();
      const job = store.create({ name: 'Once', type: 'ai', scheduleType: 'once', scheduleValue: future, config: { prompt: 'one time' } });
      scheduler.registerJob(job);
      expect(scheduler.getActiveJobIds()).toContain(job.id);
    });
  });

  describe('triggerJob (manual)', () => {
    it('should execute an AI job and record history', async () => {
      const job = store.create({ name: 'Manual AI', type: 'ai', scheduleType: 'cron', scheduleValue: '0 0 * * *', config: { prompt: 'manual run' } });

      await scheduler.triggerJob(job.id);

      expect(executorFn).toHaveBeenCalledOnce();
      expect(executorFn).toHaveBeenCalledWith(expect.objectContaining({ prompt: 'manual run' }));

      const history = store.getHistory(job.id);
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('success');
    });

    it('should execute a shell job and record history', async () => {
      const job = store.create({ name: 'Manual Shell', type: 'shell', scheduleType: 'cron', scheduleValue: '0 0 * * *', config: { command: 'echo hello' } });

      await scheduler.triggerJob(job.id);

      expect(executorFn).toHaveBeenCalledOnce();
      expect(executorFn).toHaveBeenCalledWith(expect.objectContaining({ command: 'echo hello' }));

      const history = store.getHistory(job.id);
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('success');
    });

    it('should record error status when executor throws', async () => {
      executorFn.mockRejectedValueOnce(new Error('API down'));
      const job = store.create({ name: 'Fail Job', type: 'ai', scheduleType: 'cron', scheduleValue: '0 0 * * *', config: { prompt: 'fail' } });

      await scheduler.triggerJob(job.id);

      const history = store.getHistory(job.id);
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('error');
      expect(history[0].output).toContain('API down');
    });

    it('should update lastRun on the job after trigger', async () => {
      const job = store.create({ name: 'Track Run', type: 'ai', scheduleType: 'cron', scheduleValue: '0 0 * * *', config: { prompt: 'track' } });
      expect(store.getById(job.id)!.lastRun).toBeNull();

      await scheduler.triggerJob(job.id);

      const updated = store.getById(job.id);
      expect(updated!.lastRun).not.toBeNull();
    });

    it('should throw if job not found', async () => {
      await expect(scheduler.triggerJob('nonexistent')).rejects.toThrow('not found');
    });
  });

  describe('shutdown', () => {
    it('should stop all registered jobs', async () => {
      const job = store.create({ name: 'Shutdown Test', type: 'ai', scheduleType: 'cron', scheduleValue: '0 9 * * *', config: { prompt: 'x' } });
      scheduler.registerJob(job);
      expect(scheduler.getActiveJobIds()).toHaveLength(1);

      await scheduler.shutdown();
      expect(scheduler.getActiveJobIds()).toHaveLength(0);
    });
  });
});
