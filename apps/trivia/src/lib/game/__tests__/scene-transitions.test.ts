import { describe, it, expect, vi } from 'vitest';
import {
  orchestrateSceneTransition,
  deriveTransitionContext,
} from '../scene-transitions';
import { createInitialState, startGame } from '../lifecycle';
import { addTeam } from '../teams';
import { completeRound } from '../rounds';
import type { TriviaGameState, AudienceScene } from '@/types';

// Mock uuid for predictable test values
vi.mock('uuid', () => ({
  v4: vi.fn(() => `test-uuid-${Date.now()}`),
}));

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create a test state with a team, started game, and questions.
 * By default: 3 rounds, 5 questions per round = 15 questions total.
 */
function createPlayingState(): TriviaGameState {
  let state = createInitialState();
  state = addTeam(state, 'Team A');
  state = startGame(state);
  return state;
}

/**
 * Create a between_rounds state with the given scene.
 */
function createBetweenRoundsState(
  scene: AudienceScene = 'round_summary'
): TriviaGameState {
  let state = createPlayingState();
  state = completeRound(state);
  return { ...state, audienceScene: scene };
}

/**
 * Get the global indices of questions for a given round.
 */
function getRoundQuestionIndices(
  state: TriviaGameState,
  round: number
): number[] {
  const roundQs = state.questions.filter((q) => q.roundIndex === round);
  return roundQs.map((q) => state.questions.indexOf(q));
}

// =============================================================================
// deriveTransitionContext()
// =============================================================================

describe('deriveTransitionContext()', () => {
  it('should compute round questions for the current round', () => {
    const state = createPlayingState();
    const ctx = deriveTransitionContext(state);

    // Default settings: 5 questions per round, 3 rounds
    expect(ctx.roundQuestions.length).toBe(5);
    expect(ctx.roundQuestions.every((q) => q.roundIndex === 0)).toBe(true);
  });

  it('should identify currentRoundQIndex from displayQuestionIndex', () => {
    const state = createPlayingState();
    const indices = getRoundQuestionIndices(state, 0);

    // Point to second question of round 0
    const modified = { ...state, displayQuestionIndex: indices[1] };
    const ctx = deriveTransitionContext(modified);

    expect(ctx.currentRoundQIndex).toBe(1);
  });

  it('should return -1 for currentRoundQIndex when displayQuestionIndex is null', () => {
    const state = createPlayingState();
    const ctx = deriveTransitionContext(state);

    // displayQuestionIndex is null after startGame
    expect(state.displayQuestionIndex).toBeNull();
    expect(ctx.currentRoundQIndex).toBe(-1);
  });

  it('should detect isLastQuestion correctly', () => {
    const state = createPlayingState();
    const indices = getRoundQuestionIndices(state, 0);
    const lastIdx = indices[indices.length - 1];

    const ctx = deriveTransitionContext({
      ...state,
      displayQuestionIndex: lastIdx,
    });

    expect(ctx.isLastQuestion).toBe(true);
  });

  it('should detect isLastQuestion=false for non-last question', () => {
    const state = createPlayingState();
    const indices = getRoundQuestionIndices(state, 0);

    const ctx = deriveTransitionContext({
      ...state,
      displayQuestionIndex: indices[0],
    });

    expect(ctx.isLastQuestion).toBe(false);
  });

  it('should detect isLastRound correctly', () => {
    const state = createPlayingState();
    // totalRounds=3, so currentRound=2 is the last round
    const ctx = deriveTransitionContext({
      ...state,
      currentRound: 2,
    });

    expect(ctx.isLastRound).toBe(true);
  });

  it('should detect isLastRound=false for non-last round', () => {
    const state = createPlayingState();
    const ctx = deriveTransitionContext(state);

    expect(state.currentRound).toBe(0);
    expect(ctx.isLastRound).toBe(false);
  });
});

// =============================================================================
// orchestrateSceneTransition() — Recap Q/A cycling
// =============================================================================

