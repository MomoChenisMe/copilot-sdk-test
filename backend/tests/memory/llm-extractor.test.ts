import { describe, it, expect, vi } from 'vitest';
import { LlmMemoryExtractor } from '../../src/memory/llm-extractor.js';
import type { MemoryLlmCaller } from '../../src/memory/llm-caller.js';

function createMockCaller(response: string | null) {
  return {
    call: vi.fn().mockResolvedValue(response),
  } as unknown as MemoryLlmCaller;
}

const sampleMessages = [
  { role: 'user' as const, content: 'I prefer using TypeScript strict mode for all projects' },
  { role: 'assistant' as const, content: 'OK, I will use strict mode.' },
  { role: 'user' as const, content: 'Our stack is React 19 with Vite and Tailwind' },
  { role: 'assistant' as const, content: 'Got it!' },
];

describe('LlmMemoryExtractor', () => {
  it('extracts structured facts with categories', async () => {
    const llmResponse = JSON.stringify([
      { content: 'Prefers TypeScript strict mode', category: 'preference', confidence: 0.9 },
      { content: 'Stack is React 19 + Vite + Tailwind', category: 'project', confidence: 0.95 },
    ]);
    const caller = createMockCaller(llmResponse);
    const extractor = new LlmMemoryExtractor(caller);

    const facts = await extractor.extractFacts(sampleMessages);

    expect(facts).toHaveLength(2);
    expect(facts![0].content).toBe('Prefers TypeScript strict mode');
    expect(facts![0].category).toBe('preference');
    expect(facts![1].category).toBe('project');
  });

  it('filters out facts with confidence < 0.7', async () => {
    const llmResponse = JSON.stringify([
      { content: 'Prefers TypeScript', category: 'preference', confidence: 0.9 },
      { content: 'Maybe likes dark mode', category: 'preference', confidence: 0.3 },
      { content: 'Uses Vite', category: 'tool', confidence: 0.85 },
    ]);
    const caller = createMockCaller(llmResponse);
    const extractor = new LlmMemoryExtractor(caller);

    const facts = await extractor.extractFacts(sampleMessages);

    expect(facts).toHaveLength(2);
    expect(facts!.every((f) => f.confidence >= 0.7)).toBe(true);
  });

  it('returns null when LLM call fails', async () => {
    const caller = createMockCaller(null);
    const extractor = new LlmMemoryExtractor(caller);

    const facts = await extractor.extractFacts(sampleMessages);

    expect(facts).toBeNull();
  });

  it('returns null when LLM returns unparseable JSON', async () => {
    const caller = createMockCaller('This is not JSON');
    const extractor = new LlmMemoryExtractor(caller);

    const facts = await extractor.extractFacts(sampleMessages);

    expect(facts).toBeNull();
  });

  it('parses JSON wrapped in code block', async () => {
    const llmResponse = '```json\n[{"content": "Uses pnpm", "category": "tool", "confidence": 0.9}]\n```';
    const caller = createMockCaller(llmResponse);
    const extractor = new LlmMemoryExtractor(caller);

    const facts = await extractor.extractFacts(sampleMessages);

    expect(facts).toHaveLength(1);
    expect(facts![0].content).toBe('Uses pnpm');
  });

  it('truncates messages to maxMessages', async () => {
    const manyMessages = Array.from({ length: 30 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `Message ${i}`,
    }));
    const caller = createMockCaller(JSON.stringify([]));
    const extractor = new LlmMemoryExtractor(caller, 5);

    await extractor.extractFacts(manyMessages);

    // Check that the prompt contains only the last 5 messages
    const prompt = (caller.call as any).mock.calls[0][1] as string;
    expect(prompt).toContain('Message 29');
    expect(prompt).toContain('Message 25');
    expect(prompt).not.toContain('Message 0');
  });

  it('returns empty array when LLM returns empty array', async () => {
    const caller = createMockCaller(JSON.stringify([]));
    const extractor = new LlmMemoryExtractor(caller);

    const facts = await extractor.extractFacts(sampleMessages);

    expect(facts).toEqual([]);
  });

  it('returns null when LLM returns non-array JSON', async () => {
    const caller = createMockCaller(JSON.stringify({ not: 'an array' }));
    const extractor = new LlmMemoryExtractor(caller);

    const facts = await extractor.extractFacts(sampleMessages);

    expect(facts).toBeNull();
  });
});
