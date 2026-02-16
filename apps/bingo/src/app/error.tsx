'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { logError } from '@beak-gaming/error-tracking';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, {
      component: 'BingoErrorPage',
      userAction: 'page_navigation',
      metadata: {
        digest: error.digest,
        app: 'bingo',
      },
    });
  }, [error]);

  return (
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
          We ran into a problem while loading the bingo game.
          This might be temporary - please try again.
        </p>

        {/* Help text */}
        <p className="text-lg text-muted-foreground mb-8">
          If this keeps happening, please let a staff member know.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-8 py-4 text-lg font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-300 focus:outline-none min-h-[52px] transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-8 py-4 text-lg font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:ring-4 focus:ring-gray-300 focus:outline-none min-h-[52px] transition-colors inline-flex items-center justify-center"
          >
            Go to Home
          </Link>
        </div>

        {/* Error ID for debugging */}
        {error.digest && (
          <p className="mt-8 text-base text-muted-foreground font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
