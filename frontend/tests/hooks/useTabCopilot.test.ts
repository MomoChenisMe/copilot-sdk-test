import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabCopilot } from '../../src/hooks/useTabCopilot';
import { useAppStore } from '../../src/store';
import type { WsMessage } from '../../src/lib/ws-types';

// Mock conversationApi for auto-title tests and DB-as-Source-of-Truth idle handler
vi.mock('../../src/lib/api', () => ({
  conversationApi: {
    update: vi.fn().mockResolvedValue({}),
    getMessages: vi.fn().mockResolvedValue([]),
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

    // Clear mocks
    vi.mocked(conversationApi.getMessages).mockClear();
    vi.mocked(conversationApi.getMessages).mockResolvedValue([]);

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
    it('should consolidate streaming state into a message on idle', async () => {
      // DB-as-Source-of-Truth: idle handler fetches messages from DB
      vi.mocked(conversationApi.getMessages).mockResolvedValueOnce([
        { id: 'db-msg-1', conversationId: 'conv-A', role: 'assistant', content: 'Hello World', metadata: null, createdAt: new Date().toISOString() },
      ]);
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:delta', data: { content: 'Hello ', conversationId: 'conv-A' } });
        emit({ type: 'copilot:delta', data: { content: 'World', conversationId: 'conv-A' } });
        emit({ type: 'copilot:message', data: { content: 'Hello World', messageId: 'mid-1', conversationId: 'conv-A' } });
      });
      await act(async () => {
        emit({ type: 'copilot:idle', data: { conversationId: 'conv-A' } });
      });
      const tabA = useAppStore.getState().tabs[tabIdA];
      expect(tabA.messages).toHaveLength(1);
      expect(tabA.messages[0].role).toBe('assistant');
      expect(tabA.messages[0].content).toBe('Hello World');
      expect(tabA.streamingText).toBe('');
      expect(tabA.isStreaming).toBe(false);
    });

    it('should not affect other tabs on idle', async () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:delta', data: { content: 'A content', conversationId: 'conv-A' } });
        emit({ type: 'copilot:delta', data: { content: 'B content', conversationId: 'conv-B' } });
      });
      await act(async () => {
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

    it('should include messageId in copilot:send payload matching the optimistic user message id', () => {
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        result.current.sendMessage(tabIdA, 'hello');
      });
      const tabA = useAppStore.getState().tabs[tabIdA];
      const optimisticMsgId = tabA.messages[0].id;
      expect(optimisticMsgId).toBeTruthy();
      expect(send).toHaveBeenCalledWith(expect.objectContaining({
        type: 'copilot:send',
        data: expect.objectContaining({ messageId: optimisticMsgId }),
      }));
    });

    it('should not throw when called with non-existent tabId', () => {
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      send.mockClear();
      expect(() => {
        act(() => {
          result.current.sendMessage('non-existent-tab', 'hello');
        });
      }).not.toThrow();
      // Should not have sent copilot:send
      const sendCalls = send.mock.calls.filter((c: any[]) => (c[0] as WsMessage).type === 'copilot:send');
      expect(sendCalls).toHaveLength(0);
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

  // --- Plan mode ---
  describe('plan mode', () => {
    it('should include mode=plan in copilot:send when tab.planMode is true', () => {
      useAppStore.getState().setTabPlanMode(tabIdA, true);
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        result.current.sendMessage(tabIdA, 'plan this');
      });
      expect(send).toHaveBeenCalledWith(expect.objectContaining({
        type: 'copilot:send',
        data: expect.objectContaining({ mode: 'plan' }),
      }));
    });

    it('should not include mode when tab.planMode is false', () => {
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        result.current.sendMessage(tabIdA, 'act on this');
      });
      // Find the copilot:send call
      const sendCall = send.mock.calls.find((c: any[]) => (c[0] as WsMessage).type === 'copilot:send');
      expect(sendCall).toBeDefined();
      const sentData = (sendCall![0] as WsMessage).data as Record<string, unknown>;
      expect(sentData.mode).toBeUndefined();
    });

    it('should update tab planMode on copilot:mode_changed event', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({ type: 'copilot:mode_changed', data: { mode: 'plan', conversationId: 'conv-A' } });
      });
      expect(useAppStore.getState().tabs[tabIdA].planMode).toBe(true);

      act(() => {
        emit({ type: 'copilot:mode_changed', data: { mode: 'autopilot', conversationId: 'conv-A' } });
      });
      expect(useAppStore.getState().tabs[tabIdA].planMode).toBe(false);
    });

    it('should show plan complete prompt when idle fires in plan mode', async () => {
      useAppStore.getState().setTabPlanMode(tabIdA, true);
      useAppStore.getState().setTabIsStreaming(tabIdA, true);
      useAppStore.getState().updateStreamStatus('conv-A', 'running');
      renderHook(() => useTabCopilot({ subscribe, send }));
      await act(async () => {
        emit({ type: 'copilot:idle', data: { conversationId: 'conv-A' } });
      });
      expect(useAppStore.getState().tabs[tabIdA].showPlanCompletePrompt).toBe(true);
    });

    it('should extract planContent from copilot:idle event data', async () => {
      useAppStore.getState().setTabPlanMode(tabIdA, true);
      useAppStore.getState().setTabIsStreaming(tabIdA, true);
      useAppStore.getState().updateStreamStatus('conv-A', 'running');
      renderHook(() => useTabCopilot({ subscribe, send }));
      await act(async () => {
        emit({ type: 'copilot:idle', data: { conversationId: 'conv-A', planContent: '# Plan content\nStep 1: Refactor DB' } });
      });
      expect(useAppStore.getState().tabs[tabIdA].planContent).toBe('# Plan content\nStep 1: Refactor DB');
    });

    it('should not set planContent when idle event has no planContent', async () => {
      useAppStore.getState().setTabIsStreaming(tabIdA, true);
      useAppStore.getState().updateStreamStatus('conv-A', 'running');
      renderHook(() => useTabCopilot({ subscribe, send }));
      await act(async () => {
        emit({ type: 'copilot:idle', data: { conversationId: 'conv-A' } });
      });
      expect(useAppStore.getState().tabs[tabIdA].planContent).toBeNull();
    });

    it('should create plan artifact and open panel when planArtifact is present in idle event', async () => {
      useAppStore.getState().setTabPlanMode(tabIdA, true);
      useAppStore.getState().setTabIsStreaming(tabIdA, true);
      useAppStore.getState().updateStreamStatus('conv-A', 'running');
      renderHook(() => useTabCopilot({ subscribe, send }));
      await act(async () => {
        emit({
          type: 'copilot:idle',
          data: {
            conversationId: 'conv-A',
            planContent: '# Plan content',
            planArtifact: {
              title: 'My Plan',
              content: '# Plan\n\nStep 1',
              filePath: '/tmp/plan.md',
            },
          },
        });
      });
      const tab = useAppStore.getState().tabs[tabIdA];
      expect(tab.artifacts.length).toBe(1);
      expect(tab.artifacts[0].type).toBe('plan');
      expect(tab.artifacts[0].title).toBe('My Plan');
      expect(tab.artifacts[0].content).toBe('# Plan\n\nStep 1');
      expect(tab.activeArtifactId).toBe(tab.artifacts[0].id);
      expect(tab.artifactsPanelOpen).toBe(true);
    });

    it('should use stable plan artifact ID (no timestamp) so updates replace the existing artifact', async () => {
      useAppStore.getState().setTabPlanMode(tabIdA, true);
      useAppStore.getState().setTabIsStreaming(tabIdA, true);
      useAppStore.getState().updateStreamStatus('conv-A', 'running');
      renderHook(() => useTabCopilot({ subscribe, send }));

      // First plan
      await act(async () => {
        emit({
          type: 'copilot:idle',
          data: {
            conversationId: 'conv-A',
            planContent: '# Plan content',
            planArtifact: { title: 'Old Plan', content: '# Old\n\nContent', filePath: '/tmp/plan.md' },
          },
        });
      });
      expect(useAppStore.getState().tabs[tabIdA].artifacts.length).toBe(1);

      // Re-enable streaming for second idle
      useAppStore.getState().setTabIsStreaming(tabIdA, true);
      useAppStore.getState().updateStreamStatus('conv-A', 'running');

      // Second plan (same conversation) — should REPLACE, not add
      await act(async () => {
        emit({
          type: 'copilot:idle',
          data: {
            conversationId: 'conv-A',
            planContent: '# Updated plan content',
            planArtifact: { title: 'New Plan', content: '# New\n\nBetter content', filePath: '/tmp/plan2.md' },
          },
        });
      });
      const tab = useAppStore.getState().tabs[tabIdA];
      expect(tab.artifacts.length).toBe(1); // Still 1, not 2
      expect(tab.artifacts[0].title).toBe('New Plan');
      expect(tab.artifacts[0].content).toBe('# New\n\nBetter content');
    });

    it('should not create plan artifact when planArtifact is absent from idle event', async () => {
      useAppStore.getState().setTabIsStreaming(tabIdA, true);
      useAppStore.getState().updateStreamStatus('conv-A', 'running');
      renderHook(() => useTabCopilot({ subscribe, send }));
      await act(async () => {
        emit({ type: 'copilot:idle', data: { conversationId: 'conv-A' } });
      });
      const tab = useAppStore.getState().tabs[tabIdA];
      expect(tab.artifacts.length).toBe(0);
      expect(tab.artifactsPanelOpen).toBe(false);
    });

    it('should not show plan complete prompt when idle fires in autopilot mode', async () => {
      // planMode defaults to false
      useAppStore.getState().setTabIsStreaming(tabIdA, true);
      useAppStore.getState().updateStreamStatus('conv-A', 'running');
      renderHook(() => useTabCopilot({ subscribe, send }));
      await act(async () => {
        emit({ type: 'copilot:idle', data: { conversationId: 'conv-A' } });
      });
      expect(useAppStore.getState().tabs[tabIdA].showPlanCompletePrompt).toBe(false);
    });

    it('should handle copilot:plan_execution_started by switching tab conversation', () => {
      useAppStore.getState().setTabPlanMode(tabIdA, true);
      useAppStore.getState().setTabShowPlanCompletePrompt(tabIdA, true);
      useAppStore.getState().setTabPlanContent(tabIdA, 'some plan');

      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({
          type: 'copilot:plan_execution_started',
          data: {
            oldConversationId: 'conv-A',
            newConversationId: 'conv-new',
            title: 'Execute: My Plan',
          },
        });
      });

      const tab = useAppStore.getState().tabs[tabIdA];
      expect(tab.conversationId).toBe('conv-new');
      expect(tab.planMode).toBe(false);
      expect(tab.showPlanCompletePrompt).toBe(false);
      expect(tab.planContent).toBe('');
    });
  });

  // --- Locale ---
  describe('locale', () => {
    it('should include locale in copilot:send payload', () => {
      useAppStore.setState({ language: 'zh-TW' });
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        result.current.sendMessage(tabIdA, 'hello');
      });
      expect(send).toHaveBeenCalledWith(expect.objectContaining({
        type: 'copilot:send',
        data: expect.objectContaining({ locale: 'zh-TW' }),
      }));
    });

    it('should default locale to en when language is en', () => {
      useAppStore.setState({ language: 'en' });
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        result.current.sendMessage(tabIdA, 'hello');
      });
      expect(send).toHaveBeenCalledWith(expect.objectContaining({
        type: 'copilot:send',
        data: expect.objectContaining({ locale: 'en' }),
      }));
    });
  });

  // --- User input request ---
  describe('user input request', () => {
    it('should set userInputRequest on tab when copilot:user_input_request arrives', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({
          type: 'copilot:user_input_request',
          data: {
            requestId: 'req-1',
            question: 'Which approach?',
            choices: ['A', 'B'],
            allowFreeform: true,
            conversationId: 'conv-A',
          },
        });
      });
      const tab = useAppStore.getState().tabs[tabIdA];
      expect(tab.userInputRequest).toEqual({
        requestId: 'req-1',
        question: 'Which approach?',
        choices: ['A', 'B'],
        allowFreeform: true,
      });
    });

    it('sendUserInputResponse should send copilot:user_input_response via WS', () => {
      const { result } = renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        result.current.sendUserInputResponse('conv-A', 'req-1', 'Option A', false);
      });
      expect(send).toHaveBeenCalledWith({
        type: 'copilot:user_input_response',
        data: { conversationId: 'conv-A', requestId: 'req-1', answer: 'Option A', wasFreeform: false },
      });
    });

    it('should set userInputRequest with timedOut=true on copilot:user_input_timeout', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({
          type: 'copilot:user_input_timeout',
          data: {
            requestId: 'req-2',
            question: 'Which approach?',
            choices: ['A', 'B'],
            allowFreeform: true,
            conversationId: 'conv-A',
          },
        });
      });
      const tab = useAppStore.getState().tabs[tabIdA];
      expect(tab.userInputRequest).toEqual({
        requestId: 'req-2',
        question: 'Which approach?',
        choices: ['A', 'B'],
        allowFreeform: true,
        timedOut: true,
      });
    });
  });

  // --- copilot:todos_updated event ---
  describe('copilot:todos_updated event', () => {
    it('should set tab tasks from todos_updated event', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({
          type: 'copilot:todos_updated',
          data: {
            conversationId: 'conv-A',
            todos: [
              { id: 't1', title: 'Fix bug', description: 'some desc', status: 'done', created_at: '2025-01-01', updated_at: '2025-01-02' },
              { id: 't2', title: 'Add feature', description: null, status: 'in_progress', created_at: '2025-01-01', updated_at: '2025-01-01' },
            ],
          },
        });
      });
      const tasks = useAppStore.getState().tabs[tabIdA].tasks;
      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toEqual({ id: 't1', title: 'Fix bug', description: 'some desc', status: 'done', created_at: '2025-01-01', updated_at: '2025-01-02' });
      expect(tasks[1]).toEqual({ id: 't2', title: 'Add feature', description: null, status: 'in_progress', created_at: '2025-01-01', updated_at: '2025-01-01' });
    });

    it('should replace existing tasks on subsequent todos_updated events', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({
          type: 'copilot:todos_updated',
          data: {
            conversationId: 'conv-A',
            todos: [
              { id: 't1', title: 'Step 1', description: null, status: 'pending', created_at: '2025-01-01', updated_at: '2025-01-01' },
            ],
          },
        });
      });
      expect(useAppStore.getState().tabs[tabIdA].tasks).toHaveLength(1);

      act(() => {
        emit({
          type: 'copilot:todos_updated',
          data: {
            conversationId: 'conv-A',
            todos: [
              { id: 't1', title: 'Step 1', description: null, status: 'done', created_at: '2025-01-01', updated_at: '2025-01-02' },
              { id: 't2', title: 'Step 2', description: null, status: 'blocked', created_at: '2025-01-02', updated_at: '2025-01-02' },
            ],
          },
        });
      });
      const tasks = useAppStore.getState().tabs[tabIdA].tasks;
      expect(tasks).toHaveLength(2);
      expect(tasks[0].status).toBe('done');
      expect(tasks[1].status).toBe('blocked');
    });

    it('should handle empty todos array', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({
          type: 'copilot:todos_updated',
          data: { conversationId: 'conv-A', todos: [] },
        });
      });
      expect(useAppStore.getState().tabs[tabIdA].tasks).toHaveLength(0);
    });
  });

  // --- Reconnection state recovery ---
  describe('reconnection state recovery', () => {
    it('should send copilot:query_state when status becomes connected', () => {
      const { rerender } = renderHook(
        ({ status }) => useTabCopilot({ subscribe, send, status }),
        { initialProps: { status: 'disconnected' as const } },
      );
      expect(send).not.toHaveBeenCalledWith({ type: 'copilot:query_state' });
      rerender({ status: 'connected' as const });
      expect(send).toHaveBeenCalledWith({ type: 'copilot:query_state' });
    });

    it('should re-send copilot:query_state on reconnection', () => {
      const { rerender } = renderHook(
        ({ status }) => useTabCopilot({ subscribe, send, status }),
        { initialProps: { status: 'connected' as const } },
      );
      expect(send).toHaveBeenCalledWith({ type: 'copilot:query_state' });
      send.mockClear();
      // Simulate disconnect then reconnect
      rerender({ status: 'disconnected' as const });
      rerender({ status: 'connected' as const });
      expect(send).toHaveBeenCalledWith({ type: 'copilot:query_state' });
    });

    it('should handle copilot:state_response with active streams', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({
          type: 'copilot:state_response',
          data: {
            activeStreams: [
              { conversationId: 'conv-A', status: 'running', startedAt: '2024-01-01T00:00:00Z' },
            ],
            pendingUserInputs: [],
          },
        });
      });
      const tabA = useAppStore.getState().tabs[tabIdA];
      expect(tabA.isStreaming).toBe(true);
    });

    it('should handle copilot:state_response with pending user inputs', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({
          type: 'copilot:state_response',
          data: {
            activeStreams: [
              { conversationId: 'conv-A', status: 'running', startedAt: '2024-01-01T00:00:00Z' },
            ],
            pendingUserInputs: [
              {
                requestId: 'req-1',
                question: 'Pick one',
                choices: ['X', 'Y'],
                allowFreeform: true,
                multiSelect: false,
                conversationId: 'conv-A',
              },
            ],
          },
        });
      });
      const tabA = useAppStore.getState().tabs[tabIdA];
      expect(tabA.userInputRequest).toEqual({
        requestId: 'req-1',
        question: 'Pick one',
        choices: ['X', 'Y'],
        allowFreeform: true,
        multiSelect: false,
      });
      // Should also set isStreaming when there are pending user inputs
      expect(tabA.isStreaming).toBe(true);
    });

    it('should not set streaming for conversations without matching tabs', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({
          type: 'copilot:state_response',
          data: {
            activeStreams: [
              { conversationId: 'conv-UNKNOWN', status: 'running', startedAt: '2024-01-01T00:00:00Z' },
            ],
            pendingUserInputs: [],
          },
        });
      });
      // Should not affect existing tabs
      expect(useAppStore.getState().tabs[tabIdA].isStreaming).toBe(false);
      expect(useAppStore.getState().tabs[tabIdB].isStreaming).toBe(false);
    });

    it('should retry unresolved pending user inputs after 1 second (deferred retry)', async () => {
      vi.useFakeTimers();
      try {
        // Don't open tab yet — simulate tabs loading from localStorage slowly
        useAppStore.setState({ tabs: {}, tabOrder: [], activeTabId: null });

        renderHook(() => useTabCopilot({ subscribe, send }));
        act(() => {
          emit({
            type: 'copilot:state_response',
            data: {
              activeStreams: [],
              pendingUserInputs: [
                {
                  requestId: 'req-deferred',
                  question: 'Deferred question',
                  choices: ['X'],
                  allowFreeform: true,
                  conversationId: 'conv-A',
                },
              ],
            },
          });
        });

        // Tab doesn't exist yet, so userInputRequest should not be set
        // Now simulate the tab loading
        const lateTabId = openTabAndGetId('conv-A', 'Late Tab');

        // Advance 1 second to trigger the deferred retry
        await act(async () => {
          vi.advanceTimersByTime(1000);
        });

        const lateTab = useAppStore.getState().tabs[lateTabId];
        expect(lateTab.userInputRequest).toEqual({
          requestId: 'req-deferred',
          question: 'Deferred question',
          choices: ['X'],
          allowFreeform: true,
          multiSelect: undefined,
        });
        // Should also set isStreaming for deferred-resolved tabs
        expect(lateTab.isStreaming).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should resolve immediately for matching tabs and retry only unresolved ones', async () => {
      vi.useFakeTimers();
      try {
        renderHook(() => useTabCopilot({ subscribe, send }));
        act(() => {
          emit({
            type: 'copilot:state_response',
            data: {
              activeStreams: [],
              pendingUserInputs: [
                {
                  requestId: 'req-immediate',
                  question: 'Immediate question',
                  choices: ['A'],
                  allowFreeform: false,
                  conversationId: 'conv-A', // tab exists
                },
                {
                  requestId: 'req-late',
                  question: 'Late question',
                  choices: ['B'],
                  allowFreeform: true,
                  conversationId: 'conv-LATE', // tab doesn't exist yet
                },
              ],
            },
          });
        });

        // conv-A should have been resolved immediately
        expect(useAppStore.getState().tabs[tabIdA].userInputRequest).toEqual({
          requestId: 'req-immediate',
          question: 'Immediate question',
          choices: ['A'],
          allowFreeform: false,
          multiSelect: undefined,
        });
        expect(useAppStore.getState().tabs[tabIdA].isStreaming).toBe(true);

        // conv-LATE has no tab yet — simulate tab arriving
        const lateTabId = openTabAndGetId('conv-LATE', 'Late Tab');
        await act(async () => {
          vi.advanceTimersByTime(1000);
        });

        expect(useAppStore.getState().tabs[lateTabId].userInputRequest).toEqual({
          requestId: 'req-late',
          question: 'Late question',
          choices: ['B'],
          allowFreeform: true,
          multiSelect: undefined,
        });
        expect(useAppStore.getState().tabs[lateTabId].isStreaming).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // --- Subagent events (Fleet Mode) ---
  describe('subagent events (Fleet Mode)', () => {
    it('should add subagent on copilot:subagent_started', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({
          type: 'copilot:subagent_started',
          data: {
            conversationId: 'conv-A',
            toolCallId: 'sa-1',
            agentName: 'researcher',
            agentDisplayName: 'Researcher',
            agentDescription: 'Researches topics',
          },
        });
      });
      const subagents = useAppStore.getState().tabs[tabIdA].subagents;
      expect(subagents).toHaveLength(1);
      expect(subagents[0]).toEqual({
        toolCallId: 'sa-1',
        agentName: 'researcher',
        displayName: 'Researcher',
        status: 'running',
        description: 'Researches topics',
      });
    });

    it('should update subagent status on copilot:subagent_completed', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({
          type: 'copilot:subagent_started',
          data: { conversationId: 'conv-A', toolCallId: 'sa-1', agentName: 'researcher', agentDisplayName: 'Researcher' },
        });
        emit({
          type: 'copilot:subagent_completed',
          data: { conversationId: 'conv-A', toolCallId: 'sa-1', agentName: 'researcher', agentDisplayName: 'Researcher' },
        });
      });
      const subagents = useAppStore.getState().tabs[tabIdA].subagents;
      expect(subagents[0].status).toBe('completed');
    });

    it('should update subagent status and error on copilot:subagent_failed', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({
          type: 'copilot:subagent_started',
          data: { conversationId: 'conv-A', toolCallId: 'sa-1', agentName: 'researcher', agentDisplayName: 'Researcher' },
        });
        emit({
          type: 'copilot:subagent_failed',
          data: { conversationId: 'conv-A', toolCallId: 'sa-1', agentName: 'researcher', agentDisplayName: 'Researcher', error: 'Timed out' },
        });
      });
      const subagents = useAppStore.getState().tabs[tabIdA].subagents;
      expect(subagents[0].status).toBe('failed');
      expect(subagents[0].error).toBe('Timed out');
    });

    it('should clear subagents on copilot:idle', async () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({
          type: 'copilot:subagent_started',
          data: { conversationId: 'conv-A', toolCallId: 'sa-1', agentName: 'researcher', agentDisplayName: 'Researcher' },
        });
      });
      expect(useAppStore.getState().tabs[tabIdA].subagents).toHaveLength(1);

      useAppStore.getState().setTabIsStreaming(tabIdA, true);
      useAppStore.getState().updateStreamStatus('conv-A', 'running');
      await act(async () => {
        emit({ type: 'copilot:idle', data: { conversationId: 'conv-A' } });
      });
      expect(useAppStore.getState().tabs[tabIdA].subagents).toEqual([]);
    });

    it('should route subagent events to correct tab by conversationId', () => {
      renderHook(() => useTabCopilot({ subscribe, send }));
      act(() => {
        emit({
          type: 'copilot:subagent_started',
          data: { conversationId: 'conv-B', toolCallId: 'sa-2', agentName: 'coder', agentDisplayName: 'Coder' },
        });
      });
      expect(useAppStore.getState().tabs[tabIdA].subagents).toHaveLength(0);
      expect(useAppStore.getState().tabs[tabIdB].subagents).toHaveLength(1);
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
