import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@joolie-boolie/database/server';
import { getGameSessionByRoomCode } from '@joolie-boolie/database/tables';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'api-trivia-sessions' });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const supabase = await createClient();
    const session = await getGameSessionByRoomCode(supabase, roomCode);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      sessionId: session.session_id,
      roomCode: session.room_code,
      gameType: session.game_type,
      status: session.status,
    });
  } catch (error) {
    logger.error('Failed to fetch session by room code', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
