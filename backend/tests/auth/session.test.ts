import { describe, it, expect, beforeEach } from 'vitest';
import { SessionStore } from '../../src/auth/session.js';

describe('SessionStore', () => {
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore();
  });

  it('should create a session token', () => {
    const token = store.create();

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should validate a valid token', () => {
    const token = store.create();

    expect(store.validate(token)).toBe(true);
  });

  it('should reject an invalid token', () => {
    expect(store.validate('nonexistent-token')).toBe(false);
  });

  it('should reject an empty string', () => {
    expect(store.validate('')).toBe(false);
  });

  it('should invalidate a token', () => {
    const token = store.create();
    expect(store.validate(token)).toBe(true);

    store.invalidate(token);
    expect(store.validate(token)).toBe(false);
  });

  it('should not throw when invalidating a nonexistent token', () => {
    expect(() => store.invalidate('nonexistent')).not.toThrow();
  });

  it('should create unique tokens', () => {
    const token1 = store.create();
    const token2 = store.create();

    expect(token1).not.toBe(token2);
  });

  it('should handle multiple sessions independently', () => {
    const token1 = store.create();
    const token2 = store.create();

    store.invalidate(token1);

    expect(store.validate(token1)).toBe(false);
    expect(store.validate(token2)).toBe(true);
  });
});
