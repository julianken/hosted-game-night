/**
 * Tests for the user_id backstop on update() and remove() in queries.ts.
 *
 * Verifies that when an optional userId is provided, .eq('user_id', userId) is
 * chained onto the SQL WHERE clause; and when omitted, the query is unchanged.
 */

import { describe, it, expect, vi } from 'vitest';
import { update, remove } from '../queries';
import { NotFoundError } from '../errors';

// ---------------------------------------------------------------------------
// Mock Supabase client builder
// ---------------------------------------------------------------------------

function createMockQueryBuilder(overrides: {
  singleResult?: { data: unknown; error: unknown };
  deleteResult?: { error: unknown };
} = {}) {
  const eqCalls: Array<[string, string]> = [];
  const selectCalls: string[] = [];

  const builder: Record<string, unknown> = {
    eq: vi.fn((col: string, val: string) => {
      eqCalls.push([col, val]);
      return builder;
    }),
    select: vi.fn((cols: string) => {
      selectCalls.push(cols);
      return builder;
    }),
    single: vi.fn(() => {
      return Promise.resolve(
        overrides.singleResult ?? { data: { id: 'id-1', name: 'test' }, error: null }
      );
    }),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    // When awaited directly (remove()), resolve with deleteResult
    then: (
      resolve: (value: unknown) => void,
      reject?: (reason: unknown) => void
    ) => {
      const result = overrides.deleteResult ?? { error: null };
      return Promise.resolve(result).then(resolve, reject);
    },
  };

  const client = {
    from: vi.fn(() => builder),
  };

  return { client, builder, eqCalls, selectCalls };
}

// ---------------------------------------------------------------------------
// update() backstop tests
// ---------------------------------------------------------------------------

describe('update() user_id backstop', () => {
  it('chains .eq("user_id", userId) when options.userId is provided', async () => {
    const { client, eqCalls } = createMockQueryBuilder();

    await update(
      client as never,
      'bingo_templates',
      'id-1',
      { name: 'x' } as never,
      { userId: 'user-1' }
    );

    expect(eqCalls).toContainEqual(['id', 'id-1']);
    expect(eqCalls).toContainEqual(['user_id', 'user-1']);
    expect(eqCalls).toHaveLength(2);
  });

  it('does NOT chain .eq("user_id") when options.userId is omitted', async () => {
    const { client, eqCalls } = createMockQueryBuilder();

    await update(
      client as never,
      'bingo_templates',
      'id-1',
      { name: 'x' } as never
    );

    expect(eqCalls).toEqual([['id', 'id-1']]);
  });

  it('does NOT chain .eq("user_id") when options.userId is undefined', async () => {
    const { client, eqCalls } = createMockQueryBuilder();

    await update(
      client as never,
      'bingo_templates',
      'id-1',
      { name: 'x' } as never,
      { userId: undefined }
    );

    expect(eqCalls).toEqual([['id', 'id-1']]);
  });

  it('throws NotFoundError when user_id does not match (PGRST116)', async () => {
    const { client } = createMockQueryBuilder({
      singleResult: { data: null, error: { code: 'PGRST116', message: 'No rows' } },
    });

    await expect(
      update(
        client as never,
        'bingo_templates',
        'id-1',
        { name: 'x' } as never,
        { userId: 'wrong-user' }
      )
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('preserves select option alongside userId', async () => {
    const { client, eqCalls, selectCalls } = createMockQueryBuilder();

    await update(
      client as never,
      'bingo_templates',
      'id-1',
      { name: 'x' } as never,
      { userId: 'user-1', select: 'id,name' }
    );

    expect(eqCalls).toContainEqual(['user_id', 'user-1']);
    expect(selectCalls).toContain('id,name');
  });
});

// ---------------------------------------------------------------------------
// remove() backstop tests
// ---------------------------------------------------------------------------

describe('remove() user_id backstop', () => {
  it('chains .eq("user_id", userId) when options.userId is provided', async () => {
    const { client, eqCalls } = createMockQueryBuilder();

    await remove(
      client as never,
      'bingo_templates',
      'id-1',
      { userId: 'user-1' }
    );

    expect(eqCalls).toContainEqual(['id', 'id-1']);
    expect(eqCalls).toContainEqual(['user_id', 'user-1']);
    expect(eqCalls).toHaveLength(2);
  });

  it('does NOT chain .eq("user_id") when no options provided', async () => {
    const { client, eqCalls } = createMockQueryBuilder();

    await remove(
      client as never,
      'bingo_templates',
      'id-1'
    );

    expect(eqCalls).toEqual([['id', 'id-1']]);
  });

  it('does NOT chain .eq("user_id") when options.userId is undefined', async () => {
    const { client, eqCalls } = createMockQueryBuilder();

    await remove(
      client as never,
      'bingo_templates',
      'id-1',
      { userId: undefined }
    );

    expect(eqCalls).toEqual([['id', 'id-1']]);
  });

  it('succeeds silently when user_id mismatch deletes zero rows', async () => {
    const { client } = createMockQueryBuilder({
      deleteResult: { error: null },
    });

    // Should not throw -- Supabase returns success for zero-row deletes
    await expect(
      remove(
        client as never,
        'bingo_templates',
        'id-1',
        { userId: 'wrong-user' }
      )
    ).resolves.toBeUndefined();
  });
});
