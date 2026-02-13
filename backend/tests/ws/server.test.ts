import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import { WebSocket } from 'ws';
import { SessionStore } from '../../src/auth/session.js';
import { createWsServer } from '../../src/ws/server.js';

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
