/**
 * Trivia Template API Routes - Single Template Operations
 * Handles getting, updating, and deleting individual templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@beak-gaming/database/server';
import {
  getTriviaTemplate,
  updateTriviaTemplate,
  deleteTriviaTemplate,
} from '@beak-gaming/database/tables';
import { isDatabaseError } from '@beak-gaming/database/errors';
import type { TriviaTemplateUpdate, TriviaQuestion } from '@beak-gaming/database/types';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Validates trivia questions structure
 */
function validateQuestions(questions: TriviaQuestion[]): string | null {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    if (!q.question || typeof q.question !== 'string' || q.question.trim() === '') {
      return `Question ${i + 1}: question text is required and cannot be empty`;
    }

    if (!Array.isArray(q.options) || q.options.length < 2) {
      return `Question ${i + 1}: at least 2 options are required`;
    }

    if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      return `Question ${i + 1}: correctIndex must be a valid option index (0 to ${q.options.length - 1})`;
    }
  }

  return null;
}

/**
 * GET /api/templates/[id]
 * Get a single template by ID
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

    // getTriviaTemplate throws NotFoundError if template doesn't exist or user lacks access (via RLS)
    const template = await getTriviaTemplate(supabase, id);

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error getting trivia template:', error);

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
 * PATCH /api/templates/[id]
 * Update an existing template
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

    // Validate questions if provided
    if (body.questions !== undefined) {
      if (!Array.isArray(body.questions)) {
        return NextResponse.json(
          { error: 'questions must be an array' },
          { status: 400 }
        );
      }

      const validationError = validateQuestions(body.questions);
      if (validationError) {
        return NextResponse.json(
          { error: validationError },
          { status: 400 }
        );
      }
    }

    // Build update data from request body
    const updateData: TriviaTemplateUpdate = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.questions !== undefined) updateData.questions = body.questions;
    if (body.rounds_count !== undefined) updateData.rounds_count = body.rounds_count;
    if (body.questions_per_round !== undefined) updateData.questions_per_round = body.questions_per_round;
    if (body.timer_duration !== undefined) updateData.timer_duration = body.timer_duration;
    if (body.is_default !== undefined) updateData.is_default = body.is_default;

    // updateTriviaTemplate throws NotFoundError if template doesn't exist or user lacks access (via RLS)
    const template = await updateTriviaTemplate(supabase, id, updateData);

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error updating trivia template:', error);

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
 * DELETE /api/templates/[id]
 * Delete a template
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

    // RLS will prevent deleting other users' templates
    await deleteTriviaTemplate(supabase, id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting trivia template:', error);

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
