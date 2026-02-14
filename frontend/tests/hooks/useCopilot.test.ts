import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCopilot } from '../../src/hooks/useCopilot';
import { useAppStore } from '../../src/store';
import type { WsMessage } from '../../src/lib/ws-types';

describe('useCopilot', () => {
  let listeners: ((msg: WsMessage) => void)[];
  let subscribe: (listener: (msg: WsMessage) => void) => () => void;
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listeners = [];
    subscribe = (listener) => {
      listeners.push(listener);
      return () => {
        listeners = listeners.filter((l) => l !== listener);
      };
    };
    send = vi.fn();

    // Reset store
    useAppStore.setState({
      messages: [],
      streamingText: '',
      isStreaming: false,
      toolRecords: [],
      reasoningText: '',
      copilotError: null,
    });
  });

  function emit(msg: WsMessage) {
    for (const l of listeners) l(msg);
  }

  it('should accumulate streaming text from copilot:delta', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:delta', data: { messageId: 'm1', content: 'Hello ' } });
      emit({ type: 'copilot:delta', data: { messageId: 'm1', content: 'world' } });
    });

    expect(useAppStore.getState().streamingText).toBe('Hello world');
  });

  it('should convert streamingText to message on copilot:idle when no copilot:message received', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:delta', data: { messageId: 'm1', content: 'Streamed response' } });
    });

    act(() => {
      emit({ type: 'copilot:idle' });
    });

    const state = useAppStore.getState();
    expect(state.isStreaming).toBe(false);
    // streamingText should have been converted to a message
    const assistantMsg = state.messages.find((m) => m.role === 'assistant');
    expect(assistantMsg).toBeTruthy();
    expect(assistantMsg!.content).toBe('Streamed response');
  });

  it('should NOT duplicate message when copilot:message was received before idle', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:delta', data: { messageId: 'm1', content: 'Hello' } });
      emit({ type: 'copilot:message', data: { messageId: 'm1', content: 'Hello' } });
    });

    act(() => {
      emit({ type: 'copilot:idle' });
    });

    const state = useAppStore.getState();
    const assistantMsgs = state.messages.filter((m) => m.role === 'assistant');
    // Only one assistant message (from copilot:message), not duplicated by idle
    expect(assistantMsgs.length).toBe(1);
  });

  it('should clear streaming state on copilot:idle', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:delta', data: { messageId: 'm1', content: 'Some text' } });
    });

    act(() => {
      emit({ type: 'copilot:idle' });
    });

    const state = useAppStore.getState();
    expect(state.isStreaming).toBe(false);
    expect(state.streamingText).toBe('');
    expect(state.toolRecords).toEqual([]);
    expect(state.reasoningText).toBe('');
  });

  it('should set copilotError on copilot:error', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:error', data: { message: 'Rate limit' } });
    });

    expect(useAppStore.getState().copilotError).toBe('Rate limit');
    expect(useAppStore.getState().isStreaming).toBe(false);
  });

  it('sendMessage should add user message and send ws message', () => {
    const { result } = renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      result.current.sendMessage('conv-1', 'Hello AI');
    });

    const state = useAppStore.getState();
    const userMsg = state.messages.find((m) => m.role === 'user');
    expect(userMsg).toBeTruthy();
    expect(userMsg!.content).toBe('Hello AI');
    expect(send).toHaveBeenCalledWith({
      type: 'copilot:send',
      data: { conversationId: 'conv-1', prompt: 'Hello AI' },
    });
  });
});
