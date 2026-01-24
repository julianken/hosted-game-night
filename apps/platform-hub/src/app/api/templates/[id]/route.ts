import { NextResponse } from 'next/server';

/**
 * Delete template by ID
 *
 * DELETE /api/templates/[id]?game=bingo|trivia
 * - Proxies delete to appropriate game API
 * - Returns success/error
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const {id} = await params;
    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game');

    if (!game || (game !== 'bingo' && game !== 'trivia')) {
      return NextResponse.json(
        { error: 'Game parameter required (bingo or trivia)' },
        { status: 400 }
      );
    }

    // Determine API URL
    const port = game === 'bingo' ? 3000 : 3001;
    const apiUrl = `http://localhost:${port}/api/templates/${id}`;

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
