import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Validates that all required Supabase environment variables are set.
 * Throws descriptive errors if any are missing.
 */
function validateEnvVariables(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build time, use placeholder values to avoid build failures
  // The validation will still run at runtime when the client is actually used
  const isBuildTime = process.env.NODE_ENV !== 'test' && process.env.NEXT_PHASE === 'phase-production-build'

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

export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = validateEnvVariables()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from Server Component - ignore
        }
      },
    },
  })
}
