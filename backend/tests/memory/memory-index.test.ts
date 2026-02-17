import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import Database from 'better-sqlite3';
import { MemoryIndex } from '../../src/memory/memory-index.js';
import { MemoryStore } from '../../src/memory/memory-store.js';

describe('MemoryIndex', () => {
  let tmpDir: string;
  let db: Database.Database;
  let index: MemoryIndex;
  let store: MemoryStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-idx-'));
    db = new Database(':memory:');
    store = new MemoryStore(tmpDir);
    store.ensureDirectories();
    index = new MemoryIndex(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('table creation', () => {
    it('creates memory_facts and FTS5 tables', () => {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'virtual table') ORDER BY name")
        .all() as { name: string }[];
      const names = tables.map((t) => t.name);
      expect(names).toContain('memory_facts');
      expect(names).toContain('memory_facts_fts');
    });
  });

  describe('addFact / getFact', () => {
    it('adds a fact and retrieves it by id', () => {
      const id = index.addFact('User prefers dark mode', 'preferences', 'MEMORY.md');
      expect(id).toBeTruthy();
      const fact = index.getFact(id);
      expect(fact).toBeTruthy();
      expect(fact!.content).toBe('User prefers dark mode');
      expect(fact!.category).toBe('preferences');
      expect(fact!.source).toBe('MEMORY.md');
    });

    it('returns null for non-existent fact', () => {
      expect(index.getFact('non-existent')).toBeNull();
    });
  });

  describe('updateFact', () => {
    it('updates an existing fact content', () => {
      const id = index.addFact('old content', 'general', 'MEMORY.md');
      index.updateFact(id, 'new content');
      const fact = index.getFact(id);
      expect(fact!.content).toBe('new content');
    });
  });

  describe('removeFact', () => {
    it('removes a fact by id', () => {
      const id = index.addFact('to delete', 'general', 'MEMORY.md');
      index.removeFact(id);
      expect(index.getFact(id)).toBeNull();
    });

    it('does not throw on non-existent id', () => {
      expect(() => index.removeFact('nope')).not.toThrow();
    });
  });

  describe('searchBM25', () => {
    it('finds facts matching a query', () => {
      index.addFact('User prefers TypeScript for backend', 'preferences', 'MEMORY.md');
      index.addFact('Project uses React 19', 'project', 'MEMORY.md');
      index.addFact('Deploy target is Ubuntu 22.04', 'infrastructure', 'MEMORY.md');

      const results = index.searchBM25('TypeScript backend');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].content).toContain('TypeScript');
    });

    it('returns empty array for no matches', () => {
      index.addFact('something', 'general', 'MEMORY.md');
      const results = index.searchBM25('xyznonexistent');
      expect(results).toEqual([]);
    });

    it('respects limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        index.addFact(`fact about testing ${i}`, 'general', 'MEMORY.md');
      }
      const results = index.searchBM25('testing', 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe('reindexFromFiles', () => {
    it('reindexes from MEMORY.md content', () => {
      store.writeMemory('- User likes vim keybindings\n- Project uses pnpm\n- Deploy on Vercel');
      index.reindexFromFiles(store);
      const results = index.searchBM25('vim');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].content).toContain('vim');
    });

    it('clears old facts before reindexing', () => {
      index.addFact('legacy dinosaur data', 'general', 'MEMORY.md');
      store.writeMemory('- brand new information');
      index.reindexFromFiles(store);
      const old = index.searchBM25('dinosaur');
      expect(old).toEqual([]);
      const fresh = index.searchBM25('brand new');
      expect(fresh.length).toBeGreaterThanOrEqual(1);
    });

    it('indexes daily log entries', () => {
      store.appendDailyLog('2026-02-17', '- Debugged WebSocket reconnection issue');
      index.reindexFromFiles(store);
      const results = index.searchBM25('WebSocket reconnection');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].source).toContain('2026-02-17');
    });
  });

  describe('getAllFacts', () => {
    it('returns all indexed facts', () => {
      index.addFact('fact 1', 'general', 'MEMORY.md');
      index.addFact('fact 2', 'preferences', 'MEMORY.md');
      const all = index.getAllFacts();
      expect(all.length).toBe(2);
    });
  });

  describe('getStats', () => {
    it('returns total facts count', () => {
      index.addFact('a', 'general', 'MEMORY.md');
      index.addFact('b', 'general', 'MEMORY.md');
      const stats = index.getStats();
      expect(stats.totalFacts).toBe(2);
    });
  });
});
