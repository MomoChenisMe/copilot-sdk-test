import type { CopilotSession } from '@github/copilot-sdk';
import type { WsMessage } from '../ws/types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('event-relay');

/** Safely extract content with fallback chain */
function extractContent(event: any): string {
  return event.deltaContent ?? event.delta ?? event.content ?? '';
}

export class EventRelay {
  private unsubscribes: (() => void)[] = [];

  constructor(private send: (msg: WsMessage) => void) {}

  attach(session: CopilotSession): void {
    this.detach();

    this.unsubscribes.push(
      session.on('assistant.message_delta', (event) => {
        const e = event as any;
        log.debug({ event: e }, 'assistant.message_delta');
        this.send({
          type: 'copilot:delta',
          data: {
            messageId: e.messageId,
            content: extractContent(e),
          },
        });
      }),
    );

    this.unsubscribes.push(
      session.on('assistant.message', (event) => {
        const e = event as any;
        log.debug({ event: e }, 'assistant.message');
        this.send({
          type: 'copilot:message',
          data: {
            messageId: e.messageId,
            content: e.content ?? '',
          },
        });
      }),
    );

    this.unsubscribes.push(
      session.on('assistant.reasoning_delta', (event) => {
        const e = event as any;
        log.debug({ event: e }, 'assistant.reasoning_delta');
        this.send({
          type: 'copilot:reasoning_delta',
          data: {
            reasoningId: e.reasoningId,
            content: extractContent(e),
          },
        });
      }),
    );

    this.unsubscribes.push(
      session.on('assistant.reasoning', (event) => {
        const e = event as any;
        log.debug({ event: e }, 'assistant.reasoning');
        this.send({
          type: 'copilot:reasoning',
          data: {
            reasoningId: e.reasoningId,
            content: e.content ?? '',
          },
        });
      }),
    );

    this.unsubscribes.push(
      session.on('tool.execution_start', (event) => {
        const e = event as any;
        log.debug({ event: e }, 'tool.execution_start');
        this.send({
          type: 'copilot:tool_start',
          data: {
            toolCallId: e.toolCallId,
            toolName: e.toolName,
            arguments: e.arguments,
          },
        });
      }),
    );

    this.unsubscribes.push(
      session.on('tool.execution_complete', (event) => {
        const e = event as any;
        log.debug({ event: e }, 'tool.execution_complete');
        const data: Record<string, unknown> = {
          toolCallId: e.toolCallId,
          success: e.success,
        };
        if (e.success) {
          data.result = e.result;
        } else {
          data.error = e.error;
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
        log.error({ event: e }, 'session.error');
        this.send({
          type: 'copilot:error',
          data: {
            errorType: e.errorType ?? 'unknown',
            message: e.message ?? 'Unknown error',
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
