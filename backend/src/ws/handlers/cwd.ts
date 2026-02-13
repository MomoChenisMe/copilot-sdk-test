import type { WsMessage, WsHandler } from '../types.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('ws-cwd');

export function createCwdHandler(onCwdChange: (cwd: string) => void): WsHandler {
  return (message: WsMessage, send: (msg: WsMessage) => void): void => {
    const { type, data } = message;
    const payload = (data ?? {}) as Record<string, unknown>;

    switch (type) {
      case 'cwd:change': {
        const cwd = payload.cwd;
        if (typeof cwd !== 'string' || !cwd) {
          send({ type: 'error', data: { message: 'cwd is required' } });
          return;
        }

        log.info({ cwd }, 'Working directory changed');
        onCwdChange(cwd);
        break;
      }

      default:
        send({
          type: 'error',
          data: { message: `Unknown cwd action: ${type}` },
        });
    }
  };
}
