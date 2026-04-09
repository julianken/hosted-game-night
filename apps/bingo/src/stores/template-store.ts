import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================================
// TYPES
// =============================================================================

export interface BingoTemplateItem {
  id: string; // crypto.randomUUID()
  name: string;
  pattern_id: string;
  voice_pack: string;
  auto_call_enabled: boolean;
  auto_call_interval: number; // milliseconds, clamped 5000–30000
  is_default: boolean;
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

export interface BingoTemplateStore {
  items: BingoTemplateItem[];
  create(
    input: Omit<BingoTemplateItem, 'id' | 'created_at' | 'updated_at'>
  ): BingoTemplateItem;
  update(
    id: string,
    patch: Partial<Omit<BingoTemplateItem, 'id' | 'created_at'>>
  ): void;
  remove(id: string): void;
  setDefault(id: string): void;
  getDefault(): BingoTemplateItem | undefined;
}

// =============================================================================
// VALIDATION
// =============================================================================

const AUTO_CALL_INTERVAL_MIN = 5000;
const AUTO_CALL_INTERVAL_MAX = 30000;

function clampAutoCallInterval(value: number): number {
  return Math.max(AUTO_CALL_INTERVAL_MIN, Math.min(AUTO_CALL_INTERVAL_MAX, value));
}

// =============================================================================
// STORE
// =============================================================================

export const useBingoTemplateStore = create<BingoTemplateStore>()(
  persist(
    (set, get) => ({
      items: [],

      create: (input) => {
        const now = new Date().toISOString();
        const item: BingoTemplateItem = {
          ...input,
          id: crypto.randomUUID(),
          auto_call_interval: clampAutoCallInterval(input.auto_call_interval),
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
                  auto_call_interval:
                    patch.auto_call_interval !== undefined
                      ? clampAutoCallInterval(patch.auto_call_interval)
                      : item.auto_call_interval,
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
      name: 'jb-bingo-templates',
      version: 1,
      partialize: (state) => ({
        items: state.items,
      }),
      migrate: (persistedState: unknown, fromVersion: number) => {
        if (fromVersion === 0) {
          return { items: [] };
        }
        // Unknown version: return as-is
        return persistedState as { items: BingoTemplateItem[] };
      },
    }
  )
);
