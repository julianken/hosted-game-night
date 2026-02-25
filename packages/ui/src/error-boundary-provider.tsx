'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { ErrorBoundary, logError, configureErrorLogger } from '@joolie-boolie/error-tracking';

export interface ErrorBoundaryProviderProps {
  children: ReactNode;
  /** Display name for the error logger (e.g. 'BeakBingo', 'TriviaNight') */
  appName: string;
  /** Component name passed to the ErrorBoundary (e.g. 'BingoApp', 'TriviaApp') */
  componentName: string;
  /** Error message body shown to users (e.g. 'the bingo game', 'Trivia') */
  errorMessageBody: string;
  /** Metadata key-value pairs for error tracking (e.g. { app: 'bingo' }) */
  appMetadata: Record<string, string>;
  /**
   * Optional async loader for the Sentry error backend.
   * Each app provides its own loader since the sentry-backend module
   * lives in the app's local lib/ directory.
   *
   * @example
   * ```tsx
   * loadSentryBackend={async () => {
   *   const { SentryErrorBackend } = await import('@/lib/observability/sentry-backend');
   *   const { setErrorBackend } = await import('@joolie-boolie/error-tracking/client');
   *   setErrorBackend(new SentryErrorBackend());
   * }}
   * ```
   */
  loadSentryBackend?: () => Promise<void>;
}

// Note: React error boundaries require class components for componentDidCatch/getDerivedStateFromError.
// The actual error catching is handled by the ErrorBoundary class component from @joolie-boolie/error-tracking.
// This wrapper is a functional component that provides app-specific configuration to the shared boundary.

/**
 * Shared error boundary provider that wraps children in an ErrorBoundary
 * with app-specific configuration. Handles error logger configuration,
 * optional Sentry backend wiring, and a consistent fallback UI across all apps.
 *
 * Each app passes its own appName, componentName, errorMessageBody, and
 * appMetadata to customize the error boundary behavior.
 */
export function ErrorBoundaryProvider({
  children,
  appName,
  componentName,
  errorMessageBody,
  appMetadata,
  loadSentryBackend,
}: ErrorBoundaryProviderProps) {
  const sentryInitRef = useRef(false);

  // Configure error logger on mount (client-side only)
  useEffect(() => {
    configureErrorLogger({
      appName,
      enableConsole: true,
      environment: process.env.NODE_ENV,
    });
  }, [appName]);

  useEffect(() => {
    if (sentryInitRef.current) return;
    sentryInitRef.current = true;

    // Wire Sentry backend if loader is provided and DSN is configured
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && loadSentryBackend) {
      loadSentryBackend().catch(() => {
        // Sentry not available -- continue without it
      });
    }
  }, [loadSentryBackend]);

  return (
    <ErrorBoundary
      componentName={componentName}
      onError={(error) => {
        // Log error with app context
        logError(error, {
          metadata: {
            ...appMetadata,
            url: typeof window !== 'undefined' ? window.location.href : undefined,
          },
        });
      }}
      fallback={(error, reset) => (
        <div
          className="min-h-screen flex flex-col items-center justify-center p-8 bg-red-50"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md text-center">
            {/* Error Icon */}
            <div className="mb-6">
              <svg
                className="w-20 h-20 mx-auto text-red-500"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
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
            <h1 className="text-3xl font-bold text-red-800 mb-4">
              Something went wrong
            </h1>

            {/* Message */}
            <p className="text-xl text-red-700 mb-6 leading-relaxed">
              We ran into a problem with {errorMessageBody}.
              Let us try to fix that for you.
            </p>

            {/* Help text */}
            <p className="text-lg text-muted-foreground mb-8">
              If this keeps happening, please let a staff member know.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={reset}
                className="px-8 py-4 text-lg font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-300 focus:outline-none min-h-[52px] transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-4 text-lg font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:ring-4 focus:ring-gray-300 focus:outline-none min-h-[52px] transition-colors"
              >
                Refresh Page
              </button>
            </div>

            {/* Error ID */}
            {error.id && (
              <p className="mt-8 text-base text-muted-foreground font-mono">
                Error ID: {error.id}
              </p>
            )}
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
