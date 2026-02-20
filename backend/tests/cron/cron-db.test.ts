import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDb } from '../../src/conversation/db.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `cron-db-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

describe('Cron DB migration', () => {
  let db: Database.Database;
  let dbPath: string;

  beforeEach(() => {
    dbPath = tempDbPath();
    db = initDb(dbPath);
  });

  afterEach(() => {
    db.close();
    try { fs.unlinkSync(dbPath); } catch { /* ignore */ }
  });

  it('should create cron_jobs table with correct columns', () => {
    const cols = db.prepare("PRAGMA table_info('cron_jobs')").all() as any[];
    const colNames = cols.map((c: any) => c.name);
    expect(colNames).toContain('id');
    expect(colNames).toContain('name');
    expect(colNames).toContain('type');
    expect(colNames).toContain('schedule_type');
    expect(colNames).toContain('schedule_value');
    expect(colNames).toContain('config');
    expect(colNames).toContain('enabled');
    expect(colNames).toContain('last_run');
    expect(colNames).toContain('next_run');
    expect(colNames).toContain('created_at');
    expect(colNames).toContain('updated_at');
  });

  it('should create cron_history table with correct columns', () => {
    const cols = db.prepare("PRAGMA table_info('cron_history')").all() as any[];
    const colNames = cols.map((c: any) => c.name);
    expect(colNames).toContain('id');
    expect(colNames).toContain('job_id');
    expect(colNames).toContain('started_at');
    expect(colNames).toContain('finished_at');
    expect(colNames).toContain('status');
    expect(colNames).toContain('output');
  });

  it('should enforce type CHECK constraint on cron_jobs', () => {
    expect(() => {
      db.prepare(`INSERT INTO cron_jobs (id, name, type, schedule_type, schedule_value, config)
        VALUES ('t1', 'test', 'invalid', 'cron', '* * * * *', '{}')`).run();
    }).toThrow();
  });

  it('should enforce schedule_type CHECK constraint on cron_jobs', () => {
    expect(() => {
      db.prepare(`INSERT INTO cron_jobs (id, name, type, schedule_type, schedule_value, config)
        VALUES ('t1', 'test', 'ai', 'invalid', '* * * * *', '{}')`).run();
    }).toThrow();
  });

  it('should enforce status CHECK constraint on cron_history', () => {
    // First insert a valid job
    db.prepare(`INSERT INTO cron_jobs (id, name, type, schedule_type, schedule_value, config)
      VALUES ('j1', 'test', 'ai', 'cron', '* * * * *', '{}')`).run();
    expect(() => {
      db.prepare(`INSERT INTO cron_history (id, job_id, started_at, status)
        VALUES ('h1', 'j1', datetime('now'), 'invalid')`).run();
    }).toThrow();
  });

  it('should cascade delete cron_history when cron_job is deleted', () => {
    db.prepare(`INSERT INTO cron_jobs (id, name, type, schedule_type, schedule_value, config)
      VALUES ('j1', 'test', 'ai', 'cron', '* * * * *', '{}')`).run();
    db.prepare(`INSERT INTO cron_history (id, job_id, started_at, status)
      VALUES ('h1', 'j1', datetime('now'), 'success')`).run();

    const before = db.prepare('SELECT COUNT(*) as cnt FROM cron_history WHERE job_id = ?').get('j1') as any;
    expect(before.cnt).toBe(1);

    db.prepare('DELETE FROM cron_jobs WHERE id = ?').run('j1');

    const after = db.prepare('SELECT COUNT(*) as cnt FROM cron_history WHERE job_id = ?').get('j1') as any;
    expect(after.cnt).toBe(0);
  });

  it('should have index on cron_history(job_id)', () => {
    const indexes = db.prepare("PRAGMA index_list('cron_history')").all() as any[];
    const indexNames = indexes.map((i: any) => i.name);
    expect(indexNames.some((n: string) => n.includes('job_id'))).toBe(true);
  });

  it('should have rich execution data columns in cron_history', () => {
    const cols = db.prepare("PRAGMA table_info('cron_history')").all() as any[];
    const colNames = cols.map((c: any) => c.name);
    expect(colNames).toContain('prompt');
    expect(colNames).toContain('config_snapshot');
    expect(colNames).toContain('turn_segments');
    expect(colNames).toContain('tool_records');
    expect(colNames).toContain('reasoning');
    expect(colNames).toContain('usage');
    expect(colNames).toContain('content');
  });

  it('should be idempotent on repeated migration', () => {
    // Close and re-init — should not throw
    db.close();
    const db2 = initDb(dbPath);
    const cols = db2.prepare("PRAGMA table_info('cron_history')").all() as any[];
    const colNames = cols.map((c: any) => c.name);
    expect(colNames).toContain('prompt');
    expect(colNames).toContain('content');
    db2.close();
    // Re-open for afterEach cleanup
    db = initDb(dbPath);
  });
});
