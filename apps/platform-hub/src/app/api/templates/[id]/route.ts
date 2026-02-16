import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@beak-gaming/auth';

const bingoUrl = process.env.NEXT_PUBLIC_BINGO_URL || 'http://localhost:3000';
const triviaUrl = process.env.NEXT_PUBLIC_TRIVIA_URL || 'http://localhost:3001';

/**
 * Delete template by ID
 *
 * DELETE /api/templates/[id]?game=bingo|trivia
 * - Proxies delete to appropriate game API
 * - Returns success/error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const {id} = await params;
    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game');

    if (!game || (game !== 'bingo' && game !== 'trivia')) {
      return NextResponse.json(
        { error: 'Game parameter required (bingo or trivia)' },
        { status: 400 }
      );
    }

    // Determine API URL from environment variables
    const baseUrl = game === 'bingo' ? bingoUrl : triviaUrl;
    const apiUrl = `${baseUrl}/api/templates/${id}`;

    // Proxy delete request
    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || `Failed to delete ${game} template` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
