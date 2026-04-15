import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore, useGameSelectors } from '../game-store';
import { renderHook, act } from '@testing-library/react';
import { resetGameStore } from '@/test/helpers/store';

// Mock uuid for predictable but unique values
const mockUuidCounter = vi.hoisted(() => ({ value: 0 }));
vi.mock('uuid', () => ({
  v4: vi.fn(() => `mock-uuid-${++mockUuidCounter.value}`),
}));

describe('useGameStore', () => {
  beforeEach(() => {
    resetGameStore();
  });

  describe('initial state', () => {
    it('should match createInitialState()', () => {
      const state = useGameStore.getState();

      expect(state.status).toBe('setup');
      expect(state.selectedQuestionIndex).toBe(0);
      expect(state.displayQuestionIndex).toBeNull();
      expect(state.currentRound).toBe(0);
      expect(state.totalRounds).toBe(3);
      expect(state.teams).toEqual([]);
    });
  });

  describe('startGame', () => {
    it('should call engine and update state', () => {
      const store = useGameStore.getState();
      store.addTeam('Test Team');
      store.startGame();

      const newState = useGameStore.getState();
      expect(newState.status).toBe('playing');
    });
  });

  describe('endGame', () => {
    it('should call engine and update state', () => {
      const store = useGameStore.getState();
      store.addTeam('Test Team');
      store.startGame();
      store.endGame();

      const newState = useGameStore.getState();
      expect(newState.status).toBe('ended');
    });
  });

  describe('resetGame', () => {
    it('should call engine and update state', () => {
      const store = useGameStore.getState();
      store.addTeam('Test Team');
      store.startGame();
      store.adjustTeamScore(useGameStore.getState().teams[0].id, 100);
      store.resetGame();

      const newState = useGameStore.getState();
      expect(newState.status).toBe('setup');
      expect(newState.teams[0].score).toBe(0);
    });
  });

  describe('selectQuestion', () => {
    it('should update selectedQuestionIndex', () => {
      useGameStore.getState().selectQuestion(5);
      expect(useGameStore.getState().selectedQuestionIndex).toBe(5);
    });
  });

  describe('setDisplayQuestion', () => {
    it('should update displayQuestionIndex', () => {
      useGameStore.getState().setDisplayQuestion(3);
      expect(useGameStore.getState().displayQuestionIndex).toBe(3);
    });

    it('should accept null', () => {
      useGameStore.getState().setDisplayQuestion(3);
      useGameStore.getState().setDisplayQuestion(null);
      expect(useGameStore.getState().displayQuestionIndex).toBeNull();
    });
  });

  describe('addTeam', () => {
    it('should add team to state', () => {
      useGameStore.getState().addTeam('New Team');
      expect(useGameStore.getState().teams).toHaveLength(1);
      expect(useGameStore.getState().teams[0].name).toBe('New Team');
    });

    it('should use default name if not provided', () => {
      useGameStore.getState().addTeam();
      expect(useGameStore.getState().teams[0].name).toBe('Table 1');
    });
  });

  describe('removeTeam', () => {
    it('should remove team from state', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().addTeam('Team B');
      const teamId = useGameStore.getState().teams[0].id;
      useGameStore.getState().removeTeam(teamId);

      expect(useGameStore.getState().teams).toHaveLength(1);
      expect(useGameStore.getState().teams[0].name).toBe('Team B');
    });
  });

  describe('renameTeam', () => {
    it('should update team name', () => {
      useGameStore.getState().addTeam('Old Name');
      const teamId = useGameStore.getState().teams[0].id;
      useGameStore.getState().renameTeam(teamId, 'New Name');

      expect(useGameStore.getState().teams[0].name).toBe('New Name');
    });
  });

  describe('adjustTeamScore', () => {
    it('should adjust team score', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      const teamId = useGameStore.getState().teams[0].id;
      useGameStore.getState().adjustTeamScore(teamId, 10);

      expect(useGameStore.getState().teams[0].score).toBe(10);
    });
  });

  describe('setTeamScore', () => {
    it('should set team score directly', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      const teamId = useGameStore.getState().teams[0].id;
      useGameStore.getState().setTeamScore(teamId, 50);

      expect(useGameStore.getState().teams[0].score).toBe(50);
    });
  });

  describe('completeRound', () => {
    it('should transition to between_rounds', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().completeRound();

      expect(useGameStore.getState().status).toBe('between_rounds');
    });
  });

  describe('nextRound', () => {
    it('should advance to next round', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().completeRound();
      useGameStore.getState().nextRound();

      expect(useGameStore.getState().currentRound).toBe(1);
      expect(useGameStore.getState().status).toBe('playing');
    });

    it('should be a no-op when status is ended (handleNextRound guard)', () => {
      // Simulates the BEA-675 bug path: handleNextRound guard must prevent
      // audienceScene corruption when called during ended state.
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().endGame();

      // Verify ended state with final_podium scene
      useGameStore.setState({ audienceScene: 'final_podium' });
      const beforeState = useGameStore.getState();

      expect(beforeState.status).toBe('ended');
      expect(beforeState.audienceScene).toBe('final_podium');

      // nextRound() called during ended state should be a no-op
      useGameStore.getState().nextRound();

      const afterState = useGameStore.getState();
      // Status must not change
      expect(afterState.status).toBe('ended');
      // audienceScene must NOT be corrupted to round_intro
      expect(afterState.audienceScene).toBe('final_podium');
      expect(afterState.audienceScene).not.toBe('round_intro');
    });
  });

  describe('_hydrate', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should merge partial state', () => {
      useGameStore.getState()._hydrate({
        status: 'playing',
        currentRound: 2,
      });
      vi.runAllTimers();

      const newState = useGameStore.getState();
      expect(newState.status).toBe('playing');
      expect(newState.currentRound).toBe(2);
    });

    it('sets _isHydrating flag during hydration then clears it (BEA-722)', () => {
      // Capture whether _isHydrating was true during the synchronous merge
      let capturedDuringMerge = false;
      const unsubscribe = useGameStore.subscribe((state) => {
        if (state.status === 'playing' && state._isHydrating) {
          capturedDuringMerge = true;
        }
      });

      useGameStore.getState()._hydrate({ status: 'playing' });

      // Flag is raised synchronously during the state merge
      expect(capturedDuringMerge).toBe(true);
      expect(useGameStore.getState()._isHydrating).toBe(true);

      // After running all timers (setTimeout(0)), the flag is cleared
      vi.runAllTimers();
      expect(useGameStore.getState()._isHydrating).toBe(false);

      unsubscribe();
    });

    it('has _isHydrating false initially', () => {
      expect(useGameStore.getState()._isHydrating).toBe(false);
    });
  });

  describe('subscribers', () => {
    it('should notify on changes', () => {
      const callback = vi.fn();
      const unsubscribe = useGameStore.subscribe(callback);

      useGameStore.getState().addTeam('Test');

      expect(callback).toHaveBeenCalled();
      unsubscribe();
    });
  });

  describe('persist middleware (BEA-722 session recovery)', () => {
    beforeEach(() => {
      localStorage.clear();
      resetGameStore();
    });

    afterEach(() => {
      localStorage.clear();
    });

    /**
     * Seed localStorage with a persisted trivia game state in the format
     * Zustand persist middleware expects, then trigger rehydration.
     */
    async function seedAndRehydrate(persistedState: Record<string, unknown>): Promise<void> {
      localStorage.setItem(
        'hgn-trivia-game',
        JSON.stringify({ state: persistedState, version: 1 })
      );
      await useGameStore.persist.rehydrate();
    }

    it('writes game state to localStorage when state changes', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();

      const stored = localStorage.getItem('hgn-trivia-game');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.state).toBeDefined();
      expect(parsed.state.status).toBe('playing');
      expect(parsed.state.teams).toHaveLength(1);
    });

    it('persists questions array to localStorage', () => {
      // Seed a question via importQuestions
      useGameStore.getState().importQuestions([
        {
          id: 'q1' as import('@/types').QuestionId,
          text: 'Test question?',
          type: 'multiple_choice' as import('@/types').QuestionType,
          correctAnswers: ['A'],
          options: ['A', 'B', 'C', 'D'],
          optionTexts: ['Option A', 'Option B', 'Option C', 'Option D'],
          category: 'general' as import('@/types').QuestionCategory,
          roundIndex: 0,
        },
      ]);

      const stored = localStorage.getItem('hgn-trivia-game');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.state.questions).toHaveLength(1);
      expect(parsed.state.questions[0].id).toBe('q1');
    });

    it('rehydrate: restores status, questions, and teams from localStorage', async () => {
      await seedAndRehydrate({
        status: 'playing',
        questions: [
          {
            id: 'q1',
            text: 'Test?',
            type: 'multiple_choice',
            correctAnswers: ['A'],
            options: ['A', 'B'],
            optionTexts: ['Option A', 'Option B'],
            category: 'general',
            roundIndex: 0,
          },
        ],
        teams: [{ id: 'team1', name: 'Team A', score: 10, tableNumber: 1, roundScores: [10] }],
        teamAnswers: [],
        selectedQuestionIndex: 0,
        displayQuestionIndex: null,
        currentRound: 0,
        totalRounds: 3,
        settings: {
          roundsCount: 3,
          questionsPerRound: 5,
          timerDuration: 30,
          timerAutoStart: false,
          timerVisible: true,
          ttsEnabled: false,
        },
        showScoreboard: false,
        ttsEnabled: false,
        questionStartScores: {},
        roundScoringEntries: {},
        roundScoringSubmitted: false,
        recapShowingAnswer: null,
      });

      expect(useGameStore.getState().status).toBe('playing');
      expect(useGameStore.getState().questions).toHaveLength(1);
      expect(useGameStore.getState().teams).toHaveLength(1);
      expect(useGameStore.getState().teams[0].name).toBe('Team A');
      expect(useGameStore.getState().teams[0].score).toBe(10);
    });

    it('rehydrate: merge forces timer.isRunning=false even if stored as true', async () => {
      await seedAndRehydrate({
        status: 'playing',
        questions: [],
        teams: [],
        teamAnswers: [],
        selectedQuestionIndex: 0,
        displayQuestionIndex: null,
        currentRound: 0,
        totalRounds: 3,
        settings: {
          roundsCount: 3,
          questionsPerRound: 5,
          timerDuration: 30,
          timerAutoStart: false,
          timerVisible: true,
          ttsEnabled: false,
        },
        // Timer was running when page was closed — must be paused on reload
        timer: { duration: 30, remaining: 15, isRunning: true },
        showScoreboard: false,
        ttsEnabled: false,
        questionStartScores: {},
        roundScoringEntries: {},
        roundScoringSubmitted: false,
        recapShowingAnswer: null,
      });

      // Merge must force timer.isRunning to false
      expect(useGameStore.getState().timer.isRunning).toBe(false);
      // But duration/remaining should be preserved
      expect(useGameStore.getState().timer.duration).toBe(30);
      expect(useGameStore.getState().timer.remaining).toBe(15);
    });

    it('rehydrate: merge resets audienceScene to waiting', async () => {
      await seedAndRehydrate({
        status: 'playing',
        questions: [],
        teams: [],
        teamAnswers: [],
        selectedQuestionIndex: 0,
        displayQuestionIndex: null,
        currentRound: 0,
        totalRounds: 3,
        settings: {
          roundsCount: 3,
          questionsPerRound: 5,
          timerDuration: 30,
          timerAutoStart: false,
          timerVisible: true,
          ttsEnabled: false,
        },
        showScoreboard: false,
        ttsEnabled: false,
        questionStartScores: {},
        roundScoringEntries: {},
        roundScoringSubmitted: false,
        recapShowingAnswer: null,
      });

      // Scene state should always reset to waiting on page reload
      expect(useGameStore.getState().audienceScene).toBe('waiting');
      expect(useGameStore.getState().revealPhase).toBeNull();
      expect(useGameStore.getState().scoreDeltas).toEqual([]);
      expect(useGameStore.getState().emergencyBlank).toBe(false);
    });

    it('rehydrate: merge sets _isHydrating=true then clears after tick', async () => {
      // Capture whether _isHydrating was true during rehydration
      let capturedDuringMerge = false;
      const unsubscribe = useGameStore.subscribe((state) => {
        if (state.status === 'playing' && state._isHydrating) {
          capturedDuringMerge = true;
        }
      });

      vi.useFakeTimers();
      try {
        await seedAndRehydrate({
          status: 'playing',
          questions: [],
          teams: [],
          teamAnswers: [],
          selectedQuestionIndex: 0,
          displayQuestionIndex: null,
          currentRound: 0,
          totalRounds: 3,
          settings: {
            roundsCount: 3,
            questionsPerRound: 5,
            timerDuration: 30,
            timerAutoStart: false,
            timerVisible: true,
            ttsEnabled: false,
          },
          showScoreboard: false,
          ttsEnabled: false,
          questionStartScores: {},
          roundScoringEntries: {},
          roundScoringSubmitted: false,
          recapShowingAnswer: null,
        });

        unsubscribe();

        // _isHydrating should have been true during merge to block sync broadcast
        expect(capturedDuringMerge).toBe(true);

        // After running all timers (setTimeout(0) in onRehydrateStorage) it should be cleared
        vi.runAllTimers();
        expect(useGameStore.getState()._isHydrating).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});

describe('advanceScene() recap paths', () => {
  beforeEach(() => {
    resetGameStore();
  });

  /**
   * Helper: set up a between_rounds state with N questions in round 0.
   * Returns the global indices of those questions.
   */
  function setupBetweenRoundsWithQuestions(questionCount: number): number[] {
    // Add a team and start the game so we have a valid playing state
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();
    // Force into between_rounds with recap_qa scene for testing
    useGameStore.setState({
      status: 'between_rounds',
      audienceScene: 'recap_qa',
      recapShowingAnswer: false,
    });
    // Find questions for round 0
    const state = useGameStore.getState();
    const roundQuestions = state.questions.filter(q => q.roundIndex === 0);
    const indices: number[] = [];
    for (let i = 0; i < Math.min(questionCount, roundQuestions.length); i++) {
      indices.push(state.questions.indexOf(roundQuestions[i]));
    }
    // Set displayQuestionIndex to first question
    if (indices.length > 0) {
      useGameStore.setState({
        displayQuestionIndex: indices[0],
        selectedQuestionIndex: indices[0],
      });
    }
    return indices;
  }

  describe('BACK trigger in recap_qa', () => {
    it('should decrement displayQuestionIndex and reset recapShowingAnswer to false when not at first question', () => {
      const indices = setupBetweenRoundsWithQuestions(3);
      // Advance to second question
      useGameStore.setState({
        displayQuestionIndex: indices[1],
        selectedQuestionIndex: indices[1],
        recapShowingAnswer: true,
      });

      useGameStore.getState().advanceScene('back');

      const state = useGameStore.getState();
      expect(state.displayQuestionIndex).toBe(indices[0]);
      expect(state.recapShowingAnswer).toBe(false);
      expect(state.audienceScene).toBe('recap_qa'); // Scene unchanged
    });

    it('should transition to round_scoring at the first question', () => {
      const indices = setupBetweenRoundsWithQuestions(3);
      useGameStore.setState({
        displayQuestionIndex: indices[0],
        selectedQuestionIndex: indices[0],
        recapShowingAnswer: false,
      });

      useGameStore.getState().advanceScene('back');

      const state = useGameStore.getState();
      expect(state.audienceScene).toBe('round_scoring');
      expect(state.recapShowingAnswer).toBeNull();
    });
  });

  describe('ADVANCE trigger in recap_qa — question face', () => {
    it('should flip recapShowingAnswer to true when showing question face', () => {
      setupBetweenRoundsWithQuestions(3);
      useGameStore.setState({ recapShowingAnswer: false });

      useGameStore.getState().advanceScene('advance');

      const state = useGameStore.getState();
      expect(state.recapShowingAnswer).toBe(true);
      expect(state.audienceScene).toBe('recap_qa'); // Scene unchanged
    });
  });

  describe('ADVANCE trigger in recap_qa — answer face, not last question', () => {
    it('should advance displayQuestionIndex and reset recapShowingAnswer to false', () => {
      const indices = setupBetweenRoundsWithQuestions(3);
      useGameStore.setState({
        displayQuestionIndex: indices[0],
        selectedQuestionIndex: indices[0],
        recapShowingAnswer: true,
      });

      useGameStore.getState().advanceScene('advance');

      const state = useGameStore.getState();
      expect(state.displayQuestionIndex).toBe(indices[1]);
      expect(state.recapShowingAnswer).toBe(false);
      expect(state.audienceScene).toBe('recap_qa'); // Still in recap_qa
    });
  });

  describe('ADVANCE trigger in recap_qa — answer face, last question', () => {
    it('should transition to recap_scores (non-last round)', () => {
      const state0 = useGameStore.getState();
      // Find all round 0 questions to identify the last one
      const roundQuestions = state0.questions.filter(q => q.roundIndex === 0);
      const lastIndex = state0.questions.indexOf(roundQuestions[roundQuestions.length - 1]);

      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.setState({
        status: 'between_rounds',
        audienceScene: 'recap_qa',
        recapShowingAnswer: true,
        displayQuestionIndex: lastIndex,
        selectedQuestionIndex: lastIndex,
      });

      useGameStore.getState().advanceScene('advance');

      const state = useGameStore.getState();
      expect(state.audienceScene).toBe('recap_scores');
      expect(state.recapShowingAnswer).toBeNull();
    });
  });

  describe('recap scene side-effect seeds', () => {
    it('should seed round_scoring: clear entries on forward entry from round_summary', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.setState({
        status: 'between_rounds',
        audienceScene: 'round_summary',
        recapShowingAnswer: null,
      });

      useGameStore.getState().advanceScene('advance'); // round_summary -> round_scoring

      const state = useGameStore.getState();
      expect(state.audienceScene).toBe('round_scoring');
      expect(state.recapShowingAnswer).toBeNull();
      expect(state.roundScoringEntries).toEqual({});
    });

    it('should seed recap_qa: set first question and recapShowingAnswer=false on entry from round_scoring', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.setState({
        status: 'between_rounds',
        audienceScene: 'round_scoring',
        recapShowingAnswer: null,
        roundScoringSubmitted: true, // submission gate must be satisfied
      });

      useGameStore.getState().advanceScene('advance'); // round_scoring -> recap_qa

      const state = useGameStore.getState();
      expect(state.audienceScene).toBe('recap_qa');
      expect(state.recapShowingAnswer).toBe(false);
      // displayQuestionIndex should be the first question of round 0
      const roundQuestions = state.questions.filter(q => q.roundIndex === 0);
      const expectedIndex = state.questions.indexOf(roundQuestions[0]);
      expect(state.displayQuestionIndex).toBe(expectedIndex);
    });

    it('should seed recap_scores: clear recapShowingAnswer on terminal advance from recap_qa', () => {
      const state0 = useGameStore.getState();
      const roundQuestions = state0.questions.filter(q => q.roundIndex === 0);
      const lastIndex = state0.questions.indexOf(roundQuestions[roundQuestions.length - 1]);

      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.setState({
        status: 'between_rounds',
        audienceScene: 'recap_qa',
        recapShowingAnswer: true,
        displayQuestionIndex: lastIndex,
        selectedQuestionIndex: lastIndex,
      });

      useGameStore.getState().advanceScene('advance'); // last answer -> recap_scores

      const state = useGameStore.getState();
      expect(state.audienceScene).toBe('recap_scores');
      expect(state.recapShowingAnswer).toBeNull();
    });
  });

  describe('N key (next_round) from recap scenes', () => {
    function setupRecapScene(scene: 'recap_qa' | 'recap_scores' | 'round_scoring') {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.setState({
        status: 'between_rounds',
        audienceScene: scene,
        currentRound: 0,
        totalRounds: 3,
      });
    }

    it('should return no-op from recap_title on next_round (dead scene)', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.setState({
        status: 'between_rounds',
        audienceScene: 'recap_title',
        currentRound: 0,
        totalRounds: 3,
      });
      useGameStore.getState().advanceScene('next_round');
      // recap_title is dead — no transition, stays on recap_title
      expect(useGameStore.getState().audienceScene).toBe('recap_title');
    });

    it('should advance to round_intro from recap_qa on next_round', () => {
      setupRecapScene('recap_qa');
      useGameStore.getState().advanceScene('next_round');
      expect(useGameStore.getState().audienceScene).toBe('round_intro');
    });

    it('should advance to round_intro from recap_scores on next_round', () => {
      setupRecapScene('recap_scores');
      useGameStore.getState().advanceScene('next_round');
      expect(useGameStore.getState().audienceScene).toBe('round_intro');
    });

    it('should advance to final_buildup from recap_scores on next_round when last round', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.setState({
        status: 'between_rounds',
        audienceScene: 'recap_scores',
        currentRound: 2,  // 0-based, so this is round 3 of 3
        totalRounds: 3,
      });
      useGameStore.getState().advanceScene('next_round');
      expect(useGameStore.getState().audienceScene).toBe('final_buildup');
    });
  });

  describe('loadTeamsFromSetup includes recapShowingAnswer', () => {
    it('should set recapShowingAnswer to null when loading teams during setup', () => {
      // Force recapShowingAnswer to a non-null value to verify it gets reset
      useGameStore.setState({ recapShowingAnswer: false });
      useGameStore.getState().loadTeamsFromSetup(['Alpha', 'Bravo']);
      expect(useGameStore.getState().recapShowingAnswer).toBeNull();
    });
  });
});

