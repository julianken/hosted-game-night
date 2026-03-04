'use client';

import { useGameStore, useGameSelectors } from '@/stores/game-store';

/**
 * Main game hook combining game state, selectors, and actions.
 * Zustand store actions are stable references — no useCallback wrappers needed.
 */
export function useGame() {
  const gameStore = useGameStore();
  const selectors = useGameSelectors();

  // Get game state
  const {
    sessionId,
    status,
    questions,
    selectedQuestionIndex,
    displayQuestionIndex,
    currentRound,
    totalRounds,
    teams,
    timer,
    showScoreboard,
    emergencyBlank,
    ttsEnabled,
  } = gameStore;

  return {
    // State
    sessionId,
    status,
    questions,
    selectedQuestionIndex,
    displayQuestionIndex,
    currentRound,
    totalRounds,
    teams,
    timer,
    showScoreboard,
    emergencyBlank,
    ttsEnabled,

    // Computed (selectors)
    selectedQuestion: selectors.selectedQuestion,
    displayQuestion: selectors.displayQuestion,
    progress: selectors.progress,
    canStart: selectors.canStart,
    isGameOver: selectors.isGameOver,
    // Round selectors
    roundProgress: selectors.roundProgress,
    questionInRoundProgress: selectors.questionInRoundProgress,
    isLastQuestionOfRound: selectors.isLastQuestionOfRound,
    isLastRound: selectors.isLastRound,
    currentRoundQuestions: selectors.currentRoundQuestions,
    roundWinners: selectors.roundWinners,
    overallLeaders: selectors.overallLeaders,
    teamsSortedByScore: selectors.teamsSortedByScore,

    // Validation
    validation: selectors.validation,

    // Actions (Zustand actions are stable references)
    startGame: gameStore.startGame,
    endGame: gameStore.endGame,
    resetGame: gameStore.resetGame,
    selectQuestion: gameStore.selectQuestion,
    setDisplayQuestion: gameStore.setDisplayQuestion,
    addTeam: gameStore.addTeam,
    removeTeam: gameStore.removeTeam,
    renameTeam: gameStore.renameTeam,
    adjustTeamScore: gameStore.adjustTeamScore,
    setTeamScore: gameStore.setTeamScore,
    completeRound: gameStore.completeRound,
    nextRound: gameStore.nextRound,
    // Emergency blank (visual-only toggle)
    toggleEmergencyBlank: gameStore.toggleEmergencyBlank,
    // Settings actions
    updateSettings: gameStore.updateSettings,
    loadTeamsFromSetup: gameStore.loadTeamsFromSetup,
  };
}
