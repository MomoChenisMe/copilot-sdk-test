import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname2 = dirname(fileURLToPath(import.meta.url));

const wsClientSource = readFileSync(
  resolve(__dirname2, '../../src/lib/ws-client.ts'),
  'utf-8',
);

describe('ws-client source analysis', () => {
  it('should use 25000ms ping interval instead of 30000ms', () => {
    expect(wsClientSource).toContain('25_000');
    // Ping interval should NOT be 30000 (old value)
    expect(wsClientSource).not.toMatch(/setInterval\([\s\S]*?ping[\s\S]*?,\s*30000\s*\)/);
  });

  it('should include Page Visibility API handler', () => {
    expect(wsClientSource).toContain('visibilitychange');
    expect(wsClientSource).toContain('document.visibilityState');
  });

  it('should include visibility handler setup in connect flow', () => {
    // Should setup visibility handler when connecting
    expect(wsClientSource).toContain('setupVisibilityHandler');
  });

  it('should cleanup visibility handler on disconnect', () => {
    // Should remove event listener on cleanup
    expect(wsClientSource).toContain('removeEventListener');
  });
});
