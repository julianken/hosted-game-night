/**
 * OAuth Denial API Route
 *
 * Handles user denial of OAuth authorization requests.
 * Demonstrates integration of audit logging with OAuth flow.
 *
 * POST /api/oauth/deny
 * Body: { authorization_id: string, reason?: string }
 * Response: { redirect_url?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { auditAuthorizationDenial, auditAuthorizationError } from '@/middleware/audit-middleware';
import {
  E2E_TEST_USER_ID,
  getE2EAuthorization,
  updateE2EAuthorization,
  getE2EClient,
} from '@/lib/oauth/e2e-store';

/**
 * Request body schema
 */
interface DenyRequestBody {
  authorization_id: string;
  reason?: string;
}

/**
 * POST /api/oauth/deny
 *
 * Denies an OAuth authorization request and logs the event to the audit log.
 *
 * Flow:
 * 1. Validate request body
 * 2. Check user authentication
 * 3. Fetch authorization details from Supabase
 * 4. Deny authorization via Supabase OAuth SDK
 * 5. Log denial to audit log
 * 6. Return redirect URL (or fallback to dashboard)
 *
 * @param request - Next.js request object
 * @returns Response with redirect URL or error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = (await request.json()) as DenyRequestBody;
    const { authorization_id, reason } = body;

    // Validate authorization_id
    if (!authorization_id || typeof authorization_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid authorization_id' },
        { status: 400 }
      );
    }

    // Check for E2E test session via SSO cookies
    const cookieStore = await cookies();
    const beakUserId = cookieStore.get('beak_user_id')?.value;
    const beakAccessToken = cookieStore.get('beak_access_token')?.value;

    const isE2ESession =
      process.env.E2E_TESTING === 'true' &&
      beakUserId === E2E_TEST_USER_ID &&
      beakAccessToken &&
      beakUserId;

    // Get authenticated user session (for auth checks)
    const supabase = await createClient();
    // Service role client for database operations (RLS only allows SELECT for users, not UPDATE)
    const dbClient = createServiceRoleClient();

    // Variables to hold authorization details
    let userId: string;
    let authDetails: {
      id: string;
      client_id: string;
      user_id: string;
      redirect_uri: string;
      state: string;
    } | null = null;
    let client: { id: string; name: string } | null = null;

    // In E2E mode, try to get authorization from in-memory store
    if (isE2ESession) {
      console.log('[OAuth Deny] E2E mode: checking in-memory store');
      const e2eAuth = getE2EAuthorization(authorization_id);

      if (e2eAuth && e2eAuth.status === 'pending') {
        const e2eClient = getE2EClient(e2eAuth.client_id);
        if (e2eClient) {
          userId = beakUserId || E2E_TEST_USER_ID;
          authDetails = {
            id: e2eAuth.id,
            client_id: e2eAuth.client_id,
            user_id: e2eAuth.user_id,
            redirect_uri: e2eAuth.redirect_uri,
            state: e2eAuth.state,
          };
          client = e2eClient;
        }
      }
    }

    // If no E2E authorization found, check Supabase
    if (!authDetails) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        return NextResponse.json(
          { error: 'Unauthorized: Please log in to continue' },
          { status: 401 }
        );
      }

      userId = session.user.id;

      // Fetch authorization details from custom oauth_authorizations table
      const { data: dbAuthDetails, error: detailsError } = await dbClient
        .from('oauth_authorizations')
        .select(`
          id,
          client_id,
          user_id,
          redirect_uri,
          state,
          oauth_clients!inner(id, name)
        `)
        .eq('id', authorization_id)
        .eq('user_id', session.user.id)
        .single();

      if (detailsError || !dbAuthDetails) {
        // Log error to audit log
        await auditAuthorizationError(
          request,
          'unknown', // client_id may not be available
          authorization_id,
          'fetch_details_failed',
          detailsError?.message || 'Failed to fetch authorization details',
          session.user.id
        );

        return NextResponse.json(
          { error: detailsError?.message || 'Failed to fetch authorization details' },
          { status: 400 }
        );
      }

      authDetails = dbAuthDetails;
      const clientArray = dbAuthDetails.oauth_clients as unknown as Array<{ id: string; name: string }>;
      client = Array.isArray(clientArray) ? clientArray[0] : clientArray;
    }

    // At this point, authDetails and client should be set
    if (!authDetails || !client) {
      return NextResponse.json(
        { error: 'Authorization not found' },
        { status: 404 }
      );
    }

    // Update authorization status to denied
    if (isE2ESession) {
      // E2E mode: update in-memory store
      const updated = updateE2EAuthorization(authorization_id, {
        status: 'denied',
      });

      if (!updated) {
        return NextResponse.json(
          { error: 'Failed to deny authorization' },
          { status: 400 }
        );
      }
    } else {
      // Normal mode: update database using service role client
      const { error: denialError } = await dbClient
        .from('oauth_authorizations')
        .update({ status: 'denied' })
        .eq('id', authorization_id)
        .eq('user_id', userId!);

      if (denialError) {
        // Log error to audit log
        await auditAuthorizationError(
          request,
          client.id,
          authorization_id,
          'denial_failed',
          denialError.message,
          userId!
        );

        return NextResponse.json(
          { error: denialError.message || 'Failed to deny authorization' },
          { status: 500 }
        );
      }

      // Log denial to audit log (skip in E2E mode)
      await auditAuthorizationDenial(
        request,
        userId!,
        client.id,
        authorization_id,
        reason || 'user_denied'
      );
    }

    // Build redirect URL with error
    const redirectUrl = new URL(authDetails.redirect_uri);
    redirectUrl.searchParams.set('error', 'access_denied');
    redirectUrl.searchParams.set('error_description', reason || 'User denied authorization');
    redirectUrl.searchParams.set('state', authDetails.state);

    // Return redirect URL
    return NextResponse.json({
      redirect_url: redirectUrl.toString(),
    });
  } catch (error) {
    console.error('Error in OAuth denial:', error);

    // Log error (without client_id if not available)
    await auditAuthorizationError(
      request,
      'unknown',
      undefined,
      'internal_error',
      error instanceof Error ? error.message : 'Internal server error'
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
