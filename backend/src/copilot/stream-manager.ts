import { EventEmitter } from 'node:events';
import type { CopilotSession } from '@github/copilot-sdk';
import type { SessionManager } from './session-manager.js';
import type { ConversationRepository } from '../conversation/repository.js';
import { EventRelay } from './event-relay.js';
import type { WsMessage, SendFn } from '../ws/types.js';
import type { PromptComposer } from '../prompts/composer.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('stream-manager');

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

interface ConversationStream {
  conversationId: string;
  session: CopilotSession;
  status: 'running' | 'idle' | 'error';
  accumulation: AccumulationState;
  eventBuffer: WsMessage[];
  subscribers: Set<SendFn>;
  relay: EventRelay;
  seenMessageIds: Set<string>;
  seenToolCallIds: Set<string>;
  seenReasoningIds: Set<string>;
}

export interface StreamManagerDeps {
  sessionManager: SessionManager;
  repo: ConversationRepository;
  maxConcurrency?: number;
  promptComposer?: PromptComposer;
  skillStore?: { getSkillDirectories(): string[] };
}

export interface StartStreamOptions {
  prompt: string;
  sdkSessionId: string | null;
  model: string;
  cwd: string;
  activePresets?: string[];
  disabledSkills?: string[];
}

export class StreamManager extends EventEmitter {
  private static instance: StreamManager | null = null;
  private streams = new Map<string, ConversationStream>();
  private maxConcurrency: number;
  private isShuttingDown = false;
  private sessionManager: SessionManager;
  private repo: ConversationRepository;
  private promptComposer?: PromptComposer;
  private skillStore?: { getSkillDirectories(): string[] };

  private constructor(deps: StreamManagerDeps) {
    super();
    this.sessionManager = deps.sessionManager;
    this.repo = deps.repo;
    this.maxConcurrency = deps.maxConcurrency ?? 3;
    this.promptComposer = deps.promptComposer;
    this.skillStore = deps.skillStore;
  }

  static getInstance(deps?: StreamManagerDeps): StreamManager {
    if (!StreamManager.instance) {
      if (!deps) throw new Error('StreamManager not initialized — provide deps on first call');
      StreamManager.instance = new StreamManager(deps);
    }
    return StreamManager.instance;
  }

  static resetInstance(): void {
    StreamManager.instance = null;
  }