describe('advanceScene() scoreDeltas computation at round completion', () => {
  beforeEach(() => {
    resetGameStore();
  });

  /**
   * Helper: start a game with the given team names, force into playing state
   * with question_closed scene on the last question of round 0, then set
   * questionStartScores to the given snapshot.
   */
  function setupForRoundComplete(
    teamNames: string[],
    teamScores: number[],
    startScores: number[],
  ) {
    for (const name of teamNames) {
      useGameStore.getState().addTeam(name);
    }
    useGameStore.getState().startGame();

    // Apply scores to each team
    const teams = useGameStore.getState().teams;
    for (let i = 0; i < teams.length; i++) {
      useGameStore.getState().setTeamScore(teams[i].id, teamScores[i] ?? 0);
    }

    // Build questionStartScores snapshot from current team ids
    const currentTeams = useGameStore.getState().teams;
    const snapshot: Record<string, number> = {};
    for (let i = 0; i < currentTeams.length; i++) {
      snapshot[currentTeams[i].id] = startScores[i] ?? 0;
    }

    // Find the last question of round 0 to satisfy isLastQuestion logic
    const state = useGameStore.getState();
    const roundQuestions = state.questions.filter((q) => q.roundIndex === 0);
    const lastQ = roundQuestions[roundQuestions.length - 1];
    const lastQIndex = state.questions.indexOf(lastQ);

    useGameStore.setState({
      audienceScene: 'question_closed',
      status: 'playing',
      displayQuestionIndex: lastQIndex,
      selectedQuestionIndex: lastQIndex,
      questionStartScores: snapshot,
    });
  }

  it('should populate scoreDeltas with correct delta values when transitioning to round_summary', () => {
    // Team A: start=0, end=3 → delta=3; Team B: start=0, end=1 → delta=1
    setupForRoundComplete(['Team A', 'Team B'], [3, 1], [0, 0]);

    useGameStore.getState().advanceScene('advance');

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('round_summary');
    expect(state.scoreDeltas).toHaveLength(2);

    const teamADelta = state.scoreDeltas.find((d) => d.teamName === 'Team A');
    const teamBDelta = state.scoreDeltas.find((d) => d.teamName === 'Team B');

    expect(teamADelta?.delta).toBe(3);
    expect(teamADelta?.newScore).toBe(3);
    expect(teamBDelta?.delta).toBe(1);
    expect(teamBDelta?.newScore).toBe(1);
  });

  it('should assign correct previousRank and newRank based on score order', () => {
    // At round start: Team A=10, Team B=5 (A leads)
    // At round end:   Team A=10, Team B=15 (B now leads — rank swap)
    setupForRoundComplete(['Team A', 'Team B'], [10, 15], [10, 5]);

    useGameStore.getState().advanceScene('advance');

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('round_summary');

    const teamADelta = state.scoreDeltas.find((d) => d.teamName === 'Team A');
    const teamBDelta = state.scoreDeltas.find((d) => d.teamName === 'Team B');

    // Before: A rank 1 (score 10 > 5), B rank 2
    expect(teamADelta?.previousRank).toBe(1);
    expect(teamBDelta?.previousRank).toBe(2);

    // After: B rank 1 (score 15 > 10), A rank 2
    expect(teamADelta?.newRank).toBe(2);
    expect(teamBDelta?.newRank).toBe(1);
  });

  it('should compute zero deltas when no scores changed during the round', () => {
    // Both teams start and end at same score (presenter did not award points)
    setupForRoundComplete(['Team A', 'Team B'], [5, 5], [5, 5]);

    useGameStore.getState().advanceScene('advance');

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('round_summary');

    for (const d of state.scoreDeltas) {
      expect(d.delta).toBe(0);
    }
  });
});

