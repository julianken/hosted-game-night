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
import { createClient } from '@/lib/supabase/server';
import { auditAuthorizationDenial, auditAuthorizationError } from '@/middleware/audit-middleware';

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

    // Get authenticated user session
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized: Please log in to continue' },
        { status: 401 }
      );
    }

    // Fetch authorization details from custom oauth_authorizations table
    const { data: authDetails, error: detailsError } = await supabase
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

    if (detailsError || !authDetails) {
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

    const clientArray = authDetails.oauth_clients as unknown as Array<{ id: string; name: string }>;
    const client = Array.isArray(clientArray) ? clientArray[0] : clientArray;

    // Update authorization status to denied
    const { error: denialError } = await supabase
      .from('oauth_authorizations')
      .update({ status: 'denied' })
      .eq('id', authorization_id)
      .eq('user_id', session.user.id);

    if (denialError) {
      // Log error to audit log
      await auditAuthorizationError(
        request,
        client.id,
        authorization_id,
        'denial_failed',
        denialError.message,
        session.user.id
      );

      return NextResponse.json(
        { error: denialError.message || 'Failed to deny authorization' },
        { status: 500 }
      );
    }

    // Log denial to audit log
    await auditAuthorizationDenial(
      request,
      session.user.id,
      client.id,
      authorization_id,
      reason || 'user_denied'
    );

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
