import { PtyManager } from '../../terminal/pty-manager.js';
import type { WsMessage, WsHandler } from '../types.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('ws-terminal');

export function createTerminalHandler(defaultCwd: string): WsHandler {
  const pty = new PtyManager();

  return (message: WsMessage, send: (msg: WsMessage) => void): void => {
    const { type, data } = message;
    const payload = (data ?? {}) as Record<string, unknown>;

    switch (type) {
      case 'terminal:spawn': {
        const cwd = (typeof payload.cwd === 'string' ? payload.cwd : defaultCwd);
        const cols = typeof payload.cols === 'number' ? payload.cols : undefined;
        const rows = typeof payload.rows === 'number' ? payload.rows : undefined;

        log.info({ cwd, cols, rows }, 'Spawning terminal');

        pty.spawn({
          cwd,
          cols,
          rows,
          onData: (output) => {
            send({ type: 'terminal:output', data: { output } });
          },
          onExit: (exitCode) => {
            log.info({ exitCode }, 'Terminal exited');
            send({ type: 'terminal:exit', data: { exitCode } });
          },
        });
        break;
      }

      case 'terminal:input': {
        const input = payload.input;
        if (typeof input === 'string') {
          pty.write(input);
        }
        break;
      }

      case 'terminal:resize': {
        const cols = payload.cols;
        const rows = payload.rows;
        if (typeof cols === 'number' && typeof rows === 'number') {
          pty.resize(cols, rows);
        }
        break;
      }

      default:
        send({
          type: 'error',
          data: { message: `Unknown terminal action: ${type}` },
        });
    }
  };
}
