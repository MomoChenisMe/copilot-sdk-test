import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import Database from 'better-sqlite3';
import { createMemoryTools } from '../../src/memory/memory-tools.js';
import { MemoryStore } from '../../src/memory/memory-store.js';
import { MemoryIndex } from '../../src/memory/memory-index.js';

describe('Memory self-control tools', () => {
  let tmpDir: string;
  let store: MemoryStore;
  let index: MemoryIndex;
  let db: Database.Database;
  let tools: ReturnType<typeof createMemoryTools>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-tools-'));
    store = new MemoryStore(tmpDir);
    store.ensureDirectories();
    db = new Database(':memory:');
    index = new MemoryIndex(db);
    tools = createMemoryTools(store, index);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates 4 tools', () => {
    expect(tools).toHaveLength(4);
    const names = tools.map((t) => t.name);
    expect(names).toContain('read_memory');
    expect(names).toContain('append_memory');
    expect(names).toContain('search_memory');
    expect(names).toContain('append_daily_log');
  });

  describe('read_memory', () => {
    it('returns MEMORY.md content', async () => {
      store.writeMemory('- User prefers dark mode');
      const tool = tools.find((t) => t.name === 'read_memory')!;
      const result = await tool.handler({});
      expect(result.content).toContain('User prefers dark mode');
    });

    it('returns empty content when no memory', async () => {
      const tool = tools.find((t) => t.name === 'read_memory')!;
      const result = await tool.handler({});
      expect(result.content).toBe('');
    });
  });

  describe('append_memory', () => {
    it('appends a fact to MEMORY.md and index', async () => {
      const tool = tools.find((t) => t.name === 'append_memory')!;
      const result = await tool.handler({ fact: 'User uses vim' });
      expect(result.ok).toBe(true);
      expect(store.readMemory()).toContain('User uses vim');
      const searchResults = index.searchBM25('vim');
      expect(searchResults.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('search_memory', () => {
    it('searches indexed facts', async () => {
      index.addFact('User prefers TypeScript', 'preferences', 'MEMORY.md');
      index.addFact('Project uses Express 5', 'project', 'MEMORY.md');

      const tool = tools.find((t) => t.name === 'search_memory')!;
      const result = await tool.handler({ query: 'TypeScript' });
      expect(result.results.length).toBeGreaterThanOrEqual(1);
      expect(result.results[0].content).toContain('TypeScript');
    });

    it('returns empty results for no match', async () => {
      const tool = tools.find((t) => t.name === 'search_memory')!;
      const result = await tool.handler({ query: 'xyznonexistent' });
      expect(result.results).toEqual([]);
    });
  });

  describe('append_daily_log', () => {
    it('appends an entry to today daily log', async () => {
      const tool = tools.find((t) => t.name === 'append_daily_log')!;
      const result = await tool.handler({ entry: 'Fixed WebSocket bug' });
      expect(result.ok).toBe(true);
      const today = new Date().toISOString().slice(0, 10);
      expect(store.readDailyLog(today)).toContain('Fixed WebSocket bug');
    });

    it('appends to specific date when provided', async () => {
      const tool = tools.find((t) => t.name === 'append_daily_log')!;
      const result = await tool.handler({ entry: 'Deployed v2', date: '2026-02-15' });
      expect(result.ok).toBe(true);
      expect(store.readDailyLog('2026-02-15')).toContain('Deployed v2');
    });
  });
});
