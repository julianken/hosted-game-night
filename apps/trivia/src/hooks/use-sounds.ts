'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSfxSettings } from '@/stores/audio-store';
import {
  soundManager,
  type SoundEffectType,
  ALL_SOUND_EFFECTS,
} from '@/lib/sounds';

// =============================================================================
// PRELOAD HOOK
// =============================================================================

/**
 * Hook to preload all sound effects on mount.
 * Call this in a top-level component (e.g., layout or main page).
 */
export function useSoundPreload() {
  const { enabled } = useSfxSettings();
  const preloadedRef = useRef(false);

  useEffect(() => {
    // Only preload once and if enabled
    if (preloadedRef.current || !enabled) {
      return;
    }

    preloadedRef.current = true;
    soundManager.preloadAll().catch(() => {
      // Ignore preload errors - sounds will load on demand
    });
  }, [enabled]);

  return {
    isPreloaded: preloadedRef.current,
    preloadedCount: soundManager.getPreloadedCount(),
    totalCount: ALL_SOUND_EFFECTS.length,
  };
}

// =============================================================================
// MAIN SOUND HOOK
// =============================================================================

export interface UseSoundsReturn {
  // State
  enabled: boolean;
  volume: number;

  // Actions
  play: (effect: SoundEffectType) => Promise<void>;
  playFireAndForget: (effect: SoundEffectType) => void;
  stopAll: () => void;

  // Convenience methods
  playTimerTick: () => void;
  playTimerExpired: () => Promise<void>;
  playCorrectAnswer: () => Promise<void>;
  playWrongAnswer: () => Promise<void>;
  playQuestionReveal: () => Promise<void>;
  playRoundComplete: () => Promise<void>;
  playGameWin: () => Promise<void>;
}

/**
 * Main hook for playing sound effects in trivia.
 * Integrates with the audio store for volume and enabled state.
 */
export function useSounds(): UseSoundsReturn {
  const { enabled, volume } = useSfxSettings();

  // Sync sound manager config with store
  useEffect(() => {
    soundManager.configure({ enabled, volume });
  }, [enabled, volume]);

  // Play a sound effect
  const play = useCallback(
    async (effect: SoundEffectType): Promise<void> => {
      if (!enabled) return;
      await soundManager.play(effect, volume);
    },
    [enabled, volume]
  );

  // Fire and forget (no await)
  const playFireAndForget = useCallback(
    (effect: SoundEffectType): void => {
      if (!enabled) return;
      soundManager.playFireAndForget(effect, volume);
    },
    [enabled, volume]
  );

  // Stop all sounds
  const stopAll = useCallback(() => {
    soundManager.stopAll();
  }, []);

  // Convenience methods
  const playTimerTick = useCallback(() => {
    playFireAndForget('timer-tick');
  }, [playFireAndForget]);

  const playTimerExpired = useCallback(async () => {
    await play('timer-expired');
  }, [play]);

  const playCorrectAnswer = useCallback(async () => {
    await play('correct-answer');
  }, [play]);

  const playWrongAnswer = useCallback(async () => {
    await play('wrong-answer');
  }, [play]);

  const playQuestionReveal = useCallback(async () => {
    await play('question-reveal');
  }, [play]);

  const playRoundComplete = useCallback(async () => {
    await play('round-complete');
  }, [play]);

  const playGameWin = useCallback(async () => {
    await play('game-win');
  }, [play]);

  return {
    // State
    enabled,
    volume,

    // Actions
    play,
    playFireAndForget,
    stopAll,

    // Convenience methods
    playTimerTick,
    playTimerExpired,
    playCorrectAnswer,
    playWrongAnswer,
    playQuestionReveal,
    playRoundComplete,
    playGameWin,
  };
}

// =============================================================================
// TIMER SOUND HOOK
// =============================================================================

export interface UseTimerSoundsOptions {
  /** Timer remaining seconds */
  remaining: number;
  /** Whether the timer is running */
  isRunning: boolean;
  /** Threshold for timer warning sounds (default: 5) */
  warningThreshold?: number;
}

/**
 * Hook that automatically plays timer sounds.
 * Plays tick sounds during the warning period and expired sound when timer ends.
 */
export function useTimerSounds(options: UseTimerSoundsOptions): void {
  const { remaining, isRunning, warningThreshold = 5 } = options;
  const sounds = useSounds();
  const previousRemainingRef = useRef<number>(remaining);

  useEffect(() => {
    const prevRemaining = previousRemainingRef.current;
    previousRemainingRef.current = remaining;

    // Don't play sounds if not running
    if (!isRunning) {
      return;
    }

    // Detect timer tick (remaining decreased by 1)
    if (remaining < prevRemaining && remaining > 0 && remaining <= warningThreshold) {
      sounds.playTimerTick();
    }

    // Detect timer expired (went from positive to zero)
    if (remaining === 0 && prevRemaining > 0) {
      sounds.playTimerExpired();
    }
  }, [remaining, isRunning, warningThreshold, sounds]);
}

// =============================================================================
// GAME EVENT SOUNDS HOOK
// =============================================================================

export interface UseGameEventSoundsOptions {
  /** Current game status */
  status: string;
  /** Currently displayed question index */
  displayQuestionIndex: number | null;
  /** Current round number */
  currentRound: number;
}

/**
 * Hook that automatically plays sounds for game events.
 * Tracks state changes and plays appropriate sounds.
 */
export function useGameEventSounds(options: UseGameEventSoundsOptions): void {
  const { status, displayQuestionIndex, currentRound } = options;
  const sounds = useSounds();

  // Track previous values
  const prevStatusRef = useRef<string>(status);
  const prevDisplayQuestionRef = useRef<number | null>(displayQuestionIndex);
  const prevRoundRef = useRef<number>(currentRound);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const prevDisplayQuestion = prevDisplayQuestionRef.current;
    const prevRound = prevRoundRef.current;

    // Update refs
    prevStatusRef.current = status;
    prevDisplayQuestionRef.current = displayQuestionIndex;
    prevRoundRef.current = currentRound;

    // Game won/ended
    if (status === 'ended' && prevStatus !== 'ended') {
      sounds.playGameWin();
      return;
    }

    // Round complete (transition to between_rounds)
    if (status === 'between_rounds' && prevStatus === 'playing') {
      sounds.playRoundComplete();
      return;
    }

    // New round started
    if (currentRound > prevRound && status === 'playing') {
      // Round started sound could go here if desired
      return;
    }

    // Question revealed (displayQuestionIndex changed from null to a number, or changed to a different number)
    if (
      displayQuestionIndex !== null &&
      displayQuestionIndex !== prevDisplayQuestion
    ) {
      sounds.playQuestionReveal();
    }
  }, [status, displayQuestionIndex, currentRound, sounds]);
}

// =============================================================================
// NOTE: useAnswerSounds and useSoundSettings removed — they were passthrough
// wrappers with no callers. Use useSounds() directly for answer sounds
// (playCorrectAnswer, playWrongAnswer) and useAudioSettings() from
// @/stores/audio-store for audio settings UI.
// =============================================================================
