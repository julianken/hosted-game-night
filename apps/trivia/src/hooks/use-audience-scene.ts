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
   * 'presenter' -- this instance owns the scene and drives transitions.
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
   * Milliseconds remaining before auto-advance, or null if not timed.
   * Updates on a 100ms interval when a timed scene is active.
   */
  timeRemaining: number | null;
}

// =============================================================================
// TIMED SCENE REGISTRY
// =============================================================================

/**
 * Under E2E (window.__E2E_TESTING__ set by e2e/utils/e2e-flags.ts), scene
 * auto-advance durations collapse to 100ms. Real users and unit tests (jsdom
 * never sets the flag) still see the full production timings.
 *
 * This is the single biggest cost in the trivia Playwright suite: each
 * `triviaGameStarted`-fixture test pays ~12s waiting out the game_intro →
 * round_intro → question_anticipation chain before it can assert anything
 * game-related.
 *
 * Uses the same `__E2E_TESTING__` flag as BEA-731's audio-unlock bypass in
 * `apps/bingo/src/app/display/page.tsx`. The shape differs: BEA-731 reads the
 * flag via `useState(() => ...)` at component mount; this file evaluates at
 * module load. Both are correct today because Playwright's `addInitScript`
 * runs before any page script and `'use client'` gates this module to the
 * browser. If a future consumer ever imports this module from a non-client
 * boundary (or during streaming SSR), revisit and defer evaluation via
 * `useMemo` or similar.
 */
const E2E = typeof window !== 'undefined'
  && (window as Window & { __E2E_TESTING__?: boolean }).__E2E_TESTING__ === true;
const E2E_FAST_MS = 100;

/**
 * Auto-advance durations for timed scenes (milliseconds).
 * Non-listed scenes have no auto-advance (indefinite).
 */
const TIMED_SCENE_DURATIONS: Partial<Record<AudienceScene, number>> = {
  game_intro:            E2E ? E2E_FAST_MS : SCENE_TIMING.GAME_INTRO_MS,           // 6000ms
  round_intro:           E2E ? E2E_FAST_MS : SCENE_TIMING.ROUND_INTRO_MS,          // 4000ms (5000 for final round)
  question_anticipation: E2E ? E2E_FAST_MS : SCENE_TIMING.QUESTION_ANTICIPATION_MS, // 2000ms
  final_buildup:         E2E ? E2E_FAST_MS : SCENE_TIMING.FINAL_BUILDUP_MS,        // 3000ms
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
      // Final round: extend round_intro to 5s (also bypassed under E2E)
      if (s === 'round_intro' && currentRound >= totalRounds - 1) {
        base = E2E ? E2E_FAST_MS : SCENE_TIMING.ROUND_INTRO_FINAL_MS;
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
  }, [scene, isPresenter, getSceneDurationForCurrent]);

  return {
    scene,
    timeRemaining: isPresenter ? timeRemaining : null,
  };
}
