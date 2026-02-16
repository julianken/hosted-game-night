'use client';

/**
 * OAuth 2.1 Callback Handler for Trivia App
 * Receives authorization code from Platform Hub and completes the OAuth flow
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors from authorization server
        if (errorParam) {
          console.error('OAuth authorization error:', errorParam, errorDescription);
          setError(errorDescription || errorParam);
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          console.error('Missing code or state parameter');
          setError('Invalid callback: missing parameters');
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        // Validate state parameter (CSRF protection)
        // Using cross-app SSO prefix for consistency
        const storedState = sessionStorage.getItem(`beak_oauth_state_${state}`);
        if (!storedState || storedState !== state) {
          console.error('State mismatch - possible CSRF attack');
          setError('Security validation failed');
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        // Retrieve code_verifier from sessionStorage
        const codeVerifier = sessionStorage.getItem(`beak_pkce_verifier_${state}`);
        if (!codeVerifier) {
          console.error('Missing code_verifier in sessionStorage');
          setError('Session expired - please try again');
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        // Exchange authorization code for tokens via server API
        const response = await fetch('/api/auth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            codeVerifier,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Token exchange failed');
        }

        // Clean up sessionStorage
        sessionStorage.removeItem(`beak_pkce_verifier_${state}`);
        sessionStorage.removeItem(`beak_oauth_state_${state}`);

        // Redirect to original destination or home
        const returnTo = sessionStorage.getItem('beak_oauth_return_to') || '/';
        sessionStorage.removeItem('beak_oauth_return_to');
        router.push(returnTo);
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setTimeout(() => router.push('/'), 3000);
      }
    }

    handleCallback();
  }, [searchParams, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-4 text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-bold text-red-600">Authentication Error</h1>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-base text-muted-foreground">Redirecting to home page...</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Completing Sign In</h1>
            <div className="flex justify-center">
              <div className="animate-spin motion-reduce:animate-none rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            <p className="text-muted-foreground">Please wait...</p>
          </>
        )}
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex flex-col items-center justify-center p-8">
          <div className="max-w-md w-full space-y-4 text-center">
            <h1 className="text-2xl font-bold">Loading...</h1>
            <div className="flex justify-center">
              <div className="animate-spin motion-reduce:animate-none rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </div>
        </main>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
