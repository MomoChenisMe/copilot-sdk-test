import type { WsMessage, WsHandler, SendFn } from './types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('ws-router');

const handlers = new Map<string, WsHandler>();

export function registerHandler(prefix: string, handler: WsHandler) {
  handlers.set(prefix, handler);
}

function invokeHandler(handler: WsHandler, message: WsMessage, send: SendFn): void {
  if (typeof handler === 'function') {
    handler(message, send);
  } else {
    handler.onMessage(message, send);
  }
}

export function notifyDisconnect(send: SendFn): void {
  for (const [prefix, handler] of handlers) {
    if (typeof handler !== 'function' && handler.onDisconnect) {
      try {
        handler.onDisconnect(send);
      } catch (err) {
        log.error({ err, prefix }, 'Handler onDisconnect error');
      }
    }
  }
}

export function createRouter() {
  return (message: WsMessage, send: SendFn): void => {
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
      invokeHandler(handler, message, send);
      return;
    }

    log.warn({ type }, 'Unknown message type');
    send({ type: 'error', data: { message: `Unknown message type: ${type}` } });
  };
}
