import { Router } from 'express';
import bcrypt from 'bcrypt';
import { serialize, parse as parseCookie } from 'cookie';
import type { SessionStore } from './session.js';

export function createAuthRoutes(sessionStore: SessionStore, passwordHash: string): Router {
  const router = Router();

  // POST /login — no auth required
  router.post('/login', async (req, res) => {
    const { password } = req.body ?? {};

    if (!password) {
      res.status(400).json({ error: 'Password required' });
      return;
    }

    const valid = await bcrypt.compare(password, passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    const token = sessionStore.create();
    const cookie = serialize('session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 604800, // 7 days
    });

    res.setHeader('Set-Cookie', cookie);
    res.json({ ok: true });
  });

  // DELETE /logout — requires valid session
  router.delete('/logout', (req, res) => {
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const cookies = parseCookie(cookieHeader);
      const token = cookies.session;
      if (token) {
        sessionStore.invalidate(token);
      }
    }

    // Clear the cookie
    const cookie = serialize('session', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });

    res.setHeader('Set-Cookie', cookie);
    res.json({ ok: true });
  });

  // GET /status — no auth required, checks session validity
  router.get('/status', (req, res) => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      res.json({ authenticated: false });
      return;
    }

    const cookies = parseCookie(cookieHeader);
    const token = cookies.session;

    if (!token || !sessionStore.validate(token)) {
      res.json({ authenticated: false });
      return;
    }

    res.json({ authenticated: true });
  });

  return router;
}
