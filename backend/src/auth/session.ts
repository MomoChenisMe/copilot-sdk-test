import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class SessionStore {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        token         TEXT PRIMARY KEY,
        created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
        expires_at    TEXT NOT NULL,
        last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
        ip_address    TEXT,
        user_agent    TEXT
      )
    `);
  }

  create(ip?: string, userAgent?: string): string {
    const token = randomUUID();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();

    this.db
      .prepare(
        `INSERT INTO sessions (token, created_at, expires_at, last_activity, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(token, now, expiresAt, now, ip ?? null, userAgent ?? null);

    return token;
  }

  validate(token: string): boolean {
    if (!token) return false;

    const row = this.db
      .prepare('SELECT token, expires_at FROM sessions WHERE token = ?')
      .get(token) as { token: string; expires_at: string } | undefined;

    if (!row) return false;

    if (new Date(row.expires_at) <= new Date()) {
      this.invalidate(token);
      return false;
    }

    // Update last_activity
    this.db
      .prepare('UPDATE sessions SET last_activity = ? WHERE token = ?')
      .run(new Date().toISOString(), token);

    return true;
  }

  invalidate(token: string): void {
    this.db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }

  /** Remove all expired sessions. */
  cleanup(): number {
    const result = this.db
      .prepare('DELETE FROM sessions WHERE expires_at <= ?')
      .run(new Date().toISOString());
    return result.changes;
  }
}
