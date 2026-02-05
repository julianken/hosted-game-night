/**
 * Cron job to clean up expired OAuth authorizations.
 *
 * This endpoint is called by Vercel Cron every 6 hours to remove
 * expired authorization requests that are still pending.
 *
 * Security: Protected by CRON_SECRET environment variable.
 * The secret is sent in the Authorization header by Vercel.
 *
 * Schedule: "0 0,6,12,18 * * *" (every 6 hours)
 *
 * @see supabase/migrations/20260123000001_create_oauth_tables.sql
 *      for the cleanup_expired_authorizations() function definition.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

interface CleanupResponse {
  success: boolean;
  deletedCount?: number;
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
    console.warn(
      '[Cron Cleanup] CRON_SECRET not configured - allowing request in non-production'
    );
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
    console.error('[Cron Cleanup] Unauthorized request - invalid CRON_SECRET');
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const supabase = createServiceRoleClient();

    // Call the cleanup function via RPC
    const { data, error } = await supabase.rpc('cleanup_expired_authorizations');

    if (error) {
      console.error('[Cron Cleanup] Database error:', error);
      return NextResponse.json(
        {
          success: false,
          error: `Database error: ${error.message}`,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    const deletedCount = data as number;
    console.log(
      `[Cron Cleanup] Successfully cleaned up ${deletedCount} expired authorizations`
    );

    return NextResponse.json({
      success: true,
      deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron Cleanup] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
