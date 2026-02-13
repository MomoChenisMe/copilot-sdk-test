import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupGracefulShutdown } from '../../src/utils/graceful-shutdown.js';

describe('graceful-shutdown', () => {
  const originalListeners = new Map<string, Function[]>();

  beforeEach(() => {
    // Save original listeners
    for (const signal of ['SIGTERM', 'SIGINT']) {
      originalListeners.set(signal, process.listeners(signal as NodeJS.Signals) as Function[]);
    }
  });

  afterEach(() => {
    // Restore original listeners
    for (const signal of ['SIGTERM', 'SIGINT']) {
      process.removeAllListeners(signal);
      for (const listener of originalListeners.get(signal) || []) {
        process.on(signal as NodeJS.Signals, listener as () => void);
      }
    }
  });

  it('registers SIGTERM and SIGINT handlers', () => {
    const cleanup = vi.fn().mockResolvedValue(undefined);
    setupGracefulShutdown([cleanup]);

    expect(process.listenerCount('SIGTERM')).toBeGreaterThan(0);
    expect(process.listenerCount('SIGINT')).toBeGreaterThan(0);
  });

  it('calls all cleanup functions on signal', async () => {
    const cleanup1 = vi.fn().mockResolvedValue(undefined);
    const cleanup2 = vi.fn().mockResolvedValue(undefined);

    // We need to intercept process.exit to prevent test from actually exiting
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    setupGracefulShutdown([cleanup1, cleanup2]);

    // Simulate SIGTERM
    process.emit('SIGTERM');

    // Wait for async cleanup
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(cleanup1).toHaveBeenCalledTimes(1);
    expect(cleanup2).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('exits with code 1 if cleanup throws', async () => {
    const cleanup = vi.fn().mockRejectedValue(new Error('cleanup failed'));
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    setupGracefulShutdown([cleanup]);

    process.emit('SIGTERM');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('only runs cleanup once even if signal is sent twice', async () => {
    const cleanup = vi.fn().mockResolvedValue(undefined);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    setupGracefulShutdown([cleanup]);

    process.emit('SIGTERM');
    process.emit('SIGTERM');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(cleanup).toHaveBeenCalledTimes(1);

    exitSpy.mockRestore();
  });
});
