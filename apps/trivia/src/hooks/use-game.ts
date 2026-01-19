'use client';

import { useCallback } from 'react';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import type { GameSettings } from '@/types';

/**
 * Main game hook combining game state, selectors, and actions.
 */
export function useGame() {
  const gameStore = useGameStore();
  const selectors = useGameSelectors();

  // Get game state
  const {
    sessionId,
    status,
    statusBeforePause,
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

  // Game actions
  const startGame = useCallback(() => {
    gameStore.startGame();
  }, [gameStore]);

  const endGame = useCallback(() => {
    gameStore.endGame();
  }, [gameStore]);

  const resetGame = useCallback(() => {
    gameStore.resetGame();
  }, [gameStore]);

  const selectQuestion = useCallback(
    (index: number) => {
      gameStore.selectQuestion(index);
    },
    [gameStore]
  );

  const setDisplayQuestion = useCallback(
    (index: number | null) => {
      gameStore.setDisplayQuestion(index);
    },
    [gameStore]
  );

  const addTeam = useCallback(
    (name?: string) => {
      gameStore.addTeam(name);
    },
    [gameStore]
  );

  const removeTeam = useCallback(
    (teamId: string) => {
      gameStore.removeTeam(teamId);
    },
    [gameStore]
  );

  const renameTeam = useCallback(
    (teamId: string, name: string) => {
      gameStore.renameTeam(teamId, name);
    },
    [gameStore]
  );

  const adjustTeamScore = useCallback(
    (teamId: string, delta: number) => {
      gameStore.adjustTeamScore(teamId, delta);
    },
    [gameStore]
  );

  const setTeamScore = useCallback(
    (teamId: string, score: number) => {
      gameStore.setTeamScore(teamId, score);
    },
    [gameStore]
  );

  const completeRound = useCallback(() => {
    gameStore.completeRound();
  }, [gameStore]);

  const nextRound = useCallback(() => {
    gameStore.nextRound();
  }, [gameStore]);

  // Pause actions
  const pauseGame = useCallback(() => {
    gameStore.pauseGame();
  }, [gameStore]);

  const resumeGame = useCallback(() => {
    gameStore.resumeGame();
  }, [gameStore]);

  const emergencyPause = useCallback(() => {
    gameStore.emergencyPause();
  }, [gameStore]);

  // Settings actions
  const updateSettings = useCallback(
    (settings: Partial<GameSettings>) => {
      gameStore.updateSettings(settings);
    },
    [gameStore]
  );

  const loadTeamsFromSetup = useCallback(
    (names: string[]) => {
      gameStore.loadTeamsFromSetup(names);
    },
    [gameStore]
  );

  return {
    // State
    sessionId,
    status,
    statusBeforePause,
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
    // Pause selectors
    isPaused: selectors.isPaused,
    canPause: selectors.canPause,
    canResume: selectors.canResume,

    // Actions
    startGame,
    endGame,
    resetGame,
    selectQuestion,
    setDisplayQuestion,
    addTeam,
    removeTeam,
    renameTeam,
    adjustTeamScore,
    setTeamScore,
    completeRound,
    nextRound,
    // Pause actions
    pauseGame,
    resumeGame,
    emergencyPause,
    // Settings actions
    updateSettings,
    loadTeamsFromSetup,
  };
}
