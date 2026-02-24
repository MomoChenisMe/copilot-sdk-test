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
  /** Map toolCallId → toolName for the entire stream lifetime.
   *  Used to enrich copilot:tool_end events with toolName
   *  (the SDK doesn't include it in tool.execution_complete). */
  toolNameMap: Map<string, string>;
  pendingUserInputRequests: Map<string, PendingUserInput>;
  /** True once any copilot:idle event has been processed during this stream */
  idleReceived: boolean;
  /** True once session.send() (sendMessage) has resolved or errored */
  sendComplete: boolean;
  /** Extra data accumulated from premature idle events (planFilePath, planArtifact, etc.)
   *  to be included in the final copilot:idle broadcast when the stream truly finishes. */
  pendingIdleExtra: Record<string, unknown> | null;
  /** Cleanup function for SDK session.plan_changed listener (plan mode only) */
  planChangedUnsub: (() => void) | null;
  /** Timestamp of last event received — used for health monitoring */
  lastEventAt: number;
  /** Interval handle for health monitoring */
  healthCheckInterval: ReturnType<typeof setInterval> | null;
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
  /** Subscriber to add synchronously during stream creation, before any async work */
  initialSubscriber?: SendFn;
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
      toolNameMap: new Map(),
      pendingUserInputRequests: new Map(),
      idleReceived: false,
      sendComplete: false,
      pendingIdleExtra: null,
      planChangedUnsub: null,
      lastEventAt: Date.now(),
      healthCheckInterval: null,
    };

    // Build accumulatingSend for this stream
    const accumulatingSend = (msg: WsMessage) => {
      this.processEvent(stream, msg);
    };

    stream.relay = new EventRelay(accumulatingSend);
    this.streams.set(conversationId, stream);

    // Add initial subscriber synchronously so it receives events from the very start
    if (options.initialSubscriber) {
      stream.subscribers.add(options.initialSubscriber);
    }

    // Async: get/create session and send message
    try {
      const permissionHandler = createPermissionHandler(() => stream.mode);

      const userInputHandler = (
        request: { question: string; choices?: string[]; allowFreeform?: boolean; multiSelect?: boolean },
        _invocation: { sessionId: string },
      ): Promise<{ answer: string; wasFreeform: boolean }> => {
        // Persist accumulated assistant response so far to the database.
        // This ensures the partial response (reasoning, tool calls, text) is saved
        // even if the user closes the browser tab while ask_user is waiting.
        try {
          persistAccumulated(this.repo, stream.conversationId, stream.accumulation);
          stream.accumulation = createEmptyAccumulation();
          // Trim event buffer: only keep pending user_input_request events
          stream.eventBuffer = stream.eventBuffer.filter(
            (e) => e.type === 'copilot:user_input_request' &&
              stream.pendingUserInputRequests.has((e.data as any)?.requestId),
          );
        } catch (err) {
          log.error({ err, conversationId: stream.conversationId }, 'Failed to persist accumulation before ask_user');
          // Reset accumulation anyway so stale data doesn't accumulate
          stream.accumulation = createEmptyAccumulation();
        }

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
          // Add to eventBuffer so reconnecting subscribers receive it via replay
          stream.eventBuffer.push(msg);
          log.debug({ conversationId: stream.conversationId, requestId, subscribers: stream.subscribers.size }, 'Broadcasting copilot:user_input_request');
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
        const composed = this.promptComposer.compose(resolvedCwd, options.locale, options.mode);
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

      // Activate SDK plan mode via RPC and register plan_changed listener
      if (stream.mode === 'plan') {
        try {
          await this.sessionManager.setMode(session, 'plan');
          log.info({ conversationId }, 'SDK plan mode activated');
        } catch (err) {
          log.warn({ err, conversationId }, 'Failed to set SDK plan mode via RPC — falling back to prompt-only plan mode');
        }
        stream.planChangedUnsub = this.registerPlanChangedListener(stream);
      }

      // Start health monitoring: warn if no events received for an extended period
      stream.healthCheckInterval = setInterval(() => {
        const elapsed = Date.now() - stream.lastEventAt;
        if (elapsed > 120_000 && stream.status === 'running') {
          log.warn({ conversationId, elapsedMs: elapsed }, 'No events received for 120s — stream may be stalled');
          this.broadcast(stream, {
            type: 'copilot:warning',
            data: { conversationId, message: 'Stream may be stalled — no events for 2 minutes' },
          });
        }
      }, 60_000);

      await this.sessionManager.sendMessage(session, options.prompt, options.files);

      // session.send() resolved — mark send as complete and clean up if idle was already received
      stream.sendComplete = true;
      if (stream.idleReceived) {
        this.finishStream(conversationId);
      }
    } catch (err) {
      log.error({ err, conversationId }, 'Failed to start stream');
      stream.status = 'error';
      const errorMsg: WsMessage = {
        type: 'copilot:error',
        data: { message: err instanceof Error ? err.message : 'Unknown error' },
      };
      this.broadcast(stream, errorMsg);

      // Clean up on error
      stream.sendComplete = true;
      this.finishStream(conversationId);
      throw err;
    }
  }

  subscribe(conversationId: string, send: SendFn, options?: { skipReplay?: boolean }): (() => void) | null {
    const stream = this.streams.get(conversationId);
    if (!stream) return null;

    // Catch-up: replay eventBuffer (skip when caller already has context, e.g. user_input_response)
    if (!options?.skipReplay) {
      for (const msg of stream.eventBuffer) {
        send(msg);
      }
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

  hasStream(conversationId: string): boolean {
    return this.streams.has(conversationId);
  }

  removeSubscriber(conversationId: string, send: SendFn): void {
    const stream = this.streams.get(conversationId);
    if (!stream) return;

    stream.subscribers.delete(send);

    // Pause user input timeouts when last subscriber leaves
    if (stream.subscribers.size === 0) {
      this.pausePendingTimeouts(stream);
    }
  }

  /**
   * Final cleanup: detach relay and remove stream from map.
   * Called only when BOTH idleReceived and sendComplete are true.
   */
  private finishStream(conversationId: string): void {
    const stream = this.streams.get(conversationId);
    if (!stream || stream.status === 'idle') return; // Already cleaned up

    // Safety: do NOT finish the stream while there are still pending user input requests.
    // The SDK should resolve all tool calls before session.send() resolves, but guard
    // against edge cases where idleReceived + sendComplete are both true prematurely.
    if (stream.pendingUserInputRequests.size > 0) {
      log.warn({ conversationId, pending: stream.pendingUserInputRequests.size }, 'finishStream called while user input requests are pending — deferring');
      return;
    }

    log.debug({ conversationId, subscribers: stream.subscribers.size }, 'Finishing stream');

    // Clear health monitoring
    if (stream.healthCheckInterval) {
      clearInterval(stream.healthCheckInterval);
      stream.healthCheckInterval = null;
    }

    // Safety persist: ensure any remaining accumulated data is saved before cleanup
    persistAccumulated(this.repo, conversationId, stream.accumulation);
    stream.accumulation = createEmptyAccumulation();

    // Broadcast the final copilot:idle with accumulated extra data (planFilePath, planArtifact, etc.)
    // This is the ONLY place copilot:idle is broadcast — processEventInner suppresses premature idles.
    const idleMsg: WsMessage = {
      type: 'copilot:idle',
      data: {
        conversationId,
        ...(stream.pendingIdleExtra ?? {}),
      },
    };
    stream.eventBuffer.push(idleMsg);
    this.broadcast(stream, idleMsg);

    stream.status = 'idle';
    stream.relay.detach();

    // Clean up plan_changed listener
    if (stream.planChangedUnsub) {
      stream.planChangedUnsub();
      stream.planChangedUnsub = null;
    }

    if (stream.session?.sessionId) {
      StreamManager.sessionConversationMap.delete(stream.session.sessionId);
    }

    this.emit('stream:idle', stream.conversationId);

    // Use queueMicrotask so the broadcast can complete first
    queueMicrotask(() => {
      this.streams.delete(conversationId);
    });
  }

  async abortStream(conversationId: string): Promise<void> {
    const stream = this.streams.get(conversationId);
    if (!stream) return;

    const wasRunning = stream.status === 'running';

    // Clear health monitoring
    if (stream.healthCheckInterval) {
      clearInterval(stream.healthCheckInterval);
      stream.healthCheckInterval = null;
    }

    // Reject all pending user input requests
    for (const [, pending] of stream.pendingUserInputRequests) {
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

    // Detach event relay and plan_changed listener
    stream.relay.detach();
    if (stream.planChangedUnsub) {
      stream.planChangedUnsub();
      stream.planChangedUnsub = null;
    }

    // Notify subscribers
    const idleMsg: WsMessage = {
      type: 'copilot:idle',
      data: {
        conversationId,
        ...(stream.pendingIdleExtra ?? {}),
      },
    };
    this.broadcast(stream, idleMsg);

    // Abort SDK session only if was running
    if (wasRunning && stream.session) {
      try {
        await this.sessionManager.abortMessage(stream.session);
      } catch (err) {
        log.error({ err, conversationId }, 'Failed to abort stream');
      }
    }

    // Always remove from map so a new stream can start
    this.streams.delete(conversationId);

    this.emit('stream:idle', conversationId);
  }

  handleUserInputResponse(conversationId: string, requestId: string, answer: string, wasFreeform: boolean): void {
    const stream = this.streams.get(conversationId);
    if (!stream) {
      log.warn({ conversationId, requestId }, 'handleUserInputResponse: stream not found');
      return;
    }

    const pending = stream.pendingUserInputRequests.get(requestId);
    if (!pending) {
      log.warn({ conversationId, requestId }, 'handleUserInputResponse: pending request not found');
      return;
    }

    log.debug({ conversationId, requestId, answer: answer.substring(0, 50) }, 'Resolving user input request');
    clearTimeout(pending.timeoutId);
    stream.pendingUserInputRequests.delete(requestId);
    pending.resolve({ answer, wasFreeform });
  }

  setMode(conversationId: string, mode: 'plan' | 'act'): void {
    const stream = this.streams.get(conversationId);
    if (!stream) return;

    stream.mode = mode;

    // Sync mode with SDK via RPC (fire-and-forget)
    if (stream.session) {
      const sdkMode = mode === 'plan' ? 'plan' : 'interactive';
      this.sessionManager.setMode(stream.session, sdkMode).catch((err: unknown) => {
        log.warn({ err, conversationId }, 'Failed to set SDK mode via RPC');
      });

      // Manage plan_changed listener
      if (mode === 'plan' && !stream.planChangedUnsub) {
        stream.planChangedUnsub = this.registerPlanChangedListener(stream);
      } else if (mode !== 'plan' && stream.planChangedUnsub) {
        stream.planChangedUnsub();
        stream.planChangedUnsub = null;
      }
    }

    const msg: WsMessage = {
      type: 'copilot:mode_changed',
      data: { mode, conversationId },
    };
    this.broadcast(stream, msg);
  }

  /** Register a listener for SDK session.plan_changed events.
   *  When the SDK creates/updates plan.md, we read it, write to .codeforge/plans/, and store in pendingIdleExtra. */
  private registerPlanChangedListener(stream: ConversationStream): () => void {
    return stream.session.on('session.plan_changed', (event: any) => {
      const d = event?.data ?? event;
      if (d.operation === 'create' || d.operation === 'update') {
        this.sessionManager.readPlan(stream.session).then((planResult) => {
          if (planResult.exists && planResult.content) {
            const topic = extractTopicFromContent(planResult.content);
            const planFilePath = writePlanFile(stream.cwd, planResult.content, topic);
            this.repo.update(stream.conversationId, { planFilePath });
            stream.pendingIdleExtra = {
              ...(stream.pendingIdleExtra ?? {}),
              planFilePath,
              planArtifact: {
                title: topic || 'Implementation Plan',
                content: planResult.content,
                filePath: planFilePath,
              },
            };
          }
        }).catch((err: unknown) => {
          log.error({ err, conversationId: stream.conversationId }, 'Failed to read/write SDK plan');
        });
      }
    });
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
    activeStreams: { conversationId: string; status: string; startedAt: string; mode: string }[];
    pendingUserInputs: (PendingUserInputRequestData & { conversationId: string })[];
  } {
    const activeStreams: { conversationId: string; status: string; startedAt: string; mode: string }[] = [];
    const pendingUserInputs: (PendingUserInputRequestData & { conversationId: string })[] = [];

    for (const [, stream] of this.streams) {
      if (stream.status === 'running') {
        activeStreams.push({
          conversationId: stream.conversationId,
          status: stream.status,
          startedAt: stream.startedAt,
          mode: stream.mode,
        });
      }

      for (const [, pending] of stream.pendingUserInputRequests) {
        pendingUserInputs.push({
          ...pending.requestData,
          conversationId: stream.conversationId,
        });
      }
    }

    log.debug({
      totalStreams: this.streams.size,
      activeStreams: activeStreams.length,
      pendingUserInputs: pendingUserInputs.length,
      streamDetails: [...this.streams.values()].map(s => ({
        conversationId: s.conversationId,
        status: s.status,
        subscribers: s.subscribers.size,
        pendingRequests: s.pendingUserInputRequests.size,
        eventBufferLength: s.eventBuffer.length,
        idleReceived: s.idleReceived,
        sendComplete: s.sendComplete,
      })),
    }, 'getFullState called');

    return { activeStreams, pendingUserInputs };
  }

  async shutdownAll(timeout = 10_000): Promise<void> {
    this.isShuttingDown = true;
    log.info({ activeStreams: this.streams.size }, 'Shutting down all streams');

    const abortPromises: Promise<void>[] = [];
    for (const [conversationId, stream] of this.streams) {
      // Clear health monitoring
      if (stream.healthCheckInterval) {
        clearInterval(stream.healthCheckInterval);
        stream.healthCheckInterval = null;
      }

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
    // Update health monitoring timestamp
    stream.lastEventAt = Date.now();
    try {
      this.processEventInner(stream, msg);
    } catch (err) {
      log.error({ err, eventType: msg.type, conversationId: stream.conversationId }, 'Error processing event');
      // Still forward the raw event so the stream doesn't silently swallow it
      const fallbackMsg: WsMessage = {
        ...msg,
        data: {
          ...((msg.data as Record<string, unknown>) ?? {}),
          conversationId: stream.conversationId,
        },
      };
      stream.eventBuffer.push(fallbackMsg);
      this.broadcast(stream, fallbackMsg);
    }
  }

  private processEventInner(stream: ConversationStream, msg: WsMessage): void {
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
        const toolName = msgData.toolName as string;
        // Track toolCallId → toolName for the entire stream lifetime
        if (toolCallId && toolName) {
          stream.toolNameMap.set(toolCallId, toolName);
        }
        const toolRecord: ToolRecord = {
          toolCallId,
          toolName,
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
        // Enrich with toolName from our tracking map (SDK doesn't include it in tool_end)
        if (!msgData.toolName && toolCallId) {
          const trackedName = stream.toolNameMap.get(toolCallId);
          if (trackedName) {
            extraData = { ...(extraData ?? {}), toolName: trackedName };
          }
        }
        const normalizedError = (() => {
          if (success) return undefined;
          const rawError = msgData.error;
          return typeof rawError === 'string'
            ? rawError
            : (rawError as any)?.message ?? JSON.stringify(rawError);
        })();
        const record = stream.accumulation.toolRecords.find((r) => r.toolCallId === toolCallId);
        if (record) {
          record.status = success ? 'success' : 'error';
          if (success) {
            record.result = msgData.result;
          } else {
            record.error = normalizedError;
          }
          const segment = stream.accumulation.turnSegments.find(
            (s) => s.type === 'tool' && s.toolCallId === toolCallId,
          );
          if (segment) {
            segment.status = success ? 'success' : 'error';
            if (success) segment.result = msgData.result;
            else segment.error = normalizedError;
          }
        } else {
          // Tool record was already persisted (premature idle reset the accumulation).
          // Update the last assistant message in the DB to include the tool result.
          try {
            this.repo.updateToolResult(stream.conversationId, toolCallId, {
              status: success ? 'success' : 'error',
              result: success ? msgData.result : undefined,
              error: normalizedError,
            });
          } catch (err) {
            log.error({ err, conversationId: stream.conversationId, toolCallId }, 'Failed to update tool result in DB');
          }
        }
        // Always broadcast tool_end even if record was already persisted
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
        // Plan data is now managed by the SDK's plan mode via session.plan_changed listener
        // (registered in startStream / setMode). pendingIdleExtra is populated there.

        persistAccumulated(this.repo, stream.conversationId, stream.accumulation);
        stream.accumulation = createEmptyAccumulation();
        // Content has been persisted to DB — clear event buffer EXCEPT pending user_input_request events.
        // The SDK fires session.idle after each model turn, including BEFORE tools (like ask_user) execute.
        // If we blindly clear, a subsequent idle could wipe the user_input_request that handleAskUser added.
        stream.eventBuffer = stream.eventBuffer.filter(
          (e) => e.type === 'copilot:user_input_request' &&
            stream.pendingUserInputRequests.has((e.data as any)?.requestId),
        );

        stream.idleReceived = true;

        // Only do full cleanup when BOTH conditions are met:
        // 1. session.idle was received (idleReceived = true)
        // 2. session.send() has resolved (sendComplete = true)
        // This prevents premature cleanup when session.idle fires mid-turn (e.g., before ask_user).
        if (stream.sendComplete) {
          this.finishStream(stream.conversationId);
        }

        // CRITICAL: Do NOT broadcast copilot:idle to the frontend here.
        // The SDK fires session.idle after each model response, even when tools
        // (like ask_user) are still pending. Broadcasting premature idles causes
        // the frontend to clear streaming state and lose track of the active turn.
        // The real copilot:idle will be broadcast by finishStream() when the
        // stream truly ends (both idleReceived AND sendComplete).
        return;
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
    if (msg.type === 'copilot:user_input_request' || msg.type === 'copilot:tool_start' || msg.type === 'copilot:tool_end') {
      log.debug({ type: msg.type, conversationId: stream.conversationId, subscribers: stream.subscribers.size }, 'Broadcasting event');
    }
    if (stream.subscribers.size === 0 && (msg.type === 'copilot:tool_end' || msg.type === 'copilot:idle')) {
      log.warn({ type: msg.type, conversationId: stream.conversationId }, 'Broadcasting to 0 subscribers — frontend will not receive this event');
    }
    for (const send of stream.subscribers) {
      try {
        send(msg);
      } catch (err) {
        log.error({ err, type: msg.type }, 'Error broadcasting to subscriber');
      }
    }
  }
}
