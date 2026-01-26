/**
 * Platform Hub Login API Route
 * Authenticates users and sets cross-app SSO cookies for Bingo/Trivia
 *
 * Supports E2E_TESTING mode to bypass Supabase auth and avoid rate limits.
 * When E2E_TESTING=true and email is 'e2e-test@beak-gaming.test',
 * generates a valid JWT locally without calling external services.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SignJWT } from 'jose';

// E2E Testing constants
const E2E_TEST_EMAIL = 'e2e-test@beak-gaming.test';
const E2E_TEST_USER_ID = 'e2e-test-user-00000000-0000-0000-0000-000000000000';
const E2E_JWT_SECRET = new TextEncoder().encode(
  'e2e-test-secret-key-that-is-at-least-32-characters-long'
);

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
  };
  error?: string;
}

/**
 * Generate a valid JWT for E2E tests without calling Supabase.
 * This token mimics the structure of a Supabase access token.
 */
async function generateE2EAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 3600; // 1 hour

  return await new SignJWT({
    sub: E2E_TEST_USER_ID,
    email: E2E_TEST_EMAIL,
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'e2e-test',
    // Include standard Supabase JWT claims
    app_metadata: {
      provider: 'email',
      providers: ['email'],
    },
    user_metadata: {
      email: E2E_TEST_EMAIL,
    },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .sign(E2E_JWT_SECRET);
}

export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse>> {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    // Validate required parameters
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get cookie store for setting cookies
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

    // ==========================================================================
    // E2E TESTING MODE: Skip Supabase auth to avoid rate limits
    // ==========================================================================
    // Enable E2E mode if:
    // 1. E2E_TESTING env var is explicitly set to 'true', OR
    // 2. In development mode AND email matches the E2E test pattern
    // This allows E2E tests to work even if developers forget to use `pnpm dev:e2e`
    const isE2ETesting =
      process.env.E2E_TESTING === 'true' ||
      (process.env.NODE_ENV !== 'production' && email === E2E_TEST_EMAIL);

    if (isE2ETesting && email === E2E_TEST_EMAIL) {
      console.log('[Login API] E2E testing mode: bypassing Supabase auth');

      // Generate a valid JWT locally (no external API calls)
      const accessToken = await generateE2EAccessToken();
      const expiresIn = 3600; // 1 hour

      // Set cross-app SSO cookies (same as normal flow)
      cookieStore.set('beak_access_token', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: expiresIn,
        path: '/',
        domain: cookieDomain || undefined,
      });

      // Refresh token (use a static value for E2E tests)
      cookieStore.set('beak_refresh_token', 'e2e-test-refresh-token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
        domain: cookieDomain || undefined,
      });

      // User ID cookie (for client-side access)
      cookieStore.set('beak_user_id', E2E_TEST_USER_ID, {
        httpOnly: false, // Allow client-side access
        secure: isProduction,
        sameSite: 'lax',
        maxAge: expiresIn,
        path: '/',
        domain: cookieDomain || undefined,
      });

      return NextResponse.json({
        success: true,
        user: {
          id: E2E_TEST_USER_ID,
          email: E2E_TEST_EMAIL,
        },
      });
    }

    // ==========================================================================
    // NORMAL FLOW: Authenticate with Supabase
    // ==========================================================================

    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create SSR Supabase client with cookie handling
    // This ensures both standard Supabase cookies (for Platform Hub)
    // and custom SSO cookies (for Bingo/Trivia) are set
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore errors from Server Component context
          }
        },
      },
    });

    // Authenticate with Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.session) {
      // Log the actual Supabase error for debugging
      console.error('[Login API] Authentication failed:', {
        errorCode: authError?.code,
        errorMessage: authError?.message,
        errorStatus: authError?.status,
        hasSession: !!data.session,
      });

      return NextResponse.json(
        {
          success: false,
          error: authError?.message || 'Authentication failed'
        },
        { status: 401 }
      );
    }

    // Set cross-app SSO cookies for Bingo/Trivia
    // (cookieStore and isProduction already initialized above)
    // Access token cookie (expires with token, typically 1 hour)
    cookieStore.set('beak_access_token', data.session.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: data.session.expires_in || 3600,
      path: '/',
      domain: cookieDomain || undefined,
    });

    // Refresh token cookie (long-lived, typically 30 days)
    if (data.session.refresh_token) {
      cookieStore.set('beak_refresh_token', data.session.refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
        domain: cookieDomain || undefined,
      });
    }

    // User ID cookie (for client-side access)
    cookieStore.set('beak_user_id', data.user.id, {
      httpOnly: false, // Allow client-side access
      secure: isProduction,
      sameSite: 'lax',
      maxAge: data.session.expires_in || 3600,
      path: '/',
      domain: cookieDomain || undefined,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || email,
      },
    });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
