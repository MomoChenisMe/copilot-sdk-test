import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { WebSocket } from 'ws';
import { SessionStore } from '../../src/auth/session.js';
import { createWsServer } from '../../src/ws/server.js';

const __dirname2 = dirname(fileURLToPath(import.meta.url));

describe('WebSocket server', () => {
  let httpServer: http.Server;
  let sessionStore: SessionStore;
  let port: number;

  beforeEach(async () => {
    sessionStore = new SessionStore();
    httpServer = http.createServer();
    createWsServer(httpServer, sessionStore);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        port = typeof addr === 'object' && addr ? addr.port : 0;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  function connect(cookie?: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {};
      if (cookie) headers['cookie'] = cookie;

      const ws = new WebSocket(`ws://localhost:${port}/ws`, { headers });
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  function connectAndExpectClose(cookie?: string): Promise<{ code: number }> {
    return new Promise((resolve) => {
      const headers: Record<string, string> = {};
      if (cookie) headers['cookie'] = cookie;

      const ws = new WebSocket(`ws://localhost:${port}/ws`, { headers });
      ws.on('close', (code) => resolve({ code }));
      ws.on('unexpected-response', (_req, res) => {
        resolve({ code: res.statusCode ?? 0 });
      });
    });
  }

  it('should accept connection with valid session cookie', async () => {
    const token = sessionStore.create();
    const ws = await connect(`session=${token}`);

    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it('should reject connection without session cookie', async () => {
    const result = await connectAndExpectClose();

    expect(result.code).toBe(401);
  });

  it('should reject connection with invalid session cookie', async () => {
    const result = await connectAndExpectClose('session=bad-token');

    expect(result.code).toBe(401);
  });

  it('should handle messages after connection', async () => {
    const token = sessionStore.create();
    const ws = await connect(`session=${token}`);

    const response = await new Promise<string>((resolve) => {
      ws.on('message', (data) => resolve(data.toString()));
      ws.send(JSON.stringify({ type: 'ping' }));
    });

    const parsed = JSON.parse(response);
    expect(parsed.type).toBe('pong');

    ws.close();
  });
});

describe('ws/server heartbeat constants', () => {
  const serverSource = readFileSync(
    resolve(__dirname2, '../../src/ws/server.ts'),
    'utf-8',
  );

  it('should set HEARTBEAT_TIMEOUT to 180 seconds', () => {
    expect(serverSource).toContain('180_000');
    expect(serverSource).not.toMatch(/HEARTBEAT_TIMEOUT\s*=\s*60_000/);
  });

  it('should reset heartbeat timer on all incoming WS messages, not just ping', () => {
    // lastPing = Date.now() should be called unconditionally for every message,
    // not only inside the `if (message.type === 'ping')` block
    const msgHandlerMatch = serverSource.match(/ws\.on\('message'[\s\S]*?\n {4}\}\);/);
    expect(msgHandlerMatch).toBeTruthy();
    const handler = msgHandlerMatch![0];

    const lastPingIdx = handler.indexOf('lastPing = Date.now()');
    const pingCheckIdx = handler.indexOf("message.type === 'ping'");

    expect(lastPingIdx).toBeGreaterThan(-1);
    // If ping check still exists, lastPing update must come BEFORE it
    if (pingCheckIdx > -1) {
      expect(lastPingIdx).toBeLessThan(pingCheckIdx);
    }
  });
});
