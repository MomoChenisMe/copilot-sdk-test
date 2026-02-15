import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRouter, registerHandler, notifyDisconnect } from '../../src/ws/router.js';
import type { WsMessage, WsHandlerObject } from '../../src/ws/types.js';

describe('WS router', () => {
  let router: ReturnType<typeof createRouter>;
  let sent: WsMessage[];
  let send: (msg: WsMessage) => void;

  beforeEach(() => {
    sent = [];
    send = (msg) => sent.push(msg);
    router = createRouter();
  });

  it('should respond pong to ping', () => {
    router({ type: 'ping' }, send);

    expect(sent).toEqual([{ type: 'pong' }]);
  });

  it('should route copilot: messages to copilot handler', () => {
    const received: WsMessage[] = [];
    registerHandler('copilot', (msg, s) => {
      received.push(msg);
      s({ type: 'copilot:ack' });
    });

    router({ type: 'copilot:send', data: { prompt: 'hello' } }, send);

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('copilot:send');
    expect(sent).toEqual([{ type: 'copilot:ack' }]);
  });

  it('should route terminal: messages to terminal handler', () => {
    const received: WsMessage[] = [];
    registerHandler('terminal', (msg) => {
      received.push(msg);
    });

    router({ type: 'terminal:input', data: { data: 'ls' } }, send);

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('terminal:input');
  });

  it('should return error for unknown message type', () => {
    router({ type: 'unknown:foo' }, send);

    expect(sent).toHaveLength(1);
    expect(sent[0].type).toBe('error');
    expect((sent[0].data as { message: string }).message).toContain('Unknown message type');
  });

  it('should return error for type without prefix', () => {
    router({ type: 'nocolon' }, send);

    expect(sent).toHaveLength(1);
    expect(sent[0].type).toBe('error');
  });

  it('should route messages to object-style handler with onMessage', () => {
    const received: WsMessage[] = [];
    const handler: WsHandlerObject = {
      onMessage: (msg, s) => {
        received.push(msg);
        s({ type: 'obj:ack' });
      },
    };
    registerHandler('obj', handler);

    router({ type: 'obj:test' }, send);

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('obj:test');
    expect(sent).toEqual([{ type: 'obj:ack' }]);
  });
});

describe('WS router disconnect notification', () => {
  it('should call onDisconnect on all handlers that have it', () => {
    const calls: string[] = [];
    const handler1: WsHandlerObject = {
      onMessage: () => {},
      onDisconnect: () => { calls.push('handler1'); },
    };
    const handler2: WsHandlerObject = {
      onMessage: () => {},
      onDisconnect: () => { calls.push('handler2'); },
    };
    registerHandler('dc1', handler1);
    registerHandler('dc2', handler2);

    const sent: WsMessage[] = [];
    notifyDisconnect((msg) => sent.push(msg));

    expect(calls).toContain('handler1');
    expect(calls).toContain('handler2');
  });

  it('should skip plain function handlers without onDisconnect', () => {
    registerHandler('plainfn', (_msg, _send) => {});
    // Should not throw
    expect(() => notifyDisconnect(() => {})).not.toThrow();
  });

  it('should not stop if one handler onDisconnect throws', () => {
    const calls: string[] = [];
    const badHandler: WsHandlerObject = {
      onMessage: () => {},
      onDisconnect: () => { throw new Error('boom'); },
    };
    const goodHandler: WsHandlerObject = {
      onMessage: () => {},
      onDisconnect: () => { calls.push('good'); },
    };
    registerHandler('bad', badHandler);
    registerHandler('good', goodHandler);

    // Should not throw even though badHandler.onDisconnect throws
    expect(() => notifyDisconnect(() => {})).not.toThrow();
    expect(calls).toContain('good');
  });
});
