import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import { conversationApi } from '../lib/api';
import type { MessageMetadata } from '../lib/api';
import type { WsMessage } from '../lib/ws-types';

interface UseTabCopilotOptions {
  subscribe: (listener: (message: WsMessage) => void) => () => void;
  send: (message: WsMessage) => void;
}

// Per-conversation dedup state
interface ConversationDedup {
  seenMessageIds: Set<string>;
  seenToolCallIds: Set<string>;
  seenReasoningIds: Set<string>;
  receivedMessage: boolean;
}

/** Scan all tabs to find the tabId that has the given conversationId */
function findTabIdByConversationId(conversationId: string): string | undefined {
  const tabs = useAppStore.getState().tabs;
  return Object.keys(tabs).find((id) => tabs[id].conversationId === conversationId);
}

export function useTabCopilot({ subscribe, send }: UseTabCopilotOptions) {
  // Per-conversation dedup maps
  const dedupMapRef = useRef<Map<string, ConversationDedup>>(new Map());

  function getDedup(conversationId: string): ConversationDedup {
    let d = dedupMapRef.current.get(conversationId);
    if (!d) {
      d = {
        seenMessageIds: new Set(),
        seenToolCallIds: new Set(),
        seenReasoningIds: new Set(),
        receivedMessage: false,
      };
      dedupMapRef.current.set(conversationId, d);
    }
    return d;
  }

  useEffect(() => {
    const unsub = subscribe((msg) => {
      const data = (msg.data ?? {}) as Record<string, unknown>;
      const conversationId = data.conversationId as string | undefined;

      // Global events — no conversationId routing needed
      switch (msg.type) {
        case 'copilot:active-streams': {
          const streamIds = data.streamIds as string[];
          useAppStore.getState().setActiveStreams(streamIds);
          return;
        }
        case 'copilot:stream-status': {
          const cid = data.conversationId as string;
          const subscribed = data.subscribed as boolean;
          if (subscribed) {
            useAppStore.getState().updateStreamStatus(cid, 'running');
          } else {
            useAppStore.getState().removeStream(cid);
          }
          return;
        }
      }

      // Scoped events — need conversationId + matching tab (scan by conversationId)
      if (!conversationId) return;

      const tabId = findTabIdByConversationId(conversationId);
      if (!tabId) return; // No matching tab, silently discard

      const state = useAppStore.getState();
      const dedup = getDedup(conversationId);

      switch (msg.type) {
        case 'copilot:delta':
          state.setTabIsStreaming(tabId, true);
          state.appendTabStreamingText(tabId, data.content as string);
          break;

        case 'copilot:message': {
          const content = data.content as string | undefined;
          const messageId = data.messageId as string | undefined;

          if (messageId && dedup.seenMessageIds.has(messageId)) break;
          if (messageId) dedup.seenMessageIds.add(messageId);

          if (content) {
            dedup.receivedMessage = true;
            state.addTabTurnContentSegment(tabId, content);
            state.addTabTurnSegment(tabId, { type: 'text', content });
          }
          // Clear streamingText when a message event arrives
          useAppStore.setState((s) => {
            const t = s.tabs[tabId];
            if (!t) return s;
            return { tabs: { ...s.tabs, [tabId]: { ...t, streamingText: '' } } };
          });
          break;
        }

        case 'copilot:tool_start': {
          const toolCallId = data.toolCallId as string;
          const toolName = data.toolName as string;

          if (toolCallId && dedup.seenToolCallIds.has(toolCallId)) break;
          if (toolCallId) dedup.seenToolCallIds.add(toolCallId);

          state.addTabToolRecord(tabId, {
            toolCallId,
            toolName,
            arguments: data.arguments,
            status: 'running',
          });
          state.addTabTurnSegment(tabId, {
            type: 'tool',
            toolCallId,
            toolName,
            arguments: data.arguments,
            status: 'running',
          });
          break;
        }

        case 'copilot:tool_end': {
          const toolCallId = data.toolCallId as string;
          const currentTab = useAppStore.getState().tabs[tabId];
          if (!currentTab?.toolRecords.find((r) => r.toolCallId === toolCallId)) break;

          const updates = {
            status: (data.success ? 'success' : 'error') as 'success' | 'error',
            result: data.result as unknown,
            error: data.error as string | undefined,
          };
          state.updateTabToolRecord(tabId, toolCallId, updates);
          state.updateTabToolInTurnSegments(tabId, toolCallId, updates);
          break;
        }

        case 'copilot:reasoning_delta': {
          const reasoningId = data.reasoningId as string | undefined;
          if (reasoningId && dedup.seenReasoningIds.has(reasoningId)) break;
          state.appendTabReasoningText(tabId, data.content as string);
          break;
        }

        case 'copilot:reasoning': {
          const reasoningId = data.reasoningId as string | undefined;
          if (reasoningId && dedup.seenReasoningIds.has(reasoningId)) break;
          if (reasoningId) dedup.seenReasoningIds.add(reasoningId);

          const currentTab = useAppStore.getState().tabs[tabId];
          if (!currentTab) break;
          const content = data.content as string | undefined;

          if (!currentTab.reasoningText && content) {
            state.appendTabReasoningText(tabId, content);
          }

          const updatedTab = useAppStore.getState().tabs[tabId];
          if (updatedTab?.reasoningText) {
            state.addTabTurnSegment(tabId, { type: 'reasoning', content: updatedTab.reasoningText });
          }
          break;
        }

        case 'copilot:idle': {
          const currentTab = useAppStore.getState().tabs[tabId];
          if (!currentTab) break;

          // Determine content
          let content = '';
          if (currentTab.turnContentSegments.length > 0) {
            content = currentTab.turnContentSegments.filter((s) => s).join('\n\n');
          } else if (!dedup.receivedMessage && currentTab.streamingText) {
            content = currentTab.streamingText;
          }

          // Build metadata
          let metadata: MessageMetadata | null = null;
          if (currentTab.toolRecords.length > 0 || currentTab.reasoningText || currentTab.turnSegments.length > 0) {
            metadata = {};
            if (currentTab.toolRecords.length > 0) {
              metadata.toolRecords = [...currentTab.toolRecords];
            }
            if (currentTab.reasoningText) {
              metadata.reasoning = currentTab.reasoningText;
            }
            if (currentTab.turnSegments.length > 0) {
              metadata.turnSegments = [...currentTab.turnSegments];
            }
          }

          // Create consolidated message
          if (content || metadata) {
            state.addTabMessage(tabId, {
              id: crypto.randomUUID(),
              conversationId,
              role: 'assistant',
              content,
              metadata,
              createdAt: new Date().toISOString(),
            });
          }

          // Remove from active streams
          state.removeStream(conversationId);
          state.setTabIsStreaming(tabId, false);
          state.clearTabStreaming(tabId);
          dedup.receivedMessage = false;
          break;
        }

        case 'copilot:error':
          state.setTabCopilotError(tabId, data.message as string);
          state.setTabIsStreaming(tabId, false);
          break;
      }
    });

    return unsub;
  }, [subscribe]);

  // sendMessage now takes tabId, resolves conversationId from tab state
  const sendMessage = useCallback(
    (tabId: string, prompt: string, files?: Array<{ id: string; originalName: string; mimeType: string; size: number; path: string }>) => {
      const state = useAppStore.getState();
      const tab = state.tabs[tabId];
      if (!tab) return;

      const conversationId = tab.conversationId;

      // Auto-title: if this is the first message, set conversation title from prompt
      const isFirstMessage = tab.messages.length === 0;

      state.clearTabStreaming(tabId);
      state.setTabIsStreaming(tabId, true);

      // Reset per-conversation receivedMessage flag
      const dedup = getDedup(conversationId);
      dedup.receivedMessage = false;

      // Build user message metadata (include attachments if files present)
      let userMetadata: MessageMetadata | null = null;
      if (files && files.length > 0) {
        userMetadata = {
          attachments: files.map((f) => ({
            id: f.id,
            originalName: f.originalName,
            mimeType: f.mimeType,
            size: f.size,
          })),
        };
      }

      // Add user message to tab
      state.addTabMessage(tabId, {
        id: crypto.randomUUID(),
        conversationId,
        role: 'user',
        content: prompt,
        metadata: userMetadata,
        createdAt: new Date().toISOString(),
      });

      const { activePresets, disabledSkills } = state;
      const data: Record<string, unknown> = { conversationId, prompt, activePresets, disabledSkills };
      if (files && files.length > 0) {
        data.files = files;
      }
      send({
        type: 'copilot:send',
        data,
      });

      // Auto-title on first message
      if (isFirstMessage) {
        const title = prompt.slice(0, 50).trim() || 'New Chat';
        useAppStore.getState().updateTabTitle(tabId, title);
        conversationApi.update(conversationId, { title }).catch(() => {/* ignore */});
      }
    },
    [send],
  );

  const abortMessage = useCallback(
    (conversationId: string) => {
      send({ type: 'copilot:abort', data: { conversationId } });
    },
    [send],
  );

  // Cleanup dedup sets when tabs are closed
  const cleanupDedup = useCallback((conversationId: string) => {
    dedupMapRef.current.delete(conversationId);
  }, []);

  return { sendMessage, abortMessage, cleanupDedup };
}
