import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useAudioStore,
  AUDIO_DEFAULTS,
  DEFAULT_VOLUME,
  DEFAULT_TTS_RATE,
  DEFAULT_SFX_VOLUME,
  cleanupAllPools,
  getActiveAudioCount,
  SOUND_EFFECT_PATHS,
} from '../audio-store';
import { mockAudio } from '@beak-gaming/testing';

describe('audio-store', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress expected console.warn
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Reset store
    useAudioStore.setState({
      ...AUDIO_DEFAULTS,
      isSpeaking: false,
      isPlayingSfx: false,
    });

    // Mock Audio
    mockAudio();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    vi.unstubAllGlobals();
    cleanupAllPools();
  });

  describe('initial state', () => {
    it('has audio enabled by default', () => {
      expect(useAudioStore.getState().enabled).toBe(true);
    });

    it('has TTS disabled by default', () => {
      expect(useAudioStore.getState().ttsEnabled).toBe(false);
    });

    it('has SFX enabled by default', () => {
      expect(useAudioStore.getState().sfxEnabled).toBe(true);
    });

    it('has default volume', () => {
      expect(useAudioStore.getState().volume).toBe(DEFAULT_VOLUME);
    });

    it('has default TTS rate', () => {
      expect(useAudioStore.getState().ttsRate).toBe(DEFAULT_TTS_RATE);
    });

    it('has default SFX volume', () => {
      expect(useAudioStore.getState().sfxVolume).toBe(DEFAULT_SFX_VOLUME);
    });

    it('has no voice selected by default', () => {
      expect(useAudioStore.getState().ttsVoice).toBeNull();
    });

    it('is not speaking', () => {
      expect(useAudioStore.getState().isSpeaking).toBe(false);
    });

    it('is not playing SFX', () => {
      expect(useAudioStore.getState().isPlayingSfx).toBe(false);
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

  describe('TTS settings', () => {
    it('setTtsEnabled enables TTS', () => {
      useAudioStore.getState().setTtsEnabled(true);
      expect(useAudioStore.getState().ttsEnabled).toBe(true);
    });

    it('setTtsEnabled disables TTS', () => {
      useAudioStore.getState().setTtsEnabled(true);
      useAudioStore.getState().setTtsEnabled(false);
      expect(useAudioStore.getState().ttsEnabled).toBe(false);
    });

    it('setTtsVoice sets voice URI', () => {
      useAudioStore.getState().setTtsVoice('com.apple.speech.voice.samantha');
      expect(useAudioStore.getState().ttsVoice).toBe('com.apple.speech.voice.samantha');
    });

    it('setTtsVoice can clear voice', () => {
      useAudioStore.getState().setTtsVoice('some-voice');
      useAudioStore.getState().setTtsVoice(null);
      expect(useAudioStore.getState().ttsVoice).toBeNull();
    });

    it('setTtsRate sets rate within valid range', () => {
      useAudioStore.getState().setTtsRate(1.5);
      expect(useAudioStore.getState().ttsRate).toBe(1.5);
    });

    it('setTtsRate clamps to minimum (0.5)', () => {
      useAudioStore.getState().setTtsRate(0.1);
      expect(useAudioStore.getState().ttsRate).toBe(0.5);
    });

    it('setTtsRate clamps to maximum (2.0)', () => {
      useAudioStore.getState().setTtsRate(3.0);
      expect(useAudioStore.getState().ttsRate).toBe(2.0);
    });

    it('setTtsPitch sets pitch within valid range', () => {
      useAudioStore.getState().setTtsPitch(1.2);
      expect(useAudioStore.getState().ttsPitch).toBe(1.2);
    });

    it('setTtsPitch clamps to minimum (0.5)', () => {
      useAudioStore.getState().setTtsPitch(0.1);
      expect(useAudioStore.getState().ttsPitch).toBe(0.5);
    });

    it('setTtsPitch clamps to maximum (2.0)', () => {
      useAudioStore.getState().setTtsPitch(3.0);
      expect(useAudioStore.getState().ttsPitch).toBe(2.0);
    });
  });

  describe('SFX settings', () => {
    it('setSfxEnabled enables SFX', () => {
      useAudioStore.getState().setSfxEnabled(false);
      useAudioStore.getState().setSfxEnabled(true);
      expect(useAudioStore.getState().sfxEnabled).toBe(true);
    });

    it('setSfxEnabled disables SFX', () => {
      useAudioStore.getState().setSfxEnabled(false);
      expect(useAudioStore.getState().sfxEnabled).toBe(false);
    });

    it('setSfxVolume sets volume', () => {
      useAudioStore.getState().setSfxVolume(0.6);
      expect(useAudioStore.getState().sfxVolume).toBe(0.6);
    });

    it('setSfxVolume clamps to valid range', () => {
      useAudioStore.getState().setSfxVolume(-1);
      expect(useAudioStore.getState().sfxVolume).toBe(0);

      useAudioStore.getState().setSfxVolume(2);
      expect(useAudioStore.getState().sfxVolume).toBe(1);
    });
  });

  describe('playSoundEffect', () => {
    it('does nothing when audio is disabled', async () => {
      let playCalled = false;
      class MockAudio {
        volume = 1;
        currentTime = 0;
        src = '';
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        pause = vi.fn();
        load = vi.fn();
        play = vi.fn(() => {
          playCalled = true;
          return Promise.resolve();
        });
      }
      vi.stubGlobal('Audio', MockAudio);

      useAudioStore.getState().setEnabled(false);
      await useAudioStore.getState().playSoundEffect('question-reveal');

      expect(playCalled).toBe(false);
    });

    it('does nothing when SFX is disabled', async () => {
      let playCalled = false;
      class MockAudio {
        volume = 1;
        currentTime = 0;
        src = '';
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        pause = vi.fn();
        load = vi.fn();
        play = vi.fn(() => {
          playCalled = true;
          return Promise.resolve();
        });
      }
      vi.stubGlobal('Audio', MockAudio);

      useAudioStore.getState().setSfxEnabled(false);
      await useAudioStore.getState().playSoundEffect('question-reveal');

      expect(playCalled).toBe(false);
    });

    it('plays sound effect when enabled', async () => {
      let playCalled = false;
      class MockAudio {
        volume = 1;
        currentTime = 0;
        src = '';
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        pause = vi.fn();
        load = vi.fn();
        play = vi.fn(() => {
          playCalled = true;
          setTimeout(() => this.onended?.(), 0);
          return Promise.resolve();
        });
      }
      vi.stubGlobal('Audio', MockAudio);

      await useAudioStore.getState().playSoundEffect('question-reveal');

      expect(playCalled).toBe(true);
    });

    it('handles playback errors gracefully', async () => {
      class MockAudio {
        volume = 1;
        currentTime = 0;
        src = '';
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        pause = vi.fn();
        load = vi.fn();
        play = vi.fn(() => {
          setTimeout(() => this.onerror?.(), 0);
          return Promise.resolve();
        });
      }
      vi.stubGlobal('Audio', MockAudio);

      // Should not throw - using a non-existent sound effect to test error handling
      await useAudioStore.getState().playSoundEffect('timer-warning' as unknown as import('../audio-store').SoundEffectType);
      expect(useAudioStore.getState().isPlayingSfx).toBe(false);
    });

    it('handles play rejection gracefully', async () => {
      class MockAudio {
        volume = 1;
        currentTime = 0;
        src = '';
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        pause = vi.fn();
        load = vi.fn();
        play = vi.fn(() => Promise.reject(new Error('Autoplay blocked')));
      }
      vi.stubGlobal('Audio', MockAudio);

      // Should not throw
      await useAudioStore.getState().playSoundEffect('timer-expired');
      expect(useAudioStore.getState().isPlayingSfx).toBe(false);
    });

    it('applies combined volume (master * sfx)', async () => {
      let appliedVolume = 0;
      class MockAudio {
        volume = 1;
        currentTime = 0;
        src = '';
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        pause = vi.fn();
        load = vi.fn();
        play = vi.fn(() => {
          appliedVolume = this.volume;
          setTimeout(() => this.onended?.(), 0);
          return Promise.resolve();
        });
      }
      vi.stubGlobal('Audio', MockAudio);

      useAudioStore.getState().setVolume(0.5);
      useAudioStore.getState().setSfxVolume(0.8);
      await useAudioStore.getState().playSoundEffect('round-complete');

      expect(appliedVolume).toBeCloseTo(0.4); // 0.5 * 0.8
    });
  });

  describe('stopAllAudio', () => {
    it('sets isSpeaking to false', () => {
      useAudioStore.setState({ isSpeaking: true });
      useAudioStore.getState().stopAllAudio();
      expect(useAudioStore.getState().isSpeaking).toBe(false);
    });

    it('sets isPlayingSfx to false', () => {
      useAudioStore.setState({ isPlayingSfx: true });
      useAudioStore.getState().stopAllAudio();
      expect(useAudioStore.getState().isPlayingSfx).toBe(false);
    });
  });

  describe('constants', () => {
    it('DEFAULT_VOLUME is 0.8', () => {
      expect(DEFAULT_VOLUME).toBe(0.8);
    });

    it('DEFAULT_TTS_RATE is 0.9', () => {
      expect(DEFAULT_TTS_RATE).toBe(0.9);
    });

    it('DEFAULT_SFX_VOLUME is 0.8', () => {
      expect(DEFAULT_SFX_VOLUME).toBe(0.8);
    });

    it('has all expected sound effect paths', () => {
      expect(SOUND_EFFECT_PATHS['timer-tick']).toBe('/audio/sfx/timer-tick.mp3');
      expect(SOUND_EFFECT_PATHS['timer-expired']).toBe('/audio/sfx/timer-expired.mp3');
      expect(SOUND_EFFECT_PATHS['correct-answer']).toBe('/audio/sfx/correct-answer.mp3');
      expect(SOUND_EFFECT_PATHS['wrong-answer']).toBe('/audio/sfx/wrong-answer.mp3');
      expect(SOUND_EFFECT_PATHS['question-reveal']).toBe('/audio/sfx/question-reveal.mp3');
      expect(SOUND_EFFECT_PATHS['round-complete']).toBe('/audio/sfx/round-complete.mp3');
      expect(SOUND_EFFECT_PATHS['game-win']).toBe('/audio/sfx/game-win.mp3');
    });
  });

  describe('cleanup utilities', () => {
    it('cleanupAllPools is exported and callable', () => {
      expect(typeof cleanupAllPools).toBe('function');
      cleanupAllPools();
    });

    it('getActiveAudioCount returns a number', () => {
      expect(typeof getActiveAudioCount).toBe('function');
      const count = getActiveAudioCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('cleanup reduces active audio count to zero', () => {
      cleanupAllPools();
      expect(getActiveAudioCount()).toBe(0);
    });
  });

  describe('internal state setters', () => {
    it('_setIsSpeaking updates isSpeaking', () => {
      useAudioStore.getState()._setIsSpeaking(true);
      expect(useAudioStore.getState().isSpeaking).toBe(true);

      useAudioStore.getState()._setIsSpeaking(false);
      expect(useAudioStore.getState().isSpeaking).toBe(false);
    });

    it('_setIsPlayingSfx updates isPlayingSfx', () => {
      useAudioStore.getState()._setIsPlayingSfx(true);
      expect(useAudioStore.getState().isPlayingSfx).toBe(true);

      useAudioStore.getState()._setIsPlayingSfx(false);
      expect(useAudioStore.getState().isPlayingSfx).toBe(false);
    });
  });
});
