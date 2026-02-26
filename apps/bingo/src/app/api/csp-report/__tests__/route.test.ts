import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@joolie-boolie/error-tracking/server-logger', () => ({
  createLogger: () => mockLogger,
}));

import { POST } from '../route';

function makeRequest(body: string, contentType = 'application/csp-report'): NextRequest {
  return new NextRequest('http://localhost:3000/api/csp-report', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  });
}

describe('CSP report endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 204 and logs violation from csp-report key', async () => {
    const violation = {
      'document-uri': 'http://localhost:3000/',
      'violated-directive': 'script-src',
      'blocked-uri': 'inline',
    };
    const body = JSON.stringify({ 'csp-report': violation });
    const request = makeRequest(body);

    const response = await POST(request);

    expect(response.status).toBe(204);
    expect(mockLogger.warn).toHaveBeenCalledOnce();
    expect(mockLogger.warn).toHaveBeenCalledWith('CSP violation', { violation });
  });

  it('returns 204 and logs entire body when csp-report key is absent', async () => {
    const body = { 'document-uri': 'http://localhost:3000/', type: 'csp-violation' };
    const request = makeRequest(JSON.stringify(body));

    const response = await POST(request);

    expect(response.status).toBe(204);
    expect(mockLogger.warn).toHaveBeenCalledOnce();
    expect(mockLogger.warn).toHaveBeenCalledWith('CSP violation', { violation: body });
  });

  it('returns 204 without logging when body is malformed JSON', async () => {
    const request = makeRequest('not-valid-json');

    const response = await POST(request);

    expect(response.status).toBe(204);
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});
