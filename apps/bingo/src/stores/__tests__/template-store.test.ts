import { describe, it, expect, beforeEach } from 'vitest';
import { useBingoTemplateStore } from '../template-store';
import type { BingoTemplateItem } from '../template-store';

// =============================================================================
// HELPERS
// =============================================================================

function makeInput(
  overrides: Partial<Omit<BingoTemplateItem, 'id' | 'created_at' | 'updated_at'>> = {}
): Omit<BingoTemplateItem, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: 'Test Template',
    pattern_id: 'full-card',
    voice_pack: 'standard',
    auto_call_enabled: false,
    auto_call_interval: 10000,
    is_default: false,
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('useBingoTemplateStore', () => {
  beforeEach(() => {
    // Reset store to clean state before each test
    useBingoTemplateStore.setState({ items: [] });
    localStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe('create', () => {
    it('returns item with id and timestamps', () => {
      const before = Date.now();
      const item = useBingoTemplateStore.getState().create(makeInput());
      const after = Date.now();

      expect(item.id).toBeTypeOf('string');
      expect(item.id.length).toBeGreaterThan(0);
      expect(new Date(item.created_at).getTime()).toBeGreaterThanOrEqual(before);
      expect(new Date(item.created_at).getTime()).toBeLessThanOrEqual(after);
      expect(new Date(item.updated_at).getTime()).toBeGreaterThanOrEqual(before);
      expect(new Date(item.updated_at).getTime()).toBeLessThanOrEqual(after);
    });

    it('returns item with all input fields preserved', () => {
      const input = makeInput({ name: 'My Template', pattern_id: 'x-pattern', voice_pack: 'british' });
      const item = useBingoTemplateStore.getState().create(input);

      expect(item.name).toBe('My Template');
      expect(item.pattern_id).toBe('x-pattern');
      expect(item.voice_pack).toBe('british');
    });

    it('adds item to items array', () => {
      useBingoTemplateStore.getState().create(makeInput());
      expect(useBingoTemplateStore.getState().items).toHaveLength(1);
    });

    it('clamps auto_call_interval below minimum (5000ms) to 5000', () => {
      const item = useBingoTemplateStore.getState().create(makeInput({ auto_call_interval: 1000 }));
      expect(item.auto_call_interval).toBe(5000);
    });

    it('clamps auto_call_interval above maximum (30000ms) to 30000', () => {
      const item = useBingoTemplateStore.getState().create(makeInput({ auto_call_interval: 99999 }));
      expect(item.auto_call_interval).toBe(30000);
    });

    it('preserves auto_call_interval within valid range', () => {
      const item = useBingoTemplateStore.getState().create(makeInput({ auto_call_interval: 15000 }));
      expect(item.auto_call_interval).toBe(15000);
    });

    it('preserves boundary value at minimum (5000ms)', () => {
      const item = useBingoTemplateStore.getState().create(makeInput({ auto_call_interval: 5000 }));
      expect(item.auto_call_interval).toBe(5000);
    });

    it('preserves boundary value at maximum (30000ms)', () => {
      const item = useBingoTemplateStore.getState().create(makeInput({ auto_call_interval: 30000 }));
      expect(item.auto_call_interval).toBe(30000);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe('update', () => {
    it('patches correctly and bumps updated_at', async () => {
      const item = useBingoTemplateStore.getState().create(makeInput({ name: 'Original' }));
      const originalUpdatedAt = item.updated_at;

      // Ensure clock advances (jsdom may be fast — wait 1ms)
      await new Promise((r) => setTimeout(r, 1));

      useBingoTemplateStore.getState().update(item.id, { name: 'Renamed' });

      const updated = useBingoTemplateStore.getState().items.find((t) => t.id === item.id)!;
      expect(updated.name).toBe('Renamed');
      expect(updated.updated_at).not.toBe(originalUpdatedAt);
    });

    it('does not modify created_at', async () => {
      const item = useBingoTemplateStore.getState().create(makeInput());
      await new Promise((r) => setTimeout(r, 1));

      useBingoTemplateStore.getState().update(item.id, { name: 'Changed' });

      const updated = useBingoTemplateStore.getState().items.find((t) => t.id === item.id)!;
      expect(updated.created_at).toBe(item.created_at);
    });

    it('does not modify id', () => {
      const item = useBingoTemplateStore.getState().create(makeInput());
      useBingoTemplateStore.getState().update(item.id, { name: 'Changed' });

      const updated = useBingoTemplateStore.getState().items.find((t) => t.id === item.id)!;
      expect(updated.id).toBe(item.id);
    });

    it('clamps auto_call_interval on update', () => {
      const item = useBingoTemplateStore.getState().create(makeInput({ auto_call_interval: 10000 }));
      useBingoTemplateStore.getState().update(item.id, { auto_call_interval: 500 });

      const updated = useBingoTemplateStore.getState().items.find((t) => t.id === item.id)!;
      expect(updated.auto_call_interval).toBe(5000);
    });

    it('no-ops for unknown id', () => {
      useBingoTemplateStore.getState().create(makeInput());
      const itemsBefore = useBingoTemplateStore.getState().items;

      useBingoTemplateStore.getState().update('nonexistent-id', { name: 'Ghost' });

      const itemsAfter = useBingoTemplateStore.getState().items;
      expect(itemsAfter[0].name).toBe(itemsBefore[0].name);
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------

  describe('remove', () => {
    it('deletes by id', () => {
      const item = useBingoTemplateStore.getState().create(makeInput());
      expect(useBingoTemplateStore.getState().items).toHaveLength(1);

      useBingoTemplateStore.getState().remove(item.id);
      expect(useBingoTemplateStore.getState().items).toHaveLength(0);
    });

    it('only removes the targeted item', () => {
      const a = useBingoTemplateStore.getState().create(makeInput({ name: 'A' }));
      const b = useBingoTemplateStore.getState().create(makeInput({ name: 'B' }));

      useBingoTemplateStore.getState().remove(a.id);

      const remaining = useBingoTemplateStore.getState().items;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(b.id);
    });

    it('no-ops for unknown id', () => {
      useBingoTemplateStore.getState().create(makeInput());
      useBingoTemplateStore.getState().remove('nonexistent-id');
      expect(useBingoTemplateStore.getState().items).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // setDefault
  // ---------------------------------------------------------------------------

  describe('setDefault', () => {
    it('makes exactly one item default', () => {
      const a = useBingoTemplateStore.getState().create(makeInput({ name: 'A', is_default: false }));
      const b = useBingoTemplateStore.getState().create(makeInput({ name: 'B', is_default: false }));
      const c = useBingoTemplateStore.getState().create(makeInput({ name: 'C', is_default: false }));

      useBingoTemplateStore.getState().setDefault(b.id);

      const items = useBingoTemplateStore.getState().items;
      const defaults = items.filter((t) => t.is_default);
      expect(defaults).toHaveLength(1);
      expect(defaults[0].id).toBe(b.id);

      const nonDefaults = items.filter((t) => !t.is_default);
      expect(nonDefaults.map((t) => t.id)).toContain(a.id);
      expect(nonDefaults.map((t) => t.id)).toContain(c.id);
    });

    it('transfers default from old item to new item', () => {
      const a = useBingoTemplateStore.getState().create(makeInput({ name: 'A', is_default: true }));
      const b = useBingoTemplateStore.getState().create(makeInput({ name: 'B', is_default: false }));

      useBingoTemplateStore.getState().setDefault(b.id);

      const items = useBingoTemplateStore.getState().items;
      expect(items.find((t) => t.id === a.id)!.is_default).toBe(false);
      expect(items.find((t) => t.id === b.id)!.is_default).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getDefault
  // ---------------------------------------------------------------------------

  describe('getDefault', () => {
    it('returns undefined when no items exist', () => {
      expect(useBingoTemplateStore.getState().getDefault()).toBeUndefined();
    });

    it('returns undefined when no item is default', () => {
      useBingoTemplateStore.getState().create(makeInput({ is_default: false }));
      expect(useBingoTemplateStore.getState().getDefault()).toBeUndefined();
    });

    it('returns the default item', () => {
      const a = useBingoTemplateStore.getState().create(makeInput({ name: 'A', is_default: false }));
      const b = useBingoTemplateStore.getState().create(makeInput({ name: 'B', is_default: true }));

      const result = useBingoTemplateStore.getState().getDefault();
      expect(result).not.toBeUndefined();
      expect(result!.id).toBe(b.id);
      // Sanity: not the non-default one
      expect(result!.id).not.toBe(a.id);
    });
  });

  // ---------------------------------------------------------------------------
  // persistence (localStorage integration)
  // ---------------------------------------------------------------------------

  describe('persistence', () => {
    it('items survive store reset via setState', () => {
      const item = useBingoTemplateStore.getState().create(makeInput({ name: 'Persisted' }));

      // Write to localStorage as persist middleware would
      const stored = JSON.stringify({
        state: { items: [item] },
        version: 1,
      });
      localStorage.setItem('jb-bingo-templates', stored);

      // Simulate store rehydration by calling persist rehydrate
      useBingoTemplateStore.persist.rehydrate();

      const items = useBingoTemplateStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Persisted');
    });

    it('persists only the items field (partialize excludes methods)', () => {
      useBingoTemplateStore.getState().create(makeInput({ name: 'Check Partialize' }));

      const stored = localStorage.getItem('jb-bingo-templates');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      // Methods should not be in persisted state
      expect(parsed.state.items).toBeDefined();
      expect(parsed.state.create).toBeUndefined();
      expect(parsed.state.update).toBeUndefined();
      expect(parsed.state.remove).toBeUndefined();
      expect(parsed.state.setDefault).toBeUndefined();
      expect(parsed.state.getDefault).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // migration
  // ---------------------------------------------------------------------------

  describe('migration from version 0', () => {
    it('returns empty items when migrating from version 0', () => {
      // Simulate stored state from version 0 (legacy data)
      const legacyStored = JSON.stringify({
        state: { items: [{ id: 'old-id', name: 'Old' }] },
        version: 0,
      });
      localStorage.setItem('jb-bingo-templates', legacyStored);

      // Reset and rehydrate
      useBingoTemplateStore.setState({ items: [] });
      useBingoTemplateStore.persist.rehydrate();

      // Migration from version 0 should return empty items
      const items = useBingoTemplateStore.getState().items;
      expect(items).toEqual([]);
    });
  });
});
