import { describe, it, expect, vi } from 'vitest';
import { createAiTaskExecutor } from '../../src/cron/cron-executors.js';

describe('AI task executor', () => {
  it('should create a conversation and start a stream', async () => {
    const mockRepo = {
      create: vi.fn().mockReturnValue({ id: 'conv-1' }),
    };
    const mockStreamManager = {
      startStream: vi.fn().mockResolvedValue(undefined),
      waitForStreamEnd: vi.fn().mockResolvedValue(undefined),
    };

    const executor = createAiTaskExecutor(mockRepo as any, mockStreamManager as any);
    const result = await executor({ prompt: 'check disk', model: 'gpt-4o', cwd: '/tmp' });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('Cron') }),
    );
    expect(mockStreamManager.startStream).toHaveBeenCalledWith(
      'conv-1',
      expect.objectContaining({ content: 'check disk' }),
    );
    expect(result.output).toContain('conv-1');
  });

  it('should use default model and cwd when not specified', async () => {
    const mockRepo = {
      create: vi.fn().mockReturnValue({ id: 'conv-2' }),
    };
    const mockStreamManager = {
      startStream: vi.fn().mockResolvedValue(undefined),
      waitForStreamEnd: vi.fn().mockResolvedValue(undefined),
    };

    const executor = createAiTaskExecutor(mockRepo as any, mockStreamManager as any);
    await executor({ prompt: 'hello' });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o' }),
    );
  });

  it('should propagate errors from startStream', async () => {
    const mockRepo = {
      create: vi.fn().mockReturnValue({ id: 'conv-3' }),
    };
    const mockStreamManager = {
      startStream: vi.fn().mockRejectedValue(new Error('stream fail')),
    };

    const executor = createAiTaskExecutor(mockRepo as any, mockStreamManager as any);
    await expect(executor({ prompt: 'fail' })).rejects.toThrow('stream fail');
  });

  it('should respect maxConcurrency by queuing (delegates to streamManager)', async () => {
    // The maxConcurrency is enforced by StreamManager, not by the executor
    // This test verifies the executor simply calls startStream
    const mockRepo = {
      create: vi.fn().mockReturnValue({ id: 'conv-4' }),
    };
    const mockStreamManager = {
      startStream: vi.fn().mockResolvedValue(undefined),
      waitForStreamEnd: vi.fn().mockResolvedValue(undefined),
    };

    const executor = createAiTaskExecutor(mockRepo as any, mockStreamManager as any);
    await executor({ prompt: 'queued task', model: 'gpt-4o' });

    expect(mockStreamManager.startStream).toHaveBeenCalledOnce();
  });
});
