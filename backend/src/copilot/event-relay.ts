import type { CopilotSession } from '@github/copilot-sdk';
import type { WsMessage } from '../ws/types.js';

export class EventRelay {
  private unsubscribes: (() => void)[] = [];

  constructor(private send: (msg: WsMessage) => void) {}

  attach(session: CopilotSession): void {
    this.detach();

    this.unsubscribes.push(
      session.on('assistant.message_delta', (event) => {
        this.send({
          type: 'copilot:delta',
          data: {
            messageId: (event as any).messageId,
            content: (event as any).deltaContent,
          },
        });
      }),
    );

    this.unsubscribes.push(
      session.on('assistant.message', (event) => {
        this.send({
          type: 'copilot:message',
          data: {
            messageId: (event as any).messageId,
            content: (event as any).content,
          },
        });
      }),
    );

    this.unsubscribes.push(
      session.on('assistant.reasoning_delta', (event) => {
        this.send({
          type: 'copilot:reasoning_delta',
          data: {
            reasoningId: (event as any).reasoningId,
            content: (event as any).deltaContent,
          },
        });
      }),
    );

    this.unsubscribes.push(
      session.on('assistant.reasoning', (event) => {
        this.send({
          type: 'copilot:reasoning',
          data: {
            reasoningId: (event as any).reasoningId,
            content: (event as any).content,
          },
        });
      }),
    );

    this.unsubscribes.push(
      session.on('tool.execution_start', (event) => {
        const e = event as any;
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
        this.send({ type: 'copilot:idle' });
      }),
    );

    this.unsubscribes.push(
      session.on('session.error', (event) => {
        const e = event as any;
        this.send({
          type: 'copilot:error',
          data: {
            errorType: e.errorType,
            message: e.message,
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
