/**
 * Cron job to clean up expired game sessions.
 *
 * This endpoint is called by Vercel Cron every 6 hours to mark
 * expired sessions (expires_at < now() AND status = 'active') as 'expired'.
 *
 * Security: Protected by CRON_SECRET environment variable.
 * The secret is sent in the Authorization header by Vercel.
 *
 * Schedule: Every 6 hours (see vercel.json for cron expression)
 *
 * @see supabase/migrations/20260215120000_tighten_game_sessions_rls.sql
 *      for the cleanup_expired_sessions() function definition.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'cron-cleanup-sessions' });

interface CleanupResponse {
  success: boolean;
  updatedCount?: number;
  error?: string;
  timestamp?: string;
}

/**
 * Verifies the CRON_SECRET from Vercel's Authorization header.
 * Vercel sends: Authorization: Bearer <CRON_SECRET>
 */
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');

  // In development/testing, allow requests without auth if no CRON_SECRET is set
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.warn('CRON_SECRET not configured - allowing request in non-production');
    return process.env.NODE_ENV !== 'production';
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  return token === cronSecret;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<CleanupResponse>> {
  // Verify cron secret
  if (!verifyCronSecret(request)) {
    logger.error('Unauthorized request - invalid CRON_SECRET');
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const supabase = createServiceRoleClient();

    // Call the cleanup function via RPC
    const { data, error } = await supabase.rpc('cleanup_expired_sessions');

    if (error) {
      logger.error('Database error', { error: error.message });
      return NextResponse.json(
        {
          success: false,
          error: `Database error: ${error.message}`,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    const updatedCount = data as number;
    logger.info('Successfully marked expired sessions', { updatedCount });

    return NextResponse.json({
      success: true,
      updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Unexpected error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
