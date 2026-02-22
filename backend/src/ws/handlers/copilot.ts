import { readFileSync, existsSync, statSync } from 'node:fs';
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

          // Save user message (with attachment and contextFiles metadata)
          const files = (payload.files as Array<{ id: string; originalName: string; mimeType: string; size: number; path: string }>) ?? undefined;
          const contextFiles = (payload.contextFiles as string[]) ?? [];
          const userMsg: { role: string; content: string; metadata?: Record<string, unknown> } = { role: 'user', content: prompt };
          if ((files && files.length > 0) || contextFiles.length > 0) {
            userMsg.metadata = {};
            if (files && files.length > 0) {
              userMsg.metadata.attachments = files.map((f) => ({ id: f.id, originalName: f.originalName, mimeType: f.mimeType, size: f.size }));
            }
            if (contextFiles.length > 0) {
              userMsg.metadata.contextFiles = contextFiles;
            }
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

          // Prepend web search instruction if forced
          const webSearchForced = payload.webSearchForced as boolean | undefined;
          if (webSearchForced) {
            finalPrompt = '[IMPORTANT: You MUST use the web_search tool to search the web BEFORE responding to this message. Always perform at least one web search.]\n\n' + finalPrompt;
          }

          // Read contextFiles and prepend to prompt
          if (contextFiles.length > 0) {
            const MAX_CONTEXT_FILE_SIZE = 500 * 1024; // 500KB
            const contextParts: string[] = [];
            for (const fp of contextFiles) {
              try {
                if (!existsSync(fp)) continue;
                const stat = statSync(fp);
                if (!stat.isFile()) continue;
                if (stat.size > MAX_CONTEXT_FILE_SIZE) {
                  contextParts.push(`[File: ${fp}] (File too large)`);
                  continue;
                }
                contextParts.push(`[File: ${fp}]\n${readFileSync(fp, 'utf-8')}`);
              } catch {
                // skip unreadable files
              }
            }
            if (contextParts.length > 0) {
              finalPrompt = contextParts.join('\n\n') + '\n\n' + finalPrompt;
            }
          }

          // Delegate to StreamManager
          void (async () => {
            try {
              const disabledSkills = (payload.disabledSkills as string[]) ?? [];
              const mode = payload.mode as 'plan' | 'act' | undefined;
              const locale = payload.locale as string | undefined;
              await streamManager.startStream(conversationId, {
                prompt: finalPrompt,
                sdkSessionId: conversation.sdkSessionId,
                model: conversation.model,
                cwd: conversation.cwd,
                disabledSkills,
                files,
                ...(mode && { mode }),
                ...(locale && { locale }),
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

        case 'copilot:execute_plan': {
          const conversationId = payload.conversationId as string | undefined;
          const planFilePath = payload.planFilePath as string | undefined;

          if (!conversationId) {
            send({ type: 'copilot:error', data: { message: 'conversationId is required' } });
            return;
          }
          if (!planFilePath) {
            send({ type: 'copilot:error', data: { message: 'planFilePath is required' } });
            return;
          }

          const conversation = repo.getById(conversationId);
          if (!conversation) {
            send({ type: 'copilot:error', data: { message: 'Conversation not found' } });
            return;
          }

          if (!existsSync(planFilePath)) {
            send({ type: 'copilot:error', data: { message: `Plan file not found: ${planFilePath}` } });
            return;
          }

          // Read the plan file content
          const planContent = readFileSync(planFilePath, 'utf-8');

          // Clear SDK session to force a fresh session
          repo.update(conversationId, { sdkSessionId: null });

          // Start a new stream with plan content as prompt in act mode
          void (async () => {
            try {
              await streamManager.startStream(conversationId, {
                prompt: `以下是先前完成的實作計畫，請開始執行：\n\n${planContent}`,
                sdkSessionId: null,
                model: conversation.model,
                cwd: conversation.cwd,
                mode: 'act',
              });

              // Auto-subscribe this connection to the stream
              const unsub = streamManager.subscribe(conversationId, send);
              if (unsub) {
                activeSubscriptions.get(conversationId)?.();
                activeSubscriptions.set(conversationId, unsub);
              }
            } catch (err) {
              log.error({ err, conversationId }, 'Failed to execute plan');
              send({
                type: 'copilot:error',
                data: { message: err instanceof Error ? err.message : 'Unknown error' },
              });
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
