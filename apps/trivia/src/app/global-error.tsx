'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Global error handler for the root layout.
 * This catches errors that happen in the root layout itself.
 * Note: This must include its own <html> and <body> tags.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in all environments for global errors
    console.error('[Trivia] Global error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // Report to Sentry
    Sentry.captureException(error, {
      tags: {
        app: 'trivia',
        error_boundary: 'global',
      },
      extra: {
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            backgroundColor: '#fef2f2',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          role="alert"
          aria-live="assertive"
        >
          <div style={{ maxWidth: '500px', textAlign: 'center' }}>
            {/* Error Icon */}
            <div style={{ marginBottom: '1.5rem' }}>
              <svg
                width="80"
                height="80"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                style={{ margin: '0 auto' }}
              >
                <circle cx="12" cy="12" r="10" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" />
                <path
                  d="M12 8v4m0 4h.01"
                  stroke="#dc2626"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Title */}
            <h1
              style={{
                fontSize: '1.875rem',
                fontWeight: 'bold',
                color: '#991b1b',
                marginBottom: '1rem',
                lineHeight: 1.2,
              }}
            >
              Trivia has stopped working
            </h1>

            {/* Message */}
            <p
              style={{
                fontSize: '1.25rem',
                color: '#7f1d1d',
                marginBottom: '1rem',
                lineHeight: 1.5,
              }}
            >
              We are sorry, but something went very wrong.
              Please try refreshing the page.
            </p>

            {/* Help text */}
            <p
              style={{
                fontSize: '1rem',
                color: '#6b7280',
                marginBottom: '2rem',
                lineHeight: 1.5,
              }}
            >
              If the problem continues, please contact support or try again later.
            </p>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                alignItems: 'center',
              }}
            >
              <button
                onClick={() => reset()}
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: 'white',
                  backgroundColor: '#dc2626',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  minHeight: '52px',
                  minWidth: '200px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#b91c1c')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#374151',
                  backgroundColor: '#e5e7eb',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  minHeight: '52px',
                  minWidth: '200px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#d1d5db')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
              >
                Refresh Page
              </button>
            </div>

            {/* Error ID */}
            {error.digest && (
              <p
                style={{
                  marginTop: '2rem',
                  fontSize: '0.875rem',
                  color: '#9ca3af',
                  fontFamily: 'monospace',
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
