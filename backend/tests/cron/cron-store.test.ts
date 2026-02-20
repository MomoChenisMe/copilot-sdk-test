import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDb } from '../../src/conversation/db.js';
import { CronStore } from '../../src/cron/cron-store.js';
import type { CronJob, CreateCronJobInput, CronJobConfig, CronToolConfig } from '../../src/cron/cron-store.js';

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
      // New fields should be null when not provided
      expect(h.prompt).toBeNull();
      expect(h.configSnapshot).toBeNull();
      expect(h.turnSegments).toBeNull();
      expect(h.toolRecords).toBeNull();
      expect(h.reasoning).toBeNull();
      expect(h.usage).toBeNull();
      expect(h.content).toBeNull();
    });

    it('should add a history record with rich execution data', () => {
      const job = store.create(makeInput());
      const segments = [{ type: 'text', content: 'hello' }];
      const tools = [{ toolCallId: 't1', toolName: 'bash', status: 'success' }];
      const usage = { inputTokens: 100, outputTokens: 50, cacheReadTokens: 10, cacheWriteTokens: 5 };

      const h = store.addHistory({
        jobId: job.id,
        startedAt: '2026-02-20T00:00:00Z',
        status: 'success',
        output: 'ok',
        prompt: 'check disk',
        configSnapshot: { model: 'gpt-4o', toolConfig: { skills: true } },
        turnSegments: segments,
        toolRecords: tools,
        reasoning: 'thinking...',
        usage,
        content: 'hello world',
      });

      expect(h.prompt).toBe('check disk');
      expect(h.configSnapshot).toEqual({ model: 'gpt-4o', toolConfig: { skills: true } });
      expect(h.turnSegments).toEqual(segments);
      expect(h.toolRecords).toEqual(tools);
      expect(h.reasoning).toBe('thinking...');
      expect(h.usage).toEqual(usage);
      expect(h.content).toBe('hello world');
    });

    it('should support running status', () => {
      const job = store.create(makeInput());
      const h = store.addHistory({
        jobId: job.id,
        startedAt: '2026-02-20T00:00:00Z',
        status: 'running',
        prompt: 'test',
      });
      expect(h.status).toBe('running');
    });
  });

  describe('updateHistory', () => {
    it('should update running status to success with rich data', () => {
      const job = store.create(makeInput());
      const h = store.addHistory({
        jobId: job.id,
        startedAt: '2026-02-20T00:00:00Z',
        status: 'running',
        prompt: 'test',
      });

      const segments = [{ type: 'text', content: 'result' }];
      const usage = { inputTokens: 50, outputTokens: 25, cacheReadTokens: 0, cacheWriteTokens: 0 };

      store.updateHistory(h.id, {
        status: 'success',
        finishedAt: '2026-02-20T00:01:00Z',
        output: 'completed',
        turnSegments: segments,
        usage,
        content: 'result text',
      });

      const updated = store.getHistoryById(h.id)!;
      expect(updated.status).toBe('success');
      expect(updated.finishedAt).toBe('2026-02-20T00:01:00Z');
      expect(updated.output).toBe('completed');
      expect(updated.turnSegments).toEqual(segments);
      expect(updated.usage).toEqual(usage);
      expect(updated.content).toBe('result text');
    });

    it('should update running status to error', () => {
      const job = store.create(makeInput());
      const h = store.addHistory({
        jobId: job.id,
        startedAt: '2026-02-20T00:00:00Z',
        status: 'running',
      });

      store.updateHistory(h.id, {
        status: 'error',
        finishedAt: '2026-02-20T00:01:00Z',
        output: 'Something went wrong',
      });

      const updated = store.getHistoryById(h.id)!;
      expect(updated.status).toBe('error');
      expect(updated.output).toBe('Something went wrong');
    });

    it('should no-op when no updates provided', () => {
      const job = store.create(makeInput());
      const h = store.addHistory({
        jobId: job.id,
        startedAt: '2026-02-20T00:00:00Z',
        status: 'running',
      });
      // Should not throw
      store.updateHistory(h.id, {});
      const unchanged = store.getHistoryById(h.id)!;
      expect(unchanged.status).toBe('running');
    });
  });

  describe('getHistoryById', () => {
    it('should return a history record by id', () => {
      const job = store.create(makeInput());
      const h = store.addHistory({
        jobId: job.id,
        startedAt: '2026-02-20T00:00:00Z',
        status: 'success',
        output: 'ok',
      });
      const fetched = store.getHistoryById(h.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(h.id);
      expect(fetched!.status).toBe('success');
    });

    it('should return null for non-existent id', () => {
      expect(store.getHistoryById('nonexistent')).toBeNull();
    });
  });

  describe('getHistory', () => {
    it('should return history for a job ordered by started_at DESC', () => {
      const job = store.create(makeInput());
      store.addHistory({ jobId: job.id, startedAt: '2025-01-01T00:00:00Z', status: 'success' });
      store.addHistory({ jobId: job.id, startedAt: '2025-01-02T00:00:00Z', status: 'error', output: 'fail' });

      const history = store.getHistory(job.id);
      expect(history).toHaveLength(2);
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

  describe('getAllRecentHistory', () => {
    it('should return history across all jobs with jobName', () => {
      const jobA = store.create(makeInput({ name: 'Job A' }));
      const jobB = store.create(makeInput({ name: 'Job B' }));
      store.addHistory({ jobId: jobA.id, startedAt: '2026-02-20T00:00:00Z', status: 'success' });
      store.addHistory({ jobId: jobB.id, startedAt: '2026-02-20T01:00:00Z', status: 'error', output: 'fail' });

      const history = store.getAllRecentHistory();
      expect(history).toHaveLength(2);
      // Most recent first
      expect(history[0].jobName).toBe('Job B');
      expect(history[0].status).toBe('error');
      expect(history[1].jobName).toBe('Job A');
    });

    it('should respect limit', () => {
      const job = store.create(makeInput());
      for (let i = 0; i < 10; i++) {
        store.addHistory({ jobId: job.id, startedAt: `2026-02-${String(i + 1).padStart(2, '0')}T00:00:00Z`, status: 'success' });
      }
      const history = store.getAllRecentHistory(3);
      expect(history).toHaveLength(3);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of history after given time', () => {
      const job = store.create(makeInput());
      store.addHistory({ jobId: job.id, startedAt: '2026-02-19T00:00:00Z', status: 'success' });
      store.addHistory({ jobId: job.id, startedAt: '2026-02-20T00:00:00Z', status: 'success' });

      // All entries have created_at = datetime('now'), so they're all "after" a past date
      const count = store.getUnreadCount('2020-01-01T00:00:00Z');
      expect(count).toBe(2);
    });
  });

  describe('getFailedCount', () => {
    it('should return count of error history after given time', () => {
      const job = store.create(makeInput());
      store.addHistory({ jobId: job.id, startedAt: '2026-02-20T00:00:00Z', status: 'success' });
      store.addHistory({ jobId: job.id, startedAt: '2026-02-20T01:00:00Z', status: 'error', output: 'fail' });
      store.addHistory({ jobId: job.id, startedAt: '2026-02-20T02:00:00Z', status: 'error', output: 'fail2' });

      const count = store.getFailedCount('2020-01-01T00:00:00Z');
      expect(count).toBe(2);
    });

    it('should return 0 when no failures', () => {
      const job = store.create(makeInput());
      store.addHistory({ jobId: job.id, startedAt: '2026-02-20T00:00:00Z', status: 'success' });
      const count = store.getFailedCount('2020-01-01T00:00:00Z');
      expect(count).toBe(0);
    });
  });

  describe('CronJobConfig type', () => {
    it('should store and retrieve structured CronJobConfig', () => {
      const config: CronJobConfig = {
        prompt: 'review code',
        model: 'gpt-4o',
        cwd: '/home/user',
        toolConfig: {
          skills: true,
          selfControlTools: false,
          memoryTools: true,
          webSearchTool: false,
          taskTools: false,
          mcpTools: true,
          disabledSkills: ['skill-a'],
          mcpServers: { 'server-1': true, 'server-2': false },
        },
      };

      const job = store.create(makeInput({ config: config as Record<string, unknown> }));
      const fetched = store.getById(job.id)!;
      const fetchedConfig = fetched.config as CronJobConfig;

      expect(fetchedConfig.prompt).toBe('review code');
      expect(fetchedConfig.model).toBe('gpt-4o');
      expect(fetchedConfig.toolConfig?.skills).toBe(true);
      expect(fetchedConfig.toolConfig?.mcpServers?.['server-1']).toBe(true);
      expect(fetchedConfig.toolConfig?.mcpServers?.['server-2']).toBe(false);
      expect(fetchedConfig.toolConfig?.disabledSkills).toEqual(['skill-a']);
    });
  });
});
