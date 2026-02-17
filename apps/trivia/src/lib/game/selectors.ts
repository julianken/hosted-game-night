import type { TriviaGameState, Team, Question } from '@/types';

// =============================================================================
// SELECTORS (computed values)
// =============================================================================

export function getSelectedQuestion(state: TriviaGameState): Question | null {
  return state.questions[state.selectedQuestionIndex] || null;
}

export function getDisplayQuestion(state: TriviaGameState): Question | null {
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

/**
 * Get questions for the current round.
 */
export function getCurrentRoundQuestions(state: TriviaGameState): Question[] {
  return state.questions.filter(q => q.roundIndex === state.currentRound);
}

/**
 * Get questions for a specific round.
 */
export function getQuestionsForRound(state: TriviaGameState, roundIndex: number): Question[] {
  return state.questions.filter(q => q.roundIndex === roundIndex);
}

/**
 * Get round progress string (e.g., "Round 1 of 3").
 */
export function getRoundProgress(state: TriviaGameState): string {
  return `Round ${state.currentRound + 1} of ${state.totalRounds}`;
}

/**
 * Get question-in-round progress (e.g., "Question 2 of 5").
 */
export function getQuestionInRoundProgress(state: TriviaGameState): string {
  const roundQuestions = getCurrentRoundQuestions(state);
  const currentQuestion = state.questions[state.selectedQuestionIndex];

  if (!currentQuestion) return 'Question 0 of 0';

  const questionInRound = roundQuestions.findIndex(q => q.id === currentQuestion.id);
  return `Question ${questionInRound + 1} of ${roundQuestions.length}`;
}

/**
 * Check if the current question is the last question of the current round.
 */
export function isLastQuestionOfRound(state: TriviaGameState): boolean {
  const roundQuestions = getCurrentRoundQuestions(state);
  const currentQuestion = state.questions[state.selectedQuestionIndex];

  if (!currentQuestion || roundQuestions.length === 0) return false;

  const lastQuestion = roundQuestions[roundQuestions.length - 1];
  return currentQuestion.id === lastQuestion.id;
}

/**
 * Check if the current round is the last round.
 */
export function isLastRound(state: TriviaGameState): boolean {
  return state.currentRound >= state.totalRounds - 1;
}

/**
 * Get the winning team(s) for a specific round (handles ties).
 */
export function getRoundScores(state: TriviaGameState, roundIndex: number): Map<string, number> {
  const scores = new Map<string, number>();
  for (const team of state.teams) {
    scores.set(team.id, team.roundScores[roundIndex] || 0);
  }
  return scores;
}

/**
 * Get a specific team's score for a specific round.
 */
export function getTeamRoundScore(
  state: TriviaGameState,
  teamId: string,
  roundIndex: number
): number {
  const team = state.teams.find(t => t.id === teamId);
  if (!team) return 0;
  return team.roundScores[roundIndex] || 0;
}

/**
 * Get overall leaders (handles ties).
 */
export function getOverallLeaders(state: TriviaGameState): Team[] {
  if (state.teams.length === 0) return [];

  const maxScore = Math.max(...state.teams.map(t => t.score));
  return state.teams.filter(t => t.score === maxScore);
}

/**
 * Get teams sorted by total score (descending).
 */
export function getTeamsSortedByScore(state: TriviaGameState): Team[] {
  return [...state.teams].sort((a, b) => b.score - a.score);
}

/**
 * Toggle scoreboard visibility for audience display.
 */
export function toggleScoreboard(state: TriviaGameState): TriviaGameState {
  return {
    ...state,
    showScoreboard: !state.showScoreboard,
  };
}