describe('advanceScene() answer_reveal cycling paths', () => {
  beforeEach(() => {
    resetGameStore();
  });

  /**
   * Helper: set up a between_rounds state with answer_reveal scene.
   * displayQuestionIndex points to the Nth question of round 0 (0-based).
   * Returns the global indices of round 0 questions.
   */
  function setupAnswerReview(displayAtRoundIndex: number): number[] {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();

    const state = useGameStore.getState();
    const roundQuestions = state.questions.filter((q) => q.roundIndex === 0);
    const indices = roundQuestions.map((q) => state.questions.indexOf(q));

    useGameStore.setState({
      status: 'between_rounds',
      audienceScene: 'answer_reveal',
      displayQuestionIndex: indices[displayAtRoundIndex],
      selectedQuestionIndex: indices[displayAtRoundIndex],
      revealPhase: null,
    });

    return indices;
  }

  it('should cycle to next question when advance on non-last question in answer_reveal', () => {
    const indices = setupAnswerReview(0);

    useGameStore.getState().advanceScene('advance');

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('answer_reveal');
    expect(state.displayQuestionIndex).toBe(indices[1]);
    expect(state.selectedQuestionIndex).toBe(indices[1]);
    expect(state.revealPhase).toBeNull();
  });

  it('should cycle to next question when skip on non-last question in answer_reveal', () => {
    const indices = setupAnswerReview(1);

    useGameStore.getState().advanceScene('skip');

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('answer_reveal');
    expect(state.displayQuestionIndex).toBe(indices[2]);
  });

  it('should transition to round_intro when advance on last question of non-last round', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();

    const state0 = useGameStore.getState();
    const roundQuestions = state0.questions.filter((q) => q.roundIndex === 0);
    const lastQ = roundQuestions[roundQuestions.length - 1];
    const lastQIndex = state0.questions.indexOf(lastQ);

    useGameStore.setState({
      status: 'between_rounds',
      audienceScene: 'answer_reveal',
      displayQuestionIndex: lastQIndex,
      selectedQuestionIndex: lastQIndex,
      currentRound: 0,
      totalRounds: 3,
      revealPhase: null,
    });

    useGameStore.getState().advanceScene('advance');

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('round_intro');
  });

  it('should transition to final_buildup when advance on last question of last round', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();

    const state0 = useGameStore.getState();
    const lastRound = state0.totalRounds - 1;
    const roundQuestions = state0.questions.filter(
      (q) => q.roundIndex === lastRound,
    );
    const lastQ = roundQuestions[roundQuestions.length - 1];
    const lastQIndex = state0.questions.indexOf(lastQ);

    useGameStore.setState({
      status: 'between_rounds',
      audienceScene: 'answer_reveal',
      displayQuestionIndex: lastQIndex,
      selectedQuestionIndex: lastQIndex,
      currentRound: lastRound,
      revealPhase: null,
    });

    useGameStore.getState().advanceScene('advance');

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('final_buildup');
    expect(state.status).toBe('ended');
  });
});

