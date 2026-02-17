export interface CompactionMonitorOptions {
  flushThreshold: number;
  onFlush: (conversationId: string) => void;
}

export class CompactionMonitor {
  private flushedConversations = new Set<string>();
  private threshold: number;
  private onFlush: (conversationId: string) => void;

  constructor(options: CompactionMonitorOptions) {
    this.threshold = options.flushThreshold;
    this.onFlush = options.onFlush;
  }

  onUsageInfo(conversationId: string, contextWindowUsed: number, contextWindowMax: number): void {
    if (contextWindowMax <= 0) return;

    const ratio = contextWindowUsed / contextWindowMax;
    if (ratio >= this.threshold && !this.flushedConversations.has(conversationId)) {
      this.flushedConversations.add(conversationId);
      this.onFlush(conversationId);
    }
  }

  onCompactionComplete(conversationId: string): void {
    this.flushedConversations.delete(conversationId);
  }
}