describe('orchestrateSceneTransition() — recap_qa cycling', () => {
  function setupRecapQa(opts: {
    displayAtRoundQIndex: number;
    recapShowingAnswer: boolean | null;
  }): TriviaGameState {
    const state = createBetweenRoundsState('recap_qa');
    const indices = getRoundQuestionIndices(state, 0);
    return {
      ...state,
      displayQuestionIndex: indices[opts.displayAtRoundQIndex],
      selectedQuestionIndex: indices[opts.displayAtRoundQIndex],
      recapShowingAnswer: opts.recapShowingAnswer,
    };
  }

  describe('BACK trigger', () => {
    it('should decrement to previous question and reset recapShowingAnswer', () => {
      const state = setupRecapQa({
        displayAtRoundQIndex: 2,
        recapShowingAnswer: true,
      });
      const indices = getRoundQuestionIndices(state, 0);

      const result = orchestrateSceneTransition(state, 'back');

      expect(result).not.toBeNull();
      expect(result!.displayQuestionIndex).toBe(indices[1]);
      expect(result!.selectedQuestionIndex).toBe(indices[1]);
      expect(result!.recapShowingAnswer).toBe(false);
    });

    it('should be a no-op at the first question', () => {
      const state = setupRecapQa({
        displayAtRoundQIndex: 0,
        recapShowingAnswer: false,
      });

      const result = orchestrateSceneTransition(state, 'back');

      // Returns empty object (handled but no-op)
      expect(result).toEqual({});
    });
  });

  describe('ADVANCE — question face', () => {
    it('should flip recapShowingAnswer to true when on question face (false)', () => {
      const state = setupRecapQa({
        displayAtRoundQIndex: 0,
        recapShowingAnswer: false,
      });

      const result = orchestrateSceneTransition(state, 'advance');

      expect(result).not.toBeNull();
      expect(result!.recapShowingAnswer).toBe(true);
      expect(result!.audienceScene).toBeUndefined(); // Scene doesn't change
    });

    it('should flip recapShowingAnswer to true when null (initial entry)', () => {
      const state = setupRecapQa({
        displayAtRoundQIndex: 0,
        recapShowingAnswer: null,
      });

      const result = orchestrateSceneTransition(state, 'advance');

      expect(result).not.toBeNull();
      expect(result!.recapShowingAnswer).toBe(true);
    });
  });

  describe('ADVANCE — answer face, not last question', () => {
    it('should advance to next question and reset recapShowingAnswer', () => {
      const state = setupRecapQa({
        displayAtRoundQIndex: 1,
        recapShowingAnswer: true,
      });
      const indices = getRoundQuestionIndices(state, 0);

      const result = orchestrateSceneTransition(state, 'advance');

      expect(result).not.toBeNull();
      expect(result!.displayQuestionIndex).toBe(indices[2]);
      expect(result!.selectedQuestionIndex).toBe(indices[2]);
      expect(result!.recapShowingAnswer).toBe(false);
    });
  });

  describe('ADVANCE — answer face, last question', () => {
    it('should transition to recap_scores', () => {
      const state = setupRecapQa({
        displayAtRoundQIndex: 4, // last question (0-based, 5 questions)
        recapShowingAnswer: true,
      });

      const result = orchestrateSceneTransition(state, 'advance');

      expect(result).not.toBeNull();
      expect(result!.audienceScene).toBe('recap_scores');
      expect(result!.recapShowingAnswer).toBeNull();
    });
  });
});

// =============================================================================
// orchestrateSceneTransition() — Answer reveal cycling
// =============================================================================

