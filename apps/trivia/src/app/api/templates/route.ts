/**
 * Trivia Template API Routes
 * Handles listing and creating trivia templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@beak-gaming/database/server';
import {
  listAllTriviaTemplates,
  createTriviaTemplate,
} from '@beak-gaming/database/tables';
import { isDatabaseError } from '@beak-gaming/database/errors';
import type { TriviaTemplateInsert, TriviaQuestion } from '@beak-gaming/database/types';

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
 * GET /api/templates
 * List all templates for the authenticated user
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

    const templates = await listAllTriviaTemplates(supabase, user.id);

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error listing trivia templates:', error);

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
 * POST /api/templates
 * Create a new template for the authenticated user
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

    // Create template data
    const templateData: TriviaTemplateInsert = {
      user_id: user.id,
      name: body.name,
      questions: body.questions || [],
      rounds_count: body.rounds_count ?? 3,
      questions_per_round: body.questions_per_round ?? 10,
      timer_duration: body.timer_duration ?? 30,
      is_default: body.is_default ?? false,
    };

    const template = await createTriviaTemplate(supabase, templateData);

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating trivia template:', error);

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
