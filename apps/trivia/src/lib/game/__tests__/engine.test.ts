import { describe, it, expect, vi } from 'vitest';
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
  // Timer functions
  tickTimer,
  resetTimer,
  startTimer,
  stopTimer,
  toggleTimerAutoStart,
  // Pause functions
  pauseGame,
  resumeGame,
  emergencyPause,
  // Settings functions
  updateSettings,
  // Answer management
  recordTeamAnswer,
  amendCorrectAnswers,
  // Display functions
  toggleScoreboard,
  // Question import/export functions
  importQuestions,
  exportQuestionsFromState,
  clearQuestions,
  addQuestion,
  removeQuestion,
  updateQuestion,
  // Validation
  validateGameSetup,
} from '../engine';
import { MAX_TEAMS, DEFAULT_ROUNDS, QuestionId } from '@/types';

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
      // Use spread operators to create new state without mutation
      state = {
        ...state,
        teams: state.teams.map((team, i) =>
          i === 0 ? { ...team, score: 100 } : team
        ),
      };
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

  // ==========================================================================
  // TIMER FUNCTIONS
  // ==========================================================================
  describe('tickTimer', () => {
    it('should decrement remaining time by 1', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = startTimer(state);
      const result = tickTimer(state);

      expect(result.timer.remaining).toBe(state.timer.remaining - 1);
    });

    it('should stop timer when reaching 0', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = {
        ...state,
        timer: { ...state.timer, remaining: 1, isRunning: true },
      };
      const result = tickTimer(state);

      expect(result.timer.remaining).toBe(0);
      expect(result.timer.isRunning).toBe(false);
    });

    it('should return unchanged if timer not running', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = tickTimer(state);

      expect(result).toBe(state);
    });

    it('should return unchanged if timer already at 0', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = {
        ...state,
        timer: { ...state.timer, remaining: 0, isRunning: true },
      };
      const result = tickTimer(state);

      expect(result).toBe(state);
    });
  });

  describe('resetTimer', () => {
    it('should reset to settings duration by default', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = {
        ...state,
        timer: { ...state.timer, remaining: 5, isRunning: true },
      };
      const result = resetTimer(state);

      expect(result.timer.remaining).toBe(state.settings.timerDuration);
      expect(result.timer.duration).toBe(state.settings.timerDuration);
      expect(result.timer.isRunning).toBe(false);
    });

    it('should reset to specified duration', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = resetTimer(state, 60);

      expect(result.timer.remaining).toBe(60);
      expect(result.timer.duration).toBe(60);
      expect(result.timer.isRunning).toBe(false);
    });
  });

  describe('startTimer', () => {
    it('should start the timer', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = startTimer(state);

      expect(result.timer.isRunning).toBe(true);
    });

    it('should not start if remaining is 0', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = { ...state, timer: { ...state.timer, remaining: 0 } };
      const result = startTimer(state);

      expect(result).toBe(state);
    });
  });

  describe('stopTimer', () => {
    it('should stop the timer', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = startTimer(state);
      const result = stopTimer(state);

      expect(result.timer.isRunning).toBe(false);
    });

    it('should preserve remaining time', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = startTimer(state);
      state = tickTimer(state);
      state = tickTimer(state);
      const remainingBefore = state.timer.remaining;
      const result = stopTimer(state);

      expect(result.timer.remaining).toBe(remainingBefore);
    });
  });

  describe('toggleTimerAutoStart', () => {
    it('should toggle timerAutoStart setting', () => {
      let state = createInitialState();
      expect(state.settings.timerAutoStart).toBe(false);

      state = toggleTimerAutoStart(state);
      expect(state.settings.timerAutoStart).toBe(true);

      state = toggleTimerAutoStart(state);
      expect(state.settings.timerAutoStart).toBe(false);
    });
  });

  // ==========================================================================
  // PAUSE FUNCTIONS
  // ==========================================================================
  describe('pauseGame', () => {
    it('should transition to paused from playing', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = pauseGame(state);

      expect(result.status).toBe('paused');
      expect(result.statusBeforePause).toBe('playing');
    });

    it('should transition to paused from between_rounds', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = completeRound(state);
      const result = pauseGame(state);

      expect(result.status).toBe('paused');
      expect(result.statusBeforePause).toBe('between_rounds');
    });

    it('should stop timer when pausing', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = startTimer(state);
      const result = pauseGame(state);

      expect(result.timer.isRunning).toBe(false);
    });

    it('should return unchanged if not playing or between_rounds', () => {
      const state = createInitialState();
      const result = pauseGame(state);

      expect(result).toBe(state);
    });

    it('should return unchanged if already ended', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = endGame(state);
      const result = pauseGame(state);

      expect(result).toBe(state);
    });
  });

  describe('resumeGame', () => {
    it('should restore previous status from pause', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = pauseGame(state);
      const result = resumeGame(state);

      expect(result.status).toBe('playing');
      expect(result.statusBeforePause).toBeNull();
    });

    it('should restore between_rounds status', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = completeRound(state);
      state = pauseGame(state);
      const result = resumeGame(state);

      expect(result.status).toBe('between_rounds');
    });

    it('should clear emergencyBlank', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = emergencyPause(state);
      const result = resumeGame(state);

      expect(result.emergencyBlank).toBe(false);
    });

    it('should return unchanged if not paused', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = resumeGame(state);

      expect(result).toBe(state);
    });

    it('should return unchanged if no statusBeforePause', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = { ...state, status: 'paused', statusBeforePause: null };
      const result = resumeGame(state);

      expect(result).toBe(state);
    });
  });

  describe('emergencyPause', () => {
    it('should pause and set emergencyBlank', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = emergencyPause(state);

      expect(result.status).toBe('paused');
      expect(result.emergencyBlank).toBe(true);
      expect(result.statusBeforePause).toBe('playing');
    });

    it('should stop timer', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = startTimer(state);
      const result = emergencyPause(state);

      expect(result.timer.isRunning).toBe(false);
    });

    it('should work from between_rounds', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = completeRound(state);
      const result = emergencyPause(state);

      expect(result.status).toBe('paused');
      expect(result.emergencyBlank).toBe(true);
      expect(result.statusBeforePause).toBe('between_rounds');
    });

    it('should preserve original status when called while already paused', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      state = pauseGame(state);
      const result = emergencyPause(state);

      expect(result.status).toBe('paused');
      expect(result.emergencyBlank).toBe(true);
      expect(result.statusBeforePause).toBe('playing');
    });

    it('should return unchanged if setup or ended', () => {
      const setupState = createInitialState();
      expect(emergencyPause(setupState)).toBe(setupState);

      let endedState = createInitialState();
      endedState = addTeam(endedState, 'Team A');
      endedState = startGame(endedState);
      endedState = endGame(endedState);
      expect(emergencyPause(endedState)).toBe(endedState);
    });
  });

  // ==========================================================================
  // SETTINGS FUNCTIONS
  // ==========================================================================
  describe('updateSettings', () => {
    it('should update settings during setup', () => {
      let state = createInitialState();
      const result = updateSettings(state, {
        roundsCount: 5,
        timerDuration: 45,
      });

      expect(result.settings.roundsCount).toBe(5);
      expect(result.settings.timerDuration).toBe(45);
    });

    it('should update totalRounds when roundsCount changes', () => {
      let state = createInitialState();
      const result = updateSettings(state, { roundsCount: 6 });

      expect(result.totalRounds).toBe(6);
    });

    it('should update timer when timerDuration changes', () => {
      let state = createInitialState();
      const result = updateSettings(state, { timerDuration: 60 });

      expect(result.timer.duration).toBe(60);
      expect(result.timer.remaining).toBe(60);
    });

    it('should allow partial updates', () => {
      let state = createInitialState();
      const originalRoundsCount = state.settings.roundsCount;
      const result = updateSettings(state, { timerAutoStart: true });

      expect(result.settings.timerAutoStart).toBe(true);
      expect(result.settings.roundsCount).toBe(originalRoundsCount);
    });

    it('should return unchanged if not in setup', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = updateSettings(state, { roundsCount: 10 });

      expect(result).toBe(state);
    });
  });

  // ==========================================================================
  // ANSWER MANAGEMENT
  // ==========================================================================
  describe('recordTeamAnswer', () => {
    it('should record a team answer', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const questionId = state.questions[0].id;
      const teamId = state.teams[0].id;

      const result = recordTeamAnswer(state, teamId, questionId, 'A', 10);

      expect(result.teamAnswers).toHaveLength(1);
      expect(result.teamAnswers[0].teamId).toBe(teamId);
      expect(result.teamAnswers[0].questionId).toBe(questionId);
      expect(result.teamAnswers[0].answer).toBe('A');
      expect(result.teamAnswers[0].pointsAwarded).toBe(10);
    });

    it('should mark correct answers as correct', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const question = state.questions[0];
      const correctAnswer = question.correctAnswers[0];

      const result = recordTeamAnswer(
        state,
        state.teams[0].id,
        question.id,
        correctAnswer,
        10
      );

      expect(result.teamAnswers[0].isCorrect).toBe(true);
    });

    it('should mark incorrect answers as incorrect', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const question = state.questions[0];
      const wrongAnswer = question.options.find(
        (opt) => !question.correctAnswers.includes(opt)
      );

      const result = recordTeamAnswer(
        state,
        state.teams[0].id,
        question.id,
        wrongAnswer!,
        10
      );

      expect(result.teamAnswers[0].isCorrect).toBe(false);
    });

    it('should replace existing answer for same team/question', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const questionId = state.questions[0].id;
      const teamId = state.teams[0].id;

      state = recordTeamAnswer(state, teamId, questionId, 'A', 10);
      const result = recordTeamAnswer(state, teamId, questionId, 'B', 15);

      expect(result.teamAnswers).toHaveLength(1);
      expect(result.teamAnswers[0].answer).toBe('B');
      expect(result.teamAnswers[0].pointsAwarded).toBe(15);
    });

    it('should return unchanged for non-existent question', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);

      const result = recordTeamAnswer(
        state,
        state.teams[0].id,
        'non-existent' as QuestionId,
        'A',
        10
      );

      expect(result).toBe(state);
    });
  });

  describe('amendCorrectAnswers', () => {
    it('should update question correct answers', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);

      const result = amendCorrectAnswers(state, 0, ['B', 'C']);

      expect(result.questions[0].correctAnswers).toEqual(['B', 'C']);
    });

    it('should recalculate scores when answer becomes correct', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const question = state.questions[0];

      // Record wrong answer with 10 points awarded
      state = recordTeamAnswer(state, state.teams[0].id, question.id, 'Z', 10);
      state = adjustTeamScore(state, state.teams[0].id, 0); // Start with 0

      // Amend correct answers to include Z
      const result = amendCorrectAnswers(state, 0, ['Z']);

      // Team answer should now be marked correct
      expect(result.teamAnswers[0].isCorrect).toBe(true);
      // Score should increase by 10 points
      expect(result.teams[0].roundScores[0]).toBe(10);
    });

    it('should recalculate scores when answer becomes incorrect', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const question = state.questions[0];
      const originalCorrect = question.correctAnswers[0];

      // Record correct answer and add points
      state = recordTeamAnswer(
        state,
        state.teams[0].id,
        question.id,
        originalCorrect,
        10
      );
      state = adjustTeamScore(state, state.teams[0].id, 10);

      // Amend correct answers to exclude original
      const result = amendCorrectAnswers(state, 0, ['Z']);

      // Team answer should now be marked incorrect
      expect(result.teamAnswers[0].isCorrect).toBe(false);
      // Score should decrease by 10 points (clamped to 0)
      expect(result.teams[0].roundScores[0]).toBe(0);
    });

    it('should handle multiple teams', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = addTeam(state, 'Team B');
      state = startGame(state);
      const question = state.questions[0];

      // Team A answers wrong, Team B answers with what will become correct
      state = recordTeamAnswer(state, state.teams[0].id, question.id, 'X', 10);
      state = recordTeamAnswer(state, state.teams[1].id, question.id, 'Y', 10);

      // Amend to make Y correct
      const result = amendCorrectAnswers(state, 0, ['Y']);

      expect(result.teamAnswers.find((a) => a.teamId === state.teams[0].id)?.isCorrect).toBe(false);
      expect(result.teamAnswers.find((a) => a.teamId === state.teams[1].id)?.isCorrect).toBe(true);
    });

    it('should return unchanged for invalid question index', () => {
      const state = createInitialState();

      expect(amendCorrectAnswers(state, -1, ['A'])).toBe(state);
      expect(amendCorrectAnswers(state, 999, ['A'])).toBe(state);
    });

    it('should not affect other questions', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);

      const originalQ1Answers = [...state.questions[1].correctAnswers];
      const result = amendCorrectAnswers(state, 0, ['X']);

      expect(result.questions[1].correctAnswers).toEqual(originalQ1Answers);
    });
  });

  // ==========================================================================
  // DISPLAY FUNCTIONS
  // ==========================================================================
  describe('toggleScoreboard', () => {
    it('should toggle showScoreboard from true to false', () => {
      let state = createInitialState();
      expect(state.showScoreboard).toBe(true);

      const result = toggleScoreboard(state);
      expect(result.showScoreboard).toBe(false);
    });

    it('should toggle showScoreboard from false to true', () => {
      let state = createInitialState();
      state = toggleScoreboard(state);
      expect(state.showScoreboard).toBe(false);

      const result = toggleScoreboard(state);
      expect(result.showScoreboard).toBe(true);
    });
  });

  // ==========================================================================
  // QUESTION IMPORT/EXPORT FUNCTIONS
  // ==========================================================================
  describe('importQuestions', () => {
    const testQuestions = [
      {
        id: 'test-q1' as QuestionId,
        text: 'Test question 1',
        type: 'multiple_choice' as const,
        options: ['A', 'B', 'C', 'D'],
        optionTexts: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswers: ['A'],
        category: 'history' as const,
        roundIndex: 0,
      },
      {
        id: 'test-q2' as QuestionId,
        text: 'Test question 2',
        type: 'true_false' as const,
        options: ['True', 'False'],
        optionTexts: ['True', 'False'],
        correctAnswers: ['True'],
        category: 'music' as const,
        roundIndex: 1,
      },
    ];

    it('should replace questions in setup mode', () => {
      let state = createInitialState();
      const result = importQuestions(state, testQuestions, 'replace');

      expect(result.questions).toEqual(testQuestions);
      expect(result.questions).toHaveLength(2);
    });

    it('should append questions in setup mode', () => {
      let state = createInitialState();
      const originalLength = state.questions.length;
      const result = importQuestions(state, testQuestions, 'append');

      expect(result.questions).toHaveLength(originalLength + 2);
    });

    it('should update totalRounds based on max roundIndex', () => {
      let state = createInitialState();
      const questionsWithHighRound = [
        { ...testQuestions[0], roundIndex: 4 },
      ];
      const result = importQuestions(state, questionsWithHighRound, 'replace');

      expect(result.totalRounds).toBe(5); // 0-indexed, so roundIndex 4 = 5 rounds
    });

    it('should update settings.roundsCount to match totalRounds', () => {
      let state = createInitialState();
      const questionsWithHighRound = [
        { ...testQuestions[0], roundIndex: 3 },
      ];
      const result = importQuestions(state, questionsWithHighRound, 'replace');

      expect(result.settings.roundsCount).toBe(4);
    });

    it('should reset selectedQuestionIndex to 0', () => {
      let state = createInitialState();
      state = selectQuestion(state, 5);
      const result = importQuestions(state, testQuestions, 'replace');

      expect(result.selectedQuestionIndex).toBe(0);
    });

    it('should reset displayQuestionIndex to null', () => {
      let state = createInitialState();
      state = setDisplayQuestion(state, 2);
      const result = importQuestions(state, testQuestions, 'replace');

      expect(result.displayQuestionIndex).toBeNull();
    });

    it('should return unchanged if not in setup mode', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = importQuestions(state, testQuestions, 'replace');

      expect(result).toBe(state);
    });

    it('should return unchanged if questions array is empty', () => {
      let state = createInitialState();
      const result = importQuestions(state, [], 'replace');

      expect(result).toBe(state);
    });

    it('should default to replace mode', () => {
      let state = createInitialState();
      const result = importQuestions(state, testQuestions);

      expect(result.questions).toEqual(testQuestions);
    });
  });

  describe('exportQuestionsFromState', () => {
    it('should return a copy of questions array', () => {
      const state = createInitialState();
      const result = exportQuestionsFromState(state);

      expect(result).toEqual(state.questions);
      expect(result).not.toBe(state.questions); // Should be a copy
    });

    it('should not be affected by mutations to the result', () => {
      const state = createInitialState();
      const result = exportQuestionsFromState(state);
      result.push({
        id: 'new' as QuestionId,
        text: 'New question',
        type: 'multiple_choice',
        options: ['A', 'B', 'C', 'D'],
        optionTexts: ['A', 'B', 'C', 'D'],
        correctAnswers: ['A'],
        category: 'history',
        roundIndex: 0,
      });

      expect(state.questions).not.toContain(result[result.length - 1]);
    });
  });

  describe('clearQuestions', () => {
    it('should clear all questions in setup mode', () => {
      let state = createInitialState();
      const result = clearQuestions(state);

      expect(result.questions).toEqual([]);
    });

    it('should reset selectedQuestionIndex to 0', () => {
      let state = createInitialState();
      state = selectQuestion(state, 5);
      const result = clearQuestions(state);

      expect(result.selectedQuestionIndex).toBe(0);
    });

    it('should reset displayQuestionIndex to null', () => {
      let state = createInitialState();
      state = setDisplayQuestion(state, 2);
      const result = clearQuestions(state);

      expect(result.displayQuestionIndex).toBeNull();
    });

    it('should return unchanged if not in setup mode', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = clearQuestions(state);

      expect(result).toBe(state);
    });
  });

  describe('addQuestion', () => {
    const newQuestion = {
      id: 'new-q' as QuestionId,
      text: 'New question',
      type: 'multiple_choice' as const,
      options: ['A', 'B', 'C', 'D'],
      optionTexts: ['A', 'B', 'C', 'D'],
      correctAnswers: ['A'],
      category: 'history' as const,
      roundIndex: 0,
    };

    it('should add a question in setup mode', () => {
      let state = createInitialState();
      const originalLength = state.questions.length;
      const result = addQuestion(state, newQuestion);

      expect(result.questions).toHaveLength(originalLength + 1);
      expect(result.questions[result.questions.length - 1]).toEqual(newQuestion);
    });

    it('should update totalRounds if question has higher roundIndex', () => {
      let state = createInitialState();
      const highRoundQuestion = { ...newQuestion, roundIndex: 10 };
      const result = addQuestion(state, highRoundQuestion);

      expect(result.totalRounds).toBe(11);
      expect(result.settings.roundsCount).toBe(11);
    });

    it('should not decrease totalRounds', () => {
      let state = createInitialState();
      state = { ...state, totalRounds: 10, settings: { ...state.settings, roundsCount: 10 } };
      const result = addQuestion(state, newQuestion);

      expect(result.totalRounds).toBe(10);
    });

    it('should return unchanged if not in setup mode', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = addQuestion(state, newQuestion);

      expect(result).toBe(state);
    });
  });

  describe('removeQuestion', () => {
    it('should remove question at specified index', () => {
      let state = createInitialState();
      const originalLength = state.questions.length;
      const removedId = state.questions[2].id;
      const result = removeQuestion(state, 2);

      expect(result.questions).toHaveLength(originalLength - 1);
      expect(result.questions.find(q => q.id === removedId)).toBeUndefined();
    });

    it('should adjust selectedQuestionIndex if needed', () => {
      let state = createInitialState();
      state = selectQuestion(state, state.questions.length - 1);
      const result = removeQuestion(state, state.questions.length - 1);

      expect(result.selectedQuestionIndex).toBeLessThanOrEqual(result.questions.length - 1);
    });

    it('should reset displayQuestionIndex to null', () => {
      let state = createInitialState();
      state = setDisplayQuestion(state, 2);
      const result = removeQuestion(state, 0);

      expect(result.displayQuestionIndex).toBeNull();
    });

    it('should return unchanged for invalid index', () => {
      let state = createInitialState();

      expect(removeQuestion(state, -1)).toBe(state);
      expect(removeQuestion(state, state.questions.length)).toBe(state);
    });

    it('should return unchanged if not in setup mode', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = removeQuestion(state, 0);

      expect(result).toBe(state);
    });
  });

  describe('updateQuestion', () => {
    const updatedQuestion = {
      id: 'updated-q' as QuestionId,
      text: 'Updated question text',
      type: 'true_false' as const,
      options: ['True', 'False'],
      optionTexts: ['True', 'False'],
      correctAnswers: ['True'],
      category: 'music' as const,
      roundIndex: 5,
    };

    it('should update question at specified index', () => {
      let state = createInitialState();
      const result = updateQuestion(state, 0, updatedQuestion);

      expect(result.questions[0]).toEqual(updatedQuestion);
    });

    it('should update totalRounds if new question has higher roundIndex', () => {
      let state = createInitialState();
      const result = updateQuestion(state, 0, updatedQuestion);

      expect(result.totalRounds).toBeGreaterThanOrEqual(6);
    });

    it('should not affect other questions', () => {
      let state = createInitialState();
      const originalQ1 = { ...state.questions[1] };
      const result = updateQuestion(state, 0, updatedQuestion);

      expect(result.questions[1]).toEqual(originalQ1);
    });

    it('should return unchanged for invalid index', () => {
      let state = createInitialState();

      expect(updateQuestion(state, -1, updatedQuestion)).toBe(state);
      expect(updateQuestion(state, state.questions.length, updatedQuestion)).toBe(state);
    });

    it('should return unchanged if not in setup mode', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = startGame(state);
      const result = updateQuestion(state, 0, updatedQuestion);

      expect(result).toBe(state);
    });
  });

  // ==========================================================================
  // VALIDATE GAME SETUP
  // ==========================================================================
  describe('validateGameSetup', () => {
    it('V1: should block when no questions loaded', () => {
      let state = createInitialState();
      state = clearQuestions(state);
      const result = validateGameSetup(state);

      expect(result.canStart).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ id: 'V1', severity: 'block', message: 'No questions loaded' })
      );
    });

    it('V2: should block when round 0 has no questions', () => {
      let state = createInitialState();
      // Import questions only for round 1, none for round 0
      const round1Only = [
        {
          id: 'q1' as QuestionId,
          text: 'Q1',
          type: 'multiple_choice' as const,
          options: ['A', 'B', 'C', 'D'],
          optionTexts: ['A', 'B', 'C', 'D'],
          correctAnswers: ['A'],
          category: 'general_knowledge' as const,
          roundIndex: 1,
        },
      ];
      state = importQuestions(state, round1Only);
      state = updateSettings(state, { roundsCount: 2 });
      const result = validateGameSetup(state);

      expect(result.canStart).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ id: 'V2', severity: 'block', message: 'Round 1 has no questions', roundIndex: 0 })
      );
    });

    it('V3: should block when round 1 is empty (roundsCount > 1)', () => {
      let state = createInitialState();
      // Import questions only for round 0, none for round 1
      const round0Only = [
        {
          id: 'q1' as QuestionId,
          text: 'Q1',
          type: 'multiple_choice' as const,
          options: ['A', 'B', 'C', 'D'],
          optionTexts: ['A', 'B', 'C', 'D'],
          correctAnswers: ['A'],
          category: 'general_knowledge' as const,
          roundIndex: 0,
        },
      ];
      state = importQuestions(state, round0Only);
      state = updateSettings(state, { roundsCount: 2 });
      const result = validateGameSetup(state);

      expect(result.canStart).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ id: 'V3', severity: 'block', message: 'Round 2 has no questions', roundIndex: 1 })
      );
    });

    it('V4: should block when no teams added', () => {
      const state = createInitialState();
      const result = validateGameSetup(state);

      expect(result.canStart).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ id: 'V4', severity: 'block', message: 'No teams added' })
      );
    });

    it('V5: should warn when timer duration is very short', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = addTeam(state, 'Team B');
      state = updateSettings(state, { timerDuration: 5 });
      const result = validateGameSetup(state);

      expect(result.issues).toContainEqual(
        expect.objectContaining({ id: 'V5', severity: 'warn', message: 'Timer duration is very short' })
      );
    });

    it('V6: should warn when round question count mismatches questionsPerRound', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = addTeam(state, 'Team B');
      // Default has 5 questions per round and questionsPerRound=5
      // Change questionsPerRound to 3 to trigger mismatch
      state = updateSettings(state, { questionsPerRound: 3 });
      const result = validateGameSetup(state);

      const v6Issues = result.issues.filter(i => i.id === 'V6');
      expect(v6Issues.length).toBeGreaterThan(0);
      expect(v6Issues[0]).toMatchObject({
        severity: 'warn',
        message: expect.stringContaining('has 5 questions but 3 are configured'),
      });
    });

    it('V7: should warn when only one team', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      const result = validateGameSetup(state);

      expect(result.issues).toContainEqual(
        expect.objectContaining({ id: 'V7', severity: 'warn', message: 'Only one team — consider adding more' })
      );
    });

    it('should report both blocks when no questions and no teams', () => {
      let state = createInitialState();
      state = clearQuestions(state);
      const result = validateGameSetup(state);

      expect(result.canStart).toBe(false);
      expect(result.blockCount).toBeGreaterThanOrEqual(2);
      const blockIds = result.issues.filter(i => i.severity === 'block').map(i => i.id);
      expect(blockIds).toContain('V1');
      expect(blockIds).toContain('V4');
    });

    it('should return canStart true with valid setup', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = addTeam(state, 'Team B');
      const result = validateGameSetup(state);

      expect(result.canStart).toBe(true);
      expect(result.blockCount).toBe(0);
    });

    it('should report correct counts when blocks and warns coexist', () => {
      let state = createInitialState();
      // No teams = 1 block (V4), 1 team warn not possible since 0 teams
      // Short timer = 1 warn (V5)
      state = updateSettings(state, { timerDuration: 5 });
      const result = validateGameSetup(state);

      expect(result.canStart).toBe(false);
      expect(result.blockCount).toBeGreaterThanOrEqual(1);
      expect(result.warnCount).toBeGreaterThanOrEqual(1);
      expect(result.issues.some(i => i.id === 'V4')).toBe(true);
      expect(result.issues.some(i => i.id === 'V5')).toBe(true);
    });

    it('should report multiple blocks for empty state', () => {
      let state = createInitialState();
      state = clearQuestions(state);
      const result = validateGameSetup(state);

      // V1 (no questions) + V4 (no teams)
      expect(result.blockCount).toBeGreaterThanOrEqual(2);
      expect(result.canStart).toBe(false);
    });

    it('should block exactly the empty round among many', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = addTeam(state, 'Team B');
      // Create questions for rounds 0 and 2, but not round 1
      const questions = [
        {
          id: 'q1' as QuestionId,
          text: 'Q1',
          type: 'multiple_choice' as const,
          options: ['A', 'B', 'C', 'D'],
          optionTexts: ['A', 'B', 'C', 'D'],
          correctAnswers: ['A'],
          category: 'general_knowledge' as const,
          roundIndex: 0,
        },
        {
          id: 'q2' as QuestionId,
          text: 'Q2',
          type: 'multiple_choice' as const,
          options: ['A', 'B', 'C', 'D'],
          optionTexts: ['A', 'B', 'C', 'D'],
          correctAnswers: ['A'],
          category: 'general_knowledge' as const,
          roundIndex: 2,
        },
      ];
      state = importQuestions(state, questions);
      const result = validateGameSetup(state);

      const emptyRoundIssues = result.issues.filter(
        i => (i.id === 'V3') && i.roundIndex === 1
      );
      expect(emptyRoundIssues).toHaveLength(1);
      expect(emptyRoundIssues[0].message).toBe('Round 2 has no questions');
    });

    it('should report correct warnCount for full state with warnings', () => {
      let state = createInitialState();
      state = addTeam(state, 'Solo Team');
      state = updateSettings(state, { timerDuration: 5, questionsPerRound: 3 });
      const result = validateGameSetup(state);

      // V5 (short timer) + V7 (single team) + V6 (mismatch per round)
      expect(result.warnCount).toBeGreaterThanOrEqual(3);
      expect(result.canStart).toBe(true); // All are warns, no blocks
    });
  });

  // ==========================================================================
  // canStartGame BEHAVIORAL TESTS (post-validateGameSetup integration)
  // ==========================================================================
  describe('canStartGame (behavioral)', () => {
    it('should return false when teams present but no questions', () => {
      let state = createInitialState();
      state = clearQuestions(state);
      state = addTeam(state, 'Team A');
      const result = canStartGame(state);

      expect(result).toBe(false);
    });

    it('should return false when questions present but no teams', () => {
      const state = createInitialState();
      // State has SAMPLE_QUESTIONS but no teams
      const result = canStartGame(state);

      expect(result).toBe(false);
    });

    it('should return true when both teams and questions present', () => {
      let state = createInitialState();
      state = addTeam(state, 'Team A');
      state = addTeam(state, 'Team B');
      const result = canStartGame(state);

      expect(result).toBe(true);
    });
  });
});
