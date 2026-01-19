'use client';

import { useCallback } from 'react';
import { useGameStore, useGameSelectors } from '@/stores/game-store';

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
    questions,
    selectedQuestionIndex,
    displayQuestionIndex,
    currentRound,
    totalRounds,
    teams,
    showScoreboard,
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
    showScoreboard,
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
  };
}
