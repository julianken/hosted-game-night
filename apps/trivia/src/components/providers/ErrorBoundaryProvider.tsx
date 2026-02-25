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
 * Error boundary provider for the Trivia app.
 * Delegates to the shared ErrorBoundaryProvider from @joolie-boolie/ui
 * with Trivia-specific configuration.
 */
export function ErrorBoundaryProvider({ children }: ErrorBoundaryProviderProps) {
  return (
    <SharedErrorBoundaryProvider
      appName="TriviaNight"
      componentName="TriviaApp"
      errorMessageBody="Trivia"
      appMetadata={{ app: 'trivia' }}
      loadSentryBackend={loadSentryBackend}
    >
      {children}
    </SharedErrorBoundaryProvider>
  );
}
