'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioStore } from '@/stores/audio-store';

// =============================================================================
// TYPES
// =============================================================================

export interface TTSOptions {
  /** Override the stored rate */
  rate?: number;
  /** Override the stored pitch */
  pitch?: number;
  /** Override the stored volume */
  volume?: number;
  /** Callback when speech starts */
  onStart?: () => void;
  /** Callback when speech ends */
  onEnd?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseTTSReturn {
  /** Speak the given text */
  speak: (text: string, options?: TTSOptions) => void;
  /** Stop any ongoing speech */
  stop: () => void;
  /** Whether TTS is currently speaking */
  isSpeaking: boolean;
  /** Whether TTS is available in this browser */
  isAvailable: boolean;
  /** Available voices */
  voices: SpeechSynthesisVoice[];
  /** Get a specific voice by URI */
  getVoiceByUri: (uri: string) => SpeechSynthesisVoice | undefined;

  // Convenience methods for trivia announcements
  /** Announce a question being displayed */
  announceQuestion: (questionText: string, options?: string[]) => void;
  /** Announce the correct answer */
  announceAnswer: (answer: string, explanation?: string) => void;
  /** Announce scores (e.g., "Table 1: 15 points") */
  announceScores: (scores: Array<{ name: string; score: number }>) => void;
  /** Announce the winner(s) */
  announceWinners: (winners: Array<{ name: string; score: number }>) => void;
  /** Announce round completion */
  announceRoundComplete: (roundNumber: number, totalRounds: number) => void;
  /** Announce game over */
  announceGameOver: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useTTS(): UseTTSReturn {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Store state
  const enabled = useAudioStore((s) => s.enabled);
  const ttsEnabled = useAudioStore((s) => s.ttsEnabled);
  const ttsVoice = useAudioStore((s) => s.ttsVoice);
  const ttsRate = useAudioStore((s) => s.ttsRate);
  const ttsPitch = useAudioStore((s) => s.ttsPitch);
  const volume = useAudioStore((s) => s.volume);
  const isSpeaking = useAudioStore((s) => s.isSpeaking);
  const setIsSpeaking = useAudioStore((s) => s._setIsSpeaking);

  // Check availability and load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsAvailable(false);
      return;
    }

    setIsAvailable(true);

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    // Load voices immediately (may be empty on first call)
    loadVoices();

    // Chrome requires listening to voiceschanged event
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Get voice by URI
  const getVoiceByUri = useCallback(
    (uri: string): SpeechSynthesisVoice | undefined => {
      return voices.find((v) => v.voiceURI === uri);
    },
    [voices]
  );

  // Find the best voice for English
  const findBestVoice = useCallback((): SpeechSynthesisVoice | null => {
    // If user has selected a voice, use it
    if (ttsVoice) {
      const selected = getVoiceByUri(ttsVoice);
      if (selected) return selected;
    }

    // Prefer natural-sounding English voices
    const preferred = voices.find(
      (v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('natural')
    );
    if (preferred) return preferred;

    // Fall back to any English voice
    const english = voices.find((v) => v.lang.startsWith('en'));
    if (english) return english;

    // Fall back to first available voice
    return voices[0] || null;
  }, [voices, ttsVoice, getVoiceByUri]);

  // Core speak function
  const speak = useCallback(
    (text: string, options: TTSOptions = {}) => {
      if (!isAvailable || !enabled || !ttsEnabled) {
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Apply settings
      const voice = findBestVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.rate = options.rate ?? ttsRate;
      utterance.pitch = options.pitch ?? ttsPitch;
      utterance.volume = options.volume ?? volume;

      // Event handlers
      utterance.onstart = () => {
        setIsSpeaking(true);
        options.onStart?.();
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
        options.onEnd?.();
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        utteranceRef.current = null;
        // SpeechSynthesisErrorEvent doesn't have a message, use error type
        const errorMessage = event.error || 'Unknown TTS error';
        options.onError?.(new Error(errorMessage));
      };

      window.speechSynthesis.speak(utterance);
    },
    [isAvailable, enabled, ttsEnabled, ttsRate, ttsPitch, volume, findBestVoice, setIsSpeaking]
  );

  // Stop function
  const stop = useCallback(() => {
    if (!isAvailable) return;

    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    utteranceRef.current = null;
  }, [isAvailable, setIsSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isAvailable) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isAvailable]);

  // =============================================================================
  // CONVENIENCE METHODS FOR TRIVIA
  // =============================================================================

  const announceQuestion = useCallback(
    (questionText: string, options?: string[]) => {
      let text = questionText;
      if (options && options.length > 0) {
        const optionLabels = ['A', 'B', 'C', 'D'];
        const optionList = options
          .map((opt, i) => `${optionLabels[i]}: ${opt}`)
          .join('. ');
        text = `${questionText}. Options: ${optionList}`;
      }
      speak(text);
    },
    [speak]
  );

  const announceAnswer = useCallback(
    (answer: string, explanation?: string) => {
      let text = `The correct answer is: ${answer}`;
      if (explanation) {
        text += `. ${explanation}`;
      }
      speak(text);
    },
    [speak]
  );

  const announceScores = useCallback(
    (scores: Array<{ name: string; score: number }>) => {
      if (scores.length === 0) return;

      const scoreList = scores
        .map((s) => `${s.name}: ${s.score} point${s.score === 1 ? '' : 's'}`)
        .join('. ');
      speak(`Current scores. ${scoreList}`);
    },
    [speak]
  );

  const announceWinners = useCallback(
    (winners: Array<{ name: string; score: number }>) => {
      if (winners.length === 0) return;

      if (winners.length === 1) {
        const winner = winners[0];
        speak(
          `The winner is ${winner.name} with ${winner.score} point${winner.score === 1 ? '' : 's'}! Congratulations!`
        );
      } else {
        // Multiple winners (tie)
        const names = winners.map((w) => w.name);
        const lastTwo = names.slice(-2).join(' and ');
        const others = names.slice(0, -2);
        const allNames = others.length > 0 ? [...others, lastTwo].join(', ') : lastTwo;
        speak(
          `We have a tie! The winners are ${allNames} with ${winners[0].score} point${winners[0].score === 1 ? '' : 's'} each! Congratulations!`
        );
      }
    },
    [speak]
  );

  const announceRoundComplete = useCallback(
    (roundNumber: number, totalRounds: number) => {
      if (roundNumber === totalRounds) {
        speak(`Round ${roundNumber} complete. That was the final round!`);
      } else {
        speak(`Round ${roundNumber} complete. ${totalRounds - roundNumber} round${totalRounds - roundNumber === 1 ? '' : 's'} remaining.`);
      }
    },
    [speak]
  );

  const announceGameOver = useCallback(() => {
    speak('Game over! Thank you for playing Trivia Night.');
  }, [speak]);

  return {
    speak,
    stop,
    isSpeaking,
    isAvailable,
    voices,
    getVoiceByUri,
    announceQuestion,
    announceAnswer,
    announceScores,
    announceWinners,
    announceRoundComplete,
    announceGameOver,
  };
}

// =============================================================================
// VOICE HELPERS
// =============================================================================

/**
 * Get display name for a voice.
 */
export function getVoiceDisplayName(voice: SpeechSynthesisVoice): string {
  // Remove common prefixes like "Microsoft" or "Google"
  let name = voice.name;
  const prefixes = ['Microsoft', 'Google', 'Apple'];
  for (const prefix of prefixes) {
    if (name.startsWith(prefix)) {
      name = name.slice(prefix.length).trim();
    }
  }
  return name;
}

/**
 * Filter voices by language.
 */
export function filterVoicesByLanguage(
  voices: SpeechSynthesisVoice[],
  langPrefix: string = 'en'
): SpeechSynthesisVoice[] {
  return voices.filter((v) => v.lang.startsWith(langPrefix));
}

/**
 * Sort voices by quality (local first, then natural, then alphabetical).
 */
export function sortVoicesByQuality(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => {
    // Local voices first
    if (a.localService && !b.localService) return -1;
    if (!a.localService && b.localService) return 1;

    // Natural voices next
    const aIsNatural = a.name.toLowerCase().includes('natural');
    const bIsNatural = b.name.toLowerCase().includes('natural');
    if (aIsNatural && !bIsNatural) return -1;
    if (!aIsNatural && bIsNatural) return 1;

    // Alphabetical
    return a.name.localeCompare(b.name);
  });
}