describe('advanceScene() answer_reveal N key skip', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('should skip remaining answers and go to round_intro on next_round trigger', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();

    const state0 = useGameStore.getState();
    const roundQuestions = state0.questions.filter((q) => q.roundIndex === 0);
    const firstQIndex = state0.questions.indexOf(roundQuestions[0]);

    useGameStore.setState({
      status: 'between_rounds',
      audienceScene: 'answer_reveal',
      displayQuestionIndex: firstQIndex,
      selectedQuestionIndex: firstQIndex,
      currentRound: 0,
      totalRounds: 3,
    });

    useGameStore.getState().advanceScene('next_round');

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('round_intro');
    expect(state.currentRound).toBe(1);
  });

  it('should skip remaining answers and go to final_buildup on next_round when last round', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();

    const state0 = useGameStore.getState();
    const lastRound = state0.totalRounds - 1;
    const roundQuestions = state0.questions.filter(
      (q) => q.roundIndex === lastRound,
    );
    const firstQIndex = state0.questions.indexOf(roundQuestions[0]);

    useGameStore.setState({
      status: 'between_rounds',
      audienceScene: 'answer_reveal',
      displayQuestionIndex: firstQIndex,
      selectedQuestionIndex: firstQIndex,
      currentRound: lastRound,
    });

    useGameStore.getState().advanceScene('next_round');

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('final_buildup');
    expect(state.status).toBe('ended');
  });
});

