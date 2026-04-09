import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TriviaQuestion } from '../types/trivia-question';

// =============================================================================
// TYPES
// =============================================================================

export interface TriviaTemplateItem {
  id: string; // crypto.randomUUID()
  name: string;
  questions: TriviaQuestion[];
  rounds_count: number; // 1–6
  questions_per_round: number; // 3–10
  timer_duration: number; // seconds, 10–120
  is_default: boolean;
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

export interface TriviaTemplateStore {
  items: TriviaTemplateItem[];
  create(
    input: Omit<TriviaTemplateItem, 'id' | 'created_at' | 'updated_at'>
  ): TriviaTemplateItem;
  update(
    id: string,
    patch: Partial<Omit<TriviaTemplateItem, 'id' | 'created_at'>>
  ): void;
  remove(id: string): void;
  setDefault(id: string): void;
  getDefault(): TriviaTemplateItem | undefined;
}

// =============================================================================
// STORE
// =============================================================================

export const useTriviaTemplateStore = create<TriviaTemplateStore>()(
  persist(
    (set, get) => ({
      items: [],

      create: (input) => {
        const now = new Date().toISOString();
        const item: TriviaTemplateItem = {
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
    }),
    {
      name: 'jb-trivia-templates',
      version: 1,
      partialize: (state) => ({
        items: state.items,
      }),
      migrate: (persistedState: unknown, fromVersion: number) => {
        if (fromVersion === 0) {
          return { items: [] };
        }
        // Unknown version: return as-is
        return persistedState as { items: TriviaTemplateItem[] };
      },
    }
  )
);
