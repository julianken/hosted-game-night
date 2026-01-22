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
    set((state) => ({ ...state, _isHydrating: true }));
    set((state) => ({ ...state, ...newState }));
    // Use setTimeout to ensure all subscriptions see the hydrating flag before clearing it
    setTimeout(() => {
      set((state) => ({ ...state, _isHydrating: false }));
    }, 0);
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
export function useGameSelectors() {
  const state = useGameStore();
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
    roundWinners: getRoundWinners(state, state.currentRound),
    overallLeaders: getOverallLeaders(state),
    teamsSortedByScore: getTeamsSortedByScore(state),
    // Pause selectors
    isPaused: state.status === 'paused',
    canPause: state.status === 'playing' || state.status === 'between_rounds',
    canResume: state.status === 'paused',
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
