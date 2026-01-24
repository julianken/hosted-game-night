import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ThemeMode } from '@/types';

export interface ThemeStore {
  // Persisted state
  theme: ThemeMode;

  // Actions
  setTheme: (theme: ThemeMode) => void;
}

export const DEFAULT_THEME: ThemeMode = 'system';

export const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System Default' },
];

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      // Persisted state
      theme: DEFAULT_THEME,

      // Actions
      setTheme: (theme: ThemeMode) => {
        set({ theme });
      },
    }),
    {
      name: 'platform-hub-theme',
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
);
