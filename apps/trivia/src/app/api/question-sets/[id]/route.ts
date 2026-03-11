/**
 * Trivia Question Set API Routes - Single Question Set Operations
 * Handles getting, updating, and deleting individual question sets
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiUser, createAuthenticatedClient } from '@joolie-boolie/auth';
import { QUESTION_SETS_ENABLED } from '@/lib/feature-flags';
import {
  getTriviaQuestionSet,
  updateTriviaQuestionSet,
  deleteTriviaQuestionSet,
} from '@joolie-boolie/database/tables';
import { isDatabaseError } from '@joolie-boolie/database/errors';
import type { TriviaQuestionSetUpdate, TriviaQuestion } from '@joolie-boolie/database/types';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'api-trivia-question-sets' });

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
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!QUESTION_SETS_ENABLED) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = createAuthenticatedClient();
    const { id } = await params;

    // getTriviaQuestionSet throws NotFoundError if question set doesn't exist
    const questionSet = await getTriviaQuestionSet(supabase, id);

    // Verify the requesting user owns this question set
    if (questionSet.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ questionSet });
  } catch (error) {
    logger.error('Error getting trivia question set', { error: error instanceof Error ? error.message : String(error) });

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
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!QUESTION_SETS_ENABLED) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = createAuthenticatedClient();
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

    // Verify the requesting user owns this question set before updating
    const existing = await getTriviaQuestionSet(supabase, id);
    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const updateData: TriviaQuestionSetUpdate = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.questions !== undefined) updateData.questions = body.questions;
    if (body.is_default !== undefined) updateData.is_default = body.is_default;

    const questionSet = await updateTriviaQuestionSet(supabase, id, updateData, user.id);

    return NextResponse.json({ questionSet });
  } catch (error) {
    logger.error('Error updating trivia question set', { error: error instanceof Error ? error.message : String(error) });

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
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!QUESTION_SETS_ENABLED) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = createAuthenticatedClient();
    const { id } = await params;

    // Verify the requesting user owns this question set before deleting
    const existing = await getTriviaQuestionSet(supabase, id);
    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    await deleteTriviaQuestionSet(supabase, id, user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Error deleting trivia question set', { error: error instanceof Error ? error.message : String(error) });

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
