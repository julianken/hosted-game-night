import { v4 as uuidv4 } from 'uuid';
import type { TriviaGameState, Team, Question } from '@/types';
import { DEFAULT_TEAM_PREFIX, MAX_TEAMS, DEFAULT_ROUNDS } from '@/types';
import { SAMPLE_QUESTIONS } from './sample-questions';

// =============================================================================
// INITIAL STATE
// =============================================================================

export function createInitialState(): TriviaGameState {
  return {
    sessionId: uuidv4(),
    status: 'setup',
    questions: SAMPLE_QUESTIONS,
    selectedQuestionIndex: 0,
    displayQuestionIndex: null,
    currentRound: 0,
    totalRounds: DEFAULT_ROUNDS,
    teams: [],
    showScoreboard: true,
    ttsEnabled: false,
  };
}

// =============================================================================
// GAME LIFECYCLE
// =============================================================================

export function startGame(state: TriviaGameState): TriviaGameState {
  if (state.status !== 'setup') return state;
  if (state.teams.length === 0) return state; // Need at least 1 team

  // Find first question of round 0
  const firstQuestionIndex = state.questions.findIndex(q => q.roundIndex === 0);

  return {
    ...state,
    status: 'playing',
    currentRound: 0,
    selectedQuestionIndex: firstQuestionIndex >= 0 ? firstQuestionIndex : 0,
    displayQuestionIndex: null,
    teams: state.teams.map(t => ({
      ...t,
      score: 0,
      roundScores: Array(state.totalRounds).fill(0),
    })),
  };
}

export function endGame(state: TriviaGameState): TriviaGameState {
  return {
    ...state,
    status: 'ended',
    displayQuestionIndex: null,
  };
}

export function resetGame(state: TriviaGameState): TriviaGameState {
  const initial = createInitialState();
  return {
    ...initial,
    sessionId: state.sessionId, // Keep same session
    teams: state.teams.map((t) => ({
      ...t,
      score: 0,
      roundScores: [], // Reset per-round scores
    })),
  };
}

// =============================================================================
// QUESTION NAVIGATION
// =============================================================================

export function selectQuestion(
  state: TriviaGameState,
  index: number
): TriviaGameState {
  if (index < 0 || index >= state.questions.length) return state;

  return {
    ...state,
    selectedQuestionIndex: index,
  };
}

export function setDisplayQuestion(
  state: TriviaGameState,
  index: number | null
): TriviaGameState {
  if (index !== null && (index < 0 || index >= state.questions.length)) {
    return state;
  }

  return {
    ...state,
    displayQuestionIndex: index,
  };
}

// =============================================================================
// TEAM MANAGEMENT
// =============================================================================

export function addTeam(
  state: TriviaGameState,
  name?: string
): TriviaGameState {
  if (state.teams.length >= MAX_TEAMS) return state;

  const tableNumber = state.teams.length + 1;
  const newTeam: Team = {
    id: uuidv4(),
    name: name || `${DEFAULT_TEAM_PREFIX} ${tableNumber}`,
    score: 0,
    tableNumber,
    roundScores: [],
  };

  return {
    ...state,
    teams: [...state.teams, newTeam],
  };
}

export function removeTeam(
  state: TriviaGameState,
  teamId: string
): TriviaGameState {
  return {
    ...state,
    teams: state.teams.filter((t) => t.id !== teamId),
  };
}

export function renameTeam(
  state: TriviaGameState,
  teamId: string,
  name: string
): TriviaGameState {
  return {
    ...state,
    teams: state.teams.map((t) => (t.id === teamId ? { ...t, name } : t)),
  };
}

// =============================================================================
// SCORE MANAGEMENT
// =============================================================================

export function adjustTeamScore(
  state: TriviaGameState,
  teamId: string,
  delta: number
): TriviaGameState {
  const { currentRound, totalRounds } = state;

  return {
    ...state,
    teams: state.teams.map((t) => {
      if (t.id !== teamId) return t;

      // Ensure roundScores array is properly sized
      const roundScores = [...t.roundScores];
      while (roundScores.length < totalRounds) {
        roundScores.push(0);
      }

      // Adjust score for current round
      roundScores[currentRound] = Math.max(0, (roundScores[currentRound] || 0) + delta);

      // Compute total from all round scores
      const score = roundScores.reduce((sum, rs) => sum + rs, 0);

      return { ...t, roundScores, score };
    }),
  };
}

export function setTeamScore(
  state: TriviaGameState,
  teamId: string,
  score: number
): TriviaGameState {
  const { currentRound, totalRounds } = state;

  return {
    ...state,
    teams: state.teams.map((t) => {
      if (t.id !== teamId) return t;

      // Ensure roundScores array is properly sized
      const roundScores = [...t.roundScores];
      while (roundScores.length < totalRounds) {
        roundScores.push(0);
      }

      // Calculate delta from current total to new score
      const currentTotal = roundScores.reduce((sum, rs) => sum + rs, 0);
      const otherRoundsTotal = currentTotal - (roundScores[currentRound] || 0);

      // Set this round's score to achieve the desired total
      roundScores[currentRound] = Math.max(0, score - otherRoundsTotal);

      return { ...t, roundScores, score: Math.max(0, score) };
    }),
  };
}

