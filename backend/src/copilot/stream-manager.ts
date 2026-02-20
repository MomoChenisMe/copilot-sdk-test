import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CopilotSession } from '@github/copilot-sdk';
import type { SessionManager } from './session-manager.js';
import type { ConversationRepository } from '../conversation/repository.js';
import { EventRelay } from './event-relay.js';
import type { WsMessage, SendFn } from '../ws/types.js';
import type { PromptComposer } from '../prompts/composer.js';
import { createPermissionHandler } from './permission.js';
import { writePlanFile, extractTopicFromContent } from './plan-writer.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('stream-manager');

const USER_INPUT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface PendingUserInputRequestData {
  requestId: string;
  question: string;
  choices?: string[];
  allowFreeform: boolean;
  multiSelect?: boolean;
}

interface PendingUserInput {
  resolve: (value: { answer: string; wasFreeform: boolean }) => void;
  reject: (reason: Error) => void;
  timeoutId: ReturnType<typeof setTimeout> | null;
  requestData: PendingUserInputRequestData;
  /** Remaining timeout ms when paused (null = not paused) */
  remainingMs: number | null;
  /** Timestamp when timeout was last started/resumed */
  timeoutStartedAt: number;
}

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

export interface QuotaCache {
  used: number;
  total: number;
  resetDate: string | null;
  unlimited: boolean;
  updatedAt: string;
}

