import { createBrowserClient } from '@supabase/ssr'

/**
 * Validates that all required Supabase environment variables are set.
 * Throws descriptive errors at module load time if any are missing.
 */
function validateEnvVariables(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build time, use placeholder values to avoid build failures
  // The validation will still run at runtime when the client is actually used
  const isBuildTime = typeof window === 'undefined' && process.env.NODE_ENV !== 'test'

  if (isBuildTime && (!url || !anonKey)) {
    return { url: 'https://placeholder.supabase.co', anonKey: 'placeholder-key' }
  }

  if (!url) {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL\n' +
      'Expected format: https://your-project-ref.supabase.co\n' +
      'Please add this variable to your .env.local file.'
    )
  }

  if (!anonKey) {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
      'Expected format: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (JWT token)\n' +
      'Please add this variable to your .env.local file.'
    )
  }

  return { url, anonKey }
}

// Validate at module load time - fail fast if ENV variables are missing
const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = validateEnvVariables()

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
