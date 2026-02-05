/**
 * Trivia Preset API Routes - Single Preset Operations
 * Handles getting, updating, and deleting individual presets
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@beak-gaming/database/server';
import {
  getTriviaPreset,
  updateTriviaPreset,
  deleteTriviaPreset,
} from '@beak-gaming/database/tables';
import { isDatabaseError } from '@beak-gaming/database/errors';
import type { TriviaPresetUpdate } from '@beak-gaming/database/types';

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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const preset = await getTriviaPreset(supabase, id);

    return NextResponse.json({ preset });
  } catch (error) {
    console.error('Error getting trivia preset:', error);

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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const updateData: TriviaPresetUpdate = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.rounds_count !== undefined) updateData.rounds_count = body.rounds_count;
    if (body.questions_per_round !== undefined) updateData.questions_per_round = body.questions_per_round;
    if (body.timer_duration !== undefined) updateData.timer_duration = body.timer_duration;
    if (body.is_default !== undefined) updateData.is_default = body.is_default;

    const preset = await updateTriviaPreset(supabase, id, updateData);

    return NextResponse.json({ preset });
  } catch (error) {
    console.error('Error updating trivia preset:', error);

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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    await deleteTriviaPreset(supabase, id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting trivia preset:', error);

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
