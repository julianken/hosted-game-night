/**
 * Scene transition orchestrator — extracted from advanceScene() in game-store.ts.
 *
 * This module contains the pure logic for computing the next scene state given
 * the current game state and a trigger string. It does NOT call Zustand's set()
 * or get() — the store action remains the thin orchestrator that reads state,
 * calls this function, and applies the result.
 *
 * All functions are pure: they receive state as arguments and return partial
 * state updates (or null for no-ops).
 */

import type { TriviaGameState, AudienceScene, Question } from '@/types';
import { REVEAL_TIMING } from '@/types/audience-scene';
import {
  getNextScene,
  buildSceneUpdate,
  type SceneTransitionContext,
} from './scene';
import { completeRound as completeRoundEngine } from './rounds';
import { nextRound as nextRoundEngine } from './rounds';
import { endGame as endGameEngine } from './lifecycle';
import { computeScoreDeltas } from './scoring';

// =============================================================================
// REVEAL LOCK — module-level guard
// =============================================================================

let revealLockUntil = 0;

/** @internal Exported for testing only. Arms the reveal lock. */
export function armRevealLock(): void {
  revealLockUntil = Date.now() + REVEAL_TIMING.POST_REVEAL_LOCK_MS;
}

function isRevealLocked(): boolean {
  return Date.now() < revealLockUntil;
}

/** Clear the reveal lock. Call on game reset so a stale lock cannot block a fresh game. */
export function clearRevealLock(): void {
  revealLockUntil = 0;
}

/** Advancement triggers that are blocked during the reveal lock window. */
const ADVANCEMENT_TRIGGERS = new Set(['advance', 'skip', 'next_round', 'close']);

// =============================================================================
// TYPES
// =============================================================================

/**
 * The result of orchestrateSceneTransition(). Contains a partial state update
 * to be applied via Zustand's set(), or null if no transition should occur.
 */
export type SceneTransitionResult = Partial<TriviaGameState> | null;

/**
 * Derived context computed from the current state, used internally by the
 * transition logic. Exposed for testing convenience.
 */
export interface DerivedTransitionContext {
  /** Questions belonging to the current round. */
  roundQuestions: Question[];
  /** Index of the current display question within roundQuestions (0-based), or -1. */
  currentRoundQIndex: number;
  /** True if the current display question is the last in the round. */
  isLastQuestion: boolean;
  /** True if the current round is the last round. */
  isLastRound: boolean;
}

// =============================================================================
// CONTEXT DERIVATION
// =============================================================================

/**
 * Derive the transition context from the current game state.
 * Pure function — no side effects.
 */
export function deriveTransitionContext(
  state: TriviaGameState
): DerivedTransitionContext {
  const roundQuestions = state.questions.filter(
    (q) => q.roundIndex === state.currentRound
  );
  const displayIdx = state.displayQuestionIndex;
  const currentRoundQIndex =
    displayIdx !== null
      ? roundQuestions.findIndex(
          (q) => state.questions.indexOf(q) === displayIdx
        )
      : -1;
  const isLastQuestion =
    currentRoundQIndex >= 0 &&
    currentRoundQIndex >= roundQuestions.length - 1;
  const isLastRound = state.currentRound >= state.totalRounds - 1;

  return { roundQuestions, currentRoundQIndex, isLastQuestion, isLastRound };
}

// =============================================================================
// RECAP Q/A CYCLING
// =============================================================================

/**
 * Handle recap_qa internal navigation (back, question face flip, answer advance).
 * Returns a partial state update, or null if this handler does not apply.
 *
 * recap_qa has three internal advance paths that the state machine cannot
 * express (it only knows the terminal case: last answer -> recap_scores).
 */
