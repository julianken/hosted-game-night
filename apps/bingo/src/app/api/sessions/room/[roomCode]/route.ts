import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGameSessionByRoomCode } from '@beak-gaming/database';

/**
 * GET /api/sessions/room/[roomCode] - Get session ID by room code
 *
 * Returns minimal session data for audience displays.
 * Used by the display page to resolve room code to session ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const client = await createClient();

    const session = await getGameSessionByRoomCode(client, roomCode);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Return session ID for BroadcastChannel sync
    return NextResponse.json({
      sessionId: session.session_id,
      roomCode: session.room_code,
      gameType: session.game_type,
      status: session.status,
    });
  } catch (error) {
    console.error('Failed to fetch session by room code:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
