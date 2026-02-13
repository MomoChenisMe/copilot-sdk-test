import { describe, it, expect, vi } from 'vitest';
import { EventRelay } from '../../src/copilot/event-relay.js';
import type { WsMessage } from '../../src/ws/types.js';

describe('EventRelay', () => {
  function setup() {
    const send = vi.fn<(msg: WsMessage) => void>();
    const handlers = new Map<string, (event: any) => void>();

    const mockSession = {
      sessionId: 'test-session',
      on: vi.fn((eventOrHandler: string | Function, handler?: Function) => {
        if (typeof eventOrHandler === 'string' && handler) {
          handlers.set(eventOrHandler, handler);
        }
        return () => {};
      }),
    };

    const relay = new EventRelay(send);
    relay.attach(mockSession as any);

    return { send, handlers, mockSession };
  }

  it('should relay assistant.message_delta as copilot:delta', () => {
    const { send, handlers } = setup();

    handlers.get('assistant.message_delta')!({
      type: 'assistant.message_delta',
      messageId: 'msg-1',
      deltaContent: 'Hello ',
    });

    expect(send).toHaveBeenCalledWith({
      type: 'copilot:delta',
      data: { messageId: 'msg-1', content: 'Hello ' },
    });
  });

  it('should relay assistant.message as copilot:message', () => {
    const { send, handlers } = setup();

    handlers.get('assistant.message')!({
      type: 'assistant.message',
      messageId: 'msg-1',
      content: 'Hello world',
    });

    expect(send).toHaveBeenCalledWith({
      type: 'copilot:message',
      data: { messageId: 'msg-1', content: 'Hello world' },
    });
  });

  it('should relay assistant.reasoning_delta as copilot:reasoning_delta', () => {
    const { send, handlers } = setup();

    handlers.get('assistant.reasoning_delta')!({
      type: 'assistant.reasoning_delta',
      reasoningId: 'r-1',
      deltaContent: 'Thinking...',
    });

    expect(send).toHaveBeenCalledWith({
      type: 'copilot:reasoning_delta',
      data: { reasoningId: 'r-1', content: 'Thinking...' },
    });
  });

  it('should relay assistant.reasoning as copilot:reasoning', () => {
    const { send, handlers } = setup();

    handlers.get('assistant.reasoning')!({
      type: 'assistant.reasoning',
      reasoningId: 'r-1',
      content: 'Full reasoning text',
    });

    expect(send).toHaveBeenCalledWith({
      type: 'copilot:reasoning',
      data: { reasoningId: 'r-1', content: 'Full reasoning text' },
    });
  });

  it('should relay tool.execution_start as copilot:tool_start', () => {
    const { send, handlers } = setup();

    handlers.get('tool.execution_start')!({
      type: 'tool.execution_start',
      toolCallId: 'tc-1',
      toolName: 'read_file',
      arguments: { path: '/tmp/test.txt' },
    });

    expect(send).toHaveBeenCalledWith({
      type: 'copilot:tool_start',
      data: {
        toolCallId: 'tc-1',
        toolName: 'read_file',
        arguments: { path: '/tmp/test.txt' },
      },
    });
  });

  it('should relay tool.execution_complete as copilot:tool_end', () => {
    const { send, handlers } = setup();

    handlers.get('tool.execution_complete')!({
      type: 'tool.execution_complete',
      toolCallId: 'tc-1',
      success: true,
      result: 'file contents...',
    });

    expect(send).toHaveBeenCalledWith({
      type: 'copilot:tool_end',
      data: {
        toolCallId: 'tc-1',
        success: true,
        result: 'file contents...',
      },
    });
  });

  it('should relay tool.execution_complete with error as copilot:tool_end', () => {
    const { send, handlers } = setup();

    handlers.get('tool.execution_complete')!({
      type: 'tool.execution_complete',
      toolCallId: 'tc-2',
      success: false,
      error: 'File not found',
    });

    expect(send).toHaveBeenCalledWith({
      type: 'copilot:tool_end',
      data: {
        toolCallId: 'tc-2',
        success: false,
        error: 'File not found',
      },
    });
  });

  it('should relay session.idle as copilot:idle', () => {
    const { send, handlers } = setup();

    handlers.get('session.idle')!({
      type: 'session.idle',
    });

    expect(send).toHaveBeenCalledWith({
      type: 'copilot:idle',
    });
  });

  it('should relay session.error as copilot:error', () => {
    const { send, handlers } = setup();

    handlers.get('session.error')!({
      type: 'session.error',
      errorType: 'api_error',
      message: 'Rate limit exceeded',
    });

    expect(send).toHaveBeenCalledWith({
      type: 'copilot:error',
      data: { errorType: 'api_error', message: 'Rate limit exceeded' },
    });
  });
});