describe('orchestrateSceneTransition() — answer_reveal cycling', () => {
  function setupAnswerReview(displayAtRoundQIndex: number): TriviaGameState {
    const state = createBetweenRoundsState('answer_reveal');
    const indices = getRoundQuestionIndices(state, 0);
    return {
      ...state,
      displayQuestionIndex: indices[displayAtRoundQIndex],
      selectedQuestionIndex: indices[displayAtRoundQIndex],
      revealPhase: null,
    };
  }

  it('should cycle to next question on advance when not last question', () => {
    const state = setupAnswerReview(0);
    const indices = getRoundQuestionIndices(state, 0);

    const result = orchestrateSceneTransition(state, 'advance');

    expect(result).not.toBeNull();
    expect(result!.displayQuestionIndex).toBe(indices[1]);
    expect(result!.selectedQuestionIndex).toBe(indices[1]);
    expect(result!.revealPhase).toBeNull();
    expect(result!.audienceScene).toBeUndefined(); // scene unchanged
  });

  it('should cycle to next question on skip when not last question', () => {
    const state = setupAnswerReview(1);
    const indices = getRoundQuestionIndices(state, 0);

    const result = orchestrateSceneTransition(state, 'skip');

    expect(result).not.toBeNull();
    expect(result!.displayQuestionIndex).toBe(indices[2]);
  });

  it('should fall through to state machine on last question (non-last round)', () => {
    const state = setupAnswerReview(4); // last question

    const result = orchestrateSceneTransition(state, 'advance');

    // getNextScene returns round_intro for last question non-last round
    expect(result).not.toBeNull();
    expect(result!.audienceScene).toBe('round_intro');
  });

  it('should fall through to final_buildup on last question of last round', () => {
    let state = setupAnswerReview(4); // last question
    // Set to last round
    const lastRound = state.totalRounds - 1;
    const roundQs = state.questions.filter((q) => q.roundIndex === lastRound);
    const lastQIdx = state.questions.indexOf(roundQs[roundQs.length - 1]);
    state = {
      ...state,
      currentRound: lastRound,
      displayQuestionIndex: lastQIdx,
      selectedQuestionIndex: lastQIdx,
    };

    const result = orchestrateSceneTransition(state, 'advance');

    expect(result).not.toBeNull();
    expect(result!.audienceScene).toBe('final_buildup');
    expect(result!.status).toBe('ended');
  });

  it('should not handle answer_reveal cycling when status is not between_rounds', () => {
    const state = createPlayingState();
    const modState = {
      ...state,
      audienceScene: 'answer_reveal' as AudienceScene,
    };

    // Should fall through to state machine (not cycling handler)
    const result = orchestrateSceneTransition(modState, 'advance');

    // getNextScene returns null for answer_reveal + advance for non-last question
    // when there's no displayQuestionIndex set
    expect(result).toBeNull();
  });
});

// =============================================================================
// orchestrateSceneTransition() — State machine transitions with side effects
// =============================================================================

