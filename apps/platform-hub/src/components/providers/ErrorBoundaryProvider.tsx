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
 * Error boundary provider for the Platform Hub.
 * Delegates to the shared ErrorBoundaryProvider from @joolie-boolie/ui
 * with Platform Hub-specific configuration.
 */
export function ErrorBoundaryProvider({ children }: ErrorBoundaryProviderProps) {
  return (
    <SharedErrorBoundaryProvider
      appName="JoolieBoolie"
      componentName="PlatformHub"
      errorMessageBody="loading this page"
      appMetadata={{ app: 'platform-hub' }}
      loadSentryBackend={loadSentryBackend}
    >
      {children}
    </SharedErrorBoundaryProvider>
  );
}
