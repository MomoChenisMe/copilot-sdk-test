import { Router } from 'express';
import bcrypt from 'bcrypt';
import { serialize, parse as parseCookie } from 'cookie';
import type { SessionStore } from './session.js';
import type { RateLimiter } from './rate-limiter.js';
import type { AccountLockout } from './lockout.js';
import type { ActivityLog } from './activity-log.js';
import { generateCsrfToken } from './csrf.js';
import { validateResetToken } from './reset-cli.js';

export interface AuthDeps {
  sessionStore: SessionStore;
  passwordHash: string;
  rateLimiter: RateLimiter;
  lockout: AccountLockout;
  activityLog: ActivityLog;
  dataDir: string;
}

export function createAuthRoutes(deps: AuthDeps): Router {
  const { sessionStore, passwordHash, rateLimiter, lockout, activityLog, dataDir } = deps;
  const router = Router();

  // POST /login
  router.post('/login', async (req, res) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? '';
    const { password } = req.body ?? {};

    if (!password) {
      res.status(400).json({ error: 'Password required' });
      return;
    }

    // Rate limiter check (IP-based)
    const rateCheck = rateLimiter.isBlocked(ip);
    if (rateCheck.blocked) {
      activityLog.log('login_rate_limited', ip, userAgent);
      res.status(429).json({
        error: 'Too many attempts. Please try again later.',
        retryAfter: rateCheck.retryAfter,
      });
      return;
    }

    // Account lockout check (global)
    const lockoutCheck = lockout.isLocked();
    if (lockoutCheck.locked) {
      activityLog.log('login_locked_out', ip, userAgent);
      res.status(423).json({
        error: 'Account is temporarily locked due to too many failed attempts.',
        lockedUntil: lockoutCheck.lockedUntil,
      });
      return;
    }

    const valid = await bcrypt.compare(password, passwordHash);
    if (!valid) {
      rateLimiter.record(ip);
      lockout.recordFailure();
      activityLog.log('login_failure', ip, userAgent);
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    // Success
    rateLimiter.reset(ip);
    lockout.recordSuccess();

    const token = sessionStore.create(ip, userAgent);
    const csrfToken = generateCsrfToken();

    activityLog.log('login_success', ip, userAgent);

    // Detect new IP address
    const knownIps = activityLog.getRecentSuccessIps(30);
    if (knownIps.length > 1 && !knownIps.includes(ip)) {
      activityLog.log('login_new_ip', ip, userAgent, 'New IP address detected');
    }

    const sessionCookie = serialize('session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 604800,
    });

    const csrfCookie = serialize('csrf', csrfToken, {
      httpOnly: false, // client must read this
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 604800,
    });

    res.setHeader('Set-Cookie', [sessionCookie, csrfCookie]);
    res.json({ ok: true });
  });

  // POST /reset-password — reset via CLI-generated token
  router.post('/reset-password', async (req, res) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? '';
    const { token } = req.body ?? {};

    if (!token) {
      res.status(400).json({ error: 'Reset token is required.' });
      return;
    }

    if (!validateResetToken(dataDir, token)) {
      activityLog.log('password_reset_invalid_token', ip, userAgent);
      res.status(401).json({ error: 'Invalid or expired reset token.' });
      return;
    }

    // Clear any lockout on successful reset
    lockout.recordSuccess();
    activityLog.log('password_reset_success', ip, userAgent);
    res.json({ ok: true, message: 'Lockout cleared. Please restart the server with a new WEB_PASSWORD.' });
  });

  // DELETE /logout
  router.delete('/logout', (req, res) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? '';
    const cookieHeader = req.headers.cookie;

    if (cookieHeader) {
      const cookies = parseCookie(cookieHeader);
      const token = cookies.session;
      if (token) {
        sessionStore.invalidate(token);
      }
    }

    activityLog.log('logout', ip, userAgent);

    const sessionCookie = serialize('session', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });

    const csrfCookie = serialize('csrf', '', {
      httpOnly: false,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });

    res.setHeader('Set-Cookie', [sessionCookie, csrfCookie]);
    res.json({ ok: true });
  });

  // GET /status
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
