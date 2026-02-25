/**
 * Trivia Preset API Routes - Single Preset Operations
 * Handles getting, updating, and deleting individual presets
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiUser, createAuthenticatedClient } from '@joolie-boolie/auth';
import {
  getTriviaPreset,
  updateTriviaPreset,
  deleteTriviaPreset,
} from '@joolie-boolie/database/tables';
import { isDatabaseError } from '@joolie-boolie/database/errors';
import type { TriviaPresetUpdate } from '@joolie-boolie/database/types';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'api-trivia-presets' });

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * GET /api/presets/[id]
 * Get a single preset by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedClient();
    const { id } = await params;

    // getTriviaPreset throws NotFoundError if preset doesn't exist
    const preset = await getTriviaPreset(supabase, id);

    // Verify the requesting user owns this preset
    if (preset.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ preset });
  } catch (error) {
    logger.error('Error getting trivia preset', { error: error instanceof Error ? error.message : String(error) });

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
 * PATCH /api/presets/[id]
 * Update an existing preset
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedClient();
    const { id } = await params;
    const body = await request.json();

    // Verify the requesting user owns this preset before updating
    const existing = await getTriviaPreset(supabase, id);
    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const updateData: TriviaPresetUpdate = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.rounds_count !== undefined) updateData.rounds_count = body.rounds_count;
    if (body.questions_per_round !== undefined) updateData.questions_per_round = body.questions_per_round;
    if (body.timer_duration !== undefined) updateData.timer_duration = body.timer_duration;
    if (body.is_default !== undefined) updateData.is_default = body.is_default;

    const preset = await updateTriviaPreset(supabase, id, updateData);

    return NextResponse.json({ preset });
  } catch (error) {
    logger.error('Error updating trivia preset', { error: error instanceof Error ? error.message : String(error) });

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
 * DELETE /api/presets/[id]
 * Delete a preset
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedClient();
    const { id } = await params;

    // Verify the requesting user owns this preset before deleting
    const existing = await getTriviaPreset(supabase, id);
    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    await deleteTriviaPreset(supabase, id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Error deleting trivia preset', { error: error instanceof Error ? error.message : String(error) });

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
