import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTriviaTemplateStore } from '../template-store';
import type { TriviaTemplateItem } from '../template-store';
import type { TriviaQuestion } from '../../types/trivia-question';

// =============================================================================
// HELPERS
// =============================================================================

const SAMPLE_QUESTION: TriviaQuestion = {
  question: 'What is 2 + 2?',
  options: ['3', '4', '5', '6'],
  correctIndex: 1,
  category: 'Math',
};

function makeInput(
  overrides: Partial<Omit<TriviaTemplateItem, 'id' | 'created_at' | 'updated_at'>> = {}
): Omit<TriviaTemplateItem, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: 'Test Template',
    questions: [SAMPLE_QUESTION],
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

describe('useTriviaTemplateStore', () => {
  beforeEach(() => {
    useTriviaTemplateStore.setState({ items: [] });
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
      const item = useTriviaTemplateStore.getState().create(makeInput());
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
        name: 'My Template',
        rounds_count: 4,
        questions_per_round: 8,
        timer_duration: 60,
      });
      const item = useTriviaTemplateStore.getState().create(input);

      expect(item.name).toBe('My Template');
      expect(item.rounds_count).toBe(4);
      expect(item.questions_per_round).toBe(8);
      expect(item.timer_duration).toBe(60);
    });

    it('adds item to items array', () => {
      useTriviaTemplateStore.getState().create(makeInput());
      expect(useTriviaTemplateStore.getState().items).toHaveLength(1);
    });

    it('stores questions on the item', () => {
      const item = useTriviaTemplateStore.getState().create(makeInput());
      expect(item.questions).toHaveLength(1);
      expect(item.questions[0].question).toBe('What is 2 + 2?');
    });

    it('each item gets a unique id', () => {
      const a = useTriviaTemplateStore.getState().create(makeInput());
      const b = useTriviaTemplateStore.getState().create(makeInput());
      expect(a.id).not.toBe(b.id);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe('update', () => {
    it('patches name and bumps updated_at', () => {
      const item = useTriviaTemplateStore.getState().create(makeInput({ name: 'Original' }));
      const originalUpdatedAt = item.updated_at;

      vi.advanceTimersByTime(100);

      useTriviaTemplateStore.getState().update(item.id, { name: 'Renamed' });

      const updated = useTriviaTemplateStore.getState().items.find((t) => t.id === item.id)!;
      expect(updated.name).toBe('Renamed');
      expect(updated.updated_at).not.toBe(originalUpdatedAt);
    });

    it('does not modify created_at', () => {
      const item = useTriviaTemplateStore.getState().create(makeInput());
      vi.advanceTimersByTime(100);

      useTriviaTemplateStore.getState().update(item.id, { name: 'Changed' });

      const updated = useTriviaTemplateStore.getState().items.find((t) => t.id === item.id)!;
      expect(updated.created_at).toBe(item.created_at);
    });

    it('does not modify id', () => {
      const item = useTriviaTemplateStore.getState().create(makeInput());
      useTriviaTemplateStore.getState().update(item.id, { name: 'Changed' });

      const updated = useTriviaTemplateStore.getState().items.find((t) => t.id === item.id)!;
      expect(updated.id).toBe(item.id);
    });

    it('can update questions', () => {
      const item = useTriviaTemplateStore.getState().create(makeInput());
      const newQuestion: TriviaQuestion = {
        question: 'Capital of France?',
        options: ['London', 'Paris', 'Berlin', 'Rome'],
        correctIndex: 1,
      };

      useTriviaTemplateStore.getState().update(item.id, { questions: [newQuestion] });

      const updated = useTriviaTemplateStore.getState().items.find((t) => t.id === item.id)!;
      expect(updated.questions).toHaveLength(1);
      expect(updated.questions[0].question).toBe('Capital of France?');
    });

    it('no-ops for unknown id', () => {
      const item = useTriviaTemplateStore.getState().create(makeInput({ name: 'Original' }));

      useTriviaTemplateStore.getState().update('nonexistent-id', { name: 'Ghost' });

      const unchanged = useTriviaTemplateStore.getState().items.find((t) => t.id === item.id)!;
      expect(unchanged.name).toBe('Original');
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------

  describe('remove', () => {
    it('deletes by id', () => {
      const item = useTriviaTemplateStore.getState().create(makeInput());
      expect(useTriviaTemplateStore.getState().items).toHaveLength(1);

      useTriviaTemplateStore.getState().remove(item.id);
      expect(useTriviaTemplateStore.getState().items).toHaveLength(0);
    });

    it('only removes the targeted item', () => {
      const a = useTriviaTemplateStore.getState().create(makeInput({ name: 'A' }));
      const b = useTriviaTemplateStore.getState().create(makeInput({ name: 'B' }));

      useTriviaTemplateStore.getState().remove(a.id);

      const remaining = useTriviaTemplateStore.getState().items;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(b.id);
    });

    it('no-ops for unknown id', () => {
      useTriviaTemplateStore.getState().create(makeInput());
      useTriviaTemplateStore.getState().remove('nonexistent-id');
      expect(useTriviaTemplateStore.getState().items).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // setDefault
  // ---------------------------------------------------------------------------

  describe('setDefault', () => {
    it('makes exactly one item default', () => {
      const a = useTriviaTemplateStore.getState().create(makeInput({ name: 'A', is_default: false }));
      const b = useTriviaTemplateStore.getState().create(makeInput({ name: 'B', is_default: false }));
      const c = useTriviaTemplateStore.getState().create(makeInput({ name: 'C', is_default: false }));

      useTriviaTemplateStore.getState().setDefault(b.id);

      const items = useTriviaTemplateStore.getState().items;
      const defaults = items.filter((t) => t.is_default);
      expect(defaults).toHaveLength(1);
      expect(defaults[0].id).toBe(b.id);

      const nonDefaults = items.filter((t) => !t.is_default);
      expect(nonDefaults.map((t) => t.id)).toContain(a.id);
      expect(nonDefaults.map((t) => t.id)).toContain(c.id);
    });

    it('transfers default from old item to new item', () => {
      const a = useTriviaTemplateStore.getState().create(makeInput({ name: 'A', is_default: true }));
      const b = useTriviaTemplateStore.getState().create(makeInput({ name: 'B', is_default: false }));

      useTriviaTemplateStore.getState().setDefault(b.id);

      const items = useTriviaTemplateStore.getState().items;
      expect(items.find((t) => t.id === a.id)!.is_default).toBe(false);
      expect(items.find((t) => t.id === b.id)!.is_default).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getDefault
  // ---------------------------------------------------------------------------

  describe('getDefault', () => {
    it('returns undefined when no items exist', () => {
      expect(useTriviaTemplateStore.getState().getDefault()).toBeUndefined();
    });

    it('returns undefined when no item is default', () => {
      useTriviaTemplateStore.getState().create(makeInput({ is_default: false }));
      expect(useTriviaTemplateStore.getState().getDefault()).toBeUndefined();
    });

    it('returns the default item', () => {
      const a = useTriviaTemplateStore.getState().create(makeInput({ name: 'A', is_default: false }));
      const b = useTriviaTemplateStore.getState().create(makeInput({ name: 'B', is_default: true }));

      const result = useTriviaTemplateStore.getState().getDefault();
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
      const item = useTriviaTemplateStore.getState().create(makeInput({ name: 'Persisted' }));

      const stored = JSON.stringify({
        state: { items: [item] },
        version: 1,
      });
      localStorage.setItem('jb-trivia-templates', stored);

      useTriviaTemplateStore.persist.rehydrate();

      const items = useTriviaTemplateStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Persisted');
    });

    it('persists only the items field (partialize excludes methods)', () => {
      useTriviaTemplateStore.getState().create(makeInput({ name: 'Check Partialize' }));

      const stored = localStorage.getItem('jb-trivia-templates');
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
      localStorage.setItem('jb-trivia-templates', legacyStored);

      useTriviaTemplateStore.setState({ items: [] });
      useTriviaTemplateStore.persist.rehydrate();

      const items = useTriviaTemplateStore.getState().items;
      expect(items).toEqual([]);
    });
  });
});
