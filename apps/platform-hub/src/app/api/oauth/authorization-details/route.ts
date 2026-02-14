/**
 * OAuth Authorization Details API
 *
 * Fetches authorization details for the consent page.
 * Supports both normal database lookup and E2E in-memory store.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
  E2E_TEST_USER_ID,
  E2E_TEST_EMAIL,
  getE2EAuthorization,
  getE2EClient,
} from '@/lib/oauth/e2e-store';

export async function GET(request: NextRequest) {
  try {
    const authorizationId = request.nextUrl.searchParams.get('authorization_id');

    if (!authorizationId) {
      return NextResponse.json(
        { error: 'Missing authorization_id parameter' },
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

    // In E2E mode, try to get authorization from in-memory store
    if (isE2ESession) {
      console.log('[Authorization Details] E2E mode: checking in-memory store');
      const e2eAuth = getE2EAuthorization(authorizationId);

      if (e2eAuth && e2eAuth.status === 'pending') {
        const client = getE2EClient(e2eAuth.client_id);
        if (client) {
          return NextResponse.json({
            authorization: {
              id: e2eAuth.id,
              status: e2eAuth.status,
              scope: e2eAuth.scope,
              expires_at: e2eAuth.expires_at,
            },
            client: {
              id: client.id,
              name: client.name,
            },
            user: {
              id: beakUserId || E2E_TEST_USER_ID,
              email: E2E_TEST_EMAIL,
            },
          });
        }
      }
    }

    // Normal mode: check Supabase session and database
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized', requiresLogin: true },
        { status: 401 }
      );
    }

    // Fetch authorization details from database
    const { data: authData, error: authError } = await supabase
      .from('oauth_authorizations')
      .select(`
        id,
        client_id,
        user_id,
        scope,
        status,
        expires_at,
        oauth_clients!inner(id, name)
      `)
      .eq('id', authorizationId)
      .eq('user_id', session.user.id)
      .eq('status', 'pending')
      .single();

    if (authError || !authData) {
      return NextResponse.json(
        { error: 'Authorization not found or expired' },
        { status: 404 }
      );
    }

    // Check expiration
    if (authData.expires_at && new Date(authData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Authorization has expired' },
        { status: 410 }
      );
    }

    // Extract client info
    const clientArray = authData.oauth_clients as unknown as Array<{ id: string; name: string }>;
    const client = Array.isArray(clientArray) ? clientArray[0] : clientArray;

    return NextResponse.json({
      authorization: {
        id: authData.id,
        status: authData.status,
        scope: authData.scope,
        expires_at: authData.expires_at,
      },
      client: {
        id: client.id,
        name: client.name,
      },
      user: {
        id: session.user.id,
        email: session.user.email || '',
      },
    });
  } catch (error) {
    console.error('[Authorization Details] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
