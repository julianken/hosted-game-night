import { createBrowserClient } from '@supabase/ssr'

/**
 * Validates that all required Supabase environment variables are set.
 * Throws descriptive errors at module load time if any are missing.
 */
function validateEnvVariables(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: {
      // Browser-side cookie options (httpOnly not supported in browsers)
      // Note: These cookies are managed by JavaScript and cannot be httpOnly
      // Server-side cookies (via middleware/server.ts) have httpOnly enabled
      sameSite: 'lax',
      path: '/',
      // secure flag is automatically handled by the browser based on protocol
    },
  })
}
