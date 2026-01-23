/**
 * Environment Variable Validation
 *
 * Validates required environment variables at application startup.
 * Fails fast if critical configuration is missing or invalid.
 */

/**
 * Validates that SESSION_TOKEN_SECRET is present and correctly formatted
 *
 * Requirements:
 * - Must exist (not undefined, not empty string)
 * - Must be exactly 64 characters (32 bytes in hex)
 * - Must be valid hexadecimal (0-9, a-f, A-F)
 *
 * @throws Error if SESSION_TOKEN_SECRET is missing or invalid
 */
export function validateSessionTokenSecret(): void {
  const secret = process.env.SESSION_TOKEN_SECRET;

  // Check if variable exists
  if (!secret) {
    throw new Error(
      'FATAL: SESSION_TOKEN_SECRET environment variable is not set.\n\n' +
      'This variable is required for HMAC-signed session tokens.\n' +
      'Generate a secure value with:\n' +
      '  openssl rand -hex 32\n\n' +
      'Add to your .env.local file:\n' +
      '  SESSION_TOKEN_SECRET=<your-64-character-hex-string>\n'
    );
  }

  // Check if empty string
  if (secret.trim() === '') {
    throw new Error(
      'FATAL: SESSION_TOKEN_SECRET environment variable is empty.\n\n' +
      'Generate a secure value with:\n' +
      '  openssl rand -hex 32\n'
    );
  }

  // Check length (32 bytes = 64 hex characters)
  if (secret.length !== 64) {
    throw new Error(
      `FATAL: SESSION_TOKEN_SECRET must be exactly 64 characters (32 bytes in hex).\n\n` +
      `Current length: ${secret.length} characters\n\n` +
      'Generate a correct value with:\n' +
      '  openssl rand -hex 32\n'
    );
  }

  // Check if valid hexadecimal
  const hexRegex = /^[0-9a-fA-F]{64}$/;
  if (!hexRegex.test(secret)) {
    throw new Error(
      'FATAL: SESSION_TOKEN_SECRET must contain only hexadecimal characters (0-9, a-f, A-F).\n\n' +
      'Generate a correct value with:\n' +
      '  openssl rand -hex 32\n'
    );
  }
}

/**
 * Validates all required environment variables at application startup
 *
 * Call this function at the top-level of your application to ensure
 * all required configuration is present before the app starts.
 *
 * @throws Error if any required environment variable is missing or invalid
 */
export function validateEnvironment(): void {
  // Validate SESSION_TOKEN_SECRET
  validateSessionTokenSecret();

  // Add additional environment validations here as needed
  // Example: validateSupabaseConfig(), validateAppConfig(), etc.
}
