import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock PtyManager
const { mockPtyManager } = vi.hoisted(() => {
  const _mock = {
    spawn: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    destroy: vi.fn(),
    isRunning: vi.fn(() => false),
    reset() {
      this.spawn.mockClear();
      this.write.mockClear();
      this.resize.mockClear();
      this.destroy.mockClear();
      this.isRunning.mockClear();
      this.isRunning.mockReturnValue(false);
    },
  };
  return { mockPtyManager: _mock };
});

vi.mock('../../../src/terminal/pty-manager.js', () => ({
  PtyManager: vi.fn(() => mockPtyManager),
}));

import { createTerminalHandler } from '../../../src/ws/handlers/terminal.js';
import type { WsMessage } from '../../../src/ws/types.js';

describe('terminal WS handler', () => {
  let handler: (message: WsMessage, send: (msg: WsMessage) => void) => void;
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPtyManager.reset();
    send = vi.fn();
    handler = createTerminalHandler('/tmp');
  });

  describe('terminal:spawn', () => {
    it('should spawn a new PTY', () => {
      handler({ type: 'terminal:spawn' }, send);

      expect(mockPtyManager.spawn).toHaveBeenCalledOnce();
      const spawnOpts = mockPtyManager.spawn.mock.calls[0][0];
      expect(spawnOpts.cwd).toBe('/tmp');
      expect(typeof spawnOpts.onData).toBe('function');
      expect(typeof spawnOpts.onExit).toBe('function');
    });

    it('should spawn with custom cwd', () => {
      handler({ type: 'terminal:spawn', data: { cwd: '/home/user' } }, send);

      const spawnOpts = mockPtyManager.spawn.mock.calls[0][0];
      expect(spawnOpts.cwd).toBe('/home/user');
    });

    it('should spawn with cols and rows', () => {
      handler({ type: 'terminal:spawn', data: { cols: 120, rows: 40 } }, send);

      const spawnOpts = mockPtyManager.spawn.mock.calls[0][0];
      expect(spawnOpts.cols).toBe(120);
      expect(spawnOpts.rows).toBe(40);
    });

    it('should relay PTY data via terminal:output', () => {
      handler({ type: 'terminal:spawn' }, send);

      const spawnOpts = mockPtyManager.spawn.mock.calls[0][0];
      spawnOpts.onData('hello\r\n');

      expect(send).toHaveBeenCalledWith({
        type: 'terminal:output',
        data: { output: 'hello\r\n' },
      });
    });

    it('should send terminal:exit when PTY exits', () => {
      handler({ type: 'terminal:spawn' }, send);

      const spawnOpts = mockPtyManager.spawn.mock.calls[0][0];
      spawnOpts.onExit(0);

      expect(send).toHaveBeenCalledWith({
        type: 'terminal:exit',
        data: { exitCode: 0 },
      });
    });
  });

  describe('terminal:input', () => {
    it('should write data to PTY', () => {
      handler({ type: 'terminal:input', data: { input: 'ls -la\r' } }, send);

      expect(mockPtyManager.write).toHaveBeenCalledWith('ls -la\r');
    });

    it('should ignore input without data', () => {
      handler({ type: 'terminal:input' }, send);

      expect(mockPtyManager.write).not.toHaveBeenCalled();
    });
  });

  describe('terminal:resize', () => {
    it('should resize PTY with cols and rows', () => {
      handler({ type: 'terminal:resize', data: { cols: 100, rows: 30 } }, send);

      expect(mockPtyManager.resize).toHaveBeenCalledWith(100, 30);
    });

    it('should ignore resize without valid data', () => {
      handler({ type: 'terminal:resize' }, send);

      expect(mockPtyManager.resize).not.toHaveBeenCalled();
    });

    it('should ignore resize with non-numeric values', () => {
      handler({ type: 'terminal:resize', data: { cols: 'abc', rows: 30 } }, send);

      expect(mockPtyManager.resize).not.toHaveBeenCalled();
    });
  });

  describe('unknown terminal message', () => {
    it('should send error for unknown terminal sub-type', () => {
      handler({ type: 'terminal:unknown_action' }, send);

      expect(send).toHaveBeenCalledWith({
        type: 'error',
        data: { message: 'Unknown terminal action: terminal:unknown_action' },
      });
    });
  });
});
