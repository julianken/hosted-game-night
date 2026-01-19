import { NextRequest, NextResponse } from 'next/server';
import { questionSetStorage, generateId } from '@/lib/api/storage';
import type {
  QuestionSet,
  UpdateQuestionSetRequest,
  ApiResponse,
  QuestionCategory,
} from '@/types';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const validCategories: QuestionCategory[] = ['music', 'movies', 'tv', 'history'];

/**
 * GET /api/questions/[id]
 * Get a specific question set by ID
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const questionSet = questionSetStorage.getById(id);

    if (!questionSet) {
      const response: ApiResponse<QuestionSet> = {
        data: null,
        error: 'Question set not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<QuestionSet> = {
      data: questionSet,
      error: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    const response: ApiResponse<QuestionSet> = {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch question set',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * PATCH /api/questions/[id]
 * Update a question set
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json() as UpdateQuestionSetRequest;

    const existing = questionSetStorage.getById(id);
    if (!existing) {
      const response: ApiResponse<QuestionSet> = {
        data: null,
        error: 'Question set not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Validate name if provided
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        const response: ApiResponse<QuestionSet> = {
          data: null,
          error: 'Name must be a non-empty string',
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    // Validate questions if provided
    if (body.questions !== undefined) {
      if (!Array.isArray(body.questions) || body.questions.length === 0) {
        const response: ApiResponse<QuestionSet> = {
          data: null,
          error: 'Questions must be a non-empty array',
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
    }

    // Validate category if provided
    if (body.category !== undefined && !validCategories.includes(body.category)) {
      const response: ApiResponse<QuestionSet> = {
        data: null,
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Build update object
    const updates: Partial<QuestionSet> = {
      name: body.name?.trim(),
      description: body.description?.trim(),
      category: body.category,
    };

    // Process questions if provided
    if (body.questions) {
      updates.questions = body.questions.map((q, index) => ({
        ...q,
        id: generateId(),
        roundIndex: Math.floor(index / 5),
      }));
    }

    const updated = questionSetStorage.update(id, updates);

    const response: ApiResponse<QuestionSet> = {
      data: updated!,
      error: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    const response: ApiResponse<QuestionSet> = {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update question set',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * DELETE /api/questions/[id]
 * Delete a question set
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const existing = questionSetStorage.getById(id);
    if (!existing) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Question set not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Prevent deletion of default question sets
    if (questionSetStorage.isDefault(id)) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Cannot delete default question sets',
      };
      return NextResponse.json(response, { status: 403 });
    }

    questionSetStorage.delete(id);

    const response: ApiResponse<{ deleted: boolean }> = {
      data: { deleted: true },
      error: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    const response: ApiResponse<null> = {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to delete question set',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
