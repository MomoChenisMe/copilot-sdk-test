import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabCopilot } from '../../src/hooks/useTabCopilot';
import { useAppStore } from '../../src/store';
import type { WsMessage } from '../../src/lib/ws-types';

// Mock conversationApi for auto-title tests
vi.mock('../../src/lib/api', () => ({
  conversationApi: {
    update: vi.fn().mockResolvedValue({}),
  },
}));
import { conversationApi } from '../../src/lib/api';

// Helper: open a tab and return its generated tabId
function openTabAndGetId(conversationId: string, title: string): string {
  useAppStore.getState().openTab(conversationId, title);
  const state = useAppStore.getState();
  return state.tabOrder[state.tabOrder.length - 1];
}

describe('useTabCopilot', () => {
  let listeners: ((msg: WsMessage) => void)[];
  let subscribe: (listener: (msg: WsMessage) => void) => () => void;
  let send: ReturnType<typeof vi.fn>;
  let tabIdA: string;
  let tabIdB: string;

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

    // Open two tabs — tabId is now an independent UUID
    tabIdA = openTabAndGetId('conv-A', 'Chat A');
    tabIdB = openTabAndGetId('conv-B', 'Chat B');
  });

  function emit(msg: WsMessage) {
    for (const l of listeners) l(msg);
  }

  // --- Event routing ---
  describe('event routing by conversationId (scans tabs)', () => {
    it('should route copilot:delta to the correct tab via conversationId scan', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:delta', data: { content: 'hello', conversationId: 'conv-A' } });
      });
      expect(useAppStore.getState().tabs[tabIdA].streamingText).toBe('hello');
      expect(useAppStore.getState().tabs[tabIdB].streamingText).toBe('');
    });

    it('should route copilot:delta to a different tab', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:delta', data: { content: 'world', conversationId: 'conv-B' } });
      });
      expect(useAppStore.getState().tabs[tabIdA].streamingText).toBe('');
      expect(useAppStore.getState().tabs[tabIdB].streamingText).toBe('world');
    });

    it('should route copilot:error to the correct tab', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:error', data: { message: 'fail', conversationId: 'conv-A' } });
      });
      expect(useAppStore.getState().tabs[tabIdA].copilotError).toBe('fail');
      expect(useAppStore.getState().tabs[tabIdB].copilotError).toBeNull();
    });
  });

  // --- Discard events for unknown tabs ---
  describe('discard events for unknown tabs', () => {
    it('should silently discard events with unknown conversationId', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:delta', data: { content: 'ghost', conversationId: 'conv-X' } });
      });
      expect(useAppStore.getState().tabs[tabIdA].streamingText).toBe('');
      expect(useAppStore.getState().tabs[tabIdB].streamingText).toBe('');
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
      expect(useAppStore.getState().tabs[tabIdA].turnContentSegments).toHaveLength(1);
    });

    it('should allow same messageId across different conversations', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:message', data: { content: 'msg1', messageId: 'mid-1', conversationId: 'conv-A' } });
        emit({ type: 'copilot:message', data: { content: 'msg1', messageId: 'mid-1', conversationId: 'conv-B' } });
      });
      expect(useAppStore.getState().tabs[tabIdA].turnContentSegments).toHaveLength(1);
      expect(useAppStore.getState().tabs[tabIdB].turnContentSegments).toHaveLength(1);
    });

    it('should dedup tool_start by toolCallId per conversation', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:tool_start', data: { toolCallId: 'tc-1', toolName: 'test', conversationId: 'conv-A' } });
        emit({ type: 'copilot:tool_start', data: { toolCallId: 'tc-1', toolName: 'test', conversationId: 'conv-A' } });
      });
      expect(useAppStore.getState().tabs[tabIdA].toolRecords).toHaveLength(1);
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
      const tabA = useAppStore.getState().tabs[tabIdA];
      expect(tabA.messages).toHaveLength(1);
      expect(tabA.messages[0].role).toBe('assistant');
      expect(tabA.messages[0].content).toBe('Hello World');
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
      expect(useAppStore.getState().tabs[tabIdA].streamingText).toBe('');
      expect(useAppStore.getState().tabs[tabIdB].streamingText).toBe('B content');
    });
  });

  // --- sendMessage (now takes tabId, resolves conversationId internally) ---
  describe('sendMessage', () => {
    it('should send message using tabId, resolving conversationId from tab state', () => {
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        result.current.sendMessage(tabIdA, 'hello');
      });
      expect(send).toHaveBeenCalledWith(expect.objectContaining({
        type: 'copilot:send',
        data: expect.objectContaining({ conversationId: 'conv-A', prompt: 'hello' }),
      }));
      // User message added to tab (keyed by tabId)
      const tabA = useAppStore.getState().tabs[tabIdA];
      expect(tabA.messages).toHaveLength(1);
      expect(tabA.messages[0].role).toBe('user');
      expect(tabA.messages[0].content).toBe('hello');
    });

    it('should clear tab streaming state before sending', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      useAppStore.getState().appendTabStreamingText(tabIdA, 'old');
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        result.current.sendMessage(tabIdA, 'new message');
      });
      expect(useAppStore.getState().tabs[tabIdA].streamingText).toBe('');
      expect(useAppStore.getState().tabs[tabIdA].isStreaming).toBe(true);
    });

    it('should not throw when called with non-existent tabId', () => {
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      expect(() => {
        act(() => {
          result.current.sendMessage('non-existent-tab', 'hello');
        });
      }).not.toThrow();
      expect(send).not.toHaveBeenCalled();
    });
  });

  // --- Conversation auto-title ---
  describe('conversation auto-title', () => {
    beforeEach(() => {
      vi.mocked(conversationApi.update).mockClear();
    });

    it('should auto-title conversation from first message (truncated to 50 chars)', () => {
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      const longMessage = 'A'.repeat(80);
      act(() => {
        result.current.sendMessage(tabIdA, longMessage);
      });
      expect(conversationApi.update).toHaveBeenCalledWith('conv-A', { title: 'A'.repeat(50) });
      // Tab title should also be updated
      expect(useAppStore.getState().tabs[tabIdA].title).toBe('A'.repeat(50));
    });

    it('should auto-title with full text when under 50 chars', () => {
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        result.current.sendMessage(tabIdA, 'Hello World');
      });
      expect(conversationApi.update).toHaveBeenCalledWith('conv-A', { title: 'Hello World' });
      expect(useAppStore.getState().tabs[tabIdA].title).toBe('Hello World');
    });

    it('should NOT auto-title on second message', () => {
      // Pre-populate tab with one message
      useAppStore.getState().addTabMessage(tabIdA, {
        id: 'existing-1',
        conversationId: 'conv-A',
        role: 'user',
        content: 'first message',
        metadata: null,
        createdAt: new Date().toISOString(),
      });
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        result.current.sendMessage(tabIdA, 'second message');
      });
      expect(conversationApi.update).not.toHaveBeenCalled();
    });

    it('should fallback to "New Chat" when first message is whitespace-only', () => {
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        result.current.sendMessage(tabIdA, '   ');
      });
      expect(conversationApi.update).toHaveBeenCalledWith('conv-A', { title: 'New Chat' });
    });
  });

  // --- Attachment metadata in user messages ---
  describe('attachment metadata', () => {
    it('should include attachments in user message metadata when files are provided', () => {
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      const files = [
        { id: 'f1', originalName: 'photo.png', mimeType: 'image/png', size: 1024, path: '/uploads/f1-photo.png' },
        { id: 'f2', originalName: 'doc.pdf', mimeType: 'application/pdf', size: 2048, path: '/uploads/f2-doc.pdf' },
      ];
      act(() => {
        result.current.sendMessage(tabIdA, 'See attached', files);
      });
      const msg = useAppStore.getState().tabs[tabIdA].messages[0];
      expect(msg.role).toBe('user');
      expect((msg.metadata as any).attachments).toEqual([
        { id: 'f1', originalName: 'photo.png', mimeType: 'image/png', size: 1024 },
        { id: 'f2', originalName: 'doc.pdf', mimeType: 'application/pdf', size: 2048 },
      ]);
    });

    it('should NOT include attachments in metadata when no files are provided', () => {
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        result.current.sendMessage(tabIdA, 'no files');
      });
      const msg = useAppStore.getState().tabs[tabIdA].messages[0];
      expect(msg.metadata).toBeNull();
    });
  });

  // --- Usage tracking ---
  describe('usage tracking events', () => {
    it('should accumulate tokens on copilot:usage', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:usage', data: { inputTokens: 100, outputTokens: 50, conversationId: 'conv-A' } });
        emit({ type: 'copilot:usage', data: { inputTokens: 200, outputTokens: 80, conversationId: 'conv-A' } });
      });
      const tab = useAppStore.getState().tabs[tabIdA];
      expect(tab.usage.inputTokens).toBe(300);
      expect(tab.usage.outputTokens).toBe(130);
    });

    it('should update context window on copilot:context_window', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:context_window', data: { contextWindowUsed: 50000, contextWindowMax: 128000, conversationId: 'conv-A' } });
      });
      const tab = useAppStore.getState().tabs[tabIdA];
      expect(tab.usage.contextWindowUsed).toBe(50000);
      expect(tab.usage.contextWindowMax).toBe(128000);
    });

    it('should route usage events to the correct tab', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:usage', data: { inputTokens: 100, outputTokens: 50, conversationId: 'conv-B' } });
      });
      expect(useAppStore.getState().tabs[tabIdA].usage.inputTokens).toBe(0);
      expect(useAppStore.getState().tabs[tabIdB].usage.inputTokens).toBe(100);
    });
  });

  // --- Tab close dedup cleanup ---
  describe('Tab close dedup cleanup', () => {
    it('should not throw when receiving events after tab is closed', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      useAppStore.getState().closeTab(tabIdA);
      expect(() => {
        act(() => {
          emit({ type: 'copilot:delta', data: { content: 'orphan', conversationId: 'conv-A' } });
        });
      }).not.toThrow();
    });
  });
});
