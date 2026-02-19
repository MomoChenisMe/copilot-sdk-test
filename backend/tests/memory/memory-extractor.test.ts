import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import Database from 'better-sqlite3';
import { MemoryExtractor } from '../../src/memory/memory-extractor.js';
import { MemoryStore } from '../../src/memory/memory-store.js';
import { MemoryIndex } from '../../src/memory/memory-index.js';

describe('MemoryExtractor', () => {
  let tmpDir: string;
  let store: MemoryStore;
  let index: MemoryIndex;
  let db: Database.Database;
  let extractor: MemoryExtractor;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-ext-'));
    store = new MemoryStore(tmpDir);
    store.ensureDirectories();
    db = new Database(':memory:');
    index = new MemoryIndex(db);
    extractor = new MemoryExtractor(store, index, {
      extractIntervalSeconds: 60,
      minNewMessages: 4,
    });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('extractCandidates', () => {
    it('extracts bullet-point facts from messages', () => {
      const messages = [
        { role: 'user' as const, content: 'I always use pnpm for package management' },
        { role: 'assistant' as const, content: 'Noted! I will use pnpm.' },
        { role: 'user' as const, content: 'My project uses React 19 with TypeScript' },
        { role: 'assistant' as const, content: 'Great, React 19 with TypeScript.' },
      ];
      const candidates = extractor.extractCandidates(messages);
      expect(candidates.length).toBeGreaterThanOrEqual(1);
    });

    it('returns empty array for short/empty messages', () => {
      const candidates = extractor.extractCandidates([]);
      expect(candidates).toEqual([]);
    });

    it('extracts from user messages mentioning preferences', () => {
      const messages = [
        { role: 'user' as const, content: 'Remember that I prefer Tailwind CSS over styled-components' },
        { role: 'assistant' as const, content: 'OK' },
      ];
      const candidates = extractor.extractCandidates(messages);
      expect(candidates.some((c) => c.toLowerCase().includes('tailwind'))).toBe(true);
    });
  });

  describe('reconcile', () => {
    it('returns add actions for new facts', () => {
      const candidates = ['User prefers vim', 'Project uses React'];
      const actions = extractor.reconcile(candidates);
      expect(actions.length).toBe(2);
      expect(actions.every((a) => a.action === 'add')).toBe(true);
    });

    it('returns update action for similar existing fact', () => {
      index.addFact('User prefers vim', 'preferences', 'MEMORY.md');
      const candidates = ['User prefers neovim instead of vim'];
      const actions = extractor.reconcile(candidates);
      expect(actions.length).toBeGreaterThanOrEqual(1);
      const update = actions.find((a) => a.action === 'update');
      expect(update).toBeTruthy();
    });

    it('skips duplicate facts', () => {
      index.addFact('User prefers dark mode', 'preferences', 'MEMORY.md');
      const candidates = ['User prefers dark mode'];
      const actions = extractor.reconcile(candidates);
      expect(actions.every((a) => a.action !== 'add')).toBe(true);
    });
  });

  describe('apply', () => {
    it('applies add actions to store and index', () => {
      const actions = [
        { action: 'add' as const, content: 'New fact about user', category: 'general' },
      ];
      extractor.apply(actions);
      const memory = store.readMemory();
      expect(memory).toContain('New fact about user');
      const results = index.searchBM25('New fact');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('applies update actions', () => {
      const id = index.addFact('Old preference', 'preferences', 'MEMORY.md');
      store.writeMemory('- Old preference');
      const actions = [
        { action: 'update' as const, id, content: 'Updated preference', category: 'preferences' },
      ];
      extractor.apply(actions);
      const fact = index.getFact(id);
      expect(fact!.content).toBe('Updated preference');
    });

    it('applies delete actions', () => {
      const id = index.addFact('Outdated fact', 'general', 'MEMORY.md');
      store.writeMemory('- Outdated fact');
      const actions = [
        { action: 'delete' as const, id, content: '', category: 'general' },
      ];
      extractor.apply(actions);
      expect(index.getFact(id)).toBeNull();
    });
  });

  describe('extractCandidatesSmartly', () => {
    it('uses LLM result when llmExtractor succeeds', async () => {
      const mockLlmExtractor = {
        extractFacts: vi.fn().mockResolvedValue([
          { content: 'Prefers TypeScript', category: 'preference', confidence: 0.9 },
          { content: 'Uses React 19', category: 'project', confidence: 0.85 },
        ]),
      };
      const smartExtractor = new MemoryExtractor(store, index, {}, undefined, mockLlmExtractor as any);

      const messages = [
        { role: 'user' as const, content: 'Some message' },
      ];
      const candidates = await smartExtractor.extractCandidatesSmartly(messages);

      expect(candidates).toEqual(['Prefers TypeScript', 'Uses React 19']);
    });

    it('falls back to regex when LLM returns null', async () => {
      const mockLlmExtractor = {
        extractFacts: vi.fn().mockResolvedValue(null),
      };
      const smartExtractor = new MemoryExtractor(store, index, {}, undefined, mockLlmExtractor as any);

      const messages = [
        { role: 'user' as const, content: 'I always use pnpm for package management' },
      ];
      const candidates = await smartExtractor.extractCandidatesSmartly(messages);

      expect(candidates.length).toBeGreaterThanOrEqual(1);
    });

    it('falls back to regex when LLM returns empty array', async () => {
      const mockLlmExtractor = {
        extractFacts: vi.fn().mockResolvedValue([]),
      };
      const smartExtractor = new MemoryExtractor(store, index, {}, undefined, mockLlmExtractor as any);

      const messages = [
        { role: 'user' as const, content: 'I always use pnpm for package management' },
      ];
      const candidates = await smartExtractor.extractCandidatesSmartly(messages);

      // Should fallback to regex since LLM returned empty
      expect(candidates.length).toBeGreaterThanOrEqual(1);
    });

    it('uses regex directly when no llmExtractor is set', async () => {
      const messages = [
        { role: 'user' as const, content: 'I always use pnpm for package management' },
      ];
      const candidates = await extractor.extractCandidatesSmartly(messages);

      expect(candidates.length).toBeGreaterThanOrEqual(1);
    });

    it('passes LLM categories to reconcile', () => {
      const categories = new Map<string, string>();
      categories.set('Prefers TypeScript', 'preference');
      categories.set('Uses React', 'project');

      const actions = extractor.reconcile(['Prefers TypeScript', 'Uses React'], categories);

      expect(actions[0].category).toBe('preference');
      expect(actions[1].category).toBe('project');
    });
  });

  describe('applyWithGating', () => {
    it('only applies approved actions when qualityGate is set', async () => {
      const mockGate = {
        filter: vi.fn().mockResolvedValue({
          approved: [{ action: 'add' as const, content: 'Approved fact', category: 'general' }],
          rejected: [{ action: { action: 'add' as const, content: 'Rejected fact', category: 'general' }, reason: 'vague' }],
        }),
      };
      const gatedExtractor = new MemoryExtractor(store, index, {}, mockGate as any);

      const actions = [
        { action: 'add' as const, content: 'Approved fact', category: 'general' },
        { action: 'add' as const, content: 'Rejected fact', category: 'general' },
      ];

      await gatedExtractor.applyWithGating(actions);

      const memory = store.readMemory();
      expect(memory).toContain('Approved fact');
      expect(memory).not.toContain('Rejected fact');
    });

    it('applies all actions when no qualityGate is set', async () => {
      const actions = [
        { action: 'add' as const, content: 'Fact A', category: 'general' },
        { action: 'add' as const, content: 'Fact B', category: 'general' },
      ];

      await extractor.applyWithGating(actions);

      const memory = store.readMemory();
      expect(memory).toContain('Fact A');
      expect(memory).toContain('Fact B');
    });
  });

  describe('throttling', () => {
    it('shouldExtract returns false if not enough messages', () => {
      expect(extractor.shouldExtract('conv-1', 2)).toBe(false);
    });

    it('shouldExtract returns true if enough messages and interval passed', () => {
      expect(extractor.shouldExtract('conv-1', 5)).toBe(true);
    });

    it('shouldExtract returns false within interval after extraction', () => {
      extractor.markExtracted('conv-1');
      expect(extractor.shouldExtract('conv-1', 10)).toBe(false);
    });

    it('shouldExtract returns true after interval passes', () => {
      vi.useFakeTimers();
      extractor.markExtracted('conv-1');
      expect(extractor.shouldExtract('conv-1', 10)).toBe(false);
      vi.advanceTimersByTime(61_000);
      expect(extractor.shouldExtract('conv-1', 10)).toBe(true);
      vi.useRealTimers();
    });
  });
});
