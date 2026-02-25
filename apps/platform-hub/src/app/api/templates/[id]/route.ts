import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@joolie-boolie/auth';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  deleteBingoTemplate,
  deleteTriviaTemplate,
  userOwnsBingoTemplate,
  userOwnsTriviaTemplate,
} from '@joolie-boolie/database';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'api-templates' });

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
 * Delete template by ID using direct database query
 *
 * DELETE /api/templates/[id]?game=bingo|trivia
 * - Verifies user owns the template
 * - Deletes directly from the appropriate table
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

    // E2E mode: delete from in-memory store
    if (process.env.E2E_TESTING === 'true') {
      const { deleteE2ETemplate } = await import('@/lib/e2e-template-store');
      const deleted = deleteE2ETemplate(id);
      if (!deleted) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    }

    // Use service role client (user already authenticated above)
    const serviceClient = createServiceRoleClient();

    // Verify ownership before deleting
    if (game === 'bingo') {
      const owns = await userOwnsBingoTemplate(serviceClient, user.id, id);
      if (!owns) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      await deleteBingoTemplate(serviceClient, id);
    } else {
      const owns = await userOwnsTriviaTemplate(serviceClient, user.id, id);
      if (!owns) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      await deleteTriviaTemplate(serviceClient, id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting template', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
