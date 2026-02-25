/**
 * Environment Variable Validation (Trivia)
 *
 * Validates required environment variables at application startup.
 * Fails fast if critical configuration is missing or invalid.
 *
 * Shared validators are imported from @joolie-boolie/auth/env-validation.
 * This file keeps the app-specific `validateEnvironment()` orchestrator
 * and trivia-only validators (e.g., `warnIfMissingTriviaApiKey`).
 */

import {
  validateRequired,
  validateUrl,
  validateSessionTokenSecret,
  validateSupabaseConfig,
  validateJwtSecret,
  validateOAuthConfig,
  validateE2eConfig,
  warnIfMissingCookieDomain,
} from '@joolie-boolie/auth/env-validation';

// Re-export shared validators for consumers of this module
export {
  validateRequired,
  validateUrl,
  validateSessionTokenSecret,
  validateSupabaseConfig,
  validateJwtSecret,
  validateOAuthConfig,
  validateE2eConfig,
  warnIfMissingCookieDomain,
};

/**
 * Warn (but do not throw) if THE_TRIVIA_API_KEY is not set.
 *
 * The Trivia API key is optional -- the API works without it on the free tier,
 * but may be rate-limited. This function logs a warning at startup so operators
 * know the key is absent without blocking the application from starting.
 *
 * Call from the same startup location as validateEnvironment() if desired.
 */
export function warnIfMissingTriviaApiKey(): void {
  if (!process.env.THE_TRIVIA_API_KEY) {
    console.warn(
      '[env-validation] THE_TRIVIA_API_KEY is not set. ' +
      'The Trivia API integration will use the unauthenticated free tier, ' +
      'which may be rate-limited. Set THE_TRIVIA_API_KEY in .env.local for ' +
      'higher rate limits.'
    );
  }
}

/**
 * Validates all required environment variables at application startup
 *
 * Trivia requires:
 * - SESSION_TOKEN_SECRET (64-char hex)
 * - SUPABASE_JWT_SECRET (non-empty)
 * - NEXT_PUBLIC_SUPABASE_URL (valid URL)
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY (non-empty)
 * - SUPABASE_SERVICE_ROLE_KEY (non-empty)
 * - NEXT_PUBLIC_PLATFORM_HUB_URL (valid URL)
 * - NEXT_PUBLIC_OAUTH_CLIENT_ID (non-empty)
 * - E2E_JWT_SECRET (only when E2E_TESTING=true)
 *
 * Optional (warning only):
 * - COOKIE_DOMAIN (cross-subdomain SSO)
 * - THE_TRIVIA_API_KEY
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

  // Warn about optional but important configuration
  warnIfMissingCookieDomain();
}
