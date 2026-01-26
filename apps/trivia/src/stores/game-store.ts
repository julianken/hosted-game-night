import { create } from 'zustand';
import type { TriviaGameState } from '@/types';
import {
  createInitialState,
  startGame as startGameEngine,
  endGame as endGameEngine,
  resetGame as resetGameEngine,
  selectQuestion as selectQuestionEngine,
  setDisplayQuestion as setDisplayQuestionEngine,
  addTeam as addTeamEngine,
  removeTeam as removeTeamEngine,
  renameTeam as renameTeamEngine,
  adjustTeamScore as adjustTeamScoreEngine,
  setTeamScore as setTeamScoreEngine,
  completeRound as completeRoundEngine,
  nextRound as nextRoundEngine,
  tickTimer as tickTimerEngine,
  startTimer as startTimerEngine,
  stopTimer as stopTimerEngine,
  resetTimer as resetTimerEngine,
  pauseGame as pauseGameEngine,
  resumeGame as resumeGameEngine,
  emergencyPause as emergencyPauseEngine,
  updateSettings as updateSettingsEngine,
  importQuestions as importQuestionsEngine,
  getSelectedQuestion,
  getDisplayQuestion,
  getProgress,
  canStartGame,
  isGameOver,
  getRoundProgress,
  getQuestionInRoundProgress,
  isLastQuestionOfRound,
  isLastRound,
  getCurrentRoundQuestions,
  getRoundWinners,
  getOverallLeaders,
  getTeamsSortedByScore,
} from '@/lib/game/engine';
import type { GameSettings } from '@/types';

export interface GameStore extends TriviaGameState {
  _isHydrating: boolean; // Flag to prevent sync loops during hydration
  // Actions
  startGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  selectQuestion: (index: number) => void;
  setDisplayQuestion: (index: number | null) => void;
  addTeam: (name?: string) => void;
  removeTeam: (teamId: string) => void;
  renameTeam: (teamId: string, name: string) => void;
  adjustTeamScore: (teamId: string, delta: number) => void;
  setTeamScore: (teamId: string, score: number) => void;
  completeRound: () => void;
  nextRound: () => void;

  // Timer actions
  tickTimer: () => void;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: (duration?: number) => void;

  // Pause actions
  pauseGame: () => void;
  resumeGame: () => void;
  emergencyPause: () => void;

  // Settings actions
  updateSettings: (settings: Partial<import('@/types').GameSettings>) => void;
  loadTeamsFromSetup: (names: string[]) => void;

  // Question management
  importQuestions: (questions: import('@/types').Question[], mode?: 'replace' | 'append') => void;

  // Hydration for sync
  _hydrate: (state: Partial<TriviaGameState>) => void;
}

export const useGameStore = create<GameStore>()((set) => ({
  // Initial state
  ...createInitialState(),
  _isHydrating: false,

  // Actions
  startGame: () => {
    set((state) => startGameEngine(state));
  },

  endGame: () => {
    set((state) => endGameEngine(state));
  },

  resetGame: () => {
    set((state) => resetGameEngine(state));
  },

  selectQuestion: (index: number) => {
    set((state) => selectQuestionEngine(state, index));
  },

  setDisplayQuestion: (index: number | null) => {
    set((state) => setDisplayQuestionEngine(state, index));
  },

  addTeam: (name?: string) => {
    set((state) => addTeamEngine(state, name));
  },

  removeTeam: (teamId: string) => {
    set((state) => removeTeamEngine(state, teamId));
  },

  renameTeam: (teamId: string, name: string) => {
    set((state) => renameTeamEngine(state, teamId, name));
  },

  adjustTeamScore: (teamId: string, delta: number) => {
    set((state) => adjustTeamScoreEngine(state, teamId, delta));
  },

  setTeamScore: (teamId: string, score: number) => {
    set((state) => setTeamScoreEngine(state, teamId, score));
  },

  completeRound: () => {
    set((state) => completeRoundEngine(state));
  },

  nextRound: () => {
    set((state) => nextRoundEngine(state));
  },

  // Timer actions
  tickTimer: () => {
    set((state) => tickTimerEngine(state));
  },

  startTimer: () => {
    set((state) => startTimerEngine(state));
  },

  stopTimer: () => {
    set((state) => stopTimerEngine(state));
  },

  resetTimer: (duration?: number) => {
    set((state) => resetTimerEngine(state, duration));
  },

  // Pause actions
  pauseGame: () => {
    set((state) => pauseGameEngine(state));
  },

  resumeGame: () => {
    set((state) => resumeGameEngine(state));
  },

  emergencyPause: () => {
    set((state) => emergencyPauseEngine(state));
  },

  _hydrate: (newState: Partial<TriviaGameState>) => {
    set((state) => {
      // Create completely new state object with new array references
      // to ensure Zustand detects changes and notifies subscribers
      const updatedState = {
        ...state,
        ...newState,
        _isHydrating: false,
      };

      // Force new array references if arrays are provided
      if (newState.teams) {
        updatedState.teams = [...newState.teams.map(team => ({ ...team }))];
      }
      if (newState.questions) {
        updatedState.questions = [...newState.questions.map(q => ({ ...q }))];
      }
      if (newState.teamAnswers) {
        updatedState.teamAnswers = { ...newState.teamAnswers };
      }

      return updatedState;
    });
  },

  // Settings actions
  updateSettings: (settings: Partial<GameSettings>) => {
    set((state) => updateSettingsEngine(state, settings));
  },

  loadTeamsFromSetup: (names: string[]) => {
    set((state) => {
      // Only allow loading teams during setup
      if (state.status !== 'setup') return state;

      // Clear existing teams and add new ones
      // Extract only TriviaGameState properties (not store actions)
      let newState: TriviaGameState = {
        sessionId: state.sessionId,
        status: state.status,
        statusBeforePause: state.statusBeforePause,
        teams: [],
        questions: state.questions,
        selectedQuestionIndex: state.selectedQuestionIndex,
        displayQuestionIndex: state.displayQuestionIndex,
        currentRound: state.currentRound,
        totalRounds: state.totalRounds,
        settings: state.settings,
        timer: state.timer,
        teamAnswers: state.teamAnswers,
        showScoreboard: state.showScoreboard,
        emergencyBlank: state.emergencyBlank,
        ttsEnabled: state.ttsEnabled,
      };
      for (const name of names) {
        newState = addTeamEngine(newState, name);
      }
      return newState;
    });
  },

  importQuestions: (questions: import('@/types').Question[], mode: 'replace' | 'append' = 'replace') => {
    set((state) => importQuestionsEngine(state, questions, mode));
  },
}));

