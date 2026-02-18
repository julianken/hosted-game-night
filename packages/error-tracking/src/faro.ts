'use client';

import { faro, getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { ReactIntegration } from '@grafana/faro-react';

export function initFaro(config: { appName: string; url?: string }) {
  // Skip if already initialized or not in a browser environment
  if (faro.api || typeof window === 'undefined') return;

  const collectorUrl = config.url || process.env.NEXT_PUBLIC_FARO_URL;
  if (!collectorUrl) return;

  try {
    initializeFaro({
      url: collectorUrl,
      app: {
        name: config.appName,
        version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || '0.0.0',
        environment:
          process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',
      },
      instrumentations: [
        ...getWebInstrumentations({
          captureConsole: false, // Don't capture console — Sentry already does this
        }),
        new ReactIntegration(),
      ],
      // Filter out noisy events
      ignoreErrors: [/ResizeObserver loop/, /Loading chunk/, /ChunkLoadError/],
    });
  } catch {
    // Faro is non-critical — fail silently
  }
}
