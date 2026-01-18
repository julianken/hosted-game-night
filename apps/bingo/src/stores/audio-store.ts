import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BingoBall, VoicePackId, VoiceManifest, VoicePackMetadata } from '@/types';

export interface AudioStore {
  // Persisted state
  enabled: boolean;
  volume: number; // 0-1
  voicePack: VoicePackId;
  useFallbackTTS: boolean;

  // Non-persisted state
  isPlaying: boolean;
  preloadProgress: number; // 0-100
  preloadError: string | null;
  manifest: VoiceManifest | null;

  // Non-serializable state (excluded from persistence)
  preloadedAudio: Map<string, HTMLAudioElement>;

  // Actions
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  setVolume: (volume: number) => void;
  setVoicePack: (pack: VoicePackId) => void;
  setUseFallbackTTS: (useFallback: boolean) => void;

  // Playback
  playBallCall: (ball: BingoBall) => Promise<void>;
  stopPlayback: () => void;

  // Preloading
  loadManifest: () => Promise<void>;
  preloadVoicePack: (packId: VoicePackId) => Promise<void>;
  clearPreloadedAudio: () => void;
}

export const DEFAULT_VOICE_PACK: VoicePackId = 'standard';
export const DEFAULT_VOLUME = 0.8;

// Voice pack display options for UI
export const VOICE_PACK_OPTIONS: { id: VoicePackId; name: string; description: string }[] = [
  { id: 'standard', name: 'Standard', description: 'Clear, professional calls' },
  { id: 'standard-hall', name: 'Standard (Hall)', description: 'With hall reverb effect' },
  { id: 'british', name: 'British Slang', description: 'Traditional UK bingo calls' },
  { id: 'british-hall', name: 'British Slang (Hall)', description: 'UK calls with hall reverb' },
];

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

/**
 * Properly dispose of an HTMLAudioElement to prevent memory leaks.
 * Fix #2: Memory leak prevention
 */
function disposeAudioElement(audio: HTMLAudioElement): void {
  audio.pause();
  audio.src = '';
  audio.load();
}

