import { describe, it, expect } from 'vitest';
import { sumUsageFromMessages } from '../../src/lib/usage-utils';
import type { Message } from '../../src/lib/api';

function makeMsg(
  role: 'user' | 'assistant',
  metadata?: unknown,
): Message {
  return {
    id: crypto.randomUUID(),
    conversationId: 'conv-1',
    role,
    content: 'text',
    metadata: metadata ?? null,
    createdAt: new Date().toISOString(),
  };
}

describe('sumUsageFromMessages', () => {
  it('should return zero when no messages', () => {
    expect(sumUsageFromMessages([])).toEqual({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });
  });

  it('should return zero when messages have no usage metadata', () => {
    const msgs = [
      makeMsg('user'),
      makeMsg('assistant', { toolRecords: [] }),
    ];
    expect(sumUsageFromMessages(msgs)).toEqual({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });
  });

  it('should sum usage from single assistant message', () => {
    const msgs = [
      makeMsg('user'),
      makeMsg('assistant', { usage: { inputTokens: 100, outputTokens: 50 } }),
    ];
    expect(sumUsageFromMessages(msgs)).toEqual({ inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0 });
  });

  it('should sum usage across multiple assistant messages', () => {
    const msgs = [
      makeMsg('user'),
      makeMsg('assistant', { usage: { inputTokens: 100, outputTokens: 50 } }),
      makeMsg('user'),
      makeMsg('assistant', { usage: { inputTokens: 200, outputTokens: 80 } }),
      makeMsg('user'),
      makeMsg('assistant', { usage: { inputTokens: 150, outputTokens: 60 } }),
    ];
    expect(sumUsageFromMessages(msgs)).toEqual({ inputTokens: 450, outputTokens: 190, cacheReadTokens: 0, cacheWriteTokens: 0 });
  });

  it('should ignore user messages even if they have usage metadata', () => {
    const msgs = [
      makeMsg('user', { usage: { inputTokens: 999, outputTokens: 999 } }),
      makeMsg('assistant', { usage: { inputTokens: 100, outputTokens: 50 } }),
    ];
    expect(sumUsageFromMessages(msgs)).toEqual({ inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0 });
  });

  it('should handle mixed messages with and without usage', () => {
    const msgs = [
      makeMsg('user'),
      makeMsg('assistant', { reasoning: 'thinking...' }),
      makeMsg('user'),
      makeMsg('assistant', { usage: { inputTokens: 300, outputTokens: 120 } }),
    ];
    expect(sumUsageFromMessages(msgs)).toEqual({ inputTokens: 300, outputTokens: 120, cacheReadTokens: 0, cacheWriteTokens: 0 });
  });
});
