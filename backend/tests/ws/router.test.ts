import { describe, it, expect, beforeEach } from 'vitest';
import { createRouter, registerHandler } from '../../src/ws/router.js';
import type { WsMessage } from '../../src/ws/types.js';

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
});