function handleRecapQaCycling(
  state: TriviaGameState,
  trigger: string,
  ctx: DerivedTransitionContext
): SceneTransitionResult {
  if (state.audienceScene !== 'recap_qa') return null;

  const { roundQuestions, currentRoundQIndex, isLastQuestion } = ctx;

  // 1. BACK: decrement displayQuestionIndex if not at first question of round.
  if (trigger === 'back') {
    if (currentRoundQIndex > 0) {
      const prevQIndex = currentRoundQIndex - 1;
      const globalIndex = state.questions.indexOf(roundQuestions[prevQIndex]);
      return {
        displayQuestionIndex: globalIndex,
        selectedQuestionIndex: globalIndex,
        recapShowingAnswer: false,
        sceneTimestamp: Date.now(),
      };
    }
    // At Q1, back goes to recap_title
    return {
      ...buildSceneUpdate('recap_title'),
      recapShowingAnswer: null,
    };
  }

  // 2. ADVANCE + showing question face: flip to answer face.
  if (trigger === 'advance' && state.recapShowingAnswer !== true) {
    return { recapShowingAnswer: true, sceneTimestamp: Date.now() };
  }

  // 3. ADVANCE + showing answer face + not last question: advance to next Q.
  if (
    trigger === 'advance' &&
    state.recapShowingAnswer === true &&
    !isLastQuestion
  ) {
    const nextQIndex = currentRoundQIndex + 1;
    if (nextQIndex < roundQuestions.length) {
      const globalIndex = state.questions.indexOf(roundQuestions[nextQIndex]);
      return {
        displayQuestionIndex: globalIndex,
        selectedQuestionIndex: globalIndex,
        recapShowingAnswer: false,
        sceneTimestamp: Date.now(),
      };
    }
  }

  // 4. ADVANCE + showing answer face + last question: fall through to state machine.
  return null;
}

// =============================================================================
// ANSWER REVEAL CYCLING
// =============================================================================

/**
 * Handle answer_reveal question cycling during between_rounds.
 * Returns a partial state update, or null if this handler does not apply.
 */
function handleAnswerRevealCycling(
  state: TriviaGameState,
  trigger: string,
  ctx: DerivedTransitionContext
): SceneTransitionResult {
  if (
    state.audienceScene !== 'answer_reveal' ||
    state.status !== 'between_rounds' ||
    (trigger !== 'advance' && trigger !== 'skip')
  ) {
    return null;
  }

  const { roundQuestions, currentRoundQIndex, isLastQuestion } = ctx;

  if (!isLastQuestion) {
    const nextQIndex = currentRoundQIndex + 1;
    if (nextQIndex < roundQuestions.length) {
      const globalIndex = state.questions.indexOf(roundQuestions[nextQIndex]);
      return {
        displayQuestionIndex: globalIndex,
        selectedQuestionIndex: globalIndex,
        sceneTimestamp: Date.now(),
        revealPhase: null,
      };
    }
  }

  // Last question: fall through to state machine (getNextScene handles it)
  return null;
}

// =============================================================================
// STATE MACHINE SIDE EFFECTS
// =============================================================================

/**
 * Apply side effects for a state machine transition.
 * Called after getNextScene() returns a valid next scene.
 * Returns the partial state update to apply.
 */
