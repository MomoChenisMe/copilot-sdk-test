import type { Message, MessageMetadata } from './api';

export interface UsageSummary {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

/**
 * Sum usage from assistant messages' metadata.
 * Used to restore usage totals when loading conversation history.
 */
export function sumUsageFromMessages(messages: Message[]): UsageSummary {
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;

  for (const msg of messages) {
    if (msg.role !== 'assistant') continue;
    const meta = msg.metadata as MessageMetadata | null;
    if (meta?.usage) {
      inputTokens += meta.usage.inputTokens;
      outputTokens += meta.usage.outputTokens;
      if (meta.usage.cacheReadTokens) cacheReadTokens += meta.usage.cacheReadTokens;
      if (meta.usage.cacheWriteTokens) cacheWriteTokens += meta.usage.cacheWriteTokens;
    }
  }

  return { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens };
}
