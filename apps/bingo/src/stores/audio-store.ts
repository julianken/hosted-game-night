import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BingoBall, VoicePackId, VoiceManifest, VoicePackMetadata, RollSoundType, RollDuration, RevealChimeType, ROLL_SOUND_OPTIONS } from '@/types';

export interface AudioStore {
  // Persisted state
  enabled: boolean;
  voiceVolume: number; // 0-1, for ball announcements and TTS
  rollSoundVolume: number; // 0-1, for roll sounds
  chimeVolume: number; // 0-1, for reveal chimes
  voicePack: VoicePackId;
  useFallbackTTS: boolean;
  rollSoundType: RollSoundType;
  rollDuration: RollDuration;
  revealChime: RevealChimeType;

  // Non-persisted state
  isPlaying: boolean;
  manifest: VoiceManifest | null;

  // Actions
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  setVoiceVolume: (volume: number) => void;
  setRollSoundVolume: (volume: number) => void;
  setChimeVolume: (volume: number) => void;
  setVoicePack: (pack: VoicePackId) => void;
  setUseFallbackTTS: (useFallback: boolean) => void;
  setRollSound: (type: RollSoundType, duration: RollDuration) => void;
  setRevealChime: (chime: RevealChimeType) => void;

  // Playback
  playBallCall: (ball: BingoBall) => Promise<void>;
  playRollSound: () => Promise<void>;
  playBallVoice: (ball: BingoBall) => Promise<void>;
  playRevealChime: () => Promise<void>;
  stopPlayback: () => void;

  // Manifest loading
  loadManifest: () => Promise<void>;

  // Resource cleanup
  cleanup: () => void;
}

export const DEFAULT_VOICE_PACK: VoicePackId = 'standard';
export const DEFAULT_VOICE_VOLUME = 0.7;
export const DEFAULT_ROLL_SOUND_VOLUME = 0.8;
export const DEFAULT_CHIME_VOLUME = 0.8;
export const DEFAULT_ROLL_SOUND_TYPE: RollSoundType = 'metal-cage';
export const DEFAULT_ROLL_DURATION: RollDuration = '2s';
export const DEFAULT_REVEAL_CHIME: RevealChimeType = 'none';

// Voice pack display options for UI
export const VOICE_PACK_OPTIONS: { id: VoicePackId; name: string; description: string }[] = [
  { id: 'standard', name: 'Standard', description: 'Clear, professional calls' },
  { id: 'standard-hall', name: 'Standard (Hall)', description: 'With hall reverb effect' },
  { id: 'british', name: 'British Slang', description: 'Traditional UK bingo calls' },
  { id: 'british-hall', name: 'British Slang (Hall)', description: 'UK calls with hall reverb' },
];

// ============================================================================
// Audio Pool Management - Prevents memory leaks by reusing audio elements
// ============================================================================

interface PooledAudio {
  element: HTMLAudioElement;
  inUse: boolean;
}

// Pool for roll sounds (frequently used)
const rollSoundPool: Map<string, PooledAudio[]> = new Map();
const ROLL_POOL_SIZE = 2;

// Pool for chime sounds (frequently used)
const chimeSoundPool: Map<string, PooledAudio[]> = new Map();
const CHIME_POOL_SIZE = 2;

// Track all active audio elements for cleanup
const activeAudioElements: Set<HTMLAudioElement> = new Set();

/**
 * Get or create a pooled audio element for a given sound file.
 * Returns null if Audio is not available (SSR).
 */
function getPooledAudio(
  pool: Map<string, PooledAudio[]>,
  soundFile: string,
  poolSize: number
): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') {
    return null;
  }

  // Get or create pool for this sound file
  if (!pool.has(soundFile)) {
    pool.set(soundFile, []);
  }

  const soundPool = pool.get(soundFile)!;

  // Find an available element in the pool
  for (const pooled of soundPool) {
    if (!pooled.inUse) {
      pooled.inUse = true;
      pooled.element.currentTime = 0;
      activeAudioElements.add(pooled.element);
      return pooled.element;
    }
  }

  // Create new element if pool isn't full
  if (soundPool.length < poolSize) {
    const element = new Audio(soundFile);
    const pooled: PooledAudio = { element, inUse: true };
    soundPool.push(pooled);
    activeAudioElements.add(element);
    return element;
  }

  // Pool is full and all in use - create a temporary element
  const tempElement = new Audio(soundFile);
  activeAudioElements.add(tempElement);
  return tempElement;
}

