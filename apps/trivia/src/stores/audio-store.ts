import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import {
  PooledAudio,
  getPooledAudio,
  releasePooledAudio,
  cleanupAllPools as sharedCleanupAllPools,
  pauseAllActiveAudio,
  getActiveAudioCount as sharedGetActiveAudioCount,
  stopAllSpeech,
} from '@joolie-boolie/audio';

// =============================================================================
// TYPES
// =============================================================================

export type SoundEffectType =
  | 'timer-tick' // Timer tick (last 5 seconds)
  | 'timer-expired' // Timer reached zero (buzzer)
  | 'correct-answer' // Correct answer chime
  | 'wrong-answer' // Wrong answer buzz
  | 'question-reveal' // New question reveal
  | 'round-complete' // Round finished fanfare
  | 'game-win'; // Game win celebration

export interface AudioState {
  // Master settings
  enabled: boolean;
  volume: number; // 0-1, master volume for all audio

  // TTS settings
  ttsEnabled: boolean;
  ttsVoice: string | null; // Selected voice URI, null = system default
  ttsRate: number; // Speech rate 0.5-2.0
  ttsPitch: number; // Speech pitch 0.5-2.0

  // Sound effects
  sfxEnabled: boolean;
  sfxVolume: number; // 0-1, sound effects volume

}

export interface AudioActions {
  // Master controls
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  setVolume: (volume: number) => void;

  // TTS controls
  setTtsEnabled: (enabled: boolean) => void;
  setTtsVoice: (voiceUri: string | null) => void;
  setTtsRate: (rate: number) => void;
  setTtsPitch: (pitch: number) => void;

  // SFX controls
  setSfxEnabled: (enabled: boolean) => void;
  setSfxVolume: (volume: number) => void;

  // Playback
  playSoundEffect: (effect: SoundEffectType) => Promise<void>;
  stopAllAudio: () => void;
}

export interface AudioStore extends AudioState, AudioActions {}

// =============================================================================
// DEFAULTS
// =============================================================================

export const DEFAULT_VOLUME = 0.8;
export const DEFAULT_TTS_RATE = 0.9;
export const DEFAULT_TTS_PITCH = 1.0;
export const DEFAULT_SFX_VOLUME = 0.8;

export const AUDIO_DEFAULTS: AudioState = {
  enabled: true,
  volume: DEFAULT_VOLUME,
  ttsEnabled: false, // Off by default per spec
  ttsVoice: null,
  ttsRate: DEFAULT_TTS_RATE,
  ttsPitch: DEFAULT_TTS_PITCH,
  sfxEnabled: true,
  sfxVolume: DEFAULT_SFX_VOLUME,
};

// =============================================================================
// SOUND EFFECT PATHS
// =============================================================================

export const SOUND_EFFECT_PATHS = {
  'timer-tick': '/audio/sfx/timer-tick.mp3',
  'timer-expired': '/audio/sfx/timer-expired.mp3',
  'correct-answer': '/audio/sfx/correct-answer.mp3',
  'wrong-answer': '/audio/sfx/wrong-answer.mp3',
  'question-reveal': '/audio/sfx/question-reveal.mp3',
  'round-complete': '/audio/sfx/round-complete.mp3',
  'game-win': '/audio/sfx/game-win.mp3',
} as const satisfies Record<SoundEffectType, string>;

/**
 * All available sound effect types.
 */
export const ALL_SOUND_EFFECTS: SoundEffectType[] = Object.keys(
  SOUND_EFFECT_PATHS
) as SoundEffectType[];

// =============================================================================
// AUDIO POOL MANAGEMENT
// =============================================================================

const sfxPool: Map<string, PooledAudio[]> = new Map();
const SFX_POOL_SIZE = 2;

/**
 * Clean up all pooled audio elements.
 */
export function cleanupAllPools(): void {
  sharedCleanupAllPools([sfxPool]);
}

/**
 * Get count of active audio elements (for testing).
 */
