import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { SessionStore } from '../../src/auth/session.js';
import { createAuthRoutes } from '../../src/auth/routes.js';
import { createAuthMiddleware } from '../../src/auth/middleware.js';
import type { Server } from 'node:http';

const TEST_PASSWORD = 'correct-password';
// bcrypt hash of 'correct-password' with 1 round (fast for tests)
let passwordHash: string;

describe('auth routes', () => {
  let store: SessionStore;
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const bcrypt = await import('bcrypt');
    passwordHash = await bcrypt.hash(TEST_PASSWORD, 1);
  });

  beforeEach(() => {
    store = new SessionStore();
    app = express();
    app.use(express.json());

    const authRoutes = createAuthRoutes(store, passwordHash);
    app.use('/api/auth', authRoutes);

    // Protected route to test auth status
    const authMiddleware = createAuthMiddleware(store);
    app.use('/api', authMiddleware);
    app.get('/api/test', (_req, res) => res.json({ ok: true }));

    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(() => {
    server?.close();
  });

  describe('POST /api/auth/login', () => {
    it('should return 200 and set cookie on correct password', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: TEST_PASSWORD }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ ok: true });

      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain('session=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('SameSite=Strict');
      expect(setCookie).toContain('Path=/');
    });

    it('should return 401 on wrong password', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'wrong' }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: 'Invalid password' });

      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeNull();
    });

    it('should return 400 when password is missing', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: 'Password required' });
    });

    it('should return 400 on empty body', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/auth/logout', () => {
    it('should clear session and cookie', async () => {
      // Login first
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: TEST_PASSWORD }),
      });
      const cookie = loginRes.headers.get('set-cookie')!.split(';')[0];

      // Logout
      const res = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'DELETE',
        headers: { cookie },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ ok: true });

      // Verify session is invalidated — protected route should fail
      const testRes = await fetch(`${baseUrl}/api/test`, {
        headers: { cookie },
      });
      expect(testRes.status).toBe(401);
    });
  });

  describe('GET /api/auth/status', () => {
    it('should return authenticated: true with valid session', async () => {
      // Login first
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: TEST_PASSWORD }),
      });
      const cookie = loginRes.headers.get('set-cookie')!.split(';')[0];

      const res = await fetch(`${baseUrl}/api/auth/status`, {
        headers: { cookie },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ authenticated: true });
    });

    it('should return authenticated: false without session', async () => {
      const res = await fetch(`${baseUrl}/api/auth/status`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ authenticated: false });
    });
  });
});
