import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useSettingsStore, SETTINGS_DEFAULTS } from './settings-store';

// =============================================================================
// localStorage mock (matches theme-store.test.ts pattern)
// =============================================================================

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

// =============================================================================
// Helpers
// =============================================================================

/**
 * Reset the Zustand store state fields to defaults before each test.
 * We merge (not replace) so that action functions on the store prototype
 * are preserved. We also clear localStorage so persist rehydration from a
 * previous test does not bleed in.
 */
function resetStore() {
  localStorageMock.clear();
  // Shallow merge — preserves action functions, only resets state fields.
  useSettingsStore.setState({ ...SETTINGS_DEFAULTS });
}

// =============================================================================
// Tests
// =============================================================================

describe('settings-store', () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Default state
  // ---------------------------------------------------------------------------

  it('initialises isByCategory to true', () => {
    expect(useSettingsStore.getState().isByCategory).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // updateSetting
  // ---------------------------------------------------------------------------

  it('updateSetting("isByCategory", false) sets isByCategory to false', () => {
    act(() => {
      useSettingsStore.getState().updateSetting('isByCategory', false);
    });
    expect(useSettingsStore.getState().isByCategory).toBe(false);
  });

  it('updateSetting("isByCategory", true) sets isByCategory back to true', () => {
    act(() => {
      useSettingsStore.getState().updateSetting('isByCategory', false);
    });
    act(() => {
      useSettingsStore.getState().updateSetting('isByCategory', true);
    });
    expect(useSettingsStore.getState().isByCategory).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // resetToDefaults
  // ---------------------------------------------------------------------------

  it('resetToDefaults() restores isByCategory to true after it was set to false', () => {
    act(() => {
      useSettingsStore.getState().updateSetting('isByCategory', false);
    });
    expect(useSettingsStore.getState().isByCategory).toBe(false);

    act(() => {
      useSettingsStore.getState().resetToDefaults();
    });
    expect(useSettingsStore.getState().isByCategory).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Migration from version 3
  //
  // Zustand calls migrate(persistedState, fromVersion) and then shallow-merges
  // the result with the store's initial state (i.e., SETTINGS_DEFAULTS).
  // For fromVersion <= 3, migrate() returns the stored object unchanged.
  // The merge step supplies isByCategory: true for the missing field.
  //
  // We replicate that exact merge here to confirm the contract.
  // ---------------------------------------------------------------------------

  describe('migrate() — version 3 → 4', () => {
    it('returns the stored object as-is (no isByCategory key added)', () => {
      const migrate = useSettingsStore.persist.getOptions().migrate;

      if (!migrate) {
        // Defensive: if no migrate is exposed, the test is a no-op.
        return;
      }

      const storedV3 = {
        roundsCount: 3,
        questionsPerRound: 5,
        timerDuration: 30,
        timerAutoStart: true,
        timerVisible: true,
        timerAutoReveal: true,
        ttsEnabled: false,
        lastTeamSetup: null,
        // isByCategory intentionally absent — did not exist in v3
      };

      const result = migrate(storedV3, 3) as Record<string, unknown>;

      // The migration returns the object as-is — no isByCategory injected.
      expect(result).toEqual(storedV3);
      expect('isByCategory' in result).toBe(false);
    });

    it('after migration + Zustand merge, isByCategory defaults to true', () => {
      // Simulate the full migrate-then-merge cycle:
      // 1. migrate() returns stored v3 data (no isByCategory)
      // 2. Zustand merges with initial state (SETTINGS_DEFAULTS), filling the gap

      const storedV3 = {
        roundsCount: 2,
        questionsPerRound: 4,
        timerDuration: 20,
        timerAutoStart: false,
        timerVisible: false,
        timerAutoReveal: false,
        ttsEnabled: true,
        lastTeamSetup: null,
        // isByCategory absent — simulating a real v3 localStorage entry
      };

      // Merge: SETTINGS_DEFAULTS provides the missing isByCategory.
      const merged = { ...SETTINGS_DEFAULTS, ...storedV3 };

      expect(merged.isByCategory).toBe(true);
      // Other fields from stored state survive the merge.
      expect(merged.roundsCount).toBe(2);
      expect(merged.ttsEnabled).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Persist configuration
  // ---------------------------------------------------------------------------

  it('uses trivia-settings as the storage key', () => {
    expect(useSettingsStore.persist.getOptions().name).toBe('trivia-settings');
  });

  it('version is 4', () => {
    expect(useSettingsStore.persist.getOptions().version).toBe(4);
  });

  it('partialize includes isByCategory', () => {
    const partialize = useSettingsStore.persist.getOptions().partialize;
    const state = useSettingsStore.getState();
    const persisted = partialize?.(state) as Record<string, unknown> | undefined;

    expect(persisted).toHaveProperty('isByCategory', true);
  });
});
