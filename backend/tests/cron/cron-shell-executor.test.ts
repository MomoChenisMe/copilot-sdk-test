import { describe, it, expect, vi } from 'vitest';
import { createShellTaskExecutor } from '../../src/cron/cron-executors.js';

// Mock child_process
vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

import { exec } from 'node:child_process';

describe('Shell task executor', () => {
  it('should execute a command and return output', async () => {
    (exec as any).mockImplementation((_cmd: string, _opts: any, cb: Function) => {
      cb(null, 'disk usage output', '');
      return { kill: vi.fn() };
    });

    const executor = createShellTaskExecutor();
    const result = await executor({ command: 'df -h', cwd: '/home' });

    expect(exec).toHaveBeenCalledWith(
      'df -h',
      expect.objectContaining({ cwd: '/home', timeout: 60000 }),
      expect.any(Function),
    );
    expect(result.output).toBe('disk usage output');
  });

  it('should use default timeout of 60000ms', async () => {
    (exec as any).mockImplementation((_cmd: string, _opts: any, cb: Function) => {
      cb(null, 'ok', '');
      return { kill: vi.fn() };
    });

    const executor = createShellTaskExecutor();
    await executor({ command: 'echo hi' });

    expect(exec).toHaveBeenCalledWith(
      'echo hi',
      expect.objectContaining({ timeout: 60000 }),
      expect.any(Function),
    );
  });

  it('should use custom timeout when specified', async () => {
    (exec as any).mockImplementation((_cmd: string, _opts: any, cb: Function) => {
      cb(null, 'ok', '');
      return { kill: vi.fn() };
    });

    const executor = createShellTaskExecutor();
    await executor({ command: 'long task', timeout: 120000 });

    expect(exec).toHaveBeenCalledWith(
      'long task',
      expect.objectContaining({ timeout: 120000 }),
      expect.any(Function),
    );
  });

  it('should throw on non-zero exit code with stderr', async () => {
    const error = new Error('Command failed') as any;
    error.code = 1;
    error.killed = false;
    (exec as any).mockImplementation((_cmd: string, _opts: any, cb: Function) => {
      cb(error, '', 'permission denied');
      return { kill: vi.fn() };
    });

    const executor = createShellTaskExecutor();
    await expect(executor({ command: 'bad cmd' })).rejects.toThrow('Command failed');
  });

  it('should throw timeout error when command is killed', async () => {
    const error = new Error('killed') as any;
    error.killed = true;
    error.signal = 'SIGTERM';
    (exec as any).mockImplementation((_cmd: string, _opts: any, cb: Function) => {
      cb(error, '', '');
      return { kill: vi.fn() };
    });

    const executor = createShellTaskExecutor();
    await expect(executor({ command: 'hang' })).rejects.toThrow();
  });

  it('should truncate output to 10000 characters', async () => {
    const longOutput = 'x'.repeat(15000);
    (exec as any).mockImplementation((_cmd: string, _opts: any, cb: Function) => {
      cb(null, longOutput, '');
      return { kill: vi.fn() };
    });

    const executor = createShellTaskExecutor();
    const result = await executor({ command: 'verbose' });
    expect(result.output!.length).toBeLessThanOrEqual(10020); // 10000 + truncation notice
  });
});
