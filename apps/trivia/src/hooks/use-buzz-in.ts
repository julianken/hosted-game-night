'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/stores/game-store';
import { useAudioStore } from '@/stores/audio-store';
import type { Team } from '@/types';
import {
  type BuzzInState,
  type BuzzInResult,
  createInitialBuzzInState,
  activateBuzzIn,
  deactivateBuzzIn,
  recordBuzz,
  lockBuzzIn,
  unlockBuzzIn,
  resetBuzzIn,
  clearBuzzIn,
  isFirstBuzz,
  getBuzzPosition,
  hasBuzzed,
  keyToTeamIndex,
  getTeamKey,
  getBuzzOrderWithDeltas,
} from '@/lib/game/buzz-in';

// =============================================================================
// TYPES
// =============================================================================

export interface UseBuzzInOptions {
  /** Whether to start the game timer on first buzz */
  startTimerOnBuzz?: boolean;
  /** Callback when a team buzzes first */
  onFirstBuzz?: (teamId: string, team: Team) => void;
  /** Callback when any team buzzes */
  onBuzz?: (teamId: string, team: Team, result: BuzzInResult) => void;
  /** Whether this is the presenter (handles keyboard input) */
  isPresenter?: boolean;
}

export interface UseBuzzInReturn {
  // State
  buzzInState: BuzzInState;
  isActive: boolean;
  isLocked: boolean;
  firstBuzzTeam: Team | null;
  buzzOrder: Array<{ team: Team; delta: number }>;

  // Actions
  activate: () => void;
  deactivate: () => void;
  reset: () => void;
  lock: () => void;
  unlock: () => void;
  clear: () => void;
  handleBuzz: (teamId: string) => BuzzInResult;

  // Helpers
  isTeamFirst: (teamId: string) => boolean;
  getTeamPosition: (teamId: string) => number;
  hasTeamBuzzed: (teamId: string) => boolean;
  getKeyForTeam: (teamIndex: number) => string | null;
}

// =============================================================================
// HOOK
// =============================================================================

export function useBuzzIn(options: UseBuzzInOptions = {}): UseBuzzInReturn {
  const {
    startTimerOnBuzz = false,
    onFirstBuzz,
    onBuzz,
    isPresenter = true,
  } = options;

  const [buzzInState, setBuzzInState] = useState<BuzzInState>(
    createInitialBuzzInState()
  );

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Get teams from game store
  const teams = useGameStore((state) => state.teams);
  const startTimer = useGameStore((state) => state.startTimer);

  // Audio store for sound effects
  const playSoundEffect = useAudioStore((state) => state.playSoundEffect);

  // Find team by ID
  const getTeamById = useCallback(
    (teamId: string): Team | undefined => {
      return teams.find((t) => t.id === teamId);
    },
    [teams]
  );

  // Get first buzz team
  const firstBuzzTeam = buzzInState.firstBuzzTeamId
    ? getTeamById(buzzInState.firstBuzzTeamId) ?? null
    : null;

  // Get buzz order with team objects
  const buzzOrderWithDeltas = getBuzzOrderWithDeltas(buzzInState);
  const buzzOrder = buzzOrderWithDeltas
    .map((b) => {
      const team = getTeamById(b.teamId);
      return team ? { team, delta: b.delta } : null;
    })
    .filter((b): b is { team: Team; delta: number } => b !== null);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const activate = useCallback(() => {
    setBuzzInState((state) => activateBuzzIn(state));
  }, []);

  const deactivate = useCallback(() => {
    setBuzzInState((state) => deactivateBuzzIn(state));
  }, []);

  const reset = useCallback(() => {
    setBuzzInState((state) => resetBuzzIn(state));
  }, []);

  const lock = useCallback(() => {
    setBuzzInState((state) => lockBuzzIn(state));
  }, []);

  const unlock = useCallback(() => {
    setBuzzInState((state) => unlockBuzzIn(state));
  }, []);

  const clear = useCallback(() => {
    setBuzzInState(clearBuzzIn());
  }, []);

  const handleBuzz = useCallback(
    (teamId: string): BuzzInResult => {
      const team = getTeamById(teamId);
      if (!team) {
        return { accepted: false, isFirst: false, position: 0 };
      }

      let result: BuzzInResult = { accepted: false, isFirst: false, position: 0 };

      setBuzzInState((currentState) => {
        const { state: newState, result: buzzResult } = recordBuzz(
          currentState,
          teamId
        );
        result = buzzResult;
        return newState;
      });

      // Handle callbacks and side effects after state update
      if (result.accepted) {
        // Play buzz sound
        playSoundEffect('timer-tick').catch(() => {
          // Ignore audio errors
        });

        if (result.isFirst) {
          // Start timer if configured
          if (optionsRef.current.startTimerOnBuzz) {
            startTimer();
          }

          // Call first buzz callback
          optionsRef.current.onFirstBuzz?.(teamId, team);
        }

        // Call general buzz callback
        optionsRef.current.onBuzz?.(teamId, team, result);
      }

      return result;
    },
    [getTeamById, playSoundEffect, startTimer]
  );

  // ==========================================================================
  // KEYBOARD HANDLING
  // ==========================================================================

  useEffect(() => {
    if (!isPresenter) return;
    if (!buzzInState.isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Check if it's a number key
      const teamIndex = keyToTeamIndex(event.key) ?? keyToTeamIndex(event.code);
      if (teamIndex === null) return;

      // Check if we have a team at this index
      if (teamIndex >= teams.length) return;

      const team = teams[teamIndex];
      if (!team) return;

      event.preventDefault();
      handleBuzz(team.id);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPresenter, buzzInState.isActive, teams, handleBuzz]);

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  const isTeamFirst = useCallback(
    (teamId: string): boolean => {
      return isFirstBuzz(buzzInState, teamId);
    },
    [buzzInState]
  );

  const getTeamPosition = useCallback(
    (teamId: string): number => {
      return getBuzzPosition(buzzInState, teamId);
    },
    [buzzInState]
  );

  const hasTeamBuzzed = useCallback(
    (teamId: string): boolean => {
      return hasBuzzed(buzzInState, teamId);
    },
    [buzzInState]
  );

  const getKeyForTeam = useCallback(
    (teamIndex: number): string | null => {
      return getTeamKey(teamIndex);
    },
    []
  );

  return {
    // State
    buzzInState,
    isActive: buzzInState.isActive,
    isLocked: buzzInState.isLocked,
    firstBuzzTeam,
    buzzOrder,

    // Actions
    activate,
    deactivate,
    reset,
    lock,
    unlock,
    clear,
    handleBuzz,

    // Helpers
    isTeamFirst,
    getTeamPosition,
    hasTeamBuzzed,
    getKeyForTeam,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { BuzzInState, BuzzInResult };
export { createInitialBuzzInState };
