/**
 * Environment Variable Validation (Trivia)
 *
 * Stripped for standalone mode — auth-related validation removed.
 * Keeps the trivia-specific API key warning.
 */

/**
 * Warn (but do not throw) if THE_TRIVIA_API_KEY is not set.
 *
 * The Trivia API key is optional -- the API works without it on the free tier,
 * but may be rate-limited. This function logs a warning at startup so operators
 * know the key is absent without blocking the application from starting.
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
 * Validates environment variables at application startup.
 *
 * In standalone mode, auth-related checks are removed.
 * Only the trivia API key warning remains.
 */
export function validateEnvironment(): void {
  warnIfMissingTriviaApiKey();
}
