import { describe, it, expect, afterEach } from 'vitest';
import { initDb } from '../../src/conversation/db.js';
import { OpenSpecMetadataRepository } from '../../src/openspec/openspec-service.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function tempDbPath() {
  return path.join(os.tmpdir(), `test-meta-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

describe('openspec_metadata table', () => {
  const dbPaths: string[] = [];

  afterEach(() => {
    for (const p of dbPaths) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
    dbPaths.length = 0;
  });

  it('should create openspec_metadata table on init', () => {
    const dbPath = tempDbPath();
    dbPaths.push(dbPath);
    const db = initDb(dbPath);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    expect(tables.map((t) => t.name)).toContain('openspec_metadata');

    db.close();
  });

  it('should be idempotent on repeated init', () => {
    const dbPath = tempDbPath();
    dbPaths.push(dbPath);
    const db1 = initDb(dbPath);
    db1.close();
    const db2 = initDb(dbPath);

    const tables = db2
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    expect(tables.map((t) => t.name)).toContain('openspec_metadata');

    db2.close();
  });
});

describe('OpenSpecMetadataRepository', () => {
  const dbPaths: string[] = [];
  let db: ReturnType<typeof initDb>;
  let repo: OpenSpecMetadataRepository;

  function setup() {
    const dbPath = tempDbPath();
    dbPaths.push(dbPath);
    db = initDb(dbPath);
    repo = new OpenSpecMetadataRepository(db);
  }

  afterEach(() => {
    try { db?.close(); } catch { /* ignore */ }
    for (const p of dbPaths) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
    dbPaths.length = 0;
  });

  describe('upsert', () => {
    it('should insert a new metadata record', () => {
      setup();
      const result = repo.upsert({ name: 'my-change', type: 'change', cwd: '/project' });
      expect(result.id).toBeGreaterThan(0);
      expect(result.name).toBe('my-change');
      expect(result.type).toBe('change');
      expect(result.cwd).toBe('/project');
      expect(result.createdAt).toBeTruthy();
    });

    it('should update on conflict (same name+type+cwd)', () => {
      setup();
      const first = repo.upsert({ name: 'my-change', type: 'change', cwd: '/project' });
      const second = repo.upsert({ name: 'my-change', type: 'change', cwd: '/project' });
      expect(second.id).toBe(first.id);
      expect(second.updatedAt).toBeTruthy();
    });

    it('should store createdBy when provided', () => {
      setup();
      const result = repo.upsert({ name: 'my-change', type: 'change', cwd: '/project', createdBy: 'user123' });
      expect(result.createdBy).toBe('user123');
    });
  });

  describe('queryByCwd', () => {
    it('should return records filtered by cwd', () => {
      setup();
      repo.upsert({ name: 'change-a', type: 'change', cwd: '/project-a' });
      repo.upsert({ name: 'change-b', type: 'change', cwd: '/project-b' });
      const results = repo.queryByCwd('/project-a');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('change-a');
    });

    it('should filter by type when provided', () => {
      setup();
      repo.upsert({ name: 'change-1', type: 'change', cwd: '/project' });
      repo.upsert({ name: 'spec-1', type: 'spec', cwd: '/project' });
      const changes = repo.queryByCwd('/project', 'change');
      expect(changes).toHaveLength(1);
      expect(changes[0].name).toBe('change-1');
    });
  });

  describe('delete', () => {
    it('should delete a metadata record and return true', () => {
      setup();
      repo.upsert({ name: 'to-delete', type: 'change', cwd: '/project' });
      const deleted = repo.delete('to-delete', 'change', '/project');
      expect(deleted).toBe(true);
      const remaining = repo.queryByCwd('/project');
      expect(remaining).toHaveLength(0);
    });

    it('should return false when record does not exist', () => {
      setup();
      const deleted = repo.delete('nonexistent', 'change', '/project');
      expect(deleted).toBe(false);
    });
  });

  describe('markArchived', () => {
    it('should update existing change record to archived type', () => {
      setup();
      repo.upsert({ name: 'my-change', type: 'change', cwd: '/project' });
      repo.markArchived('my-change', '/project', '2026-02-23-my-change');
      const result = repo.queryOne('2026-02-23-my-change', 'archived', '/project');
      expect(result).toBeTruthy();
      expect(result!.type).toBe('archived');
      expect(result!.archivedAt).toBeTruthy();
    });

    it('should create a new archived record if no change record exists', () => {
      setup();
      repo.markArchived('unknown-change', '/project', '2026-02-23-unknown-change');
      const result = repo.queryOne('2026-02-23-unknown-change', 'archived', '/project');
      expect(result).toBeTruthy();
      expect(result!.type).toBe('archived');
      expect(result!.archivedAt).toBeTruthy();
    });
  });

  describe('queryOne', () => {
    it('should return null for non-existent record', () => {
      setup();
      const result = repo.queryOne('nope', 'change', '/project');
      expect(result).toBeNull();
    });

    it('should return matching record', () => {
      setup();
      repo.upsert({ name: 'found-me', type: 'spec', cwd: '/project' });
      const result = repo.queryOne('found-me', 'spec', '/project');
      expect(result).toBeTruthy();
      expect(result!.name).toBe('found-me');
    });
  });
});
