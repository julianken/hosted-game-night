import { describe, it, expect } from 'vitest';
import type { TriviaGameState, TeamId } from '@/types';
import {
  isSetupState,
  isPlayingState,
  isBetweenRoundsState,
  isEndedState,
  isGameActive,
  isConfigurable,
  assertNever,
  assertSetupState,
  assertPlayingState,
  assertBetweenRoundsState,
  assertEndedState,
} from '../guards';
import {
  DEFAULT_ROUNDS,
  QUESTIONS_PER_ROUND,
  DEFAULT_TIMER_DURATION,
} from '@/types';

// =============================================================================
// FIXTURES
// =============================================================================

function createMockState(overrides?: Partial<TriviaGameState>): TriviaGameState {
  return {
    status: 'setup',
    questions: [],
    selectedQuestionIndex: 0,
    displayQuestionIndex: null,
    currentRound: 0,
    totalRounds: DEFAULT_ROUNDS,
    teams: [],
    teamAnswers: [],
    timer: {
      duration: DEFAULT_TIMER_DURATION,
      remaining: DEFAULT_TIMER_DURATION,
      isRunning: false,
    },
    settings: {
      roundsCount: DEFAULT_ROUNDS,
      questionsPerRound: QUESTIONS_PER_ROUND,
      timerDuration: DEFAULT_TIMER_DURATION,
      timerAutoStart: false,
      timerVisible: true,
      ttsEnabled: false,
    },
    showScoreboard: false,
    emergencyBlank: false,
    ttsEnabled: false,
    // Scene fields
    audienceScene: 'waiting',
    sceneBeforePause: null,
    sceneTimestamp: 0,
    revealPhase: null,
    scoreDeltas: [],
    // Recap sub-state (BEA-587)
    recapShowingAnswer: null,
    // Round start score snapshot (BEA-601)
    questionStartScores: {},
    // Per-round scoring (BEA-662)
    roundScoringEntries: {},
    roundScoringSubmitted: false,
    ...overrides,
  };
}

// =============================================================================
// TYPE GUARD TESTS
// =============================================================================

describe('Type Guards', () => {
  describe('isSetupState', () => {
    it('returns true for setup status', () => {
      const state = createMockState({ status: 'setup' });
      expect(isSetupState(state)).toBe(true);
    });

    it('returns false for non-setup statuses', () => {
      expect(isSetupState(createMockState({ status: 'playing' }))).toBe(false);
      expect(isSetupState(createMockState({ status: 'between_rounds' }))).toBe(false);
      expect(isSetupState(createMockState({ status: 'ended' }))).toBe(false);
    });
  });

  describe('isPlayingState', () => {
    it('returns true for playing status', () => {
      const state = createMockState({ status: 'playing' });
      expect(isPlayingState(state)).toBe(true);
    });

    it('returns false for non-playing statuses', () => {
      expect(isPlayingState(createMockState({ status: 'setup' }))).toBe(false);
      expect(isPlayingState(createMockState({ status: 'between_rounds' }))).toBe(false);
      expect(isPlayingState(createMockState({ status: 'ended' }))).toBe(false);
    });
  });

  describe('isBetweenRoundsState', () => {
    it('returns true for between_rounds status', () => {
      const state = createMockState({ status: 'between_rounds' });
      expect(isBetweenRoundsState(state)).toBe(true);
    });

    it('returns false for non-between_rounds statuses', () => {
      expect(isBetweenRoundsState(createMockState({ status: 'setup' }))).toBe(false);
      expect(isBetweenRoundsState(createMockState({ status: 'playing' }))).toBe(false);
      expect(isBetweenRoundsState(createMockState({ status: 'ended' }))).toBe(false);
    });
  });

  describe('isEndedState', () => {
    it('returns true for ended status', () => {
      const state = createMockState({ status: 'ended' });
      expect(isEndedState(state)).toBe(true);
    });

    it('returns false for non-ended statuses', () => {
      expect(isEndedState(createMockState({ status: 'setup' }))).toBe(false);
      expect(isEndedState(createMockState({ status: 'playing' }))).toBe(false);
      expect(isEndedState(createMockState({ status: 'between_rounds' }))).toBe(false);
    });
  });
});

// =============================================================================
// COMPOUND TYPE GUARD TESTS
// =============================================================================

