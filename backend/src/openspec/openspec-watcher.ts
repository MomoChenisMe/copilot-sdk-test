import { watch, type FSWatcher } from 'chokidar';
import { createLogger } from '../utils/logger.js';

const log = createLogger('openspec-watcher');

export class OpenSpecWatcher {
  private watcher: FSWatcher | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;

  constructor(
    private onChange: () => void,
    debounceMs = 500,
  ) {
    this.debounceMs = debounceMs;
  }

  watch(dirPath: string): void {
    this.stop();
    log.info({ path: dirPath }, 'Starting openspec file watcher');

    this.watcher = watch(dirPath, {
      ignoreInitial: true,
      ignored: /(^|[/\\])\../, // ignore hidden files
      persistent: true,
      depth: 10,
    });

    const handler = () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        log.info('OpenSpec change detected, notifying');
        this.onChange();
      }, this.debounceMs);
    };

    this.watcher.on('add', handler);
    this.watcher.on('change', handler);
    this.watcher.on('unlink', handler);
    this.watcher.on('addDir', handler);
    this.watcher.on('unlinkDir', handler);
    this.watcher.on('error', (err) => {
      log.error({ err }, 'File watcher error');
    });
  }

  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.watcher) {
      this.watcher.close().catch(() => {});
      this.watcher = null;
    }
  }
}
