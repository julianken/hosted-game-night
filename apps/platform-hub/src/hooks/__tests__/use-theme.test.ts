import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApplyTheme, useDisplayTheme, useResolvedTheme } from '../use-theme';
import type { ThemeMode } from '@/types';

describe('use-theme', () => {
  let mockMatchMedia: ReturnType<typeof vi.fn>;
  let mediaQueryListeners: Map<string, Set<(e: MediaQueryListEvent) => void>>;

  beforeEach(() => {
    // Reset document classes
    document.documentElement.classList.remove('light', 'dark');

    // Setup mock matchMedia
    mediaQueryListeners = new Map();

    mockMatchMedia = vi.fn((query: string) => {
      const listeners = new Set<(e: MediaQueryListEvent) => void>();
      mediaQueryListeners.set(query, listeners);

      return {
        matches: false, // Default to light mode
        media: query,
        onchange: null,
        addListener: vi.fn((listener: (e: MediaQueryListEvent) => void) => {
          listeners.add(listener);
        }),
        removeListener: vi.fn((listener: (e: MediaQueryListEvent) => void) => {
          listeners.delete(listener);
        }),
        addEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            listeners.add(listener);
          }
        }),
        removeEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            listeners.delete(listener);
          }
        }),
        dispatchEvent: vi.fn(),
      };
    });

    vi.stubGlobal('matchMedia', mockMatchMedia);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.classList.remove('light', 'dark');
  });

  // Helper to trigger a system preference change
  function triggerSystemPreferenceChange(isDark: boolean) {
    const listeners = mediaQueryListeners.get('(prefers-color-scheme: dark)');
    if (listeners) {
      const event = { matches: isDark } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    }
  }

  describe('resolveTheme (tested via useResolvedTheme)', () => {
    it('returns light for explicit light mode', () => {
      const { result } = renderHook(() => useResolvedTheme('light'));
      expect(result.current).toBe('light');
    });

    it('returns dark for explicit dark mode', () => {
      const { result } = renderHook(() => useResolvedTheme('dark'));
      expect(result.current).toBe('dark');
    });

    it('returns light for system mode when OS prefers light', () => {
      // mockMatchMedia already returns { matches: false } (light mode)
      const { result } = renderHook(() => useResolvedTheme('system'));
      expect(result.current).toBe('light');
    });

    it('returns dark for system mode when OS prefers dark', () => {
      // Override to return dark preference
      mockMatchMedia.mockImplementation((query: string) => {
        const listeners = new Set<(e: MediaQueryListEvent) => void>();
        mediaQueryListeners.set(query, listeners);

        return {
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
            if (event === 'change') listeners.add(listener);
          }),
          removeEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
            if (event === 'change') listeners.delete(listener);
          }),
          dispatchEvent: vi.fn(),
        };
      });

      const { result } = renderHook(() => useResolvedTheme('system'));
      expect(result.current).toBe('dark');
    });
  });

  describe('applyThemeToDocument (tested via useApplyTheme)', () => {
    it('adds light class and removes dark class for light theme', () => {
      document.documentElement.classList.add('dark');

      renderHook(() => useApplyTheme('light'));

      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('adds dark class and removes light class for dark theme', () => {
      document.documentElement.classList.add('light');

      renderHook(() => useApplyTheme('dark'));

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    it('applies system theme based on OS preference', () => {
      renderHook(() => useApplyTheme('system'));

      // Default mock returns matches: false (light)
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('useApplyTheme', () => {
    it('applies theme on mount', () => {
      renderHook(() => useApplyTheme('dark'));

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('updates theme when mode changes', () => {
      const { rerender } = renderHook<void, { mode: ThemeMode }>(({ mode }) => useApplyTheme(mode), {
        initialProps: { mode: 'light' },
      });

      expect(document.documentElement.classList.contains('light')).toBe(true);

      rerender({ mode: 'dark' });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    it('listens to system preference changes when mode is system', () => {
      const { result } = renderHook(() => useResolvedTheme('system'));

      // Initially light (default mock)
      expect(result.current).toBe('light');

      // Trigger system preference change to dark
      act(() => {
        triggerSystemPreferenceChange(true);
      });

      expect(result.current).toBe('dark');
    });

    it('applies theme change when system preference changes', () => {
      renderHook(() => useApplyTheme('system'));

      // Initially light
      expect(document.documentElement.classList.contains('light')).toBe(true);

      // Trigger system preference change to dark
      act(() => {
        triggerSystemPreferenceChange(true);
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    it('does not listen for system changes when mode is explicit', () => {
      renderHook(() => useApplyTheme('light'));

      // Trigger system preference change to dark
      act(() => {
        triggerSystemPreferenceChange(true);
      });

      // Should still be light since we're in explicit light mode
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('cleans up listener on unmount', () => {
      const removeEventListenerMock = vi.fn();

      mockMatchMedia.mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerMock,
        dispatchEvent: vi.fn(),
      }));

      const { unmount } = renderHook(() => useApplyTheme('system'));

      unmount();

      expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('cleans up listener when switching from system to explicit mode', () => {
      const removeEventListenerMock = vi.fn();

      mockMatchMedia.mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerMock,
        dispatchEvent: vi.fn(),
      }));

      const { rerender } = renderHook<void, { mode: ThemeMode }>(({ mode }) => useApplyTheme(mode), {
        initialProps: { mode: 'system' },
      });

      // Switch to explicit mode
      rerender({ mode: 'light' });

      expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('useDisplayTheme', () => {
    it('returns displayTheme and setDisplayTheme', () => {
      const { result } = renderHook(() => useDisplayTheme());

      expect(result.current.displayTheme).toBe('system');
      expect(typeof result.current.setDisplayTheme).toBe('function');
    });

    it('updates displayTheme when setDisplayTheme is called', () => {
      const { result } = renderHook(() => useDisplayTheme());

      act(() => {
        result.current.setDisplayTheme('dark');
      });

      expect(result.current.displayTheme).toBe('dark');
    });

    it('applies theme when displayTheme changes', () => {
      const { result } = renderHook(() => useDisplayTheme());

      act(() => {
        result.current.setDisplayTheme('dark');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('useResolvedTheme', () => {
    it('returns resolved theme value', () => {
      const { result } = renderHook(() => useResolvedTheme('dark'));
      expect(result.current).toBe('dark');
    });

    it('updates when mode changes', () => {
      const { result, rerender } = renderHook<'light' | 'dark', { mode: ThemeMode }>(({ mode }) => useResolvedTheme(mode), {
        initialProps: { mode: 'light' },
      });

      expect(result.current).toBe('light');

      rerender({ mode: 'dark' });

      expect(result.current).toBe('dark');
    });

    it('updates on system preference change when mode is system', () => {
      const { result } = renderHook(() => useResolvedTheme('system'));

      expect(result.current).toBe('light');

      act(() => {
        triggerSystemPreferenceChange(true);
      });

      expect(result.current).toBe('dark');
    });

    it('cleans up listener on unmount', () => {
      const removeEventListenerMock = vi.fn();

      mockMatchMedia.mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerMock,
        dispatchEvent: vi.fn(),
      }));

      const { unmount } = renderHook(() => useResolvedTheme('system'));

      unmount();

      expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });
});