describe('orchestrateSceneTransition() — state machine transitions', () => {
  describe('question_closed -> round_summary (completeRound)', () => {
    it('should complete the round and compute scoreDeltas', () => {
      const state = createPlayingState();
      const indices = getRoundQuestionIndices(state, 0);
      const lastQIdx = indices[indices.length - 1];

      // Set questionStartScores to detect deltas
      const teamId = state.teams[0].id;
      const modState: TriviaGameState = {
        ...state,
        audienceScene: 'question_closed',
        displayQuestionIndex: lastQIdx,
        selectedQuestionIndex: lastQIdx,
        questionStartScores: { [teamId]: 0 },
        teams: state.teams.map((t) => ({ ...t, score: 3 })),
      };

      const result = orchestrateSceneTransition(modState, 'advance');

      expect(result).not.toBeNull();
      expect(result!.audienceScene).toBe('round_summary');
      expect(result!.status).toBe('between_rounds');
      expect(result!.scoreDeltas).toBeDefined();
      expect(result!.scoreDeltas!.length).toBe(1);
      expect(result!.scoreDeltas![0].delta).toBe(3);
    });
  });

  describe('question_closed -> question_anticipation (non-last question)', () => {
    it('should advance to next question and enter question_anticipation', () => {
      const state = createPlayingState();
      const indices = getRoundQuestionIndices(state, 0);

      const modState: TriviaGameState = {
        ...state,
        audienceScene: 'question_closed',
        displayQuestionIndex: indices[0],
        selectedQuestionIndex: indices[0],
      };

      const result = orchestrateSceneTransition(modState, 'advance');

      expect(result).not.toBeNull();
      expect(result!.audienceScene).toBe('question_anticipation');
      expect(result!.displayQuestionIndex).toBe(indices[1]);
      expect(result!.selectedQuestionIndex).toBe(indices[1]);
    });
  });

  describe('round_summary -> recap_title', () => {
    it('should seed recap_title with first question of round', () => {
      const state = createBetweenRoundsState('round_summary');
      const indices = getRoundQuestionIndices(state, 0);

      const result = orchestrateSceneTransition(state, 'advance');

      expect(result).not.toBeNull();
      expect(result!.audienceScene).toBe('recap_title');
      expect(result!.displayQuestionIndex).toBe(indices[0]);
      expect(result!.selectedQuestionIndex).toBe(indices[0]);
      expect(result!.recapShowingAnswer).toBeNull();
    });
  });

  describe('recap_title -> recap_qa', () => {
    it('should set recapShowingAnswer to false on entry', () => {
      const state = createBetweenRoundsState('recap_title');

      const result = orchestrateSceneTransition(state, 'advance');

      expect(result).not.toBeNull();
      expect(result!.audienceScene).toBe('recap_qa');
      expect(result!.recapShowingAnswer).toBe(false);
    });
  });

  describe('-> recap_scores', () => {
    it('should clear recapShowingAnswer', () => {
      // recap_qa + advance + last question + answer face -> recap_scores
      const state = createBetweenRoundsState('recap_qa');
      const indices = getRoundQuestionIndices(state, 0);
      const lastQIdx = indices[indices.length - 1];

      const modState: TriviaGameState = {
        ...state,
        displayQuestionIndex: lastQIdx,
        selectedQuestionIndex: lastQIdx,
        recapShowingAnswer: true,
      };

      const result = orchestrateSceneTransition(modState, 'advance');

      expect(result).not.toBeNull();
      expect(result!.audienceScene).toBe('recap_scores');
      expect(result!.recapShowingAnswer).toBeNull();
    });
  });

  describe('-> final_buildup (endGame)', () => {
    it('should end the game when transitioning to final_buildup', () => {
      const state = createBetweenRoundsState('recap_scores');
      const lastRound = state.totalRounds - 1;
      const modState = { ...state, currentRound: lastRound };

      const result = orchestrateSceneTransition(modState, 'advance');

      expect(result).not.toBeNull();
      expect(result!.audienceScene).toBe('final_buildup');
      expect(result!.status).toBe('ended');
    });
  });

  describe('-> round_intro (nextRound from between_rounds)', () => {
    it('should advance to next round', () => {
      const state = createBetweenRoundsState('recap_scores');

      const result = orchestrateSceneTransition(state, 'advance');

      expect(result).not.toBeNull();
      expect(result!.audienceScene).toBe('round_intro');
      expect(result!.status).toBe('playing');
      expect(result!.currentRound).toBe(1);
    });
  });

  describe('round_summary -> answer_reveal', () => {
    it('should not transition on advance (advance goes to recap_title)', () => {
      const state = createBetweenRoundsState('round_summary');

      // advance from round_summary goes to recap_title, not answer_reveal
      const result = orchestrateSceneTransition(state, 'advance');

      expect(result).not.toBeNull();
      expect(result!.audienceScene).toBe('recap_title');
    });
  });

  describe('question_anticipation from round_intro', () => {
    it('should show selected question when entering from round_intro (auto)', () => {
      const state = createPlayingState();
      const indices = getRoundQuestionIndices(state, 0);
      const thirdQIdx = indices[2];

      const modState: TriviaGameState = {
        ...state,
        audienceScene: 'round_intro',
        selectedQuestionIndex: thirdQIdx,
      };

      const result = orchestrateSceneTransition(modState, 'auto');

      expect(result).not.toBeNull();
      expect(result!.audienceScene).toBe('question_anticipation');
      expect(result!.displayQuestionIndex).toBe(thirdQIdx);
    });
  });

  describe('game_intro -> round_intro (generic fallthrough)', () => {
    it('should transition with just scene update', () => {
      const state = createPlayingState();
      const modState: TriviaGameState = {
        ...state,
        audienceScene: 'game_intro',
      };

      const result = orchestrateSceneTransition(modState, 'auto');

      expect(result).not.toBeNull();
      expect(result!.audienceScene).toBe('round_intro');
      expect(result!.sceneTimestamp).toBeGreaterThan(0);
    });
  });

  describe('question_display -> question_closed', () => {
    it('should transition on close trigger', () => {
      const state = createPlayingState();
      const indices = getRoundQuestionIndices(state, 0);

      const modState: TriviaGameState = {
        ...state,
        audienceScene: 'question_display',
        displayQuestionIndex: indices[0],
        selectedQuestionIndex: indices[0],
      };

      const result = orchestrateSceneTransition(modState, 'close');

      expect(result).not.toBeNull();
      expect(result!.audienceScene).toBe('question_closed');
    });
  });

  describe('final_buildup -> final_podium', () => {
    it('should transition on auto trigger', () => {
      let state = createPlayingState();
      state = {
        ...state,
        status: 'ended',
        audienceScene: 'final_buildup',
      };

      const result = orchestrateSceneTransition(state, 'auto');

      expect(result).not.toBeNull();
      expect(result!.audienceScene).toBe('final_podium');
    });

    it('should transition on skip trigger', () => {
      let state = createPlayingState();
      state = {
        ...state,
        status: 'ended',
        audienceScene: 'final_buildup',
      };

      const result = orchestrateSceneTransition(state, 'skip');

      expect(result).not.toBeNull();
      expect(result!.audienceScene).toBe('final_podium');
    });
  });
});

