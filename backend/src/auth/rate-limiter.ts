/**
 * IP-based rate limiter for login attempts.
 * In-memory Map — resets on server restart.
 * Max 5 failed attempts per 60-second sliding window.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000; // 60 seconds

interface AttemptRecord {
  timestamps: number[];
}

export class RateLimiter {
  private attempts = new Map<string, AttemptRecord>();

  /**
   * Check whether the given IP is currently blocked.
   * Returns the number of seconds until the block expires if blocked.
   */
  isBlocked(ip: string): { blocked: boolean; retryAfter?: number } {
    const record = this.attempts.get(ip);
    if (!record) return { blocked: false };

    const now = Date.now();
    // Prune timestamps outside the window
    record.timestamps = record.timestamps.filter(
      (t) => now - t < WINDOW_MS,
    );

    if (record.timestamps.length >= MAX_ATTEMPTS) {
      const oldest = record.timestamps[0];
      const retryAfter = Math.ceil((oldest + WINDOW_MS - now) / 1000);
      return { blocked: true, retryAfter };
    }

    return { blocked: false };
  }

  /** Record a failed login attempt for the given IP. */
  record(ip: string): void {
    const now = Date.now();
    let record = this.attempts.get(ip);

    if (!record) {
      record = { timestamps: [] };
      this.attempts.set(ip, record);
    }

    // Prune old entries before pushing
    record.timestamps = record.timestamps.filter(
      (t) => now - t < WINDOW_MS,
    );
    record.timestamps.push(now);
  }

  /** Clear all attempts for an IP (call on successful login). */
  reset(ip: string): void {
    this.attempts.delete(ip);
  }
}
