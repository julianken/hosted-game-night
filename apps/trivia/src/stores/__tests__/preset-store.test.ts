import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTriviaPresetStore } from '../preset-store';
import type { TriviaPresetItem } from '../preset-store';

// =============================================================================
// HELPERS
// =============================================================================

function makeInput(
  overrides: Partial<Omit<TriviaPresetItem, 'id' | 'created_at' | 'updated_at'>> = {}
): Omit<TriviaPresetItem, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: 'Test Preset',
    rounds_count: 3,
    questions_per_round: 5,
    timer_duration: 30,
    is_default: false,
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('useTriviaPresetStore', () => {
  beforeEach(() => {
    useTriviaPresetStore.setState({ items: [] });
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe('create', () => {
    it('returns item with id and timestamps', () => {
      const before = Date.now();
      const item = useTriviaPresetStore.getState().create(makeInput());
      const after = Date.now();

      expect(item.id).toBeTypeOf('string');
      expect(item.id.length).toBeGreaterThan(0);
      expect(new Date(item.created_at).getTime()).toBeGreaterThanOrEqual(before);
      expect(new Date(item.created_at).getTime()).toBeLessThanOrEqual(after);
      expect(new Date(item.updated_at).getTime()).toBeGreaterThanOrEqual(before);
      expect(new Date(item.updated_at).getTime()).toBeLessThanOrEqual(after);
    });

    it('returns item with all input fields preserved', () => {
      const input = makeInput({
        name: 'Quick Game',
        rounds_count: 2,
        questions_per_round: 10,
        timer_duration: 45,
      });
      const item = useTriviaPresetStore.getState().create(input);

      expect(item.name).toBe('Quick Game');
      expect(item.rounds_count).toBe(2);
      expect(item.questions_per_round).toBe(10);
      expect(item.timer_duration).toBe(45);
    });

    it('adds item to items array', () => {
      useTriviaPresetStore.getState().create(makeInput());
      expect(useTriviaPresetStore.getState().items).toHaveLength(1);
    });

    it('each item gets a unique id', () => {
      const a = useTriviaPresetStore.getState().create(makeInput());
      const b = useTriviaPresetStore.getState().create(makeInput());
      expect(a.id).not.toBe(b.id);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe('update', () => {
    it('patches name and bumps updated_at', () => {
      const item = useTriviaPresetStore.getState().create(makeInput({ name: 'Original' }));
      const originalUpdatedAt = item.updated_at;

      vi.advanceTimersByTime(100);

      useTriviaPresetStore.getState().update(item.id, { name: 'Renamed' });

      const updated = useTriviaPresetStore.getState().items.find((t) => t.id === item.id)!;
      expect(updated.name).toBe('Renamed');
      expect(updated.updated_at).not.toBe(originalUpdatedAt);
    });

    it('does not modify created_at', () => {
      const item = useTriviaPresetStore.getState().create(makeInput());
      vi.advanceTimersByTime(100);

      useTriviaPresetStore.getState().update(item.id, { name: 'Changed' });

      const updated = useTriviaPresetStore.getState().items.find((t) => t.id === item.id)!;
      expect(updated.created_at).toBe(item.created_at);
    });

    it('does not modify id', () => {
      const item = useTriviaPresetStore.getState().create(makeInput());
      useTriviaPresetStore.getState().update(item.id, { name: 'Changed' });

      const updated = useTriviaPresetStore.getState().items.find((t) => t.id === item.id)!;
      expect(updated.id).toBe(item.id);
    });

    it('can update numeric fields', () => {
      const item = useTriviaPresetStore.getState().create(makeInput());

      useTriviaPresetStore.getState().update(item.id, {
        rounds_count: 6,
        timer_duration: 90,
      });

      const updated = useTriviaPresetStore.getState().items.find((t) => t.id === item.id)!;
      expect(updated.rounds_count).toBe(6);
      expect(updated.timer_duration).toBe(90);
    });

    it('no-ops for unknown id', () => {
      const item = useTriviaPresetStore.getState().create(makeInput({ name: 'Original' }));

      useTriviaPresetStore.getState().update('nonexistent-id', { name: 'Ghost' });

      const unchanged = useTriviaPresetStore.getState().items.find((t) => t.id === item.id)!;
      expect(unchanged.name).toBe('Original');
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------

  describe('remove', () => {
    it('deletes by id', () => {
      const item = useTriviaPresetStore.getState().create(makeInput());
      expect(useTriviaPresetStore.getState().items).toHaveLength(1);

      useTriviaPresetStore.getState().remove(item.id);
      expect(useTriviaPresetStore.getState().items).toHaveLength(0);
    });

    it('only removes the targeted item', () => {
      const a = useTriviaPresetStore.getState().create(makeInput({ name: 'A' }));
      const b = useTriviaPresetStore.getState().create(makeInput({ name: 'B' }));

      useTriviaPresetStore.getState().remove(a.id);

      const remaining = useTriviaPresetStore.getState().items;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(b.id);
    });

    it('no-ops for unknown id', () => {
      useTriviaPresetStore.getState().create(makeInput());
      useTriviaPresetStore.getState().remove('nonexistent-id');
      expect(useTriviaPresetStore.getState().items).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // setDefault
  // ---------------------------------------------------------------------------

  describe('setDefault', () => {
    it('makes exactly one item default', () => {
      const a = useTriviaPresetStore.getState().create(makeInput({ name: 'A', is_default: false }));
      const b = useTriviaPresetStore.getState().create(makeInput({ name: 'B', is_default: false }));
      const c = useTriviaPresetStore.getState().create(makeInput({ name: 'C', is_default: false }));

      useTriviaPresetStore.getState().setDefault(b.id);

      const items = useTriviaPresetStore.getState().items;
      const defaults = items.filter((t) => t.is_default);
      expect(defaults).toHaveLength(1);
      expect(defaults[0].id).toBe(b.id);

      const nonDefaults = items.filter((t) => !t.is_default);
      expect(nonDefaults.map((t) => t.id)).toContain(a.id);
      expect(nonDefaults.map((t) => t.id)).toContain(c.id);
    });

    it('transfers default from old item to new item', () => {
      const a = useTriviaPresetStore.getState().create(makeInput({ name: 'A', is_default: true }));
      const b = useTriviaPresetStore.getState().create(makeInput({ name: 'B', is_default: false }));

      useTriviaPresetStore.getState().setDefault(b.id);

      const items = useTriviaPresetStore.getState().items;
      expect(items.find((t) => t.id === a.id)!.is_default).toBe(false);
      expect(items.find((t) => t.id === b.id)!.is_default).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getDefault
  // ---------------------------------------------------------------------------

  describe('getDefault', () => {
    it('returns undefined when no items exist', () => {
      expect(useTriviaPresetStore.getState().getDefault()).toBeUndefined();
    });

    it('returns undefined when no item is default', () => {
      useTriviaPresetStore.getState().create(makeInput({ is_default: false }));
      expect(useTriviaPresetStore.getState().getDefault()).toBeUndefined();
    });

    it('returns the default item', () => {
      const a = useTriviaPresetStore.getState().create(makeInput({ name: 'A', is_default: false }));
      const b = useTriviaPresetStore.getState().create(makeInput({ name: 'B', is_default: true }));

      const result = useTriviaPresetStore.getState().getDefault();
      expect(result).not.toBeUndefined();
      expect(result!.id).toBe(b.id);
      expect(result!.id).not.toBe(a.id);
    });
  });

  // ---------------------------------------------------------------------------
  // persistence
  // ---------------------------------------------------------------------------

  describe('persistence', () => {
    it('items survive store rehydration', () => {
      const item = useTriviaPresetStore.getState().create(makeInput({ name: 'Persisted' }));

      const stored = JSON.stringify({
        state: { items: [item] },
        version: 1,
      });
      localStorage.setItem('jb-trivia-presets', stored);

      useTriviaPresetStore.persist.rehydrate();

      const items = useTriviaPresetStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Persisted');
    });

    it('persists only the items field (partialize excludes methods)', () => {
      useTriviaPresetStore.getState().create(makeInput({ name: 'Check Partialize' }));

      const stored = localStorage.getItem('jb-trivia-presets');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
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
      const legacyStored = JSON.stringify({
        state: { items: [{ id: 'old-id', name: 'Old' }] },
        version: 0,
      });
      localStorage.setItem('jb-trivia-presets', legacyStored);

      useTriviaPresetStore.setState({ items: [] });
      useTriviaPresetStore.persist.rehydrate();

      const items = useTriviaPresetStore.getState().items;
      expect(items).toEqual([]);
    });
  });
});
