import { v4 as uuidv4 } from 'uuid';
import type { TriviaGameState, Team, Question, GameSettings, TeamAnswer } from '@/types';
import { DEFAULT_TEAM_PREFIX, MAX_TEAMS, DEFAULT_ROUNDS, QUESTIONS_PER_ROUND, DEFAULT_TIMER_DURATION } from '@/types';
import { SAMPLE_QUESTIONS } from './sample-questions';

// =============================================================================
// INITIAL STATE
// =============================================================================

export function createDefaultSettings(): GameSettings {
  return {
    roundsCount: DEFAULT_ROUNDS,
    questionsPerRound: QUESTIONS_PER_ROUND,
    timerDuration: DEFAULT_TIMER_DURATION,
    timerAutoStart: false,
    timerVisible: true,
    ttsEnabled: false,
  };
}

export function createInitialState(): TriviaGameState {
  const settings = createDefaultSettings();
  return {
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
  };
}

// =============================================================================
// GAME LIFECYCLE
// =============================================================================

export function startGame(state: TriviaGameState): TriviaGameState {
  if (state.status !== 'setup') return state;
  if (state.teams.length === 0) return state; // Need at least 1 team

  // Find first question of round 0
  const firstQuestionIndex = state.questions.findIndex(q => q.roundIndex === 0);

  return {
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
  };
}

export function endGame(state: TriviaGameState): TriviaGameState {
  return {
    ...state,
    status: 'ended',
    statusBeforePause: null,
    displayQuestionIndex: null,
    timer: {
      ...state.timer,
      isRunning: false,
    },
    emergencyBlank: false,
  };
}

export function resetGame(state: TriviaGameState): TriviaGameState {
  const initial = createInitialState();
  return {
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
  };
}

// =============================================================================
// QUESTION NAVIGATION
// =============================================================================

export function selectQuestion(
  state: TriviaGameState,
  index: number
): TriviaGameState {
  if (index < 0 || index >= state.questions.length) return state;

  return {
    ...state,
    selectedQuestionIndex: index,
  };
}

export function setDisplayQuestion(
  state: TriviaGameState,
  index: number | null
): TriviaGameState {
  if (index !== null && (index < 0 || index >= state.questions.length)) {
    return state;
  }

  return {
    ...state,
    displayQuestionIndex: index,
  };
}

// =============================================================================
// TEAM MANAGEMENT
// =============================================================================

export function addTeam(
  state: TriviaGameState,
  name?: string
): TriviaGameState {
  if (state.teams.length >= MAX_TEAMS) return state;

  const tableNumber = state.teams.length + 1;
  const newTeam: Team = {
    id: uuidv4(),
    name: name || `${DEFAULT_TEAM_PREFIX} ${tableNumber}`,
    score: 0,
    tableNumber,
    roundScores: [],
  };

  return {
    ...state,
    teams: [...state.teams, newTeam],
  };
}

export function removeTeam(
  state: TriviaGameState,
  teamId: string
): TriviaGameState {
  return {
    ...state,
    teams: state.teams.filter((t) => t.id !== teamId),
  };
}

export function renameTeam(
  state: TriviaGameState,
  teamId: string,
  name: string
): TriviaGameState {
  return {
    ...state,
    teams: state.teams.map((t) => (t.id === teamId ? { ...t, name } : t)),
  };
}

// =============================================================================
// SCORE MANAGEMENT
// =============================================================================

export function adjustTeamScore(
  state: TriviaGameState,
  teamId: string,
  delta: number
): TriviaGameState {
  const { currentRound, totalRounds } = state;

  return {
    ...state,
    teams: state.teams.map((t) => {
      if (t.id !== teamId) return t;

      // Ensure roundScores array is properly sized
      const roundScores = [...t.roundScores];
      while (roundScores.length < totalRounds) {
        roundScores.push(0);
      }

      // Adjust score for current round
      roundScores[currentRound] = Math.max(0, (roundScores[currentRound] || 0) + delta);

      // Compute total from all round scores
      const score = roundScores.reduce((sum, rs) => sum + rs, 0);

      return { ...t, roundScores, score };
    }),
  };
}

export function setTeamScore(
  state: TriviaGameState,
  teamId: string,
  score: number
): TriviaGameState {
  const { currentRound, totalRounds } = state;

  return {
    ...state,
    teams: state.teams.map((t) => {
      if (t.id !== teamId) return t;

      // Ensure roundScores array is properly sized
      const roundScores = [...t.roundScores];
      while (roundScores.length < totalRounds) {
        roundScores.push(0);
      }

      // Calculate delta from current total to new score
      const currentTotal = roundScores.reduce((sum, rs) => sum + rs, 0);
      const otherRoundsTotal = currentTotal - (roundScores[currentRound] || 0);

      // Set this round's score to achieve the desired total
      roundScores[currentRound] = Math.max(0, score - otherRoundsTotal);

      return { ...t, roundScores, score: Math.max(0, score) };
    }),
  };
}