/**
 * Release a pooled audio element back to the pool.
 */
function releasePooledAudio(
  pool: Map<string, PooledAudio[]>,
  soundFile: string,
  element: HTMLAudioElement
): void {
  activeAudioElements.delete(element);

  const soundPool = pool.get(soundFile);
  if (soundPool) {
    const pooled = soundPool.find(p => p.element === element);
    if (pooled) {
      pooled.inUse = false;
      return;
    }
  }

  // Element wasn't from the pool (temporary) - clean it up
  cleanupAudioElement(element);
}

/**
 * Clean up an audio element to release memory.
 */
function cleanupAudioElement(audio: HTMLAudioElement): void {
  audio.pause();
  audio.onended = null;
  audio.onerror = null;
  audio.oncanplaythrough = null;
  audio.src = ''; // Release media resource
  audio.load(); // Force release of any buffered data
  activeAudioElements.delete(audio);
}

/**
 * Clean up all pooled audio elements.
 * Exported for testing purposes.
 */
export function cleanupAllPools(): void {
  // Clean up roll sound pool
  for (const [, soundPool] of rollSoundPool) {
    for (const pooled of soundPool) {
      cleanupAudioElement(pooled.element);
    }
  }
  rollSoundPool.clear();

  // Clean up chime sound pool
  for (const [, soundPool] of chimeSoundPool) {
    for (const pooled of soundPool) {
      cleanupAudioElement(pooled.element);
    }
  }
  chimeSoundPool.clear();

  // Clean up any remaining active elements
  for (const element of activeAudioElements) {
    cleanupAudioElement(element);
  }
  activeAudioElements.clear();
}

/**
 * Get the count of active audio elements (for testing).
 */
export function getActiveAudioCount(): number {
  return activeAudioElements.size;
}

/**
 * Get the audio file path for a ball based on voice pack settings.
 */
function getAudioPath(
  ball: BingoBall,
  packMetadata: VoicePackMetadata
): string | null {
  const { basePath, slangMappings } = packMetadata;

  if (slangMappings) {
    // British slang pack - look up the slang term for this number
    const slangTerm = slangMappings[String(ball.number)];
    if (!slangTerm) {
      // No slang mapping for this number, return null to trigger fallback
      return null;
    }
    return `${basePath}/${slangTerm}.mp3`;
  }

  // Standard pack - use letter + number format (e.g., B1.mp3)
  return `${basePath}/${ball.column}${ball.number}.mp3`;
}

/**
 * Play the ball rolling sound effect.
 * Selects clean or hall variant based on voice pack.
 * Uses object pooling to prevent memory leaks.
 */
async function playRollingSound(
  volume: number,
  voicePack: VoicePackId,
  rollType: RollSoundType,
  rollDuration: RollDuration
): Promise<void> {
  if (typeof Audio === 'undefined') {
    return;
  }

  // Use hall variant if voice pack has hall reverb
  const isHall = voicePack.endsWith('-hall');
  const suffix = isHall ? '-hall' : '';
  const soundFile = `/audio/sfx/${rollType}/${rollDuration}${suffix}.mp3`;

  return new Promise<void>((resolve) => {
    const audio = getPooledAudio(rollSoundPool, soundFile, ROLL_POOL_SIZE);
    if (!audio) {
      resolve();
      return;
    }
    audio.volume = volume;

    const cleanup = () => {
      releasePooledAudio(rollSoundPool, soundFile, audio);
    };

    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      console.warn('Failed to play rolling sound, continuing to voice');
      resolve();
    };

    audio.play().catch(() => {
      cleanup();
      console.warn('Failed to start rolling sound, continuing to voice');
      resolve();
    });
  });
}

/**
 * Use Web Speech API as fallback for TTS.
 */
function speakBallCall(ball: BingoBall, volume: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create utterance with ball label (e.g., "B 1" or "O 75")
    const text = `${ball.column} ${ball.number}`;
    const utterance = new SpeechSynthesisUtterance(text);

    // Configure speech
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = volume;

    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.startsWith('en') && v.name.includes('Female')) ||
      voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

