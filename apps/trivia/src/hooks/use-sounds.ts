'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSfxSettings } from '@/stores/audio-store';
import {
  soundManager,
  type SoundEffectType,
  ALL_SOUND_EFFECTS,
} from '@/lib/sounds';
import type { AudienceScene, RevealPhase } from '@/types/audience-scene';

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
  /** Current audience scene (T3.1) */
  audienceScene?: AudienceScene;
  /** Current reveal phase (T3.1) */
  revealPhase?: RevealPhase;
}

/**
 * Hook that automatically plays sounds for game events.
 * Tracks state changes and plays appropriate sounds.
 * T3.1: Extended with 9 scene-aware trigger points.
 */
export function useGameEventSounds(options: UseGameEventSoundsOptions): void {
  const { status, displayQuestionIndex, currentRound, audienceScene, revealPhase } = options;
  const sounds = useSounds();

  // Track previous values
  const prevStatusRef = useRef<string>(status);
  const prevDisplayQuestionRef = useRef<number | null>(displayQuestionIndex);
  const prevRoundRef = useRef<number>(currentRound);
  const prevSceneRef = useRef<AudienceScene | undefined>(audienceScene);
  const prevRevealPhaseRef = useRef<RevealPhase | undefined>(revealPhase);

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

  // T3.1: Scene-aware sound triggers
  useEffect(() => {
    const prevScene = prevSceneRef.current;
    prevSceneRef.current = audienceScene;

    if (!audienceScene || audienceScene === prevScene) return;

    switch (audienceScene) {
      case 'round_intro':
        // Round intro appears
        sounds.playFireAndForget('question-reveal');
        break;
      case 'question_anticipation':
        // Category badge appears
        sounds.playQuestionReveal();
        break;
      case 'question_active':
        // Timer begins
        sounds.playFireAndForget('timer-tick');
        break;
      case 'question_closed':
        // Time runs out
        sounds.playTimerExpired();
        break;
      case 'final_buildup':
        // Game ending
        sounds.playGameWin();
        break;
      case 'final_podium':
        // Winner revealed — delayed by 4.8s to match podium timing
        setTimeout(() => sounds.playCorrectAnswer(), 4800);
        break;
      default:
        break;
    }
  }, [audienceScene, sounds]);

  // T3.1: RevealPhase illuminate -> play correct-answer sound
  useEffect(() => {
    const prevPhase = prevRevealPhaseRef.current;
    prevRevealPhaseRef.current = revealPhase;

    if (revealPhase === 'illuminate' && prevPhase !== 'illuminate') {
      sounds.playCorrectAnswer();
    }
  }, [revealPhase, sounds]);
}

// =============================================================================
// NOTE: useAnswerSounds and useSoundSettings removed — they were passthrough
// wrappers with no callers. Use useSounds() directly for answer sounds
// (playCorrectAnswer, playWrongAnswer) and useAudioSettings() from
// @/stores/audio-store for audio settings UI.
// =============================================================================