// Selector hooks for computed values
// IMPORTANT: This hook subscribes to the entire store, which means the component
// will re-render on ANY state change. For performance-critical components, use
// individual selectors instead.
export function useGameSelectors() {
  // Subscribe to specific state that affects selectors to ensure re-renders
  const displayQuestionIndex = useGameStore((state) => state.displayQuestionIndex);
  const questions = useGameStore((state) => state.questions);
  const teams = useGameStore((state) => state.teams);
  const status = useGameStore((state) => state.status);
  const currentRound = useGameStore((state) => state.currentRound);
  const selectedQuestionIndex = useGameStore((state) => state.selectedQuestionIndex);
  const totalRounds = useGameStore((state) => state.totalRounds);
  const teamAnswers = useGameStore((state) => state.teamAnswers);
  const settings = useGameStore((state) => state.settings);

  // CRITICAL FIX (BEA-374): Build state object from reactive subscriptions
  // DO NOT use getState() here - it can return stale state during React's
  // reconciliation phase, causing computed selectors to return wrong values.
  // This was causing display components to not re-render after state hydration.
  const state: TriviaGameState = {
    sessionId: '', // Not needed for selectors
    status,
    statusBeforePause: null, // Not needed for selectors
    questions,
    selectedQuestionIndex,
    displayQuestionIndex,
    currentRound,
    totalRounds,
    teams,
    teamAnswers,
    timer: { duration: 0, remaining: 0, isRunning: false }, // Not needed for most selectors
    settings,
    showScoreboard: false, // Not needed for selectors
    emergencyBlank: false, // Not needed for selectors
    ttsEnabled: false, // Not needed for selectors
  };

  return {
    selectedQuestion: getSelectedQuestion(state),
    displayQuestion: getDisplayQuestion(state),
    progress: getProgress(state),
    canStart: canStartGame(state),
    isGameOver: isGameOver(state),
    // Round selectors
    roundProgress: getRoundProgress(state),
    questionInRoundProgress: getQuestionInRoundProgress(state),
    isLastQuestionOfRound: isLastQuestionOfRound(state),
    isLastRound: isLastRound(state),
    currentRoundQuestions: getCurrentRoundQuestions(state),
    roundWinners: getRoundWinners(state, currentRound),
    overallLeaders: getOverallLeaders(state),
    teamsSortedByScore: getTeamsSortedByScore(state),
    // Pause selectors
    isPaused: status === 'paused',
    canPause: status === 'playing' || status === 'between_rounds',
    canResume: status === 'paused',
  };
}

// Timer-specific selector for optimized re-renders
export function useTimerState() {
  return useGameStore((state) => ({
    remaining: state.timer.remaining,
    duration: state.timer.duration,
    isRunning: state.timer.isRunning,
  }));
}

// Timer actions for components
export function useTimerActions() {
  return useGameStore((state) => ({
    startTimer: state.startTimer,
    stopTimer: state.stopTimer,
    resetTimer: state.resetTimer,
    tickTimer: state.tickTimer,
  }));
}
