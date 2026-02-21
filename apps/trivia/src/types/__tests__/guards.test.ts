import { describe, it, expect } from 'vitest';
import type { TriviaGameState } from '@/types';
import {
  isSetupState,
  isPlayingState,
  isBetweenRoundsState,
  isPausedState,
  isEndedState,
  isGameActive,
  canPauseState,
  isConfigurable,
  getEffectiveDisplayStatus,
  getResumeTarget,
  assertNever,
  assertSetupState,
  assertPlayingState,
  assertBetweenRoundsState,
  assertPausedState,
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
    sessionId: 'test-session',
    status: 'setup',
    statusBeforePause: null,
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
      expect(isSetupState(createMockState({ status: 'paused' }))).toBe(false);
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
      expect(isPlayingState(createMockState({ status: 'paused' }))).toBe(false);
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
      expect(isBetweenRoundsState(createMockState({ status: 'paused' }))).toBe(false);
      expect(isBetweenRoundsState(createMockState({ status: 'ended' }))).toBe(false);
    });
  });

  describe('isPausedState', () => {
    it('returns true for paused status', () => {
      const state = createMockState({ status: 'paused', statusBeforePause: 'playing' });
      expect(isPausedState(state)).toBe(true);
    });

    it('returns false for non-paused statuses', () => {
      expect(isPausedState(createMockState({ status: 'setup' }))).toBe(false);
      expect(isPausedState(createMockState({ status: 'playing' }))).toBe(false);
      expect(isPausedState(createMockState({ status: 'between_rounds' }))).toBe(false);
      expect(isPausedState(createMockState({ status: 'ended' }))).toBe(false);
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
      expect(isEndedState(createMockState({ status: 'paused' }))).toBe(false);
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

    it('returns true for paused state', () => {
      expect(isGameActive(createMockState({ status: 'paused', statusBeforePause: 'playing' }))).toBe(true);
    });

    it('returns false for setup state', () => {
      expect(isGameActive(createMockState({ status: 'setup' }))).toBe(false);
    });

    it('returns false for ended state', () => {
      expect(isGameActive(createMockState({ status: 'ended' }))).toBe(false);
    });
  });

  describe('canPauseState', () => {
    it('returns true for playing state', () => {
      expect(canPauseState(createMockState({ status: 'playing' }))).toBe(true);
    });

    it('returns true for between_rounds state', () => {
      expect(canPauseState(createMockState({ status: 'between_rounds' }))).toBe(true);
    });

    it('returns false for setup, paused, and ended states', () => {
      expect(canPauseState(createMockState({ status: 'setup' }))).toBe(false);
      expect(canPauseState(createMockState({ status: 'paused', statusBeforePause: 'playing' }))).toBe(false);
      expect(canPauseState(createMockState({ status: 'ended' }))).toBe(false);
    });
  });

  describe('isConfigurable', () => {
    it('returns true only for setup state', () => {
      expect(isConfigurable(createMockState({ status: 'setup' }))).toBe(true);
    });

    it('returns false for all other states', () => {
      expect(isConfigurable(createMockState({ status: 'playing' }))).toBe(false);
      expect(isConfigurable(createMockState({ status: 'between_rounds' }))).toBe(false);
      expect(isConfigurable(createMockState({ status: 'paused', statusBeforePause: 'playing' }))).toBe(false);
      expect(isConfigurable(createMockState({ status: 'ended' }))).toBe(false);
    });
  });
});

// =============================================================================
// STATUS-AWARE ACCESSOR TESTS
// =============================================================================

