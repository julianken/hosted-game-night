'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTimerState, useGameStore } from '@/stores/game-store';
import { useGame } from './use-game';

// =============================================================================
// TYPES
// =============================================================================

export interface UseTimerAutoRevealOptions {
  /** Currently selected question index */
  selectedQuestionIndex: number;
  /** Currently displayed question index (null = hidden) */
  displayQuestionIndex: number | null;
  /** Whether auto-reveal is enabled */
  autoRevealEnabled: boolean;
  /** Callback when auto-reveal triggers */
  onAutoReveal?: () => void;
}

export interface UseTimerAutoRevealReturn {
  /** Whether flash effect is active */
  isFlashing: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const FLASH_DURATION_MS = 2000; // 2 seconds

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook that automatically reveals the answer when the timer reaches 0 seconds.
 *
 * Features:
 * - Monitors timer state for countdown to 0
 * - Triggers setDisplayQuestion when enabled
 * - Provides flash effect state for visual feedback
 * - Prevents duplicate reveals with ref tracking
 * - Only reveals if question is not already displayed
 *
 * @param options Configuration options
 * @returns Flash effect state
 */
export function useTimerAutoReveal({
  selectedQuestionIndex,
  displayQuestionIndex,
  autoRevealEnabled,
  onAutoReveal,
}: UseTimerAutoRevealOptions): UseTimerAutoRevealReturn {
  const { remaining, isRunning } = useTimerState();
  const { setDisplayQuestion } = useGame();
  const [isFlashing, setIsFlashing] = useState(false);

  // Track previous remaining value to detect transitions
  const previousRemainingRef = useRef<number>(remaining);
  // Track if we've already auto-revealed for the current question
  const autoRevealedForQuestionRef = useRef<number | null>(null);
  // Flash timeout ref for cleanup
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset auto-reveal tracking when question changes
  useEffect(() => {
    if (selectedQuestionIndex !== autoRevealedForQuestionRef.current) {
      autoRevealedForQuestionRef.current = null;
    }
  }, [selectedQuestionIndex]);

  // Clear flash timeout on unmount
  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  // Trigger flash effect
  const triggerFlash = useCallback(() => {
    setIsFlashing(true);

    // Clear any existing timeout
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }

    // Set new timeout to stop flashing
    flashTimeoutRef.current = setTimeout(() => {
      setIsFlashing(false);
      flashTimeoutRef.current = null;
    }, FLASH_DURATION_MS);
  }, []);

  // Monitor timer and trigger auto-reveal
  useEffect(() => {
    const prevRemaining = previousRemainingRef.current;
    previousRemainingRef.current = remaining;

    // Guard conditions - don't auto-reveal if:
    // 1. Feature is disabled
    // 2. Timer wasn't running (prevents false triggers)
    // 3. Already auto-revealed for this question
    // 4. Question is already displayed
    // 5. Selected question index is invalid
    if (
      !autoRevealEnabled ||
      !isRunning ||
      autoRevealedForQuestionRef.current === selectedQuestionIndex ||
      displayQuestionIndex === selectedQuestionIndex ||
      selectedQuestionIndex < 0
    ) {
      return;
    }

    // Detect timer expiry (transitioned from >0 to 0)
    if (remaining === 0 && prevRemaining > 0) {
      // Mark as auto-revealed for this question
      autoRevealedForQuestionRef.current = selectedQuestionIndex;

      // T3.7: Transition to question_closed scene via advanceScene.
      // This decouples timer expiry from answer reveal, letting the presenter
      // control when the answer is shown (via S key in useGameKeyboard).
      useGameStore.getState().advanceScene('auto');

      // Trigger flash effect
      triggerFlash();

      // Call optional callback
      onAutoReveal?.();
    }
  }, [
    remaining,
    isRunning,
    autoRevealEnabled,
    selectedQuestionIndex,
    displayQuestionIndex,
    setDisplayQuestion,
    triggerFlash,
    onAutoReveal,
  ]);

  return {
    isFlashing,
  };
}
