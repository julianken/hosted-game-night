import type { TriviaGameState, Question } from '@/types';
import { deepFreeze } from './helpers';
import { normalizeCategoryId } from '@/lib/categories';

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

  return deepFreeze({
    ...state,
    questions: newQuestions,
    selectedQuestionIndex: 0,
    displayQuestionIndex: null,
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
 * Reassign each question's `roundIndex` field based on the chosen mode.
 *
 * Only runs during setup and when questions exist. Returns the same state
 * reference when the resulting assignments are already correct (idempotent),
 * so Zustand skips unnecessary re-renders.
 *
 * Modes:
 *   - 'by_count'    : Distribute questions evenly across rounds using ceil(total/rounds).
 *   - 'by_category' : Walk questions in order; each unique (normalized) category
 *                     gets its own round index, assigned on first occurrence.
 *
 * Hard constraint: MUST NOT write settings.roundsCount, totalRounds, or
 * selectedQuestionIndex.
 */
export function redistributeQuestions(
  state: TriviaGameState,
  roundsCount: number,
  mode: 'by_count' | 'by_category'
): TriviaGameState {
  // Guard: only during setup
  if (state.status !== 'setup') return state;
  // Guard: nothing to do when question list is empty
  if (state.questions.length === 0) return state;

  // Compute target roundIndex for every question
  let targetAssignments: number[];

  if (mode === 'by_count') {
    // Distribute questions evenly across roundsCount rounds.
    // perRound = ceil(total / rounds) ensures all rounds are filled,
    // with the last round possibly getting fewer (the remainder).
    const perRound = Math.ceil(state.questions.length / roundsCount);
    targetAssignments = state.questions.map((_, i) =>
      Math.min(Math.floor(i / perRound), roundsCount - 1)
    );
  } else {
    // by_category: allocate rounds to categories, split questions within each.
    // When rounds > categories, categories get multiple rounds with questions
    // distributed evenly across them.

    // 1. Count questions per normalized category
    const catCounts = new Map<string, number>();
    for (const q of state.questions) {
      const key = normalizeCategoryId(q.category);
      catCounts.set(key, (catCounts.get(key) ?? 0) + 1);
    }
    const uniqueCategories = [...catCounts.keys()].sort();
    const numCats = uniqueCategories.length;

    // 2. Build map: category → array of round indices it owns
    const catToRounds = new Map<string, number[]>();

    if (roundsCount < numCats) {
      // Fewer rounds than categories: round-robin (multiple categories share rounds)
      for (let i = 0; i < numCats; i++) {
        catToRounds.set(uniqueCategories[i], [i % roundsCount]);
      }
    } else {
      // Proportional allocation — each category gets ≥1 round, extras go to
      // categories with more questions (largest remainder method / Hamilton's).
      const extraRounds = roundsCount - numCats;
      const totalQ = state.questions.length;

      const allocs = uniqueCategories.map(cat => {
        const ideal = extraRounds > 0 ? (catCounts.get(cat)! / totalQ) * extraRounds : 0;
        return { cat, allocated: 1 + Math.floor(ideal), frac: ideal - Math.floor(ideal) };
      });

      // Distribute leftover rounds by largest fractional part
      let used = allocs.reduce((s, a) => s + a.allocated, 0);
      [...allocs]
        .sort((a, b) =>
          b.frac - a.frac
          || catCounts.get(b.cat)! - catCounts.get(a.cat)!
          || a.cat.localeCompare(b.cat)
        )
        .forEach(entry => {
          if (used < roundsCount) { entry.allocated++; used++; }
        });

      // Assign contiguous round indices in alphabetical category order
      let nextRound = 0;
      for (const cat of uniqueCategories) {
        const n = allocs.find(a => a.cat === cat)!.allocated;
        const indices: number[] = [];
        for (let i = 0; i < n; i++) indices.push(nextRound++);
        catToRounds.set(cat, indices);
      }
    }

    // 3. Assign each question to a round within its category's allocation
    const catIdx = new Map<string, number>();
    targetAssignments = state.questions.map(q => {
      const key = normalizeCategoryId(q.category);
      const rounds = catToRounds.get(key)!;
      if (rounds.length === 1) return rounds[0];

      const idx = catIdx.get(key) ?? 0;
      catIdx.set(key, idx + 1);
      const perRound = Math.ceil(catCounts.get(key)! / rounds.length);
      return rounds[Math.min(Math.floor(idx / perRound), rounds.length - 1)];
    });
  }

  // Idempotency: return the same reference when nothing would change
  if (state.questions.every((q, i) => q.roundIndex === targetAssignments[i])) {
    return state;
  }

  return deepFreeze({
    ...state,
    questions: state.questions.map((q, i) =>
      q.roundIndex === targetAssignments[i]
        ? q
        : { ...q, roundIndex: targetAssignments[i] }
    ),
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

  return deepFreeze({
    ...state,
    questions: newQuestions,
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

  return deepFreeze({
    ...state,
    questions: newQuestions,
  });
}
