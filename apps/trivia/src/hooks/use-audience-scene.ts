'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import type { AudienceScene } from '@/types/audience-scene';
import {
  SCENE_TIMING,
} from '@/types/audience-scene';

// =============================================================================
// INPUT / OUTPUT TYPES
// =============================================================================

export interface UseAudienceSceneOptions {
  /**
   * 'presenter' -- this instance owns the scene and calls setAudienceScene.
   * 'audience'  -- this instance reads scene from the synced store only.
   *
   * Only ONE presenter instance should exist at a time. Multiple audience
   * instances are fine (same device or different BroadcastChannel clients).
   */
  role: 'presenter' | 'audience';
}

export interface UseAudienceSceneReturn {
  /** The current audience scene value. */
  scene: AudienceScene;

  /**
   * Skip the current timed scene immediately.
   * No-op if the current scene has no auto-advance timer running.
   * Presenter side only; audience side no-ops.
   */
  skipScene: () => void;

  /**
   * Whether the current scene has an active auto-advance timer.
   * Useful to show a "skip" hint in presenter UI.
   */
  isTimedScene: boolean;

  /**
   * Milliseconds remaining before auto-advance, or null if not timed.
   * Updates on a 100ms interval when a timed scene is active.
   */
  timeRemaining: number | null;
}

// =============================================================================
// TIMED SCENE REGISTRY
// =============================================================================

/**
 * Auto-advance durations for timed scenes (milliseconds).
 * Non-listed scenes have no auto-advance (indefinite).
 */
const TIMED_SCENE_DURATIONS: Partial<Record<AudienceScene, number>> = {
  game_intro:            SCENE_TIMING.GAME_INTRO_MS,           // 6000ms
  round_intro:           SCENE_TIMING.ROUND_INTRO_MS,          // 4000ms (5000 for final round)
  question_anticipation: SCENE_TIMING.QUESTION_ANTICIPATION_MS, // 1500ms
  answer_reveal:         SCENE_TIMING.ANSWER_REVEAL_MS,        // 4000ms
  score_flash:           SCENE_TIMING.SCORE_FLASH_MS,          // 5000ms
  final_buildup:         SCENE_TIMING.FINAL_BUILDUP_MS,        // 3000ms
} as const;

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useAudienceScene(
  options: UseAudienceSceneOptions
): UseAudienceSceneReturn {
  const { role } = options;
  const isPresenter = role === 'presenter';

  // ---- Store selectors (fine-grained to avoid re-render thrash) ----
  const scene = useGameStore((s) => s.audienceScene);
  const setAudienceScene = useGameStore((s) => s.setAudienceScene);
  const currentRound = useGameStore((s) => s.currentRound);
  const totalRounds = useGameStore((s) => s.totalRounds);

  // ---- Auto-advance timer state ----
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sceneStartRef = useRef<number>(Date.now());

  // ---- Determine duration for current scene ----
  const getSceneDurationForCurrent = useCallback(
    (s: AudienceScene): number | null => {
      let base = TIMED_SCENE_DURATIONS[s] ?? null;
      // Final round: extend round_intro to 5s
      if (s === 'round_intro' && currentRound >= totalRounds - 1) {
        base = SCENE_TIMING.ROUND_INTRO_FINAL_MS;
      }
      return base;
    },
    [currentRound, totalRounds]
  );

  // ---- Auto-advance effect ----
  useEffect(() => {
    if (!isPresenter) return;

    // Clear any existing timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const duration = getSceneDurationForCurrent(scene);

    if (duration === null) {
      setTimeRemaining(null);
      return;
    }

    sceneStartRef.current = Date.now();
    setTimeRemaining(duration);

    // Countdown interval (100ms resolution for smooth display)
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - sceneStartRef.current;
      const remaining = Math.max(0, duration - elapsed);
      setTimeRemaining(remaining);
    }, 100);

    // Advance timer -- when it fires, the scene auto-advances.
    // The actual next scene is determined by the keyboard handler / scene
    // engine -- this hook just notifies that time expired.
    timerRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimeRemaining(0);
      // The auto-advance is handled by the keyboard system / scene engine,
      // not directly by this hook. The scene change itself clears and resets
      // via the useEffect dependency on `scene`.
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [scene, isPresenter, getSceneDurationForCurrent, setAudienceScene]);

  // ---- skipScene: cancel timer and signal skip ----
  const skipScene = useCallback(() => {
    if (!isPresenter) return;

    const duration = getSceneDurationForCurrent(scene);
    if (duration === null) return; // Not a timed scene

    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimeRemaining(null);

    // The actual skip logic (deciding what scene comes next) is handled by
    // the keyboard handler via getNextScene(current, 'skip', context).
    // This function simply cancels the auto-advance timer.
  }, [isPresenter, scene, getSceneDurationForCurrent]);

  const isTimedScene = isPresenter ? getSceneDurationForCurrent(scene) !== null : false;

  return {
    scene,
    skipScene,
    isTimedScene,
    timeRemaining: isPresenter ? timeRemaining : null,
  };
}
