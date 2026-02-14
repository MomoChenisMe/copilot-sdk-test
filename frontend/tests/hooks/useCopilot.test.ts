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
      turnContentSegments: [],
      copilotError: null,
    });
  });

  function emit(msg: WsMessage) {
    for (const l of listeners) l(msg);
  }

  // --- copilot:delta (unchanged) ---

  it('should accumulate streaming text from copilot:delta', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:delta', data: { messageId: 'm1', content: 'Hello ' } });
      emit({ type: 'copilot:delta', data: { messageId: 'm1', content: 'world' } });
    });

    expect(useAppStore.getState().streamingText).toBe('Hello world');
  });

  // --- copilot:message — turn content accumulation (Task 4.1) ---

  it('should push content to turnContentSegments on copilot:message', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:message', data: { messageId: 'm1', content: 'First segment' } });
    });

    expect(useAppStore.getState().turnContentSegments).toEqual(['First segment']);
    // Should NOT create a permanent message
    expect(useAppStore.getState().messages).toEqual([]);
  });

  it('should accumulate multiple copilot:message contents into turnContentSegments', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:message', data: { messageId: 'm1', content: 'First' } });
      emit({ type: 'copilot:message', data: { messageId: 'm2', content: 'Second' } });
    });

    expect(useAppStore.getState().turnContentSegments).toEqual(['First', 'Second']);
    expect(useAppStore.getState().messages).toEqual([]);
  });

  it('should ignore copilot:message with empty content (not push to segments)', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:message', data: { messageId: 'm1', content: '' } });
    });

    expect(useAppStore.getState().turnContentSegments).toEqual([]);
  });

  it('should ignore copilot:message with undefined content', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:message', data: { messageId: 'm1' } });
    });

    expect(useAppStore.getState().turnContentSegments).toEqual([]);
  });

  it('should clear streamingText after copilot:message', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:delta', data: { messageId: 'm1', content: 'Streaming...' } });
    });

    expect(useAppStore.getState().streamingText).toBe('Streaming...');

    act(() => {
      emit({ type: 'copilot:message', data: { messageId: 'm1', content: 'Final message' } });
    });

    expect(useAppStore.getState().streamingText).toBe('');
  });

  it('should set receivedMessageRef on copilot:message with non-empty content', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:message', data: { messageId: 'm1', content: 'Hello' } });
    });

    // After idle, should NOT use streamingText fallback since message was received
    act(() => {
      emit({ type: 'copilot:idle' });
    });

    const msgs = useAppStore.getState().messages.filter((m) => m.role === 'assistant');
    expect(msgs.length).toBe(1);
    expect(msgs[0].content).toBe('Hello');
  });

  // --- copilot:reasoning complete event fallback (Task 4.2) ---

  it('should use copilot:reasoning content as fallback when reasoningText is empty', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:reasoning', data: { content: 'Complete reasoning text' } });
    });

    expect(useAppStore.getState().reasoningText).toBe('Complete reasoning text');
  });

  it('should ignore copilot:reasoning when reasoningText already has content from deltas', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:reasoning_delta', data: { content: 'Delta reasoning' } });
    });

    expect(useAppStore.getState().reasoningText).toBe('Delta reasoning');

    act(() => {
      emit({ type: 'copilot:reasoning', data: { content: 'Complete reasoning that should be ignored' } });
    });

    // Should keep the delta-accumulated text, not overwrite
    expect(useAppStore.getState().reasoningText).toBe('Delta reasoning');
  });

  // --- copilot:idle — turn merge (Task 4.3) ---

  it('should merge turnContentSegments into a single message on copilot:idle', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:message', data: { messageId: 'm1', content: 'Part 1' } });
      emit({ type: 'copilot:message', data: { messageId: 'm2', content: 'Part 2' } });
    });

    act(() => {
      emit({ type: 'copilot:idle' });
    });

    const state = useAppStore.getState();
    const assistantMsgs = state.messages.filter((m) => m.role === 'assistant');
    expect(assistantMsgs.length).toBe(1);
    expect(assistantMsgs[0].content).toBe('Part 1\n\nPart 2');
  });

  it('should include toolRecords and reasoning in message metadata on copilot:idle', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      // Simulate a full turn: reasoning + tools + message
      emit({ type: 'copilot:reasoning_delta', data: { content: 'Thinking about it...' } });
      emit({ type: 'copilot:tool_start', data: { toolCallId: 'tc1', toolName: 'bash', arguments: { command: 'echo hi' } } });
      emit({ type: 'copilot:tool_end', data: { toolCallId: 'tc1', success: true, result: { content: 'hi' } } });
      emit({ type: 'copilot:message', data: { messageId: 'm1', content: 'Here is the result' } });
    });

    act(() => {
      emit({ type: 'copilot:idle' });
    });

    const state = useAppStore.getState();
    const msg = state.messages.find((m) => m.role === 'assistant');
    expect(msg).toBeTruthy();
    expect(msg!.content).toBe('Here is the result');

    const metadata = msg!.metadata as { toolRecords?: unknown[]; reasoning?: string };
    expect(metadata).toBeTruthy();
    expect(metadata.toolRecords).toHaveLength(1);
    expect(metadata.reasoning).toBe('Thinking about it...');
  });

  it('should NOT create message on copilot:idle when no content and no metadata', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:idle' });
    });

    const state = useAppStore.getState();
    expect(state.messages).toEqual([]);
  });

  it('should create message with metadata only (no text content) when tools were executed', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:tool_start', data: { toolCallId: 'tc1', toolName: 'report_intent', arguments: { intent: 'test' } } });
      emit({ type: 'copilot:tool_end', data: { toolCallId: 'tc1', success: true, result: { content: 'Intent logged' } } });
      // copilot:message with empty content (only toolRequests, no text)
      emit({ type: 'copilot:message', data: { messageId: 'm1', content: '' } });
    });

    act(() => {
      emit({ type: 'copilot:idle' });
    });

    const state = useAppStore.getState();
    const msg = state.messages.find((m) => m.role === 'assistant');
    expect(msg).toBeTruthy();
    expect(msg!.content).toBe('');
    const metadata = msg!.metadata as { toolRecords?: unknown[] };
    expect(metadata.toolRecords).toHaveLength(1);
  });

  it('should use streamingText as fallback on copilot:idle when no copilot:message received', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:delta', data: { messageId: 'm1', content: 'Streamed response' } });
    });

    act(() => {
      emit({ type: 'copilot:idle' });
    });

    const state = useAppStore.getState();
    const assistantMsg = state.messages.find((m) => m.role === 'assistant');
    expect(assistantMsg).toBeTruthy();
    expect(assistantMsg!.content).toBe('Streamed response');
  });

  it('should clear all streaming state on copilot:idle', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:delta', data: { messageId: 'm1', content: 'Some text' } });
      emit({ type: 'copilot:tool_start', data: { toolCallId: 'tc1', toolName: 'bash' } });
      emit({ type: 'copilot:reasoning_delta', data: { content: 'thinking' } });
      emit({ type: 'copilot:message', data: { messageId: 'm1', content: 'Final' } });
    });

    act(() => {
      emit({ type: 'copilot:idle' });
    });

    const state = useAppStore.getState();
    expect(state.isStreaming).toBe(false);
    expect(state.streamingText).toBe('');
    expect(state.toolRecords).toEqual([]);
    expect(state.reasoningText).toBe('');
    expect(state.turnContentSegments).toEqual([]);
  });

  it('should set metadata to null when no tools or reasoning exist', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:message', data: { messageId: 'm1', content: 'Simple reply' } });
    });

    act(() => {
      emit({ type: 'copilot:idle' });
    });

    const msg = useAppStore.getState().messages.find((m) => m.role === 'assistant');
    expect(msg).toBeTruthy();
    expect(msg!.metadata).toBeNull();
  });

  // --- copilot:error (unchanged) ---

  it('should set copilotError on copilot:error', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:error', data: { message: 'Rate limit' } });
    });

    expect(useAppStore.getState().copilotError).toBe('Rate limit');
    expect(useAppStore.getState().isStreaming).toBe(false);
  });

  // --- sendMessage (unchanged) ---

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
