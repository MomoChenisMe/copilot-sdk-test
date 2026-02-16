import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabCopilot } from '../../src/hooks/useTabCopilot';
import { useAppStore } from '../../src/store';
import type { WsMessage } from '../../src/lib/ws-types';

describe('useTabCopilot', () => {
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

    // Reset store with two open tabs
    useAppStore.setState({
      tabs: {},
      tabOrder: [],
      activeTabId: null,
      activeStreams: {},
      messages: [],
      streamingText: '',
      isStreaming: false,
      toolRecords: [],
      reasoningText: '',
      turnContentSegments: [],
      turnSegments: [],
      copilotError: null,
    });

    // Open two tabs
    useAppStore.getState().openTab('conv-A', 'Chat A');
    useAppStore.getState().openTab('conv-B', 'Chat B');
  });

  function emit(msg: WsMessage) {
    for (const l of listeners) l(msg);
  }

  // --- Event routing ---
  describe('event routing by conversationId', () => {
    it('should route copilot:delta to the correct tab', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:delta', data: { content: 'hello', conversationId: 'conv-A' } });
      });
      expect(useAppStore.getState().tabs['conv-A'].streamingText).toBe('hello');
      expect(useAppStore.getState().tabs['conv-B'].streamingText).toBe('');
    });

    it('should route copilot:delta to a different tab', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:delta', data: { content: 'world', conversationId: 'conv-B' } });
      });
      expect(useAppStore.getState().tabs['conv-A'].streamingText).toBe('');
      expect(useAppStore.getState().tabs['conv-B'].streamingText).toBe('world');
    });

    it('should route copilot:error to the correct tab', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:error', data: { message: 'fail', conversationId: 'conv-A' } });
      });
      expect(useAppStore.getState().tabs['conv-A'].copilotError).toBe('fail');
      expect(useAppStore.getState().tabs['conv-B'].copilotError).toBeNull();
    });
  });

  // --- Discard events for unknown tabs ---
  describe('discard events for unknown tabs', () => {
    it('should silently discard events with unknown conversationId', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:delta', data: { content: 'ghost', conversationId: 'conv-X' } });
      });
      // No tab should be affected
      expect(useAppStore.getState().tabs['conv-A'].streamingText).toBe('');
      expect(useAppStore.getState().tabs['conv-B'].streamingText).toBe('');
    });
  });

  // --- Global events ---
  describe('global event handling', () => {
    it('should handle copilot:active-streams as global event', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:active-streams', data: { streamIds: ['conv-A', 'conv-B'] } });
      });
      const streams = useAppStore.getState().activeStreams;
      expect(streams['conv-A']).toBe('running');
      expect(streams['conv-B']).toBe('running');
    });

    it('should handle copilot:stream-status as global event', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:stream-status', data: { conversationId: 'conv-A', subscribed: true } });
      });
      expect(useAppStore.getState().activeStreams['conv-A']).toBe('running');
    });
  });

  // --- Per-conversation dedup ---
  describe('per-conversation dedup', () => {
    it('should dedup messages by messageId per conversation', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:message', data: { content: 'msg1', messageId: 'mid-1', conversationId: 'conv-A' } });
        emit({ type: 'copilot:message', data: { content: 'msg1', messageId: 'mid-1', conversationId: 'conv-A' } });
      });
      // Should only have one turn content segment
      expect(useAppStore.getState().tabs['conv-A'].turnContentSegments).toHaveLength(1);
    });

    it('should allow same messageId across different conversations', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:message', data: { content: 'msg1', messageId: 'mid-1', conversationId: 'conv-A' } });
        emit({ type: 'copilot:message', data: { content: 'msg1', messageId: 'mid-1', conversationId: 'conv-B' } });
      });
      expect(useAppStore.getState().tabs['conv-A'].turnContentSegments).toHaveLength(1);
      expect(useAppStore.getState().tabs['conv-B'].turnContentSegments).toHaveLength(1);
    });

    it('should dedup tool_start by toolCallId per conversation', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:tool_start', data: { toolCallId: 'tc-1', toolName: 'test', conversationId: 'conv-A' } });
        emit({ type: 'copilot:tool_start', data: { toolCallId: 'tc-1', toolName: 'test', conversationId: 'conv-A' } });
      });
      expect(useAppStore.getState().tabs['conv-A'].toolRecords).toHaveLength(1);
    });
  });

  // --- copilot:idle integration ---
  describe('copilot:idle integration', () => {
    it('should consolidate streaming state into a message on idle', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:delta', data: { content: 'Hello ', conversationId: 'conv-A' } });
        emit({ type: 'copilot:delta', data: { content: 'World', conversationId: 'conv-A' } });
        emit({ type: 'copilot:message', data: { content: 'Hello World', messageId: 'mid-1', conversationId: 'conv-A' } });
        emit({ type: 'copilot:idle', data: { conversationId: 'conv-A' } });
      });
      const tabA = useAppStore.getState().tabs['conv-A'];
      expect(tabA.messages).toHaveLength(1);
      expect(tabA.messages[0].role).toBe('assistant');
      expect(tabA.messages[0].content).toBe('Hello World');
      // Streaming state should be cleared
      expect(tabA.streamingText).toBe('');
      expect(tabA.isStreaming).toBe(false);
    });

    it('should not affect other tabs on idle', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:delta', data: { content: 'A content', conversationId: 'conv-A' } });
        emit({ type: 'copilot:delta', data: { content: 'B content', conversationId: 'conv-B' } });
        emit({ type: 'copilot:idle', data: { conversationId: 'conv-A' } });
      });
      // Tab A cleared, Tab B still has streaming
      expect(useAppStore.getState().tabs['conv-A'].streamingText).toBe('');
      expect(useAppStore.getState().tabs['conv-B'].streamingText).toBe('B content');
    });
  });

  // --- sendMessage ---
  describe('sendMessage', () => {
    it('should send message to the specified tab conversationId', () => {
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        result.current.sendMessage('conv-A', 'hello');
      });
      expect(send).toHaveBeenCalledWith(expect.objectContaining({
        type: 'copilot:send',
        data: expect.objectContaining({ conversationId: 'conv-A', prompt: 'hello' }),
      }));
      // User message added to tab
      const tabA = useAppStore.getState().tabs['conv-A'];
      expect(tabA.messages).toHaveLength(1);
      expect(tabA.messages[0].role).toBe('user');
      expect(tabA.messages[0].content).toBe('hello');
    });

    it('should clear tab streaming state before sending', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      // Pre-fill some streaming state
      useAppStore.getState().appendTabStreamingText('conv-A', 'old');
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        result.current.sendMessage('conv-A', 'new message');
      });
      expect(useAppStore.getState().tabs['conv-A'].streamingText).toBe('');
      expect(useAppStore.getState().tabs['conv-A'].isStreaming).toBe(true);
    });
  });

  // --- Tab close dedup cleanup ---
  describe('Tab close dedup cleanup', () => {
    it('should not throw when receiving events after tab is closed', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      useAppStore.getState().closeTab('conv-A');
      // Events for closed tab should be silently discarded
      expect(() => {
        act(() => {
          emit({ type: 'copilot:delta', data: { content: 'orphan', conversationId: 'conv-A' } });
        });
      }).not.toThrow();
    });
  });
});
