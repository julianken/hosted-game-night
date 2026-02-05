/**
 * Server-side auth helper
 * Supports both Platform Hub OAuth tokens (beak_access_token) and
 * legacy Supabase auth cookies (sb-access-token).
 */

import { cookies } from 'next/headers';
import { createClient } from '@beak-gaming/database/server';

interface AuthUser {
  id: string;
  email?: string;
}

/**
 * Get the authenticated user from cookies.
 * Checks beak_access_token first (Platform Hub OAuth), then falls back
 * to Supabase auth.getUser() for legacy cookie-based sessions.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();

  // Check Platform Hub OAuth token first
  const beakToken = cookieStore.get('beak_access_token')?.value;
  if (beakToken) {
    if (beakToken.startsWith('e2e-')) {
      // E2E mode: use the user ID from the beak_user_id cookie
      const userId = cookieStore.get('beak_user_id')?.value;
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
      console.error('[Auth] Failed to decode beak_access_token JWT');
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