describe('Status-Aware Accessors', () => {
  describe('getEffectiveDisplayStatus', () => {
    it('returns status with isEmergency false for normal states', () => {
      const result = getEffectiveDisplayStatus(createMockState({ status: 'playing' }));
      expect(result.status).toBe('playing');
      expect(result.isEmergency).toBe(false);
    });

    it('returns isEmergency false for normal pause', () => {
      const result = getEffectiveDisplayStatus(createMockState({
        status: 'paused',
        statusBeforePause: 'playing',
        emergencyBlank: false,
      }));
      expect(result.status).toBe('paused');
      expect(result.isEmergency).toBe(false);
    });

    it('returns isEmergency true for emergency pause', () => {
      const result = getEffectiveDisplayStatus(createMockState({
        status: 'paused',
        statusBeforePause: 'playing',
        emergencyBlank: true,
      }));
      expect(result.status).toBe('paused');
      expect(result.isEmergency).toBe(true);
    });

    it('returns isEmergency false when not paused even if emergencyBlank is true', () => {
      // Edge case: emergencyBlank set but status is not paused (should not happen in practice)
      const result = getEffectiveDisplayStatus(createMockState({
        status: 'playing',
        emergencyBlank: true,
      }));
      expect(result.isEmergency).toBe(false);
    });
  });

  describe('getResumeTarget', () => {
    it('returns playing when paused from playing', () => {
      const state = createMockState({
        status: 'paused',
        statusBeforePause: 'playing',
      });
      expect(getResumeTarget(state)).toBe('playing');
    });

    it('returns between_rounds when paused from between_rounds', () => {
      const state = createMockState({
        status: 'paused',
        statusBeforePause: 'between_rounds',
      });
      expect(getResumeTarget(state)).toBe('between_rounds');
    });

    it('returns null when not paused', () => {
      expect(getResumeTarget(createMockState({ status: 'setup' }))).toBeNull();
      expect(getResumeTarget(createMockState({ status: 'playing' }))).toBeNull();
      expect(getResumeTarget(createMockState({ status: 'between_rounds' }))).toBeNull();
      expect(getResumeTarget(createMockState({ status: 'ended' }))).toBeNull();
    });
  });
});

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

  describe('assertPausedState', () => {
    it('returns state when status is paused', () => {
      const state = createMockState({ status: 'paused', statusBeforePause: 'playing' });
      expect(assertPausedState(state)).toBe(state);
    });

    it('throws when status is not paused', () => {
      const state = createMockState({ status: 'playing' });
      expect(() => assertPausedState(state)).toThrow("Expected paused state, got 'playing'");
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
      statusBeforePause: null,
      currentRound: 0,
      teams: [{ id: 't1', name: 'Team A', score: 0, tableNumber: 1, roundScores: [0, 0, 0] }],
    });
    expect(isPlayingState(state)).toBe(true);
    expect(isGameActive(state)).toBe(true);
    expect(canPauseState(state)).toBe(true);
    expect(isConfigurable(state)).toBe(false);
  });

  it('simulated complete round transition narrows to BetweenRoundsState', () => {
    const state = createMockState({
      status: 'between_rounds',
      statusBeforePause: null,
      displayQuestionIndex: null,
      currentRound: 0,
    });
    expect(isBetweenRoundsState(state)).toBe(true);
    expect(isGameActive(state)).toBe(true);
    expect(canPauseState(state)).toBe(true);
  });

  it('simulated pause from playing narrows to PausedState with playing resume target', () => {
    const state = createMockState({
      status: 'paused',
      statusBeforePause: 'playing',
      emergencyBlank: false,
    });
    expect(isPausedState(state)).toBe(true);
    expect(isGameActive(state)).toBe(true);
    expect(canPauseState(state)).toBe(false);
    expect(getResumeTarget(state)).toBe('playing');
  });

  it('simulated pause from between_rounds narrows to PausedState with between_rounds resume target', () => {
    const state = createMockState({
      status: 'paused',
      statusBeforePause: 'between_rounds',
    });
    expect(isPausedState(state)).toBe(true);
    expect(getResumeTarget(state)).toBe('between_rounds');
  });

  it('simulated emergency pause sets emergency flag', () => {
    const state = createMockState({
      status: 'paused',
      statusBeforePause: 'playing',
      emergencyBlank: true,
    });
    expect(isPausedState(state)).toBe(true);
    const displayStatus = getEffectiveDisplayStatus(state);
    expect(displayStatus.isEmergency).toBe(true);
  });

  it('simulated end game narrows to EndedState', () => {
    const state = createMockState({
      status: 'ended',
      statusBeforePause: null,
      displayQuestionIndex: null,
    });
    expect(isEndedState(state)).toBe(true);
    expect(isGameActive(state)).toBe(false);
    expect(isConfigurable(state)).toBe(false);
  });

  it('simulated reset returns to SetupState', () => {
    const state = createMockState({
      status: 'setup',
      statusBeforePause: null,
    });
    expect(isSetupState(state)).toBe(true);
    expect(isConfigurable(state)).toBe(true);
  });
});
