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
import { verifyCronAuth } from '@/lib/cron-auth';

const logger = createLogger({ service: 'cron-cleanup-sessions' });

interface CleanupResponse {
  success: boolean;
  updatedCount?: number;
  error?: string;
  timestamp?: string;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<CleanupResponse>> {
  // Verify cron secret (fail-closed: rejects if CRON_SECRET is not set)
  const authError = verifyCronAuth(request);
  if (authError) {
    return authError as NextResponse<CleanupResponse>;
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

    const updatedCount = typeof data === 'number' ? data : 0;
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