// Set score specifically for a round
export function setTeamRoundScore(
  state: TriviaGameState,
  teamId: string,
  roundIndex: number,
  score: number
): TriviaGameState {
  const { totalRounds } = state;

  return {
    ...state,
    teams: state.teams.map((t) => {
      if (t.id !== teamId) return t;

      // Ensure roundScores array is properly sized
      const roundScores = [...t.roundScores];
      while (roundScores.length < totalRounds) {
        roundScores.push(0);
      }

      // Set score for specific round
      roundScores[roundIndex] = Math.max(0, score);

      // Compute total from all round scores
      const totalScore = roundScores.reduce((sum, rs) => sum + rs, 0);

      return { ...t, roundScores, score: totalScore };
    }),
  };
}

// =============================================================================
// SELECTORS (computed values)
// =============================================================================

export function getSelectedQuestion(state: TriviaGameState) {
  return state.questions[state.selectedQuestionIndex] || null;
}

export function getDisplayQuestion(state: TriviaGameState) {
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

// =============================================================================
// ROUND MANAGEMENT
// =============================================================================

/**
 * Get questions for the current round
 */
export function getCurrentRoundQuestions(state: TriviaGameState): Question[] {
  return state.questions.filter(q => q.roundIndex === state.currentRound);
}

/**
 * Get questions for a specific round
 */
export function getQuestionsForRound(state: TriviaGameState, roundIndex: number): Question[] {
  return state.questions.filter(q => q.roundIndex === roundIndex);
}

/**
 * Get round progress string (e.g., "Round 1 of 3")
 */
export function getRoundProgress(state: TriviaGameState): string {
  return `Round ${state.currentRound + 1} of ${state.totalRounds}`;
}

/**
 * Get question-in-round progress (e.g., "Question 2 of 5")
 */
export function getQuestionInRoundProgress(state: TriviaGameState): string {
  const roundQuestions = getCurrentRoundQuestions(state);
  const currentQuestion = state.questions[state.selectedQuestionIndex];

  if (!currentQuestion) return 'Question 0 of 0';

  const questionInRound = roundQuestions.findIndex(q => q.id === currentQuestion.id);
  return `Question ${questionInRound + 1} of ${roundQuestions.length}`;
}

/**
 * Check if the current question is the last question of the current round
 */
export function isLastQuestionOfRound(state: TriviaGameState): boolean {
  const roundQuestions = getCurrentRoundQuestions(state);
  const currentQuestion = state.questions[state.selectedQuestionIndex];

  if (!currentQuestion || roundQuestions.length === 0) return false;

  const lastQuestion = roundQuestions[roundQuestions.length - 1];
  return currentQuestion.id === lastQuestion.id;
}

/**
 * Check if the current round is the last round
 */
export function isLastRound(state: TriviaGameState): boolean {
  return state.currentRound >= state.totalRounds - 1;
}

/**
 * Complete the current round and transition to between_rounds status
 */
export function completeRound(state: TriviaGameState): TriviaGameState {
  if (state.status !== 'playing') return state;

  return {
    ...state,
    status: 'between_rounds',
    displayQuestionIndex: null,
  };
}

/**
 * Advance to the next round or end the game if on last round
 */
export function nextRound(state: TriviaGameState): TriviaGameState {
  if (state.status !== 'between_rounds') return state;

  const nextRoundIndex = state.currentRound + 1;

  // If this was the last round, end the game
  if (nextRoundIndex >= state.totalRounds) {
    return {
      ...state,
      status: 'ended',
      displayQuestionIndex: null,
    };
  }

  // Find first question of the next round
  const nextRoundFirstQuestion = state.questions.findIndex(q => q.roundIndex === nextRoundIndex);

  return {
    ...state,
    status: 'playing',
    currentRound: nextRoundIndex,
    selectedQuestionIndex: nextRoundFirstQuestion >= 0 ? nextRoundFirstQuestion : 0,
    displayQuestionIndex: null,
  };
}

/**
 * Get the winning team(s) for a specific round (handles ties)
 */
export function getRoundWinners(state: TriviaGameState, roundIndex: number): Team[] {
  const teamsWithRoundScores = state.teams.filter(
    t => t.roundScores && t.roundScores[roundIndex] !== undefined
  );

  if (teamsWithRoundScores.length === 0) return [];

  const maxRoundScore = Math.max(...teamsWithRoundScores.map(t => t.roundScores[roundIndex] || 0));
  return teamsWithRoundScores.filter(t => (t.roundScores[roundIndex] || 0) === maxRoundScore);
}

/**
 * Get overall leaders (handles ties)
 */
export function getOverallLeaders(state: TriviaGameState): Team[] {
  if (state.teams.length === 0) return [];

  const maxScore = Math.max(...state.teams.map(t => t.score));
  return state.teams.filter(t => t.score === maxScore);
}

/**
 * Get teams sorted by total score (descending)
 */
export function getTeamsSortedByScore(state: TriviaGameState): Team[] {
  return [...state.teams].sort((a, b) => b.score - a.score);
}

// =============================================================================
// TIMER FUNCTIONS
// =============================================================================

/**
 * Decrement timer by 1 second. Stops at 0.
 */
export function tickTimer(state: TriviaGameState): TriviaGameState {
  if (!state.timer.isRunning || state.timer.remaining <= 0) {
    return state;
  }

  const newRemaining = Math.max(0, state.timer.remaining - 1);

  return {
    ...state,
    timer: {
      ...state.timer,
      remaining: newRemaining,
      isRunning: newRemaining > 0,
    },
  };
}

/**
 * Reset timer to specified duration (or default if not provided)
 */
export function resetTimer(state: TriviaGameState, duration?: number): TriviaGameState {
  const newDuration = duration ?? state.settings.timerDuration;

  return {
    ...state,
    timer: {
      duration: newDuration,
      remaining: newDuration,
      isRunning: false,
    },
  };
}

/**
 * Start the timer
 */
export function startTimer(state: TriviaGameState): TriviaGameState {
  if (state.timer.remaining <= 0) return state;

  return {
    ...state,
    timer: {
      ...state.timer,
      isRunning: true,
    },
  };
}

/**
 * Stop the timer without resetting
 */
export function stopTimer(state: TriviaGameState): TriviaGameState {
  return {
    ...state,
    timer: {
      ...state.timer,
      isRunning: false,
    },
  };
}

/**
 * Toggle whether timer auto-starts on new question
 */
export function toggleTimerAutoStart(state: TriviaGameState): TriviaGameState {
  return {
    ...state,
    settings: {
      ...state.settings,
      timerAutoStart: !state.settings.timerAutoStart,
    },
  };
}

// =============================================================================
// PAUSE FUNCTIONS
// =============================================================================

/**
 * Pause the game - saves current status and pauses timer
 */
export function pauseGame(state: TriviaGameState): TriviaGameState {
  // Can only pause from playing or between_rounds
  if (state.status !== 'playing' && state.status !== 'between_rounds') {
    return state;
  }

  return {
    ...state,
    status: 'paused',
    statusBeforePause: state.status,
    timer: {
      ...state.timer,
      isRunning: false,
    },
  };
}

/**
 * Resume from paused state - restores previous status
 */
export function resumeGame(state: TriviaGameState): TriviaGameState {
  if (state.status !== 'paused') return state;
  if (!state.statusBeforePause) return state;

  return {
    ...state,
    status: state.statusBeforePause,
    statusBeforePause: null,
    emergencyBlank: false,
  };
}

/**
 * Emergency pause - blanks the audience display
 */
export function emergencyPause(state: TriviaGameState): TriviaGameState {
  // Can only emergency pause from playing, paused, or between_rounds
  if (state.status !== 'playing' && state.status !== 'paused' && state.status !== 'between_rounds') {
    return state;
  }

  const statusBeforePause = state.status === 'paused'
    ? state.statusBeforePause
    : state.status;

  return {
    ...state,
    status: 'paused',
    statusBeforePause,
    timer: {
      ...state.timer,
      isRunning: false,
    },
    emergencyBlank: true,
  };
}

// =============================================================================
// SETTINGS FUNCTIONS
// =============================================================================

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

  return {
    ...state,
    settings: newSettings,
    totalRounds: newSettings.roundsCount,
    timer: {
      duration: newSettings.timerDuration,
      remaining: newSettings.timerDuration,
      isRunning: false,
    },
  };
}