  async startStream(conversationId: string, options: StartStreamOptions): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Cannot start stream during shutdown');
    }

    if (this.streams.has(conversationId)) {
      throw new Error(`Stream already exists for conversation ${conversationId}`);
    }

    const runningCount = [...this.streams.values()].filter((s) => s.status === 'running').length;
    if (runningCount >= this.maxConcurrency) {
      throw new Error(`Max concurrency (${this.maxConcurrency}) exceeded`);
    }

    // Create the stream's internal send function
    const stream: ConversationStream = {
      conversationId,
      session: null as any, // Set after session creation
      status: 'running',
      accumulation: createEmptyAccumulation(),
      eventBuffer: [],
      subscribers: new Set(),
      relay: null as any, // Set below
      seenMessageIds: new Set(),
      seenToolCallIds: new Set(),
      seenReasoningIds: new Set(),
    };

    // Build accumulatingSend for this stream
    const accumulatingSend = (msg: WsMessage) => {
      this.processEvent(stream, msg);
    };

    stream.relay = new EventRelay(accumulatingSend);
    this.streams.set(conversationId, stream);

    // Async: get/create session and send message
    try {
      const sessionOpts: Parameters<typeof this.sessionManager.getOrCreateSession>[0] = {
        sdkSessionId: options.sdkSessionId,
        model: options.model,
        workingDirectory: options.cwd,
      };

      if (this.promptComposer) {
        const composed = this.promptComposer.compose(options.activePresets ?? [], options.cwd);
        if (composed) {
          sessionOpts.systemMessage = { mode: 'append', content: composed };
        }
      }

      if (this.skillStore) {
        sessionOpts.skillDirectories = this.skillStore.getSkillDirectories();
      }

      if (options.disabledSkills?.length) {
        sessionOpts.disabledSkills = options.disabledSkills;
      }

      const session = await this.sessionManager.getOrCreateSession(sessionOpts);

      // Persist the SDK session ID so future messages resume the same session
      if (!options.sdkSessionId && session.sessionId) {
        this.repo.update(conversationId, { sdkSessionId: session.sessionId });
      }

      stream.session = session;
      stream.relay.attach(session);

      await this.sessionManager.sendMessage(session, options.prompt);
    } catch (err) {
      log.error({ err, conversationId }, 'Failed to start stream');
      stream.status = 'error';
      const errorMsg: WsMessage = {
        type: 'copilot:error',
        data: { message: err instanceof Error ? err.message : 'Unknown error' },
      };
      this.broadcast(stream, errorMsg);
      throw err;
    }
  }

  subscribe(conversationId: string, send: SendFn): (() => void) | null {
    const stream = this.streams.get(conversationId);
    if (!stream) return null;

    // Catch-up: replay eventBuffer
    for (const msg of stream.eventBuffer) {
      send(msg);
    }

    stream.subscribers.add(send);

    // Return unsubscribe function
    return () => {
      stream.subscribers.delete(send);
    };
  }

  async abortStream(conversationId: string): Promise<void> {
    const stream = this.streams.get(conversationId);
    if (!stream || stream.status !== 'running') return;

    // Persist accumulated content
    persistAccumulated(this.repo, conversationId, stream.accumulation);
    stream.accumulation = createEmptyAccumulation();
    stream.status = 'idle';

    // Notify subscribers
    const idleMsg: WsMessage = { type: 'copilot:idle' };
    this.broadcast(stream, idleMsg);

    // Abort SDK session
    if (stream.session) {
      try {
        await this.sessionManager.abortMessage(stream.session);
      } catch (err) {
        log.error({ err, conversationId }, 'Failed to abort stream');
      }
    }

    this.emit('stream:idle', conversationId);
  }

  getActiveStreamIds(): string[] {
    return [...this.streams.entries()]
      .filter(([, s]) => s.status === 'running')
      .map(([id]) => id);
  }

  async shutdownAll(timeout = 10_000): Promise<void> {
    this.isShuttingDown = true;
    log.info({ activeStreams: this.streams.size }, 'Shutting down all streams');

    const abortPromises: Promise<void>[] = [];
    for (const [conversationId, stream] of this.streams) {
      if (stream.status === 'running') {
        persistAccumulated(this.repo, conversationId, stream.accumulation);
        stream.accumulation = createEmptyAccumulation();
        stream.status = 'idle';
        stream.relay.detach();
      }
    }

    // Wait for all abort operations or timeout
    await Promise.race([
      Promise.all(abortPromises),
      new Promise<void>((resolve) => setTimeout(resolve, timeout)),
    ]);

    this.streams.clear();
    log.info('All streams shut down');
  }

  private processEvent(stream: ConversationStream, msg: WsMessage): void {
    const msgData = (msg.data ?? {}) as Record<string, unknown>;

    switch (msg.type) {
      case 'copilot:delta': {
        const messageId = msgData.messageId as string | undefined;
        if (messageId && stream.seenMessageIds.has(messageId)) return;
        break;
      }
      case 'copilot:message': {
        const content = (msgData.content as string) ?? '';
        const messageId = msgData.messageId as string | undefined;
        if (messageId && stream.seenMessageIds.has(messageId)) return;
        if (messageId) stream.seenMessageIds.add(messageId);
        if (content) {
          stream.accumulation.contentSegments.push(content);
          stream.accumulation.turnSegments.push({ type: 'text', content });
        }
        break;
      }
      case 'copilot:tool_start': {
        const toolCallId = msgData.toolCallId as string;
        if (toolCallId && stream.seenToolCallIds.has(toolCallId)) return;
        if (toolCallId) stream.seenToolCallIds.add(toolCallId);
        const toolRecord: ToolRecord = {
          toolCallId,
          toolName: msgData.toolName as string,
          arguments: msgData.arguments,
          status: 'running',
        };
        stream.accumulation.toolRecords.push(toolRecord);
        stream.accumulation.turnSegments.push({
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
        const record = stream.accumulation.toolRecords.find((r) => r.toolCallId === toolCallId);
        if (!record) return;
        record.status = success ? 'success' : 'error';
        if (success) record.result = msgData.result;
        else record.error = msgData.error as string;
        const segment = stream.accumulation.turnSegments.find(
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
        if (reasoningId && stream.seenReasoningIds.has(reasoningId)) return;
        const content = (msgData.content as string) ?? '';
        if (content) stream.accumulation.reasoningText += content;
        break;
      }
      case 'copilot:reasoning': {
        const reasoningId = msgData.reasoningId as string | undefined;
        if (reasoningId && stream.seenReasoningIds.has(reasoningId)) return;
        if (reasoningId) stream.seenReasoningIds.add(reasoningId);
        const content = (msgData.content as string) ?? '';
        if (content && !stream.accumulation.reasoningText) {
          stream.accumulation.reasoningText = content;
        }
        if (stream.accumulation.reasoningText) {
          const segment: TurnSegment = {
            type: 'reasoning',
            content: stream.accumulation.reasoningText,
          };
          // Insert before first text segment to maintain canonical order
          // (reasoning complete event may arrive after message complete)
          const firstTextIdx = stream.accumulation.turnSegments.findIndex((s) => s.type === 'text');
          if (firstTextIdx >= 0) {
            stream.accumulation.turnSegments.splice(firstTextIdx, 0, segment);
          } else {
            stream.accumulation.turnSegments.push(segment);
          }
        }
        break;
      }
      case 'copilot:idle': {
        persistAccumulated(this.repo, stream.conversationId, stream.accumulation);
        stream.accumulation = createEmptyAccumulation();
        stream.status = 'idle';
        stream.relay.detach();
        this.emit('stream:idle', stream.conversationId);

        // Clean up after broadcasting so the conversation can start a new stream
        // (broadcast happens below, after the switch)
        queueMicrotask(() => {
          this.streams.delete(stream.conversationId);
        });
        break;
      }
      case 'copilot:error': {
        stream.status = 'error';
        break;
      }
    }

    // Enrich the event with conversationId so frontend can route it
    const enrichedMsg: WsMessage = {
      ...msg,
      data: { ...((msg.data as Record<string, unknown>) ?? {}), conversationId: stream.conversationId },
    };

    // Buffer the enriched event
    stream.eventBuffer.push(enrichedMsg);

    // Forward to all subscribers
    this.broadcast(stream, enrichedMsg);
  }

  private broadcast(stream: ConversationStream, msg: WsMessage): void {
    for (const send of stream.subscribers) {
      try {
        send(msg);
      } catch (err) {
        log.error({ err }, 'Error broadcasting to subscriber');
      }
    }
  }
}
