import { validateEnvironment } from './lib/env-validation';

export async function register() {
  validateEnvironment();

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      const { registerOTel } = await import('@vercel/otel');
      registerOTel({ serviceName: 'platform-hub' });
    }

    await import('../sentry.server.config');

    if (process.env.SENTRY_DSN && process.env.E2E_TESTING !== 'true') {
      const { setServerErrorBackend } = await import('@joolie-boolie/error-tracking/server');
      const { SentryErrorBackend } = await import('./lib/observability/sentry-backend');
      setServerErrorBackend(new SentryErrorBackend());
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export async function onRequestError(
  error: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: Record<string, string>;
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routeType: 'render' | 'route' | 'action' | 'middleware';
    routePath: string;
    revalidateReason: 'on-demand' | 'stale' | undefined;
    renderSource:
      | 'react-server-components'
      | 'react-server-components-payload'
      | 'server-rendering'
      | undefined;
  }
): Promise<void> {
  const { captureServerError } = await import('@joolie-boolie/error-tracking/server');

  captureServerError(error, {
    component: context.routePath,
    requestId: error.digest,
    url: request.path,
    metadata: {
      method: request.method,
      routerKind: context.routerKind,
      routeType: context.routeType,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
    },
  });
}
