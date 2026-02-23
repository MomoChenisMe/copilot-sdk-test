/**
 * CSRF protection using the double-submit cookie pattern.
 *
 * The client must:
 *   1. Read the `csrf` cookie value.
 *   2. Send it back in the `X-CSRF-Token` request header on every mutating request.
 *
 * The middleware compares the two values and rejects the request with 403 if they
 * do not match or are missing.
 */

import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

/** Generate a cryptographically random CSRF token. */
export function generateCsrfToken(): string {
  return randomUUID();
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Create Express middleware that enforces double-submit CSRF protection. */
export function createCsrfMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Safe (read-only) methods are always allowed
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    // Parse cookies manually if not already parsed (cookie header → simple map)
    const cookieHeader = req.headers.cookie ?? '';
    const cookies: Record<string, string> = {};
    for (const pair of cookieHeader.split(';')) {
      const [name, ...rest] = pair.trim().split('=');
      if (name) cookies[name.trim()] = rest.join('=').trim();
    }

    const cookieToken = cookies['csrf'] ?? '';
    const headerToken =
      (req.headers['x-csrf-token'] as string | undefined) ?? '';

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      res.status(403).json({ error: 'CSRF token mismatch.' });
      return;
    }

    next();
  };
}