function applyTransitionSideEffects(
  state: TriviaGameState,
  nextScene: AudienceScene,
  ctx: DerivedTransitionContext
): Partial<TriviaGameState> {
  const { roundQuestions } = ctx;

  // Side effect: completeRound when question_closed -> round_summary (last Q).
  if (
    state.audienceScene === 'question_closed' &&
    nextScene === 'round_summary'
  ) {
    const baseUpdate = completeRoundEngine(state);

    const prevScores = state.questionStartScores ?? {};
    const updatedTeams = baseUpdate.teams ?? state.teams;
    const deltas = computeScoreDeltas(updatedTeams, prevScores);

    return {
      ...baseUpdate,
      ...buildSceneUpdate(nextScene),
      scoreDeltas: [...deltas],
    };
  }

  // Side effect: start answer review when round_summary -> answer_reveal.
  if (
    state.audienceScene === 'round_summary' &&
    nextScene === 'answer_reveal'
  ) {
    const firstQ = roundQuestions[0];
    const globalIndex = firstQ ? state.questions.indexOf(firstQ) : 0;
    armRevealLock();
    return {
      ...buildSceneUpdate(nextScene),
      displayQuestionIndex: globalIndex,
      selectedQuestionIndex: globalIndex,
      revealPhase: null,
    };
  }

  // Side effect: Path A backward — recap_title -> round_summary, clear recap state.
  if (state.audienceScene === 'recap_title' && nextScene === 'round_summary') {
    return {
      ...buildSceneUpdate(nextScene),
      recapShowingAnswer: null,
    };
  }

  // Side effect: seed recap_title — point displayQuestionIndex at first round Q.
  if (nextScene === 'recap_title') {
    const firstQ = roundQuestions[0];
    const globalIndex = firstQ ? state.questions.indexOf(firstQ) : 0;
    return {
      ...buildSceneUpdate(nextScene),
      displayQuestionIndex: globalIndex,
      selectedQuestionIndex: globalIndex,
      recapShowingAnswer: null,
    };
  }

  // Side effect: seed recap_qa — origin-aware entry.
  if (nextScene === 'recap_qa') {
    // Path C: backward entry from recap_scores — show last question with answer face.
    if (state.audienceScene === 'recap_scores') {
      const lastQ = roundQuestions[roundQuestions.length - 1];
      const globalIndex = lastQ ? state.questions.indexOf(lastQ) : 0;
      return {
        ...buildSceneUpdate(nextScene),
        displayQuestionIndex: globalIndex,
        selectedQuestionIndex: globalIndex,
        recapShowingAnswer: true,
      };
    }
    // Forward entry from recap_title — start on question face.
    return {
      ...buildSceneUpdate(nextScene),
      recapShowingAnswer: false,
    };
  }

  // Side effect: seed recap_scores — clear recapShowingAnswer sub-state.
  if (nextScene === 'recap_scores') {
    return {
      ...buildSceneUpdate(nextScene),
      recapShowingAnswer: null,
    };
  }

  // Side effect: endGame when transitioning to final_buildup.
  if (nextScene === 'final_buildup') {
    const baseUpdate = endGameEngine(state);
    return {
      ...baseUpdate,
      ...buildSceneUpdate(nextScene),
    };
  }

  // Side effect: nextRound when transitioning to round_intro from between_rounds.
  if (nextScene === 'round_intro' && state.status === 'between_rounds') {
    return {
      ...nextRoundEngine(state),
      ...buildSceneUpdate(nextScene),
    };
  }

  // Side effect: auto-show question when entering question_anticipation.
  if (nextScene === 'question_anticipation') {
    if (state.audienceScene === 'question_closed') {
      // From question_closed: advance to the next question in the round
      const nextQIndex = ctx.currentRoundQIndex + 1;
      if (nextQIndex < roundQuestions.length) {
        const globalIndex = state.questions.indexOf(
          roundQuestions[nextQIndex]
        );
        return {
          ...buildSceneUpdate(nextScene),
          selectedQuestionIndex: globalIndex,
          displayQuestionIndex: globalIndex,
        };
      }
    }
    // Default: show the currently selected question
    return {
      ...buildSceneUpdate(nextScene),
      displayQuestionIndex: state.selectedQuestionIndex,
    };
  }

  // Default: just the scene update, no side effects.
  return buildSceneUpdate(nextScene);
}

// =============================================================================
// MAIN ORCHESTRATOR
// =============================================================================

/**
 * Orchestrate a scene transition given the current state and a trigger.
 *
 * This is the pure-function equivalent of the advanceScene() store action.
 * It returns a partial state update to apply via set(), or null for a no-op.
 *
 * The function handles three layers in order:
 *   1. Recap Q/A internal cycling (back, flip, advance within recap_qa)
 *   2. Answer reveal question cycling (between_rounds advance/skip)
 *   3. State machine transition via getNextScene() + side effects
 */
export function orchestrateSceneTransition(
  state: TriviaGameState,
  trigger: string
): SceneTransitionResult {
  // Reveal lock guard: block advancement triggers during the 1.1s reveal choreography.
  if (isRevealLocked() && ADVANCEMENT_TRIGGERS.has(trigger)) {
    return null; // Silent rejection
  }

  const ctx = deriveTransitionContext(state);

  // Layer 1: Recap Q/A cycling
  const recapResult = handleRecapQaCycling(state, trigger, ctx);
  if (recapResult !== null) {
    return recapResult;
  }

  // Layer 2: Answer reveal cycling
  const answerRevealResult = handleAnswerRevealCycling(state, trigger, ctx);
  if (answerRevealResult !== null) {
    return answerRevealResult;
  }

  // Layer 3: State machine
  const sceneContext: SceneTransitionContext = {
    isLastQuestion: ctx.isLastQuestion,
    isLastRound: ctx.isLastRound,
  };
  const nextScene = getNextScene(state.audienceScene, trigger, sceneContext);

  if (nextScene && nextScene !== state.audienceScene) {
    return applyTransitionSideEffects(state, nextScene, ctx);
  }

  // No valid transition — no-op.
  return null;
}
