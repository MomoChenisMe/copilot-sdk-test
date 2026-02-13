import type { WsMessage, WsHandler } from './types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('ws-router');

const handlers = new Map<string, WsHandler>();

export function registerHandler(prefix: string, handler: WsHandler) {
  handlers.set(prefix, handler);
}

export function createRouter() {
  return (message: WsMessage, send: (msg: WsMessage) => void): void => {
    const { type } = message;

    // Built-in: ping/pong
    if (type === 'ping') {
      send({ type: 'pong' });
      return;
    }

    // Route by prefix (e.g., "copilot:" -> copilot handler)
    const colonIndex = type.indexOf(':');
    const prefix = colonIndex > 0 ? type.substring(0, colonIndex) : '';

    const handler = handlers.get(prefix);
    if (handler) {
      handler(message, send);
      return;
    }

    log.warn({ type }, 'Unknown message type');
    send({ type: 'error', data: { message: `Unknown message type: ${type}` } });
  };
}
