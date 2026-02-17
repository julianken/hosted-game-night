import type { TriviaGameState, Question } from '@/types';
import { deepFreeze } from './helpers';

// =============================================================================
// QUESTION NAVIGATION
// =============================================================================

export function selectQuestion(
  state: TriviaGameState,
  index: number
): TriviaGameState {
  if (index < 0 || index >= state.questions.length) return state;

  return deepFreeze({
    ...state,
    selectedQuestionIndex: index,
  });
}

export function setDisplayQuestion(
  state: TriviaGameState,
  index: number | null
): TriviaGameState {
  if (index !== null && (index < 0 || index >= state.questions.length)) {
    return state;
  }

  return deepFreeze({
    ...state,
    displayQuestionIndex: index,
  });
}

// =============================================================================
// QUESTION IMPORT / EXPORT
// =============================================================================

/**
 * Import questions into the game state.
 * Can either replace existing questions or append to them.
 * Only allowed during setup phase.
 */
export function importQuestions(
  state: TriviaGameState,
  questions: Question[],
  mode: 'replace' | 'append' = 'replace'
): TriviaGameState {
  // Only allow import during setup
  if (state.status !== 'setup') return state;

  if (questions.length === 0) return state;

  let newQuestions: Question[];

  if (mode === 'replace') {
    newQuestions = questions;
  } else {
    // Append mode: add new questions after existing ones
    newQuestions = [...state.questions, ...questions];
  }

  // Calculate total rounds based on question roundIndex values
  const maxRoundIndex = Math.max(...newQuestions.map(q => q.roundIndex));
  const totalRounds = maxRoundIndex + 1;

  return deepFreeze({
    ...state,
    questions: newQuestions,
    totalRounds,
    selectedQuestionIndex: 0,
    displayQuestionIndex: null,
    settings: {
      ...state.settings,
      roundsCount: totalRounds,
    },
  });
}

/**
 * Export questions from the game state.
 * Returns a copy of the questions array.
 */
export function exportQuestionsFromState(state: TriviaGameState): Question[] {
  return [...state.questions];
}

/**
 * Clear all questions from the game state.
 * Only allowed during setup phase.
 */
export function clearQuestions(state: TriviaGameState): TriviaGameState {
  if (state.status !== 'setup') return state;

  return deepFreeze({
    ...state,
    questions: [],
    selectedQuestionIndex: 0,
    displayQuestionIndex: null,
  });
}

/**
 * Add a single question to the game state.
 * Only allowed during setup phase.
 */
export function addQuestion(
  state: TriviaGameState,
  question: Question
): TriviaGameState {
  if (state.status !== 'setup') return state;

  const newQuestions = [...state.questions, question];

  // Update total rounds if needed
  const maxRoundIndex = Math.max(...newQuestions.map(q => q.roundIndex));
  const totalRounds = Math.max(state.totalRounds, maxRoundIndex + 1);

  return deepFreeze({
    ...state,
    questions: newQuestions,
    totalRounds,
    settings: {
      ...state.settings,
      roundsCount: totalRounds,
    },
  });
}

/**
 * Remove a question from the game state by index.
 * Only allowed during setup phase.
 */
export function removeQuestion(
  state: TriviaGameState,
  index: number
): TriviaGameState {
  if (state.status !== 'setup') return state;
  if (index < 0 || index >= state.questions.length) return state;

  const newQuestions = state.questions.filter((_, i) => i !== index);

  // Adjust selected index if needed
  let selectedQuestionIndex = state.selectedQuestionIndex;
  if (selectedQuestionIndex >= newQuestions.length) {
    selectedQuestionIndex = Math.max(0, newQuestions.length - 1);
  }

  return deepFreeze({
    ...state,
    questions: newQuestions,
    selectedQuestionIndex,
    displayQuestionIndex: null,
  });
}

/**
 * Update a question at a specific index.
 * Only allowed during setup phase.
 */
export function updateQuestion(
  state: TriviaGameState,
  index: number,
  question: Question
): TriviaGameState {
  if (state.status !== 'setup') return state;
  if (index < 0 || index >= state.questions.length) return state;

  const newQuestions = state.questions.map((q, i) =>
    i === index ? question : q
  );

  // Update total rounds if needed
  const maxRoundIndex = Math.max(...newQuestions.map(q => q.roundIndex));
  const totalRounds = Math.max(state.totalRounds, maxRoundIndex + 1);

  return deepFreeze({
    ...state,
    questions: newQuestions,
    totalRounds,
    settings: {
      ...state.settings,
      roundsCount: totalRounds,
    },
  });
}