// =============================================================================
// orchestrateSceneTransition() — N key (next_round) paths
// =============================================================================

describe('orchestrateSceneTransition() — next_round trigger', () => {
  it('should go to round_intro from round_summary (non-last round)', () => {
    const state = createBetweenRoundsState('round_summary');

    const result = orchestrateSceneTransition(state, 'next_round');

    expect(result).not.toBeNull();
    expect(result!.audienceScene).toBe('round_intro');
    expect(result!.currentRound).toBe(1);
  });

  it('should go to final_buildup from round_summary (last round)', () => {
    const state = createBetweenRoundsState('round_summary');
    const lastRound = state.totalRounds - 1;
    const modState = { ...state, currentRound: lastRound };

    const result = orchestrateSceneTransition(modState, 'next_round');

    expect(result).not.toBeNull();
    expect(result!.audienceScene).toBe('final_buildup');
    expect(result!.status).toBe('ended');
  });

  it('should go to round_intro from recap_title (non-last round)', () => {
    const state = createBetweenRoundsState('recap_title');

    const result = orchestrateSceneTransition(state, 'next_round');

    expect(result).not.toBeNull();
    expect(result!.audienceScene).toBe('round_intro');
  });

  it('should go to round_intro from recap_qa (non-last round)', () => {
    const state = createBetweenRoundsState('recap_qa');

    const result = orchestrateSceneTransition(state, 'next_round');

    expect(result).not.toBeNull();
    expect(result!.audienceScene).toBe('round_intro');
  });

  it('should go to round_intro from recap_scores (non-last round)', () => {
    const state = createBetweenRoundsState('recap_scores');

    const result = orchestrateSceneTransition(state, 'next_round');

    expect(result).not.toBeNull();
    expect(result!.audienceScene).toBe('round_intro');
  });

  it('should go to final_buildup from recap_scores (last round)', () => {
    const state = createBetweenRoundsState('recap_scores');
    const lastRound = state.totalRounds - 1;
    const modState = { ...state, currentRound: lastRound };

    const result = orchestrateSceneTransition(modState, 'next_round');

    expect(result).not.toBeNull();
    expect(result!.audienceScene).toBe('final_buildup');
  });

  it('should skip remaining answers from answer_reveal (non-last round)', () => {
    const state = createBetweenRoundsState('answer_reveal');
    const indices = getRoundQuestionIndices(state, 0);

    const modState = {
      ...state,
      displayQuestionIndex: indices[0],
      selectedQuestionIndex: indices[0],
    };

    const result = orchestrateSceneTransition(modState, 'next_round');

    expect(result).not.toBeNull();
    expect(result!.audienceScene).toBe('round_intro');
  });

  it('should go to final_buildup from answer_reveal (last round)', () => {
    const state = createBetweenRoundsState('answer_reveal');
    const lastRound = state.totalRounds - 1;
    const roundQs = state.questions.filter((q) => q.roundIndex === lastRound);
    const firstQIdx = state.questions.indexOf(roundQs[0]);

    const modState = {
      ...state,
      currentRound: lastRound,
      displayQuestionIndex: firstQIdx,
      selectedQuestionIndex: firstQIdx,
    };

    const result = orchestrateSceneTransition(modState, 'next_round');

    expect(result).not.toBeNull();
    expect(result!.audienceScene).toBe('final_buildup');
  });
});

