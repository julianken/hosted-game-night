import { NextRequest, NextResponse } from 'next/server';
import { sessionHistoryStorage } from '@/lib/api/storage';
import type {
  TriviaSessionHistory,
  UpdateSessionHistoryRequest,
  ApiResponse,
} from '@/types';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/sessions/[id]
 * Get a specific trivia session history record by ID
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const session = sessionHistoryStorage.getById(id);

    if (!session) {
      const response: ApiResponse<TriviaSessionHistory> = {
        data: null,
        error: 'Session history not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<TriviaSessionHistory> = {
      data: session,
      error: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    const response: ApiResponse<TriviaSessionHistory> = {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch session history',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * PATCH /api/sessions/[id]
 * Update a trivia session history record
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json() as UpdateSessionHistoryRequest;

    const existing = sessionHistoryStorage.getById(id);
    if (!existing) {
      const response: ApiResponse<TriviaSessionHistory> = {
        data: null,
        error: 'Session history not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Validate endedAt if provided
    if (body.endedAt !== undefined) {
      const endedAtDate = new Date(body.endedAt);
      if (isNaN(endedAtDate.getTime())) {
        const response: ApiResponse<TriviaSessionHistory> = {
          data: null,
          error: 'endedAt must be a valid ISO date string',
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    // Validate roundsPlayed if provided
    if (body.roundsPlayed !== undefined) {
      if (typeof body.roundsPlayed !== 'number' || body.roundsPlayed < 0) {
        const response: ApiResponse<TriviaSessionHistory> = {
          data: null,
          error: 'roundsPlayed must be a non-negative number',
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    // Validate questionsAnswered if provided
    if (body.questionsAnswered !== undefined) {
      if (typeof body.questionsAnswered !== 'number' || body.questionsAnswered < 0) {
        const response: ApiResponse<TriviaSessionHistory> = {
          data: null,
          error: 'questionsAnswered must be a non-negative number',
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    // Validate teamScores if provided
    if (body.teamScores !== undefined) {
      if (!Array.isArray(body.teamScores)) {
        const response: ApiResponse<TriviaSessionHistory> = {
          data: null,
          error: 'teamScores must be an array',
        };
        return NextResponse.json(response, { status: 400 });
      }

      for (const teamScore of body.teamScores) {
        if (!teamScore.teamId || typeof teamScore.teamId !== 'string') {
          const response: ApiResponse<TriviaSessionHistory> = {
            data: null,
            error: 'Each team score must have a valid teamId',
          };
          return NextResponse.json(response, { status: 400 });
        }
        if (!teamScore.teamName || typeof teamScore.teamName !== 'string') {
          const response: ApiResponse<TriviaSessionHistory> = {
            data: null,
            error: 'Each team score must have a valid teamName',
          };
          return NextResponse.json(response, { status: 400 });
        }
        if (typeof teamScore.totalScore !== 'number') {
          const response: ApiResponse<TriviaSessionHistory> = {
            data: null,
            error: 'Each team score must have a valid totalScore',
          };
          return NextResponse.json(response, { status: 400 });
        }
        if (!Array.isArray(teamScore.roundScores)) {
          const response: ApiResponse<TriviaSessionHistory> = {
            data: null,
            error: 'Each team score must have roundScores array',
          };
          return NextResponse.json(response, { status: 400 });
        }
      }
    }

    // Validate questionSummaries if provided
    if (body.questionSummaries !== undefined) {
      if (!Array.isArray(body.questionSummaries)) {
        const response: ApiResponse<TriviaSessionHistory> = {
          data: null,
          error: 'questionSummaries must be an array',
        };
        return NextResponse.json(response, { status: 400 });
      }

      for (const summary of body.questionSummaries) {
        if (!summary.questionId || typeof summary.questionId !== 'string') {
          const response: ApiResponse<TriviaSessionHistory> = {
            data: null,
            error: 'Each question summary must have a valid questionId',
          };
          return NextResponse.json(response, { status: 400 });
        }
        if (!summary.questionText || typeof summary.questionText !== 'string') {
          const response: ApiResponse<TriviaSessionHistory> = {
            data: null,
            error: 'Each question summary must have a valid questionText',
          };
          return NextResponse.json(response, { status: 400 });
        }
        if (!Array.isArray(summary.correctAnswers)) {
          const response: ApiResponse<TriviaSessionHistory> = {
            data: null,
            error: 'Each question summary must have correctAnswers array',
          };
          return NextResponse.json(response, { status: 400 });
        }
        if (typeof summary.teamsCorrect !== 'number' || summary.teamsCorrect < 0) {
          const response: ApiResponse<TriviaSessionHistory> = {
            data: null,
            error: 'Each question summary must have a valid teamsCorrect count',
          };
          return NextResponse.json(response, { status: 400 });
        }
        if (typeof summary.teamsIncorrect !== 'number' || summary.teamsIncorrect < 0) {
          const response: ApiResponse<TriviaSessionHistory> = {
            data: null,
            error: 'Each question summary must have a valid teamsIncorrect count',
          };
          return NextResponse.json(response, { status: 400 });
        }
      }
    }

    const updated = sessionHistoryStorage.update(id, body);

    const response: ApiResponse<TriviaSessionHistory> = {
      data: updated!,
      error: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    const response: ApiResponse<TriviaSessionHistory> = {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update session history',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * DELETE /api/sessions/[id]
 * Delete a trivia session history record
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const existing = sessionHistoryStorage.getById(id);
    if (!existing) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Session history not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    sessionHistoryStorage.delete(id);

    const response: ApiResponse<{ deleted: boolean }> = {
      data: { deleted: true },
      error: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    const response: ApiResponse<null> = {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to delete session history',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
