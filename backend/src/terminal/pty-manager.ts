import * as pty from 'node-pty';
import os from 'node:os';
import { createLogger } from '../utils/logger.js';

const log = createLogger('pty-manager');

export interface PtySpawnOptions {
  cwd: string;
  onData: (data: string) => void;
  onExit: (exitCode: number, signal?: number) => void;
  cols?: number;
  rows?: number;
}

export class PtyManager {
  private process: pty.IPty | null = null;
  private dataDisposable: pty.IDisposable | null = null;
  private exitDisposable: pty.IDisposable | null = null;

  spawn(options: PtySpawnOptions): void {
    // Kill existing process if any
    this.kill();

    const shell = os.platform() === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/bash');
    const cols = options.cols ?? 80;
    const rows = options.rows ?? 24;

    log.info({ shell, cwd: options.cwd, cols, rows }, 'Spawning PTY');

    this.process = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: options.cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
      } as Record<string, string>,
    });

    this.dataDisposable = this.process.onData((data) => {
      options.onData(data);
    });

    this.exitDisposable = this.process.onExit(({ exitCode, signal }) => {
      log.info({ exitCode, signal }, 'PTY exited');
      this.process = null;
      this.dataDisposable = null;
      this.exitDisposable = null;
      options.onExit(exitCode, signal);
    });
  }

  write(data: string): void {
    if (this.process) {
      this.process.write(data);
    }
  }

  resize(cols: number, rows: number): void {
    if (this.process) {
      try {
        this.process.resize(cols, rows);
      } catch (err) {
        log.warn({ err }, 'Failed to resize PTY');
      }
    }
  }

  isRunning(): boolean {
    return this.process !== null;
  }

  destroy(): void {
    this.kill();
  }

  private kill(): void {
    if (this.process) {
      try {
        this.dataDisposable?.dispose();
        this.exitDisposable?.dispose();
        this.process.kill();
      } catch {
        // ignore — process may already be dead
      }
      this.process = null;
      this.dataDisposable = null;
      this.exitDisposable = null;
    }
  }
}
