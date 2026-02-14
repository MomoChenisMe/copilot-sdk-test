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

  // --- Defensive fallback chain tests ---

  it('should fallback to delta/content when deltaContent is missing on message_delta', () => {
    const { send, handlers } = setup();

    handlers.get('assistant.message_delta')!({
      type: 'assistant.message_delta',
      messageId: 'msg-2',
      delta: 'Fallback delta',
    });

    expect(send).toHaveBeenCalledWith({
      type: 'copilot:delta',
      data: { messageId: 'msg-2', content: 'Fallback delta' },
    });
  });

  it('should fallback to content when deltaContent is missing on reasoning_delta', () => {
    const { send, handlers } = setup();

    handlers.get('assistant.reasoning_delta')!({
      type: 'assistant.reasoning_delta',
      reasoningId: 'r-2',
      content: 'Reasoning fallback',
    });

    expect(send).toHaveBeenCalledWith({
      type: 'copilot:reasoning_delta',
      data: { reasoningId: 'r-2', content: 'Reasoning fallback' },
    });
  });

  it('should default to empty string when all content properties are missing', () => {
    const { send, handlers } = setup();

    handlers.get('assistant.message_delta')!({
      type: 'assistant.message_delta',
      messageId: 'msg-3',
    });

    expect(send).toHaveBeenCalledWith({
      type: 'copilot:delta',
      data: { messageId: 'msg-3', content: '' },
    });
  });

  it('should fallback error message when message is missing on session.error', () => {
    const { send, handlers } = setup();

    handlers.get('session.error')!({
      type: 'session.error',
      errorType: 'unknown_error',
    });

    expect(send).toHaveBeenCalledWith({
      type: 'copilot:error',
      data: { errorType: 'unknown_error', message: 'Unknown error' },
    });
  });

  // --- Nested event structure tests (SDK wraps payload in { type, data: {...} }) ---

  describe('nested event structure (e.data wrapper)', () => {
    it('should extract content from nested assistant.message_delta', () => {
      const { send, handlers } = setup();

      handlers.get('assistant.message_delta')!({
        type: 'assistant.message_delta',
        data: { messageId: 'msg-n1', deltaContent: 'Nested hello' },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:delta',
        data: { messageId: 'msg-n1', content: 'Nested hello' },
      });
    });

    it('should extract content from nested assistant.message', () => {
      const { send, handlers } = setup();

      handlers.get('assistant.message')!({
        type: 'assistant.message',
        data: { messageId: 'msg-n2', content: 'Nested message' },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:message',
        data: { messageId: 'msg-n2', content: 'Nested message' },
      });
    });

    it('should extract content from nested assistant.reasoning_delta', () => {
      const { send, handlers } = setup();

      handlers.get('assistant.reasoning_delta')!({
        type: 'assistant.reasoning_delta',
        data: { reasoningId: 'r-n1', deltaContent: 'Nested reasoning' },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:reasoning_delta',
        data: { reasoningId: 'r-n1', content: 'Nested reasoning' },
      });
    });

    it('should extract content from nested assistant.reasoning', () => {
      const { send, handlers } = setup();

      handlers.get('assistant.reasoning')!({
        type: 'assistant.reasoning',
        data: { reasoningId: 'r-n2', content: 'Nested full reasoning' },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:reasoning',
        data: { reasoningId: 'r-n2', content: 'Nested full reasoning' },
      });
    });

    it('should extract fields from nested tool.execution_start', () => {
      const { send, handlers } = setup();

      handlers.get('tool.execution_start')!({
        type: 'tool.execution_start',
        data: {
          toolCallId: 'tc-n1',
          toolName: 'run_command',
          arguments: { cmd: 'ls' },
        },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:tool_start',
        data: {
          toolCallId: 'tc-n1',
          toolName: 'run_command',
          arguments: { cmd: 'ls' },
        },
      });
    });

    it('should extract fields from nested tool.execution_complete', () => {
      const { send, handlers } = setup();

      handlers.get('tool.execution_complete')!({
        type: 'tool.execution_complete',
        data: {
          toolCallId: 'tc-n2',
          success: true,
          result: 'nested result',
        },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:tool_end',
        data: {
          toolCallId: 'tc-n2',
          success: true,
          result: 'nested result',
        },
      });
    });

    it('should extract fields from nested session.error', () => {
      const { send, handlers } = setup();

      handlers.get('session.error')!({
        type: 'session.error',
        data: {
          errorType: 'nested_error',
          message: 'Nested error message',
        },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:error',
        data: { errorType: 'nested_error', message: 'Nested error message' },
      });
    });
  });
});
