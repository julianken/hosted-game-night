import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TriviaQuestion } from '../types/trivia-question';

// =============================================================================
// TYPES
// =============================================================================

export interface TriviaQuestionSetItem {
  id: string; // crypto.randomUUID()
  name: string;
  description: string | null;
  questions: TriviaQuestion[];
  is_default: boolean;
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

export interface TriviaQuestionSetStore {
  items: TriviaQuestionSetItem[];
  create(
    input: Omit<TriviaQuestionSetItem, 'id' | 'created_at' | 'updated_at'>
  ): TriviaQuestionSetItem;
  update(
    id: string,
    patch: Partial<Omit<TriviaQuestionSetItem, 'id' | 'created_at'>>
  ): void;
  remove(id: string): void;
  setDefault(id: string): void;
  getDefault(): TriviaQuestionSetItem | undefined;
  getCategories(id: string): string[];
}

// =============================================================================
// STORE
// =============================================================================

export const useTriviaQuestionSetStore = create<TriviaQuestionSetStore>()(
  persist(
    (set, get) => ({
      items: [],

      create: (input) => {
        const now = new Date().toISOString();
        const item: TriviaQuestionSetItem = {
          ...input,
          id: crypto.randomUUID(),
          created_at: now,
          updated_at: now,
        };
        set((state) => ({ items: [...state.items, item] }));
        return item;
      },

      update: (id, patch) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...patch,
                  id: item.id,
                  created_at: item.created_at,
                  updated_at: new Date().toISOString(),
                }
              : item
          ),
        }));
      },

      remove: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      setDefault: (id) => {
        set((state) => ({
          items: state.items.map((t) => ({
            ...t,
            is_default: t.id === id,
          })),
        }));
      },

      getDefault: () => {
        return get().items.find((item) => item.is_default);
      },

      // Derived selector — NOT stored, computed from questions
      getCategories: (id) => {
        const item = get().items.find((qs) => qs.id === id);
        if (!item) return [];
        const categories = new Set<string>();
        for (const q of item.questions) {
          if (q.category) {
            categories.add(q.category);
          }
        }
        return Array.from(categories).sort();
      },
    }),
    {
      name: 'jb-trivia-question-sets',
      version: 1,
      partialize: (state) => ({
        items: state.items,
      }),
      migrate: (persistedState: unknown, fromVersion: number) => {
        if (fromVersion === 0) {
          return { items: [] };
        }
        // Unknown version: return as-is
        return persistedState as { items: TriviaQuestionSetItem[] };
      },
    }
  )
);
