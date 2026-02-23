/**
 * CLI password-reset token utilities.
 *
 * A reset token is written to `<dataDir>/reset-token.txt` in the format:
 *   <token>:<ISO-8601 expiry>
 *
 * The token is valid for 1 hour and is single-use (the file is deleted upon
 * successful validation).
 */

import { randomUUID } from 'node:crypto';
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate a one-time reset token and persist it to disk.
 * Returns the raw token (to be displayed to the admin in the CLI).
 */
export function generateResetToken(dataDir: string): string {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const dir = join(dataDir);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const filePath = join(dataDir, 'reset-token.txt');
  writeFileSync(filePath, `${token}:${expiresAt}`, 'utf-8');

  return token;
}

/**
 * Validate a reset token.
 * On success the token file is deleted (single-use). Returns false if the
 * token is invalid, expired, or the file does not exist.
 */
export function validateResetToken(dataDir: string, token: string): boolean {
  const filePath = join(dataDir, 'reset-token.txt');

  if (!existsSync(filePath)) return false;

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8').trim();
  } catch {
    return false;
  }

  const separatorIndex = content.indexOf(':');
  if (separatorIndex === -1) return false;

  // Token is a UUID which does not contain colons, so split on first colon
  // is safe even though the ISO timestamp contains colons.
  // Actually a UUID contains hyphens not colons, but the ISO date has colons.
  // Format: <uuid>:<iso-date>   e.g. abc-def:2025-01-01T00:00:00.000Z
  // We need to split on the first colon that comes after the 36-char UUID.
  const storedToken = content.substring(0, 36); // UUID is always 36 chars
  const expiresAtStr = content.substring(37);   // skip the colon

  if (storedToken !== token) return false;

  const expiresAt = new Date(expiresAtStr);
  if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) return false;

  // Valid — consume the token
  try {
    unlinkSync(filePath);
  } catch {
    // Best-effort deletion
  }

  return true;
}
