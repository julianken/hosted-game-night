/**
 * Bingo Template API Routes - Single Template Operations
 * Handles getting, updating, and deleting individual templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@beak-gaming/database/server';
import {
  getBingoTemplate,
  updateBingoTemplate,
  deleteBingoTemplate,
  AUTO_CALL_INTERVAL_MIN,
  AUTO_CALL_INTERVAL_MAX,
} from '@beak-gaming/database/tables';
import { isDatabaseError } from '@beak-gaming/database/errors';
import type { BingoTemplateUpdate } from '@beak-gaming/database/types';

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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // getBingoTemplate throws NotFoundError if template doesn't exist or user lacks access (via RLS)
    const template = await getBingoTemplate(supabase, id);

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error getting bingo template:', error);

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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    // updateBingoTemplate throws NotFoundError if template doesn't exist or user lacks access (via RLS)
    const template = await updateBingoTemplate(supabase, id, updateData);

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error updating bingo template:', error);

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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // RLS will prevent deleting other users' templates
    await deleteBingoTemplate(supabase, id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting bingo template:', error);

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
