/**
 * OAuth Authorization Approval API
 *
 * POST /api/oauth/approve
 *
 * Validates CSRF token, approves OAuth authorization request, and logs to audit.
 * Implements CSRF protection to prevent cross-site request forgery attacks.
 *
 * Request body:
 * {
 *   authorization_id: string;
 *   csrf_token: string;
 * }
 *
 * Response:
 * {
 *   redirect_url: string;  // URL to redirect back to client
 * }
 *
 * Error responses:
 * - 400: Missing required fields
 * - 403: Invalid CSRF token
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { validateCsrfToken, clearCsrfToken } from '@/lib/csrf';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { auditAuthorizationSuccess, auditAuthorizationError } from '@/middleware/audit-middleware';
import {
  E2E_TEST_USER_ID,
  getE2EAuthorization,
  updateE2EAuthorization,
  getE2EClient,
} from '@/lib/oauth/e2e-store';

interface ApproveRequest {
  authorization_id: string;
  csrf_token: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json() as Partial<ApproveRequest>;
    const { authorization_id, csrf_token } = body;

    // Validate required fields
    if (!authorization_id) {
      return NextResponse.json(
        { error: 'Missing authorization_id' },
        { status: 400 }
      );
    }

    if (!csrf_token) {
      return NextResponse.json(
        { error: 'Missing csrf_token' },
        { status: 400 }
      );
    }

    // Validate CSRF token
    const isValidCsrf = await validateCsrfToken(csrf_token);

    if (!isValidCsrf) {
      return NextResponse.json(
        { error: 'Invalid or expired CSRF token' },
        { status: 403 }
      );
    }

    // Clear CSRF token after successful validation (token rotation)
    await clearCsrfToken();

    // Check for E2E test session via SSO cookies
    const cookieStore = await cookies();
    const beakUserId = cookieStore.get('beak_user_id')?.value;
    const beakAccessToken = cookieStore.get('beak_access_token')?.value;

    const isE2ESession =
      process.env.E2E_TESTING === 'true' &&
      beakUserId === E2E_TEST_USER_ID &&
      beakAccessToken &&
      beakUserId;

    // Create Supabase client with user session (for auth checks)
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
      scope: string;
      state: string;
      status: string;
    } | null = null;
    let client: { id: string; name: string } | null = null;

    // In E2E mode, try to get authorization from in-memory store
    if (isE2ESession) {
      console.log('[OAuth Approve] E2E mode: checking in-memory store');
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
            scope: e2eAuth.scope,
            state: e2eAuth.state,
            status: e2eAuth.status,
          };
          client = e2eClient;
        }
      }
    }

    // If no E2E authorization found, check Supabase
    if (!authDetails) {
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        // In E2E mode without session, this is an error
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
          scope,
          state,
          status,
          oauth_clients!inner(id, name)
        `)
        .eq('id', authorization_id)
        .eq('user_id', session.user.id)
        .eq('status', 'pending')
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

    const scopes = authDetails.scope.split(' ');

    // Generate authorization code (32 bytes = 64 hex characters)
    const authCode = crypto.randomBytes(32).toString('hex');
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Update authorization with code and approval
    if (isE2ESession) {
      // E2E mode: update in-memory store
      const updated = updateE2EAuthorization(authorization_id, {
        code: authCode,
        code_expires_at: codeExpiresAt.toISOString(),
        status: 'approved',
      });

      if (!updated) {
        return NextResponse.json(
          { error: 'Failed to approve authorization' },
          { status: 400 }
        );
      }
    } else {
      // Normal mode: update database using service role client
      const { error: approveError } = await dbClient
        .from('oauth_authorizations')
        .update({
          code: authCode,
          code_expires_at: codeExpiresAt.toISOString(),
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', authorization_id)
        .eq('user_id', userId!);

      if (approveError) {
        // Log error to audit log
        await auditAuthorizationError(
          request,
          client.id,
          authorization_id,
          'approval_failed',
          approveError?.message || 'Approval failed',
          userId!
        );

        return NextResponse.json(
          { error: approveError.message || 'Failed to approve authorization' },
          { status: 400 }
        );
      }
    }

    // Validate redirect_uri exists
    if (!authDetails.redirect_uri) {
      await auditAuthorizationError(
        request,
        client.id,
        authorization_id,
        'invalid_redirect_uri',
        'No redirect URL provided by authorization server',
        userId!
      );

      return NextResponse.json(
        { error: 'No redirect URL provided by authorization server' },
        { status: 500 }
      );
    }

    // Build redirect URL with authorization code
    const redirectUrl = new URL(authDetails.redirect_uri);
    redirectUrl.searchParams.set('code', authCode);
    redirectUrl.searchParams.set('state', authDetails.state);

    // Log success to audit log (skip in E2E mode to avoid DB dependency)
    if (!isE2ESession) {
      await auditAuthorizationSuccess(
        request,
        userId!,
        client.id,
        authorization_id,
        scopes
      );
    }

    // Return redirect URL
    return NextResponse.json({ redirect_url: redirectUrl.toString() });
  } catch (error) {
    console.error('Unexpected error in approve route:', error);

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
