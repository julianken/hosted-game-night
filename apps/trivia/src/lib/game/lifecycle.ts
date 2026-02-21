import type { TriviaGameState, GameSettings } from '@/types';
import { DEFAULT_ROUNDS, QUESTIONS_PER_ROUND, DEFAULT_TIMER_DURATION } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { deepFreeze } from './helpers';
import { SAMPLE_QUESTIONS } from './sample-questions';

// =============================================================================
// INITIAL STATE
// =============================================================================

export function createDefaultSettings(): GameSettings {
  return deepFreeze({
    roundsCount: DEFAULT_ROUNDS,
    questionsPerRound: QUESTIONS_PER_ROUND,
    timerDuration: DEFAULT_TIMER_DURATION,
    timerAutoStart: false,
    timerVisible: true,
    ttsEnabled: false,
  });
}

export function createInitialState(): TriviaGameState {
  const settings = createDefaultSettings();
  return deepFreeze({
    sessionId: uuidv4(),
    status: 'setup',
    statusBeforePause: null,
    questions: SAMPLE_QUESTIONS,
    selectedQuestionIndex: 0,
    displayQuestionIndex: null,
    currentRound: 0,
    totalRounds: settings.roundsCount,
    teams: [],
    teamAnswers: [],
    timer: {
      duration: settings.timerDuration,
      remaining: settings.timerDuration,
      isRunning: false,
    },
    settings,
    showScoreboard: true,
    emergencyBlank: false,
    ttsEnabled: false,

    // -- Audience Scene Layer --
    // All new fields from the phase 5 redesign. Default values represent the
    // pre-game waiting state with no reveal in progress.
    audienceScene: 'waiting',
    sceneBeforePause: null,
    sceneTimestamp: 0, // 0 = never set (waiting is the initial state, not timed)
    revealPhase: null,
    scoreDeltas: [],
  });
}

// =============================================================================
// GAME LIFECYCLE
// =============================================================================

export function startGame(state: TriviaGameState): TriviaGameState {
  if (state.status !== 'setup') return state;
  if (state.teams.length === 0) return state; // Need at least 1 team

  // Find first question of round 0
  const firstQuestionIndex = state.questions.findIndex(q => q.roundIndex === 0);

  return deepFreeze({
    ...state,
    status: 'playing',
    statusBeforePause: null,
    currentRound: 0,
    selectedQuestionIndex: firstQuestionIndex >= 0 ? firstQuestionIndex : 0,
    displayQuestionIndex: null,
    teams: state.teams.map(t => ({
      ...t,
      score: 0,
      roundScores: Array(state.totalRounds).fill(0),
    })),
    teamAnswers: [],
    timer: {
      duration: state.settings.timerDuration,
      remaining: state.settings.timerDuration,
      isRunning: state.settings.timerAutoStart,
    },
    emergencyBlank: false,
  });
}

export function endGame(state: TriviaGameState): TriviaGameState {
  return deepFreeze({
    ...state,
    status: 'ended',
    statusBeforePause: null,
    displayQuestionIndex: null,
    timer: {
      ...state.timer,
      isRunning: false,
    },
    emergencyBlank: false,
  });
}

export function resetGame(state: TriviaGameState): TriviaGameState {
  const initial = createInitialState();
  return deepFreeze({
    ...initial,
    sessionId: state.sessionId, // Keep same session
    settings: state.settings, // Keep settings
    totalRounds: state.settings.roundsCount,
    timer: {
      duration: state.settings.timerDuration,
      remaining: state.settings.timerDuration,
      isRunning: false,
    },
    teams: state.teams.map((t) => ({
      ...t,
      score: 0,
      roundScores: [], // Reset per-round scores
    })),
    teamAnswers: [],
  });
}

/**
 * Pause the game — saves current status and pauses timer.
 */
export function pauseGame(state: TriviaGameState): TriviaGameState {
  // Can only pause from playing or between_rounds
  if (state.status !== 'playing' && state.status !== 'between_rounds') {
    return state;
  }

  return deepFreeze({
    ...state,
    status: 'paused',
    statusBeforePause: state.status,
    timer: {
      ...state.timer,
      isRunning: false,
    },
  });
}

/**
 * Resume from paused state — restores previous status.
 */
export function resumeGame(state: TriviaGameState): TriviaGameState {
  if (state.status !== 'paused') return state;
  if (!state.statusBeforePause) return state;

  return deepFreeze({
    ...state,
    status: state.statusBeforePause,
    statusBeforePause: null,
    emergencyBlank: false,
  });
}

/**
 * Emergency pause — blanks the audience display.
 */
export function emergencyPause(state: TriviaGameState): TriviaGameState {
  // Can only emergency pause from playing, paused, or between_rounds
  if (state.status !== 'playing' && state.status !== 'paused' && state.status !== 'between_rounds') {
    return state;
  }

  const statusBeforePause = state.status === 'paused'
    ? state.statusBeforePause
    : state.status;

  return deepFreeze({
    ...state,
    status: 'paused',
    statusBeforePause,
    timer: {
      ...state.timer,
      isRunning: false,
    },
    emergencyBlank: true,
  });
}

/**
 * Update game settings. Only allowed in setup status.
 */
export function updateSettings(
  state: TriviaGameState,
  settings: Partial<GameSettings>
): TriviaGameState {
  // Only allow settings changes during setup
  if (state.status !== 'setup') return state;

  const newSettings = {
    ...state.settings,
    ...settings,
  };

  return deepFreeze({
    ...state,
    settings: newSettings,
    totalRounds: newSettings.roundsCount,
    timer: {
      duration: newSettings.timerDuration,
      remaining: newSettings.timerDuration,
      isRunning: false,
    },
  });
}

