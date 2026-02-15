import type { StreamManager } from '../../copilot/stream-manager.js';
import type { ConversationRepository } from '../../conversation/repository.js';
import type { WsMessage, WsHandlerObject, SendFn } from '../types.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('ws-copilot');

export function createCopilotHandler(
  streamManager: StreamManager,
  repo: ConversationRepository,
): WsHandlerObject {
  // Per-connection state
  const activeSubscriptions = new Map<string, () => void>();
  let lastConversationId: string | null = null;

  return {
    onMessage(message: WsMessage, send: SendFn): void {
      const { type, data } = message;
      const payload = (data ?? {}) as Record<string, unknown>;

      switch (type) {
        case 'copilot:send': {
          const conversationId = payload.conversationId as string | undefined;
          const prompt = payload.prompt as string | undefined;

          if (!prompt) {
            send({ type: 'copilot:error', data: { message: 'prompt is required' } });
            return;
          }

          if (!conversationId) {
            send({ type: 'copilot:error', data: { message: 'conversationId is required' } });
            return;
          }

          const conversation = repo.getById(conversationId);
          if (!conversation) {
            send({ type: 'copilot:error', data: { message: 'Conversation not found' } });
            return;
          }

          // Save user message
          repo.addMessage(conversationId, { role: 'user', content: prompt });
          lastConversationId = conversationId;

          // Delegate to StreamManager
          void (async () => {
            try {
              const activePresets = (payload.activePresets as string[]) ?? [];
              await streamManager.startStream(conversationId, {
                prompt,
                sdkSessionId: conversation.sdkSessionId,
                model: conversation.model,
                cwd: conversation.cwd,
                activePresets,
              });

              // Auto-subscribe this connection to the stream
              const unsub = streamManager.subscribe(conversationId, send);
              if (unsub) {
                // Clean up previous subscription for same conversation
                activeSubscriptions.get(conversationId)?.();
                activeSubscriptions.set(conversationId, unsub);
              }
            } catch (err) {
              log.error({ err, conversationId }, 'Failed to start stream');
              send({
                type: 'copilot:error',
                data: { message: err instanceof Error ? err.message : 'Unknown error' },
              });
            }
          })();

          break;
        }

        case 'copilot:subscribe': {
          const conversationId = payload.conversationId as string;
          const unsub = streamManager.subscribe(conversationId, send);

          if (unsub) {
            activeSubscriptions.get(conversationId)?.();
            activeSubscriptions.set(conversationId, unsub);
            send({
              type: 'copilot:stream-status',
              data: { conversationId, subscribed: true },
            });
          } else {
            send({
              type: 'copilot:stream-status',
              data: { conversationId, subscribed: false },
            });
          }
          break;
        }

        case 'copilot:unsubscribe': {
          const conversationId = payload.conversationId as string;
          const unsub = activeSubscriptions.get(conversationId);
          if (unsub) {
            unsub();
            activeSubscriptions.delete(conversationId);
          }
          break;
        }

        case 'copilot:status': {
          const streamIds = streamManager.getActiveStreamIds();
          send({
            type: 'copilot:active-streams',
            data: { streamIds },
          });
          break;
        }

        case 'copilot:abort': {
          const conversationId = (payload.conversationId as string) || lastConversationId;

          if (!conversationId) {
            log.warn('copilot:abort without conversationId and no active conversation');
            return;
          }

          if (!payload.conversationId && lastConversationId) {
            log.warn('copilot:abort without conversationId is deprecated — pass conversationId explicitly');
          }

          void (async () => {
            try {
              await streamManager.abortStream(conversationId);
            } catch (err) {
              log.error({ err }, 'Failed to abort stream');
            }
          })();
          break;
        }

        default:
          send({
            type: 'error',
            data: { message: `Unknown copilot action: ${type}` },
          });
      }
    },

    onDisconnect(_send: SendFn): void {
      // Clean up all subscriptions for this connection
      for (const [, unsub] of activeSubscriptions) {
        try {
          unsub();
        } catch (err) {
          log.error({ err }, 'Error during subscription cleanup on disconnect');
        }
      }
      activeSubscriptions.clear();
      // Note: streams continue running in background
    },
  };
}
