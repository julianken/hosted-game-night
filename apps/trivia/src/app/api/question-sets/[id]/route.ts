/**
 * Trivia Question Set API Routes - Single Question Set Operations
 * Handles getting, updating, and deleting individual question sets
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@beak-gaming/database/server';
import {
  getTriviaQuestionSet,
  updateTriviaQuestionSet,
  deleteTriviaQuestionSet,
} from '@beak-gaming/database/tables';
import { isDatabaseError } from '@beak-gaming/database/errors';
import type { TriviaQuestionSetUpdate, TriviaQuestion } from '@beak-gaming/database/types';

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
 * GET /api/question-sets/[id]
 * Get a single question set by ID
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
    const questionSet = await getTriviaQuestionSet(supabase, id);

    return NextResponse.json({ questionSet });
  } catch (error) {
    console.error('Error getting trivia question set:', error);

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
 * PATCH /api/question-sets/[id]
 * Update an existing question set
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

    const updateData: TriviaQuestionSetUpdate = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.questions !== undefined) updateData.questions = body.questions;
    if (body.is_default !== undefined) updateData.is_default = body.is_default;

    const questionSet = await updateTriviaQuestionSet(supabase, id, updateData);

    return NextResponse.json({ questionSet });
  } catch (error) {
    console.error('Error updating trivia question set:', error);

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
 * DELETE /api/question-sets/[id]
 * Delete a question set
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
    await deleteTriviaQuestionSet(supabase, id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting trivia question set:', error);

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
