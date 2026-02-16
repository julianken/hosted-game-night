'use client';

import { ReactNode } from 'react';
import { ErrorBoundary, logError, configureErrorLogger } from '@beak-gaming/error-tracking';

// Configure error logger for Platform Hub
if (typeof window !== 'undefined') {
  configureErrorLogger({
    appName: 'BeakGaming',
    enableConsole: process.env.NODE_ENV !== 'production',
    environment: process.env.NODE_ENV,
  });
}

interface ErrorBoundaryProviderProps {
  children: ReactNode;
}

/**
 * Error boundary provider for the Platform Hub.
 * Wraps children in an ErrorBoundary with app-specific configuration.
 */
export function ErrorBoundaryProvider({ children }: ErrorBoundaryProviderProps) {
  return (
    <ErrorBoundary
      componentName="PlatformHub"
      onError={(error) => {
        // Log error with app context
        logError(error, {
          metadata: {
            app: 'platform-hub',
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
              We ran into a problem loading this page.
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
