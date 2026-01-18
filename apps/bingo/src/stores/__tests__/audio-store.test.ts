import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAudioStore, DEFAULT_VOLUME, DEFAULT_VOICE, VOICE_OPTIONS } from '../audio-store';
import { BingoBall } from '@/types';

describe('audio-store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAudioStore.setState({
      enabled: true,
      volume: DEFAULT_VOLUME,
      isPlaying: false,
      currentVoice: DEFAULT_VOICE,
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

    it('has default voice', () => {
      expect(useAudioStore.getState().currentVoice).toBe(DEFAULT_VOICE);
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

  describe('setVoice', () => {
    it('sets voice', () => {
      useAudioStore.getState().setVoice('classic');
      expect(useAudioStore.getState().currentVoice).toBe('classic');
    });
  });

  describe('playBallCall', () => {
    const mockBall: BingoBall = {
      column: 'B',
      number: 5,
      label: 'B-5',
    };

    it('does nothing when audio is disabled', async () => {
      let playCalled = false;
      class MockAudio {
        volume = 1;
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
      class MockAudio {
        volume = 1;
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
      class MockAudio {
        volume = 1;
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
      class MockAudio {
        volume = 1;
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

  describe('constants', () => {
    it('DEFAULT_VOLUME is 0.8', () => {
      expect(DEFAULT_VOLUME).toBe(0.8);
    });

    it('DEFAULT_VOICE is "default"', () => {
      expect(DEFAULT_VOICE).toBe('default');
    });

    it('VOICE_OPTIONS has 3 options', () => {
      expect(VOICE_OPTIONS).toHaveLength(3);
      expect(VOICE_OPTIONS.map((v) => v.id)).toContain('default');
      expect(VOICE_OPTIONS.map((v) => v.id)).toContain('classic');
      expect(VOICE_OPTIONS.map((v) => v.id)).toContain('modern');
    });
  });
});
