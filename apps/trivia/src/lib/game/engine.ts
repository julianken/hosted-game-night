/**
 * Trivia game engine — re-exports all focused modules.
 *
 * All imports from '@/lib/game/engine' continue to work unchanged.
 * Implementation is split across focused modules:
 *   - lifecycle.ts   — startGame, pauseGame, resumeGame, endGame, resetGame, emergencyPause, updateSettings, createInitialState
 *   - teams.ts       — addTeam, removeTeam, renameTeam, updateTeamOrder
 *   - questions.ts   — selectQuestion, setDisplayQuestion, importQuestions, exportQuestionsFromState, clearQuestions, addQuestion, removeQuestion, updateQuestion
 *   - scoring.ts     — adjustTeamScore, setTeamScore, setTeamRoundScore, amendCorrectAnswers, recordTeamAnswer
 *   - rounds.ts      — completeRound, nextRound, getRoundWinners
 *   - timer.ts       — tickTimer, resetTimer, startTimer, stopTimer, toggleTimerAutoStart
 *   - selectors.ts   — getSelectedQuestion, getDisplayQuestion, getProgress, canStartGame, isGameOver, getCurrentRoundQuestions, getQuestionsForRound, getRoundProgress, getQuestionInRoundProgress, isLastQuestionOfRound, isLastRound, getRoundScores, getTeamRoundScore, getOverallLeaders, getTeamsSortedByScore, toggleScoreboard
 *   - helpers.ts     — deepFreeze, padRoundScores
 *   - state-machine.ts — VALID_TRANSITIONS, transition, canTransition, getNextStatus, getValidActions
 */

// Lifecycle
export {
  createDefaultSettings,
  createInitialState,
  startGame,
  endGame,
  resetGame,
  pauseGame,
  resumeGame,
  emergencyPause,
  updateSettings,
} from './lifecycle';

// Teams
export {
  addTeam,
  removeTeam,
  renameTeam,
  updateTeamOrder,
} from './teams';

// Questions
export {
  selectQuestion,
  setDisplayQuestion,
  importQuestions,
  exportQuestionsFromState,
  clearQuestions,
  addQuestion,
  removeQuestion,
  updateQuestion,
} from './questions';

// Scoring
export {
  adjustTeamScore,
  setTeamScore,
  setTeamRoundScore,
  recordTeamAnswer,
  amendCorrectAnswers,
} from './scoring';

// Rounds
export {
  completeRound,
  nextRound,
  getRoundWinners,
} from './rounds';

// Timer
export {
  tickTimer,
  resetTimer,
  startTimer,
  stopTimer,
  toggleTimerAutoStart,
} from './timer';

// Selectors
export {
  getSelectedQuestion,
  getDisplayQuestion,
  getProgress,
  canStartGame,
  isGameOver,
  getCurrentRoundQuestions,
  getQuestionsForRound,
  getRoundProgress,
  getQuestionInRoundProgress,
  isLastQuestionOfRound,
  isLastRound,
  getRoundScores,
  getTeamRoundScore,
  getOverallLeaders,
  getTeamsSortedByScore,
  toggleScoreboard,
} from './selectors';

// Helpers (exported for use in tests and extensions)
export { deepFreeze, padRoundScores } from './helpers';

// State machine
export type { TriviaGameAction } from './state-machine';
export {
  VALID_TRANSITIONS,
  ACTION_RESULTS,
  canTransition,
  getNextStatus,
  transition,
  getValidActions,
  canStart,
  canPause,
  canResume,
  isGameActive,
} from './state-machine';