export const useAudioStore = create<AudioStore>()(
  persist(
    (set, get) => ({
      // Persisted state
      enabled: true,
      voiceVolume: DEFAULT_VOICE_VOLUME,
      rollSoundVolume: DEFAULT_ROLL_SOUND_VOLUME,
      chimeVolume: DEFAULT_CHIME_VOLUME,
      voicePack: DEFAULT_VOICE_PACK,
      useFallbackTTS: true,
      rollSoundType: DEFAULT_ROLL_SOUND_TYPE,
      rollDuration: DEFAULT_ROLL_DURATION,
      revealChime: DEFAULT_REVEAL_CHIME,

      // Non-persisted state
      isPlaying: false,
      manifest: null,

      // Actions
      setEnabled: (enabled: boolean) => {
        set({ enabled });
      },

      toggleEnabled: () => {
        set((state) => ({ enabled: !state.enabled }));
      },

      setVoiceVolume: (volume: number) => {
        // Clamp volume between 0 and 1
        const clampedVolume = Math.max(0, Math.min(1, volume));
        set({ voiceVolume: clampedVolume });
      },

      setRollSoundVolume: (volume: number) => {
        // Clamp volume between 0 and 1
        const clampedVolume = Math.max(0, Math.min(1, volume));
        set({ rollSoundVolume: clampedVolume });
      },

      setChimeVolume: (volume: number) => {
        // Clamp volume between 0 and 1
        const clampedVolume = Math.max(0, Math.min(1, volume));
        set({ chimeVolume: clampedVolume });
      },

      setVoicePack: (pack: VoicePackId) => {
        set({ voicePack: pack });
      },

      setUseFallbackTTS: (useFallback: boolean) => {
        set({ useFallbackTTS: useFallback });
      },

      setRollSound: (type: RollSoundType, duration: RollDuration) => {
        set({ rollSoundType: type, rollDuration: duration });
      },

      setRevealChime: (chime: RevealChimeType) => {
        set({ revealChime: chime });
      },

      playBallCall: async (ball: BingoBall) => {
        const { enabled, voiceVolume, rollSoundVolume, voicePack, isPlaying, useFallbackTTS, manifest, rollSoundType, rollDuration } = get();

        if (!enabled || isPlaying) {
          return;
        }

        // Check if we're in a browser environment
        if (typeof window === 'undefined') {
          return;
        }

        // Set isPlaying BEFORE any async work to prevent race conditions
        set({ isPlaying: true });

        try {
          // Load manifest if needed
          if (!manifest) {
            await get().loadManifest();
          }

          const currentManifest = get().manifest;
          const packMetadata = currentManifest?.voicePacks[voicePack];

          // Play rolling sound first (non-blocking on error)
          // Uses hall variant automatically if voice pack is hall style
          try {
            await playRollingSound(rollSoundVolume, voicePack, rollSoundType, rollDuration);
          } catch (error) {
            console.warn('Rolling sound failed:', error);
          }

          // Try to play audio file (will be served from SW cache if available)
          if (packMetadata && typeof Audio !== 'undefined') {
            const audioPath = getAudioPath(ball, packMetadata);

            if (audioPath) {
              const audio = new Audio(audioPath);
              audio.volume = voiceVolume;

              await new Promise<void>((resolve) => {
                const cleanup = () => {
                  audio.onended = null;
                  audio.onerror = null;
                  audio.src = ''; // Release media resource - prevents memory leak
                };

                audio.onended = () => {
                  cleanup();
                  resolve();
                };
                audio.onerror = () => {
                  cleanup();
                  resolve();
                };
                audio.play().catch(() => {
                  cleanup();
                  resolve();
                });
              });
              return;
            }
          }

          // Fall back to Web Speech API if enabled
          if (useFallbackTTS) {
            await speakBallCall(ball, voiceVolume);
          }
        } finally {
          set({ isPlaying: false });
        }
      },

      playRollSound: async () => {
        const { enabled, rollSoundVolume, voicePack, rollSoundType, rollDuration } = get();
        if (!enabled || typeof Audio === 'undefined') return;
        await playRollingSound(rollSoundVolume, voicePack, rollSoundType, rollDuration);
      },

      playBallVoice: async (ball: BingoBall) => {
        const { enabled, voiceVolume, voicePack, useFallbackTTS, manifest } = get();
        if (!enabled) return;

        // Check if we're in a browser environment
        if (typeof window === 'undefined') return;

        // Load manifest if needed
        if (!manifest) {
          await get().loadManifest();
        }

        const currentManifest = get().manifest;
        const packMetadata = currentManifest?.voicePacks[voicePack];

        // Try to play audio file
        if (packMetadata && typeof Audio !== 'undefined') {
          const audioPath = getAudioPath(ball, packMetadata);

          if (audioPath) {
            const audio = new Audio(audioPath);
            audio.volume = voiceVolume;

            await new Promise<void>((resolve) => {
              const cleanup = () => {
                audio.onended = null;
                audio.onerror = null;
                audio.src = ''; // Release media resource - prevents memory leak
              };

              audio.onended = () => {
                cleanup();
                resolve();
              };
              audio.onerror = () => {
                cleanup();
                resolve();
              };
              audio.play().catch(() => {
                cleanup();
                resolve();
              });
            });
            return;
          }
        }

        // Fall back to Web Speech API if enabled
        if (useFallbackTTS) {
          await speakBallCall(ball, voiceVolume);
        }
      },

      playRevealChime: async () => {
        const { enabled, chimeVolume, revealChime } = get();
        if (!enabled || revealChime === 'none' || typeof Audio === 'undefined') return;

        const soundFile = `/audio/sfx/chimes/${revealChime}.mp3`;

        return new Promise<void>((resolve) => {
          const audio = getPooledAudio(chimeSoundPool, soundFile, CHIME_POOL_SIZE);
          if (!audio) {
            resolve();
            return;
          }
          audio.volume = chimeVolume;

          const cleanup = () => {
            releasePooledAudio(chimeSoundPool, soundFile, audio);
          };

          audio.onended = () => {
            cleanup();
            resolve();
          };
          audio.onerror = () => {
            cleanup();
            console.warn('Failed to play reveal chime');
            resolve();
          };

          audio.play().catch(() => {
            cleanup();
            resolve();
          });
        });
      },

      stopPlayback: () => {
        // Stop any TTS in progress
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }

        // Pause all active audio elements
        for (const element of activeAudioElements) {
          element.pause();
          element.currentTime = 0;
        }

        set({ isPlaying: false });
      },

      loadManifest: async () => {
        try {
          const response = await fetch('/audio/voices/manifest.json');
          if (!response.ok) {
            throw new Error(`Failed to load manifest: ${response.status}`);
          }
          const manifest: VoiceManifest = await response.json();
          set({ manifest });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error loading manifest';
          console.error('Failed to load voice manifest:', message);
        }
      },

      cleanup: () => {
        // Stop any ongoing playback
        get().stopPlayback();

        // Clean up all pooled audio elements and release memory
        cleanupAllPools();

        // Reset state
        set({ isPlaying: false });
      },
    }),
    {
      name: 'beak-bingo-audio',
      partialize: (state) => ({
        enabled: state.enabled,
        voiceVolume: state.voiceVolume,
        rollSoundVolume: state.rollSoundVolume,
        chimeVolume: state.chimeVolume,
        voicePack: state.voicePack,
        useFallbackTTS: state.useFallbackTTS,
        rollSoundType: state.rollSoundType,
        rollDuration: state.rollDuration,
        revealChime: state.revealChime,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Record<string, unknown>;
        const merged = { ...currentState, ...persisted } as Record<string, unknown>;

        // Migration: Convert old single volume to new dual volumes
        if (persisted.volume !== undefined && persisted.voiceVolume === undefined) {
          merged.voiceVolume = persisted.volume;
          merged.rollSoundVolume = persisted.volume;
          merged.chimeVolume = persisted.volume;
        }
        // Clean up old volume property from merged state
        delete merged.volume;

        // Migration: Convert old sfxVolume to new rollSoundVolume and chimeVolume
        if (persisted.sfxVolume !== undefined && persisted.rollSoundVolume === undefined) {
          merged.rollSoundVolume = persisted.sfxVolume;
          merged.chimeVolume = persisted.sfxVolume;
        }
        // Clean up old sfxVolume property from merged state
        delete merged.sfxVolume;

        // Validate rollDuration against valid durations for the sound type
        const rollSoundType = merged.rollSoundType as RollSoundType;
        const rollDuration = merged.rollDuration as RollDuration;
        const validDurations = ROLL_SOUND_OPTIONS[rollSoundType].durations;
        if (!validDurations.includes(rollDuration)) {
          merged.rollDuration = validDurations[0];
        }
        return merged as unknown as AudioStore;
      },
    }
  )
);
