import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import { SessionStore } from '../../src/auth/session.js';
import { createAuthMiddleware } from '../../src/auth/middleware.js';

function createTestApp(sessionStore: SessionStore) {
  const app = express();
  const authMiddleware = createAuthMiddleware(sessionStore);

  // Public route (login is exempted in real app, simulate here)
  app.get('/api/auth/login', (_req, res) => {
    res.json({ public: true });
  });

  // Protected routes
  app.use('/api', authMiddleware);
  app.get('/api/protected', (_req, res) => {
    res.json({ data: 'secret' });
  });

  return app;
}

async function request(app: express.Express, path: string, cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) {
    headers['cookie'] = cookie;
  }

  // Use native fetch with express listening
  const server = app.listen(0);
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;

  try {
    const res = await fetch(`http://localhost:${port}${path}`, { headers });
    const body = await res.json();
    return { status: res.status, body };
  } finally {
    server.close();
  }
}

describe('auth middleware', () => {
  let store: SessionStore;
  let app: express.Express;

  beforeEach(() => {
    store = new SessionStore();
    app = createTestApp(store);
  });

  it('should allow requests with valid session cookie', async () => {
    const token = store.create();
    const { status, body } = await request(app, '/api/protected', `session=${token}`);

    expect(status).toBe(200);
    expect(body).toEqual({ data: 'secret' });
  });

  it('should reject requests without session cookie', async () => {
    const { status, body } = await request(app, '/api/protected');

    expect(status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('should reject requests with invalid session cookie', async () => {
    const { status, body } = await request(app, '/api/protected', 'session=bad-token');

    expect(status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('should reject requests with invalidated session', async () => {
    const token = store.create();
    store.invalidate(token);
    const { status } = await request(app, '/api/protected', `session=${token}`);

    expect(status).toBe(401);
  });
});
