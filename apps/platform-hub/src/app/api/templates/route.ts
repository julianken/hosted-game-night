import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@beak-gaming/auth';

const bingoUrl = process.env.NEXT_PUBLIC_BINGO_URL || 'http://localhost:3000';
const triviaUrl = process.env.NEXT_PUBLIC_TRIVIA_URL || 'http://localhost:3001';

/**
 * Template with discriminated union for game type
 */
type BingoTemplate = {
  game: 'bingo';
  id: string;
  user_id: string;
  name: string;
  pattern_id: string;
  voice_pack: string;
  auto_call_enabled: boolean;
  auto_call_interval: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

type TriviaTemplate = {
  game: 'trivia';
  id: string;
  user_id: string;
  name: string;
  questions: unknown[]; // JSONB array
  rounds_count: number;
  questions_per_round: number;
  timer_duration: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type Template = BingoTemplate | TriviaTemplate;

/**
 * Aggregation API: Fetch templates from both Bingo and Trivia games
 *
 * GET /api/templates
 * - Fetches from Bingo API (NEXT_PUBLIC_BINGO_URL/api/templates)
 * - Fetches from Trivia API (NEXT_PUBLIC_TRIVIA_URL/api/templates)
 * - Combines results with discriminated union type
 * - Sorts by updated_at descending
 *
 * Query Parameters:
 * - recent=true: Return only recent templates (3 most recent per game)
 * - limit=N: Maximum total templates to return (default: no limit)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const recent = searchParams.get('recent') === 'true';
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : null;

    // E2E mode: return mock templates instead of fetching from downstream APIs
    if (process.env.E2E_TESTING === 'true') {
      const { getE2ETemplates } = await import('@/lib/e2e-template-store');
      const templates = getE2ETemplates();

      // Sort by updated_at descending (match production path)
      templates.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      let filteredTemplates = templates;

      // Apply recent filter if requested
      if (recent) {
        const bingoTemplates = templates.filter(t => t.game === 'bingo').slice(0, 3);
        const triviaTemplates = templates.filter(t => t.game === 'trivia').slice(0, 3);
        filteredTemplates = [...bingoTemplates, ...triviaTemplates].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      }

      // Apply limit if provided
      if (limit && limit > 0) {
        filteredTemplates = filteredTemplates.slice(0, limit);
      }

      return NextResponse.json({ templates: filteredTemplates });
    }

    const [bingoResponse, triviaResponse] = await Promise.allSettled([
      fetch(`${bingoUrl}/api/templates`, {
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      fetch(`${triviaUrl}/api/templates`, {
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    ]);

    const templates: Template[] = [];
    const errors: string[] = [];

    // Process Bingo templates
    if (bingoResponse.status === 'fulfilled' && bingoResponse.value.ok) {
      const bingoData = await bingoResponse.value.json();
      const bingoTemplates: BingoTemplate[] = bingoData.templates.map(
        (template: Omit<BingoTemplate, 'game'>) => ({
          ...template,
          game: 'bingo' as const,
        })
      );
      templates.push(...bingoTemplates);
    } else {
      errors.push(
        `Bingo API unavailable: ${
          bingoResponse.status === 'rejected'
            ? bingoResponse.reason
            : bingoResponse.value.statusText
        }`
      );
    }

    // Process Trivia templates
    if (triviaResponse.status === 'fulfilled' && triviaResponse.value.ok) {
      const triviaData = await triviaResponse.value.json();
      const triviaTemplates: TriviaTemplate[] = triviaData.templates.map(
        (template: Omit<TriviaTemplate, 'game'>) => ({
          ...template,
          game: 'trivia' as const,
        })
      );
      templates.push(...triviaTemplates);
    } else {
      errors.push(
        `Trivia API unavailable: ${
          triviaResponse.status === 'rejected'
            ? triviaResponse.reason
            : triviaResponse.value.statusText
        }`
      );
    }

    // Sort by updated_at descending (most recent first)
    templates.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    // Apply recent filter if requested
    let filteredTemplates = templates;
    if (recent) {
      const bingoTemplates = templates
        .filter((t) => t.game === 'bingo')
        .slice(0, 3);
      const triviaTemplates = templates
        .filter((t) => t.game === 'trivia')
        .slice(0, 3);
      filteredTemplates = [...bingoTemplates, ...triviaTemplates].sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    }

    // Apply limit if provided
    if (limit && limit > 0) {
      filteredTemplates = filteredTemplates.slice(0, limit);
    }

    return NextResponse.json({
      templates: filteredTemplates,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates', templates: [] },
      { status: 500 }
    );
  }
}
