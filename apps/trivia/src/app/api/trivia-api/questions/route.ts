/**
 * BFF Proxy -- GET /api/trivia-api/questions
 *
 * Authenticates the user, validates query parameters, checks the in-process
 * cache, fetches from the-trivia-api.com on cache miss, converts via adapter,
 * caches the result, and returns adapted questions.
 *
 * Query parameters:
 *   limit        integer 1-50 (default: 10)
 *   categories   comma-separated TriviaApiCategory values (optional)
 *   difficulties comma-separated: easy, medium, hard (optional)
 *   excludeNiche boolean: true (default) or false
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@joolie-boolie/auth';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';
import { fetchTriviaApiQuestions } from '@/lib/trivia-api/client';
import type { TriviaApiCategory, TriviaApiDifficulty, TriviaApiParams } from '@/lib/trivia-api/client';
import { getCached, setCached, buildCacheKey } from '@/lib/trivia-api/cache';
import { triviaApiQuestionsToQuestions } from '@/lib/questions/api-adapter';

const logger = createLogger({ service: 'api-trivia-api-questions' });

// =============================================================================
// ALLOWLISTS
// =============================================================================

const VALID_API_CATEGORIES = new Set<TriviaApiCategory>([
  'music',
  'film_and_tv',
  'sport_and_leisure',
  'arts_and_literature',
  'history',
  'science',
  'geography',
  'society_and_culture',
  'food_and_drink',
  'general_knowledge',
]);

const VALID_DIFFICULTIES = new Set<TriviaApiDifficulty>(['easy', 'medium', 'hard']);

// =============================================================================
// PARAMETER PARSING HELPERS
// =============================================================================

function parseLimit(value: string | null): { limit: number } | { error: string } {
  if (value === null || value === '') {
    return { limit: 10 };
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    return { error: 'limit must be an integer between 1 and 50' };
  }
  return { limit: parsed };
}

function parseCommaSeparated<T extends string>(
  value: string | null,
  allowlist: Set<T>,
  paramName: string
): { values: T[] } | { error: string } {
  if (value === null || value.trim() === '') {
    return { values: [] };
  }
  const items = value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
  const invalid = items.filter((item) => !allowlist.has(item as T));
  if (invalid.length > 0) {
    return {
      error: `Invalid ${paramName}: ${invalid.join(', ')}. Valid values: ${Array.from(allowlist).join(', ')}`,
    };
  }
  return { values: items as T[] };
}

function parseExcludeNiche(value: string | null): boolean {
  if (value === null || value === '') {
    return true;
  }
  return value !== 'false' && value !== '0';
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Step 1: Authentication
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 2: Parse and validate query parameters
    const sp = request.nextUrl.searchParams;

    const limitResult = parseLimit(sp.get('limit'));
    if ('error' in limitResult) {
      return NextResponse.json({ error: limitResult.error }, { status: 400 });
    }

    const categoriesResult = parseCommaSeparated<TriviaApiCategory>(
      sp.get('categories'),
      VALID_API_CATEGORIES,
      'categories'
    );
    if ('error' in categoriesResult) {
      return NextResponse.json({ error: categoriesResult.error }, { status: 400 });
    }

    const difficultiesResult = parseCommaSeparated<TriviaApiDifficulty>(
      sp.get('difficulties'),
      VALID_DIFFICULTIES,
      'difficulties'
    );
    if ('error' in difficultiesResult) {
      return NextResponse.json({ error: difficultiesResult.error }, { status: 400 });
    }

    const excludeNiche = parseExcludeNiche(sp.get('excludeNiche'));

    // Step 3: Assemble the TriviaApiParams object used for BOTH cache key and fetch.
    // This guarantees cache key always matches the actual fetch that would be made.
    const apiParams: TriviaApiParams = {
      limit: limitResult.limit,
      ...(categoriesResult.values.length > 0 && { categories: categoriesResult.values }),
      ...(difficultiesResult.values.length > 0 && { difficulties: difficultiesResult.values }),
    };

    // Step 4: Cache check (cache stores raw TriviaApiQuestion[] for flexibility)
    const cachedQuestions = getCached(apiParams);

    if (cachedQuestions !== null) {
      logger.info('Cache hit for trivia API questions', {
        event: 'trivia_api_cache_hit',
        cacheKey: buildCacheKey(apiParams),
      });

      const questions = triviaApiQuestionsToQuestions(cachedQuestions, { excludeNiche });

      return NextResponse.json({
        questions,
        meta: {
          fetchedAt: null, // not available from cache; use null to signal cached result
          totalFetched: questions.length,
          source: 'the-trivia-api',
          cached: true,
        },
      });
    }

    // Step 5: Fetch from external API
    logger.info('Cache miss -- fetching from trivia API', {
      event: 'trivia_api_cache_miss',
      cacheKey: buildCacheKey(apiParams),
    });

    const result = await fetchTriviaApiQuestions(apiParams);

    if (!result.ok) {
      // Map error to appropriate HTTP status
      const statusCode = result.statusCode != null
        ? (result.statusCode >= 500 ? 502 : result.statusCode === 429 ? 429 : 502)
        : result.error.includes('timed out')
          ? 503
          : 502;

      logger.warn('Upstream trivia API error', {
        event: 'trivia_api_upstream_failure',
        error: result.error,
        upstreamStatus: result.statusCode != null ? String(result.statusCode) : undefined,
        responseStatus: String(statusCode),
      });

      const clientMessage =
        statusCode === 429
          ? 'Trivia API rate limit exceeded. Please try again later.'
          : statusCode === 503
            ? 'Trivia API is temporarily unavailable. Please try again.'
            : 'Failed to fetch questions from Trivia API.';

      return NextResponse.json(
        { error: clientMessage },
        { status: statusCode }
      );
    }

    // Step 6: Cache the raw API questions (before filtering/adapting)
    // Caching raw allows different excludeNiche values to be served from the same cache entry.
    setCached(apiParams, result.questions);

    const fetchedAt = new Date().toISOString();

    // Step 7: Convert to app Question type (adapter handles niche filtering)
    const questions = triviaApiQuestionsToQuestions(result.questions, { excludeNiche });

    logger.info('Trivia API questions adapted and returned', {
      event: 'trivia_api_response',
      totalFetched: String(result.questions.length),
      totalConverted: String(questions.length),
      excludeNiche: String(excludeNiche),
    });

    // Step 8: Return
    return NextResponse.json({
      questions,
      meta: {
        fetchedAt,
        totalFetched: questions.length,
        source: 'the-trivia-api',
        cached: false,
      },
    });

  } catch (error) {
    // This catch block handles only truly unexpected errors (programming bugs,
    // unexpected throws from dependencies). The client module and adapter are
    // designed to never throw.
    logger.error('Unexpected error in trivia API questions route', {
      event: 'trivia_api_unexpected_error',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