describe('advanceScene() round_intro from between_rounds', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('should call nextRoundEngine when transitioning to round_intro from between_rounds', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();
    useGameStore.getState().completeRound();
    expect(useGameStore.getState().status).toBe('between_rounds');
    expect(useGameStore.getState().currentRound).toBe(0);

    useGameStore.setState({ audienceScene: 'recap_scores' });

    useGameStore.getState().advanceScene('advance');

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('round_intro');
    expect(state.status).toBe('playing');
    expect(state.currentRound).toBe(1);
  });
});

describe('advanceScene() question_anticipation paths', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('should advance to next question when entering question_anticipation from question_closed', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();

    const state0 = useGameStore.getState();
    const roundQuestions = state0.questions.filter((q) => q.roundIndex === 0);
    const firstQIndex = state0.questions.indexOf(roundQuestions[0]);

    useGameStore.setState({
      audienceScene: 'question_closed',
      displayQuestionIndex: firstQIndex,
      selectedQuestionIndex: firstQIndex,
    });

    useGameStore.getState().advanceScene('advance');

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('question_anticipation');
    const secondQIndex = state0.questions.indexOf(roundQuestions[1]);
    expect(state.displayQuestionIndex).toBe(secondQIndex);
    expect(state.selectedQuestionIndex).toBe(secondQIndex);
  });

  it('should show currently selected question when entering question_anticipation from non-question_closed scene', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();

    const state0 = useGameStore.getState();
    const roundQuestions = state0.questions.filter((q) => q.roundIndex === 0);
    const thirdQIndex = state0.questions.indexOf(roundQuestions[2]);

    useGameStore.setState({
      audienceScene: 'round_intro',
      selectedQuestionIndex: thirdQIndex,
    });

    useGameStore.getState().advanceScene('auto');

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('question_anticipation');
    expect(state.displayQuestionIndex).toBe(thirdQIndex);
  });
});

