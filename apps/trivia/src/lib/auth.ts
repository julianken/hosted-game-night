/**
 * Server-side auth helper
 * Supports both Platform Hub OAuth tokens (jb_access_token) and
 * legacy Supabase auth cookies (sb-access-token).
 */

import { cookies } from 'next/headers';
import { createClient } from '@joolie-boolie/database/server';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'trivia-lib-auth' });

interface AuthUser {
  id: string;
  email?: string;
}

/**
 * Get the authenticated user from cookies.
 * Checks jb_access_token first (Platform Hub OAuth), then falls back
 * to Supabase auth.getUser() for legacy cookie-based sessions.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();

  // Check Platform Hub OAuth token first
  const beakToken = cookieStore.get('jb_access_token')?.value;
  if (beakToken) {
    if (beakToken.startsWith('e2e-')) {
      // E2E mode: use the user ID from the jb_user_id cookie
      const userId = cookieStore.get('jb_user_id')?.value;
      return userId ? { id: userId } : null;
    }

    // Real JWT: decode payload
    try {
      const payload = JSON.parse(
        Buffer.from(beakToken.split('.')[1], 'base64url').toString()
      );
      return {
        id: payload.sub || 'unknown',
        email: payload.email,
      };
    } catch {
      logger.error('Failed to decode jb_access_token JWT');
    }
  }

  // Fallback: Supabase auth
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}
