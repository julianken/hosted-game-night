'use client';

import { useMemo } from 'react';
import { useGameStore } from '@/stores/game-store';
import type { TriviaGameState } from '@/types';
import {
  isSetupState,
  isPlayingState,
  isBetweenRoundsState,
  isPausedState,
  isEndedState,
  isGameActive,
  type SetupState,
  type PlayingState,
  type BetweenRoundsState,
  type PausedState,
  type EndedState,
} from '@/types/guards';

// =============================================================================
// CORE STATE EXTRACTION HOOK
// =============================================================================

/**
 * Extracts a TriviaGameState snapshot from the Zustand store.
 * This hook subscribes to only the fields needed for state narrowing,
 * avoiding full store re-render thrashing.
 *
 * WARNING: This builds a partial state object. For full state, use getState().
 */
function useGameStateSnapshot(): TriviaGameState {
  const sessionId = useGameStore((s) => s.sessionId);
  const status = useGameStore((s) => s.status);
  const statusBeforePause = useGameStore((s) => s.statusBeforePause);
  const questions = useGameStore((s) => s.questions);
  const selectedQuestionIndex = useGameStore((s) => s.selectedQuestionIndex);
  const displayQuestionIndex = useGameStore((s) => s.displayQuestionIndex);
  const currentRound = useGameStore((s) => s.currentRound);
  const totalRounds = useGameStore((s) => s.totalRounds);
  const teams = useGameStore((s) => s.teams);
  const teamAnswers = useGameStore((s) => s.teamAnswers);
  const timer = useGameStore((s) => s.timer);
  const settings = useGameStore((s) => s.settings);
  const showScoreboard = useGameStore((s) => s.showScoreboard);
  const emergencyBlank = useGameStore((s) => s.emergencyBlank);
  const ttsEnabled = useGameStore((s) => s.ttsEnabled);

  // Scene fields (BEA-568)
  const audienceScene = useGameStore((s) => s.audienceScene);
  const sceneBeforePause = useGameStore((s) => s.sceneBeforePause);
  const sceneTimestamp = useGameStore((s) => s.sceneTimestamp);
  const revealPhase = useGameStore((s) => s.revealPhase);
  const scoreDeltas = useGameStore((s) => s.scoreDeltas);
  // Recap sub-state (BEA-587)
  const recapShowingAnswer = useGameStore((s) => s.recapShowingAnswer);
  // Round start score snapshot (BEA-601)
  const questionStartScores = useGameStore((s) => s.questionStartScores);

  return useMemo<TriviaGameState>(() => ({
    sessionId,
    status,
    statusBeforePause,
    questions,
    selectedQuestionIndex,
    displayQuestionIndex,
    currentRound,
    totalRounds,
    teams,
    teamAnswers,
    timer,
    settings,
    showScoreboard,
    emergencyBlank,
    ttsEnabled,
    // Scene fields (BEA-568)
    audienceScene,
    sceneBeforePause,
    sceneTimestamp,
    revealPhase,
    scoreDeltas,
    // Recap sub-state (BEA-587)
    recapShowingAnswer,
    // Round start score snapshot (BEA-601)
    questionStartScores,
  }), [
    sessionId,
    status,
    statusBeforePause,
    questions,
    selectedQuestionIndex,
    displayQuestionIndex,
    currentRound,
    totalRounds,
    teams,
    teamAnswers,
    timer,
    settings,
    showScoreboard,
    emergencyBlank,
    ttsEnabled,
    // Scene fields (BEA-568)
    audienceScene,
    sceneBeforePause,
    sceneTimestamp,
    revealPhase,
    scoreDeltas,
    // Recap sub-state (BEA-587)
    recapShowingAnswer,
    // Round start score snapshot (BEA-601)
    questionStartScores,
  ]);
}

// =============================================================================
// STATUS-SPECIFIC HOOKS
// =============================================================================

/**
 * Returns the narrowed SetupState if the game is in setup mode, otherwise null.
 * Components can use this to conditionally render setup-only UI.
 *
 * Example:
 *   const setupState = useSetupState();
 *   if (!setupState) return <p>Game already started</p>;
 *   // setupState.status is narrowed to 'setup'
 */
export function useSetupState(): SetupState | null {
  const state = useGameStateSnapshot();
  return isSetupState(state) ? state : null;
}

/**
 * Returns the narrowed PlayingState if the game is being played, otherwise null.
 */
export function usePlayingState(): PlayingState | null {
  const state = useGameStateSnapshot();
  return isPlayingState(state) ? state : null;
}

/**
 * Returns the narrowed BetweenRoundsState if the game is between rounds, otherwise null.
 */
export function useBetweenRoundsState(): BetweenRoundsState | null {
  const state = useGameStateSnapshot();
  return isBetweenRoundsState(state) ? state : null;
}

/**
 * Returns the narrowed PausedState if the game is paused, otherwise null.
 */
export function usePausedState(): PausedState | null {
  const state = useGameStateSnapshot();
  return isPausedState(state) ? state : null;
}

/**
 * Returns the narrowed EndedState if the game has ended, otherwise null.
 */
export function useEndedState(): EndedState | null {
  const state = useGameStateSnapshot();
  return isEndedState(state) ? state : null;
}

// =============================================================================
// COMPOUND STATUS HOOKS
// =============================================================================

/**
 * Returns the narrowed state if the game is actively in progress
 * (playing, between rounds, or paused), otherwise null.
 */
export function useActiveGameState(): (PlayingState | BetweenRoundsState | PausedState) | null {
  const state = useGameStateSnapshot();
  return isGameActive(state) ? state : null;
}

/**
 * Returns a structured status object for display components that need
 * to render differently based on game status.
 *
 * This is a more ergonomic alternative to multiple individual type guards
 * when a component needs to handle all cases.
 */
export function useGameStatus(): {
  status: TriviaGameState['status'];
  isSetup: boolean;
  isPlaying: boolean;
  isBetweenRounds: boolean;
  isPaused: boolean;
  isEnded: boolean;
  isActive: boolean;
  isEmergencyPause: boolean;
  resumeTarget: 'playing' | 'between_rounds' | null;
} {
  const status = useGameStore((s) => s.status);
  const statusBeforePause = useGameStore((s) => s.statusBeforePause);
  const emergencyBlank = useGameStore((s) => s.emergencyBlank);

  return useMemo(() => ({
    status,
    isSetup: status === 'setup',
    isPlaying: status === 'playing',
    isBetweenRounds: status === 'between_rounds',
    isPaused: status === 'paused',
    isEnded: status === 'ended',
    isActive: status === 'playing' || status === 'between_rounds' || status === 'paused',
    isEmergencyPause: status === 'paused' && emergencyBlank,
    resumeTarget: status === 'paused'
      ? (statusBeforePause as 'playing' | 'between_rounds' | null)
      : null,
  }), [status, statusBeforePause, emergencyBlank]);
}
