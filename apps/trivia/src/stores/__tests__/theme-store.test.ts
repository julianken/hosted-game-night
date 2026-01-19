import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import {
  useThemeStore,
  DEFAULT_THEME,
  THEME_OPTIONS,
} from '../theme-store';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useThemeStore', () => {
  beforeEach(() => {
    // Clear localStorage and reset store before each test
    localStorageMock.clear();
    useThemeStore.setState({
      presenterTheme: DEFAULT_THEME,
      displayTheme: DEFAULT_THEME,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = useThemeStore.getState();

      expect(state.presenterTheme).toBe('system');
      expect(state.displayTheme).toBe('system');
    });

    it('should have DEFAULT_THEME as system', () => {
      expect(DEFAULT_THEME).toBe('system');
    });
  });

  describe('THEME_OPTIONS', () => {
    it('should have all theme options defined', () => {
      expect(THEME_OPTIONS).toHaveLength(3);
      expect(THEME_OPTIONS).toContainEqual({ value: 'light', label: 'Light' });
      expect(THEME_OPTIONS).toContainEqual({ value: 'dark', label: 'Dark' });
      expect(THEME_OPTIONS).toContainEqual({ value: 'system', label: 'System Default' });
    });
  });

  describe('setPresenterTheme', () => {
    it('should update presenterTheme to light', () => {
      act(() => {
        useThemeStore.getState().setPresenterTheme('light');
      });

      expect(useThemeStore.getState().presenterTheme).toBe('light');
    });

    it('should update presenterTheme to dark', () => {
      act(() => {
        useThemeStore.getState().setPresenterTheme('dark');
      });

      expect(useThemeStore.getState().presenterTheme).toBe('dark');
    });

    it('should update presenterTheme to system', () => {
      // First set to light
      act(() => {
        useThemeStore.getState().setPresenterTheme('light');
      });

      // Then set to system
      act(() => {
        useThemeStore.getState().setPresenterTheme('system');
      });

      expect(useThemeStore.getState().presenterTheme).toBe('system');
    });

    it('should not affect displayTheme', () => {
      act(() => {
        useThemeStore.getState().setDisplayTheme('dark');
        useThemeStore.getState().setPresenterTheme('light');
      });

      const state = useThemeStore.getState();
      expect(state.presenterTheme).toBe('light');
      expect(state.displayTheme).toBe('dark');
    });
  });

  describe('setDisplayTheme', () => {
    it('should update displayTheme to light', () => {
      act(() => {
        useThemeStore.getState().setDisplayTheme('light');
      });

      expect(useThemeStore.getState().displayTheme).toBe('light');
    });

    it('should update displayTheme to dark', () => {
      act(() => {
        useThemeStore.getState().setDisplayTheme('dark');
      });

      expect(useThemeStore.getState().displayTheme).toBe('dark');
    });

    it('should update displayTheme to system', () => {
      // First set to dark
      act(() => {
        useThemeStore.getState().setDisplayTheme('dark');
      });

      // Then set to system
      act(() => {
        useThemeStore.getState().setDisplayTheme('system');
      });

      expect(useThemeStore.getState().displayTheme).toBe('system');
    });

    it('should not affect presenterTheme', () => {
      act(() => {
        useThemeStore.getState().setPresenterTheme('dark');
        useThemeStore.getState().setDisplayTheme('light');
      });

      const state = useThemeStore.getState();
      expect(state.presenterTheme).toBe('dark');
      expect(state.displayTheme).toBe('light');
    });
  });

  describe('independent theme control', () => {
    it('should allow presenter and display to have different themes', () => {
      act(() => {
        useThemeStore.getState().setPresenterTheme('light');
        useThemeStore.getState().setDisplayTheme('dark');
      });

      const state = useThemeStore.getState();
      expect(state.presenterTheme).toBe('light');
      expect(state.displayTheme).toBe('dark');
    });

    it('should allow both themes to be the same', () => {
      act(() => {
        useThemeStore.getState().setPresenterTheme('dark');
        useThemeStore.getState().setDisplayTheme('dark');
      });

      const state = useThemeStore.getState();
      expect(state.presenterTheme).toBe('dark');
      expect(state.displayTheme).toBe('dark');
    });
  });

  describe('localStorage persistence', () => {
    it('should use beak-trivia-theme as storage key', () => {
      // Verify persist middleware is properly configured
      expect(useThemeStore.persist).toBeDefined();
      expect(useThemeStore.persist.getOptions().name).toBe('beak-trivia-theme');
    });

    it('should persist only presenterTheme and displayTheme', () => {
      const partialize = useThemeStore.persist.getOptions().partialize;
      const state = useThemeStore.getState();
      const persisted = partialize?.(state);

      expect(persisted).toEqual({
        presenterTheme: state.presenterTheme,
        displayTheme: state.displayTheme,
      });
      // Should not include actions
      expect(persisted).not.toHaveProperty('setPresenterTheme');
      expect(persisted).not.toHaveProperty('setDisplayTheme');
    });
  });

  describe('store subscription', () => {
    it('should notify subscribers when presenterTheme changes', () => {
      const listener = vi.fn();
      const unsubscribe = useThemeStore.subscribe(listener);

      act(() => {
        useThemeStore.getState().setPresenterTheme('dark');
      });

      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });

    it('should notify subscribers when displayTheme changes', () => {
      const listener = vi.fn();
      const unsubscribe = useThemeStore.subscribe(listener);

      act(() => {
        useThemeStore.getState().setDisplayTheme('dark');
      });

      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });

    it('should provide previous and current state to subscribers', () => {
      const listener = vi.fn();
      const unsubscribe = useThemeStore.subscribe(listener);

      act(() => {
        useThemeStore.getState().setPresenterTheme('dark');
      });

      const [currentState, previousState] = listener.mock.calls[0];
      expect(currentState.presenterTheme).toBe('dark');
      expect(previousState.presenterTheme).toBe('system');
      unsubscribe();
    });
  });
});
