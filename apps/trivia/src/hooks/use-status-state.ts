'use client';

import { useMemo } from 'react';
import { useGameStore } from '@/stores/game-store';
import type { TriviaGameState } from '@/types';
import {
  isSetupState,
  isPlayingState,
  isBetweenRoundsState,
  isEndedState,
  isGameActive,
  type SetupState,
  type PlayingState,
  type BetweenRoundsState,
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
 * (playing or between rounds), otherwise null.
 */
export function useActiveGameState(): (PlayingState | BetweenRoundsState) | null {
  const state = useGameStateSnapshot();
  return isGameActive(state) ? state : null;
}

/**
 * Returns a structured status object for display components that need
 * to render differently based on game status.
 */
export function useGameStatus(): {
  status: TriviaGameState['status'];
  isSetup: boolean;
  isPlaying: boolean;
  isBetweenRounds: boolean;
  isEnded: boolean;
  isActive: boolean;
  isEmergencyBlank: boolean;
} {
  const status = useGameStore((s) => s.status);
  const audienceScene = useGameStore((s) => s.audienceScene);

  return useMemo(() => ({
    status,
    isSetup: status === 'setup',
    isPlaying: status === 'playing',
    isBetweenRounds: status === 'between_rounds',
    isEnded: status === 'ended',
    isActive: status === 'playing' || status === 'between_rounds',
    isEmergencyBlank: audienceScene === 'emergency_blank',
  }), [status, audienceScene]);
}
