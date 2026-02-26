import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMonitoringTunnelHandler } from '../monitoring-tunnel';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_DSN = 'https://abc123@o123456.ingest.sentry.io/456';
const VALID_ENVELOPE = JSON.stringify({ dsn: VALID_DSN }) + '\n{}';

function makeRequest(body: string): Request {
  return new Request('http://localhost/api/monitoring-tunnel', {
    method: 'POST',
    body,
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('createMonitoringTunnelHandler', () => {
  let handler: ReturnType<typeof createMonitoringTunnelHandler>;
  let mockFetch: ReturnType<typeof vi.fn>;
  const originalEnv = process.env.NEXT_PUBLIC_SENTRY_DSN;

  beforeEach(() => {
    handler = createMonitoringTunnelHandler('test-tunnel');
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    // Default: no configured DSN (skip mismatch check)
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_SENTRY_DSN = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    }
  });

  // -----------------------------------------------------------------------
  // Happy path
  // -----------------------------------------------------------------------

  it('forwards a valid envelope and returns 200', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('{"id":"event-id"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await handler(makeRequest(VALID_ENVELOPE));
    expect(res.status).toBe(200);

    // Verify fetch was called with expected URL
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://o123456.ingest.sentry.io/api/456/envelope/');
    expect(opts.method).toBe('POST');
    expect(opts.headers).toEqual({ 'Content-Type': 'application/x-sentry-envelope' });
  });

  // -----------------------------------------------------------------------
  // Validation errors (400)
  // -----------------------------------------------------------------------

  it('returns 400 for empty body', async () => {
    const res = await handler(makeRequest(''));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid envelope');
  });

  it('returns 400 for invalid JSON header', async () => {
    const res = await handler(makeRequest('not-json\n{}'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid envelope header');
  });

  it('returns 400 when DSN is missing from header', async () => {
    const envelope = JSON.stringify({ event_id: '123' }) + '\n{}';
    const res = await handler(makeRequest(envelope));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing DSN');
  });

  it('returns 400 for invalid DSN format', async () => {
    const envelope = JSON.stringify({ dsn: 'not-a-url' }) + '\n{}';
    const res = await handler(makeRequest(envelope));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid DSN format');
  });

  // -----------------------------------------------------------------------
  // Authorization errors (403)
  // -----------------------------------------------------------------------

  it('returns 403 for non-Sentry host', async () => {
    const envelope = JSON.stringify({ dsn: 'https://key@evil.example.com/123' }) + '\n{}';
    const res = await handler(makeRequest(envelope));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Invalid Sentry host');
  });

  it('returns 403 when DSN does not match configured DSN', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://other@o999999.ingest.sentry.io/789';

    const res = await handler(makeRequest(VALID_ENVELOPE));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('DSN mismatch');
  });

  it('allows matching configured DSN', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = VALID_DSN;
    mockFetch.mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const res = await handler(makeRequest(VALID_ENVELOPE));
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // Server errors (500)
  // -----------------------------------------------------------------------

  it('returns 500 when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network failure'));

    const res = await handler(makeRequest(VALID_ENVELOPE));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Tunnel error');
  });
});
