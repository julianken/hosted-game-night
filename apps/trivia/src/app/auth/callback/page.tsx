'use client';

/**
 * OAuth 2.1 Callback Handler for Trivia App
 * Receives authorization code from Platform Hub and completes the OAuth flow.
 *
 * IMPORTANT: Unregisters the service worker before submitting the form POST.
 * Chrome strips Set-Cookie headers from ANY response that passes through a
 * service worker's fetch event handler — even for navigation requests and even
 * when respondWith() is never called. By unregistering the SW first, the form
 * POST goes directly to the network and the 303 redirect's Set-Cookie headers
 * are preserved. The SW will re-register on the next page load.
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sanitizeRedirect } from '@joolie-boolie/auth';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    async function handleCallback() {
      // Handle post-token-exchange redirect: cookies are already set,
      // just navigate to the final destination.
      const authSuccess = searchParams.get('auth_success');
      if (authSuccess === '1') {
        const finalDest = sanitizeRedirect(searchParams.get('returnTo'));
        window.location.href = finalDest;
        return;
      }

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
      const storedState = sessionStorage.getItem(`jb_oauth_state_${state}`);
      if (!storedState || storedState !== state) {
        console.error('State mismatch - possible CSRF attack');
        setError('Security validation failed');
        setTimeout(() => router.push('/'), 3000);
        return;
      }

      // Retrieve code_verifier from sessionStorage
      const codeVerifier = sessionStorage.getItem(`jb_pkce_verifier_${state}`);
      if (!codeVerifier) {
        console.error('Missing code_verifier in sessionStorage');
        setError('Session expired - please try again');
        setTimeout(() => router.push('/'), 3000);
        return;
      }

      // Clean up sessionStorage before navigation
      sessionStorage.removeItem(`jb_pkce_verifier_${state}`);
      sessionStorage.removeItem(`jb_oauth_state_${state}`);

      // Get return destination
      const returnTo = sessionStorage.getItem('jb_oauth_return_to') || '/';
      sessionStorage.removeItem('jb_oauth_return_to');

      // Unregister ALL service workers before submitting the form.
      // Chrome strips Set-Cookie from responses that pass through a SW fetch
      // handler, even for navigations. The SW will re-register on the next load.
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }

      // Submit the form — this triggers a full-page navigation (POST) to the
      // token-redirect endpoint. The server exchanges the code, sets auth
      // cookies on a redirect response, and the browser follows the redirect.
      const form = formRef.current;
      if (form) {
        (form.elements.namedItem('code') as HTMLInputElement).value = code;
        (form.elements.namedItem('codeVerifier') as HTMLInputElement).value = codeVerifier;
        (form.elements.namedItem('returnTo') as HTMLInputElement).value = returnTo;
        form.submit();
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
      {/* Hidden form for token exchange via navigation POST */}
      <form
        ref={formRef}
        method="POST"
        action="/api/auth/token-redirect"
        style={{ display: 'none' }}
      >
        <input type="hidden" name="code" />
        <input type="hidden" name="codeVerifier" />
        <input type="hidden" name="returnTo" />
      </form>
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
