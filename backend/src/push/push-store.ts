import type Database from 'better-sqlite3';

export interface PushSubscriptionRecord {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushStore {
  constructor(private db: Database.Database) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        endpoint TEXT PRIMARY KEY,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  upsert(sub: PushSubscriptionRecord): void {
    this.db
      .prepare(
        `INSERT INTO push_subscriptions (endpoint, p256dh, auth)
         VALUES (?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET
           p256dh = excluded.p256dh,
           auth = excluded.auth,
           updated_at = datetime('now')`,
      )
      .run(sub.endpoint, sub.keys.p256dh, sub.keys.auth);
  }

  getAll(): PushSubscriptionRecord[] {
    const rows = this.db
      .prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions')
      .all() as { endpoint: string; p256dh: string; auth: string }[];

    return rows.map((r) => ({
      endpoint: r.endpoint,
      keys: { p256dh: r.p256dh, auth: r.auth },
    }));
  }

  deleteByEndpoint(endpoint: string): void {
    this.db
      .prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')
      .run(endpoint);
  }
}
