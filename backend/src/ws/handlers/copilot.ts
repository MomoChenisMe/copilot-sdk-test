import type { StreamManager } from '../../copilot/stream-manager.js';
import type { ConversationRepository } from '../../conversation/repository.js';
import type { WsMessage, WsHandlerObject, SendFn } from '../types.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('ws-copilot');

export interface CopilotHandlerResult extends WsHandlerObject {
  addBashContext(conversationId: string, context: string): void;
  readonly lastConversationId: string | null;
}

export function createCopilotHandler(
  streamManager: StreamManager,
  repo: ConversationRepository,
): CopilotHandlerResult {
  // Per-connection state
  const activeSubscriptions = new Map<string, () => void>();
  let _lastConversationId: string | null = null;
  const pendingBashContext = new Map<string, string[]>();

  return {
    addBashContext(conversationId: string, context: string): void {
      const existing = pendingBashContext.get(conversationId) ?? [];
      existing.push(context);
      pendingBashContext.set(conversationId, existing);
    },

    get lastConversationId(): string | null {
      return _lastConversationId;
    },

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

          // Save user message (with attachment metadata if files present)
          const files = (payload.files as Array<{ id: string; originalName: string; mimeType: string; size: number; path: string }>) ?? undefined;
          const userMsg: { role: string; content: string; metadata?: unknown } = { role: 'user', content: prompt };
          if (files && files.length > 0) {
            userMsg.metadata = {
              attachments: files.map((f) => ({ id: f.id, originalName: f.originalName, mimeType: f.mimeType, size: f.size })),
            };
          }
          repo.addMessage(conversationId, userMsg);
          _lastConversationId = conversationId;

          // Prepend any pending bash context to the prompt
          let finalPrompt = prompt;
          const bashContexts = pendingBashContext.get(conversationId);
          if (bashContexts?.length) {
            finalPrompt = bashContexts.map(ctx => `[Bash executed by user]\n${ctx}`).join('\n\n') + '\n\n' + prompt;
            pendingBashContext.delete(conversationId);
          }

          // Delegate to StreamManager
          void (async () => {
            try {
              const activePresets = (payload.activePresets as string[]) ?? [];
              const disabledSkills = (payload.disabledSkills as string[]) ?? [];
              const mode = payload.mode as 'plan' | 'act' | undefined;
              await streamManager.startStream(conversationId, {
                prompt: finalPrompt,
                sdkSessionId: conversation.sdkSessionId,
                model: conversation.model,
                cwd: conversation.cwd,
                activePresets,
                disabledSkills,
                files,
                ...(mode && { mode }),
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
          const conversationId = (payload.conversationId as string) || _lastConversationId;

          if (!conversationId) {
            log.warn('copilot:abort without conversationId and no active conversation');
            return;
          }

          if (!payload.conversationId && _lastConversationId) {
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

        case 'copilot:user_input_response': {
          const conversationId = payload.conversationId as string | undefined;
          const requestId = payload.requestId as string | undefined;
          const answer = payload.answer as string | undefined;
          const wasFreeform = (payload.wasFreeform as boolean) ?? false;

          if (!conversationId) {
            send({ type: 'copilot:error', data: { message: 'conversationId is required' } });
            return;
          }
          if (!requestId) {
            send({ type: 'copilot:error', data: { message: 'requestId is required' } });
            return;
          }
          if (answer == null) {
            send({ type: 'copilot:error', data: { message: 'answer is required' } });
            return;
          }

          streamManager.handleUserInputResponse(conversationId, requestId, answer, wasFreeform);
          break;
        }

        case 'copilot:query_state': {
          const fullState = streamManager.getFullState();
          send({
            type: 'copilot:state_response',
            data: fullState,
          });

          // Auto-resubscribe to all active streams so client receives future events
          for (const stream of fullState.activeStreams) {
            const unsub = streamManager.subscribe(stream.conversationId, send);
            if (unsub) {
              activeSubscriptions.get(stream.conversationId)?.();
              activeSubscriptions.set(stream.conversationId, unsub);
            }
          }
          break;
        }

        case 'copilot:set_mode': {
          const conversationId = payload.conversationId as string | undefined;
          const mode = payload.mode as string | undefined;

          if (!conversationId) {
            send({ type: 'copilot:error', data: { message: 'conversationId is required' } });
            return;
          }
          if (!mode) {
            send({ type: 'copilot:error', data: { message: 'mode is required' } });
            return;
          }

          streamManager.setMode(conversationId, mode as 'plan' | 'act');
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
