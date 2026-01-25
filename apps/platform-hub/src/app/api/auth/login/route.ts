/**
 * Platform Hub Login API Route
 * Authenticates users and sets cross-app SSO cookies for Bingo/Trivia
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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
    const cookieStore = await cookies();
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
    // (cookieStore already initialized above for SSR client)
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

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
