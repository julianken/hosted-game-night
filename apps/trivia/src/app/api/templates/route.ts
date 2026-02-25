/**
 * Trivia Template API Routes
 * Handles listing and creating trivia templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiUser, createAuthenticatedClient } from '@joolie-boolie/auth';
import {
  listTriviaTemplates,
  createTriviaTemplate,
} from '@joolie-boolie/database/tables';
import { isDatabaseError } from '@joolie-boolie/database/errors';
import type { TriviaTemplateInsert, TriviaQuestion } from '@joolie-boolie/database/types';
import { parsePaginationParams } from '@joolie-boolie/database/pagination';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'api-trivia-templates' });

/** All columns except the JSONB `questions` column for list responses */
const TEMPLATE_LIST_COLUMNS =
  'id,user_id,name,rounds_count,questions_per_round,timer_duration,is_default,created_at,updated_at';

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
 * List templates for the authenticated user with pagination and search.
 * Excludes the `questions` JSONB column from list responses to reduce payload.
 *
 * Query params:
 *   - page (number, default 1)
 *   - pageSize (number, default 20, max 100)
 *   - search (string, searches name)
 *   - fields ('full' to include questions JSONB; omit to strip questions for smaller payloads)
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
    const includeFull = searchParams.get('fields') === 'full';

    const supabase = createAuthenticatedClient();
    const result = await listTriviaTemplates(supabase, user.id, {
      page: paginationParams.page,
      pageSize: paginationParams.pageSize,
      search,
      select: includeFull ? '*' : TEMPLATE_LIST_COLUMNS,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error listing trivia templates', { error: error instanceof Error ? error.message : String(error) });

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
    logger.error('Error creating trivia template', { error: error instanceof Error ? error.message : String(error) });

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
