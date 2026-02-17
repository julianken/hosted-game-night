import type { TriviaGameState, Team } from '@/types';
import { deepFreeze } from './helpers';

// =============================================================================
// ROUND MANAGEMENT
// =============================================================================

/**
 * Complete the current round and transition to between_rounds status.
 */
export function completeRound(state: TriviaGameState): TriviaGameState {
  if (state.status !== 'playing') return state;

  return deepFreeze({
    ...state,
    status: 'between_rounds',
    displayQuestionIndex: null,
  });
}

/**
 * Advance to the next round or end the game if on the last round.
 */
export function nextRound(state: TriviaGameState): TriviaGameState {
  if (state.status !== 'between_rounds') return state;

  const nextRoundIndex = state.currentRound + 1;

  // If this was the last round, end the game
  if (nextRoundIndex >= state.totalRounds) {
    return deepFreeze({
      ...state,
      status: 'ended',
      displayQuestionIndex: null,
    });
  }

  // Find first question of the next round
  const nextRoundFirstQuestion = state.questions.findIndex(q => q.roundIndex === nextRoundIndex);

  return deepFreeze({
    ...state,
    status: 'playing',
    currentRound: nextRoundIndex,
    selectedQuestionIndex: nextRoundFirstQuestion >= 0 ? nextRoundFirstQuestion : 0,
    displayQuestionIndex: null,
  });
}

/**
 * Get the winning team(s) for a specific round (handles ties).
 */
export function getRoundWinners(state: TriviaGameState, roundIndex: number): Team[] {
  const teamsWithRoundScores = state.teams.filter(
    t => t.roundScores && t.roundScores[roundIndex] !== undefined
  );

  if (teamsWithRoundScores.length === 0) return [];

  const maxRoundScore = Math.max(...teamsWithRoundScores.map(t => t.roundScores[roundIndex] || 0));
  return teamsWithRoundScores.filter(t => (t.roundScores[roundIndex] || 0) === maxRoundScore);
}
