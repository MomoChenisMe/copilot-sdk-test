import { Cron } from 'croner';
import type { ConversationRepository } from '../conversation/repository.js';
import type { Conversation } from '../conversation/types.js';
import type { WsMessage } from '../ws/types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('conversation-cron');

export interface ConversationCronDeps {
  repo: ConversationRepository;
  broadcastFn?: (msg: WsMessage) => void;
  onTrigger?: (conversationId: string, prompt: string) => Promise<void>;
}

export class ConversationCronScheduler {
  private crons = new Map<string, Cron>();
  private intervals = new Map<string, ReturnType<typeof setInterval>>();

  constructor(private deps: ConversationCronDeps) {}

  loadAll(): void {
    const enabled = this.deps.repo.listCronEnabled();
    for (const conv of enabled) {
      this.register(conv);
    }
    log.info({ count: enabled.length }, 'Loaded conversation cron schedules');
  }

  register(conv: Conversation): void {
    if (!conv.cronEnabled || !conv.cronScheduleType || !conv.cronScheduleValue || !conv.cronPrompt) {
      return;
    }

    // Clean up any existing registration
    this.unregister(conv.id);

    if (conv.cronScheduleType === 'cron') {
      const cron = new Cron(conv.cronScheduleValue, { protect: true }, () => {
        this.trigger(conv.id).catch((err) => {
          log.error({ err, conversationId: conv.id }, 'Conversation cron trigger failed');
        });
      });
      this.crons.set(conv.id, cron);
    } else if (conv.cronScheduleType === 'interval') {
      const ms = parseInt(conv.cronScheduleValue, 10);
      if (isNaN(ms) || ms <= 0) {
        log.warn({ conversationId: conv.id, value: conv.cronScheduleValue }, 'Invalid interval value');
        return;
      }
      const interval = setInterval(() => {
        this.trigger(conv.id).catch((err) => {
          log.error({ err, conversationId: conv.id }, 'Conversation interval trigger failed');
        });
      }, ms);
      this.intervals.set(conv.id, interval);
    }

    log.info({ conversationId: conv.id, type: conv.cronScheduleType, value: conv.cronScheduleValue }, 'Registered conversation cron');
  }

  unregister(conversationId: string): void {
    const cron = this.crons.get(conversationId);
    if (cron) {
      cron.stop();
      this.crons.delete(conversationId);
    }
    const interval = this.intervals.get(conversationId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(conversationId);
    }
  }

  async trigger(conversationId: string): Promise<void> {
    const conv = this.deps.repo.getById(conversationId);
    if (!conv || !conv.cronEnabled || !conv.cronPrompt) {
      log.warn({ conversationId }, 'Skipping cron trigger: conversation not found or cron disabled');
      return;
    }

    log.info({ conversationId, title: conv.title }, 'Triggering conversation cron');

    // Add user message
    const message = this.deps.repo.addMessage(conversationId, {
      role: 'user',
      content: conv.cronPrompt,
      metadata: { cronTriggered: true },
    });

    // Broadcast via WebSocket
    if (this.deps.broadcastFn) {
      this.deps.broadcastFn({
        type: 'cron:conversation_triggered',
        data: {
          conversationId,
          messageId: message.id,
          prompt: conv.cronPrompt,
        },
      });
    }

    // Trigger AI response
    if (this.deps.onTrigger) {
      await this.deps.onTrigger(conversationId, conv.cronPrompt);
    }
  }

  async shutdown(): Promise<void> {
    for (const id of this.crons.keys()) {
      this.unregister(id);
    }
    for (const id of this.intervals.keys()) {
      this.unregister(id);
    }
    log.info('Conversation cron scheduler shut down');
  }
}
