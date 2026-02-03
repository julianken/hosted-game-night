/**
 * Import API Route — POST /api/question-sets/import
 *
 * Accepts raw JSON content with nested categories structure,
 * parses and validates it, then creates a new trivia question set.
 *
 * Expected JSON format:
 * {
 *   "name": "Question Set Name",
 *   "description": "Optional description",
 *   "categories": [
 *     {
 *       "id": "science",
 *       "name": "Science & Nature",
 *       "questions": [
 *         { "question": "...", "options": [...], "correctIndex": 0 }
 *       ]
 *     }
 *   ]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getAuthenticatedUserId } from '@/lib/supabase/server';
import { parseNestedJsonQuestions } from '@/lib/questions';
import { createTriviaQuestionSet } from '@beak-gaming/database/tables';
import { isDatabaseError } from '@beak-gaming/database/errors';
import type { TriviaQuestionSetInsert } from '@beak-gaming/database/types';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { rawJson, name, description } = body as {
      rawJson?: string;
      name?: string;
      description?: string;
    };

    if (!rawJson || typeof rawJson !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: rawJson' },
        { status: 400 }
      );
    }

    // Parse the nested JSON structure with categories
    const parseResult = parseNestedJsonQuestions(rawJson);

    // ALL categories and questions must be valid
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: `Validation failed: ${parseResult.errors.length} error(s)`,
          errors: parseResult.errors,
          warnings: parseResult.warnings,
        },
        { status: 400 }
      );
    }

    // Determine final name — body overrides JSON wrapper
    const finalName = name || parseResult.name;
    if (!finalName) {
      return NextResponse.json(
        { error: 'Missing required field: name (not provided in body or JSON wrapper)' },
        { status: 400 }
      );
    }

    const finalDescription = description ?? parseResult.description ?? null;

    // Create the question set with nested categories
    const supabase = createServiceClient();
    const questionSetData: TriviaQuestionSetInsert = {
      user_id: userId,
      name: finalName,
      description: finalDescription,
      categories: parseResult.categories,
      is_default: false,
    };

    const questionSet = await createTriviaQuestionSet(supabase, questionSetData);

    return NextResponse.json(
      {
        questionSet,
        importResult: {
          totalCategories: parseResult.totalCategories,
          totalQuestions: parseResult.totalQuestions,
          warnings: parseResult.warnings,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error importing question set:', error);

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
