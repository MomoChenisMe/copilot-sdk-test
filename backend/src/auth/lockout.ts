/**
 * Account lockout backed by SQLite.
 * 10 consecutive failures triggers a 15-minute lockout (global, not per-IP).
 */

import type Database from 'better-sqlite3';

const MAX_CONSECUTIVE_FAILURES = 10;
const LOCKOUT_MINUTES = 15;

export class AccountLockout {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS login_lockout (
        id              INTEGER PRIMARY KEY,
        consecutive_failures INTEGER DEFAULT 0,
        locked_until    TEXT NULL
      )
    `);

    // Ensure exactly one row exists (singleton record, id = 1)
    const row = this.db
      .prepare('SELECT id FROM login_lockout WHERE id = 1')
      .get() as { id: number } | undefined;

    if (!row) {
      this.db
        .prepare('INSERT INTO login_lockout (id, consecutive_failures, locked_until) VALUES (1, 0, NULL)')
        .run();
    }
  }

  /** Check whether the account is currently locked out. */
  isLocked(): { locked: boolean; lockedUntil?: string } {
    const row = this.db
      .prepare('SELECT consecutive_failures, locked_until FROM login_lockout WHERE id = 1')
      .get() as { consecutive_failures: number; locked_until: string | null };

    if (!row || !row.locked_until) return { locked: false };

    const lockedUntil = new Date(row.locked_until);
    if (lockedUntil > new Date()) {
      return { locked: true, lockedUntil: row.locked_until };
    }

    // Lock has expired — reset automatically
    this.recordSuccess();
    return { locked: false };
  }

  /** Record a failed login attempt. Locks the account after 10 consecutive failures. */
  recordFailure(): void {
    this.db
      .prepare('UPDATE login_lockout SET consecutive_failures = consecutive_failures + 1 WHERE id = 1')
      .run();

    const row = this.db
      .prepare('SELECT consecutive_failures FROM login_lockout WHERE id = 1')
      .get() as { consecutive_failures: number };

    if (row.consecutive_failures >= MAX_CONSECUTIVE_FAILURES) {
      const lockedUntil = new Date(
        Date.now() + LOCKOUT_MINUTES * 60 * 1000,
      ).toISOString();

      this.db
        .prepare('UPDATE login_lockout SET locked_until = ? WHERE id = 1')
        .run(lockedUntil);
    }
  }

  /** Reset failures and lockout on successful login. */
  recordSuccess(): void {
    this.db
      .prepare('UPDATE login_lockout SET consecutive_failures = 0, locked_until = NULL WHERE id = 1')
      .run();
  }
}
