import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useTTS,
  getVoiceDisplayName,
  filterVoicesByLanguage,
  sortVoicesByQuality,
} from '../use-tts';
import { useAudioStore, AUDIO_DEFAULTS } from '@/stores/audio-store';

// =============================================================================
// Mock SpeechSynthesisUtterance
// =============================================================================
class MockSpeechSynthesisUtterance {
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  rate = 1;
  pitch = 1;
  volume = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;

  constructor(text: string = '') {
    this.text = text;
  }
}

// =============================================================================
// Mock SpeechSynthesis
// =============================================================================
const mockSpeak = vi.fn();
const mockCancel = vi.fn();
const mockGetVoices = vi.fn(() => []);
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

const mockSpeechSynthesis = {
  speak: mockSpeak,
  cancel: mockCancel,
  getVoices: mockGetVoices,
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener,
  speaking: false,
  pending: false,
  paused: false,
  onvoiceschanged: null,
};

// =============================================================================
// Mock Voice Factory
// =============================================================================
const createMockVoice = (overrides: Partial<SpeechSynthesisVoice> = {}): SpeechSynthesisVoice => ({
  voiceURI: 'mock-voice',
  name: 'Mock Voice',
  lang: 'en-US',
  localService: true,
  default: false,
  ...overrides,
});

// Setup global mocks once
beforeAll(() => {
  // @ts-expect-error - Mock class
  global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  Object.defineProperty(window, 'speechSynthesis', {
    value: mockSpeechSynthesis,
    writable: true,
    configurable: true,
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('useTTS', () => {
  beforeEach(() => {
    // Reset audio store
    useAudioStore.setState({
      ...AUDIO_DEFAULTS,
      enabled: true,
      ttsEnabled: true,
    });

    // Clear mock calls
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('detects TTS availability', () => {
      const { result } = renderHook(() => useTTS());
      expect(result.current.isAvailable).toBe(true);
    });

    it('initializes with isSpeaking false', () => {
      const { result } = renderHook(() => useTTS());
      expect(result.current.isSpeaking).toBe(false);
    });

    it('initializes with empty voices array', () => {
      const { result } = renderHook(() => useTTS());
      expect(result.current.voices).toEqual([]);
    });
  });

  describe('speak', () => {
    it('does nothing when TTS is disabled', () => {
      useAudioStore.setState({ ttsEnabled: false });
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('Hello');
      });

      expect(mockSpeak).not.toHaveBeenCalled();
    });

    it('does nothing when audio is disabled', () => {
      useAudioStore.setState({ enabled: false });
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('Hello');
      });

      expect(mockSpeak).not.toHaveBeenCalled();
    });

    it('cancels ongoing speech before speaking', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('Hello');
      });

      expect(mockCancel).toHaveBeenCalled();
    });

    it('calls speechSynthesis.speak with utterance', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('Hello World');
      });

      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toBe('Hello World');
    });

    it('applies TTS rate from store', () => {
      useAudioStore.setState({ ttsRate: 1.5 });
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('Test');
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.rate).toBe(1.5);
    });

    it('applies TTS pitch from store', () => {
      useAudioStore.setState({ ttsPitch: 1.2 });
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('Test');
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.pitch).toBe(1.2);
    });

    it('applies volume from store', () => {
      useAudioStore.setState({ volume: 0.7 });
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('Test');
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.volume).toBe(0.7);
    });

    it('allows option overrides', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('Test', { rate: 2.0, pitch: 0.8, volume: 0.5 });
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.rate).toBe(2.0);
      expect(utterance.pitch).toBe(0.8);
      expect(utterance.volume).toBe(0.5);
    });
  });

  describe('stop', () => {
    it('calls speechSynthesis.cancel', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.stop();
      });

      expect(mockCancel).toHaveBeenCalled();
    });

    it('sets isSpeaking to false', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.stop();
      });

      expect(result.current.isSpeaking).toBe(false);
    });
  });

  describe('announceQuestion', () => {
    it('speaks question text', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.announceQuestion('What is the capital of France?');
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toBe('What is the capital of France?');
    });

    it('includes options when provided', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.announceQuestion('What is 2+2?', ['3', '4', '5', '6']);
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toContain('A: 3');
      expect(utterance.text).toContain('B: 4');
      expect(utterance.text).toContain('C: 5');
      expect(utterance.text).toContain('D: 6');
    });
  });

  describe('announceAnswer', () => {
    it('announces correct answer', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.announceAnswer('Paris');
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toBe('The correct answer is: Paris');
    });

    it('includes explanation when provided', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.announceAnswer('Paris', 'Paris has been the capital since 987 AD.');
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toContain('Paris has been the capital since 987 AD');
    });
  });

  describe('announceScores', () => {
    it('does nothing with empty scores', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.announceScores([]);
      });

      expect(mockSpeak).not.toHaveBeenCalled();
    });

    it('announces team scores', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.announceScores([
          { name: 'Table 1', score: 15 },
          { name: 'Table 2', score: 12 },
        ]);
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toContain('Table 1: 15 points');
      expect(utterance.text).toContain('Table 2: 12 points');
    });

    it('handles singular point correctly', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.announceScores([{ name: 'Table 1', score: 1 }]);
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toContain('1 point');
      expect(utterance.text).not.toContain('1 points');
    });
  });

  describe('announceWinners', () => {
    it('does nothing with empty winners', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.announceWinners([]);
      });

      expect(mockSpeak).not.toHaveBeenCalled();
    });

    it('announces single winner', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.announceWinners([{ name: 'Table 1', score: 25 }]);
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toContain('The winner is Table 1');
      expect(utterance.text).toContain('25 points');
      expect(utterance.text).toContain('Congratulations');
    });

    it('announces tie with multiple winners', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.announceWinners([
          { name: 'Table 1', score: 20 },
          { name: 'Table 2', score: 20 },
        ]);
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toContain('tie');
      expect(utterance.text).toContain('Table 1');
      expect(utterance.text).toContain('Table 2');
    });
  });

  describe('announceRoundComplete', () => {
    it('announces round completion with remaining rounds', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.announceRoundComplete(1, 3);
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toContain('Round 1 complete');
      expect(utterance.text).toContain('2 rounds remaining');
    });

    it('announces final round', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.announceRoundComplete(3, 3);
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toContain('final round');
    });

    it('handles singular remaining round', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.announceRoundComplete(2, 3);
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toContain('1 round remaining');
    });
  });

  describe('announceGameOver', () => {
    it('announces game over', () => {
      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.announceGameOver();
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toContain('Game over');
    });
  });
});

