/**
 * Basic password strength validator.
 */

const MIN_LENGTH = 8;

export function validatePassword(
  password: string,
): { valid: boolean; error?: string } {
  if (!password || password.length < MIN_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_LENGTH} characters long.`,
    };
  }

  return { valid: true };
}
