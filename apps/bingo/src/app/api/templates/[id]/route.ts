/**
 * Bingo Template API Routes - Single Template Operations
 * Handles getting, updating, and deleting individual templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiUser, createAuthenticatedClient } from '@joolie-boolie/auth';
import {
  getBingoTemplate,
  updateBingoTemplate,
  deleteBingoTemplate,
  AUTO_CALL_INTERVAL_MIN,
  AUTO_CALL_INTERVAL_MAX,
} from '@joolie-boolie/database/tables';
import { isDatabaseError } from '@joolie-boolie/database/errors';
import type { BingoTemplateUpdate } from '@joolie-boolie/database/types';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'api-bingo-templates' });

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * GET /api/templates/[id]
 * Get a single template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedClient();
    const { id } = await params;

    // getBingoTemplate throws NotFoundError if template doesn't exist
    const template = await getBingoTemplate(supabase, id);

    // Verify the requesting user owns this template
    if (template.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    logger.error('Error getting bingo template', { error: error instanceof Error ? error.message : String(error) });

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
 * PATCH /api/templates/[id]
 * Update an existing template
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedClient();
    const { id } = await params;
    const body = await request.json();

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

    // Build update data from request body
    const updateData: BingoTemplateUpdate = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.pattern_id !== undefined) updateData.pattern_id = body.pattern_id;
    if (body.voice_pack !== undefined) updateData.voice_pack = body.voice_pack;
    if (body.auto_call_enabled !== undefined) updateData.auto_call_enabled = body.auto_call_enabled;
    if (body.auto_call_interval !== undefined) updateData.auto_call_interval = body.auto_call_interval;
    if (body.is_default !== undefined) updateData.is_default = body.is_default;

    // Verify the requesting user owns this template before updating
    const existing = await getBingoTemplate(supabase, id);
    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const template = await updateBingoTemplate(supabase, id, updateData);

    return NextResponse.json({ template });
  } catch (error) {
    logger.error('Error updating bingo template', { error: error instanceof Error ? error.message : String(error) });

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
 * DELETE /api/templates/[id]
 * Delete a template
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedClient();
    const { id } = await params;

    // Verify the requesting user owns this template before deleting
    const existing = await getBingoTemplate(supabase, id);
    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    await deleteBingoTemplate(supabase, id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Error deleting bingo template', { error: error instanceof Error ? error.message : String(error) });

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
