import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'csp-report-trivia' });

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    logger.warn('CSP violation', { violation: body['csp-report'] ?? body });
  } catch {
    // malformed body — still return 204
  }
  return new NextResponse(null, { status: 204 });
}
