'use client';

import { useEffect, useRef } from 'react';
import type { AudienceScene } from '@/types/audience-scene';
import {
  SCENE_TIMING,
  BATCH_REVEAL_TIMING,
} from '@/types/audience-scene';

// =============================================================================
// TIMED SCENE DURATIONS
// =============================================================================

/**
 * Duration registry for timed scenes.
 * Non-listed scenes have no auto-advance (indefinite).
 */
const TIMED_SCENE_DURATIONS: Partial<Record<AudienceScene, number>> = {
  game_intro:            SCENE_TIMING.GAME_INTRO_MS,
  round_intro:           SCENE_TIMING.ROUND_INTRO_MS,
  question_anticipation: SCENE_TIMING.QUESTION_ANTICIPATION_MS,
  round_reveal_intro:    BATCH_REVEAL_TIMING.ROUND_REVEAL_INTRO_MS,
  question_transition:   BATCH_REVEAL_TIMING.QUESTION_TRANSITION_MS,
  answer_reveal:         SCENE_TIMING.ANSWER_REVEAL_MS,
  score_flash:           SCENE_TIMING.SCORE_FLASH_MS,
  final_buildup:         SCENE_TIMING.FINAL_BUILDUP_MS,
} as const;

// =============================================================================
// HOOK INTERFACE
// =============================================================================

export interface UseSceneAutoAdvanceOptions {
  /**
   * The current audience scene.
   * When this changes, any running timer is cleared and a new one may start.
   */
  scene: AudienceScene;

  /**
   * Called when the timer expires and the scene should auto-advance.
   * The caller is responsible for deciding what the next scene should be.
   */
  onAdvance: () => void;

  /**
   * When true, prevents the auto-advance timer from firing.
   * Useful for pausing auto-advance when the game is paused.
   * Defaults to false.
   */
  isPaused?: boolean;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * useSceneAutoAdvance (T2.5.5)
 *
 * Auto-advances timed scenes after their specified duration expires.
 *
 * Checks SCENE_TIMING / BATCH_REVEAL_TIMING for duration based on scene.
 * Sets a setTimeout that calls onAdvance after duration.
 * Clears timeout on scene change, unmount, or isPaused becoming true.
 *
 * NOTE: The useAudienceScene hook already has auto-advance timer logic built in
 * for the presenter-side timeRemaining display. This hook is a separate,
 * lightweight version designed for scenes that need to trigger an actual
 * scene transition callback (not just countdown display). It can be used
 * by scene components directly to fire navigation on mount.
 *
 * For the AUDIENCE side, auto-advance is not needed (audience just renders
 * what the store says). Use role="presenter" guards at the call site if needed.
 */
export function useSceneAutoAdvance({
  scene,
  onAdvance,
  isPaused = false,
}: UseSceneAutoAdvanceOptions): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use a stable ref for onAdvance to avoid re-running the effect
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Don't start if paused
    if (isPaused) return;

    const duration = TIMED_SCENE_DURATIONS[scene] ?? null;

    // No auto-advance for this scene
    if (duration === null) return;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onAdvanceRef.current();
    }, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [scene, isPaused]);
}
