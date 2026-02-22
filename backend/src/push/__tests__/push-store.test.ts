import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { PushStore, type PushSubscriptionRecord } from '../push-store.js';

describe('PushStore', () => {
  let db: Database.Database;
  let store: PushStore;

  const sub1: PushSubscriptionRecord = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    keys: { p256dh: 'key-p256dh-1', auth: 'key-auth-1' },
  };

  const sub2: PushSubscriptionRecord = {
    endpoint: 'https://updates.push.services.mozilla.com/xyz789',
    keys: { p256dh: 'key-p256dh-2', auth: 'key-auth-2' },
  };

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    store = new PushStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should upsert and retrieve subscriptions', () => {
    store.upsert(sub1);
    store.upsert(sub2);
    const all = store.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((s) => s.endpoint)).toContain(sub1.endpoint);
    expect(all.map((s) => s.endpoint)).toContain(sub2.endpoint);
  });

  it('should handle duplicate endpoint upsert (update keys)', () => {
    store.upsert(sub1);
    const updated = {
      ...sub1,
      keys: { p256dh: 'new-p256dh', auth: 'new-auth' },
    };
    store.upsert(updated);
    const all = store.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].keys.p256dh).toBe('new-p256dh');
  });

  it('should delete by endpoint', () => {
    store.upsert(sub1);
    store.upsert(sub2);
    store.deleteByEndpoint(sub1.endpoint);
    const all = store.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].endpoint).toBe(sub2.endpoint);
  });

  it('should return empty array when no subscriptions', () => {
    const all = store.getAll();
    expect(all).toEqual([]);
  });

  it('should ignore delete of non-existent endpoint', () => {
    store.upsert(sub1);
    store.deleteByEndpoint('https://nonexistent.example.com/foo');
    const all = store.getAll();
    expect(all).toHaveLength(1);
  });
});
