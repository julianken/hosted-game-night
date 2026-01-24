'use client';

import { useEffect, useState, useCallback } from 'react';
import { ThemeMode } from '@/types';

/**
 * Resolves a theme mode to an actual theme (light or dark).
 * When mode is 'system', checks the OS preference.
 */
function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return mode;
}

/**
 * Applies a theme to the document by adding/removing the 'dark' and 'light' classes.
 */
function applyThemeToDocument(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

/**
 * Hook that applies a theme mode to the document.
 * Handles 'system' mode by listening to OS preference changes.
 */
export function useApplyTheme(mode: ThemeMode): void {
  useEffect(() => {
    // Apply initial theme
    const resolvedTheme = resolveTheme(mode);
    applyThemeToDocument(resolvedTheme);

    // If mode is 'system', listen for OS preference changes
    if (mode === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = (e: MediaQueryListEvent) => {
        applyThemeToDocument(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [mode]);
}

/**
 * Hook for managing display theme from the audience window.
 * Listens for theme changes via callback and applies them.
 */
export function useDisplayTheme(): {
  displayTheme: ThemeMode;
  setDisplayTheme: (theme: ThemeMode) => void;
} {
  const [displayTheme, setDisplayTheme] = useState<ThemeMode>('system');

  // Apply the theme whenever it changes
  useApplyTheme(displayTheme);

  const handleSetDisplayTheme = useCallback((theme: ThemeMode) => {
    setDisplayTheme(theme);
  }, []);

  return {
    displayTheme,
    setDisplayTheme: handleSetDisplayTheme,
  };
}

/**
 * Hook for resolving a theme mode to its actual value.
 * Useful for UI that needs to show the current effective theme.
 */
export function useResolvedTheme(mode: ThemeMode): 'light' | 'dark' {
  // Compute initial resolved theme, re-run when mode changes
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(mode));

  // Update resolved theme when mode changes
  // This effect synchronizes React state with external system (OS theme preference)
  // which is a valid use case per React docs
  useEffect(() => {
    const newResolved = resolveTheme(mode);
    setResolved(newResolved);
  }, [mode]);

  // Subscribe to media query changes for system mode only
  useEffect(() => {
    if (mode !== 'system' || typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setResolved(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

  return resolved;
}
