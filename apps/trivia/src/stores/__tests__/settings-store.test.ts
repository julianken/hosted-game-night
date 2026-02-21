import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import {
  useSettingsStore,
  SETTINGS_DEFAULTS,
  SETTINGS_RANGES,
} from '../settings-store';

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

describe('useSettingsStore', () => {
  beforeEach(() => {
    // Clear localStorage and reset store before each test
    localStorageMock.clear();
    useSettingsStore.setState(SETTINGS_DEFAULTS);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = useSettingsStore.getState();

      expect(state.roundsCount).toBe(3);
      expect(state.questionsPerRound).toBe(5);
      expect(state.timerDuration).toBe(30);
      expect(state.timerAutoStart).toBe(true);
      expect(state.timerVisible).toBe(true);
      expect(state.timerAutoReveal).toBe(true);
      expect(state.ttsEnabled).toBe(false);
      expect(state.lastTeamSetup).toBeNull();
    });
  });

  describe('updateSetting', () => {
    it('should update roundsCount', () => {
      act(() => {
        useSettingsStore.getState().updateSetting('roundsCount', 5);
      });

      expect(useSettingsStore.getState().roundsCount).toBe(5);
    });

    it('should update questionsPerRound', () => {
      act(() => {
        useSettingsStore.getState().updateSetting('questionsPerRound', 8);
      });

      expect(useSettingsStore.getState().questionsPerRound).toBe(8);
    });

    it('should update timerDuration', () => {
      act(() => {
        useSettingsStore.getState().updateSetting('timerDuration', 60);
      });

      expect(useSettingsStore.getState().timerDuration).toBe(60);
    });

    it('should update boolean settings', () => {
      act(() => {
        useSettingsStore.getState().updateSetting('timerAutoStart', false);
        useSettingsStore.getState().updateSetting('timerVisible', false);
        useSettingsStore.getState().updateSetting('ttsEnabled', true);
      });

      const state = useSettingsStore.getState();
      expect(state.timerAutoStart).toBe(false);
      expect(state.timerVisible).toBe(false);
      expect(state.ttsEnabled).toBe(true);
    });

    it('should update timerAutoReveal', () => {
      act(() => {
        useSettingsStore.getState().updateSetting('timerAutoReveal', false);
      });

      expect(useSettingsStore.getState().timerAutoReveal).toBe(false);
    });

    describe('validation', () => {
      it('should clamp roundsCount to minimum', () => {
        act(() => {
          useSettingsStore.getState().updateSetting('roundsCount', 0);
        });

        expect(useSettingsStore.getState().roundsCount).toBe(SETTINGS_RANGES.roundsCount.min);
      });

      it('should clamp roundsCount to maximum', () => {
        act(() => {
          useSettingsStore.getState().updateSetting('roundsCount', 10);
        });

        expect(useSettingsStore.getState().roundsCount).toBe(SETTINGS_RANGES.roundsCount.max);
      });

      it('should clamp questionsPerRound to minimum', () => {
        act(() => {
          useSettingsStore.getState().updateSetting('questionsPerRound', 1);
        });

        expect(useSettingsStore.getState().questionsPerRound).toBe(SETTINGS_RANGES.questionsPerRound.min);
      });

      it('should clamp questionsPerRound to maximum', () => {
        act(() => {
          useSettingsStore.getState().updateSetting('questionsPerRound', 20);
        });

        expect(useSettingsStore.getState().questionsPerRound).toBe(SETTINGS_RANGES.questionsPerRound.max);
      });

      it('should clamp timerDuration to minimum', () => {
        act(() => {
          useSettingsStore.getState().updateSetting('timerDuration', 5);
        });

        expect(useSettingsStore.getState().timerDuration).toBe(SETTINGS_RANGES.timerDuration.min);
      });

      it('should clamp timerDuration to maximum', () => {
        act(() => {
          useSettingsStore.getState().updateSetting('timerDuration', 200);
        });

        expect(useSettingsStore.getState().timerDuration).toBe(SETTINGS_RANGES.timerDuration.max);
      });
    });
  });

  describe('resetToDefaults', () => {
    it('should reset all settings to defaults', () => {
      // First change some settings
      act(() => {
        useSettingsStore.getState().updateSetting('roundsCount', 5);
        useSettingsStore.getState().updateSetting('questionsPerRound', 8);
        useSettingsStore.getState().updateSetting('timerDuration', 60);
        useSettingsStore.getState().updateSetting('timerAutoStart', false);
        useSettingsStore.getState().updateSetting('ttsEnabled', true);
      });

      // Then reset
      act(() => {
        useSettingsStore.getState().resetToDefaults();
      });

      const state = useSettingsStore.getState();
      expect(state.roundsCount).toBe(SETTINGS_DEFAULTS.roundsCount);
      expect(state.questionsPerRound).toBe(SETTINGS_DEFAULTS.questionsPerRound);
      expect(state.timerDuration).toBe(SETTINGS_DEFAULTS.timerDuration);
      expect(state.timerAutoStart).toBe(SETTINGS_DEFAULTS.timerAutoStart);
      expect(state.ttsEnabled).toBe(SETTINGS_DEFAULTS.ttsEnabled);
    });
  });

  describe('saveTeamSetup', () => {
    it('should save team names and count', () => {
      const teams = [
        { name: 'Team A' },
        { name: 'Team B' },
        { name: 'Team C' },
      ];

      act(() => {
        useSettingsStore.getState().saveTeamSetup(teams);
      });

      const state = useSettingsStore.getState();
      expect(state.lastTeamSetup).toEqual({
        names: ['Team A', 'Team B', 'Team C'],
        count: 3,
      });
    });

    it('should handle empty teams array', () => {
      act(() => {
        useSettingsStore.getState().saveTeamSetup([]);
      });

      const state = useSettingsStore.getState();
      expect(state.lastTeamSetup).toEqual({
        names: [],
        count: 0,
      });
    });
  });

  describe('loadTeamSetup', () => {
    it('should return saved team setup', () => {
      act(() => {
        useSettingsStore.getState().saveTeamSetup([
          { name: 'Saved Team 1' },
          { name: 'Saved Team 2' },
        ]);
      });

      const teamSetup = useSettingsStore.getState().loadTeamSetup();
      expect(teamSetup).toEqual({
        names: ['Saved Team 1', 'Saved Team 2'],
        count: 2,
      });
    });

    it('should return null if no team setup saved', () => {
      const teamSetup = useSettingsStore.getState().loadTeamSetup();
      expect(teamSetup).toBeNull();
    });
  });

  describe('partialize', () => {
    it('should include timerAutoReveal in the partialize output', () => {
      const partialize = useSettingsStore.persist.getOptions().partialize;
      if (!partialize) throw new Error('partialize not configured');

      const fullState = useSettingsStore.getState();
      const persisted = partialize(fullState);

      expect(persisted).toHaveProperty('timerAutoReveal');
    });

    it('should persist timerAutoReveal: false so the setting survives page reload', () => {
      act(() => {
        useSettingsStore.getState().updateSetting('timerAutoReveal', false);
      });

      const partialize = useSettingsStore.persist.getOptions().partialize;
      if (!partialize) throw new Error('partialize not configured');

      const persisted = partialize(useSettingsStore.getState());
      expect(persisted.timerAutoReveal).toBe(false);
    });

    it('should include all expected settings keys in partialize output', () => {
      const partialize = useSettingsStore.persist.getOptions().partialize;
      if (!partialize) throw new Error('partialize not configured');

      const persisted = partialize(useSettingsStore.getState());
      const expectedKeys = [
        'roundsCount',
        'questionsPerRound',
        'timerDuration',
        'timerAutoStart',
        'timerVisible',
        'timerAutoReveal',
        'ttsEnabled',
        'lastTeamSetup',
      ];

      for (const key of expectedKeys) {
        expect(persisted).toHaveProperty(key);
      }
    });
  });

  describe('localStorage persistence', () => {
    it('should use trivia-settings as storage key', async () => {
      act(() => {
        useSettingsStore.getState().updateSetting('roundsCount', 4);
      });

      // Wait for any async persistence
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check if localStorage was called - Zustand persist may batch writes
      const calls = localStorageMock.setItem.mock.calls;
      const _settingsCall = calls.find((call: [string, string]) => call[0] === 'trivia-settings');
      // The persist middleware uses 'trivia-settings' as the key
      // Just verify the store has the persist config correctly set up
      expect(useSettingsStore.persist).toBeDefined();
      expect(useSettingsStore.persist.getOptions().name).toBe('trivia-settings');
    });

    it('should have persist middleware configured', () => {
      // Verify persist middleware is properly configured
      expect(useSettingsStore.persist).toBeDefined();
      expect(useSettingsStore.persist.getOptions().name).toBe('trivia-settings');
      expect(useSettingsStore.persist.getOptions().version).toBe(3);
    });
  });

  describe('SETTINGS_RANGES', () => {
    it('should have correct ranges defined', () => {
      expect(SETTINGS_RANGES.roundsCount).toEqual({ min: 1, max: 6 });
      expect(SETTINGS_RANGES.questionsPerRound).toEqual({ min: 3, max: 10 });
      expect(SETTINGS_RANGES.timerDuration).toEqual({ min: 10, max: 120 });
    });
  });
});