// =============================================================================
// ANSWER MANAGEMENT
// =============================================================================

/**
 * Record a team's answer for a question
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

  return {
    ...state,
    teamAnswers: [...filteredAnswers, newAnswer],
  };
}

/**
 * Amend correct answers for a question and recalculate all affected team scores
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
      // Was wrong, now correct - add points
      const currentAdjustment = scoreAdjustments.get(ta.teamId) || 0;
      scoreAdjustments.set(ta.teamId, currentAdjustment + ta.pointsAwarded);
    } else if (wasCorrect && !isNowCorrect) {
      // Was correct, now wrong - remove points
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

  return {
    ...state,
    questions: updatedQuestions,
    teamAnswers: updatedTeamAnswers,
    teams: updatedTeams,
  };
}

// =============================================================================
// DISPLAY FUNCTIONS
// =============================================================================

/**
 * Toggle scoreboard visibility for audience display
 */
export function toggleScoreboard(state: TriviaGameState): TriviaGameState {
  return {
    ...state,
    showScoreboard: !state.showScoreboard,
  };
}

// =============================================================================
// QUESTION IMPORT/EXPORT FUNCTIONS
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

  return {
    ...state,
    questions: newQuestions,
    totalRounds,
    selectedQuestionIndex: 0,
    displayQuestionIndex: null,
    settings: {
      ...state.settings,
      roundsCount: totalRounds,
    },
  };
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

  return {
    ...state,
    questions: [],
    selectedQuestionIndex: 0,
    displayQuestionIndex: null,
  };
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

  return {
    ...state,
    questions: newQuestions,
    totalRounds,
    settings: {
      ...state.settings,
      roundsCount: totalRounds,
    },
  };
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

  return {
    ...state,
    questions: newQuestions,
    selectedQuestionIndex,
    displayQuestionIndex: null,
  };
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

  return {
    ...state,
    questions: newQuestions,
    totalRounds,
    settings: {
      ...state.settings,
      roundsCount: totalRounds,
    },
  };
}
