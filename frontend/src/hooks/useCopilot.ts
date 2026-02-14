import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
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
  } = useAppStore();

  // Track whether we received a copilot:message during the current streaming cycle
  const receivedMessageRef = useRef(false);

  useEffect(() => {
    const unsub = subscribe((msg) => {
      const data = (msg.data ?? {}) as Record<string, unknown>;

      switch (msg.type) {
        case 'copilot:delta':
          setIsStreaming(true);
          appendStreamingText(data.content as string);
          break;

        case 'copilot:message':
          receivedMessageRef.current = true;
          addMessage({
            id: (data.messageId as string) || crypto.randomUUID(),
            conversationId: '',
            role: 'assistant',
            content: data.content as string,
            metadata: null,
            createdAt: new Date().toISOString(),
          });
          break;

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

        case 'copilot:idle': {
          // If SDK didn't send copilot:message but we have accumulated streamingText,
          // convert it to a permanent message
          if (!receivedMessageRef.current) {
            const text = useAppStore.getState().streamingText;
            if (text) {
              addMessage({
                id: crypto.randomUUID(),
                conversationId: '',
                role: 'assistant',
                content: text,
                metadata: null,
                createdAt: new Date().toISOString(),
              });
            }
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
