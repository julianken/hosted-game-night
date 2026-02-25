/**
 * Bingo Template API Routes
 * Handles listing and creating bingo templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiUser, createAuthenticatedClient } from '@joolie-boolie/auth';
import {
  listBingoTemplates,
  createBingoTemplate,
  AUTO_CALL_INTERVAL_MIN,
  AUTO_CALL_INTERVAL_MAX,
} from '@joolie-boolie/database/tables';
import { isDatabaseError } from '@joolie-boolie/database/errors';
import type { BingoTemplateInsert } from '@joolie-boolie/database/types';
import { parsePaginationParams } from '@joolie-boolie/database/pagination';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'api-bingo-templates' });

/**
 * GET /api/templates
 * List templates for the authenticated user with pagination and search.
 *
 * Query params:
 *   - page (number, default 1)
 *   - pageSize (number, default 20, max 100)
 *   - search (string, searches name, pattern_id, voice_pack)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const paginationParams = parsePaginationParams(searchParams);
    const search = searchParams.get('search') || undefined;

    const supabase = createAuthenticatedClient();
    const result = await listBingoTemplates(supabase, user.id, {
      page: paginationParams.page,
      pageSize: paginationParams.pageSize,
      search,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error listing bingo templates', { error: error instanceof Error ? error.message : String(error) });

    if (isDatabaseError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 * Create a new template for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedClient();
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    if (!body.pattern_id || typeof body.pattern_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: pattern_id' },
        { status: 400 }
      );
    }

    // Validate auto_call_interval if provided
    if (body.auto_call_interval !== undefined) {
      const interval = body.auto_call_interval;
      if (typeof interval !== 'number' || interval < AUTO_CALL_INTERVAL_MIN || interval > AUTO_CALL_INTERVAL_MAX) {
        return NextResponse.json(
          { error: `auto_call_interval must be between ${AUTO_CALL_INTERVAL_MIN} and ${AUTO_CALL_INTERVAL_MAX}ms` },
          { status: 400 }
        );
      }
    }

    // Create template data
    const templateData: BingoTemplateInsert = {
      user_id: user.id,
      name: body.name,
      pattern_id: body.pattern_id,
      voice_pack: body.voice_pack || 'classic',
      auto_call_enabled: body.auto_call_enabled ?? false,
      auto_call_interval: body.auto_call_interval ?? 5000,
      is_default: body.is_default ?? false,
    };

    const template = await createBingoTemplate(supabase, templateData);

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    logger.error('Error creating bingo template', { error: error instanceof Error ? error.message : String(error) });

    if (isDatabaseError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