export const useAudioStore = create<AudioStore>()(
  persist(
    (set, get) => ({
      // Persisted state
      enabled: true,
      volume: DEFAULT_VOLUME,
      voicePack: DEFAULT_VOICE_PACK,
      useFallbackTTS: true,

      // Non-persisted state
      isPlaying: false,
      preloadProgress: 0,
      preloadError: null,
      manifest: null,

      // Non-serializable state
      preloadedAudio: new Map(),

      // Actions
      setEnabled: (enabled: boolean) => {
        set({ enabled });
      },

      toggleEnabled: () => {
        set((state) => ({ enabled: !state.enabled }));
      },

      setVolume: (volume: number) => {
        // Clamp volume between 0 and 1
        const clampedVolume = Math.max(0, Math.min(1, volume));
        set({ volume: clampedVolume });

        // Update volume on preloaded audio elements
        const { preloadedAudio } = get();
        for (const audio of preloadedAudio.values()) {
          audio.volume = clampedVolume;
        }
      },

      setVoicePack: (pack: VoicePackId) => {
        set({ voicePack: pack });
        // Preloading will be triggered by the React hook after state update
      },

      setUseFallbackTTS: (useFallback: boolean) => {
        set({ useFallbackTTS: useFallback });
      },

      playBallCall: async (ball: BingoBall) => {
        const { enabled, volume, voicePack, isPlaying, useFallbackTTS, manifest, preloadedAudio } =
          get();

        if (!enabled || isPlaying) {
          return;
        }

        // Check if we're in a browser environment
        if (typeof window === 'undefined') {
          return;
        }

        // Fix #4: Set isPlaying BEFORE any async work to prevent race conditions
        set({ isPlaying: true });

        try {
          // Try to play from preloaded audio first
          const packMetadata = manifest?.voicePacks[voicePack];
          const audioKey = `${voicePack}-${ball.label}`;
          const preloadedAudioElement = preloadedAudio.get(audioKey);

          if (preloadedAudioElement) {
            // Play from preloaded cache
            preloadedAudioElement.currentTime = 0;
            preloadedAudioElement.volume = volume;

            await new Promise<void>((resolve) => {
              preloadedAudioElement.onended = () => resolve();
              preloadedAudioElement.onerror = () => resolve();
              preloadedAudioElement.play().catch(() => resolve());
            });
            return;
          }

          // Not preloaded, try to load and play on-demand
          if (packMetadata && typeof Audio !== 'undefined') {
            const audioPath = getAudioPath(ball, packMetadata);

            if (audioPath) {
              const audio = new Audio(audioPath);
              audio.volume = volume;

              await new Promise<void>((resolve) => {
                audio.onended = () => resolve();
                audio.onerror = () => resolve();
                audio.play().catch(() => resolve());
              });
              return;
            }
          }

          // Fall back to Web Speech API if enabled
          if (useFallbackTTS) {
            await speakBallCall(ball, volume);
          }
        } finally {
          set({ isPlaying: false });
        }
      },

      stopPlayback: () => {
        // Stop any TTS in progress
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
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
          // Fix #5: Safe error message extraction
          const message = error instanceof Error ? error.message : 'Unknown error loading manifest';
          set({ preloadError: message });
        }
      },

      preloadVoicePack: async (packId: VoicePackId) => {
        const { manifest, volume, clearPreloadedAudio } = get();

        // Load manifest if not already loaded
        if (!manifest) {
          await get().loadManifest();
        }

        const currentManifest = get().manifest;
        if (!currentManifest) {
          set({ preloadError: 'Voice pack manifest not available' });
          return;
        }

        const packMetadata = currentManifest.voicePacks[packId];
        if (!packMetadata) {
          set({ preloadError: `Voice pack "${packId}" not found` });
          return;
        }

        // Clear existing preloaded audio (with proper cleanup)
        clearPreloadedAudio();

        set({ preloadProgress: 0, preloadError: null });

        const newPreloadedAudio = new Map<string, HTMLAudioElement>();
        const totalBalls = 75;
        let loadedCount = 0;

        // Generate all 75 ball labels
        const columns = ['B', 'I', 'N', 'G', 'O'] as const;
        const balls: BingoBall[] = [];
        for (const column of columns) {
          const start = columns.indexOf(column) * 15 + 1;
          for (let i = 0; i < 15; i++) {
            const number = start + i;
            balls.push({
              column,
              number,
              label: `${column}${number}`,
            });
          }
        }

        // Preload all audio files
        const preloadPromises = balls.map(async (ball) => {
          const audioPath = getAudioPath(ball, packMetadata);
          const audioKey = `${packId}-${ball.label}`;

          if (!audioPath) {
            // No audio path (e.g., missing slang mapping), skip
            loadedCount++;
            set({ preloadProgress: Math.round((loadedCount / totalBalls) * 100) });
            return;
          }

          try {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.volume = volume;

            await new Promise<void>((resolve, reject) => {
              audio.oncanplaythrough = () => resolve();
              audio.onerror = () => reject(new Error(`Failed to load ${audioPath}`));
              audio.src = audioPath;
            });

            newPreloadedAudio.set(audioKey, audio);
          } catch {
            // Individual file load failure - continue with others
          }

          loadedCount++;
          set({ preloadProgress: Math.round((loadedCount / totalBalls) * 100) });
        });

        try {
          await Promise.all(preloadPromises);
          set({ preloadedAudio: newPreloadedAudio, preloadProgress: 100 });
        } catch (error) {
          // Fix #5: Safe error message extraction
          const message = error instanceof Error ? error.message : 'Unknown error preloading audio';
          set({ preloadError: message });
        }
      },

      clearPreloadedAudio: () => {
        const { preloadedAudio } = get();

        // Fix #2: Properly dispose of audio elements to prevent memory leaks
        for (const audio of preloadedAudio.values()) {
          disposeAudioElement(audio);
        }

        set({ preloadedAudio: new Map(), preloadProgress: 0 });
      },
    }),
    {
      name: 'beak-bingo-audio',
      // Fix #3: Exclude non-serializable state from persistence
      partialize: (state) => ({
        enabled: state.enabled,
        volume: state.volume,
        voicePack: state.voicePack,
        useFallbackTTS: state.useFallbackTTS,
      }),
    }
  )
);
