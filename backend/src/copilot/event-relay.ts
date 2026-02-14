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

  attach(session: CopilotSession): void {
    this.detach();

    this.unsubscribes.push(
      session.on('assistant.message_delta', (event) => {
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
      }),
    );

    this.unsubscribes.push(
      session.on('assistant.message', (event) => {
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
      }),
    );

    this.unsubscribes.push(
      session.on('assistant.reasoning_delta', (event) => {
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
      }),
    );

    this.unsubscribes.push(
      session.on('assistant.reasoning', (event) => {
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
      }),
    );

    this.unsubscribes.push(
      session.on('tool.execution_start', (event) => {
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
      }),
    );

    this.unsubscribes.push(
      session.on('tool.execution_complete', (event) => {
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
          data.error = d.error;
        }
        this.send({
          type: 'copilot:tool_end',
          data,
        });
      }),
    );

    this.unsubscribes.push(
      session.on('session.idle', () => {
        log.debug('session.idle');
        this.send({ type: 'copilot:idle' });
      }),
    );

    this.unsubscribes.push(
      session.on('session.error', (event) => {
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
      }),
    );
  }

  detach(): void {
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
  }
}
