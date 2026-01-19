import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ThemeMode } from '@/types';

export interface ThemeStore {
  // Persisted state
  presenterTheme: ThemeMode;
  displayTheme: ThemeMode;

  // Actions
  setPresenterTheme: (theme: ThemeMode) => void;
  setDisplayTheme: (theme: ThemeMode) => void;
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
      presenterTheme: DEFAULT_THEME,
      displayTheme: DEFAULT_THEME,

      // Actions
      setPresenterTheme: (theme: ThemeMode) => {
        set({ presenterTheme: theme });
      },

      setDisplayTheme: (theme: ThemeMode) => {
        set({ displayTheme: theme });
      },
    }),
    {
      name: 'beak-trivia-theme',
      partialize: (state) => ({
        presenterTheme: state.presenterTheme,
        displayTheme: state.displayTheme,
      }),
    }
  )
);
