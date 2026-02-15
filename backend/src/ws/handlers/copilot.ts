import type { CopilotSession } from '@github/copilot-sdk';
import type { SessionManager } from '../../copilot/session-manager.js';
import type { ConversationRepository } from '../../conversation/repository.js';
import { EventRelay } from '../../copilot/event-relay.js';
import type { WsMessage, WsHandler } from '../types.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('ws-copilot');

interface TurnSegment {
  type: 'text' | 'tool' | 'reasoning';
  [key: string]: unknown;
}

interface ToolRecord {
  toolCallId: string;
  toolName: string;
  arguments?: unknown;
  status: 'running' | 'success' | 'error';
  result?: unknown;
  error?: string;
}

interface AccumulationState {
  contentSegments: string[];
  toolRecords: ToolRecord[];
  reasoningText: string;
  turnSegments: TurnSegment[];
}

function createEmptyAccumulation(): AccumulationState {
  return {
    contentSegments: [],
    toolRecords: [],
    reasoningText: '',
    turnSegments: [],
  };
}

function persistAccumulated(
  repo: ConversationRepository,
  conversationId: string,
  state: AccumulationState,
): void {
  const content = state.contentSegments.join('');
  const hasContent = content.length > 0 || state.toolRecords.length > 0 || state.reasoningText.length > 0;

  if (!hasContent) return;

  const metadata: Record<string, unknown> = {};
  if (state.turnSegments.length > 0) metadata.turnSegments = state.turnSegments;
  if (state.toolRecords.length > 0) metadata.toolRecords = state.toolRecords;
  if (state.reasoningText) metadata.reasoning = state.reasoningText;

  repo.addMessage(conversationId, {
    role: 'assistant',
    content,
    metadata,
  });
}

export function createCopilotHandler(
  sessionManager: SessionManager,
  repo: ConversationRepository,
): WsHandler {
  let activeSession: CopilotSession | null = null;
  let activeConversationId: string | null = null;
  let accumulation = createEmptyAccumulation();

  // Persistent dedup sets — survive across turns to filter replayed/duplicated events.
  // Event IDs are globally unique (UUIDs), so these never need to be reset.
  const seenMessageIds = new Set<string>();
  const seenToolCallIds = new Set<string>();
  const seenReasoningIds = new Set<string>();

  // Stable relay: single instance for handler lifetime with mutable send callback.
  // This prevents listener accumulation from creating new EventRelay each turn.
  let currentSendFn: ((msg: WsMessage) => void) | null = null;
  const relay = new EventRelay((msg) => {
    if (currentSendFn) currentSendFn(msg);
  });

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

        // Reset accumulation state for new turn (dedup sets persist to filter replays)
        accumulation = createEmptyAccumulation();

        // Save user message
        repo.addMessage(conversationId, { role: 'user', content: prompt });
        activeConversationId = conversationId;

        // Build accumulatingSend: intercept events for accumulation + dedup, then forward
        const accumulatingSend = (msg: WsMessage) => {
          const msgData = (msg.data ?? {}) as Record<string, unknown>;

          switch (msg.type) {
            case 'copilot:delta': {
              const messageId = msgData.messageId as string | undefined;
              if (messageId && seenMessageIds.has(messageId)) {
                return; // Skip replayed delta for already-seen messageId
              }
              break;
            }
            case 'copilot:message': {
              const content = (msgData.content as string) ?? '';
              const messageId = msgData.messageId as string | undefined;

              // Dedup: skip replayed/duplicated messages
              if (messageId && seenMessageIds.has(messageId)) {
                return;
              }
              if (messageId) {
                seenMessageIds.add(messageId);
              }

              if (content) {
                accumulation.contentSegments.push(content);
                accumulation.turnSegments.push({ type: 'text', content });
              }
              break;
            }
            case 'copilot:tool_start': {
              const toolCallId = msgData.toolCallId as string;

              // Dedup: skip replayed/duplicated tool_start
              if (toolCallId && seenToolCallIds.has(toolCallId)) {
                return;
              }
              if (toolCallId) {
                seenToolCallIds.add(toolCallId);
              }

              const toolRecord: ToolRecord = {
                toolCallId,
                toolName: msgData.toolName as string,
                arguments: msgData.arguments,
                status: 'running',
              };
              accumulation.toolRecords.push(toolRecord);
              accumulation.turnSegments.push({
                type: 'tool',
                toolCallId: toolRecord.toolCallId,
                toolName: toolRecord.toolName,
                arguments: toolRecord.arguments,
                status: 'running',
              });
              break;
            }
            case 'copilot:tool_end': {
              const toolCallId = msgData.toolCallId as string;
              const success = msgData.success as boolean;

              // Skip if corresponding tool_start was filtered (no record in accumulation)
              const record = accumulation.toolRecords.find((r) => r.toolCallId === toolCallId);
              if (!record) return;

              // Update tool record
              record.status = success ? 'success' : 'error';
              if (success) record.result = msgData.result;
              else record.error = msgData.error as string;

              // Update turn segment
              const segment = accumulation.turnSegments.find(
                (s) => s.type === 'tool' && s.toolCallId === toolCallId,
              );
              if (segment) {
                segment.status = success ? 'success' : 'error';
                if (success) segment.result = msgData.result;
                else segment.error = msgData.error;
              }
              break;
            }
            case 'copilot:reasoning_delta': {
              const reasoningId = msgData.reasoningId as string | undefined;

              // Dedup: skip replayed reasoning deltas (complete event already processed)
              if (reasoningId && seenReasoningIds.has(reasoningId)) {
                return;
              }

              const content = (msgData.content as string) ?? '';
              if (content) {
                accumulation.reasoningText += content;
              }
              break;
            }
            case 'copilot:reasoning': {
              const reasoningId = msgData.reasoningId as string | undefined;

              // Dedup: skip replayed/duplicated reasoning complete
              if (reasoningId && seenReasoningIds.has(reasoningId)) {
                return;
              }
              if (reasoningId) {
                seenReasoningIds.add(reasoningId);
              }

              const content = (msgData.content as string) ?? '';
              if (content && !accumulation.reasoningText) {
                accumulation.reasoningText = content;
              }
              if (accumulation.reasoningText) {
                accumulation.turnSegments.push({
                  type: 'reasoning',
                  content: accumulation.reasoningText,
                });
              }
              break;
            }
            case 'copilot:idle': {
              // Persist accumulated turn to DB
              if (activeConversationId) {
                persistAccumulated(repo, activeConversationId, accumulation);
              }
              // Reset accumulation for next turn (dedup sets persist)
              accumulation = createEmptyAccumulation();
              break;
            }
          }

          // Always forward to frontend
          send(msg);
        };

        // Update the stable relay's send callback
        currentSendFn = accumulatingSend;

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

            // Attach relay to session (detaches from previous session internally)
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
        // Save any accumulated content before aborting
        if (activeConversationId) {
          persistAccumulated(repo, activeConversationId, accumulation);
          accumulation = createEmptyAccumulation();
        }

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
