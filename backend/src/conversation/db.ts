import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export function initDb(dbPath: string): Database.Database {
  // Create parent directories
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);

  // Enable WAL mode and foreign keys
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run migrations
  migrate(db);

  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New Conversation',
      sdk_session_id TEXT,
      model TEXT NOT NULL DEFAULT 'gpt-5',
      cwd TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
      ON conversations(updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_conversations_pinned
      ON conversations(pinned DESC, updated_at DESC);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'tool', 'system')),
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
      ON messages(conversation_id, created_at);

    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      content,
      content=messages,
      content_rowid=rowid
    );

    -- Triggers for FTS sync
    CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
    END;

    CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.rowid, old.content);
    END;

    CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.rowid, old.content);
      INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
    END;
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      active_form TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','in_progress','completed','deleted')),
      owner TEXT,
      blocks TEXT NOT NULL DEFAULT '[]',
      blocked_by TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_conversation_id ON tasks(conversation_id, status);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS cron_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('ai', 'shell')),
      schedule_type TEXT NOT NULL CHECK(schedule_type IN ('cron', 'interval', 'once')),
      schedule_value TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run TEXT,
      next_run TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cron_history (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES cron_jobs(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL CHECK(status IN ('success', 'error', 'timeout', 'running')),
      output TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cron_history_job_id ON cron_history(job_id, created_at DESC);
  `);

  // Migration: add plan_file_path to conversations
  const cols = db
    .prepare("PRAGMA table_info('conversations')")
    .all() as { name: string }[];
  if (!cols.some((c) => c.name === 'plan_file_path')) {
    db.exec(`ALTER TABLE conversations ADD COLUMN plan_file_path TEXT`);
  }

  // Migration: update cron_history status CHECK to include 'running'
  const cronHistorySql = (db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='cron_history'",
  ).get() as any)?.sql as string | undefined;
  if (cronHistorySql && !cronHistorySql.includes("'running'")) {
    db.exec(`
      CREATE TABLE cron_history_new (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL REFERENCES cron_jobs(id) ON DELETE CASCADE,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        status TEXT NOT NULL CHECK(status IN ('success', 'error', 'timeout', 'running')),
        output TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO cron_history_new SELECT id, job_id, started_at, finished_at, status, output, created_at FROM cron_history;
      DROP TABLE cron_history;
      ALTER TABLE cron_history_new RENAME TO cron_history;
      CREATE INDEX IF NOT EXISTS idx_cron_history_job_id ON cron_history(job_id, created_at DESC);
    `);
  }

  // Migration: add cron fields to conversations
  const cronMigrations = [
    'ALTER TABLE conversations ADD COLUMN cron_enabled INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE conversations ADD COLUMN cron_schedule_type TEXT',
    'ALTER TABLE conversations ADD COLUMN cron_schedule_value TEXT',
    'ALTER TABLE conversations ADD COLUMN cron_prompt TEXT',
    'ALTER TABLE conversations ADD COLUMN cron_model TEXT',
  ];
  for (const sql of cronMigrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }

  // Migration: add rich execution data columns to cron_history
  const cronHistoryMigrations = [
    'ALTER TABLE cron_history ADD COLUMN prompt TEXT',
    'ALTER TABLE cron_history ADD COLUMN config_snapshot TEXT',
    'ALTER TABLE cron_history ADD COLUMN turn_segments TEXT',
    'ALTER TABLE cron_history ADD COLUMN tool_records TEXT',
    'ALTER TABLE cron_history ADD COLUMN reasoning TEXT',
    'ALTER TABLE cron_history ADD COLUMN usage TEXT',
    'ALTER TABLE cron_history ADD COLUMN content TEXT',
  ];
  for (const sql of cronHistoryMigrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }
}
