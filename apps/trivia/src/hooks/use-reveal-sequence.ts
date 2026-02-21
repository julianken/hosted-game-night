'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { RevealPhase } from '@/types/audience-scene';
import { REVEAL_TIMING } from '@/types/audience-scene';
import { useGameStore } from '@/stores/game-store';

// =============================================================================
// INPUT / OUTPUT TYPES
// =============================================================================

export interface UseRevealSequenceOptions {
  /**
   * Index of the question being revealed.
   * Used to scope score snapshot and prevent cross-question leakage.
   */
  questionIndex: number | null;

  /**
   * The correct answer string for the current question.
   * Used to validate the reveal is appropriate to trigger.
   */
  revealedAnswer: string | null;

  /**
   * Called each time the reveal phase advances.
   * Use to drive UI state in the caller component.
   */
  onPhaseChange?: (phase: RevealPhase) => void;

  /**
   * Called when the POST_REVEAL_LOCK expires (at 1100ms).
   * Presenter keyboard handler may use this to unblock advance keys.
   */
  onRevealComplete?: () => void;
}

export interface UseRevealSequenceReturn {
  /** Current reveal phase. null = no reveal in progress. */
  revealPhase: RevealPhase;

  /**
   * Begin the 3-beat reveal sequence.
   * No-op if revealedAnswer is null or isRevealing is true.
   */
  triggerReveal: () => void;

  /**
   * True if triggerReveal() can be called right now.
   * False if: already revealing, revealedAnswer is null,
   *           or POST_REVEAL_LOCK has not yet expired.
   */
  canReveal: boolean;

  /**
   * True during the sequence from triggerReveal() call
   * until POST_REVEAL_LOCK expires (1100ms).
   */
  isRevealing: boolean;

  /**
   * Score snapshot captured immediately before triggerReveal() ran.
   * Use this to compute deltas for ScoreDeltaBadges.
   * null if no reveal has happened this session.
   */
  previousScores: Record<string, number> | null;

  /**
   * Reset to null phase without triggering any callbacks.
   * Call when navigating away from a question.
   */
  resetReveal: () => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useRevealSequence(
  options: UseRevealSequenceOptions
): UseRevealSequenceReturn {
  const {
    questionIndex,
    revealedAnswer,
    onPhaseChange,
    onRevealComplete,
  } = options;

  const [revealPhase, setRevealPhaseState] = useState<RevealPhase>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [previousScores, setPreviousScores] = useState<Record<string, number> | null>(null);

  // Stable refs for callbacks (avoids stale closure in setTimeout chains)
  const onPhaseChangeRef = useRef(onPhaseChange);
  onPhaseChangeRef.current = onPhaseChange;
  const onRevealCompleteRef = useRef(onRevealComplete);
  onRevealCompleteRef.current = onRevealComplete;

  // Store ref for score snapshot capture
  const getTeams = useCallback(() => {
    return useGameStore.getState().teams;
  }, []);

  // Timeout refs for cleanup
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  // Internal phase setter that fires callback
  const setPhase = useCallback((phase: RevealPhase) => {
    setRevealPhaseState(phase);
    onPhaseChangeRef.current?.(phase);
  }, []);

  // Cleanup on questionIndex change or unmount
  useEffect(() => {
    return () => clearAllTimeouts();
  }, [questionIndex, clearAllTimeouts]);

  const triggerReveal = useCallback(() => {
    if (!revealedAnswer || isRevealing) return;

    // 1. Snapshot scores BEFORE any adjustments
    const teams = getTeams();
    const snapshot: Record<string, number> = {};
    for (const team of teams) {
      snapshot[team.id] = team.score;
    }
    setPreviousScores(snapshot);

    // 2. Begin sequence
    setIsRevealing(true);
    setPhase('freeze');

    // All timeouts are cumulative from the trigger point.
    const schedule = (ms: number, fn: () => void) => {
      const id = setTimeout(fn, ms);
      timeoutsRef.current.push(id);
    };

    // Beat 2: Dim wrong options
    schedule(REVEAL_TIMING.DIM_WRONG_START_MS, () => {
      setPhase('dim_wrong');
    });

    // Beat 3: Illuminate correct + fire chime
    schedule(REVEAL_TIMING.ILLUMINATE_START_MS, () => {
      setPhase('illuminate');
      // Sound would fire at illuminate beat -- the caller or sound system
      // hooks into onPhaseChange to trigger the correct-answer chime.
    });

    // POST_REVEAL_LOCK expires: presenter may advance
    schedule(REVEAL_TIMING.POST_REVEAL_LOCK_MS, () => {
      setIsRevealing(false);
      onRevealCompleteRef.current?.();
    });
  }, [revealedAnswer, isRevealing, getTeams, setPhase]);

  const resetReveal = useCallback(() => {
    clearAllTimeouts();
    setRevealPhaseState(null);
    setIsRevealing(false);
  }, [clearAllTimeouts]);

  const canReveal = !isRevealing && !!revealedAnswer && revealPhase === null;

  return {
    revealPhase,
    triggerReveal,
    canReveal,
    isRevealing,
    previousScores,
    resetReveal,
  };
}