describe('advanceScene() generic fallthrough path', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('should use buildSceneUpdate for game_intro -> round_intro (no special side effect)', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();
    useGameStore.setState({ audienceScene: 'game_intro' });

    useGameStore.getState().advanceScene('auto');

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('round_intro');
    expect(state.sceneTimestamp).toBeGreaterThan(0);
  });

  it('should use buildSceneUpdate for question_display -> question_closed', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();

    const state0 = useGameStore.getState();
    const roundQuestions = state0.questions.filter((q) => q.roundIndex === 0);
    const firstQIndex = state0.questions.indexOf(roundQuestions[0]);

    useGameStore.setState({
      audienceScene: 'question_display',
      displayQuestionIndex: firstQIndex,
      selectedQuestionIndex: firstQIndex,
    });

    useGameStore.getState().advanceScene('close');

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('question_closed');
    expect(state.sceneTimestamp).toBeGreaterThan(0);
  });
});

describe('advanceScene() no-op paths', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('should be a no-op when getNextScene returns null', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();
    useGameStore.setState({ audienceScene: 'waiting' });

    const before = useGameStore.getState();
    useGameStore.getState().advanceScene('close');

    const after = useGameStore.getState();
    expect(after.audienceScene).toBe('waiting');
    expect(after.sceneTimestamp).toBe(before.sceneTimestamp);
  });

  it('should be a no-op when scene is final_podium (terminal state)', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();
    useGameStore.setState({ audienceScene: 'final_podium' });

    const before = useGameStore.getState();
    useGameStore.getState().advanceScene('advance');

    const after = useGameStore.getState();
    expect(after.audienceScene).toBe('final_podium');
    expect(after.sceneTimestamp).toBe(before.sceneTimestamp);
  });
});

