import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTriviaQuestionSetStore } from '../question-set-store';
import type { TriviaQuestionSetItem } from '../question-set-store';
import type { TriviaQuestion } from '../../types/trivia-question';

// =============================================================================
// HELPERS
// =============================================================================

const SAMPLE_QUESTIONS: TriviaQuestion[] = [
  {
    question: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correctIndex: 1,
    category: 'Math',
  },
  {
    question: 'Capital of France?',
    options: ['London', 'Paris', 'Berlin', 'Rome'],
    correctIndex: 1,
    category: 'Geography',
  },
  {
    question: 'Who wrote Hamlet?',
    options: ['Dickens', 'Shakespeare', 'Austen', 'Twain'],
    correctIndex: 1,
    category: 'Literature',
  },
];

function makeInput(
  overrides: Partial<Omit<TriviaQuestionSetItem, 'id' | 'created_at' | 'updated_at'>> = {}
): Omit<TriviaQuestionSetItem, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: 'Test Question Set',
    description: null,
    questions: [...SAMPLE_QUESTIONS],
    is_default: false,
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('useTriviaQuestionSetStore', () => {
  beforeEach(() => {
    useTriviaQuestionSetStore.setState({ items: [] });
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
      const item = useTriviaQuestionSetStore.getState().create(makeInput());
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
        name: 'My Set',
        description: 'A general knowledge set',
      });
      const item = useTriviaQuestionSetStore.getState().create(input);

      expect(item.name).toBe('My Set');
      expect(item.description).toBe('A general knowledge set');
      expect(item.questions).toHaveLength(3);
    });

    it('accepts null description', () => {
      const item = useTriviaQuestionSetStore.getState().create(makeInput({ description: null }));
      expect(item.description).toBeNull();
    });

    it('adds item to items array', () => {
      useTriviaQuestionSetStore.getState().create(makeInput());
      expect(useTriviaQuestionSetStore.getState().items).toHaveLength(1);
    });

    it('each item gets a unique id', () => {
      const a = useTriviaQuestionSetStore.getState().create(makeInput());
      const b = useTriviaQuestionSetStore.getState().create(makeInput());
      expect(a.id).not.toBe(b.id);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe('update', () => {
    it('patches name and bumps updated_at', () => {
      const item = useTriviaQuestionSetStore.getState().create(makeInput({ name: 'Original' }));
      const originalUpdatedAt = item.updated_at;

      vi.advanceTimersByTime(100);

      useTriviaQuestionSetStore.getState().update(item.id, { name: 'Renamed' });

      const updated = useTriviaQuestionSetStore.getState().items.find((t) => t.id === item.id)!;
      expect(updated.name).toBe('Renamed');
      expect(updated.updated_at).not.toBe(originalUpdatedAt);
    });

    it('does not modify created_at', () => {
      const item = useTriviaQuestionSetStore.getState().create(makeInput());
      vi.advanceTimersByTime(100);

      useTriviaQuestionSetStore.getState().update(item.id, { name: 'Changed' });

      const updated = useTriviaQuestionSetStore.getState().items.find((t) => t.id === item.id)!;
      expect(updated.created_at).toBe(item.created_at);
    });

    it('does not modify id', () => {
      const item = useTriviaQuestionSetStore.getState().create(makeInput());
      useTriviaQuestionSetStore.getState().update(item.id, { name: 'Changed' });

      const updated = useTriviaQuestionSetStore.getState().items.find((t) => t.id === item.id)!;
      expect(updated.id).toBe(item.id);
    });

    it('can update questions', () => {
      const item = useTriviaQuestionSetStore.getState().create(makeInput());
      const newQuestion: TriviaQuestion = {
        question: 'New question?',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        category: 'Science',
      };

      useTriviaQuestionSetStore.getState().update(item.id, { questions: [newQuestion] });

      const updated = useTriviaQuestionSetStore.getState().items.find((t) => t.id === item.id)!;
      expect(updated.questions).toHaveLength(1);
      expect(updated.questions[0].category).toBe('Science');
    });

    it('can update description to null', () => {
      const item = useTriviaQuestionSetStore.getState().create(
        makeInput({ description: 'Has description' })
      );

      useTriviaQuestionSetStore.getState().update(item.id, { description: null });

      const updated = useTriviaQuestionSetStore.getState().items.find((t) => t.id === item.id)!;
      expect(updated.description).toBeNull();
    });

    it('no-ops for unknown id', () => {
      const item = useTriviaQuestionSetStore.getState().create(makeInput({ name: 'Original' }));

      useTriviaQuestionSetStore.getState().update('nonexistent-id', { name: 'Ghost' });

      const unchanged = useTriviaQuestionSetStore.getState().items.find((t) => t.id === item.id)!;
      expect(unchanged.name).toBe('Original');
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------

  describe('remove', () => {
    it('deletes by id', () => {
      const item = useTriviaQuestionSetStore.getState().create(makeInput());
      expect(useTriviaQuestionSetStore.getState().items).toHaveLength(1);

      useTriviaQuestionSetStore.getState().remove(item.id);
      expect(useTriviaQuestionSetStore.getState().items).toHaveLength(0);
    });

    it('only removes the targeted item', () => {
      const a = useTriviaQuestionSetStore.getState().create(makeInput({ name: 'A' }));
      const b = useTriviaQuestionSetStore.getState().create(makeInput({ name: 'B' }));

      useTriviaQuestionSetStore.getState().remove(a.id);

      const remaining = useTriviaQuestionSetStore.getState().items;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(b.id);
    });

    it('no-ops for unknown id', () => {
      useTriviaQuestionSetStore.getState().create(makeInput());
      useTriviaQuestionSetStore.getState().remove('nonexistent-id');
      expect(useTriviaQuestionSetStore.getState().items).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // setDefault
  // ---------------------------------------------------------------------------

  describe('setDefault', () => {
    it('makes exactly one item default', () => {
      const a = useTriviaQuestionSetStore.getState().create(makeInput({ name: 'A', is_default: false }));
      const b = useTriviaQuestionSetStore.getState().create(makeInput({ name: 'B', is_default: false }));
      const c = useTriviaQuestionSetStore.getState().create(makeInput({ name: 'C', is_default: false }));

      useTriviaQuestionSetStore.getState().setDefault(b.id);

      const items = useTriviaQuestionSetStore.getState().items;
      const defaults = items.filter((t) => t.is_default);
      expect(defaults).toHaveLength(1);
      expect(defaults[0].id).toBe(b.id);

      const nonDefaults = items.filter((t) => !t.is_default);
      expect(nonDefaults.map((t) => t.id)).toContain(a.id);
      expect(nonDefaults.map((t) => t.id)).toContain(c.id);
    });

    it('transfers default from old item to new item', () => {
      const a = useTriviaQuestionSetStore.getState().create(makeInput({ name: 'A', is_default: true }));
      const b = useTriviaQuestionSetStore.getState().create(makeInput({ name: 'B', is_default: false }));

      useTriviaQuestionSetStore.getState().setDefault(b.id);

      const items = useTriviaQuestionSetStore.getState().items;
      expect(items.find((t) => t.id === a.id)!.is_default).toBe(false);
      expect(items.find((t) => t.id === b.id)!.is_default).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getDefault
  // ---------------------------------------------------------------------------

  describe('getDefault', () => {
    it('returns undefined when no items exist', () => {
      expect(useTriviaQuestionSetStore.getState().getDefault()).toBeUndefined();
    });

    it('returns undefined when no item is default', () => {
      useTriviaQuestionSetStore.getState().create(makeInput({ is_default: false }));
      expect(useTriviaQuestionSetStore.getState().getDefault()).toBeUndefined();
    });

    it('returns the default item', () => {
      const a = useTriviaQuestionSetStore.getState().create(makeInput({ name: 'A', is_default: false }));
      const b = useTriviaQuestionSetStore.getState().create(makeInput({ name: 'B', is_default: true }));

      const result = useTriviaQuestionSetStore.getState().getDefault();
      expect(result).not.toBeUndefined();
      expect(result!.id).toBe(b.id);
      expect(result!.id).not.toBe(a.id);
    });
  });

  // ---------------------------------------------------------------------------
  // getCategories (derived selector)
  // ---------------------------------------------------------------------------

  describe('getCategories', () => {
    it('returns empty array for unknown id', () => {
      const categories = useTriviaQuestionSetStore.getState().getCategories('nonexistent-id');
      expect(categories).toEqual([]);
    });

    it('returns sorted unique categories from questions', () => {
      const item = useTriviaQuestionSetStore.getState().create(makeInput());
      const categories = useTriviaQuestionSetStore.getState().getCategories(item.id);
      expect(categories).toEqual(['Geography', 'Literature', 'Math']);
    });

    it('deduplicates repeated categories', () => {
      const questions: TriviaQuestion[] = [
        { question: 'Q1', options: ['A', 'B'], correctIndex: 0, category: 'Science' },
        { question: 'Q2', options: ['A', 'B'], correctIndex: 0, category: 'Science' },
        { question: 'Q3', options: ['A', 'B'], correctIndex: 0, category: 'Math' },
      ];
      const item = useTriviaQuestionSetStore.getState().create(
        makeInput({ questions })
      );
      const categories = useTriviaQuestionSetStore.getState().getCategories(item.id);
      expect(categories).toEqual(['Math', 'Science']);
    });

    it('skips questions without a category', () => {
      const questions: TriviaQuestion[] = [
        { question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
        { question: 'Q2', options: ['A', 'B'], correctIndex: 0, category: 'History' },
      ];
      const item = useTriviaQuestionSetStore.getState().create(
        makeInput({ questions })
      );
      const categories = useTriviaQuestionSetStore.getState().getCategories(item.id);
      expect(categories).toEqual(['History']);
    });

    it('returns empty array when all questions lack a category', () => {
      const questions: TriviaQuestion[] = [
        { question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
        { question: 'Q2', options: ['A', 'B'], correctIndex: 0 },
      ];
      const item = useTriviaQuestionSetStore.getState().create(
        makeInput({ questions })
      );
      const categories = useTriviaQuestionSetStore.getState().getCategories(item.id);
      expect(categories).toEqual([]);
    });

    it('reflects updated questions after update()', () => {
      const item = useTriviaQuestionSetStore.getState().create(makeInput());
      const newQuestions: TriviaQuestion[] = [
        { question: 'Q', options: ['A', 'B'], correctIndex: 0, category: 'Science' },
      ];

      useTriviaQuestionSetStore.getState().update(item.id, { questions: newQuestions });

      const categories = useTriviaQuestionSetStore.getState().getCategories(item.id);
      expect(categories).toEqual(['Science']);
    });
  });

  // ---------------------------------------------------------------------------
  // persistence
  // ---------------------------------------------------------------------------

  describe('persistence', () => {
    it('items survive store rehydration', () => {
      const item = useTriviaQuestionSetStore.getState().create(makeInput({ name: 'Persisted' }));

      const stored = JSON.stringify({
        state: { items: [item] },
        version: 1,
      });
      localStorage.setItem('jb-trivia-question-sets', stored);

      useTriviaQuestionSetStore.persist.rehydrate();

      const items = useTriviaQuestionSetStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Persisted');
    });

    it('persists only the items field (partialize excludes methods)', () => {
      useTriviaQuestionSetStore.getState().create(makeInput({ name: 'Check Partialize' }));

      const stored = localStorage.getItem('jb-trivia-question-sets');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.items).toBeDefined();
      expect(parsed.state.create).toBeUndefined();
      expect(parsed.state.update).toBeUndefined();
      expect(parsed.state.remove).toBeUndefined();
      expect(parsed.state.setDefault).toBeUndefined();
      expect(parsed.state.getDefault).toBeUndefined();
      expect(parsed.state.getCategories).toBeUndefined();
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
      localStorage.setItem('jb-trivia-question-sets', legacyStored);

      useTriviaQuestionSetStore.setState({ items: [] });
      useTriviaQuestionSetStore.persist.rehydrate();

      const items = useTriviaQuestionSetStore.getState().items;
      expect(items).toEqual([]);
    });
  });
});