// Set score specifically for a round
export function setTeamRoundScore(
  state: TriviaGameState,
  teamId: string,
  roundIndex: number,
  score: number
): TriviaGameState {
  const { totalRounds } = state;

  return {
    ...state,
    teams: state.teams.map((t) => {
      if (t.id !== teamId) return t;

      // Ensure roundScores array is properly sized
      const roundScores = [...t.roundScores];
      while (roundScores.length < totalRounds) {
        roundScores.push(0);
      }

      // Set score for specific round
      roundScores[roundIndex] = Math.max(0, score);

      // Compute total from all round scores
      const totalScore = roundScores.reduce((sum, rs) => sum + rs, 0);

      return { ...t, roundScores, score: totalScore };
    }),
  };
}

// =============================================================================
// SELECTORS (computed values)
// =============================================================================

export function getSelectedQuestion(state: TriviaGameState) {
  return state.questions[state.selectedQuestionIndex] || null;
}

export function getDisplayQuestion(state: TriviaGameState) {
  if (state.displayQuestionIndex === null) return null;
  return state.questions[state.displayQuestionIndex] || null;
}

export function getProgress(state: TriviaGameState): string {
  const current = state.selectedQuestionIndex + 1;
  const total = state.questions.length;
  return `Question ${current} of ${total}`;
}

export function canStartGame(state: TriviaGameState): boolean {
  return state.status === 'setup' && state.teams.length > 0;
}

export function isGameOver(state: TriviaGameState): boolean {
  return state.status === 'ended';
}

// =============================================================================
// ROUND MANAGEMENT
// =============================================================================

/**
 * Get questions for the current round
 */
export function getCurrentRoundQuestions(state: TriviaGameState): Question[] {
  return state.questions.filter(q => q.roundIndex === state.currentRound);
}

/**
 * Get questions for a specific round
 */
export function getQuestionsForRound(state: TriviaGameState, roundIndex: number): Question[] {
  return state.questions.filter(q => q.roundIndex === roundIndex);
}

/**
 * Get round progress string (e.g., "Round 1 of 3")
 */
export function getRoundProgress(state: TriviaGameState): string {
  return `Round ${state.currentRound + 1} of ${state.totalRounds}`;
}

/**
 * Get question-in-round progress (e.g., "Question 2 of 5")
 */
export function getQuestionInRoundProgress(state: TriviaGameState): string {
  const roundQuestions = getCurrentRoundQuestions(state);
  const currentQuestion = state.questions[state.selectedQuestionIndex];

  if (!currentQuestion) return 'Question 0 of 0';

  const questionInRound = roundQuestions.findIndex(q => q.id === currentQuestion.id);
  return `Question ${questionInRound + 1} of ${roundQuestions.length}`;
}

/**
 * Check if the current question is the last question of the current round
 */
export function isLastQuestionOfRound(state: TriviaGameState): boolean {
  const roundQuestions = getCurrentRoundQuestions(state);
  const currentQuestion = state.questions[state.selectedQuestionIndex];

  if (!currentQuestion || roundQuestions.length === 0) return false;

  const lastQuestion = roundQuestions[roundQuestions.length - 1];
  return currentQuestion.id === lastQuestion.id;
}

/**
 * Check if the current round is the last round
 */
export function isLastRound(state: TriviaGameState): boolean {
  return state.currentRound >= state.totalRounds - 1;
}

/**
 * Complete the current round and transition to between_rounds status
 */
export function completeRound(state: TriviaGameState): TriviaGameState {
  if (state.status !== 'playing') return state;

  return {
    ...state,
    status: 'between_rounds',
    displayQuestionIndex: null,
  };
}

/**
 * Advance to the next round or end the game if on last round
 */
export function nextRound(state: TriviaGameState): TriviaGameState {
  if (state.status !== 'between_rounds') return state;

  const nextRoundIndex = state.currentRound + 1;

  // If this was the last round, end the game
  if (nextRoundIndex >= state.totalRounds) {
    return {
      ...state,
      status: 'ended',
      displayQuestionIndex: null,
    };
  }

  // Find first question of the next round
  const nextRoundFirstQuestion = state.questions.findIndex(q => q.roundIndex === nextRoundIndex);

  return {
    ...state,
    status: 'playing',
    currentRound: nextRoundIndex,
    selectedQuestionIndex: nextRoundFirstQuestion >= 0 ? nextRoundFirstQuestion : 0,
    displayQuestionIndex: null,
  };
}

/**
 * Get the winning team(s) for a specific round (handles ties)
 */
export function getRoundWinners(state: TriviaGameState, roundIndex: number): Team[] {
  const teamsWithRoundScores = state.teams.filter(
    t => t.roundScores && t.roundScores[roundIndex] !== undefined
  );

  if (teamsWithRoundScores.length === 0) return [];

  const maxRoundScore = Math.max(...teamsWithRoundScores.map(t => t.roundScores[roundIndex] || 0));
  return teamsWithRoundScores.filter(t => (t.roundScores[roundIndex] || 0) === maxRoundScore);
}

/**
 * Get overall leaders (handles ties)
 */
export function getOverallLeaders(state: TriviaGameState): Team[] {
  if (state.teams.length === 0) return [];

  const maxScore = Math.max(...state.teams.map(t => t.score));
  return state.teams.filter(t => t.score === maxScore);
}

/**
 * Get teams sorted by total score (descending)
 */
export function getTeamsSortedByScore(state: TriviaGameState): Team[] {
  return [...state.teams].sort((a, b) => b.score - a.score);
}
