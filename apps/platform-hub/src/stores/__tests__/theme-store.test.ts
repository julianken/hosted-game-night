import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThemeStore, DEFAULT_THEME, THEME_OPTIONS } from '../theme-store';
import type { ThemeMode } from '@joolie-boolie/theme';

describe('theme-store', () => {
  beforeEach(() => {
    // Reset store to default state before each test
    const { result } = renderHook(() => useThemeStore());
    act(() => {
      result.current.setPresenterTheme(DEFAULT_THEME);
    });
  });

  describe('initialization', () => {
    it('initializes with system theme by default', () => {
      const { result } = renderHook(() => useThemeStore());
      expect(result.current.presenterTheme).toBe('system');
    });

    it('exports correct THEME_OPTIONS', () => {
      expect(THEME_OPTIONS).toEqual([
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'system', label: 'System Default' },
      ]);
    });
  });

  describe('setPresenterTheme', () => {
    it('sets theme to light', () => {
      const { result } = renderHook(() => useThemeStore());

      act(() => {
        result.current.setPresenterTheme('light');
      });

      expect(result.current.presenterTheme).toBe('light');
    });

    it('sets theme to dark', () => {
      const { result } = renderHook(() => useThemeStore());

      act(() => {
        result.current.setPresenterTheme('dark');
      });

      expect(result.current.presenterTheme).toBe('dark');
    });

    it('sets theme to system', () => {
      const { result } = renderHook(() => useThemeStore());

      // First set to light
      act(() => {
        result.current.setPresenterTheme('light');
      });

      // Then back to system
      act(() => {
        result.current.setPresenterTheme('system');
      });

      expect(result.current.presenterTheme).toBe('system');
    });

    it('updates theme across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useThemeStore());
      const { result: result2 } = renderHook(() => useThemeStore());

      act(() => {
        result1.current.setPresenterTheme('dark');
      });

      expect(result1.current.presenterTheme).toBe('dark');
      expect(result2.current.presenterTheme).toBe('dark');
    });
  });

  describe('persistence', () => {
    it('persists theme to localStorage', () => {
      const { result } = renderHook(() => useThemeStore());

      act(() => {
        result.current.setPresenterTheme('dark');
      });

      const stored = localStorage.getItem('platform-hub-theme');
      expect(stored).toBeTruthy();

      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.presenterTheme).toBe('dark');
      }
    });

    it('restores theme from localStorage on mount', () => {
      // Set theme in store
      const { result: result1 } = renderHook(() => useThemeStore());
      act(() => {
        result1.current.setPresenterTheme('light');
      });

      // Create new instance (simulates page reload)
      const { result: result2 } = renderHook(() => useThemeStore());

      // Should have persisted value
      expect(result2.current.presenterTheme).toBe('light');
    });
  });

  describe('type safety', () => {
    it('accepts valid ThemeMode values', () => {
      const { result } = renderHook(() => useThemeStore());

      const validThemes: ThemeMode[] = ['light', 'dark', 'system'];

      validThemes.forEach((theme) => {
        act(() => {
          result.current.setPresenterTheme(theme);
        });
        expect(result.current.presenterTheme).toBe(theme);
      });
    });
  });
});
