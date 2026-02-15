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
      turnSegments: [],
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
      emit({ type: 'copilot:reasoning', data: { content: 'Thinking about it...' } });
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

    const metadata = msg!.metadata as { toolRecords?: unknown[]; reasoning?: string; turnSegments?: any[] };
    expect(metadata).toBeTruthy();
    expect(metadata.toolRecords).toHaveLength(1);
    expect(metadata.reasoning).toBe('Thinking about it...');
    // turnSegments should include reasoning + tool + text = 3 segments
    expect(metadata.turnSegments).toBeTruthy();
    expect(metadata.turnSegments!.length).toBeGreaterThanOrEqual(3);
    expect(metadata.turnSegments![0].type).toBe('reasoning');
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

  it('should only have turnSegments in metadata when no tools or reasoning exist', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:message', data: { messageId: 'm1', content: 'Simple reply' } });
    });

    act(() => {
      emit({ type: 'copilot:idle' });
    });

    const msg = useAppStore.getState().messages.find((m) => m.role === 'assistant');
    expect(msg).toBeTruthy();
    const meta = msg!.metadata as any;
    expect(meta).toBeTruthy();
    expect(meta.turnSegments).toHaveLength(1);
    expect(meta.toolRecords).toBeUndefined();
    expect(meta.reasoning).toBeUndefined();
  });

  // --- turnSegments accumulation ---

  it('should push text turn segment on copilot:message', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:message', data: { messageId: 'm1', content: 'Hello' } });
    });

    const segs = useAppStore.getState().turnSegments;
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual({ type: 'text', content: 'Hello' });
  });

  it('should push tool turn segment on copilot:tool_start', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:tool_start', data: { toolCallId: 'tc-1', toolName: 'bash', arguments: { cmd: 'ls' } } });
    });

    const segs = useAppStore.getState().turnSegments;
    expect(segs).toHaveLength(1);
    expect(segs[0].type).toBe('tool');
    expect((segs[0] as any).toolCallId).toBe('tc-1');
    expect((segs[0] as any).status).toBe('running');
  });

  it('should update tool turn segment on copilot:tool_end', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:tool_start', data: { toolCallId: 'tc-1', toolName: 'bash' } });
      emit({ type: 'copilot:tool_end', data: { toolCallId: 'tc-1', success: true, result: 'output' } });
    });

    const segs = useAppStore.getState().turnSegments;
    expect(segs).toHaveLength(1);
    expect((segs[0] as any).status).toBe('success');
    expect((segs[0] as any).result).toBe('output');
  });

  it('should push reasoning turn segment on copilot:reasoning (no prior deltas)', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:reasoning', data: { content: 'Thinking...' } });
    });

    const segs = useAppStore.getState().turnSegments;
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual({ type: 'reasoning', content: 'Thinking...' });
  });

  it('should add reasoning to turnSegments on copilot:reasoning after deltas', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:reasoning_delta', data: { content: 'Let me ' } });
      emit({ type: 'copilot:reasoning_delta', data: { content: 'think...' } });
      emit({ type: 'copilot:reasoning', data: { content: 'Let me think...' } });
    });

    const state = useAppStore.getState();
    // reasoningText should be from deltas
    expect(state.reasoningText).toBe('Let me think...');
    // turnSegments should have a reasoning entry with accumulated text
    const reasoningSegs = state.turnSegments.filter((s) => s.type === 'reasoning');
    expect(reasoningSegs).toHaveLength(1);
    expect(reasoningSegs[0].content).toBe('Let me think...');
  });

  it('should include turnSegments in idle metadata', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:message', data: { messageId: 'm1', content: 'Hello' } });
      emit({ type: 'copilot:tool_start', data: { toolCallId: 'tc-1', toolName: 'bash' } });
      emit({ type: 'copilot:tool_end', data: { toolCallId: 'tc-1', success: true, result: 'ok' } });
      emit({ type: 'copilot:message', data: { messageId: 'm2', content: 'Done' } });
    });

    act(() => {
      emit({ type: 'copilot:idle' });
    });

    const msg = useAppStore.getState().messages.find((m) => m.role === 'assistant');
    expect(msg).toBeTruthy();
    const meta = msg!.metadata as any;
    expect(meta.turnSegments).toBeTruthy();
    expect(meta.turnSegments).toHaveLength(3); // text, tool, text
    expect(meta.turnSegments[0].type).toBe('text');
    expect(meta.turnSegments[1].type).toBe('tool');
    expect(meta.turnSegments[2].type).toBe('text');
  });

  it('should clear turnSegments on copilot:idle', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:message', data: { messageId: 'm1', content: 'Hello' } });
      emit({ type: 'copilot:idle' });
    });

    expect(useAppStore.getState().turnSegments).toEqual([]);
  });

  // --- messageId dedup ---

  it('should skip duplicate copilot:message with same messageId', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:message', data: { messageId: 'msg-1', content: 'Hello' } });
      emit({ type: 'copilot:message', data: { messageId: 'msg-1', content: 'Hello' } });
    });

    expect(useAppStore.getState().turnContentSegments).toEqual(['Hello']);
    expect(useAppStore.getState().turnSegments).toHaveLength(1);
  });

  it('should allow copilot:message with undefined messageId (no dedup)', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    act(() => {
      emit({ type: 'copilot:message', data: { content: 'First' } });
      emit({ type: 'copilot:message', data: { content: 'Second' } });
    });

    expect(useAppStore.getState().turnContentSegments).toEqual(['First', 'Second']);
  });

  it('should filter replayed messages across turns using persistent dedup', () => {
    renderHook(() => useCopilot({ subscribe, send }));

    // Turn 1: send messageId 'A'
    act(() => {
      emit({ type: 'copilot:message', data: { messageId: 'A', content: 'Turn 1' } });
      emit({ type: 'copilot:idle' });
    });

    const turn1Msgs = useAppStore.getState().messages.filter((m) => m.role === 'assistant');
    expect(turn1Msgs).toHaveLength(1);
    expect(turn1Msgs[0].content).toBe('Turn 1');

    // Turn 2: replayed messageId 'A' should be SKIPPED (persistent dedup)
    // New messageId 'B' should pass through
    act(() => {
      emit({ type: 'copilot:message', data: { messageId: 'A', content: 'Turn 1' } }); // replay — filtered
      emit({ type: 'copilot:message', data: { messageId: 'B', content: 'Turn 2' } }); // new — passes
      emit({ type: 'copilot:idle' });
    });

    const turn2Msgs = useAppStore.getState().messages.filter((m) => m.role === 'assistant');
    expect(turn2Msgs).toHaveLength(2);
    expect(turn2Msgs[1].content).toBe('Turn 2');
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
