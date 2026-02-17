import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@joolie-boolie/auth';
import { createClient } from '@/lib/supabase/server';

const bingoUrl = process.env.NEXT_PUBLIC_BINGO_URL || 'http://localhost:3000';
const triviaUrl = process.env.NEXT_PUBLIC_TRIVIA_URL || 'http://localhost:3001';

/**
 * Authenticate the request using multiple strategies:
 * 1. OAuth SSO token (jb_access_token cookie) - used by bingo/trivia apps
 * 2. Supabase session cookies (sb-* cookies) - used by platform-hub native auth
 *
 * Returns a user object with id and email, or null if unauthenticated.
 */
async function authenticateRequest(
  request: NextRequest
): Promise<{ id: string; email: string } | null> {
  // Strategy 1: Try OAuth SSO token (jb_access_token cookie)
  const apiUser = await getApiUser(request);
  if (apiUser) {
    return apiUser;
  }

  // Strategy 2: Fall back to Supabase session cookies
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user) {
      return { id: user.id, email: user.email || '' };
    }
  } catch {
    // Supabase client creation or auth check failed
  }

  return null;
}

/**
 * Delete template by ID
 *
 * DELETE /api/templates/[id]?game=bingo|trivia
 * - Proxies delete to appropriate game API
 * - Returns success/error
 *
 * Authentication:
 * - Accepts OAuth SSO token (jb_access_token cookie) from game apps
 * - Accepts Supabase session cookies (sb-*) from platform-hub native auth
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication (OAuth SSO token OR Supabase session)
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const {id} = await params;
    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game');

    if (!game || (game !== 'bingo' && game !== 'trivia')) {
      return NextResponse.json(
        { error: 'Game parameter required (bingo or trivia)' },
        { status: 400 }
      );
    }

    // Determine API URL from environment variables
    const baseUrl = game === 'bingo' ? bingoUrl : triviaUrl;
    const apiUrl = `${baseUrl}/api/templates/${id}`;

    // Proxy delete request
    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || `Failed to delete ${game} template` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
