import { describe, it, expect } from 'vitest';
import type { WsHandler, WsHandlerObject, SendFn, WsMessage } from '../../src/ws/types.js';

describe('WsHandler type', () => {
  it('should accept a plain function as WsHandler (backward compat)', () => {
    const handler: WsHandler = (_message: WsMessage, _send: SendFn) => {};
    expect(typeof handler).toBe('function');
  });

  it('should accept an object with onMessage as WsHandler', () => {
    const handler: WsHandler = {
      onMessage: (_message: WsMessage, _send: SendFn) => {},
    };
    expect(typeof handler).toBe('object');
    expect(typeof (handler as WsHandlerObject).onMessage).toBe('function');
  });

  it('should accept an object with onMessage and onDisconnect as WsHandler', () => {
    const disconnectCalls: string[] = [];
    const handler: WsHandler = {
      onMessage: (_message: WsMessage, _send: SendFn) => {},
      onDisconnect: (_send: SendFn) => { disconnectCalls.push('called'); },
    };
    expect(typeof handler).toBe('object');
    const obj = handler as WsHandlerObject;
    expect(typeof obj.onMessage).toBe('function');
    expect(typeof obj.onDisconnect).toBe('function');

    // Verify onDisconnect is callable
    obj.onDisconnect!(() => {});
    expect(disconnectCalls).toEqual(['called']);
  });

  it('should export SendFn type alias', () => {
    const send: SendFn = (_msg: WsMessage) => {};
    expect(typeof send).toBe('function');
  });
});
