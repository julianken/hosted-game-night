'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ConsentScreen } from '@/components/oauth';
import type { AuthorizationDetails } from '@/types/oauth';

export interface ConsentPageProps {
  searchParams: {
    authorization_id?: string;
  };
}

/**
 * Type guard to validate authorization details response
 * Ensures runtime type safety for Supabase SDK response
 */
function isValidAuthorizationDetails(data: unknown): data is AuthorizationDetails {
  if (!data || typeof data !== 'object') return false;

  const d = data as Record<string, unknown>;

  return (
    typeof d.client === 'object' &&
    d.client !== null &&
    typeof (d.client as Record<string, unknown>).id === 'string' &&
    typeof (d.client as Record<string, unknown>).name === 'string' &&
    Array.isArray(d.scopes) &&
    d.scopes.every((s) => typeof s === 'string') &&
    typeof d.user === 'object' &&
    d.user !== null &&
    typeof (d.user as Record<string, unknown>).id === 'string' &&
    typeof (d.user as Record<string, unknown>).email === 'string'
  );
}

/**
 * OAuth Consent Page
 *
 * Handles the OAuth 2.1 authorization consent flow:
 * 1. Extracts authorization_id from URL
 * 2. Fetches authorization details from Supabase
 * 3. Displays consent screen with client info and scopes
 * 4. Handles approve/deny actions
 * 5. Redirects back to client app
 *
 * Features:
 * - Direct Supabase SDK calls (no API routes needed)
 * - Complete error handling
 * - Loading states
 * - Redirects unauthenticated users to login
 * - Senior-friendly design
 * - WCAG 2.1 AA accessible
 */
export default function ConsentPage({ searchParams }: ConsentPageProps) {
  const router = useRouter();
  const supabase = createClient();

  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  const authorizationId = searchParams.authorization_id;

  useEffect(() => {
    async function fetchAuthorizationDetails() {
      // Validate authorization_id parameter
      if (!authorizationId) {
        setError('Missing authorization_id parameter. This page must be accessed through an OAuth authorization flow.');
        setLoading(false);
        return;
      }

      try {
        // Check if user is authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          // Redirect to login with return URL
          const redirectUrl = `/login?redirect=/oauth/consent&authorization_id=${encodeURIComponent(authorizationId)}`;
          router.push(redirectUrl);
          return;
        }

        // Fetch authorization details from Supabase
        const { data, error: authError } = await supabase.auth.oauth.getAuthorizationDetails(
          authorizationId
        );

        if (authError) {
          // Handle different error scenarios
          const errorMessage = authError.message || 'Unknown error';

          if (errorMessage.includes('not found') || errorMessage.includes('invalid')) {
            setError('Authorization request not found or has expired. Please try again from the application.');
          } else if (errorMessage.includes('already used')) {
            setError('This authorization request has already been processed. Please start a new authorization from the application.');
          } else {
            setError(`Unable to load authorization details: ${errorMessage}`);
          }
        } else if (data && isValidAuthorizationDetails(data)) {
          setDetails(data);

          // Fetch CSRF token after successful authorization details load
          try {
            const csrfResponse = await fetch('/api/oauth/csrf');
            if (csrfResponse.ok) {
              const { token } = await csrfResponse.json();
              setCsrfToken(token);
            } else {
              setError('Failed to generate security token. Please refresh and try again.');
            }
          } catch (csrfErr) {
            console.error('Error fetching CSRF token:', csrfErr);
            setError('Failed to initialize security token. Please refresh and try again.');
          }
        } else if (data) {
          setError('Invalid authorization details structure received from server.');
        } else {
          setError('No authorization details received. Please try again.');
        }
      } catch (err) {
        console.error('Error fetching authorization details:', err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchAuthorizationDetails();
  }, [authorizationId, router, supabase]);

  /**
   * Handle user approval of the authorization request
   */
  const handleApprove = async () => {
    if (!authorizationId || !csrfToken) {
      setError('Missing required security token. Please refresh the page and try again.');
      return;
    }

    try {
      // Send approval request through API route with CSRF token
      const response = await fetch('/api/oauth/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authorization_id: authorizationId,
          csrf_token: csrfToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setError('Security validation failed. Please refresh the page and try again.');
        } else {
          setError(data.error || 'Failed to approve authorization');
        }
        return;
      }

      if (data.redirect_url) {
        // Redirect back to client app with authorization code
        window.location.href = data.redirect_url;
      } else {
        setError('Authorization approved but no redirect URL was provided.');
      }
    } catch (err) {
      console.error('Error approving authorization:', err);
      setError('An error occurred while approving the authorization. Please try again.');
    }
  };

  /**
   * Handle user denial of the authorization request
   */
  const handleDeny = async () => {
    if (!authorizationId) return;

    try {
      const { data, error: denyError } = await supabase.auth.oauth.denyAuthorization(
        authorizationId
      );

      if (denyError) {
        setError(`Failed to deny authorization: ${denyError.message}`);
      } else if (data?.redirect_url) {
        // Redirect back to client app with error
        window.location.href = data.redirect_url;
      } else {
        // If no redirect URL, go to dashboard
        router.push('/');
      }
    } catch (err) {
      console.error('Error denying authorization:', err);
      setError('An error occurred while denying the authorization. Please try again.');
    }
  };

  return (
    <ConsentScreen
      loading={loading}
      error={error}
      details={details}
      onApprove={handleApprove}
      onDeny={handleDeny}
      csrfToken={csrfToken}
    />
  );
}
