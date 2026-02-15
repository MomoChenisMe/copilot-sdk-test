import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import type { MessageMetadata } from '../lib/api';
import type { WsMessage } from '../lib/ws-types';

interface UseCopilotOptions {
  subscribe: (listener: (message: WsMessage) => void) => () => void;
  send: (message: WsMessage) => void;
}

export function useCopilot({ subscribe, send }: UseCopilotOptions) {
  const {
    appendStreamingText,
    setIsStreaming,
    clearStreaming,
    addToolRecord,
    updateToolRecord,
    appendReasoningText,
    setCopilotError,
    addMessage,
    addTurnContentSegment,
    addTurnSegment,
    updateToolInTurnSegments,
  } = useAppStore();

  // Track whether we received a copilot:message with content during the current turn
  const receivedMessageRef = useRef(false);
  // Persistent dedup sets — belt-and-suspenders with backend dedup.
  // Never reset (event IDs are globally unique UUIDs).
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const seenToolCallIdsRef = useRef<Set<string>>(new Set());
  const seenReasoningIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsub = subscribe((msg) => {
      const data = (msg.data ?? {}) as Record<string, unknown>;

      switch (msg.type) {
        case 'copilot:delta':
          setIsStreaming(true);
          appendStreamingText(data.content as string);
          break;

        case 'copilot:message': {
          const content = data.content as string | undefined;
          const messageId = data.messageId as string | undefined;

          // Dedup: skip replayed messages from infiniteSessions
          if (messageId && seenMessageIdsRef.current.has(messageId)) break;
          if (messageId) seenMessageIdsRef.current.add(messageId);

          if (content) {
            receivedMessageRef.current = true;
            addTurnContentSegment(content);
            addTurnSegment({ type: 'text', content });
          }
          // Always clear streamingText when a message event arrives
          useAppStore.getState().setStreamingText('');
          break;
        }

        case 'copilot:tool_start': {
          const toolCallId = data.toolCallId as string;
          const toolName = data.toolName as string;

          // Dedup: skip replayed/duplicated tool_start
          if (toolCallId && seenToolCallIdsRef.current.has(toolCallId)) break;
          if (toolCallId) seenToolCallIdsRef.current.add(toolCallId);

          addToolRecord({
            toolCallId,
            toolName,
            arguments: data.arguments,
            status: 'running',
          });
          addTurnSegment({
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

          // Skip if corresponding tool_start was filtered (no record exists)
          const existingRecords = useAppStore.getState().toolRecords;
          if (!existingRecords.find((r: { toolCallId: string }) => r.toolCallId === toolCallId)) break;

          const updates = {
            status: (data.success ? 'success' : 'error') as 'success' | 'error',
            result: data.result as unknown,
            error: data.error as string | undefined,
          };
          updateToolRecord(toolCallId, updates);
          updateToolInTurnSegments(toolCallId, updates);
          break;
        }

        case 'copilot:reasoning_delta': {
          const reasoningId = data.reasoningId as string | undefined;

          // Dedup: skip replayed reasoning deltas
          if (reasoningId && seenReasoningIdsRef.current.has(reasoningId)) break;

          appendReasoningText(data.content as string);
          break;
        }

        case 'copilot:reasoning': {
          const reasoningId = data.reasoningId as string | undefined;

          // Dedup: skip replayed/duplicated reasoning complete
          if (reasoningId && seenReasoningIdsRef.current.has(reasoningId)) break;
          if (reasoningId) seenReasoningIdsRef.current.add(reasoningId);

          const currentReasoning = useAppStore.getState().reasoningText;
          const content = data.content as string | undefined;

          // Fallback: only use complete event content if no deltas were accumulated
          if (!currentReasoning && content) {
            useAppStore.getState().appendReasoningText(content);
          }

          // Always add reasoning to turnSegments (using accumulated or event content)
          const reasoningContent = useAppStore.getState().reasoningText;
          if (reasoningContent) {
            addTurnSegment({ type: 'reasoning', content: reasoningContent });
          }
          break;
        }

        case 'copilot:idle': {
          const state = useAppStore.getState();

          // Determine content: segments first, then streamingText fallback
          let content = '';
          if (state.turnContentSegments.length > 0) {
            content = state.turnContentSegments.filter((s) => s).join('\n\n');
          } else if (!receivedMessageRef.current && state.streamingText) {
            content = state.streamingText;
          }

          // Build metadata if tools, reasoning, or turnSegments exist
          let metadata: MessageMetadata | null = null;
          if (state.toolRecords.length > 0 || state.reasoningText || state.turnSegments.length > 0) {
            metadata = {};
            if (state.toolRecords.length > 0) {
              metadata.toolRecords = [...state.toolRecords];
            }
            if (state.reasoningText) {
              metadata.reasoning = state.reasoningText;
            }
            if (state.turnSegments.length > 0) {
              metadata.turnSegments = [...state.turnSegments];
            }
          }

          // Create consolidated message if there's content or metadata
          if (content || metadata) {
            addMessage({
              id: crypto.randomUUID(),
              conversationId: '',
              role: 'assistant',
              content,
              metadata,
              createdAt: new Date().toISOString(),
            });
          }

          setIsStreaming(false);
          clearStreaming();
          receivedMessageRef.current = false;
          // Dedup sets are NOT cleared — they persist to filter replayed events.
          break;
        }

        case 'copilot:error':
          setCopilotError(data.message as string);
          setIsStreaming(false);
          break;
      }
    });

    return unsub;
  }, [
    subscribe,
    appendStreamingText,
    setIsStreaming,
    clearStreaming,
    addToolRecord,
    updateToolRecord,
    appendReasoningText,
    setCopilotError,
    addMessage,
    addTurnContentSegment,
    addTurnSegment,
    updateToolInTurnSegments,
  ]);

  const sendMessage = useCallback(
    (conversationId: string, prompt: string) => {
      clearStreaming();
      setIsStreaming(true);
      receivedMessageRef.current = false;
      // Dedup sets are NOT cleared — they persist to filter replayed events.

      // Add user message to local state
      addMessage({
        id: crypto.randomUUID(),
        conversationId,
        role: 'user',
        content: prompt,
        metadata: null,
        createdAt: new Date().toISOString(),
      });

      send({ type: 'copilot:send', data: { conversationId, prompt } });
    },
    [send, clearStreaming, setIsStreaming, addMessage],
  );

  const abortMessage = useCallback(() => {
    send({ type: 'copilot:abort' });
  }, [send]);

  return { sendMessage, abortMessage };
}
