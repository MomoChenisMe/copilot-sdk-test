import type { CopilotSession } from '@github/copilot-sdk';
import type { SessionManager } from '../../copilot/session-manager.js';
import type { ConversationRepository } from '../../conversation/repository.js';
import { EventRelay } from '../../copilot/event-relay.js';
import type { WsMessage, WsHandler } from '../types.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('ws-copilot');

export function createCopilotHandler(
  sessionManager: SessionManager,
  repo: ConversationRepository,
): WsHandler {
  let activeSession: CopilotSession | null = null;
  let relay: EventRelay | null = null;
  let activeConversationId: string | null = null;

  return (message: WsMessage, send: (msg: WsMessage) => void): void => {
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
        activeConversationId = conversationId;

        // Wrap send to intercept copilot:message and save assistant response
        const wrappedSend = (msg: WsMessage) => {
          if (msg.type === 'copilot:message' && activeConversationId) {
            const msgData = msg.data as Record<string, unknown> | undefined;
            if (msgData?.content) {
              repo.addMessage(activeConversationId, {
                role: 'assistant',
                content: msgData.content as string,
              });
            }
          }
          send(msg);
        };

        // Get or create SDK session (async)
        void (async () => {
          try {
            const session = await sessionManager.getOrCreateSession({
              sdkSessionId: conversation.sdkSessionId,
              model: conversation.model,
              workingDirectory: conversation.cwd,
            });

            activeSession = session;

            // Save sdkSessionId if new
            if (!conversation.sdkSessionId) {
              repo.update(conversationId, { sdkSessionId: session.sessionId });
            }

            // Set up event relay
            if (relay) relay.detach();
            relay = new EventRelay(wrappedSend);
            relay.attach(session);

            // Send the message
            await sessionManager.sendMessage(session, prompt);
          } catch (err) {
            log.error({ err, conversationId }, 'Failed to send copilot message');
            send({
              type: 'copilot:error',
              data: { message: err instanceof Error ? err.message : 'Unknown error' },
            });
          }
        })();

        break;
      }

      case 'copilot:abort': {
        if (activeSession) {
          void (async () => {
            try {
              await sessionManager.abortMessage(activeSession!);
            } catch (err) {
              log.error({ err }, 'Failed to abort message');
            }
          })();
        }
        break;
      }

      default:
        send({
          type: 'error',
          data: { message: `Unknown copilot action: ${type}` },
        });
    }
  };
}
