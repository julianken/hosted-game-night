import { NextRequest, NextResponse } from 'next/server';
import { sessionHistoryStorage, generateId } from '@/lib/api/storage';
import type {
  TriviaSessionHistory,
  CreateSessionHistoryRequest,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

/**
 * GET /api/sessions
 * List all trivia session history records with optional pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));
    const userId = searchParams.get('userId');

    // Get sessions, optionally filtered by userId
    let allSessions: TriviaSessionHistory[];
    if (userId) {
      allSessions = sessionHistoryStorage.getByUserId(userId);
    } else {
      allSessions = sessionHistoryStorage.getAll();
    }

    const total = allSessions.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedSessions = allSessions.slice(startIndex, startIndex + pageSize);

    const response: PaginatedResponse<TriviaSessionHistory> = {
      data: paginatedSessions,
      total,
      page,
      pageSize,
      error: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    const response: PaginatedResponse<TriviaSessionHistory> = {
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
      error: err instanceof Error ? err.message : 'Failed to fetch session history',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/sessions
 * Create a new trivia session history record
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateSessionHistoryRequest;

    // Validate required fields
    if (!body.startedAt || typeof body.startedAt !== 'string') {
      const response: ApiResponse<TriviaSessionHistory> = {
        data: null,
        error: 'startedAt is required and must be a valid ISO date string',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate startedAt is a valid date
    const startedAtDate = new Date(body.startedAt);
    if (isNaN(startedAtDate.getTime())) {
      const response: ApiResponse<TriviaSessionHistory> = {
        data: null,
        error: 'startedAt must be a valid ISO date string',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate roundsPlayed
    if (typeof body.roundsPlayed !== 'number' || body.roundsPlayed < 0) {
      const response: ApiResponse<TriviaSessionHistory> = {
        data: null,
        error: 'roundsPlayed must be a non-negative number',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate totalRounds
    if (typeof body.totalRounds !== 'number' || body.totalRounds < 1) {
      const response: ApiResponse<TriviaSessionHistory> = {
        data: null,
        error: 'totalRounds must be a positive number',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate questionsAnswered
    if (typeof body.questionsAnswered !== 'number' || body.questionsAnswered < 0) {
      const response: ApiResponse<TriviaSessionHistory> = {
        data: null,
        error: 'questionsAnswered must be a non-negative number',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate totalQuestions
    if (typeof body.totalQuestions !== 'number' || body.totalQuestions < 0) {
      const response: ApiResponse<TriviaSessionHistory> = {
        data: null,
        error: 'totalQuestions must be a non-negative number',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate teamScores
    if (!Array.isArray(body.teamScores)) {
      const response: ApiResponse<TriviaSessionHistory> = {
        data: null,
        error: 'teamScores must be an array',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate each team score entry
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

    const now = new Date().toISOString();
    const newSession: TriviaSessionHistory = {
      id: generateId(),
      startedAt: body.startedAt,
      endedAt: body.endedAt || null,
      roundsPlayed: body.roundsPlayed,
      totalRounds: body.totalRounds,
      questionsAnswered: body.questionsAnswered,
      totalQuestions: body.totalQuestions,
      teamScores: body.teamScores,
      winnerTeamId: body.winnerTeamId || null,
      winnerTeamName: body.winnerTeamName || null,
      userId: body.userId || null,
      questionSetId: body.questionSetId || null,
      questionSetName: body.questionSetName || null,
      questionSummaries: body.questionSummaries || [],
      createdAt: now,
      updatedAt: now,
    };

    const created = sessionHistoryStorage.create(newSession);

    const response: ApiResponse<TriviaSessionHistory> = {
      data: created,
      error: null,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    const response: ApiResponse<TriviaSessionHistory> = {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create session history',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
