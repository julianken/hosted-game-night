import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import {
  E2E_TEST_USER_ID,
  E2E_MOCK_CLIENTS,
  createE2EAuthorization,
  cleanupE2EAuthorizations,
  updateE2EAuthorization,
} from '@/lib/oauth/e2e-store';
import { auditAuthorizationSuccess } from '@/middleware/audit-middleware';

/**
 * OAuth 2.1 Authorization Endpoint
 *
 * Entry point for OAuth authorization code flow with PKCE.
 * Creates an authorization request and redirects to login or consent.
 *
 * Query Parameters:
 * - client_id: OAuth client identifier (UUID)
 * - redirect_uri: Where to send the authorization code
 * - scope: Requested permissions (e.g., "openid")
 * - state: CSRF protection token
 * - code_challenge: PKCE code challenge (SHA-256 hash of code_verifier)
 * - code_challenge_method: Must be "S256"
 * - response_type: Must be "code"
 *
 * Flow:
 * 1. Validate OAuth parameters
 * 2. Check user authentication (supports E2E testing mode via SSO cookies)
 * 3. If not authenticated → redirect to /login
 * 4. If authenticated → create authorization → redirect to /oauth/consent
 *
 * E2E Testing Mode:
 * When running in development or E2E mode with the test user's SSO cookies,
 * bypasses Supabase session check and uses the E2E test user ID.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Extract OAuth parameters
    const clientId = searchParams.get('client_id');
    const redirectUri = searchParams.get('redirect_uri');
    const scope = searchParams.get('scope');
    const state = searchParams.get('state');
    const codeChallenge = searchParams.get('code_challenge');
    const codeChallengeMethod = searchParams.get('code_challenge_method');
    const responseType = searchParams.get('response_type');

    // Validate required parameters
    if (!clientId) {
      return errorRedirect(redirectUri, 'invalid_request', 'Missing client_id', state);
    }

    if (!redirectUri) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing redirect_uri' },
        { status: 400 }
      );
    }

    if (!scope || !state || !codeChallenge) {
      return errorRedirect(
        redirectUri,
        'invalid_request',
        'Missing required parameters (scope, state, or code_challenge)',
        state
      );
    }

    if (codeChallengeMethod !== 'S256') {
      return errorRedirect(
        redirectUri,
        'invalid_request',
        'code_challenge_method must be S256',
        state
      );
    }

    if (responseType !== 'code') {
      return errorRedirect(
        redirectUri,
        'unsupported_response_type',
        'Only authorization_code grant is supported',
        state
      );
    }

    // Check for E2E testing mode via SSO cookies
    // This allows tests to bypass Supabase session when Login API sets E2E cookies
    const cookieStore = await cookies();
    const beakAccessToken = cookieStore.get('beak_access_token')?.value;
    const beakUserId = cookieStore.get('beak_user_id')?.value;

    // Determine if this is an E2E test session
    const isE2ETestSession =
      beakUserId === E2E_TEST_USER_ID ||
      (process.env.E2E_TESTING === 'true' && beakAccessToken && beakUserId);

    // Create Supabase client
    const supabase = await createClient();

    // Check authentication
    // In E2E mode with valid SSO cookies, skip Supabase session check
    let userId: string;

    if (isE2ETestSession && beakUserId) {
      // E2E testing mode - use the user ID from SSO cookie
      console.log('[OAuth Authorize] E2E testing mode: using SSO cookie user ID');
      userId = beakUserId;
    } else {
      // Normal mode - check Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        // Not authenticated - redirect to login
        const loginUrl = new URL('/login', request.nextUrl.origin);
        const returnUrl = `/api/oauth/authorize?${searchParams.toString()}`;
        loginUrl.searchParams.set('redirect', encodeURIComponent(returnUrl));
        return NextResponse.redirect(loginUrl);
      }

      userId = session.user.id;
    }

    // Use service role client for database operations in E2E mode
    // (the authenticated user's client won't work when bypassing Supabase auth)
    const dbClient = isE2ETestSession ? createServiceRoleClient() : supabase;

    console.log('[OAuth Authorize] Looking up client:', clientId);
    console.log('[OAuth Authorize] Is E2E test session:', isE2ETestSession);
    console.log('[OAuth Authorize] User ID:', userId);

    // Validate client exists and redirect_uri is registered
    let client: { id: string; name: string; redirect_uris: string[]; is_first_party?: boolean } | null = null;

    // In E2E mode, try mock clients first (handles case where migration isn't applied)
    if (isE2ETestSession && E2E_MOCK_CLIENTS[clientId]) {
      console.log('[OAuth Authorize] Using E2E mock client data');
      client = E2E_MOCK_CLIENTS[clientId];
    }

    // If no mock client or not in E2E mode, query database
    if (!client) {
      const { data: dbClient_, error: clientError } = await dbClient
        .from('oauth_clients')
        .select('id, name, redirect_uris, is_first_party')
        .eq('id', clientId)
        .single();

      console.log('[OAuth Authorize] DB client lookup result:', {
        client: dbClient_ ? { id: dbClient_.id, name: dbClient_.name } : null,
        error: clientError?.message,
        code: clientError?.code
      });

      if (clientError || !dbClient_) {
        console.error('[OAuth Authorize] Client not found, error:', clientError);
        return errorRedirect(redirectUri, 'invalid_client', 'Client not found', state);
      }

      client = dbClient_;
    }

    // At this point client is guaranteed to exist
    if (!client) {
      return errorRedirect(redirectUri, 'invalid_client', 'Client not found', state);
    }

    // Validate redirect_uri is registered for this client
    if (!client.redirect_uris.includes(redirectUri)) {
      return errorRedirect(
        redirectUri,
        'invalid_request',
        'redirect_uri not registered for this client',
        state
      );
    }

    // Create authorization request
    const authorizationId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    // In E2E mode, store authorization in memory to avoid FK constraint issues
    if (isE2ETestSession) {
      console.log('[OAuth Authorize] E2E mode: storing authorization in memory');
      cleanupE2EAuthorizations();

      createE2EAuthorization({
        id: authorizationId,
        client_id: clientId,
        user_id: userId,
        redirect_uri: redirectUri,
        scope,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
        status: 'pending',
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });

      // Check if client is first-party (auto-approve without consent screen)
      if (client.is_first_party) {
        console.log('[OAuth Authorize] E2E mode: auto-approving first-party client');
        const authCode = crypto.randomBytes(32).toString('hex');
        const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Update E2E authorization with code (approved status)
        updateE2EAuthorization(authorizationId, {
          code: authCode,
          code_expires_at: codeExpiresAt.toISOString(),
          status: 'approved',
        });

        // Redirect directly back to app with authorization code
        const autoApproveRedirectUrl = new URL(redirectUri);
        autoApproveRedirectUrl.searchParams.set('code', authCode);
        autoApproveRedirectUrl.searchParams.set('state', state);
        return NextResponse.redirect(autoApproveRedirectUrl);
      }
    } else {
      // Normal mode: store in database
      const { error: insertError } = await dbClient
        .from('oauth_authorizations')
        .insert({
          id: authorizationId,
          client_id: clientId,
          user_id: userId,
          redirect_uri: redirectUri,
          scope,
          state,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          status: 'pending',
        });

      if (insertError) {
        console.error('Failed to create authorization:', insertError);
        return errorRedirect(redirectUri, 'server_error', 'Failed to create authorization', state);
      }

      // Check if client is first-party (auto-approve without consent screen)
      if (client.is_first_party) {
        console.log('[OAuth Authorize] Auto-approving first-party client:', client.name);
        const authCode = crypto.randomBytes(32).toString('hex');
        const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Update authorization with code (approved status)
        const { error: updateError } = await dbClient
          .from('oauth_authorizations')
          .update({
            code: authCode,
            code_expires_at: codeExpiresAt.toISOString(),
            status: 'approved',
            approved_at: new Date().toISOString(),
          })
          .eq('id', authorizationId);

        if (updateError) {
          console.error('Failed to auto-approve authorization:', updateError);
          return errorRedirect(redirectUri, 'server_error', 'Failed to auto-approve authorization', state);
        }

        // Log auto-approval for audit trail
        const scopes = scope.split(' ');
        await auditAuthorizationSuccess(
          request,
          userId,
          clientId,
          authorizationId,
          scopes
        );

        // Redirect directly back to app with authorization code
        const autoApproveRedirectUrl = new URL(redirectUri);
        autoApproveRedirectUrl.searchParams.set('code', authCode);
        autoApproveRedirectUrl.searchParams.set('state', state);
        return NextResponse.redirect(autoApproveRedirectUrl);
      }
    }

    // Third-party apps continue to consent screen (existing behavior)
    const consentUrl = new URL('/oauth/consent', request.nextUrl.origin);
    consentUrl.searchParams.set('authorization_id', authorizationId);
    return NextResponse.redirect(consentUrl);

  } catch (error) {
    console.error('Authorization endpoint error:', error);
    const redirectUri = request.nextUrl.searchParams.get('redirect_uri');
    const state = request.nextUrl.searchParams.get('state');

    if (redirectUri) {
      return errorRedirect(redirectUri, 'server_error', 'Internal server error', state);
    }

    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper to redirect back to client with OAuth error
 */
function errorRedirect(
  redirectUri: string | null,
  error: string,
  errorDescription: string,
  state: string | null
): NextResponse {
  if (!redirectUri) {
    return NextResponse.json(
      { error, error_description: errorDescription },
      { status: 400 }
    );
  }

  try {
    const url = new URL(redirectUri);
    url.searchParams.set('error', error);
    url.searchParams.set('error_description', errorDescription);
    if (state) {
      url.searchParams.set('state', state);
    }
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Invalid redirect_uri' },
      { status: 400 }
    );
  }
}
