/**
 * Platform Hub Login API Route
 * Authenticates users and sets cross-app SSO cookies for Bingo/Trivia
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

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

    // Create Supabase client for authentication
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Authenticate with Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.session) {
      return NextResponse.json(
        {
          success: false,
          error: authError?.message || 'Authentication failed'
        },
        { status: 401 }
      );
    }

    // Set cross-app SSO cookies for Bingo/Trivia
    const cookieStore = await cookies();
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
