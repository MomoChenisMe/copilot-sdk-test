import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCwdHandler } from '../../../src/ws/handlers/cwd.js';
import type { WsMessage } from '../../../src/ws/types.js';

describe('cwd WS handler', () => {
  let handler: (message: WsMessage, send: (msg: WsMessage) => void) => void;
  let send: ReturnType<typeof vi.fn>;
  let onCwdChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    send = vi.fn();
    onCwdChange = vi.fn();
    handler = createCwdHandler(onCwdChange);
  });

  it('should call onCwdChange with new cwd', () => {
    handler(
      { type: 'cwd:change', data: { cwd: '/new/path' } },
      send,
    );

    expect(onCwdChange).toHaveBeenCalledWith('/new/path');
  });

  it('should send error when cwd is missing', () => {
    handler(
      { type: 'cwd:change', data: {} },
      send,
    );

    expect(send).toHaveBeenCalledWith({
      type: 'error',
      data: { message: 'cwd is required' },
    });
    expect(onCwdChange).not.toHaveBeenCalled();
  });

  it('should send error when cwd is not a string', () => {
    handler(
      { type: 'cwd:change', data: { cwd: 123 } },
      send,
    );

    expect(send).toHaveBeenCalledWith({
      type: 'error',
      data: { message: 'cwd is required' },
    });
  });

  it('should handle unknown cwd sub-type', () => {
    handler(
      { type: 'cwd:unknown' },
      send,
    );

    expect(send).toHaveBeenCalledWith({
      type: 'error',
      data: { message: 'Unknown cwd action: cwd:unknown' },
    });
  });
});
