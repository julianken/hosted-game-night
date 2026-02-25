/**
 * Environment Variable Validation
 *
 * Validates required environment variables at application startup.
 * Fails fast if critical configuration is missing or invalid.
 */

/**
 * Validates that a required environment variable is set and non-empty.
 *
 * @param name - The environment variable name
 * @param description - Human-readable description for the error message
 * @throws Error if the variable is missing or empty
 */
function validateRequired(name: string, description: string): void {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `FATAL: Missing required environment variable: ${name}\n\n` +
        `${description}\n` +
        `Set it in .env.local:\n` +
        `  ${name}=your-value\n`
    );
  }
}

/**
 * Validates that an environment variable contains a valid URL
 * (starts with http:// or https://).
 *
 * @param name - The environment variable name
 * @param description - Human-readable description for the error message
 * @throws Error if the variable is missing, empty, or not a valid URL
 */
function validateUrl(name: string, description: string): void {
  validateRequired(name, description);
  const value = process.env[name]!;
  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    throw new Error(
      `FATAL: ${name} must be a valid URL starting with http:// or https://\n\n` +
        `Current value: "${value}"\n` +
        `${description}\n`
    );
  }
}

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
 * Validates Supabase configuration variables required by all apps.
 *
 * @throws Error if any Supabase variable is missing or invalid
 */
export function validateSupabaseConfig(): void {
  validateUrl(
    'NEXT_PUBLIC_SUPABASE_URL',
    'This is the URL of your Supabase project. Find it in your Supabase dashboard.'
  );
  validateRequired(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'This is the anonymous (public) key for your Supabase project. Find it in your Supabase dashboard.'
  );
  validateRequired(
    'SUPABASE_SERVICE_ROLE_KEY',
    'This is the service role key for your Supabase project. Find it in your Supabase dashboard under Settings > API.'
  );
}

/**
 * Validates the SUPABASE_JWT_SECRET variable.
 *
 * @throws Error if SUPABASE_JWT_SECRET is missing or empty
 */
export function validateJwtSecret(): void {
  validateRequired(
    'SUPABASE_JWT_SECRET',
    'This is the JWT secret for your Supabase project, used for middleware JWT verification and OAuth token signing.\n' +
    'Find it in your Supabase dashboard under Settings > API > JWT Secret.'
  );
}

/**
 * Validates OAuth configuration variables required by game apps (bingo/trivia).
 *
 * @throws Error if any OAuth variable is missing or invalid
 */
export function validateOAuthConfig(): void {
  validateUrl(
    'NEXT_PUBLIC_PLATFORM_HUB_URL',
    'This is the URL of the Platform Hub for OAuth authentication.\n' +
    'For local development, use http://localhost:3002'
  );
  validateRequired(
    'NEXT_PUBLIC_OAUTH_CLIENT_ID',
    'This is the OAuth client ID for this application, registered with the Platform Hub.'
  );
}

/**
 * Validates E2E_JWT_SECRET when E2E_TESTING mode is enabled.
 *
 * @throws Error if E2E_TESTING is true but E2E_JWT_SECRET is missing
 */
export function validateE2eConfig(): void {
  if (process.env.E2E_TESTING === 'true') {
    validateRequired(
      'E2E_JWT_SECRET',
      'This variable is required when E2E_TESTING=true. It is used to sign test JWTs.'
    );
  }
}

/**
 * Validates all required environment variables at application startup
 *
 * Bingo requires:
 * - SESSION_TOKEN_SECRET (64-char hex)
 * - SUPABASE_JWT_SECRET (non-empty)
 * - NEXT_PUBLIC_SUPABASE_URL (valid URL)
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY (non-empty)
 * - SUPABASE_SERVICE_ROLE_KEY (non-empty)
 * - NEXT_PUBLIC_PLATFORM_HUB_URL (valid URL)
 * - NEXT_PUBLIC_OAUTH_CLIENT_ID (non-empty)
 * - E2E_JWT_SECRET (only when E2E_TESTING=true)
 *
 * @throws Error if any required environment variable is missing or invalid
 */
export function validateEnvironment(): void {
  // Validate SESSION_TOKEN_SECRET (strict hex format)
  validateSessionTokenSecret();

  // Validate Supabase configuration
  validateSupabaseConfig();

  // Validate JWT secret
  validateJwtSecret();

  // Validate OAuth configuration (game app specific)
  validateOAuthConfig();

  // Validate E2E config (only when E2E_TESTING=true)
  validateE2eConfig();
}
