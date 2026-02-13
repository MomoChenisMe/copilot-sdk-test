import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Set required env vars
    process.env.WEB_PASSWORD = 'test-password';
    process.env.SESSION_SECRET = 'test-secret-at-least-16-chars';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load config with default values', async () => {
    const { loadConfig } = await import('../src/config.js');
    const config = loadConfig();

    expect(config.port).toBe(3001);
    // Vitest sets NODE_ENV=test, so default is overridden
    expect(config.nodeEnv).toBe('test');
    expect(config.webPassword).toBe('test-password');
    expect(config.sessionSecret).toBe('test-secret-at-least-16-chars');
    expect(config.dbPath).toBe('./data/conversations.db');
  });

  it('should use custom PORT when provided', async () => {
    process.env.PORT = '4000';
    const { loadConfig } = await import('../src/config.js');
    const config = loadConfig();

    expect(config.port).toBe(4000);
  });

  it('should throw when WEB_PASSWORD is missing', async () => {
    delete process.env.WEB_PASSWORD;
    const { loadConfig } = await import('../src/config.js');

    expect(() => loadConfig()).toThrow();
  });

  it('should throw when SESSION_SECRET is missing', async () => {
    delete process.env.SESSION_SECRET;
    const { loadConfig } = await import('../src/config.js');

    expect(() => loadConfig()).toThrow();
  });

  it('should accept production NODE_ENV', async () => {
    process.env.NODE_ENV = 'production';
    const { loadConfig } = await import('../src/config.js');
    const config = loadConfig();

    expect(config.nodeEnv).toBe('production');
  });

  it('should use custom DEFAULT_CWD', async () => {
    process.env.DEFAULT_CWD = '/tmp/workspace';
    const { loadConfig } = await import('../src/config.js');
    const config = loadConfig();

    expect(config.defaultCwd).toBe('/tmp/workspace');
  });

  it('should use custom DB_PATH', async () => {
    process.env.DB_PATH = '/data/test.db';
    const { loadConfig } = await import('../src/config.js');
    const config = loadConfig();

    expect(config.dbPath).toBe('/data/test.db');
  });
});
