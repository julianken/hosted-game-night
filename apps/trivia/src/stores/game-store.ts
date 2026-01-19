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

export interface GameStore extends TriviaGameState {
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

  // Hydration for sync
  _hydrate: (state: Partial<TriviaGameState>) => void;
}

export const useGameStore = create<GameStore>()((set) => ({
  // Initial state
  ...createInitialState(),

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

  _hydrate: (newState: Partial<TriviaGameState>) => {
    set((state) => ({ ...state, ...newState }));
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
  };
}