interface UsageAccumulation {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

interface AccumulationState {
  contentSegments: string[];
  toolRecords: ToolRecord[];
  reasoningText: string;
  turnSegments: TurnSegment[];
  usage: UsageAccumulation;
}

function createEmptyAccumulation(): AccumulationState {
  return {
    contentSegments: [],
    toolRecords: [],
    reasoningText: '',
    turnSegments: [],
    usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
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
  if (state.usage.inputTokens > 0 || state.usage.outputTokens > 0) {
    const usageMeta: Record<string, number> = {
      inputTokens: state.usage.inputTokens,
      outputTokens: state.usage.outputTokens,
    };
    if (state.usage.cacheReadTokens > 0) usageMeta.cacheReadTokens = state.usage.cacheReadTokens;
    if (state.usage.cacheWriteTokens > 0) usageMeta.cacheWriteTokens = state.usage.cacheWriteTokens;
    metadata.usage = usageMeta;
  }

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
  mode: 'plan' | 'act';
  cwd: string;
  startedAt: string;
  accumulation: AccumulationState;
  eventBuffer: WsMessage[];
  subscribers: Set<SendFn>;
  relay: EventRelay;
  seenMessageIds: Set<string>;
  seenToolCallIds: Set<string>;
  seenReasoningIds: Set<string>;
  pendingUserInputRequests: Map<string, PendingUserInput>;
}

export interface StreamManagerDeps {
  sessionManager: SessionManager;
  repo: ConversationRepository;
  maxConcurrency?: number;
  promptComposer?: PromptComposer;
  skillStore?: { getSkillDirectories(): string[] };
  selfControlTools?: any[];
  getMcpTools?: () => Promise<any[]>;
}

export interface FileReference {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
}

export interface StartStreamOptions {
  prompt: string;
  sdkSessionId: string | null;
  model: string;
  cwd: string;
  disabledSkills?: string[];
  files?: FileReference[];
  mode?: 'plan' | 'act';
  locale?: string;
}

export class StreamManager extends EventEmitter {
  private static instance: StreamManager | null = null;
  static sessionConversationMap = new Map<string, string>();
  private streams = new Map<string, ConversationStream>();
  private maxConcurrency: number;
  private isShuttingDown = false;
  private sessionManager: SessionManager;
  private repo: ConversationRepository;
  private promptComposer?: PromptComposer;
  private skillStore?: { getSkillDirectories(): string[] };
  private selfControlTools?: any[];
  private getMcpTools?: () => Promise<any[]>;
  private quotaCache: QuotaCache | null = null;

  private constructor(deps: StreamManagerDeps) {
    super();
    this.sessionManager = deps.sessionManager;
    this.repo = deps.repo;
    this.maxConcurrency = deps.maxConcurrency ?? 3;
    this.promptComposer = deps.promptComposer;
    this.skillStore = deps.skillStore;
    this.selfControlTools = deps.selfControlTools;
    this.getMcpTools = deps.getMcpTools;
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
    StreamManager.sessionConversationMap.clear();
  }

  updateSelfControlTools(tools: any[]): void {
    this.selfControlTools = tools;
  }

  updateQuotaCache(data: { used: number; total: number; resetDate: string | null; unlimited: boolean }): void {
    this.quotaCache = {
      used: data.used,
      total: data.total,
      resetDate: data.resetDate,
      unlimited: data.unlimited,
      updatedAt: new Date().toISOString(),
    };
  }

  getQuota(): QuotaCache | null {
    return this.quotaCache;
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
      mode: options.mode ?? 'act',
      cwd: options.cwd, // Updated to resolvedCwd below
      startedAt: new Date().toISOString(),
      accumulation: createEmptyAccumulation(),
      eventBuffer: [],
      subscribers: new Set(),
      relay: null as any, // Set below
      seenMessageIds: new Set(),
      seenToolCallIds: new Set(),
      seenReasoningIds: new Set(),
      pendingUserInputRequests: new Map(),
    };

    // Build accumulatingSend for this stream
    const accumulatingSend = (msg: WsMessage) => {
      this.processEvent(stream, msg);
    };

    stream.relay = new EventRelay(accumulatingSend);
    this.streams.set(conversationId, stream);

    // Async: get/create session and send message
    try {
      const permissionHandler = createPermissionHandler(() => stream.mode);

      const userInputHandler = (
        request: { question: string; choices?: string[]; allowFreeform?: boolean; multiSelect?: boolean },
        _invocation: { sessionId: string },
      ): Promise<{ answer: string; wasFreeform: boolean }> => {
        return new Promise((resolve, reject) => {
          const requestId = randomUUID();
          const requestData: PendingUserInputRequestData = {
            requestId,
            question: request.question,
            choices: request.choices,
            allowFreeform: request.allowFreeform ?? true,
            multiSelect: request.multiSelect,
          };

          const timeoutCallback = () => {
            stream.pendingUserInputRequests.delete(requestId);
            // Broadcast timeout event before rejecting
            this.broadcast(stream, {
              type: 'copilot:user_input_timeout',
              data: {
                requestId,
                conversationId: stream.conversationId,
                question: request.question,
                choices: request.choices,
                allowFreeform: request.allowFreeform ?? true,
              },
            });
            reject(new Error('User input request timed out'));
          };

          const hasSubscribers = stream.subscribers.size > 0;
          const timeoutId = hasSubscribers ? setTimeout(timeoutCallback, USER_INPUT_TIMEOUT_MS) : null;

          const pendingEntry: PendingUserInput = {
            resolve,
            reject,
            timeoutId,
            requestData,
            remainingMs: hasSubscribers ? null : USER_INPUT_TIMEOUT_MS,
            timeoutStartedAt: hasSubscribers ? Date.now() : 0,
          };

          // Store the timeout callback for pause/resume
          (pendingEntry as any)._timeoutCallback = timeoutCallback;

          stream.pendingUserInputRequests.set(requestId, pendingEntry);

          const msg: WsMessage = {
            type: 'copilot:user_input_request',
            data: {
              requestId,
              question: request.question,
              choices: request.choices,
              allowFreeform: request.allowFreeform ?? true,
              multiSelect: request.multiSelect,
              conversationId: stream.conversationId,
            },
          };
          this.broadcast(stream, msg);
        });
      };

      // Resolve CWD: expand ~ to home directory, ensure absolute path, validate existence
      let resolvedCwd = options.cwd;
      if (!resolvedCwd || resolvedCwd === '~') {
        resolvedCwd = homedir();
      } else if (resolvedCwd.startsWith('~/')) {
        resolvedCwd = resolve(homedir(), resolvedCwd.slice(2));
      }
      if (!existsSync(resolvedCwd)) {
        log.warn({ cwd: resolvedCwd, original: options.cwd }, 'CWD does not exist, falling back to home directory');
        resolvedCwd = homedir();
      }
      stream.cwd = resolvedCwd;

      const sessionOpts: Parameters<typeof this.sessionManager.getOrCreateSession>[0] = {
        sdkSessionId: options.sdkSessionId,
        model: options.model,
        workingDirectory: resolvedCwd,
        onPermissionRequest: permissionHandler,
        onUserInputRequest: userInputHandler,
      };

      if (this.promptComposer) {
        const composed = this.promptComposer.compose(resolvedCwd, options.locale);
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

      // Merge self-control tools and MCP tools
      const allTools: any[] = [...(this.selfControlTools ?? [])];
      if (this.getMcpTools) {
        try {
          const mcpTools = await this.getMcpTools();
          allTools.push(...mcpTools);
        } catch (err) {
          // MCP tools failure shouldn't block the stream
        }
      }
      if (allTools.length > 0) {
        sessionOpts.tools = allTools;
      }

      const session = await this.sessionManager.getOrCreateSession(sessionOpts);

      // Persist the SDK session ID so future messages resume the same session
      if (!options.sdkSessionId && session.sessionId) {
        this.repo.update(conversationId, { sdkSessionId: session.sessionId });
      }

      stream.session = session;
      StreamManager.sessionConversationMap.set(session.sessionId, conversationId);
      stream.relay.attach(session);

      await this.sessionManager.sendMessage(session, options.prompt, options.files);
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

    const wasEmpty = stream.subscribers.size === 0;
    stream.subscribers.add(send);

    // Resume paused user input timeouts when first subscriber arrives
    if (wasEmpty) {
      this.resumePendingTimeouts(stream);
    }

    // Return unsubscribe function
    return () => {
      stream.subscribers.delete(send);

      // Pause user input timeouts when last subscriber leaves
      if (stream.subscribers.size === 0) {
        this.pausePendingTimeouts(stream);
      }
    };
  }

  async abortStream(conversationId: string): Promise<void> {
    const stream = this.streams.get(conversationId);
    if (!stream || stream.status !== 'running') return;

    // Reject all pending user input requests
    for (const [id, pending] of stream.pendingUserInputRequests) {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error('Stream aborted'));
    }
    stream.pendingUserInputRequests.clear();

    // Clean up session-conversation mapping
    if (stream.session?.sessionId) {
      StreamManager.sessionConversationMap.delete(stream.session.sessionId);
    }

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

  handleUserInputResponse(conversationId: string, requestId: string, answer: string, wasFreeform: boolean): void {
    const stream = this.streams.get(conversationId);
    if (!stream) return;

    const pending = stream.pendingUserInputRequests.get(requestId);
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    stream.pendingUserInputRequests.delete(requestId);
    pending.resolve({ answer, wasFreeform });
  }

  setMode(conversationId: string, mode: 'plan' | 'act'): void {
    const stream = this.streams.get(conversationId);
    if (!stream) return;

    stream.mode = mode;
    const msg: WsMessage = {
      type: 'copilot:mode_changed',
      data: { mode, conversationId },
    };
    this.broadcast(stream, msg);
  }

  getActiveStreamIds(): string[] {
    return [...this.streams.entries()]
      .filter(([, s]) => s.status === 'running')
      .map(([id]) => id);
  }

  getPendingUserInputs(conversationId: string): PendingUserInputRequestData[] {
    const stream = this.streams.get(conversationId);
    if (!stream) return [];
    return [...stream.pendingUserInputRequests.values()].map((p) => p.requestData);
  }

  getFullState(): {
    activeStreams: { conversationId: string; status: string; startedAt: string }[];
    pendingUserInputs: (PendingUserInputRequestData & { conversationId: string })[];
  } {
    const activeStreams: { conversationId: string; status: string; startedAt: string }[] = [];
    const pendingUserInputs: (PendingUserInputRequestData & { conversationId: string })[] = [];

    for (const [, stream] of this.streams) {
      if (stream.status === 'running') {
        activeStreams.push({
          conversationId: stream.conversationId,
          status: stream.status,
          startedAt: stream.startedAt,
        });
      }

      for (const [, pending] of stream.pendingUserInputRequests) {
        pendingUserInputs.push({
          ...pending.requestData,
          conversationId: stream.conversationId,
        });
      }
    }

    return { activeStreams, pendingUserInputs };
  }

  async shutdownAll(timeout = 10_000): Promise<void> {
    this.isShuttingDown = true;
    log.info({ activeStreams: this.streams.size }, 'Shutting down all streams');

    const abortPromises: Promise<void>[] = [];
    for (const [conversationId, stream] of this.streams) {
      // Reject all pending user input requests
      for (const [, pending] of stream.pendingUserInputRequests) {
        clearTimeout(pending.timeoutId);
        pending.reject(new Error('Stream aborted'));
      }
      stream.pendingUserInputRequests.clear();

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

  private pausePendingTimeouts(stream: ConversationStream): void {
    for (const [, pending] of stream.pendingUserInputRequests) {
      if (pending.timeoutId != null) {
        clearTimeout(pending.timeoutId);
        const elapsed = Date.now() - pending.timeoutStartedAt;
        pending.remainingMs = Math.max(0, (pending.remainingMs ?? USER_INPUT_TIMEOUT_MS) - elapsed);
        pending.timeoutId = null;
      }
    }
  }

  private resumePendingTimeouts(stream: ConversationStream): void {
    for (const [, pending] of stream.pendingUserInputRequests) {
      if (pending.timeoutId == null && pending.remainingMs != null && pending.remainingMs > 0) {
        const cb = (pending as any)._timeoutCallback as () => void;
        pending.timeoutStartedAt = Date.now();
        pending.timeoutId = setTimeout(cb, pending.remainingMs);
        pending.remainingMs = null;
      }
    }
  }

  private processEvent(stream: ConversationStream, msg: WsMessage): void {
    const msgData = (msg.data ?? {}) as Record<string, unknown>;
    let extraData: Record<string, unknown> | null = null;

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
        if (success) {
          record.result = msgData.result;
        } else {
          const rawError = msgData.error;
          record.error = typeof rawError === 'string'
            ? rawError
            : (rawError as any)?.message ?? JSON.stringify(rawError);
        }
        const segment = stream.accumulation.turnSegments.find(
          (s) => s.type === 'tool' && s.toolCallId === toolCallId,
        );
        if (segment) {
          segment.status = success ? 'success' : 'error';
          if (success) segment.result = msgData.result;
          else segment.error = record.error; // Use already-normalized string
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
          // Replace any existing reasoning segment to avoid duplicates
          const existingIdx = stream.accumulation.turnSegments.findIndex((s) => s.type === 'reasoning');
          if (existingIdx >= 0) {
            stream.accumulation.turnSegments[existingIdx] = segment;
          } else {
            // Insert before first text segment to maintain canonical order
            const firstTextIdx = stream.accumulation.turnSegments.findIndex((s) => s.type === 'text');
            if (firstTextIdx >= 0) {
              stream.accumulation.turnSegments.splice(firstTextIdx, 0, segment);
            } else {
              stream.accumulation.turnSegments.push(segment);
            }
          }
        }
        break;
      }
      case 'copilot:usage': {
        const input = (msgData.inputTokens as number) ?? 0;
        const output = (msgData.outputTokens as number) ?? 0;
        stream.accumulation.usage.inputTokens += input;
        stream.accumulation.usage.outputTokens += output;
        if (msgData.cacheReadTokens != null) {
          stream.accumulation.usage.cacheReadTokens += msgData.cacheReadTokens as number;
        }
        if (msgData.cacheWriteTokens != null) {
          stream.accumulation.usage.cacheWriteTokens += msgData.cacheWriteTokens as number;
        }
        break;
      }
      case 'copilot:quota': {
        const snapshots = msgData.quotaSnapshots as any[] | undefined;
        if (snapshots?.length) {
          const pr = snapshots.find((s: any) => s.type === 'premiumRequests');
          if (pr) {
            this.updateQuotaCache({
              used: pr.used ?? 0,
              total: pr.limit ?? 0,
              resetDate: pr.resetsAt ?? null,
              unlimited: (pr.limit ?? 0) === 0,
            });
          }
        }
        break;
      }
      case 'copilot:idle': {
        // Write plan file if in plan mode and there is accumulated content
        if (stream.mode === 'plan') {
          const planContent = stream.accumulation.contentSegments.join('');
          if (planContent.length > 0) {
            try {
              const topic = extractTopicFromContent(planContent);
              const planFilePath = writePlanFile(stream.cwd, planContent, topic);
              this.repo.update(stream.conversationId, { planFilePath });
              extraData = { planFilePath };
            } catch (err) {
              log.error({ err, conversationId: stream.conversationId }, 'Failed to write plan file');
            }
          }
        }

        persistAccumulated(this.repo, stream.conversationId, stream.accumulation);
        stream.accumulation = createEmptyAccumulation();
        stream.status = 'idle';
        stream.relay.detach();
        this.emit('stream:idle', stream.conversationId);

        // Clean up session-conversation mapping
        if (stream.session?.sessionId) {
          StreamManager.sessionConversationMap.delete(stream.session.sessionId);
        }

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
      data: {
        ...((msg.data as Record<string, unknown>) ?? {}),
        conversationId: stream.conversationId,
        ...(extraData ?? {}),
      },
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
