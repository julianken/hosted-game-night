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
import { validateCsrfToken, clearCsrfToken } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';
import { auditAuthorizationSuccess, auditAuthorizationError } from '@/middleware/audit-middleware';

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

    // Create Supabase client with user session
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized: Please log in to continue' },
        { status: 401 }
      );
    }

    // Fetch authorization details for audit logging
    const { data: authDetails, error: detailsError } = await supabase.auth.oauth.getAuthorizationDetails(
      authorization_id
    );

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

    const { client } = authDetails;
    // Note: scopes may not be available in Supabase SDK response type
    const scopes = (authDetails as any).scopes || [];

    // Approve authorization request
    const { data, error: approveError } = await supabase.auth.oauth.approveAuthorization(
      authorization_id
    );

    if (approveError) {
      // Log error to audit log
      await auditAuthorizationError(
        request,
        client.id,
        authorization_id,
        'approval_failed',
        approveError?.message || 'Approval failed',
        session.user.id
      );

      return NextResponse.json(
        { error: approveError.message || 'Failed to approve authorization' },
        { status: 400 }
      );
    }

    // Supabase returns 'redirect_url'
    const redirectUrl = (data as { redirect_url?: string }).redirect_url;

    if (!redirectUrl) {
      return NextResponse.json(
        { error: 'No redirect URL provided by authorization server' },
        { status: 500 }
      );
    }

    // Log success to audit log
    await auditAuthorizationSuccess(
      request,
      session.user.id,
      client.id,
      authorization_id,
      scopes
    );

    // Return redirect URL
    return NextResponse.json({ redirect_url: redirectUrl });
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
