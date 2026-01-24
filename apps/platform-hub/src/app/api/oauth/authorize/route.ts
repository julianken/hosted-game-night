import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

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
 * 2. Check user authentication
 * 3. If not authenticated → redirect to /login
 * 4. If authenticated → create authorization → redirect to /oauth/consent
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

    // Create Supabase client
    const supabase = await createClient();

    // Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      // Not authenticated - redirect to login
      const loginUrl = new URL('/login', request.nextUrl.origin);
      const returnUrl = `/api/oauth/authorize?${searchParams.toString()}`;
      loginUrl.searchParams.set('redirect', encodeURIComponent(returnUrl));
      return NextResponse.redirect(loginUrl);
    }

    // Validate client exists and redirect_uri is registered
    const { data: client, error: clientError } = await supabase
      .from('oauth_clients')
      .select('id, name, redirect_uris')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
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

    const { error: insertError } = await supabase
      .from('oauth_authorizations')
      .insert({
        id: authorizationId,
        client_id: clientId,
        user_id: session.user.id,
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

    // Redirect to consent page
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
