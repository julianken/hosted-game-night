/**
 * Feature flags for the trivia app.
 *
 * Each flag is backed by a NEXT_PUBLIC_ env var (accessible in both server and client components).
 * Opt-out default: features are ENABLED unless explicitly set to 'false'.
 * This prevents accidental feature disablement if an env var is missing.
 *
 * To disable question sets: set NEXT_PUBLIC_FEATURE_QUESTION_SETS=false
 */
export const QUESTION_SETS_ENABLED =
  process.env.NEXT_PUBLIC_FEATURE_QUESTION_SETS !== 'false';
