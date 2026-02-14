/**
 * Next.js Instrumentation Hook
 *
 * This file is automatically called by Next.js once at application startup
 * (both dev and production). Use it for one-time initialization tasks like
 * environment validation.
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { validateEnvironment } from './lib/env-validation';

/**
 * Called once when the Next.js server starts
 */
export function register() {
  // Validate all required environment variables at startup
  // Fails fast with clear error messages if config is missing/invalid
  validateEnvironment();
}
