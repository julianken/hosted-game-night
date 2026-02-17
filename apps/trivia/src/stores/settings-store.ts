import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

// =============================================================================
// TYPES
// =============================================================================

export interface TeamSetup {
  names: string[];
  count: number;
}

export interface SettingsState {
  // Game configuration
  roundsCount: number; // default 3, range 1-6
  questionsPerRound: number; // default 5, range 3-10
  timerDuration: number; // default 30, range 10-120
  timerAutoStart: boolean; // default true
  timerVisible: boolean; // default true
  timerAutoReveal: boolean; // default true - auto-reveal answer when timer reaches 0
  ttsEnabled: boolean; // default false

  // Team persistence
  lastTeamSetup: TeamSetup | null;
}

export interface SettingsActions {
  updateSetting: <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => void;
  resetToDefaults: () => void;
  saveTeamSetup: (teams: { name: string }[]) => void;
  loadTeamSetup: () => TeamSetup | null;
}

export interface SettingsStore extends SettingsState, SettingsActions {}

// =============================================================================
// DEFAULTS
// =============================================================================

export const SETTINGS_DEFAULTS: SettingsState = {
  roundsCount: 3,
  questionsPerRound: 5,
  timerDuration: 30,
  timerAutoStart: true,
  timerVisible: true,
  timerAutoReveal: true,
  ttsEnabled: false,
  lastTeamSetup: null,
};

// =============================================================================
// VALIDATION
// =============================================================================

export const SETTINGS_RANGES = {
  roundsCount: { min: 1, max: 6 },
  questionsPerRound: { min: 3, max: 10 },
  timerDuration: { min: 10, max: 120 },
} as const satisfies Record<string, { min: number; max: number }>;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function validateSetting<K extends keyof SettingsState>(
  key: K,
  value: SettingsState[K]
): SettingsState[K] {
  if (key in SETTINGS_RANGES) {
    const range = SETTINGS_RANGES[key as keyof typeof SETTINGS_RANGES];
    return clamp(value as number, range.min, range.max) as SettingsState[K];
  }
  return value;
}

// =============================================================================
// STORE
// =============================================================================

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...SETTINGS_DEFAULTS,

      // Actions
      updateSetting: <K extends keyof SettingsState>(
        key: K,
        value: SettingsState[K]
      ) => {
        const validatedValue = validateSetting(key, value);
        set({ [key]: validatedValue } as Partial<SettingsState>);
      },

      resetToDefaults: () => {
        set(SETTINGS_DEFAULTS);
      },

      saveTeamSetup: (teams: { name: string }[]) => {
        const teamSetup: TeamSetup = {
          names: teams.map((t) => t.name),
          count: teams.length,
        };
        set({ lastTeamSetup: teamSetup });
      },

      loadTeamSetup: () => {
        return get().lastTeamSetup;
      },
    }),
    {
      name: 'trivia-settings',
      version: 1,
      // Only persist certain fields, excluding methods
      partialize: (state) => ({
        roundsCount: state.roundsCount,
        questionsPerRound: state.questionsPerRound,
        timerDuration: state.timerDuration,
        timerAutoStart: state.timerAutoStart,
        timerVisible: state.timerVisible,
        timerAutoReveal: state.timerAutoReveal,
        ttsEnabled: state.ttsEnabled,
        lastTeamSetup: state.lastTeamSetup,
      }),
    }
  )
);

// =============================================================================
// SELECTOR HOOKS
// =============================================================================

export function useSettings() {
  return useSettingsStore(useShallow((state) => ({
    roundsCount: state.roundsCount,
    questionsPerRound: state.questionsPerRound,
    timerDuration: state.timerDuration,
    timerAutoStart: state.timerAutoStart,
    timerVisible: state.timerVisible,
    ttsEnabled: state.ttsEnabled,
  })));
}

export function useGameSettings() {
  return useSettingsStore(useShallow((state) => ({
    roundsCount: state.roundsCount,
    questionsPerRound: state.questionsPerRound,
  })));
}

export function useTimerSettings() {
  return useSettingsStore(useShallow((state) => ({
    timerDuration: state.timerDuration,
    timerAutoStart: state.timerAutoStart,
    timerVisible: state.timerVisible,
  })));
}