describe('Compound Type Guards', () => {
  describe('isGameActive', () => {
    it('returns true for playing state', () => {
      expect(isGameActive(createMockState({ status: 'playing' }))).toBe(true);
    });

    it('returns true for between_rounds state', () => {
      expect(isGameActive(createMockState({ status: 'between_rounds' }))).toBe(true);
    });

    it('returns false for setup state', () => {
      expect(isGameActive(createMockState({ status: 'setup' }))).toBe(false);
    });

    it('returns false for ended state', () => {
      expect(isGameActive(createMockState({ status: 'ended' }))).toBe(false);
    });
  });

  describe('isConfigurable', () => {
    it('returns true only for setup state', () => {
      expect(isConfigurable(createMockState({ status: 'setup' }))).toBe(true);
    });

    it('returns false for all other states', () => {
      expect(isConfigurable(createMockState({ status: 'playing' }))).toBe(false);
      expect(isConfigurable(createMockState({ status: 'between_rounds' }))).toBe(false);
      expect(isConfigurable(createMockState({ status: 'ended' }))).toBe(false);
    });
  });
});

// =============================================================================
// STATUS-AWARE ACCESSOR TESTS
// =============================================================================


// =============================================================================
// ASSERTION FUNCTION TESTS
// =============================================================================

describe('Assertion Functions', () => {
  describe('assertNever', () => {
    it('throws for any value passed (exhaustiveness check)', () => {
      // In practice, this is only reached if a new status is added without
      // updating the exhaustive switch. We pass a string to test the error.
      expect(() => assertNever('unknown' as never)).toThrow('Unexpected game status: unknown');
    });
  });

  describe('assertSetupState', () => {
    it('returns state when status is setup', () => {
      const state = createMockState({ status: 'setup' });
      expect(assertSetupState(state)).toBe(state);
    });

    it('throws when status is not setup', () => {
      const state = createMockState({ status: 'playing' });
      expect(() => assertSetupState(state)).toThrow("Expected setup state, got 'playing'");
    });
  });

  describe('assertPlayingState', () => {
    it('returns state when status is playing', () => {
      const state = createMockState({ status: 'playing' });
      expect(assertPlayingState(state)).toBe(state);
    });

    it('throws when status is not playing', () => {
      const state = createMockState({ status: 'setup' });
      expect(() => assertPlayingState(state)).toThrow("Expected playing state, got 'setup'");
    });
  });

  describe('assertBetweenRoundsState', () => {
    it('returns state when status is between_rounds', () => {
      const state = createMockState({ status: 'between_rounds' });
      expect(assertBetweenRoundsState(state)).toBe(state);
    });

    it('throws when status is not between_rounds', () => {
      const state = createMockState({ status: 'ended' });
      expect(() => assertBetweenRoundsState(state)).toThrow("Expected between_rounds state, got 'ended'");
    });
  });

  describe('assertEndedState', () => {
    it('returns state when status is ended', () => {
      const state = createMockState({ status: 'ended' });
      expect(assertEndedState(state)).toBe(state);
    });

    it('throws when status is not ended', () => {
      const state = createMockState({ status: 'setup' });
      expect(() => assertEndedState(state)).toThrow("Expected ended state, got 'setup'");
    });
  });
});

// =============================================================================
// INTEGRATION WITH ENGINE TRANSITIONS
// =============================================================================

describe('Integration with Game Engine Transitions', () => {
  it('initial state is a valid SetupState', () => {
    const state = createMockState();
    expect(isSetupState(state)).toBe(true);
    expect(isConfigurable(state)).toBe(true);
    expect(isGameActive(state)).toBe(false);
  });

  it('simulated start game transition narrows to PlayingState', () => {
    const state = createMockState({
      status: 'playing',
      currentRound: 0,
      teams: [{ id: 't1' as TeamId, name: 'Team A', score: 0, tableNumber: 1, roundScores: [0, 0, 0] }],
    });
    expect(isPlayingState(state)).toBe(true);
    expect(isGameActive(state)).toBe(true);
    expect(isConfigurable(state)).toBe(false);
  });

  it('simulated complete round transition narrows to BetweenRoundsState', () => {
    const state = createMockState({
      status: 'between_rounds',
      displayQuestionIndex: null,
      currentRound: 0,
    });
    expect(isBetweenRoundsState(state)).toBe(true);
    expect(isGameActive(state)).toBe(true);
  });

  it('simulated end game narrows to EndedState', () => {
    const state = createMockState({
      status: 'ended',
      displayQuestionIndex: null,
    });
    expect(isEndedState(state)).toBe(true);
    expect(isGameActive(state)).toBe(false);
    expect(isConfigurable(state)).toBe(false);
  });

  it('simulated reset returns to SetupState', () => {
    const state = createMockState({
      status: 'setup',
    });
    expect(isSetupState(state)).toBe(true);
    expect(isConfigurable(state)).toBe(true);
  });
});
