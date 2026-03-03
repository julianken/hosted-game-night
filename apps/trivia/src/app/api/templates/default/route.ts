/**
 * Trivia Default Template API Route
 * Returns the user's default trivia template (or null if none is set)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiUser, createAuthenticatedClient } from '@joolie-boolie/auth';
import { getDefaultTriviaTemplate } from '@joolie-boolie/database/tables';
import { isDatabaseError } from '@joolie-boolie/database/errors';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'api-trivia-templates-default' });

/**
 * GET /api/templates/default
 * Returns the authenticated user's default trivia template.
 * Returns { template: TriviaTemplate } when found, { template: null } when not found (HTTP 200 for both).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedClient();
    const template = await getDefaultTriviaTemplate(supabase, user.id);

    return NextResponse.json({ template });
  } catch (error) {
    logger.error('Error getting default trivia template', { error: error instanceof Error ? error.message : String(error) });

    if (isDatabaseError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
