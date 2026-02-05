import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@beak-gaming/database/server';
import { getGameSessionByRoomCode } from '@beak-gaming/database/tables';

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
    console.error('Failed to fetch session by room code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