// =============================================================================
// orchestrateSceneTransition() — No-op paths
// =============================================================================

describe('orchestrateSceneTransition() — no-op paths', () => {
  it('should return null for invalid trigger on waiting scene', () => {
    const state = createPlayingState();
    const modState = { ...state, audienceScene: 'waiting' as AudienceScene };

    const result = orchestrateSceneTransition(modState, 'close');

    expect(result).toBeNull();
  });

  it('should return null for final_podium (terminal state)', () => {
    const state = createPlayingState();
    const modState = {
      ...state,
      status: 'ended' as const,
      audienceScene: 'final_podium' as AudienceScene,
    };

    const result = orchestrateSceneTransition(modState, 'advance');

    expect(result).toBeNull();
  });

  it('should return null for paused scene with non-resume trigger', () => {
    const state = createPlayingState();
    const modState = {
      ...state,
      status: 'paused' as const,
      audienceScene: 'paused' as AudienceScene,
    };

    const result = orchestrateSceneTransition(modState, 'advance');

    expect(result).toBeNull();
  });
});

// =============================================================================
// orchestrateSceneTransition() — Purity checks
// =============================================================================

describe('orchestrateSceneTransition() — purity', () => {
  it('should not mutate the input state', () => {
    const state = createPlayingState();
    const indices = getRoundQuestionIndices(state, 0);
    const lastQIdx = indices[indices.length - 1];

    const modState: TriviaGameState = {
      ...state,
      audienceScene: 'question_closed',
      displayQuestionIndex: lastQIdx,
      selectedQuestionIndex: lastQIdx,
      questionStartScores: { [state.teams[0].id]: 0 },
    };

    // Snapshot before
    const stateBefore = JSON.stringify(modState);

    orchestrateSceneTransition(modState, 'advance');

    // Verify no mutation
    expect(JSON.stringify(modState)).toBe(stateBefore);
  });

  it('should return a new object each time (no cached references)', () => {
    const state = createPlayingState();
    const modState: TriviaGameState = {
      ...state,
      audienceScene: 'game_intro',
    };

    const result1 = orchestrateSceneTransition(modState, 'auto');
    const result2 = orchestrateSceneTransition(modState, 'auto');

    expect(result1).not.toBe(result2);
  });
});
