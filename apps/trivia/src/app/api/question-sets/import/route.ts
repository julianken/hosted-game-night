/**
 * Import API Route — POST /api/question-sets/import
 *
 * Accepts raw JSON content, parses and validates questions,
 * then creates a new trivia question set.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiUser, createAuthenticatedClient } from '@joolie-boolie/auth';
import { QUESTION_SETS_ENABLED } from '@/lib/feature-flags';
import { parseJsonQuestions, questionsToTriviaQuestions } from '@/lib/questions';
import { createTriviaQuestionSet } from '@joolie-boolie/database/tables';
import { isDatabaseError } from '@joolie-boolie/database/errors';
import type { TriviaQuestionSetInsert } from '@joolie-boolie/database/types';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'api-trivia-question-sets-import' });

export async function POST(request: NextRequest) {
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

    // Step 1: Parse the raw JSON to extract wrapper metadata
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in rawJson' },
        { status: 400 }
      );
    }

    // Step 2: Extract wrapper name/description if present
    let wrapperName: string | undefined;
    let wrapperDescription: string | undefined;
    let questionsJson: string;

    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      'questions' in parsed &&
      Array.isArray((parsed as Record<string, unknown>).questions)
    ) {
      const wrapper = parsed as Record<string, unknown>;
      if (typeof wrapper.name === 'string') wrapperName = wrapper.name;
      if (typeof wrapper.description === 'string') wrapperDescription = wrapper.description;
      // Pass just the questions array to the parser
      questionsJson = JSON.stringify(wrapper.questions);
    } else {
      questionsJson = rawJson;
    }

    // Step 3: Determine final name — body overrides wrapper
    const finalName = name || wrapperName;
    if (!finalName) {
      return NextResponse.json(
        { error: 'Missing required field: name (not provided in body or JSON wrapper)' },
        { status: 400 }
      );
    }

    const finalDescription = description ?? wrapperDescription ?? null;

    // Step 4: Parse questions via parseJsonQuestions
    const parseResult = parseJsonQuestions(questionsJson);

    // Step 5: ALL questions must be valid
    if (!parseResult.success || parseResult.totalInvalid > 0) {
      return NextResponse.json(
        {
          error: `Validation failed: ${parseResult.totalInvalid} invalid question(s) out of ${parseResult.totalParsed}`,
          parseResult,
        },
        { status: 400 }
      );
    }

    // Step 6: Convert Question[] → TriviaQuestion[]
    const triviaQuestions = questionsToTriviaQuestions(parseResult.questions);

    // Step 7: Create the question set
    const questionSetData: TriviaQuestionSetInsert = {
      user_id: user.id,
      name: finalName,
      description: finalDescription,
      questions: triviaQuestions,
      is_default: false,
    };

    const questionSet = await createTriviaQuestionSet(supabase, questionSetData);

    return NextResponse.json({ questionSet, parseResult }, { status: 201 });
  } catch (error) {
    logger.error('Error importing question set', { error: error instanceof Error ? error.message : String(error) });

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
