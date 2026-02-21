import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCronTools } from '../../src/copilot/tools/cron-tools.js';

describe('createCronTools', () => {
  let mockCronStore: any;
  let mockCronScheduler: any;
  let handler: (args: Record<string, unknown>) => Promise<any>;

  beforeEach(() => {
    mockCronStore = {
      listAll: vi.fn().mockReturnValue([]),
      getById: vi.fn().mockReturnValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockCronScheduler = {
      registerJob: vi.fn(),
      unregisterJob: vi.fn(),
      triggerJob: vi.fn().mockResolvedValue(undefined),
    };

    const tools = createCronTools(mockCronStore, mockCronScheduler);
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('manage_cron_jobs');
    handler = (tools[0] as any).handler;
  });

  describe('list', () => {
    it('should return all jobs', async () => {
      mockCronStore.listAll.mockReturnValue([
        { id: '1', name: 'test-job', type: 'ai', scheduleType: 'cron', scheduleValue: '0 * * * *', enabled: true, lastRun: null, nextRun: null, config: {} },
      ]);
      const result = await handler({ action: 'list' });
      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].name).toBe('test-job');
    });

    it('should return empty list when no jobs', async () => {
      const result = await handler({ action: 'list' });
      expect(result.jobs).toEqual([]);
    });
  });

  describe('get', () => {
    it('should return a job by id', async () => {
      mockCronStore.getById.mockReturnValue({
        id: '1', name: 'my-job', type: 'shell', scheduleType: 'interval', scheduleValue: '60000', enabled: true, lastRun: null, nextRun: null, config: { command: 'echo hi' },
      });
      const result = await handler({ action: 'get', id: '1' });
      expect(result.job.name).toBe('my-job');
    });

    it('should return error when id is missing', async () => {
      const result = await handler({ action: 'get' });
      expect(result.error).toContain('id is required');
    });

    it('should return error when job not found', async () => {
      const result = await handler({ action: 'get', id: 'nope' });
      expect(result.error).toContain('not found');
    });
  });

  describe('create', () => {
    it('should create an AI job and register it', async () => {
      const created = {
        id: 'new-1', name: 'daily-report', type: 'ai', scheduleType: 'cron', scheduleValue: '0 9 * * *',
        enabled: true, lastRun: null, nextRun: null, config: { prompt: 'Generate report' },
      };
      mockCronStore.create.mockReturnValue(created);

      const result = await handler({
        action: 'create',
        name: 'daily-report',
        type: 'ai',
        scheduleType: 'cron',
        scheduleValue: '0 9 * * *',
        config: { prompt: 'Generate report' },
      });

      expect(result.ok).toBe(true);
      expect(result.job.name).toBe('daily-report');
      expect(mockCronStore.create).toHaveBeenCalled();
      expect(mockCronScheduler.registerJob).toHaveBeenCalledWith(created);
    });

    it('should not register disabled jobs', async () => {
      const created = {
        id: 'new-2', name: 'disabled-job', type: 'shell', scheduleType: 'interval', scheduleValue: '5000',
        enabled: false, lastRun: null, nextRun: null, config: {},
      };
      mockCronStore.create.mockReturnValue(created);

      await handler({
        action: 'create',
        name: 'disabled-job',
        type: 'shell',
        scheduleType: 'interval',
        scheduleValue: '5000',
        enabled: false,
      });

      expect(mockCronScheduler.registerJob).not.toHaveBeenCalled();
    });

    it('should return error when required fields are missing', async () => {
      let result = await handler({ action: 'create' });
      expect(result.error).toContain('name is required');

      result = await handler({ action: 'create', name: 'x' });
      expect(result.error).toContain('type is required');

      result = await handler({ action: 'create', name: 'x', type: 'ai' });
      expect(result.error).toContain('scheduleType is required');

      result = await handler({ action: 'create', name: 'x', type: 'ai', scheduleType: 'cron' });
      expect(result.error).toContain('scheduleValue is required');
    });
  });

  describe('update', () => {
    it('should update a job and re-register', async () => {
      const updated = {
        id: '1', name: 'updated-job', type: 'ai', scheduleType: 'cron', scheduleValue: '0 12 * * *',
        enabled: true, lastRun: null, nextRun: null, config: {},
      };
      mockCronStore.update.mockReturnValue(updated);

      const result = await handler({ action: 'update', id: '1', name: 'updated-job' });
      expect(result.ok).toBe(true);
      expect(mockCronScheduler.unregisterJob).toHaveBeenCalledWith('1');
      expect(mockCronScheduler.registerJob).toHaveBeenCalledWith(updated);
    });

    it('should return error when job not found', async () => {
      mockCronStore.update.mockReturnValue(null);
      const result = await handler({ action: 'update', id: 'nope', name: 'x' });
      expect(result.error).toContain('not found');
    });
  });

  describe('delete', () => {
    it('should delete a job and unregister', async () => {
      mockCronStore.delete.mockReturnValue(true);
      const result = await handler({ action: 'delete', id: '1' });
      expect(result.ok).toBe(true);
      expect(mockCronScheduler.unregisterJob).toHaveBeenCalledWith('1');
    });

    it('should return error when job not found', async () => {
      mockCronStore.delete.mockReturnValue(false);
      const result = await handler({ action: 'delete', id: 'nope' });
      expect(result.error).toContain('not found');
    });
  });

  describe('trigger', () => {
    it('should trigger a job', async () => {
      mockCronStore.getById.mockReturnValue({
        id: '1', name: 'my-job', type: 'ai', scheduleType: 'cron', scheduleValue: '* * * * *',
        enabled: true, lastRun: null, nextRun: null, config: {},
      });
      const result = await handler({ action: 'trigger', id: '1' });
      expect(result.ok).toBe(true);
      expect(result.message).toContain('my-job');
      expect(mockCronScheduler.triggerJob).toHaveBeenCalledWith('1');
    });

    it('should return error when job not found', async () => {
      const result = await handler({ action: 'trigger', id: 'nope' });
      expect(result.error).toContain('not found');
    });
  });

  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await handler({ action: 'unknown' });
      expect(result.error).toContain('Unknown action');
    });
  });
});