describe('voice helpers', () => {
  describe('getVoiceDisplayName', () => {
    it('returns name as-is for generic voices', () => {
      const voice = createMockVoice({ name: 'Samantha' });
      expect(getVoiceDisplayName(voice)).toBe('Samantha');
    });

    it('removes Microsoft prefix', () => {
      const voice = createMockVoice({ name: 'Microsoft David' });
      expect(getVoiceDisplayName(voice)).toBe('David');
    });

    it('removes Google prefix', () => {
      const voice = createMockVoice({ name: 'Google US English' });
      expect(getVoiceDisplayName(voice)).toBe('US English');
    });

    it('removes Apple prefix', () => {
      const voice = createMockVoice({ name: 'Apple Samantha' });
      expect(getVoiceDisplayName(voice)).toBe('Samantha');
    });
  });

  describe('filterVoicesByLanguage', () => {
    it('filters voices by language prefix', () => {
      const voices = [
        createMockVoice({ lang: 'en-US', name: 'English US' }),
        createMockVoice({ lang: 'en-GB', name: 'English GB' }),
        createMockVoice({ lang: 'es-ES', name: 'Spanish' }),
        createMockVoice({ lang: 'fr-FR', name: 'French' }),
      ];

      const englishVoices = filterVoicesByLanguage(voices, 'en');
      expect(englishVoices).toHaveLength(2);
      expect(englishVoices.map((v) => v.name)).toContain('English US');
      expect(englishVoices.map((v) => v.name)).toContain('English GB');
    });

    it('defaults to English filter', () => {
      const voices = [
        createMockVoice({ lang: 'en-US', name: 'English' }),
        createMockVoice({ lang: 'es-ES', name: 'Spanish' }),
      ];

      const filtered = filterVoicesByLanguage(voices);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('English');
    });
  });

  describe('sortVoicesByQuality', () => {
    it('puts local voices first', () => {
      const voices = [
        createMockVoice({ name: 'Remote', localService: false }),
        createMockVoice({ name: 'Local', localService: true }),
      ];

      const sorted = sortVoicesByQuality(voices);
      expect(sorted[0].name).toBe('Local');
    });

    it('puts natural voices before non-natural', () => {
      const voices = [
        createMockVoice({ name: 'Regular Voice', localService: true }),
        createMockVoice({ name: 'Natural Voice', localService: true }),
      ];

      const sorted = sortVoicesByQuality(voices);
      expect(sorted[0].name).toBe('Natural Voice');
    });

    it('sorts alphabetically as tiebreaker', () => {
      const voices = [
        createMockVoice({ name: 'Zoe', localService: true }),
        createMockVoice({ name: 'Alex', localService: true }),
      ];

      const sorted = sortVoicesByQuality(voices);
      expect(sorted[0].name).toBe('Alex');
      expect(sorted[1].name).toBe('Zoe');
    });

    it('does not mutate original array', () => {
      const voices = [
        createMockVoice({ name: 'B' }),
        createMockVoice({ name: 'A' }),
      ];
      const original = [...voices];

      sortVoicesByQuality(voices);
      expect(voices).toEqual(original);
    });
  });
});
