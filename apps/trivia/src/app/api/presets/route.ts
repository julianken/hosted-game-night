/**
 * Trivia Preset API Routes
 * Handles listing and creating trivia presets (settings only, no questions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@beak-gaming/database/server';
import {
  listAllTriviaPresets,
  createTriviaPreset,
} from '@beak-gaming/database/tables';
import { isDatabaseError } from '@beak-gaming/database/errors';
import type { TriviaPresetInsert } from '@beak-gaming/database/types';

/**
 * GET /api/presets
 * List all presets for the authenticated user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const presets = await listAllTriviaPresets(supabase, user.id);

    return NextResponse.json({ presets });
  } catch (error) {
    console.error('Error listing trivia presets:', error);

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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
    console.error('Error creating trivia preset:', error);

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
