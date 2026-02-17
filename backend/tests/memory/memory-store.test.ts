import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoryStore } from '../../src/memory/memory-store.js';

describe('MemoryStore', () => {
  let tmpDir: string;
  let store: MemoryStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-store-'));
    store = new MemoryStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('ensureDirectories', () => {
    it('creates base and daily directories', () => {
      store.ensureDirectories();
      expect(fs.existsSync(tmpDir)).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'daily'))).toBe(true);
    });

    it('creates MEMORY.md if not exists', () => {
      store.ensureDirectories();
      expect(fs.existsSync(path.join(tmpDir, 'MEMORY.md'))).toBe(true);
    });

    it('does not overwrite existing MEMORY.md', () => {
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), 'existing content');
      store.ensureDirectories();
      expect(fs.readFileSync(path.join(tmpDir, 'MEMORY.md'), 'utf-8')).toBe('existing content');
    });
  });

  describe('readMemory / writeMemory', () => {
    it('returns empty string when MEMORY.md does not exist', () => {
      expect(store.readMemory()).toBe('');
    });

    it('writes and reads MEMORY.md', () => {
      store.ensureDirectories();
      store.writeMemory('# My Memory\n\nSome facts');
      expect(store.readMemory()).toBe('# My Memory\n\nSome facts');
    });

    it('overwrites existing content', () => {
      store.ensureDirectories();
      store.writeMemory('first');
      store.writeMemory('second');
      expect(store.readMemory()).toBe('second');
    });
  });

  describe('appendMemory', () => {
    it('appends to existing MEMORY.md', () => {
      store.ensureDirectories();
      store.writeMemory('line1');
      store.appendMemory('\nline2');
      expect(store.readMemory()).toBe('line1\nline2');
    });

    it('creates MEMORY.md if not exists and appends', () => {
      store.ensureDirectories();
      store.appendMemory('new fact');
      expect(store.readMemory()).toContain('new fact');
    });
  });

  describe('daily logs', () => {
    it('readDailyLog returns empty string for non-existent date', () => {
      store.ensureDirectories();
      expect(store.readDailyLog('2026-02-17')).toBe('');
    });

    it('appendDailyLog creates and appends to daily log', () => {
      store.ensureDirectories();
      store.appendDailyLog('2026-02-17', 'Entry 1');
      expect(store.readDailyLog('2026-02-17')).toContain('Entry 1');
    });

    it('appendDailyLog appends multiple entries', () => {
      store.ensureDirectories();
      store.appendDailyLog('2026-02-17', 'Entry 1');
      store.appendDailyLog('2026-02-17', 'Entry 2');
      const content = store.readDailyLog('2026-02-17');
      expect(content).toContain('Entry 1');
      expect(content).toContain('Entry 2');
    });

    it('listDailyLogs returns dates in reverse chronological order', () => {
      store.ensureDirectories();
      store.appendDailyLog('2026-02-15', 'a');
      store.appendDailyLog('2026-02-17', 'b');
      store.appendDailyLog('2026-02-16', 'c');
      const logs = store.listDailyLogs();
      expect(logs).toEqual(['2026-02-17', '2026-02-16', '2026-02-15']);
    });

    it('listDailyLogs returns empty array when no logs', () => {
      store.ensureDirectories();
      expect(store.listDailyLogs()).toEqual([]);
    });

    it('rejects invalid date formats', () => {
      store.ensureDirectories();
      expect(() => store.appendDailyLog('../hack', 'bad')).toThrow();
      expect(() => store.readDailyLog('../../etc/passwd')).toThrow();
    });
  });
});
