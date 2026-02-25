import type { CopilotSession } from '@github/copilot-sdk';
import type { WsMessage } from '../ws/types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('event-relay');

/** Safely extract content with fallback chain */
function extractContent(data: any): string {
  return data.deltaContent ?? data.delta ?? data.content ?? '';
}

export class EventRelay {
  private unsubscribes: (() => void)[] = [];

  constructor(private send: (msg: WsMessage) => void) {}

  /** Wrap an event handler with try-catch so errors don't crash the stream */
  private safeHandler(eventName: string, handler: (event: any) => void): (event: any) => void {
    return (event: any) => {
      try {
        handler(event);
      } catch (err) {
        log.error({ err, eventName }, 'Error in event handler');
      }
    };
  }

  attach(session: CopilotSession): void {
    this.detach();

    this.unsubscribes.push(
      session.on('assistant.message_delta', this.safeHandler('assistant.message_delta', (event) => {
        const e = event as any;
        const d = e.data ?? e;
        log.debug({ event: e }, 'assistant.message_delta');
        this.send({
          type: 'copilot:delta',
          data: {
            messageId: d.messageId,
            content: extractContent(d),
          },
        });
      })),
    );

    this.unsubscribes.push(
      session.on('assistant.message', this.safeHandler('assistant.message', (event) => {
        const e = event as any;
        const d = e.data ?? e;
        log.debug({ event: e }, 'assistant.message');
        this.send({
          type: 'copilot:message',
          data: {
            messageId: d.messageId,
            content: d.content ?? '',
          },
        });
      })),
    );

    this.unsubscribes.push(
      session.on('assistant.reasoning_delta', this.safeHandler('assistant.reasoning_delta', (event) => {
        const e = event as any;
        const d = e.data ?? e;
        log.debug({ event: e }, 'assistant.reasoning_delta');
        this.send({
          type: 'copilot:reasoning_delta',
          data: {
            reasoningId: d.reasoningId,
            content: extractContent(d),
          },
        });
      })),
    );

    this.unsubscribes.push(
      session.on('assistant.reasoning', this.safeHandler('assistant.reasoning', (event) => {
        const e = event as any;
        const d = e.data ?? e;
        log.debug({ event: e }, 'assistant.reasoning');
        this.send({
          type: 'copilot:reasoning',
          data: {
            reasoningId: d.reasoningId,
            content: d.content ?? '',
          },
        });
      })),
    );

    this.unsubscribes.push(
      session.on('tool.execution_start', this.safeHandler('tool.execution_start', (event) => {
        const e = event as any;
        const d = e.data ?? e;
        log.debug({ event: e }, 'tool.execution_start');
        this.send({
          type: 'copilot:tool_start',
          data: {
            toolCallId: d.toolCallId,
            toolName: d.toolName,
            arguments: d.arguments,
          },
        });
      })),
    );

    this.unsubscribes.push(
      session.on('tool.execution_complete', this.safeHandler('tool.execution_complete', (event) => {
        const e = event as any;
        const d = e.data ?? e;
        log.debug({ event: e }, 'tool.execution_complete');
        const data: Record<string, unknown> = {
          toolCallId: d.toolCallId,
          success: d.success,
        };
        if (d.success) {
          data.result = d.result;
        } else {
          // SDK may return error as an object {message, code} — normalize to string
          data.error = typeof d.error === 'string'
            ? d.error
            : d.error?.message ?? JSON.stringify(d.error);
        }
        this.send({
          type: 'copilot:tool_end',
          data,
        });
      })),
    );

    this.unsubscribes.push(
      session.on('assistant.usage', this.safeHandler('assistant.usage', (event) => {
        const e = event as any;
        const d = e.data ?? e;
        log.debug({ event: e }, 'assistant.usage');
        const usageData: Record<string, unknown> = {
          inputTokens: d.inputTokens,
          outputTokens: d.outputTokens,
        };
        if (d.cacheReadTokens != null) usageData.cacheReadTokens = d.cacheReadTokens;
        if (d.cacheWriteTokens != null) usageData.cacheWriteTokens = d.cacheWriteTokens;
        if (d.model != null) usageData.model = d.model;
        if (d.cost != null) usageData.cost = d.cost;
        this.send({ type: 'copilot:usage', data: usageData });

        // Forward quota snapshots as a separate event
        if (d.quotaSnapshots) {
          this.send({
            type: 'copilot:quota',
            data: { quotaSnapshots: d.quotaSnapshots },
          });
        }
      })),
    );

    this.unsubscribes.push(
      session.on('session.usage_info', this.safeHandler('session.usage_info', (event) => {
        const e = event as any;
        const d = e.data ?? e;
        log.debug({ event: e }, 'session.usage_info');
        this.send({
          type: 'copilot:context_window',
          data: {
            contextWindowUsed: d.contextWindowUsed,
            contextWindowMax: d.contextWindowMax,
          },
        });
      })),
    );

    this.unsubscribes.push(
      session.on('session.compaction_start', this.safeHandler('session.compaction_start', () => {
        log.debug('session.compaction_start');
        this.send({ type: 'copilot:compaction_start' });
      })),
    );

    this.unsubscribes.push(
      session.on('session.compaction_complete', this.safeHandler('session.compaction_complete', () => {
        log.debug('session.compaction_complete');
        this.send({ type: 'copilot:compaction_complete' });
      })),
    );

    this.unsubscribes.push(
      session.on('session.shutdown', this.safeHandler('session.shutdown', (event) => {
        const e = event as any;
        const d = e.data ?? e;
        log.debug({ event: e }, 'session.shutdown');
        this.send({
          type: 'copilot:shutdown',
          data: {
            totalPremiumRequests: d.totalPremiumRequests,
            modelMetrics: d.modelMetrics,
          },
        });
      })),
    );

    this.unsubscribes.push(
      session.on('session.idle', this.safeHandler('session.idle', () => {
        log.debug('session.idle');
        this.send({ type: 'copilot:idle' });
      })),
    );

    // --- Subagent events (Fleet Mode) ---

    this.unsubscribes.push(
      session.on('subagent.started', this.safeHandler('subagent.started', (event) => {
        const e = event as any;
        const d = e.data ?? e;
        log.debug({ event: e }, 'subagent.started');
        this.send({
          type: 'copilot:subagent_started',
          data: {
            toolCallId: d.toolCallId,
            agentName: d.agentName,
            agentDisplayName: d.agentDisplayName,
            agentDescription: d.agentDescription,
          },
        });
      })),
    );

    this.unsubscribes.push(
      session.on('subagent.completed', this.safeHandler('subagent.completed', (event) => {
        const e = event as any;
        const d = e.data ?? e;
        log.debug({ event: e }, 'subagent.completed');
        this.send({
          type: 'copilot:subagent_completed',
          data: {
            toolCallId: d.toolCallId,
            agentName: d.agentName,
            agentDisplayName: d.agentDisplayName,
          },
        });
      })),
    );

    this.unsubscribes.push(
      session.on('subagent.failed', this.safeHandler('subagent.failed', (event) => {
        const e = event as any;
        const d = e.data ?? e;
        log.debug({ event: e }, 'subagent.failed');
        this.send({
          type: 'copilot:subagent_failed',
          data: {
            toolCallId: d.toolCallId,
            agentName: d.agentName,
            agentDisplayName: d.agentDisplayName,
            error: d.error,
          },
        });
      })),
    );

    this.unsubscribes.push(
      session.on('subagent.selected', this.safeHandler('subagent.selected', (event) => {
        const e = event as any;
        const d = e.data ?? e;
        log.debug({ event: e }, 'subagent.selected');
        this.send({
          type: 'copilot:subagent_selected',
          data: {
            agentName: d.agentName,
            agentDisplayName: d.agentDisplayName,
            tools: d.tools,
          },
        });
      })),
    );

    this.unsubscribes.push(
      session.on('session.plan_changed', this.safeHandler('session.plan_changed', (event) => {
        const e = event as any;
        const d = e.data ?? e;
        log.debug({ event: e }, 'session.plan_changed');
        this.send({
          type: 'copilot:plan_changed',
          data: {
            operation: d.operation,
          },
        });
      })),
    );

    this.unsubscribes.push(
      session.on('session.error', this.safeHandler('session.error', (event) => {
        const e = event as any;
        const d = e.data ?? e;
        log.error({ event: e }, 'session.error');
        this.send({
          type: 'copilot:error',
          data: {
            errorType: d.errorType ?? 'unknown',
            message: d.message ?? 'Unknown error',
          },
        });
      })),
    );
  }

  detach(): void {
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
  }
}
