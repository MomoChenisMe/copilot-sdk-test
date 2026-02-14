import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../src/store/index';
import type { ToolRecord } from '../../src/store/index';
import type { TurnSegment } from '../../src/lib/api';

describe('Store: ToolRecord re-export', () => {
  it('should re-export ToolRecord type from api.ts (compile-time check)', () => {
    // If this file compiles, the re-export works.
    const record: ToolRecord = {
      toolCallId: 'c1',
      toolName: 'bash',
      status: 'running',
    };
    expect(record.toolCallId).toBe('c1');
  });
});

describe('Store: addMessage dedup', () => {
  beforeEach(() => {
    useAppStore.setState({ messages: [] });
  });

  it('should add a new message', () => {
    useAppStore.getState().addMessage({
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'assistant',
      content: 'Hello',
      metadata: null,
      createdAt: new Date().toISOString(),
    });
    expect(useAppStore.getState().messages).toHaveLength(1);
  });

  it('should ignore duplicate message with the same id', () => {
    const msg = {
      id: 'msg-dup',
      conversationId: 'conv-1',
      role: 'assistant' as const,
      content: 'Hello',
      metadata: null,
      createdAt: new Date().toISOString(),
    };

    useAppStore.getState().addMessage(msg);
    useAppStore.getState().addMessage(msg);
    useAppStore.getState().addMessage({ ...msg, content: 'Different content same id' });

    expect(useAppStore.getState().messages).toHaveLength(1);
    expect(useAppStore.getState().messages[0].content).toBe('Hello');
  });

  it('should allow messages with different ids', () => {
    useAppStore.getState().addMessage({
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'assistant',
      content: 'First',
      metadata: null,
      createdAt: new Date().toISOString(),
    });
    useAppStore.getState().addMessage({
      id: 'msg-2',
      conversationId: 'conv-1',
      role: 'assistant',
      content: 'Second',
      metadata: null,
      createdAt: new Date().toISOString(),
    });

    expect(useAppStore.getState().messages).toHaveLength(2);
  });
});

describe('Store: turnContentSegments', () => {
  beforeEach(() => {
    useAppStore.setState({
      messages: [],
      streamingText: '',
      isStreaming: false,
      toolRecords: [],
      reasoningText: '',
      copilotError: null,
      turnContentSegments: [],
    });
  });

  it('should have empty turnContentSegments initially', () => {
    const { turnContentSegments } = useAppStore.getState();
    expect(turnContentSegments).toEqual([]);
  });

  it('should accumulate content via addTurnContentSegment', () => {
    const { addTurnContentSegment } = useAppStore.getState();

    addTurnContentSegment('First segment');
    expect(useAppStore.getState().turnContentSegments).toEqual(['First segment']);

    addTurnContentSegment('Second segment');
    expect(useAppStore.getState().turnContentSegments).toEqual(['First segment', 'Second segment']);
  });

  it('should clear turnContentSegments when clearStreaming is called', () => {
    const store = useAppStore.getState();
    store.addTurnContentSegment('Some content');
    expect(useAppStore.getState().turnContentSegments).toHaveLength(1);

    store.clearStreaming();

    const state = useAppStore.getState();
    expect(state.turnContentSegments).toEqual([]);
    expect(state.streamingText).toBe('');
    expect(state.isStreaming).toBe(false);
    expect(state.toolRecords).toEqual([]);
    expect(state.reasoningText).toBe('');
    expect(state.copilotError).toBeNull();
  });

  it('should reset turnContentSegments when setActiveConversationId is called', () => {
    const store = useAppStore.getState();
    store.addTurnContentSegment('Content from previous conversation');
    expect(useAppStore.getState().turnContentSegments).toHaveLength(1);

    store.setActiveConversationId('new-conv-id');

    const state = useAppStore.getState();
    expect(state.turnContentSegments).toEqual([]);
    expect(state.activeConversationId).toBe('new-conv-id');
  });

  it('should reset turnContentSegments when setActiveConversationId is called with null', () => {
    const store = useAppStore.getState();
    store.addTurnContentSegment('Some content');

    store.setActiveConversationId(null);

    expect(useAppStore.getState().turnContentSegments).toEqual([]);
    expect(useAppStore.getState().activeConversationId).toBeNull();
  });
});

describe('Store: turnSegments', () => {
  beforeEach(() => {
    useAppStore.setState({
      turnSegments: [],
      streamingText: '',
      isStreaming: false,
      toolRecords: [],
      reasoningText: '',
      copilotError: null,
      turnContentSegments: [],
    });
  });

  it('should have empty turnSegments initially', () => {
    expect(useAppStore.getState().turnSegments).toEqual([]);
  });

  it('should add a text turn segment', () => {
    useAppStore.getState().addTurnSegment({ type: 'text', content: 'Hello' });
    expect(useAppStore.getState().turnSegments).toHaveLength(1);
    expect(useAppStore.getState().turnSegments[0]).toEqual({ type: 'text', content: 'Hello' });
  });

  it('should add a tool turn segment', () => {
    useAppStore.getState().addTurnSegment({
      type: 'tool',
      toolCallId: 'tc-1',
      toolName: 'bash',
      status: 'running',
    });
    const segs = useAppStore.getState().turnSegments;
    expect(segs).toHaveLength(1);
    expect(segs[0].type).toBe('tool');
  });

  it('should add a reasoning turn segment', () => {
    useAppStore.getState().addTurnSegment({ type: 'reasoning', content: 'Thinking...' });
    const segs = useAppStore.getState().turnSegments;
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual({ type: 'reasoning', content: 'Thinking...' });
  });

  it('should update tool segment by toolCallId', () => {
    useAppStore.getState().addTurnSegment({
      type: 'tool',
      toolCallId: 'tc-1',
      toolName: 'bash',
      status: 'running',
    });
    useAppStore.getState().updateToolInTurnSegments('tc-1', { status: 'success', result: 'output' });

    const seg = useAppStore.getState().turnSegments[0] as TurnSegment & { type: 'tool' };
    expect(seg.status).toBe('success');
    expect(seg.result).toBe('output');
  });

  it('should not modify non-matching segments when updating', () => {
    useAppStore.getState().addTurnSegment({ type: 'text', content: 'Hello' });
    useAppStore.getState().addTurnSegment({
      type: 'tool',
      toolCallId: 'tc-1',
      toolName: 'bash',
      status: 'running',
    });
    useAppStore.getState().updateToolInTurnSegments('tc-1', { status: 'error', error: 'fail' });

    const segs = useAppStore.getState().turnSegments;
    expect(segs[0]).toEqual({ type: 'text', content: 'Hello' });
    expect((segs[1] as any).status).toBe('error');
  });

  it('should clear turnSegments on clearStreaming', () => {
    useAppStore.getState().addTurnSegment({ type: 'text', content: 'Hello' });
    useAppStore.getState().clearStreaming();
    expect(useAppStore.getState().turnSegments).toEqual([]);
  });

  it('should clear turnSegments on setActiveConversationId', () => {
    useAppStore.getState().addTurnSegment({ type: 'text', content: 'Hello' });
    useAppStore.getState().setActiveConversationId('new-conv');
    expect(useAppStore.getState().turnSegments).toEqual([]);
  });
});
