import type { Request, Response, NextFunction } from 'express';
import { parse as parseCookie } from 'cookie';
import type { SessionStore } from './session.js';

export function createAuthMiddleware(sessionStore: SessionStore) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const cookies = parseCookie(cookieHeader);
    const token = cookies.session;

    if (!token || !sessionStore.validate(token)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    next();
  };
}
