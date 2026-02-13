import { randomUUID } from 'node:crypto';

export class SessionStore {
  private sessions = new Set<string>();

  create(): string {
    const token = randomUUID();
    this.sessions.add(token);
    return token;
  }

  validate(token: string): boolean {
    if (!token) return false;
    return this.sessions.has(token);
  }

  invalidate(token: string): void {
    this.sessions.delete(token);
  }
}
