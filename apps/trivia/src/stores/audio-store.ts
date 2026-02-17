import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

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

export const SOUND_EFFECT_PATHS: Record<SoundEffectType, string> = {
  'timer-tick': '/audio/sfx/timer-tick.mp3',
  'timer-expired': '/audio/sfx/timer-expired.mp3',
  'correct-answer': '/audio/sfx/correct-answer.mp3',
  'wrong-answer': '/audio/sfx/wrong-answer.mp3',
  'question-reveal': '/audio/sfx/question-reveal.mp3',
  'round-complete': '/audio/sfx/round-complete.mp3',
  'game-win': '/audio/sfx/game-win.mp3',
};

/**
 * All available sound effect types.
 */
export const ALL_SOUND_EFFECTS: SoundEffectType[] = Object.keys(
  SOUND_EFFECT_PATHS
) as SoundEffectType[];

// =============================================================================
// AUDIO POOL MANAGEMENT
// =============================================================================

interface PooledAudio {
  element: HTMLAudioElement;
  inUse: boolean;
}

const sfxPool: Map<string, PooledAudio[]> = new Map();
const SFX_POOL_SIZE = 2;
const activeAudioElements: Set<HTMLAudioElement> = new Set();

/**
 * Get or create a pooled audio element for a given sound file.
 */
function getPooledAudio(soundFile: string): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') {
    return null;
  }

  if (!sfxPool.has(soundFile)) {
    sfxPool.set(soundFile, []);
  }

  const soundPool = sfxPool.get(soundFile)!;

  // Find available element
  for (const pooled of soundPool) {
    if (!pooled.inUse) {
      pooled.inUse = true;
      pooled.element.currentTime = 0;
      activeAudioElements.add(pooled.element);
      return pooled.element;
    }
  }

  // Create new if pool not full
  if (soundPool.length < SFX_POOL_SIZE) {
    const element = new Audio(soundFile);
    const pooled: PooledAudio = { element, inUse: true };
    soundPool.push(pooled);
    activeAudioElements.add(element);
    return element;
  }

  // Pool full, create temporary
  const tempElement = new Audio(soundFile);
  activeAudioElements.add(tempElement);
  return tempElement;
}

/**
 * Release a pooled audio element.
 */
function releasePooledAudio(soundFile: string, element: HTMLAudioElement): void {
  activeAudioElements.delete(element);

  const soundPool = sfxPool.get(soundFile);
  if (soundPool) {
    const pooled = soundPool.find((p) => p.element === element);
    if (pooled) {
      pooled.inUse = false;
      return;
    }
  }

  // Not from pool, clean up
  cleanupAudioElement(element);
}

/**
 * Clean up an audio element.
 */
function cleanupAudioElement(audio: HTMLAudioElement): void {
  audio.pause();
  audio.onended = null;
  audio.onerror = null;
  audio.src = '';
  audio.load();
  activeAudioElements.delete(audio);
}

/**
 * Clean up all pooled audio elements.
 */
export function cleanupAllPools(): void {
  for (const [, soundPool] of sfxPool) {
    for (const pooled of soundPool) {
      cleanupAudioElement(pooled.element);
    }
  }
  sfxPool.clear();

  for (const element of activeAudioElements) {
    cleanupAudioElement(element);
  }
  activeAudioElements.clear();
}

/**
 * Get count of active audio elements (for testing).
 */
export function getActiveAudioCount(): number {
  return activeAudioElements.size;
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
        if (!ttsEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
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
        const audio = getPooledAudio(soundFile);

        if (!audio) {
          return;
        }

        // Combined volume
        audio.volume = volume * sfxVolume;

        return new Promise<void>((resolve) => {
          const cleanup = () => {
            releasePooledAudio(soundFile, audio);
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
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }

        // Stop all audio elements
        for (const element of activeAudioElements) {
          element.pause();
          element.currentTime = 0;
        }
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
