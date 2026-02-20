import type { SessionManager } from '../copilot/session-manager.js';
import { autoApprovePermission } from '../copilot/permission.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('background-session-runner');

export interface BackgroundRunOptions {
  prompt: string;
  model: string;
  workingDirectory: string;
  tools?: any[];
  skillDirectories?: string[];
  disabledSkills?: string[];
  timeoutMs?: number;
}

export interface ToolRecord {
  toolCallId: string;
  toolName: string;
  arguments?: unknown;
  status: 'success' | 'error';
  result?: string;
  error?: string;
}

export interface TurnSegment {
  type: 'text' | 'tool' | 'reasoning';
  content?: string;
  toolCallId?: string;
  toolName?: string;
}

export interface BackgroundExecutionResult {
  turnSegments: TurnSegment[];
  toolRecords: ToolRecord[];
  contentSegments: string[];
  reasoningText: string;
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class BackgroundSessionRunner {
  constructor(private sessionManager: SessionManager) {}

  async run(options: BackgroundRunOptions): Promise<BackgroundExecutionResult> {
    const result: BackgroundExecutionResult = {
      turnSegments: [],
      toolRecords: [],
      contentSegments: [],
      reasoningText: '',
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    };

    let session: any;
    try {
      session = await this.sessionManager.createSession({
        model: options.model,
        workingDirectory: options.workingDirectory,
        tools: options.tools,
        skillDirectories: options.skillDirectories,
        disabledSkills: options.disabledSkills,
        onPermissionRequest: autoApprovePermission,
      });
      log.info({ sessionId: session.sessionId, model: options.model }, 'Background session created');
    } catch (err: any) {
      log.error({ err: err.message }, 'Failed to create background session');
      result.error = err.message ?? String(err);
      return result;
    }

    const unsubscribes: (() => void)[] = [];
    let sessionError: string | undefined;
    const reasoningDeltas: string[] = [];

    // Create a promise that resolves when session.idle fires (turn complete)
    const idlePromise = new Promise<void>((resolve) => {
      unsubscribes.push(
        session.on('session.idle', () => {
          log.info('Background session idle — turn complete');
          resolve();
        }),
      );
    });

    // Collect assistant messages (complete messages, not deltas)
    unsubscribes.push(
      session.on('assistant.message', (event: any) => {
        const d = event?.data ?? event;
        const content = d?.content ?? '';
        if (content) {
          result.contentSegments.push(content);
          result.turnSegments.push({ type: 'text', content });
        }
      }),
    );

    // Also collect deltas for real-time content accumulation
    const contentDeltas: string[] = [];
    unsubscribes.push(
      session.on('assistant.message_delta', (event: any) => {
        const d = event?.data ?? event;
        const content = d?.deltaContent ?? d?.delta ?? d?.content ?? '';
        if (content) contentDeltas.push(content);
      }),
    );

    // Collect reasoning
    unsubscribes.push(
      session.on('assistant.reasoning_delta', (event: any) => {
        const d = event?.data ?? event;
        const content = d?.deltaContent ?? d?.delta ?? d?.content ?? '';
        if (content) reasoningDeltas.push(content);
      }),
    );

    // Collect tool starts
    const pendingTools = new Map<string, { toolName: string; arguments?: unknown }>();
    unsubscribes.push(
      session.on('tool.execution_start', (event: any) => {
        const d = event?.data ?? event;
        pendingTools.set(d.toolCallId, { toolName: d.toolName, arguments: d.arguments });
      }),
    );

    // Collect tool completions
    unsubscribes.push(
      session.on('tool.execution_complete', (event: any) => {
        const d = event?.data ?? event;
        const pending = pendingTools.get(d.toolCallId);
        const record: ToolRecord = {
          toolCallId: d.toolCallId,
          toolName: pending?.toolName ?? 'unknown',
          arguments: pending?.arguments,
          status: d.success ? 'success' : 'error',
        };
        if (d.success) {
          record.result = typeof d.result === 'string' ? d.result : JSON.stringify(d.result);
        } else {
          record.error = typeof d.error === 'string' ? d.error : d.error?.message ?? JSON.stringify(d.error);
        }
        result.toolRecords.push(record);
        result.turnSegments.push({
          type: 'tool',
          toolCallId: d.toolCallId,
          toolName: pending?.toolName ?? 'unknown',
          content: record.result ?? record.error,
        });
        pendingTools.delete(d.toolCallId);
      }),
    );

    // Collect usage
    unsubscribes.push(
      session.on('assistant.usage', (event: any) => {
        const d = event?.data ?? event;
        result.usage.inputTokens += d.inputTokens ?? 0;
        result.usage.outputTokens += d.outputTokens ?? 0;
        result.usage.cacheReadTokens += d.cacheReadTokens ?? 0;
        result.usage.cacheWriteTokens += d.cacheWriteTokens ?? 0;
      }),
    );

    // Capture errors
    unsubscribes.push(
      session.on('session.error', (event: any) => {
        const d = event?.data ?? event;
        sessionError = d?.message ?? 'Unknown session error';
        log.error({ error: sessionError }, 'Background session error event');
      }),
    );

    // Send the prompt — session.send() returns a turn ID immediately,
    // the actual execution happens asynchronously via events.
    // We wait for session.idle to know when the turn is truly complete.
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    try {
      // Fire the prompt (returns turn ID, not response text)
      const turnId = await session.send({ prompt: options.prompt });
      log.info({ turnId }, 'Background session prompt sent, waiting for idle...');

      // Wait for idle (turn complete) or timeout
      await Promise.race([
        idlePromise,
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Background session timeout after ${timeoutMs}ms`)), timeoutMs);
        }),
      ]);

      log.info(
        {
          contentSegments: result.contentSegments.length,
          contentDeltas: contentDeltas.length,
          toolRecords: result.toolRecords.length,
          usage: result.usage,
        },
        'Background session completed successfully',
      );
    } catch (err: any) {
      const msg = err.message ?? String(err);
      log.error({ err: msg }, 'Background session execution error');
      if (msg.includes('timeout')) {
        try { await session.abort(); } catch { /* best effort */ }
      }
      result.error = msg;
    }

    // Finalize reasoning
    result.reasoningText = reasoningDeltas.join('');
    if (reasoningDeltas.length > 0) {
      result.turnSegments.unshift({ type: 'reasoning', content: result.reasoningText });
    }
    if (sessionError && !result.error) {
      result.error = sessionError;
    }

    // If assistant.message didn't capture content, use accumulated deltas
    if (result.contentSegments.length === 0 && contentDeltas.length > 0) {
      const fullContent = contentDeltas.join('');
      log.info({ length: fullContent.length }, 'Using message deltas as fallback content');
      result.contentSegments.push(fullContent);
      result.turnSegments.push({ type: 'text', content: fullContent });
    }

    // Cleanup listeners
    for (const unsub of unsubscribes) unsub();

    return result;
  }
}
