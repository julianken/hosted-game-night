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
  manifest: VoiceManifest | null;

  // Actions
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  setVolume: (volume: number) => void;
  setVoicePack: (pack: VoicePackId) => void;
  setUseFallbackTTS: (useFallback: boolean) => void;

  // Playback
  playBallCall: (ball: BingoBall) => Promise<void>;
  stopPlayback: () => void;

  // Manifest loading
  loadManifest: () => Promise<void>;
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
      manifest: null,

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
      },

      setVoicePack: (pack: VoicePackId) => {
        set({ voicePack: pack });
      },

      setUseFallbackTTS: (useFallback: boolean) => {
        set({ useFallbackTTS: useFallback });
      },

      playBallCall: async (ball: BingoBall) => {
        const { enabled, volume, voicePack, isPlaying, useFallbackTTS, manifest } = get();

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

          // Try to play audio file (will be served from SW cache if available)
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
          const message = error instanceof Error ? error.message : 'Unknown error loading manifest';
          console.error('Failed to load voice manifest:', message);
        }
      },
    }),
    {
      name: 'beak-bingo-audio',
      partialize: (state) => ({
        enabled: state.enabled,
        volume: state.volume,
        voicePack: state.voicePack,
        useFallbackTTS: state.useFallbackTTS,
      }),
    }
  )
);
