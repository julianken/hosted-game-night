import { createLogger } from './server-logger';

/**
 * Validates that a URL points to a Sentry ingest host.
 * Only allows `sentry.io` and `*.sentry.io` hostnames.
 */
function isAllowedHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    return hostname === 'sentry.io' || hostname.endsWith('.sentry.io');
  } catch {
    return false;
  }
}

/**
 * Creates a Next.js API route handler that tunnels Sentry envelopes
 * to the Sentry ingest API, preventing ad-blockers from blocking
 * error reports.
 *
 * @param serviceName - Identifier used in structured log entries
 * @returns POST handler compatible with Next.js App Router route files
 *
 * @example
 * ```ts
 * // app/api/monitoring-tunnel/route.ts
 * import { createMonitoringTunnelHandler } from '@joolie-boolie/error-tracking/monitoring-tunnel';
 * export const POST = createMonitoringTunnelHandler('api-bingo-monitoring-tunnel');
 * ```
 */
export function createMonitoringTunnelHandler(
  serviceName: string,
): (request: Request) => Promise<Response> {
  const logger = createLogger({ service: serviceName });

  return async (request: Request): Promise<Response> => {
    try {
      const envelope = await request.text();
      const headerLine = envelope.split('\n')[0];
      if (!headerLine) {
        return Response.json({ error: 'Invalid envelope' }, { status: 400 });
      }

      let header: { dsn?: string };
      try {
        header = JSON.parse(headerLine);
      } catch {
        return Response.json({ error: 'Invalid envelope header' }, { status: 400 });
      }

      const dsn = header.dsn;
      if (!dsn) {
        return Response.json({ error: 'Missing DSN' }, { status: 400 });
      }

      let dsnUrl: URL;
      try {
        dsnUrl = new URL(dsn);
      } catch {
        return Response.json({ error: 'Invalid DSN format' }, { status: 400 });
      }

      const projectId = dsnUrl.pathname.replace('/', '');
      const sentryIngestUrl = `https://${dsnUrl.hostname}/api/${projectId}/envelope/`;

      if (!isAllowedHost(sentryIngestUrl)) {
        return Response.json({ error: 'Invalid Sentry host' }, { status: 403 });
      }

      // Validate DSN matches configured DSN (prevent open proxy)
      const configuredDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
      if (configuredDsn) {
        try {
          const configuredUrl = new URL(configuredDsn);
          const envelopeUrl = new URL(dsn);
          if (
            configuredUrl.hostname !== envelopeUrl.hostname ||
            configuredUrl.pathname !== envelopeUrl.pathname
          ) {
            return Response.json({ error: 'DSN mismatch' }, { status: 403 });
          }
        } catch {
          // If either DSN can't be parsed, allow but the host check already passed
        }
      }

      const response = await fetch(sentryIngestUrl, {
        method: 'POST',
        body: envelope,
        headers: { 'Content-Type': 'application/x-sentry-envelope' },
      });

      return new Response(response.body, {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      logger.error('Error forwarding envelope', {
        error: error instanceof Error ? error.message : String(error),
      });
      return Response.json({ error: 'Tunnel error' }, { status: 500 });
    }
  };
}
