import { NextRequest, NextResponse } from 'next/server';

function isAllowedHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    return hostname === 'sentry.io' || hostname.endsWith('.sentry.io');
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const envelope = await request.text();
    const headerLine = envelope.split('\n')[0];
    if (!headerLine) {
      return NextResponse.json({ error: 'Invalid envelope' }, { status: 400 });
    }

    let header: { dsn?: string };
    try {
      header = JSON.parse(headerLine);
    } catch {
      return NextResponse.json({ error: 'Invalid envelope header' }, { status: 400 });
    }

    const dsn = header.dsn;
    if (!dsn) {
      return NextResponse.json({ error: 'Missing DSN' }, { status: 400 });
    }

    let dsnUrl: URL;
    try {
      dsnUrl = new URL(dsn);
    } catch {
      return NextResponse.json({ error: 'Invalid DSN format' }, { status: 400 });
    }

    const projectId = dsnUrl.pathname.replace('/', '');
    const sentryIngestUrl = `https://${dsnUrl.hostname}/api/${projectId}/envelope/`;

    if (!isAllowedHost(sentryIngestUrl)) {
      return NextResponse.json({ error: 'Invalid Sentry host' }, { status: 403 });
    }

    // Validate DSN matches configured DSN (prevent open proxy)
    const configuredDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (configuredDsn) {
      try {
        const configuredUrl = new URL(configuredDsn);
        const envelopeUrl = new URL(dsn);
        if (configuredUrl.hostname !== envelopeUrl.hostname || configuredUrl.pathname !== envelopeUrl.pathname) {
          return NextResponse.json({ error: 'DSN mismatch' }, { status: 403 });
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

    return new NextResponse(response.body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Sentry Tunnel] Error forwarding envelope:', error);
    return NextResponse.json({ error: 'Tunnel error' }, { status: 500 });
  }
}
