/**
 * Platform Hub Login API Route
 * Authenticates users and sets cross-app SSO cookies for Bingo/Trivia
 *
 * Supports E2E_TESTING mode to bypass Supabase auth and avoid rate limits.
 * When E2E_TESTING=true and email is 'e2e-test@joolie-boolie.test',
 * generates a valid JWT locally without calling external services.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SignJWT } from 'jose';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'auth-login' });

// Production guard: E2E mode must never run on actual production (Vercel)
// Allows local production builds/servers for E2E testing (VERCEL=1 is auto-set by Vercel)
if (process.env.E2E_TESTING === 'true' && process.env.VERCEL === '1') {
  throw new Error('E2E mode cannot run in production');
}

// E2E Testing constants
const E2E_TEST_EMAIL = 'e2e-test@joolie-boolie.test';
const E2E_TEST_USER_ID = '00000000-0000-4000-a000-000000000e2e';

// E2E Testing: Secret loaded from environment variable (never hardcoded)
function getE2EJwtSecret(): Uint8Array {
  const secret = process.env.E2E_JWT_SECRET;
  if (!secret) {
    throw new Error(
      'E2E_JWT_SECRET environment variable is required when E2E_TESTING=true. ' +
      'Set it in your .env.local file.'
    );
  }
  return new TextEncoder().encode(secret);
}

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
    .sign(getE2EJwtSecret());
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
    const cookieDomain = process.env.COOKIE_DOMAIN;

    // ==========================================================================
    // E2E TESTING MODE: Skip Supabase auth to avoid rate limits
    // ==========================================================================
    // Enable E2E mode only if E2E_TESTING is explicitly set to 'true'
    // This prevents security bypass in dev/staging environments
    const isE2ETesting = process.env.E2E_TESTING === 'true';

    if (isE2ETesting && email === E2E_TEST_EMAIL) {
      logger.info('E2E testing mode: bypassing Supabase auth');

      // Generate a valid JWT locally (no external API calls)
      const accessToken = await generateE2EAccessToken();
      const expiresIn = 3600; // 1 hour

      // Set cross-app SSO cookies (same as normal flow)
      cookieStore.set('jb_access_token', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: expiresIn,
        path: '/',
        domain: cookieDomain || undefined,
      });

      // Refresh token (use a static value for E2E tests)
      cookieStore.set('jb_refresh_token', 'e2e-test-refresh-token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
        domain: cookieDomain || undefined,
      });

      // User ID cookie (for client-side access)
      cookieStore.set('jb_user_id', E2E_TEST_USER_ID, {
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
      logger.error('Missing Supabase environment variables');
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
      logger.error('Authentication failed', {
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
    cookieStore.set('jb_access_token', data.session.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: data.session.expires_in || 3600,
      path: '/',
      domain: cookieDomain || undefined,
    });

    // Refresh token cookie (long-lived, typically 30 days)
    if (data.session.refresh_token) {
      cookieStore.set('jb_refresh_token', data.session.refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
        domain: cookieDomain || undefined,
      });
    }

    // User ID cookie (for client-side access)
    cookieStore.set('jb_user_id', data.user.id, {
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
    logger.error('Login API error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
