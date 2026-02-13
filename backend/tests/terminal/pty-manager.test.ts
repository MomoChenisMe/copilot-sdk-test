import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Use vi.hoisted to ensure mocks are available before vi.mock factory runs
const { mockPty, mockSpawn } = vi.hoisted(() => {
  const _mockPty = {
    pid: 12345,
    cols: 80,
    rows: 24,
    process: '/bin/zsh',
    _onDataCallbacks: [] as ((data: string) => void)[],
    _onExitCallbacks: [] as ((e: { exitCode: number; signal?: number }) => void)[],
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    simulateData(data: string) {
      for (const cb of this._onDataCallbacks) cb(data);
    },
    simulateExit(exitCode: number, signal?: number) {
      for (const cb of this._onExitCallbacks) cb({ exitCode, signal });
    },
    reset() {
      this._onDataCallbacks = [];
      this._onExitCallbacks = [];
      this.onData.mockClear();
      this.onExit.mockClear();
      this.write.mockClear();
      this.resize.mockClear();
      this.kill.mockClear();
      this.onData.mockImplementation((cb: (data: string) => void) => {
        _mockPty._onDataCallbacks.push(cb);
        return { dispose: vi.fn() };
      });
      this.onExit.mockImplementation(
        (cb: (e: { exitCode: number; signal?: number }) => void) => {
          _mockPty._onExitCallbacks.push(cb);
          return { dispose: vi.fn() };
        },
      );
    },
  };
  // Initialize default implementations
  _mockPty.onData.mockImplementation((cb: (data: string) => void) => {
    _mockPty._onDataCallbacks.push(cb);
    return { dispose: vi.fn() };
  });
  _mockPty.onExit.mockImplementation(
    (cb: (e: { exitCode: number; signal?: number }) => void) => {
      _mockPty._onExitCallbacks.push(cb);
      return { dispose: vi.fn() };
    },
  );

  const _mockSpawn = vi.fn(() => _mockPty);
  return { mockPty: _mockPty, mockSpawn: _mockSpawn };
});

vi.mock('node-pty', () => ({
  default: { spawn: mockSpawn },
  spawn: mockSpawn,
}));

import { PtyManager } from '../../src/terminal/pty-manager.js';

describe('PtyManager', () => {
  let manager: PtyManager;

  beforeEach(() => {
    mockPty.reset();
    mockSpawn.mockClear();
    manager = new PtyManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('spawn', () => {
    it('should spawn a PTY process', () => {
      const onData = vi.fn();
      const onExit = vi.fn();
      manager.spawn({ cwd: '/tmp', onData, onExit });

      expect(manager.isRunning()).toBe(true);
      expect(mockSpawn).toHaveBeenCalledOnce();
    });

    it('should set TERM=xterm-256color environment variable', () => {
      const onData = vi.fn();
      const onExit = vi.fn();
      manager.spawn({ cwd: '/tmp', onData, onExit });

      const options = mockSpawn.mock.calls[0][2];

      expect(options.name).toBe('xterm-256color');
      expect(options.env.TERM).toBe('xterm-256color');
    });

    it('should use the specified cwd', () => {
      const onData = vi.fn();
      const onExit = vi.fn();
      manager.spawn({ cwd: '/home/user/project', onData, onExit });

      const options = mockSpawn.mock.calls[0][2];

      expect(options.cwd).toBe('/home/user/project');
    });

    it('should use default cols/rows when not specified', () => {
      const onData = vi.fn();
      const onExit = vi.fn();
      manager.spawn({ cwd: '/tmp', onData, onExit });

      const options = mockSpawn.mock.calls[0][2];

      expect(options.cols).toBe(80);
      expect(options.rows).toBe(24);
    });

    it('should use specified cols/rows', () => {
      const onData = vi.fn();
      const onExit = vi.fn();
      manager.spawn({ cwd: '/tmp', onData, onExit, cols: 120, rows: 40 });

      const options = mockSpawn.mock.calls[0][2];

      expect(options.cols).toBe(120);
      expect(options.rows).toBe(40);
    });
  });

  describe('data relay', () => {
    it('should relay PTY output via onData callback', () => {
      const onData = vi.fn();
      const onExit = vi.fn();
      manager.spawn({ cwd: '/tmp', onData, onExit });

      mockPty.simulateData('hello from pty\r\n');
      expect(onData).toHaveBeenCalledWith('hello from pty\r\n');
    });

    it('should write input to PTY stdin', () => {
      const onData = vi.fn();
      const onExit = vi.fn();
      manager.spawn({ cwd: '/tmp', onData, onExit });

      manager.write('ls -la\r');
      expect(mockPty.write).toHaveBeenCalledWith('ls -la\r');
    });

    it('should not throw when writing to a non-existent PTY', () => {
      expect(() => manager.write('test')).not.toThrow();
    });
  });

  describe('resize', () => {
    it('should resize the PTY', () => {
      const onData = vi.fn();
      const onExit = vi.fn();
      manager.spawn({ cwd: '/tmp', onData, onExit });

      manager.resize(120, 40);
      expect(mockPty.resize).toHaveBeenCalledWith(120, 40);
    });

    it('should not throw when resizing without a running PTY', () => {
      expect(() => manager.resize(120, 40)).not.toThrow();
      expect(mockPty.resize).not.toHaveBeenCalled();
    });
  });

  describe('exit', () => {
    it('should call onExit when PTY exits', () => {
      const onData = vi.fn();
      const onExit = vi.fn();
      manager.spawn({ cwd: '/tmp', onData, onExit });

      mockPty.simulateExit(0);
      expect(onExit).toHaveBeenCalledWith(0, undefined);
    });

    it('should mark process as not running after exit', () => {
      const onData = vi.fn();
      const onExit = vi.fn();
      manager.spawn({ cwd: '/tmp', onData, onExit });

      expect(manager.isRunning()).toBe(true);
      mockPty.simulateExit(0);
      expect(manager.isRunning()).toBe(false);
    });

    it('should pass exit code and signal', () => {
      const onData = vi.fn();
      const onExit = vi.fn();
      manager.spawn({ cwd: '/tmp', onData, onExit });

      mockPty.simulateExit(1, 9);
      expect(onExit).toHaveBeenCalledWith(1, 9);
    });
  });

  describe('destroy', () => {
    it('should kill the PTY process', () => {
      const onData = vi.fn();
      const onExit = vi.fn();
      manager.spawn({ cwd: '/tmp', onData, onExit });

      expect(manager.isRunning()).toBe(true);
      manager.destroy();
      expect(manager.isRunning()).toBe(false);
      expect(mockPty.kill).toHaveBeenCalled();
    });

    it('should be safe to call multiple times', () => {
      const onData = vi.fn();
      const onExit = vi.fn();
      manager.spawn({ cwd: '/tmp', onData, onExit });

      manager.destroy();
      expect(() => manager.destroy()).not.toThrow();
    });

    it('should be safe to call without spawning', () => {
      expect(() => manager.destroy()).not.toThrow();
    });
  });
});
