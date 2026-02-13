import { createLogger } from './logger.js';

const log = createLogger('shutdown');

type CleanupFn = () => Promise<void>;

export function setupGracefulShutdown(cleanups: CleanupFn[]) {
  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    log.info({ signal }, 'Received signal, starting graceful shutdown');

    try {
      await Promise.all(cleanups.map((fn) => fn()));
      log.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      log.error({ err }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}
