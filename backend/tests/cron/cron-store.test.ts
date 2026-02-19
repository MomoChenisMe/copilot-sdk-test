import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDb } from '../../src/conversation/db.js';
import { CronStore } from '../../src/cron/cron-store.js';
import type { CronJob, CreateCronJobInput } from '../../src/cron/cron-store.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `cron-store-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function makeInput(overrides: Partial<CreateCronJobInput> = {}): CreateCronJobInput {
  return {
    name: 'Test Job',
    type: 'ai',
    scheduleType: 'cron',
    scheduleValue: '0 9 * * 1-5',
    config: { prompt: 'hello' },
    ...overrides,
  };
}

describe('CronStore', () => {
  let db: Database.Database;
  let store: CronStore;
  let dbPath: string;

  beforeEach(() => {
    dbPath = tempDbPath();
    db = initDb(dbPath);
    store = new CronStore(db);
  });

  afterEach(() => {
    db.close();
    try { fs.unlinkSync(dbPath); } catch { /* ignore */ }
  });

  describe('create', () => {
    it('should create a job and return it with all fields', () => {
      const job = store.create(makeInput());
      expect(job.id).toBeDefined();
      expect(job.name).toBe('Test Job');
      expect(job.type).toBe('ai');
      expect(job.scheduleType).toBe('cron');
      expect(job.scheduleValue).toBe('0 9 * * 1-5');
      expect(job.config).toEqual({ prompt: 'hello' });
      expect(job.enabled).toBe(true);
      expect(job.lastRun).toBeNull();
      expect(job.nextRun).toBeNull();
      expect(job.createdAt).toBeDefined();
      expect(job.updatedAt).toBeDefined();
    });

    it('should create a shell job', () => {
      const job = store.create(makeInput({ type: 'shell', config: { command: 'df -h' } }));
      expect(job.type).toBe('shell');
      expect(job.config).toEqual({ command: 'df -h' });
    });
  });

  describe('getById', () => {
    it('should return null for non-existent id', () => {
      expect(store.getById('nonexistent')).toBeNull();
    });

    it('should return the job by id', () => {
      const created = store.create(makeInput());
      const fetched = store.getById(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(created.id);
      expect(fetched!.name).toBe('Test Job');
    });
  });

  describe('listAll', () => {
    it('should return empty array when no jobs', () => {
      expect(store.listAll()).toEqual([]);
    });

    it('should return all jobs ordered by created_at', () => {
      store.create(makeInput({ name: 'Job A' }));
      store.create(makeInput({ name: 'Job B' }));
      const all = store.listAll();
      expect(all).toHaveLength(2);
      expect(all[0].name).toBe('Job A');
      expect(all[1].name).toBe('Job B');
    });
  });

  describe('update', () => {
    it('should update name and enabled', () => {
      const job = store.create(makeInput());
      const updated = store.update(job.id, { name: 'Updated', enabled: false });
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('Updated');
      expect(updated!.enabled).toBe(false);
    });

    it('should update schedule fields', () => {
      const job = store.create(makeInput());
      const updated = store.update(job.id, { scheduleType: 'interval', scheduleValue: '60000' });
      expect(updated!.scheduleType).toBe('interval');
      expect(updated!.scheduleValue).toBe('60000');
    });

    it('should update lastRun and nextRun', () => {
      const job = store.create(makeInput());
      const now = new Date().toISOString();
      const updated = store.update(job.id, { lastRun: now, nextRun: now });
      expect(updated!.lastRun).toBe(now);
      expect(updated!.nextRun).toBe(now);
    });

    it('should return null for non-existent id', () => {
      expect(store.update('nope', { name: 'x' })).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a job', () => {
      const job = store.create(makeInput());
      const result = store.delete(job.id);
      expect(result).toBe(true);
      expect(store.getById(job.id)).toBeNull();
    });

    it('should return false for non-existent id', () => {
      expect(store.delete('nope')).toBe(false);
    });
  });

  describe('listEnabled', () => {
    it('should return only enabled jobs', () => {
      store.create(makeInput({ name: 'Enabled' }));
      const disabled = store.create(makeInput({ name: 'Disabled' }));
      store.update(disabled.id, { enabled: false });

      const enabled = store.listEnabled();
      expect(enabled).toHaveLength(1);
      expect(enabled[0].name).toBe('Enabled');
    });
  });

  describe('addHistory', () => {
    it('should add a history record and return it', () => {
      const job = store.create(makeInput());
      const h = store.addHistory({
        jobId: job.id,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        status: 'success',
        output: 'done',
      });
      expect(h.id).toBeDefined();
      expect(h.jobId).toBe(job.id);
      expect(h.status).toBe('success');
      expect(h.output).toBe('done');
    });
  });

  describe('getHistory', () => {
    it('should return history for a job ordered by created_at DESC', () => {
      const job = store.create(makeInput());
      store.addHistory({ jobId: job.id, startedAt: '2025-01-01T00:00:00Z', status: 'success' });
      store.addHistory({ jobId: job.id, startedAt: '2025-01-02T00:00:00Z', status: 'error', output: 'fail' });

      const history = store.getHistory(job.id);
      expect(history).toHaveLength(2);
      // Most recent first
      expect(history[0].startedAt).toBe('2025-01-02T00:00:00Z');
    });

    it('should respect limit parameter', () => {
      const job = store.create(makeInput());
      for (let i = 0; i < 25; i++) {
        store.addHistory({ jobId: job.id, startedAt: `2025-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`, status: 'success' });
      }
      const history = store.getHistory(job.id, 10);
      expect(history).toHaveLength(10);
    });

    it('should default to limit 20', () => {
      const job = store.create(makeInput());
      for (let i = 0; i < 25; i++) {
        store.addHistory({ jobId: job.id, startedAt: `2025-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`, status: 'success' });
      }
      const history = store.getHistory(job.id);
      expect(history).toHaveLength(20);
    });
  });
});
