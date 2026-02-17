import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import type { MemoryStore } from './memory-store.js';

export interface MemoryFact {
  id: string;
  content: string;
  category: string;
  source: string;
  createdAt: string;
}

export interface MemorySearchResult extends MemoryFact {
  rank: number;
}

export class MemoryIndex {
  constructor(private db: Database.Database) {
    this.initTables();
  }

  private initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_facts (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        source TEXT NOT NULL DEFAULT 'MEMORY.md',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS memory_facts_fts
        USING fts5(id, content);
    `);
  }

  addFact(content: string, category: string, source: string): string {
    const id = crypto.randomUUID();
    const txn = this.db.transaction(() => {
      this.db
        .prepare('INSERT INTO memory_facts (id, content, category, source) VALUES (?, ?, ?, ?)')
        .run(id, content, category, source);
      this.db
        .prepare('INSERT INTO memory_facts_fts (id, content) VALUES (?, ?)')
        .run(id, content);
    });
    txn();
    return id;
  }

  getFact(id: string): MemoryFact | null {
    const row = this.db
      .prepare('SELECT id, content, category, source, created_at as createdAt FROM memory_facts WHERE id = ?')
      .get(id) as MemoryFact | undefined;
    return row ?? null;
  }

  updateFact(id: string, content: string): void {
    const txn = this.db.transaction(() => {
      this.db.prepare('UPDATE memory_facts SET content = ? WHERE id = ?').run(content, id);
      this.db.prepare('DELETE FROM memory_facts_fts WHERE id = ?').run(id);
      this.db.prepare('INSERT INTO memory_facts_fts (id, content) VALUES (?, ?)').run(id, content);
    });
    txn();
  }

  removeFact(id: string): void {
    const txn = this.db.transaction(() => {
      this.db.prepare('DELETE FROM memory_facts WHERE id = ?').run(id);
      this.db.prepare('DELETE FROM memory_facts_fts WHERE id = ?').run(id);
    });
    txn();
  }

  searchBM25(query: string, limit = 10): MemorySearchResult[] {
    const safeQuery = query
      .replace(/['"]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => `"${w}"`)
      .join(' OR ');

    if (!safeQuery) return [];

    const rows = this.db
      .prepare(
        `SELECT f.id, f.content, f.category, f.source, f.created_at as createdAt, fts.rank
         FROM memory_facts_fts fts
         JOIN memory_facts f ON f.id = fts.id
         WHERE memory_facts_fts MATCH ?
         ORDER BY fts.rank
         LIMIT ?`,
      )
      .all(safeQuery, limit) as MemorySearchResult[];

    return rows;
  }

  getAllFacts(): MemoryFact[] {
    return this.db
      .prepare('SELECT id, content, category, source, created_at as createdAt FROM memory_facts ORDER BY created_at')
      .all() as MemoryFact[];
  }

  getStats(): { totalFacts: number } {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM memory_facts').get() as { cnt: number };
    return { totalFacts: row.cnt };
  }

  reindexFromFiles(store: MemoryStore): void {
    const txn = this.db.transaction(() => {
      this.db.exec('DELETE FROM memory_facts');
      this.db.exec('DELETE FROM memory_facts_fts');

      const insertFact = this.db.prepare(
        'INSERT INTO memory_facts (id, content, category, source) VALUES (?, ?, ?, ?)',
      );
      const insertFts = this.db.prepare(
        'INSERT INTO memory_facts_fts (id, content) VALUES (?, ?)',
      );

      const addLine = (content: string, category: string, source: string) => {
        const id = crypto.randomUUID();
        insertFact.run(id, content, category, source);
        insertFts.run(id, content);
      };

      // Index MEMORY.md
      const memory = store.readMemory();
      if (memory.trim()) {
        for (const line of memory.split('\n')) {
          const content = line.replace(/^[-*]\s*/, '').trim();
          if (content) addLine(content, 'general', 'MEMORY.md');
        }
      }

      // Index daily logs
      for (const date of store.listDailyLogs()) {
        const log = store.readDailyLog(date);
        if (log.trim()) {
          for (const line of log.split('\n')) {
            const content = line.replace(/^[-*]\s*/, '').trim();
            if (content) addLine(content, 'daily', `daily/${date}.md`);
          }
        }
      }
    });
    txn();
  }
}