describe('advanceScene() final_buildup side effect', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('should call endGame when transitioning to final_buildup', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();
    useGameStore.getState().completeRound();

    const lastRound = useGameStore.getState().totalRounds - 1;

    useGameStore.setState({
      audienceScene: 'recap_scores',
      currentRound: lastRound,
    });

    useGameStore.getState().advanceScene('advance');

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('final_buildup');
    expect(state.status).toBe('ended');
  });

  it('should transition from final_buildup to final_podium on auto', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();
    useGameStore.getState().endGame();
    useGameStore.setState({ audienceScene: 'final_buildup' });

    useGameStore.getState().advanceScene('auto');

    expect(useGameStore.getState().audienceScene).toBe('final_podium');
  });

  it('should transition from final_buildup to final_podium on skip', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();
    useGameStore.getState().endGame();
    useGameStore.setState({ audienceScene: 'final_buildup' });

    useGameStore.getState().advanceScene('skip');

    expect(useGameStore.getState().audienceScene).toBe('final_podium');
  });
});

describe('advanceScene() setDisplayQuestion scene transitions', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('should transition to question_anticipation when showing question from waiting scene', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();
    useGameStore.setState({ audienceScene: 'waiting' });

    useGameStore.getState().setDisplayQuestion(0);

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('question_anticipation');
    expect(state.displayQuestionIndex).toBe(0);
  });

  it('should transition to waiting scene when hiding question', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();
    useGameStore.setState({
      audienceScene: 'question_display',
      displayQuestionIndex: 0,
    });

    useGameStore.getState().setDisplayQuestion(null);

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('waiting');
    expect(state.displayQuestionIndex).toBeNull();
  });

  it('should not change scene when showing question from non-waiting scene', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();
    useGameStore.setState({
      audienceScene: 'question_display',
      displayQuestionIndex: 0,
    });

    useGameStore.getState().setDisplayQuestion(1);

    const state = useGameStore.getState();
    expect(state.audienceScene).toBe('question_display');
    expect(state.displayQuestionIndex).toBe(1);
  });
});

