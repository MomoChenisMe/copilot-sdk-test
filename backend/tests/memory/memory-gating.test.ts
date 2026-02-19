import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryQualityGate } from '../../src/memory/memory-gating.js';
import type { MemoryLlmCaller } from '../../src/memory/llm-caller.js';
import type { ReconcileAction } from '../../src/memory/memory-extractor.js';

function createMockCaller(response: string | null) {
  return {
    call: vi.fn().mockResolvedValue(response),
  } as unknown as MemoryLlmCaller;
}

const sampleActions: ReconcileAction[] = [
  { action: 'add', content: 'User prefers TypeScript strict mode', category: 'general' },
  { action: 'add', content: 'I like this approach', category: 'general' },
  { action: 'add', content: 'Project uses React 19 with Vite', category: 'general' },
];

describe('MemoryQualityGate', () => {
  it('approves specific preferences and rejects vague statements', async () => {
    const llmResponse = JSON.stringify([
      { index: 0, keep: true, reason: 'Specific persistent preference' },
      { index: 1, keep: false, reason: 'Casual conversational remark' },
      { index: 2, keep: true, reason: 'Project technical fact' },
    ]);
    const caller = createMockCaller(llmResponse);
    const gate = new MemoryQualityGate(caller);

    const result = await gate.filter(sampleActions);

    expect(result.approved).toHaveLength(2);
    expect(result.approved[0].content).toBe('User prefers TypeScript strict mode');
    expect(result.approved[1].content).toBe('Project uses React 19 with Vite');
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].action.content).toBe('I like this approach');
    expect(result.rejected[0].reason).toBe('Casual conversational remark');
  });

  it('returns empty result for empty actions list without calling LLM', async () => {
    const caller = createMockCaller(null);
    const gate = new MemoryQualityGate(caller);

    const result = await gate.filter([]);

    expect(result.approved).toEqual([]);
    expect(result.rejected).toEqual([]);
    expect(caller.call).not.toHaveBeenCalled();
  });

  it('approves all actions when LLM returns null (graceful degradation)', async () => {
    const caller = createMockCaller(null);
    const gate = new MemoryQualityGate(caller);

    const result = await gate.filter(sampleActions);

    expect(result.approved).toHaveLength(3);
    expect(result.rejected).toHaveLength(0);
  });

  it('approves all actions when LLM returns unparseable JSON', async () => {
    const caller = createMockCaller('This is not JSON at all');
    const gate = new MemoryQualityGate(caller);

    const result = await gate.filter(sampleActions);

    expect(result.approved).toHaveLength(3);
    expect(result.rejected).toHaveLength(0);
  });

  it('parses JSON wrapped in markdown code block', async () => {
    const llmResponse = '```json\n[\n  { "index": 0, "keep": true, "reason": "good" },\n  { "index": 1, "keep": false, "reason": "bad" },\n  { "index": 2, "keep": true, "reason": "good" }\n]\n```';
    const caller = createMockCaller(llmResponse);
    const gate = new MemoryQualityGate(caller);

    const result = await gate.filter(sampleActions);

    expect(result.approved).toHaveLength(2);
    expect(result.rejected).toHaveLength(1);
  });

  it('approves all when JSON has invalid structure', async () => {
    const caller = createMockCaller(JSON.stringify({ not: 'an array' }));
    const gate = new MemoryQualityGate(caller);

    const result = await gate.filter(sampleActions);

    expect(result.approved).toHaveLength(3);
    expect(result.rejected).toHaveLength(0);
  });

  it('handles index out of bounds gracefully', async () => {
    const llmResponse = JSON.stringify([
      { index: 0, keep: true, reason: 'good' },
      { index: 99, keep: false, reason: 'out of bounds' },
    ]);
    const caller = createMockCaller(llmResponse);
    const gate = new MemoryQualityGate(caller);

    const result = await gate.filter(sampleActions);

    // index 0 approved, index 99 ignored, remaining (1,2) approved by default
    expect(result.approved.length).toBeGreaterThanOrEqual(1);
  });
});
