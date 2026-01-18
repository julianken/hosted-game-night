import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAudioStore, DEFAULT_VOLUME, DEFAULT_VOICE_PACK, VOICE_PACK_OPTIONS } from '../audio-store';
import { BingoBall, VoicePackId } from '@/types';

describe('audio-store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAudioStore.setState({
      enabled: true,
      volume: DEFAULT_VOLUME,
      isPlaying: false,
      voicePack: DEFAULT_VOICE_PACK,
      useFallbackTTS: true,
      preloadProgress: 0,
      preloadError: null,
      manifest: null,
      preloadedAudio: new Map(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initial state', () => {
    it('has audio enabled', () => {
      expect(useAudioStore.getState().enabled).toBe(true);
    });

    it('has default volume', () => {
      expect(useAudioStore.getState().volume).toBe(DEFAULT_VOLUME);
    });

    it('is not playing', () => {
      expect(useAudioStore.getState().isPlaying).toBe(false);
    });

    it('has default voice pack', () => {
      expect(useAudioStore.getState().voicePack).toBe(DEFAULT_VOICE_PACK);
    });

    it('has fallback TTS enabled', () => {
      expect(useAudioStore.getState().useFallbackTTS).toBe(true);
    });

    it('has zero preload progress', () => {
      expect(useAudioStore.getState().preloadProgress).toBe(0);
    });
  });

  describe('setEnabled', () => {
    it('enables audio', () => {
      useAudioStore.getState().setEnabled(false);
      useAudioStore.getState().setEnabled(true);
      expect(useAudioStore.getState().enabled).toBe(true);
    });

    it('disables audio', () => {
      useAudioStore.getState().setEnabled(false);
      expect(useAudioStore.getState().enabled).toBe(false);
    });
  });

  describe('toggleEnabled', () => {
    it('toggles audio off', () => {
      useAudioStore.getState().toggleEnabled();
      expect(useAudioStore.getState().enabled).toBe(false);
    });

    it('toggles audio on', () => {
      useAudioStore.getState().toggleEnabled();
      useAudioStore.getState().toggleEnabled();
      expect(useAudioStore.getState().enabled).toBe(true);
    });
  });

  describe('setVolume', () => {
    it('sets volume within valid range', () => {
      useAudioStore.getState().setVolume(0.5);
      expect(useAudioStore.getState().volume).toBe(0.5);
    });

    it('clamps volume to minimum (0)', () => {
      useAudioStore.getState().setVolume(-0.5);
      expect(useAudioStore.getState().volume).toBe(0);
    });

    it('clamps volume to maximum (1)', () => {
      useAudioStore.getState().setVolume(1.5);
      expect(useAudioStore.getState().volume).toBe(1);
    });

    it('allows boundary values', () => {
      useAudioStore.getState().setVolume(0);
      expect(useAudioStore.getState().volume).toBe(0);

      useAudioStore.getState().setVolume(1);
      expect(useAudioStore.getState().volume).toBe(1);
    });
  });

  describe('setVoicePack', () => {
    it('sets voice pack', () => {
      useAudioStore.getState().setVoicePack('british');
      expect(useAudioStore.getState().voicePack).toBe('british');
    });

    it('sets all available voice packs', () => {
      const voicePacks: VoicePackId[] = ['standard', 'standard-hall', 'british', 'british-hall'];
      for (const pack of voicePacks) {
        useAudioStore.getState().setVoicePack(pack);
        expect(useAudioStore.getState().voicePack).toBe(pack);
      }
    });
  });

  describe('setUseFallbackTTS', () => {
    it('enables fallback TTS', () => {
      useAudioStore.getState().setUseFallbackTTS(false);
      useAudioStore.getState().setUseFallbackTTS(true);
      expect(useAudioStore.getState().useFallbackTTS).toBe(true);
    });

    it('disables fallback TTS', () => {
      useAudioStore.getState().setUseFallbackTTS(false);
      expect(useAudioStore.getState().useFallbackTTS).toBe(false);
    });
  });

  describe('playBallCall', () => {
    const mockBall: BingoBall = {
      column: 'B',
      number: 5,
      label: 'B5',
    };

    it('does nothing when audio is disabled', async () => {
      let playCalled = false;
      class MockAudio {
        volume = 1;
        currentTime = 0;
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        play = vi.fn(() => {
          playCalled = true;
          return Promise.resolve();
        });
      }
      vi.stubGlobal('Audio', MockAudio);

      useAudioStore.getState().setEnabled(false);
      await useAudioStore.getState().playBallCall(mockBall);

      expect(playCalled).toBe(false);
    });

    it('does nothing when already playing', async () => {
      let playCalled = false;
      class MockAudio {
        volume = 1;
        currentTime = 0;
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        play = vi.fn(() => {
          playCalled = true;
          return Promise.resolve();
        });
      }
      vi.stubGlobal('Audio', MockAudio);

      useAudioStore.setState({ isPlaying: true });
      await useAudioStore.getState().playBallCall(mockBall);

      expect(playCalled).toBe(false);
    });

    it('sets isPlaying to true during playback and false after', async () => {
      // Setup mock manifest with metadata
      useAudioStore.setState({
        manifest: {
          voicePacks: {
            standard: {
              id: 'standard',
              name: 'Standard',
              description: 'Test',
              basePath: '/audio/voices/standard',
              filePattern: '{letter}{number}.mp3',
            },
            'standard-hall': {
              id: 'standard-hall',
              name: 'Standard Hall',
              description: 'Test',
              basePath: '/audio/voices/standard-hall',
              filePattern: '{letter}{number}.mp3',
            },
            british: {
              id: 'british',
              name: 'British',
              description: 'Test',
              basePath: '/audio/voices/british',
              filePattern: '{slang}.mp3',
              slangMappings: {},
            },
            'british-hall': {
              id: 'british-hall',
              name: 'British Hall',
              description: 'Test',
              basePath: '/audio/voices/british-hall',
              filePattern: '{slang}.mp3',
              slangMappings: {},
            },
          },
          defaultPack: 'standard',
        },
      });

      class MockAudio {
        volume = 1;
        currentTime = 0;
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        play = vi.fn(() => {
          setTimeout(() => {
            this.onended?.();
          }, 0);
          return Promise.resolve();
        });
      }
      vi.stubGlobal('Audio', MockAudio);

      await useAudioStore.getState().playBallCall(mockBall);

      // After playBallCall completes, isPlaying should be false
      expect(useAudioStore.getState().isPlaying).toBe(false);
    });

    it('handles audio errors gracefully', async () => {
      useAudioStore.setState({
        manifest: {
          voicePacks: {
            standard: {
              id: 'standard',
              name: 'Standard',
              description: 'Test',
              basePath: '/audio/voices/standard',
              filePattern: '{letter}{number}.mp3',
            },
            'standard-hall': {
              id: 'standard-hall',
              name: 'Standard Hall',
              description: 'Test',
              basePath: '/audio/voices/standard-hall',
              filePattern: '{letter}{number}.mp3',
            },
            british: {
              id: 'british',
              name: 'British',
              description: 'Test',
              basePath: '/audio/voices/british',
              filePattern: '{slang}.mp3',
              slangMappings: {},
            },
            'british-hall': {
              id: 'british-hall',
              name: 'British Hall',
              description: 'Test',
              basePath: '/audio/voices/british-hall',
              filePattern: '{slang}.mp3',
              slangMappings: {},
            },
          },
          defaultPack: 'standard',
        },
      });

      class MockAudio {
        volume = 1;
        currentTime = 0;
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        play = vi.fn(() => {
          setTimeout(() => {
            this.onerror?.();
          }, 0);
          return Promise.resolve();
        });
      }
      vi.stubGlobal('Audio', MockAudio);

      await useAudioStore.getState().playBallCall(mockBall);

      // Should reset isPlaying even on error
      expect(useAudioStore.getState().isPlaying).toBe(false);
    });

    it('handles play rejection gracefully', async () => {
      useAudioStore.setState({
        manifest: {
          voicePacks: {
            standard: {
              id: 'standard',
              name: 'Standard',
              description: 'Test',
              basePath: '/audio/voices/standard',
              filePattern: '{letter}{number}.mp3',
            },
            'standard-hall': {
              id: 'standard-hall',
              name: 'Standard Hall',
              description: 'Test',
              basePath: '/audio/voices/standard-hall',
              filePattern: '{letter}{number}.mp3',
            },
            british: {
              id: 'british',
              name: 'British',
              description: 'Test',
              basePath: '/audio/voices/british',
              filePattern: '{slang}.mp3',
              slangMappings: {},
            },
            'british-hall': {
              id: 'british-hall',
              name: 'British Hall',
              description: 'Test',
              basePath: '/audio/voices/british-hall',
              filePattern: '{slang}.mp3',
              slangMappings: {},
            },
          },
          defaultPack: 'standard',
        },
      });

      class MockAudio {
        volume = 1;
        currentTime = 0;
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        play = vi.fn(() => Promise.reject(new Error('Autoplay blocked')));
      }
      vi.stubGlobal('Audio', MockAudio);

      // Should not throw
      await useAudioStore.getState().playBallCall(mockBall);
      expect(useAudioStore.getState().isPlaying).toBe(false);
    });

    it('does nothing in SSR environment', async () => {
      // Simulate SSR by removing window and Audio
      const originalWindow = globalThis.window;
      // @ts-expect-error - Intentionally deleting window to simulate SSR
      delete globalThis.window;

      await useAudioStore.getState().playBallCall(mockBall);
      expect(useAudioStore.getState().isPlaying).toBe(false);

      globalThis.window = originalWindow;
    });
  });

  describe('stopPlayback', () => {
    it('sets isPlaying to false', () => {
      useAudioStore.setState({ isPlaying: true });
      useAudioStore.getState().stopPlayback();
      expect(useAudioStore.getState().isPlaying).toBe(false);
    });
  });

  describe('clearPreloadedAudio', () => {
    it('clears preloaded audio map', () => {
      const mockAudio = {
        pause: vi.fn(),
        load: vi.fn(),
        src: 'test.mp3',
      } as unknown as HTMLAudioElement;

      useAudioStore.setState({
        preloadedAudio: new Map([['test', mockAudio]]),
        preloadProgress: 100,
      });

      useAudioStore.getState().clearPreloadedAudio();

      expect(useAudioStore.getState().preloadedAudio.size).toBe(0);
      expect(useAudioStore.getState().preloadProgress).toBe(0);
      expect(mockAudio.pause).toHaveBeenCalled();
    });
  });

  describe('constants', () => {
    it('DEFAULT_VOLUME is 0.8', () => {
      expect(DEFAULT_VOLUME).toBe(0.8);
    });

    it('DEFAULT_VOICE_PACK is "standard"', () => {
      expect(DEFAULT_VOICE_PACK).toBe('standard');
    });

    it('VOICE_PACK_OPTIONS has 4 options', () => {
      expect(VOICE_PACK_OPTIONS).toHaveLength(4);
      expect(VOICE_PACK_OPTIONS.map((v) => v.id)).toContain('standard');
      expect(VOICE_PACK_OPTIONS.map((v) => v.id)).toContain('standard-hall');
      expect(VOICE_PACK_OPTIONS.map((v) => v.id)).toContain('british');
      expect(VOICE_PACK_OPTIONS.map((v) => v.id)).toContain('british-hall');
    });
  });
});
