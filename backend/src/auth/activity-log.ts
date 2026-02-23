/**
 * Session activity log backed by SQLite.
 * Records login attempts, logouts, and other auth-related events.
 */

import type Database from 'better-sqlite3';

export interface ActivityLogEntry {
  id: number;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  details: string | null;
  created_at: string;
}

export class ActivityLog {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_activity_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type  TEXT NOT NULL,
        ip_address  TEXT,
        user_agent  TEXT,
        details     TEXT,
        created_at  TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /** Record an activity event. */
  log(
    eventType: string,
    ip?: string,
    userAgent?: string,
    details?: string,
  ): void {
    this.db
      .prepare(
        `INSERT INTO session_activity_log (event_type, ip_address, user_agent, details)
         VALUES (?, ?, ?, ?)`,
      )
      .run(eventType, ip ?? null, userAgent ?? null, details ?? null);
  }

  /** Retrieve the most recent activity entries. */
  getRecent(limit = 50): ActivityLogEntry[] {
    return this.db
      .prepare(
        `SELECT id, event_type, ip_address, user_agent, details, created_at
         FROM session_activity_log
         ORDER BY id DESC
         LIMIT ?`,
      )
      .all(limit) as ActivityLogEntry[];
  }

  /**
   * Get distinct IP addresses that had a successful login within the last N days.
   * Useful for recognising returning IPs.
   */
  getRecentSuccessIps(days = 30): string[] {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT ip_address
         FROM session_activity_log
         WHERE event_type = 'login_success'
           AND created_at >= datetime('now', ? || ' days')`,
      )
      .all(`-${days}`) as { ip_address: string | null }[];

    return rows
      .map((r) => r.ip_address)
      .filter((ip): ip is string => ip !== null);
  }
}
