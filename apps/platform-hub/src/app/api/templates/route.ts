import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@joolie-boolie/auth';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  listAllBingoTemplates,
  listAllTriviaTemplates,
  type BingoTemplate as DBBingoTemplate,
  type TriviaTemplate as DBTriviaTemplate,
} from '@joolie-boolie/database';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'api-templates' });

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
 * Authenticate the request using multiple strategies:
 * 1. OAuth SSO token (jb_access_token cookie) - used by bingo/trivia apps
 * 2. Supabase session cookies (sb-* cookies) - used by platform-hub native auth
 *
 * Returns a user object with id and email, or null if unauthenticated.
 */
async function authenticateRequest(
  request: NextRequest
): Promise<{ id: string; email: string } | null> {
  // Strategy 1: Try OAuth SSO token (jb_access_token cookie)
  const apiUser = await getApiUser(request);
  if (apiUser) {
    return apiUser;
  }

  // Strategy 2: Fall back to Supabase session cookies
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user) {
      return { id: user.id, email: user.email || '' };
    }
  } catch {
    // Supabase client creation or auth check failed
  }

  return null;
}

/**
 * Map database bingo template to API response format
 */
function mapBingoTemplate(template: DBBingoTemplate): BingoTemplate {
  return {
    game: 'bingo' as const,
    id: template.id,
    user_id: template.user_id,
    name: template.name,
    pattern_id: template.pattern_id,
    voice_pack: template.voice_pack,
    auto_call_enabled: template.auto_call_enabled,
    auto_call_interval: template.auto_call_interval,
    is_default: template.is_default,
    created_at: template.created_at,
    updated_at: template.updated_at,
  };
}

/**
 * Map database trivia template to API response format
 */
function mapTriviaTemplate(template: DBTriviaTemplate): TriviaTemplate {
  return {
    game: 'trivia' as const,
    id: template.id,
    user_id: template.user_id,
    name: template.name,
    questions: template.questions,
    rounds_count: template.rounds_count,
    questions_per_round: template.questions_per_round,
    timer_duration: template.timer_duration,
    is_default: template.is_default,
    created_at: template.created_at,
    updated_at: template.updated_at,
  };
}

/**
 * Aggregation API: Fetch templates from both Bingo and Trivia via direct DB queries
 *
 * GET /api/templates
 * - Queries bingo_templates table directly
 * - Queries trivia_templates table directly
 * - Combines results with discriminated union type
 * - Sorts by updated_at descending
 *
 * Authentication:
 * - Accepts OAuth SSO token (jb_access_token cookie) from game apps
 * - Accepts Supabase session cookies (sb-*) from platform-hub native auth
 *
 * Query Parameters:
 * - recent=true: Return only recent templates (3 most recent per game)
 * - limit=N: Maximum total templates to return (default: no limit)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication (OAuth SSO token OR Supabase session)
    const user = await authenticateRequest(request);
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

    // E2E mode: return mock templates instead of querying the database
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

    // Query both template tables directly using the service role client
    // (bypasses RLS since the user is already authenticated by this route)
    const serviceClient = createServiceRoleClient();

    const [bingoResult, triviaResult] = await Promise.allSettled([
      listAllBingoTemplates(serviceClient, user.id),
      listAllTriviaTemplates(serviceClient, user.id),
    ]);

    const templates: Template[] = [];
    const errors: string[] = [];

    // Process Bingo templates
    if (bingoResult.status === 'fulfilled') {
      templates.push(...bingoResult.value.map(mapBingoTemplate));
    } else {
      const errorMsg = bingoResult.reason instanceof Error
        ? bingoResult.reason.message
        : String(bingoResult.reason);
      logger.error('Failed to fetch bingo templates', { error: errorMsg });
      errors.push(`Bingo templates unavailable: ${errorMsg}`);
    }

    // Process Trivia templates
    if (triviaResult.status === 'fulfilled') {
      templates.push(...triviaResult.value.map(mapTriviaTemplate));
    } else {
      const errorMsg = triviaResult.reason instanceof Error
        ? triviaResult.reason.message
        : String(triviaResult.reason);
      logger.error('Failed to fetch trivia templates', { error: errorMsg });
      errors.push(`Trivia templates unavailable: ${errorMsg}`);
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
    logger.error('Error fetching templates', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch templates', templates: [] },
      { status: 500 }
    );
  }
}
