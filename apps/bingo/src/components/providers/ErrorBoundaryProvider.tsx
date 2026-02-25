'use client';

import { ReactNode } from 'react';
import { ErrorBoundaryProvider as SharedErrorBoundaryProvider } from '@joolie-boolie/ui';

interface ErrorBoundaryProviderProps {
  children: ReactNode;
}

async function loadSentryBackend() {
  const { SentryErrorBackend } = await import('@/lib/observability/sentry-backend');
  const { setErrorBackend } = await import('@joolie-boolie/error-tracking/client');
  setErrorBackend(new SentryErrorBackend());
}

/**
 * Error boundary provider for the Bingo app.
 * Delegates to the shared ErrorBoundaryProvider from @joolie-boolie/ui
 * with Bingo-specific configuration.
 */
export function ErrorBoundaryProvider({ children }: ErrorBoundaryProviderProps) {
  return (
    <SharedErrorBoundaryProvider
      appName="BeakBingo"
      componentName="BingoApp"
      errorMessageBody="the bingo game"
      appMetadata="bingo"
      loadSentryBackend={loadSentryBackend}
    >
      {children}
    </SharedErrorBoundaryProvider>
  );
}
