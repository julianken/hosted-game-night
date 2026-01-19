import { NextRequest, NextResponse } from 'next/server';
import { questionSetStorage, generateId } from '@/lib/api/storage';
import type {
  QuestionSet,
  CreateQuestionSetRequest,
  ApiResponse,
  PaginatedResponse,
  QuestionCategory,
} from '@/types';

const validCategories: QuestionCategory[] = ['music', 'movies', 'tv', 'history'];

/**
 * GET /api/questions
 * List all question sets with optional pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));
    const category = searchParams.get('category');

    let allQuestionSets = questionSetStorage.getAll();

    // Filter by category if provided
    if (category) {
      if (!validCategories.includes(category as QuestionCategory)) {
        const response: PaginatedResponse<QuestionSet> = {
          data: [],
          total: 0,
          page: 1,
          pageSize: 10,
          error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        };
        return NextResponse.json(response, { status: 400 });
      }
      allQuestionSets = allQuestionSets.filter(qs => qs.category === category);
    }

    const total = allQuestionSets.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedSets = allQuestionSets.slice(startIndex, startIndex + pageSize);

    const response: PaginatedResponse<QuestionSet> = {
      data: paginatedSets,
      total,
      page,
      pageSize,
      error: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    const response: PaginatedResponse<QuestionSet> = {
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
      error: err instanceof Error ? err.message : 'Failed to fetch question sets',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/questions
 * Create a new question set
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateQuestionSetRequest;

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      const response: ApiResponse<QuestionSet> = {
        data: null,
        error: 'Name is required and must be a non-empty string',
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (!body.questions || !Array.isArray(body.questions) || body.questions.length === 0) {
      const response: ApiResponse<QuestionSet> = {
        data: null,
        error: 'Questions are required and must be a non-empty array',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate each question
    for (let i = 0; i < body.questions.length; i++) {
      const q = body.questions[i];

      if (!q.text || typeof q.text !== 'string' || q.text.trim().length === 0) {
        const response: ApiResponse<QuestionSet> = {
          data: null,
          error: `Question ${i + 1}: text is required and must be a non-empty string`,
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (!q.type || !['multiple_choice', 'true_false'].includes(q.type)) {
        const response: ApiResponse<QuestionSet> = {
          data: null,
          error: `Question ${i + 1}: type must be 'multiple_choice' or 'true_false'`,
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (!q.correctAnswers || !Array.isArray(q.correctAnswers) || q.correctAnswers.length === 0) {
        const response: ApiResponse<QuestionSet> = {
          data: null,
          error: `Question ${i + 1}: correctAnswers is required and must be a non-empty array`,
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
        const response: ApiResponse<QuestionSet> = {
          data: null,
          error: `Question ${i + 1}: options is required and must have at least 2 items`,
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (!q.optionTexts || !Array.isArray(q.optionTexts) || q.optionTexts.length !== q.options.length) {
        const response: ApiResponse<QuestionSet> = {
          data: null,
          error: `Question ${i + 1}: optionTexts must match options length`,
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (!q.category || !validCategories.includes(q.category)) {
        const response: ApiResponse<QuestionSet> = {
          data: null,
          error: `Question ${i + 1}: category must be one of: ${validCategories.join(', ')}`,
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    // Validate category if provided
    if (body.category !== undefined && !validCategories.includes(body.category)) {
      const response: ApiResponse<QuestionSet> = {
        data: null,
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      };
      return NextResponse.json(response, { status: 400 });
    }

    const now = new Date().toISOString();
    const questionsWithIds = body.questions.map((q, index) => ({
      ...q,
      id: generateId(),
      roundIndex: Math.floor(index / 5), // Default 5 questions per round
    }));

    const newQuestionSet: QuestionSet = {
      id: generateId(),
      name: body.name.trim(),
      description: body.description?.trim() || null,
      questions: questionsWithIds,
      category: body.category || null,
      createdAt: now,
      updatedAt: now,
    };

    const created = questionSetStorage.create(newQuestionSet);

    const response: ApiResponse<QuestionSet> = {
      data: created,
      error: null,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    const response: ApiResponse<QuestionSet> = {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create question set',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
