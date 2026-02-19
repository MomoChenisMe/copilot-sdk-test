import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initDb } from '../../src/conversation/db.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('tasks table migration', () => {
  let db: Database.Database;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `test-tasks-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    db = initDb(dbPath);
  });

  afterEach(() => {
    db.close();
    try { fs.unlinkSync(dbPath); } catch { /* ignore */ }
  });

  it('should create the tasks table with correct columns', () => {
    const columns = db
      .prepare("PRAGMA table_info('tasks')")
      .all() as { name: string; type: string; notnull: number }[];

    const columnNames = columns.map((c) => c.name);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('conversation_id');
    expect(columnNames).toContain('subject');
    expect(columnNames).toContain('description');
    expect(columnNames).toContain('active_form');
    expect(columnNames).toContain('status');
    expect(columnNames).toContain('owner');
    expect(columnNames).toContain('blocks');
    expect(columnNames).toContain('blocked_by');
    expect(columnNames).toContain('metadata');
    expect(columnNames).toContain('created_at');
    expect(columnNames).toContain('updated_at');
  });

  it('should enforce CHECK constraint on status column', () => {
    // First create a conversation to reference
    db.prepare(
      "INSERT INTO conversations (id, model, cwd) VALUES ('conv-1', 'gpt-5', '/tmp')",
    ).run();

    // Valid statuses should work
    for (const status of ['pending', 'in_progress', 'completed', 'deleted']) {
      expect(() => {
        db.prepare(
          `INSERT INTO tasks (id, conversation_id, subject, status)
           VALUES (?, 'conv-1', 'test', ?)`,
        ).run(`task-${status}`, status);
      }).not.toThrow();
    }

    // Invalid status should fail
    expect(() => {
      db.prepare(
        "INSERT INTO tasks (id, conversation_id, subject, status) VALUES ('bad', 'conv-1', 'test', 'invalid')",
      ).run();
    }).toThrow();
  });

  it('should cascade delete tasks when conversation is deleted', () => {
    db.prepare(
      "INSERT INTO conversations (id, model, cwd) VALUES ('conv-del', 'gpt-5', '/tmp')",
    ).run();
    db.prepare(
      "INSERT INTO tasks (id, conversation_id, subject) VALUES ('task-del', 'conv-del', 'test task')",
    ).run();

    // Verify task exists
    const before = db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE conversation_id = 'conv-del'").get() as { cnt: number };
    expect(before.cnt).toBe(1);

    // Delete conversation
    db.prepare("DELETE FROM conversations WHERE id = 'conv-del'").run();

    // Task should be gone
    const after = db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE conversation_id = 'conv-del'").get() as { cnt: number };
    expect(after.cnt).toBe(0);
  });

  it('should have composite index on (conversation_id, status)', () => {
    const indexes = db
      .prepare("PRAGMA index_list('tasks')")
      .all() as { name: string }[];

    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain('idx_tasks_conversation_id');

    // Verify index columns
    const cols = db
      .prepare("PRAGMA index_info('idx_tasks_conversation_id')")
      .all() as { name: string }[];

    const colNames = cols.map((c) => c.name);
    expect(colNames).toContain('conversation_id');
    expect(colNames).toContain('status');
  });
});
