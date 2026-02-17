import type { TriviaGameState, TeamAnswer } from '@/types';
import { deepFreeze, padRoundScores } from './helpers';

// =============================================================================
// SCORE MANAGEMENT
// =============================================================================

export function adjustTeamScore(
  state: TriviaGameState,
  teamId: string,
  delta: number
): TriviaGameState {
  const { currentRound, totalRounds } = state;

  return deepFreeze({
    ...state,
    teams: state.teams.map((t) => {
      if (t.id !== teamId) return t;

      const roundScores = padRoundScores(t.roundScores, totalRounds);

      // Adjust score for current round
      roundScores[currentRound] = Math.max(0, (roundScores[currentRound] || 0) + delta);

      // Compute total from all round scores
      const score = roundScores.reduce((sum, rs) => sum + rs, 0);

      return { ...t, roundScores, score };
    }),
  });
}

export function setTeamScore(
  state: TriviaGameState,
  teamId: string,
  score: number
): TriviaGameState {
  const { currentRound, totalRounds } = state;

  return deepFreeze({
    ...state,
    teams: state.teams.map((t) => {
      if (t.id !== teamId) return t;

      const roundScores = padRoundScores(t.roundScores, totalRounds);

      // Calculate delta from current total to new score
      const currentTotal = roundScores.reduce((sum, rs) => sum + rs, 0);
      const otherRoundsTotal = currentTotal - (roundScores[currentRound] || 0);

      // Set this round's score to achieve the desired total
      roundScores[currentRound] = Math.max(0, score - otherRoundsTotal);

      return { ...t, roundScores, score: Math.max(0, score) };
    }),
  });
}

/**
 * Set score specifically for a round.
 */
export function setTeamRoundScore(
  state: TriviaGameState,
  teamId: string,
  roundIndex: number,
  score: number
): TriviaGameState {
  const { totalRounds } = state;

  return deepFreeze({
    ...state,
    teams: state.teams.map((t) => {
      if (t.id !== teamId) return t;

      const roundScores = padRoundScores(t.roundScores, totalRounds);

      // Set score for specific round
      roundScores[roundIndex] = Math.max(0, score);

      // Compute total from all round scores
      const totalScore = roundScores.reduce((sum, rs) => sum + rs, 0);

      return { ...t, roundScores, score: totalScore };
    }),
  });
}

// =============================================================================
// ANSWER MANAGEMENT
// =============================================================================

/**
 * Record a team's answer for a question.
 */
export function recordTeamAnswer(
  state: TriviaGameState,
  teamId: string,
  questionId: string,
  answer: string,
  pointsAwarded: number
): TriviaGameState {
  const question = state.questions.find(q => q.id === questionId);
  if (!question) return state;

  const isCorrect = question.correctAnswers.includes(answer);

  // Remove any existing answer for this team/question combination
  const filteredAnswers = state.teamAnswers.filter(
    ta => !(ta.teamId === teamId && ta.questionId === questionId)
  );

  const newAnswer: TeamAnswer = {
    teamId,
    questionId,
    answer,
    isCorrect,
    pointsAwarded,
  };

  return deepFreeze({
    ...state,
    teamAnswers: [...filteredAnswers, newAnswer],
  });
}

/**
 * Amend correct answers for a question and recalculate all affected team scores.
 */
export function amendCorrectAnswers(
  state: TriviaGameState,
  questionIndex: number,
  newCorrectAnswers: string[]
): TriviaGameState {
  if (questionIndex < 0 || questionIndex >= state.questions.length) {
    return state;
  }

  const question = state.questions[questionIndex];
  const questionId = question.id;
  const roundIndex = question.roundIndex;

  // Update the question's correct answers
  const updatedQuestions = state.questions.map((q, idx) =>
    idx === questionIndex ? { ...q, correctAnswers: newCorrectAnswers } : q
  );

  // Calculate score adjustments per team
  const scoreAdjustments = new Map<string, number>();

  const updatedTeamAnswers = state.teamAnswers.map(ta => {
    if (ta.questionId !== questionId) return ta;

    const wasCorrect = ta.isCorrect;
    const isNowCorrect = newCorrectAnswers.includes(ta.answer);

    if (wasCorrect === isNowCorrect) {
      // No change
      return ta;
    }

    if (!wasCorrect && isNowCorrect) {
      // Was wrong, now correct — add points
      const currentAdjustment = scoreAdjustments.get(ta.teamId) || 0;
      scoreAdjustments.set(ta.teamId, currentAdjustment + ta.pointsAwarded);
    } else if (wasCorrect && !isNowCorrect) {
      // Was correct, now wrong — remove points
      const currentAdjustment = scoreAdjustments.get(ta.teamId) || 0;
      scoreAdjustments.set(ta.teamId, currentAdjustment - ta.pointsAwarded);
    }

    return {
      ...ta,
      isCorrect: isNowCorrect,
    };
  });

  // Apply score adjustments to teams
  const updatedTeams = state.teams.map(team => {
    const adjustment = scoreAdjustments.get(team.id);
    if (!adjustment) return team;

    // Ensure roundScores array is properly sized
    const roundScores = [...team.roundScores];
    while (roundScores.length <= roundIndex) {
      roundScores.push(0);
    }

    // Apply adjustment to the round score
    roundScores[roundIndex] = Math.max(0, (roundScores[roundIndex] || 0) + adjustment);

    // Recalculate total score
    const score = roundScores.reduce((sum, rs) => sum + rs, 0);

    return { ...team, roundScores, score };
  });

  return deepFreeze({
    ...state,
    questions: updatedQuestions,
    teamAnswers: updatedTeamAnswers,
    teams: updatedTeams,
  });
}
