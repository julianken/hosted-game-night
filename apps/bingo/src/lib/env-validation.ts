/**
 * Environment Variable Validation (Bingo)
 *
 * Validates required environment variables at application startup.
 * Fails fast if critical configuration is missing or invalid.
 *
 * Shared validators are imported from @joolie-boolie/auth/env-validation.
 * This file keeps the app-specific `validateEnvironment()` orchestrator.
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
 * Optional (warning only):
 * - COOKIE_DOMAIN (cross-subdomain SSO)
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
