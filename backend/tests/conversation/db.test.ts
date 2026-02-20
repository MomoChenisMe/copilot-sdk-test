import { describe, it, expect, afterEach } from 'vitest';
import { initDb } from '../../src/conversation/db.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function tempDbPath() {
  return path.join(os.tmpdir(), `test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

describe('db', () => {
  const dbPaths: string[] = [];

  afterEach(() => {
    for (const p of dbPaths) {
      try {
        fs.unlinkSync(p);
      } catch {
        // ignore
      }
    }
    dbPaths.length = 0;
  });

  it('should create database file and tables on first init', () => {
    const dbPath = tempDbPath();
    dbPaths.push(dbPath);

    const db = initDb(dbPath);

    expect(fs.existsSync(dbPath)).toBe(true);

    // Check conversations table exists
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('conversations');
    expect(tableNames).toContain('messages');
    expect(tableNames).toContain('messages_fts');

    db.close();
  });

  it('should be idempotent on repeated init', () => {
    const dbPath = tempDbPath();
    dbPaths.push(dbPath);

    const db1 = initDb(dbPath);
    db1.close();

    // Second init should not throw
    const db2 = initDb(dbPath);

    const tables = db2
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    expect(tables.map((t) => t.name)).toContain('conversations');

    db2.close();
  });

  it('should create parent directories if missing', () => {
    const dir = path.join(os.tmpdir(), `test-dir-${Date.now()}`);
    const dbPath = path.join(dir, 'nested', 'test.db');
    dbPaths.push(dbPath);

    const db = initDb(dbPath);
    expect(fs.existsSync(dbPath)).toBe(true);
    db.close();

    // Clean up
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('should have plan_file_path column in conversations table', () => {
    const dbPath = tempDbPath();
    dbPaths.push(dbPath);

    const db = initDb(dbPath);

    const columns = db
      .prepare("PRAGMA table_info('conversations')")
      .all() as { name: string; type: string }[];
    const columnNames = columns.map((c) => c.name);

    expect(columnNames).toContain('plan_file_path');

    // Should be TEXT type and nullable (no NOT NULL)
    const planCol = columns.find((c) => c.name === 'plan_file_path');
    expect(planCol!.type).toBe('TEXT');

    db.close();
  });

  it('should enable WAL mode and foreign keys', () => {
    const dbPath = tempDbPath();
    dbPaths.push(dbPath);

    const db = initDb(dbPath);

    const walMode = db.pragma('journal_mode') as { journal_mode: string }[];
    expect(walMode[0].journal_mode).toBe('wal');

    const fk = db.pragma('foreign_keys') as { foreign_keys: number }[];
    expect(fk[0].foreign_keys).toBe(1);

    db.close();
  });
});
