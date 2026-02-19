import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import Database from 'better-sqlite3';
import { MemoryCompactor } from '../../src/memory/memory-compaction.js';
import { MemoryStore } from '../../src/memory/memory-store.js';
import { MemoryIndex } from '../../src/memory/memory-index.js';
import type { MemoryLlmCaller } from '../../src/memory/llm-caller.js';

function createMockCaller(response: string | null) {
  return {
    call: vi.fn().mockResolvedValue(response),
  } as unknown as MemoryLlmCaller;
}

describe('MemoryCompactor', () => {
  let tmpDir: string;
  let store: MemoryStore;
  let index: MemoryIndex;
  let db: Database.Database;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-compact-'));
    store = new MemoryStore(tmpDir);
    store.ensureDirectories();
    db = new Database(':memory:');
    index = new MemoryIndex(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('shouldCompact', () => {
    it('returns false when fact count is below threshold', () => {
      const caller = createMockCaller(null);
      const compactor = new MemoryCompactor(caller, store, index, { factCountThreshold: 30 });

      // Add only 5 facts
      for (let i = 0; i < 5; i++) {
        index.addFact(`Fact ${i}`, 'general', 'MEMORY.md');
      }

      expect(compactor.shouldCompact()).toBe(false);
    });

    it('returns true when fact count reaches threshold', () => {
      const caller = createMockCaller(null);
      const compactor = new MemoryCompactor(caller, store, index, { factCountThreshold: 10 });

      for (let i = 0; i < 10; i++) {
        index.addFact(`Fact ${i}`, 'general', 'MEMORY.md');
      }

      expect(compactor.shouldCompact()).toBe(true);
    });

    it('returns false within cooldown period', () => {
      const caller = createMockCaller(null);
      const compactor = new MemoryCompactor(caller, store, index, { factCountThreshold: 5 });

      for (let i = 0; i < 10; i++) {
        index.addFact(`Fact ${i}`, 'general', 'MEMORY.md');
      }

      // Simulate that compaction just ran
      compactor.markCompacted();

      expect(compactor.shouldCompact()).toBe(false);
    });

    it('returns true after cooldown period passes', () => {
      vi.useFakeTimers();
      const caller = createMockCaller(null);
      const compactor = new MemoryCompactor(caller, store, index, { factCountThreshold: 5 });

      for (let i = 0; i < 10; i++) {
        index.addFact(`Fact ${i}`, 'general', 'MEMORY.md');
      }

      compactor.markCompacted();
      expect(compactor.shouldCompact()).toBe(false);

      // Advance past 5-minute cooldown
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);
      expect(compactor.shouldCompact()).toBe(true);
      vi.useRealTimers();
    });

    it('returns false when isRunning', async () => {
      // Create a caller that never resolves (to keep isRunning true)
      const caller = {
        call: vi.fn().mockReturnValue(new Promise(() => {})),
      } as unknown as MemoryLlmCaller;
      const compactor = new MemoryCompactor(caller, store, index, { factCountThreshold: 5 });

      for (let i = 0; i < 10; i++) {
        index.addFact(`Fact ${i}`, 'general', 'MEMORY.md');
      }
      store.writeMemory(Array.from({ length: 10 }, (_, i) => `- Fact ${i}`).join('\n'));

      // Start compaction but don't await it
      const promise = compactor.compact();

      // Should be running now
      expect(compactor.shouldCompact()).toBe(false);

      // Clean up — ignore the unresolved promise
      promise.catch(() => {});
    });
  });

  describe('compact', () => {
    it('rewrites MEMORY.md and reindexes on success', async () => {
      const compactedContent = '- User prefers TypeScript\n- Project uses React 19\n- Uses pnpm for packages';
      const caller = createMockCaller(compactedContent);
      const compactor = new MemoryCompactor(caller, store, index, { factCountThreshold: 5 });

      // Setup initial facts
      const originalContent = Array.from({ length: 8 }, (_, i) => `- Fact ${i}`).join('\n');
      store.writeMemory(originalContent);
      for (let i = 0; i < 8; i++) {
        index.addFact(`Fact ${i}`, 'general', 'MEMORY.md');
      }

      const result = await compactor.compact();

      expect(result).not.toBeNull();
      expect(result!.beforeCount).toBe(8);
      expect(result!.afterCount).toBe(3);
      expect(store.readMemory()).toBe(compactedContent);
    });

    it('does not modify MEMORY.md when LLM fails', async () => {
      const caller = createMockCaller(null);
      const compactor = new MemoryCompactor(caller, store, index, { factCountThreshold: 5 });

      store.writeMemory('- Original fact 1\n- Original fact 2');
      index.addFact('Original fact 1', 'general', 'MEMORY.md');
      index.addFact('Original fact 2', 'general', 'MEMORY.md');

      const result = await compactor.compact();

      expect(result).toBeNull();
      expect(store.readMemory()).toBe('- Original fact 1\n- Original fact 2');
    });

    it('rejects result without bullet points', async () => {
      const caller = createMockCaller('This is not a valid compacted memory format');
      const compactor = new MemoryCompactor(caller, store, index, { factCountThreshold: 5 });

      store.writeMemory('- Fact 1\n- Fact 2');
      index.addFact('Fact 1', 'general', 'MEMORY.md');
      index.addFact('Fact 2', 'general', 'MEMORY.md');

      const result = await compactor.compact();

      expect(result).toBeNull();
      expect(store.readMemory()).toBe('- Fact 1\n- Fact 2');
    });

    it('releases isRunning lock in finally', async () => {
      const caller = createMockCaller(null);
      const compactor = new MemoryCompactor(caller, store, index, { factCountThreshold: 5 });

      for (let i = 0; i < 10; i++) {
        index.addFact(`Fact ${i}`, 'general', 'MEMORY.md');
      }
      store.writeMemory(Array.from({ length: 10 }, (_, i) => `- Fact ${i}`).join('\n'));

      // Run compact (will fail due to null response)
      await compactor.compact();

      // isRunning should be released — shouldCompact should not block on isRunning
      // (might still be false due to cooldown, so we check by advancing time)
      vi.useFakeTimers();
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);
      expect(compactor.shouldCompact()).toBe(true);
      vi.useRealTimers();
    });

    it('reindexes facts after compaction', async () => {
      const compactedContent = '- Consolidated fact A\n- Consolidated fact B';
      const caller = createMockCaller(compactedContent);
      const compactor = new MemoryCompactor(caller, store, index, { factCountThreshold: 3 });

      store.writeMemory('- Old 1\n- Old 2\n- Old 3\n- Old 4');
      for (let i = 1; i <= 4; i++) {
        index.addFact(`Old ${i}`, 'general', 'MEMORY.md');
      }

      await compactor.compact();

      // Old facts should be gone, new facts should be indexed
      const results = index.searchBM25('Consolidated');
      expect(results.length).toBeGreaterThanOrEqual(1);

      const stats = index.getStats();
      expect(stats.totalFacts).toBe(2);
    });
  });
});
