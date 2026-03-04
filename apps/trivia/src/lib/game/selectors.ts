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

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export type ValidationSeverity = 'block' | 'warn';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  message: string;
  roundIndex?: number;
}

export interface GameSetupValidation {
  canStart: boolean;
  issues: ValidationIssue[];
  blockCount: number;
  warnCount: number;
}

// =============================================================================
// GAME SETUP VALIDATION
// =============================================================================

export function validateGameSetup(state: TriviaGameState): GameSetupValidation {
  const issues: ValidationIssue[] = [];

  // V1 BLOCK: No questions loaded at all
  if (state.questions.length === 0) {
    issues.push({ id: 'V1', severity: 'block', message: 'No questions loaded' });
  } else {
    // V2 BLOCK: Round 0 has zero questions
    if (getQuestionsForRound(state, 0).length === 0) {
      issues.push({ id: 'V2', severity: 'block', message: 'Round 1 has no questions', roundIndex: 0 });
    }

    // V3 BLOCK: Any round has zero questions
    for (let i = 1; i < state.settings.roundsCount; i++) {
      if (getQuestionsForRound(state, i).length === 0) {
        issues.push({ id: 'V3', severity: 'block', message: `Round ${i + 1} has no questions`, roundIndex: i });
      }
    }
  }

  // V4 BLOCK: No teams added
  if (state.teams.length === 0) {
    issues.push({ id: 'V4', severity: 'block', message: 'No teams added' });
  }

  // V5 WARN: Timer duration very short
  if (state.settings.timerDuration < 10) {
    issues.push({ id: 'V5', severity: 'warn', message: 'Timer duration is very short' });
  }

  // V6 WARN: Per-round question count mismatch
  if (state.questions.length > 0) {
    for (let i = 0; i < state.settings.roundsCount; i++) {
      const actual = getQuestionsForRound(state, i).length;
      const expected = state.settings.questionsPerRound;
      if (actual !== expected && actual > 0) {
        issues.push({
          id: 'V6',
          severity: 'warn',
          message: `Round ${i + 1} has ${actual} questions but ${expected} are configured`,
          roundIndex: i,
        });
      }
    }
  }

  // V7 WARN: Only one team
  if (state.teams.length === 1) {
    issues.push({ id: 'V7', severity: 'warn', message: 'Only one team — consider adding more' });
  }

  const blockCount = issues.filter(i => i.severity === 'block').length;
  const warnCount = issues.filter(i => i.severity === 'warn').length;

  return { canStart: blockCount === 0, issues, blockCount, warnCount };
}

export function canStartGame(state: TriviaGameState): boolean {
  return state.status === 'setup' && validateGameSetup(state).canStart;
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
