import { NextRequest, NextResponse } from 'next/server';
import { gameSessionStorage } from '@/lib/api/storage';
import type {
  TriviaGameSession,
  UpdateTriviaGameRequest,
  ApiResponse,
} from '@/types';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/games/[id]
 * Get a specific trivia game session by ID
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const session = gameSessionStorage.getById(id);

    if (!session) {
      const response: ApiResponse<TriviaGameSession> = {
        data: null,
        error: 'Game session not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<TriviaGameSession> = {
      data: session,
      error: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    const response: ApiResponse<TriviaGameSession> = {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch game session',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * PATCH /api/games/[id]
 * Update a trivia game session
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json() as UpdateTriviaGameRequest;

    const existing = gameSessionStorage.getById(id);
    if (!existing) {
      const response: ApiResponse<TriviaGameSession> = {
        data: null,
        error: 'Game session not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Validate name if provided
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        const response: ApiResponse<TriviaGameSession> = {
          data: null,
          error: 'Name must be a non-empty string',
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    // Validate status if provided
    if (body.status !== undefined) {
      const validStatuses = ['setup', 'playing', 'between_rounds', 'paused', 'ended'];
      if (!validStatuses.includes(body.status)) {
        const response: ApiResponse<TriviaGameSession> = {
          data: null,
          error: `Status must be one of: ${validStatuses.join(', ')}`,
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    // Validate currentRound if provided
    if (body.currentRound !== undefined) {
      if (typeof body.currentRound !== 'number' || body.currentRound < 0) {
        const response: ApiResponse<TriviaGameSession> = {
          data: null,
          error: 'currentRound must be a non-negative number',
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    // Validate totalRounds if provided
    if (body.totalRounds !== undefined) {
      if (typeof body.totalRounds !== 'number' || body.totalRounds < 1 || body.totalRounds > 10) {
        const response: ApiResponse<TriviaGameSession> = {
          data: null,
          error: 'totalRounds must be a number between 1 and 10',
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    // Validate teams if provided
    if (body.teams !== undefined) {
      if (!Array.isArray(body.teams)) {
        const response: ApiResponse<TriviaGameSession> = {
          data: null,
          error: 'teams must be an array',
        };
        return NextResponse.json(response, { status: 400 });
      }
      if (body.teams.length > 20) {
        const response: ApiResponse<TriviaGameSession> = {
          data: null,
          error: 'Maximum 20 teams allowed',
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    const updated = gameSessionStorage.update(id, {
      ...body,
      name: body.name?.trim(),
    });

    const response: ApiResponse<TriviaGameSession> = {
      data: updated!,
      error: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    const response: ApiResponse<TriviaGameSession> = {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update game session',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * DELETE /api/games/[id]
 * Delete a trivia game session
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const existing = gameSessionStorage.getById(id);
    if (!existing) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Game session not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    gameSessionStorage.delete(id);

    const response: ApiResponse<{ deleted: boolean }> = {
      data: { deleted: true },
      error: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    const response: ApiResponse<null> = {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to delete game session',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