describe('Store action coverage — minor paths', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('setRevealPhase should update revealPhase', () => {
    useGameStore.getState().setRevealPhase('freeze');
    expect(useGameStore.getState().revealPhase).toBe('freeze');
  });

  it('setRevealPhase should accept null to clear reveal', () => {
    useGameStore.getState().setRevealPhase('illuminate');
    useGameStore.getState().setRevealPhase(null);
    expect(useGameStore.getState().revealPhase).toBeNull();
  });

  it('setScoreDeltasBatch should replace scoreDeltas with a new array reference', () => {
    const deltas = [
      {
        teamId: 't1',
        teamName: 'Team 1',
        delta: 5,
        newScore: 10,
        newRank: 1,
        previousRank: 2,
      },
    ];
    useGameStore.getState().setScoreDeltasBatch(deltas);

    const state = useGameStore.getState();
    expect(state.scoreDeltas).toHaveLength(1);
    expect(state.scoreDeltas[0].delta).toBe(5);
    expect(state.scoreDeltas).not.toBe(deltas);
    expect(state.scoreDeltas).toEqual(deltas);
  });

  it('loadTeamsFromSetup should be a no-op when not in setup status', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();

    useGameStore.getState().loadTeamsFromSetup(['New Team']);

    const state = useGameStore.getState();
    expect(state.teams).toHaveLength(1);
    expect(state.teams[0].name).toBe('Team A');
  });

  it('importQuestions should use replace mode by default', () => {
    const customQuestions: import('@/types').Question[] = [
      {
        id: 'custom-1' as import('@/types').QuestionId,
        text: 'Custom Q1',
        type: 'multiple_choice',
        options: ['A', 'B'],
        optionTexts: ['Option A', 'Option B'],
        correctAnswers: ['A'],
        category: 'general_knowledge',
        explanation: '',
        roundIndex: 0,
      },
    ];

    useGameStore.getState().importQuestions(customQuestions);

    const state = useGameStore.getState();
    expect(state.questions).toHaveLength(1);
    expect(state.questions[0].id).toBe('custom-1');
  });

  it('_hydrate should reconstruct teams array with new references', () => {
    const teams = [
      {
        id: 't1' as import('@/types').TeamId,
        name: 'Team 1',
        score: 10,
        tableNumber: 1,
        roundScores: [10],
      },
    ];
    useGameStore.getState()._hydrate({ teams });

    const state = useGameStore.getState();
    expect(state.teams).toHaveLength(1);
    expect(state.teams[0].name).toBe('Team 1');
    expect(state.teams).not.toBe(teams);
  });

  it('_hydrate should reconstruct questions array with new references', () => {
    const questions: import('@/types').Question[] = [
      {
        id: 'q1' as import('@/types').QuestionId,
        text: 'Test Q',
        type: 'multiple_choice',
        options: ['A'],
        optionTexts: ['Opt A'],
        correctAnswers: ['A'],
        category: 'general_knowledge',
        explanation: '',
        roundIndex: 0,
      },
    ];
    useGameStore.getState()._hydrate({ questions });

    const state = useGameStore.getState();
    expect(state.questions).toHaveLength(1);
    expect(state.questions).not.toBe(questions);
  });

  it('_hydrate should reconstruct teamAnswers array with new references', () => {
    const teamAnswers = [
      {
        teamId: 't1' as import('@/types').TeamId,
        questionId: 'q1' as import('@/types').QuestionId,
        answer: 'A',
        isCorrect: true,
        pointsAwarded: 1,
      },
    ];
    useGameStore.getState()._hydrate({ teamAnswers });

    const state = useGameStore.getState();
    expect(state.teamAnswers).toHaveLength(1);
    expect(state.teamAnswers).not.toBe(teamAnswers);
  });

  it('_hydrate should reconstruct scoreDeltas array with new references', () => {
    const scoreDeltas = [
      {
        teamId: 't1',
        teamName: 'Team 1',
        delta: 5,
        newScore: 10,
        newRank: 1,
        previousRank: 1,
      },
    ];
    useGameStore.getState()._hydrate({ scoreDeltas });

    const state = useGameStore.getState();
    expect(state.scoreDeltas).toHaveLength(1);
    expect(state.scoreDeltas).not.toBe(scoreDeltas);
  });
});

describe('useGameSelectors', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('should return derived values', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();

    const { result } = renderHook(() => useGameSelectors());

    expect(result.current.selectedQuestion).toBeDefined();
    expect(result.current.progress).toContain('Question');
    expect(result.current.canStart).toBe(false); // Already started
    expect(result.current.isGameOver).toBe(false);
    expect(result.current.roundProgress).toBe('Round 1 of 3');
  });

  it('should update when store changes', () => {
    useGameStore.getState().addTeam('Team A');

    const { result, rerender } = renderHook(() => useGameSelectors());
    expect(result.current.canStart).toBe(true);

    act(() => {
      useGameStore.getState().startGame();
    });
    rerender();

    expect(result.current.canStart).toBe(false);
    expect(result.current.isGameOver).toBe(false);
  });

});
