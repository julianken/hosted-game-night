/**
 * Shared cron authentication helper.
 *
 * Verifies the CRON_SECRET from Vercel's Authorization header.
 * Vercel sends: Authorization: Bearer <CRON_SECRET>
 *
 * SECURITY: Fail-closed — if CRON_SECRET is not configured, the request is
 * REJECTED. This prevents preview deployments (where the env var may be
 * missing) from accepting unauthenticated cron requests.
 */

import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'cron-auth' });

/**
 * Verifies the CRON_SECRET from Vercel's Authorization header.
 *
 * @returns `null` if the request is authorized, or a 401 `NextResponse` if not.
 */
export function verifyCronAuth(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  // Fail-closed: if CRON_SECRET is not set, reject
  if (!cronSecret) {
    logger.error('CRON_SECRET not configured — rejecting request (fail-closed)');
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.error('Missing or malformed Authorization header');
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  const tokenBuffer = Buffer.from(token, 'utf-8');
  const secretBuffer = Buffer.from(cronSecret, 'utf-8');
  if (tokenBuffer.length !== secretBuffer.length || !timingSafeEqual(tokenBuffer, secretBuffer)) {
    logger.error('Invalid CRON_SECRET');
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // Authorized
  return null;
}
