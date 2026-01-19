import { NextRequest, NextResponse } from 'next/server';
import { gameSessionStorage, createDefaultTeams, generateId } from '@/lib/api/storage';
import type {
  TriviaGameSession,
  CreateTriviaGameRequest,
  ApiResponse,
  PaginatedResponse,
  DEFAULT_ROUNDS,
  QUESTIONS_PER_ROUND,
} from '@/types';

/**
 * GET /api/games
 * List all trivia game sessions with optional pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));

    const allSessions = gameSessionStorage.getAll();
    const total = allSessions.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedSessions = allSessions.slice(startIndex, startIndex + pageSize);

    const response: PaginatedResponse<TriviaGameSession> = {
      data: paginatedSessions,
      total,
      page,
      pageSize,
      error: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    const response: PaginatedResponse<TriviaGameSession> = {
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
      error: err instanceof Error ? err.message : 'Failed to fetch game sessions',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/games
 * Create a new trivia game session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateTriviaGameRequest;

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      const response: ApiResponse<TriviaGameSession> = {
        data: null,
        error: 'Name is required and must be a non-empty string',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate optional fields
    if (body.totalRounds !== undefined) {
      if (typeof body.totalRounds !== 'number' || body.totalRounds < 1 || body.totalRounds > 10) {
        const response: ApiResponse<TriviaGameSession> = {
          data: null,
          error: 'totalRounds must be a number between 1 and 10',
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    if (body.questionsPerRound !== undefined) {
      if (typeof body.questionsPerRound !== 'number' || body.questionsPerRound < 1 || body.questionsPerRound > 20) {
        const response: ApiResponse<TriviaGameSession> = {
          data: null,
          error: 'questionsPerRound must be a number between 1 and 20',
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    const newSession: TriviaGameSession = {
      id: generateId(),
      name: body.name.trim(),
      status: 'setup',
      currentRound: 0,
      totalRounds: body.totalRounds ?? 3, // DEFAULT_ROUNDS
      teams: createDefaultTeams(4),
      questionSetId: body.questionSetId || null,
      createdAt: now,
      updatedAt: now,
    };

    const created = gameSessionStorage.create(newSession);

    const response: ApiResponse<TriviaGameSession> = {
      data: created,
      error: null,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    const response: ApiResponse<TriviaGameSession> = {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create game session',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
