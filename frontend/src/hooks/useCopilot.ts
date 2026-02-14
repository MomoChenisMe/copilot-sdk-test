import { useEffect, useCallback, useRef } from 'react';
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
  } = useAppStore();

  // Track whether we received a copilot:message with content during the current turn
  const receivedMessageRef = useRef(false);

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
          if (content) {
            receivedMessageRef.current = true;
            addTurnContentSegment(content);
          }
          // Always clear streamingText when a message event arrives
          useAppStore.getState().setStreamingText('');
          break;
        }

        case 'copilot:tool_start':
          addToolRecord({
            toolCallId: data.toolCallId as string,
            toolName: data.toolName as string,
            arguments: data.arguments,
            status: 'running',
          });
          break;

        case 'copilot:tool_end':
          updateToolRecord(data.toolCallId as string, {
            status: data.success ? 'success' : 'error',
            result: data.result as unknown,
            error: data.error as string | undefined,
          });
          break;

        case 'copilot:reasoning_delta':
          appendReasoningText(data.content as string);
          break;

        case 'copilot:reasoning': {
          // Fallback: only use complete event if no deltas were accumulated
          const currentReasoning = useAppStore.getState().reasoningText;
          if (!currentReasoning) {
            const content = data.content as string | undefined;
            if (content) {
              useAppStore.getState().appendReasoningText(content);
            }
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

          // Build metadata if tools or reasoning exist
          let metadata: MessageMetadata | null = null;
          if (state.toolRecords.length > 0 || state.reasoningText) {
            metadata = {};
            if (state.toolRecords.length > 0) {
              metadata.toolRecords = [...state.toolRecords];
            }
            if (state.reasoningText) {
              metadata.reasoning = state.reasoningText;
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
  ]);

  const sendMessage = useCallback(
    (conversationId: string, prompt: string) => {
      clearStreaming();
      setIsStreaming(true);
      receivedMessageRef.current = false;

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
