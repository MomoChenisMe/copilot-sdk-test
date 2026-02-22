import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadOrGenerateVapidKeys } from '../vapid-keys.js';

describe('loadOrGenerateVapidKeys', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vapid-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should generate new VAPID keys on first call', () => {
    const keys = loadOrGenerateVapidKeys(tmpDir);
    expect(keys.publicKey).toBeTruthy();
    expect(keys.privateKey).toBeTruthy();
    expect(typeof keys.publicKey).toBe('string');
    expect(typeof keys.privateKey).toBe('string');

    // File should be created
    const filePath = path.join(tmpDir, 'VAPID_KEYS.json');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('should return existing keys on subsequent calls', () => {
    const keys1 = loadOrGenerateVapidKeys(tmpDir);
    const keys2 = loadOrGenerateVapidKeys(tmpDir);
    expect(keys1.publicKey).toBe(keys2.publicKey);
    expect(keys1.privateKey).toBe(keys2.privateKey);
  });

  it('should regenerate keys when file is corrupted', () => {
    const filePath = path.join(tmpDir, 'VAPID_KEYS.json');
    fs.writeFileSync(filePath, 'not valid json');

    const keys = loadOrGenerateVapidKeys(tmpDir);
    expect(keys.publicKey).toBeTruthy();
    expect(keys.privateKey).toBeTruthy();
  });

  it('should regenerate keys when file has missing fields', () => {
    const filePath = path.join(tmpDir, 'VAPID_KEYS.json');
    fs.writeFileSync(filePath, JSON.stringify({ publicKey: 'only-public' }));

    const keys = loadOrGenerateVapidKeys(tmpDir);
    expect(keys.publicKey).toBeTruthy();
    expect(keys.privateKey).toBeTruthy();
    // Should have overwritten with valid keys
    expect(keys.publicKey).not.toBe('only-public');
  });
});
