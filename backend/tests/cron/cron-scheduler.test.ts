import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDb } from '../../src/conversation/db.js';
import { CronStore } from '../../src/cron/cron-store.js';
import { CronScheduler } from '../../src/cron/cron-scheduler.js';
import type { AiExecutorResult } from '../../src/cron/cron-scheduler.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `cron-sched-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

describe('CronScheduler', () => {
  let db: Database.Database;
  let store: CronStore;
  let scheduler: CronScheduler;
  let dbPath: string;
  let executorFn: ReturnType<typeof vi.fn>;
  let broadcastFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dbPath = tempDbPath();
    db = initDb(dbPath);
    store = new CronStore(db);
    executorFn = vi.fn().mockResolvedValue({ output: 'done' });
    broadcastFn = vi.fn();
    scheduler = new CronScheduler(store, {
      executeAiTask: executorFn,
      executeShellTask: executorFn,
    }, broadcastFn);
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

  describe('triggerJob', () => {
    it('should create a running history record first', async () => {
      const job = store.create({ name: 'Running Test', type: 'ai', scheduleType: 'cron', scheduleValue: '0 0 * * *', config: { prompt: 'test' } });

      // Make executor slow to check running state
      let historyDuringExecution: any = null;
      executorFn.mockImplementation(async () => {
        const history = store.getHistory(job.id);
        historyDuringExecution = history[0];
        return { output: 'done' };
      });

      await scheduler.triggerJob(job.id);

      // During execution, the history should have been 'running'
      expect(historyDuringExecution).not.toBeNull();
      expect(historyDuringExecution.status).toBe('running');

      // After execution, should be 'success'
      const finalHistory = store.getHistory(job.id);
      expect(finalHistory[0].status).toBe('success');
    });

    it('should execute an AI job and record rich history', async () => {
      const executionData = {
        turnSegments: [{ type: 'text', content: 'result' }],
        toolRecords: [{ toolCallId: 't1', toolName: 'bash', status: 'success' }],
        contentSegments: ['result text'],
        reasoningText: 'thinking...',
        usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 10, cacheWriteTokens: 5 },
      };
      executorFn.mockResolvedValue({ output: 'result text', executionData });

      const job = store.create({ name: 'Rich AI', type: 'ai', scheduleType: 'cron', scheduleValue: '0 0 * * *', config: { prompt: 'check' } });

      await scheduler.triggerJob(job.id);

      const history = store.getHistory(job.id);
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('success');
      expect(history[0].output).toBe('result text');
      expect(history[0].prompt).toBe('check');
      expect(history[0].configSnapshot).toEqual({ prompt: 'check' });
      expect(history[0].turnSegments).toEqual([{ type: 'text', content: 'result' }]);
      expect(history[0].toolRecords).toEqual([{ toolCallId: 't1', toolName: 'bash', status: 'success' }]);
      expect(history[0].reasoning).toBe('thinking...');
      expect(history[0].usage).toEqual({ inputTokens: 100, outputTokens: 50, cacheReadTokens: 10, cacheWriteTokens: 5 });
      expect(history[0].content).toBe('result text');
    });

    it('should execute a shell job and record history', async () => {
      const job = store.create({ name: 'Manual Shell', type: 'shell', scheduleType: 'cron', scheduleValue: '0 0 * * *', config: { command: 'echo hello' } });

      await scheduler.triggerJob(job.id);

      expect(executorFn).toHaveBeenCalledOnce();
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

    it('should broadcast cron:job_completed on success', async () => {
      const job = store.create({ name: 'Broadcast Test', type: 'ai', scheduleType: 'cron', scheduleValue: '0 0 * * *', config: { prompt: 'check' } });

      await scheduler.triggerJob(job.id);

      expect(broadcastFn).toHaveBeenCalledOnce();
      const msg = broadcastFn.mock.calls[0][0];
      expect(msg.type).toBe('cron:job_completed');
      expect(msg.data.jobId).toBe(job.id);
      expect(msg.data.jobName).toBe('Broadcast Test');
      expect(msg.data.status).toBe('success');
      expect(msg.data.historyId).toBeDefined();
    });

    it('should broadcast cron:job_failed on error', async () => {
      executorFn.mockRejectedValueOnce(new Error('oops'));
      const job = store.create({ name: 'Fail Broadcast', type: 'ai', scheduleType: 'cron', scheduleValue: '0 0 * * *', config: { prompt: 'fail' } });

      await scheduler.triggerJob(job.id);

      expect(broadcastFn).toHaveBeenCalledOnce();
      const msg = broadcastFn.mock.calls[0][0];
      expect(msg.type).toBe('cron:job_failed');
      expect(msg.data.status).toBe('error');
    });

    it('should handle execution with executionData.error as timeout', async () => {
      executorFn.mockResolvedValue({
        output: 'timeout output',
        executionData: {
          turnSegments: [],
          toolRecords: [],
          contentSegments: [],
          reasoningText: '',
          usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
          error: 'Background session timeout after 300000ms',
        },
      });

      const job = store.create({ name: 'Timeout Job', type: 'ai', scheduleType: 'cron', scheduleValue: '0 0 * * *', config: { prompt: 'slow' } });
      await scheduler.triggerJob(job.id);

      const history = store.getHistory(job.id);
      expect(history[0].status).toBe('timeout');
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
