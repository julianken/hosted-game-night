import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;
const isE2E = process.env.E2E_TESTING === 'true';

if (dsn && !isE2E) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    skipOpenTelemetrySetup: true,
    enabled: true,
    initialScope: {
      tags: { app: 'bingo' },
    },
  });
}
