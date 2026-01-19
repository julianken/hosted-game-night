import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createInitialState,
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
  setTeamRoundScore,
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
  completeRound,
  nextRound,
  getRoundWinners,
  getOverallLeaders,
  getTeamsSortedByScore,
} from '../engine';
import type { TriviaGameState } from '@/types';
import { MAX_TEAMS, DEFAULT_ROUNDS } from '@/types';

// Mock uuid to return predictable but unique values
const mockUuidCounter = vi.hoisted(() => ({ value: 0 }));
vi.mock('uuid', () => ({
  v4: vi.fn(() => `mock-uuid-${++mockUuidCounter.value}`),
}));

describe('Trivia Game Engine', () => {
  // ==========================================================================
  // INITIAL STATE
  // ==========================================================================
  describe('createInitialState', () => {
    it('should return valid initial state', () => {
      const state = createInitialState();

      expect(state.status).toBe('setup');
      expect(state.selectedQuestionIndex).toBe(0);
      expect(state.displayQuestionIndex).toBeNull();
      expect(state.currentRound).toBe(0);
      expect(state.totalRounds).toBe(DEFAULT_ROUNDS);
      expect(state.teams).toEqual([]);
      expect(state.showScoreboard).toBe(true);
      expect(state.ttsEnabled).toBe(false);
      expect(Array.isArray(state.questions)).toBe(true);
    });

    it('should generate unique sessionId', () => {
      const state = createInitialState();
      expect(state.sessionId).toMatch(/^mock-uuid-\d+$/);
    });
  });

  // ==========================================================================
  // GAME LIFECYCLE
  // ==========================================================================
  describe('startGame', () => {
    it('should transition from setup to playing', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      const result = startGame(state);

      expect(result.status).toBe('playing');
    });

    it('should return unchanged state if no teams', () => {
      const state = createInitialState();
      const result = startGame(state);

      expect(result.status).toBe('setup');
      expect(result).toBe(state);
    });

    it('should initialize team scores to 0', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state.teams[0].score = 100; // Set initial score
      const result = startGame(state);

      expect(result.teams[0].score).toBe(0);
    });

    it('should initialize roundScores array', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      const result = startGame(state);

      expect(result.teams[0].roundScores).toHaveLength(DEFAULT_ROUNDS);
      expect(result.teams[0].roundScores.every((s) => s === 0)).toBe(true);
    });

    it('should return unchanged if not in setup status', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = startGame(state);

      expect(result).toBe(state);
    });

    it('should set selectedQuestionIndex to first question of round 0', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      const result = startGame(state);

      const firstRound0Question = state.questions.findIndex(
        (q) => q.roundIndex === 0
      );
      expect(result.selectedQuestionIndex).toBe(firstRound0Question);
    });

    it('should clear displayQuestionIndex', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = { ...state, displayQuestionIndex: 5 };
      const result = startGame(state);

      expect(result.displayQuestionIndex).toBeNull();
    });
  });

  describe('endGame', () => {
    it('should transition to ended status', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = endGame(state);

      expect(result.status).toBe('ended');
    });

    it('should clear displayQuestionIndex', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = setDisplayQuestion(state, 0);
      const result = endGame(state);

      expect(result.displayQuestionIndex).toBeNull();
    });
  });

  describe('resetGame', () => {
    it('should reset state but preserve sessionId', () => {
      let state = createInitialState();
      const originalSessionId = state.sessionId;
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = adjustTeamScore(state, state.teams[0].id, 50);
      const result = resetGame(state);

      expect(result.sessionId).toBe(originalSessionId);
      expect(result.status).toBe('setup');
    });

    it('should reset team scores to 0', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = adjustTeamScore(state, state.teams[0].id, 50);
      const result = resetGame(state);

      expect(result.teams[0].score).toBe(0);
    });

    it('should preserve teams', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = addTeam(state, 'Team B');
      state = startGame(state);
      const result = resetGame(state);

      expect(result.teams).toHaveLength(2);
      expect(result.teams[0].name).toBe('Team A');
      expect(result.teams[1].name).toBe('Team B');
    });

    it('should clear roundScores', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = adjustTeamScore(state, state.teams[0].id, 50);
      const result = resetGame(state);

      expect(result.teams[0].roundScores).toEqual([]);
    });
  });

  // ==========================================================================
  // QUESTION NAVIGATION
  // ==========================================================================
  describe('selectQuestion', () => {
    it('should update selectedQuestionIndex', () => {
      const state = createInitialState();
      const result = selectQuestion(state, 5);

      expect(result.selectedQuestionIndex).toBe(5);
    });

    it('should validate negative bounds', () => {
      const state = createInitialState();
      const result = selectQuestion(state, -1);

      expect(result).toBe(state);
    });

    it('should validate upper bounds', () => {
      const state = createInitialState();
      const result = selectQuestion(state, state.questions.length);

      expect(result).toBe(state);
    });
  });

  describe('setDisplayQuestion', () => {
    it('should update displayQuestionIndex', () => {
      const state = createInitialState();
      const result = setDisplayQuestion(state, 3);

      expect(result.displayQuestionIndex).toBe(3);
    });

    it('should accept null to hide question', () => {
      let state = createInitialState();
      state = setDisplayQuestion(state, 3);
      const result = setDisplayQuestion(state, null);

      expect(result.displayQuestionIndex).toBeNull();
    });

    it('should validate negative bounds', () => {
      const state = createInitialState();
      const result = setDisplayQuestion(state, -1);

      expect(result).toBe(state);
    });

    it('should validate upper bounds', () => {
      const state = createInitialState();
      const result = setDisplayQuestion(state, state.questions.length);

      expect(result).toBe(state);
    });
  });

  // ==========================================================================
  // TEAM MANAGEMENT
  // ==========================================================================
  describe('addTeam', () => {
    it('should add team with custom name', () => {
      const state = createInitialState();
      const result = addTeam(state, 'The Champions');

      expect(result.teams).toHaveLength(1);
      expect(result.teams[0].name).toBe('The Champions');
    });

    it('should add team with default name', () => {
      const state = createInitialState();
      const result = addTeam(state);

      expect(result.teams[0].name).toBe('Table 1');
    });

    it('should assign sequential table numbers', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = addTeam(state, 'Team B');
      state = addTeam(state, 'Team C');

      expect(state.teams[0].tableNumber).toBe(1);
      expect(state.teams[1].tableNumber).toBe(2);
      expect(state.teams[2].tableNumber).toBe(3);
    });

    it('should respect MAX_TEAMS limit', () => {
      let state = createInitialState();
      for (let i = 0; i < MAX_TEAMS; i++) {
        state = addTeam(state, `Team ${i + 1}`);
      }
      const result = addTeam(state, 'One Too Many');

      expect(result.teams).toHaveLength(MAX_TEAMS);
      expect(result).toBe(state);
    });

    it('should initialize team with score 0', () => {
      const state = createInitialState();
      const result = addTeam(state, 'New Team');

      expect(result.teams[0].score).toBe(0);
    });

    it('should initialize team with empty roundScores', () => {
      const state = createInitialState();
      const result = addTeam(state, 'New Team');

      expect(result.teams[0].roundScores).toEqual([]);
    });
  });

  describe('removeTeam', () => {
    it('should remove team by ID', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = addTeam(state, 'Team B');
      const teamIdToRemove = state.teams[0].id;
      const result = removeTeam(state, teamIdToRemove);

      expect(result.teams).toHaveLength(1);
      expect(result.teams[0].name).toBe('Team B');
    });

    it('should preserve other teams', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = addTeam(state, 'Team B');
      state = addTeam(state, 'Team C');
      const teamIdToRemove = state.teams[1].id;
      const result = removeTeam(state, teamIdToRemove);

      expect(result.teams).toHaveLength(2);
      expect(result.teams[0].name).toBe('Team A');
      expect(result.teams[1].name).toBe('Team C');
    });

    it('should handle non-existent team ID', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      const result = removeTeam(state, 'non-existent-id');

      expect(result.teams).toHaveLength(1);
    });
  });

  describe('renameTeam', () => {
    it('should update team name by ID', () => {
      let state = createInitialState();
      state = addTeam(state, 'Old Name');
      const result = renameTeam(state, state.teams[0].id, 'New Name');

      expect(result.teams[0].name).toBe('New Name');
    });

    it('should preserve other team properties', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = adjustTeamScore(state, state.teams[0].id, 100);
      const originalTeam = state.teams[0];
      const result = renameTeam(state, originalTeam.id, 'Renamed');

      expect(result.teams[0].score).toBe(originalTeam.score);
      expect(result.teams[0].tableNumber).toBe(originalTeam.tableNumber);
    });
  });

  // ==========================================================================
  // SCORE MANAGEMENT
  // ==========================================================================
  describe('adjustTeamScore', () => {
    it('should increase current round score', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = adjustTeamScore(state, state.teams[0].id, 10);

      expect(result.teams[0].roundScores[0]).toBe(10);
    });

    it('should decrease current round score', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = adjustTeamScore(state, state.teams[0].id, 20);
      const result = adjustTeamScore(state, state.teams[0].id, -5);

      expect(result.teams[0].roundScores[0]).toBe(15);
    });

    it('should prevent negative round scores', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = adjustTeamScore(state, state.teams[0].id, 10);
      const result = adjustTeamScore(state, state.teams[0].id, -20);

      expect(result.teams[0].roundScores[0]).toBe(0);
    });

    it('should update total from round scores', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = adjustTeamScore(state, state.teams[0].id, 10);
      state = adjustTeamScore(state, state.teams[0].id, 5);

      expect(state.teams[0].score).toBe(15);
    });
  });

  describe('setTeamScore', () => {
    it('should set total score', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = setTeamScore(state, state.teams[0].id, 50);

      expect(result.teams[0].score).toBe(50);
    });

    it('should allocate to current round', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = setTeamScore(state, state.teams[0].id, 50);

      expect(result.teams[0].roundScores[0]).toBe(50);
    });

    it('should handle negative score (clamps to 0)', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = setTeamScore(state, state.teams[0].id, -10);

      expect(result.teams[0].score).toBe(0);
    });
  });

  describe('setTeamRoundScore', () => {
    it('should set specific round score', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = setTeamRoundScore(state, state.teams[0].id, 1, 25);

      expect(result.teams[0].roundScores[1]).toBe(25);
    });

    it('should update total score', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = setTeamRoundScore(state, state.teams[0].id, 0, 10);
      state = setTeamRoundScore(state, state.teams[0].id, 1, 20);

      expect(state.teams[0].score).toBe(30);
    });

    it('should prevent negative round score', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = setTeamRoundScore(state, state.teams[0].id, 0, -5);

      expect(result.teams[0].roundScores[0]).toBe(0);
    });
  });

  // ==========================================================================
  // SELECTORS
  // ==========================================================================
  describe('getSelectedQuestion', () => {
    it('should return question at selectedQuestionIndex', () => {
      const state = createInitialState();
      const result = getSelectedQuestion(state);

      expect(result).toBe(state.questions[state.selectedQuestionIndex]);
    });

    it('should return null for invalid index', () => {
      let state = createInitialState();
      state = { ...state, selectedQuestionIndex: 999 };
      const result = getSelectedQuestion(state);

      expect(result).toBeNull();
    });
  });

  describe('getDisplayQuestion', () => {
    it('should return question at displayQuestionIndex', () => {
      let state = createInitialState();
      state = setDisplayQuestion(state, 2);
      const result = getDisplayQuestion(state);

      expect(result).toBe(state.questions[2]);
    });

    it('should return null when displayQuestionIndex is null', () => {
      const state = createInitialState();
      const result = getDisplayQuestion(state);

      expect(result).toBeNull();
    });

    it('should return null for invalid index', () => {
      let state = createInitialState();
      state = { ...state, displayQuestionIndex: 999 };
      const result = getDisplayQuestion(state);

      expect(result).toBeNull();
    });
  });

  describe('getProgress', () => {
    it('should return formatted progress string', () => {
      const state = createInitialState();
      const result = getProgress(state);

      expect(result).toBe(`Question 1 of ${state.questions.length}`);
    });

    it('should update with selectedQuestionIndex', () => {
      let state = createInitialState();
      state = selectQuestion(state, 4);
      const result = getProgress(state);

      expect(result).toBe(`Question 5 of ${state.questions.length}`);
    });
  });

  describe('canStartGame', () => {
    it('should return true when setup with teams', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      const result = canStartGame(state);

      expect(result).toBe(true);
    });

    it('should return false when no teams', () => {
      const state = createInitialState();
      const result = canStartGame(state);

      expect(result).toBe(false);
    });

    it('should return false when not in setup status', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = canStartGame(state);

      expect(result).toBe(false);
    });
  });

  describe('isGameOver', () => {
    it('should return true when status is ended', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = endGame(state);
      const result = isGameOver(state);

      expect(result).toBe(true);
    });

    it('should return false for other statuses', () => {
      const state = createInitialState();
      expect(isGameOver(state)).toBe(false);

      let playingState = addTeam(state, 'Team A');
      playingState = startGame(playingState);
      expect(isGameOver(playingState)).toBe(false);
    });
  });

  // ==========================================================================
  // ROUND MANAGEMENT
  // ==========================================================================
  describe('getCurrentRoundQuestions', () => {
    it('should filter questions by current round', () => {
      const state = createInitialState();
      const result = getCurrentRoundQuestions(state);

      result.forEach((q) => {
        expect(q.roundIndex).toBe(state.currentRound);
      });
    });
  });

  describe('getQuestionsForRound', () => {
    it('should filter questions by specified round', () => {
      const state = createInitialState();
      const result = getQuestionsForRound(state, 1);

      result.forEach((q) => {
        expect(q.roundIndex).toBe(1);
      });
    });
  });

  describe('getRoundProgress', () => {
    it('should return formatted round progress', () => {
      const state = createInitialState();
      const result = getRoundProgress(state);

      expect(result).toBe(`Round 1 of ${state.totalRounds}`);
    });
  });

  describe('getQuestionInRoundProgress', () => {
    it('should return question in round progress', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = getQuestionInRoundProgress(state);

      expect(result).toMatch(/Question \d+ of \d+/);
    });
  });

  describe('isLastQuestionOfRound', () => {
    it('should return true for last question of round', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);

      const roundQuestions = getCurrentRoundQuestions(state);
      const lastQuestionIndex = state.questions.findIndex(
        (q) => q.id === roundQuestions[roundQuestions.length - 1].id
      );
      state = selectQuestion(state, lastQuestionIndex);

      expect(isLastQuestionOfRound(state)).toBe(true);
    });

    it('should return false for non-last question', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);

      expect(isLastQuestionOfRound(state)).toBe(false);
    });
  });

  describe('isLastRound', () => {
    it('should return true on final round', () => {
      let state = createInitialState();
      state = { ...state, currentRound: state.totalRounds - 1 };

      expect(isLastRound(state)).toBe(true);
    });

    it('should return false for earlier rounds', () => {
      const state = createInitialState();

      expect(isLastRound(state)).toBe(false);
    });
  });

  describe('completeRound', () => {
    it('should transition to between_rounds status', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = completeRound(state);

      expect(result.status).toBe('between_rounds');
    });

    it('should clear displayQuestionIndex', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = setDisplayQuestion(state, 0);
      const result = completeRound(state);

      expect(result.displayQuestionIndex).toBeNull();
    });

    it('should return unchanged if not playing', () => {
      const state = createInitialState();
      const result = completeRound(state);

      expect(result).toBe(state);
    });
  });

  describe('nextRound', () => {
    it('should advance round number', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = completeRound(state);
      const result = nextRound(state);

      expect(result.currentRound).toBe(1);
      expect(result.status).toBe('playing');
    });

    it('should end game if on last round', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = { ...state, currentRound: state.totalRounds - 1 };
      state = completeRound(state);
      const result = nextRound(state);

      expect(result.status).toBe('ended');
    });

    it('should return unchanged if not between_rounds', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = nextRound(state);

      expect(result).toBe(state);
    });

    it('should set selectedQuestionIndex to first question of next round', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = completeRound(state);
      const result = nextRound(state);

      const firstRound1Question = state.questions.findIndex(
        (q) => q.roundIndex === 1
      );
      expect(result.selectedQuestionIndex).toBe(firstRound1Question);
    });
  });

  describe('getRoundWinners', () => {
    it('should return highest scorer for round', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = addTeam(state, 'Team B');
      state = startGame(state);
      state = adjustTeamScore(state, state.teams[0].id, 50);
      state = adjustTeamScore(state, state.teams[1].id, 30);

      const winners = getRoundWinners(state, 0);
      expect(winners).toHaveLength(1);
      expect(winners[0].name).toBe('Team A');
    });

    it('should handle ties', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = addTeam(state, 'Team B');
      state = startGame(state);
      state = adjustTeamScore(state, state.teams[0].id, 50);
      state = adjustTeamScore(state, state.teams[1].id, 50);

      const winners = getRoundWinners(state, 0);
      expect(winners).toHaveLength(2);
    });

    it('should return empty array if no round scores', () => {
      const state = createInitialState();
      const winners = getRoundWinners(state, 0);
      expect(winners).toEqual([]);
    });
  });

  describe('getOverallLeaders', () => {
    it('should return highest total scorer', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = addTeam(state, 'Team B');
      state = startGame(state);
      state = adjustTeamScore(state, state.teams[0].id, 100);
      state = adjustTeamScore(state, state.teams[1].id, 75);

      const leaders = getOverallLeaders(state);
      expect(leaders).toHaveLength(1);
      expect(leaders[0].name).toBe('Team A');
    });

    it('should handle ties', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = addTeam(state, 'Team B');
      state = startGame(state);
      state = adjustTeamScore(state, state.teams[0].id, 100);
      state = adjustTeamScore(state, state.teams[1].id, 100);

      const leaders = getOverallLeaders(state);
      expect(leaders).toHaveLength(2);
    });

    it('should return empty array if no teams', () => {
      const state = createInitialState();
      const leaders = getOverallLeaders(state);
      expect(leaders).toEqual([]);
    });
  });

  describe('getTeamsSortedByScore', () => {
    it('should sort teams by score descending', () => {
      let state = createInitialState();
      state = addTeam(state, 'Low');
      state = addTeam(state, 'High');
      state = addTeam(state, 'Mid');
      state = startGame(state);
      state = adjustTeamScore(state, state.teams[0].id, 10);
      state = adjustTeamScore(state, state.teams[1].id, 100);
      state = adjustTeamScore(state, state.teams[2].id, 50);

      const sorted = getTeamsSortedByScore(state);
      expect(sorted[0].name).toBe('High');
      expect(sorted[1].name).toBe('Mid');
      expect(sorted[2].name).toBe('Low');
    });

    it('should not mutate original teams array', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = addTeam(state, 'Team B');
      state = startGame(state);

      const originalOrder = state.teams.map((t) => t.name);
      getTeamsSortedByScore(state);

      expect(state.teams.map((t) => t.name)).toEqual(originalOrder);
    });
  });
});