export function getActiveAudioCount(): number {
  return sharedGetActiveAudioCount();
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampTtsRate(value: number): number {
  return Math.max(0.5, Math.min(2.0, value));
}

function clampTtsPitch(value: number): number {
  return Math.max(0.5, Math.min(2.0, value));
}

// =============================================================================
// STORE
// =============================================================================

export const useAudioStore = create<AudioStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...AUDIO_DEFAULTS,

      // Master controls
      setEnabled: (enabled: boolean) => {
        set({ enabled });
        if (!enabled) {
          get().stopAllAudio();
        }
      },

      toggleEnabled: () => {
        const newEnabled = !get().enabled;
        set({ enabled: newEnabled });
        if (!newEnabled) {
          get().stopAllAudio();
        }
      },

      setVolume: (volume: number) => {
        set({ volume: clampVolume(volume) });
      },

      // TTS controls
      setTtsEnabled: (ttsEnabled: boolean) => {
        set({ ttsEnabled });
        if (!ttsEnabled) {
          stopAllSpeech();
        }
      },

      setTtsVoice: (voiceUri: string | null) => {
        set({ ttsVoice: voiceUri });
      },

      setTtsRate: (rate: number) => {
        set({ ttsRate: clampTtsRate(rate) });
      },

      setTtsPitch: (pitch: number) => {
        set({ ttsPitch: clampTtsPitch(pitch) });
      },

      // SFX controls
      setSfxEnabled: (sfxEnabled: boolean) => {
        set({ sfxEnabled });
      },

      setSfxVolume: (volume: number) => {
        set({ sfxVolume: clampVolume(volume) });
      },

      // Playback
      playSoundEffect: async (effect: SoundEffectType) => {
        const { enabled, sfxEnabled, volume, sfxVolume } = get();

        if (!enabled || !sfxEnabled) {
          return;
        }

        if (typeof Audio === 'undefined') {
          return;
        }

        const soundFile = SOUND_EFFECT_PATHS[effect];
        const audio = getPooledAudio(sfxPool, soundFile, SFX_POOL_SIZE);

        if (!audio) {
          return;
        }

        // Combined volume
        audio.volume = volume * sfxVolume;

        return new Promise<void>((resolve) => {
          const cleanup = () => {
            releasePooledAudio(sfxPool, soundFile, audio);
          };

          audio.onended = () => {
            cleanup();
            resolve();
          };

          audio.onerror = () => {
            cleanup();
            console.warn(`Failed to play sound effect: ${effect}`);
            resolve();
          };

          audio.play().catch(() => {
            cleanup();
            resolve();
          });
        });
      },

      stopAllAudio: () => {
        // Stop TTS
        stopAllSpeech();

        // Stop all audio elements
        pauseAllActiveAudio();
      },
    }),
    {
      name: 'trivia-audio',
      version: 1,
      partialize: (state) => ({
        enabled: state.enabled,
        volume: state.volume,
        ttsEnabled: state.ttsEnabled,
        ttsVoice: state.ttsVoice,
        ttsRate: state.ttsRate,
        ttsPitch: state.ttsPitch,
        sfxEnabled: state.sfxEnabled,
        sfxVolume: state.sfxVolume,
      }),
    }
  )
);

// =============================================================================
// SELECTOR HOOKS
// =============================================================================

export function useAudioSettings() {
  return useAudioStore(useShallow((state) => ({
    enabled: state.enabled,
    volume: state.volume,
    ttsEnabled: state.ttsEnabled,
    ttsVoice: state.ttsVoice,
    ttsRate: state.ttsRate,
    ttsPitch: state.ttsPitch,
    sfxEnabled: state.sfxEnabled,
    sfxVolume: state.sfxVolume,
  })));
}

export function useTtsSettings() {
  return useAudioStore(useShallow((state) => ({
    enabled: state.enabled && state.ttsEnabled,
    voice: state.ttsVoice,
    rate: state.ttsRate,
    pitch: state.ttsPitch,
    volume: state.volume,
  })));
}

export function useSfxSettings() {
  return useAudioStore(useShallow((state) => ({
    enabled: state.enabled && state.sfxEnabled,
    volume: state.volume * state.sfxVolume,
  })));
}
