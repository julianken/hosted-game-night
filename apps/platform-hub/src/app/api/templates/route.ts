import { NextResponse } from 'next/server';

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
 * - Fetches from Bingo API (localhost:3000/api/templates)
 * - Fetches from Trivia API (localhost:3001/api/templates)
 * - Combines results with discriminated union type
 * - Sorts by updated_at descending
 */
export async function GET() {
  try {
    const [bingoResponse, triviaResponse] = await Promise.allSettled([
      fetch('http://localhost:3000/api/templates', {
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      fetch('http://localhost:3001/api/templates', {
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

    return NextResponse.json({
      templates,
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
