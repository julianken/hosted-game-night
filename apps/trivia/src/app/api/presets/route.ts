/**
 * Trivia Preset API Routes
 * Handles listing and creating trivia presets (settings only, no questions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiUser, createAuthenticatedClient } from '@joolie-boolie/auth';
import {
  listTriviaPresets,
  createTriviaPreset,
} from '@joolie-boolie/database/tables';
import { isDatabaseError } from '@joolie-boolie/database/errors';
import type { TriviaPresetInsert } from '@joolie-boolie/database/types';
import { parsePaginationParams } from '@joolie-boolie/database/pagination';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'api-trivia-presets' });

/**
 * GET /api/presets
 * List presets for the authenticated user with pagination and search.
 *
 * Query params:
 *   - page (number, default 1)
 *   - pageSize (number, default 20, max 100)
 *   - search (string, searches name)
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

    const { searchParams } = new URL(request.url);
    const paginationParams = parsePaginationParams(searchParams);
    const search = searchParams.get('search') || undefined;

    const supabase = createAuthenticatedClient();
    const result = await listTriviaPresets(supabase, user.id, {
      page: paginationParams.page,
      pageSize: paginationParams.pageSize,
      search,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error listing trivia presets', { error: error instanceof Error ? error.message : String(error) });

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

/**
 * POST /api/presets
 * Create a new preset for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedClient();
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const presetData: TriviaPresetInsert = {
      user_id: user.id,
      name: body.name,
      rounds_count: body.rounds_count ?? 3,
      questions_per_round: body.questions_per_round ?? 10,
      timer_duration: body.timer_duration ?? 30,
      is_default: body.is_default ?? false,
    };

    const preset = await createTriviaPreset(supabase, presetData);

    return NextResponse.json({ preset }, { status: 201 });
  } catch (error) {
    logger.error('Error creating trivia preset', { error: error instanceof Error ? error.message : String(error) });

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
