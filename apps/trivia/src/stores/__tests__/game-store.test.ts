import { describe, it, expect, beforeEach, vi } from 'vitest';
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

      // sessionId is generated at module load, not at test time
      expect(state.sessionId).toMatch(/^mock-uuid-\d+$/);
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
  });

  describe('pauseGame', () => {
    it('should pause the game when playing', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().pauseGame();

      expect(useGameStore.getState().status).toBe('paused');
      expect(useGameStore.getState().statusBeforePause).toBe('playing');
    });

    it('should pause the game when between_rounds', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().completeRound();
      useGameStore.getState().pauseGame();

      expect(useGameStore.getState().status).toBe('paused');
      expect(useGameStore.getState().statusBeforePause).toBe('between_rounds');
    });

    it('should not pause when in setup', () => {
      useGameStore.getState().pauseGame();

      expect(useGameStore.getState().status).toBe('setup');
    });
  });

  describe('resumeGame', () => {
    it('should resume to previous status', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().pauseGame();
      useGameStore.getState().resumeGame();

      expect(useGameStore.getState().status).toBe('playing');
      expect(useGameStore.getState().statusBeforePause).toBeNull();
    });

    it('should resume to between_rounds', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().completeRound();
      useGameStore.getState().pauseGame();
      useGameStore.getState().resumeGame();

      expect(useGameStore.getState().status).toBe('between_rounds');
    });

    it('should clear emergency blank on resume', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().emergencyPause();
      useGameStore.getState().resumeGame();

      expect(useGameStore.getState().emergencyBlank).toBe(false);
    });
  });

  describe('emergencyPause', () => {
    it('should pause and set emergency blank', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().emergencyPause();

      expect(useGameStore.getState().status).toBe('paused');
      expect(useGameStore.getState().emergencyBlank).toBe(true);
    });

    it('should set emergency blank even if already paused', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().pauseGame();

      // Normal pause doesn't set emergencyBlank
      expect(useGameStore.getState().emergencyBlank).toBe(false);

      // Emergency pause sets it
      useGameStore.getState().emergencyPause();
      expect(useGameStore.getState().status).toBe('paused');
      expect(useGameStore.getState().emergencyBlank).toBe(true);

      // Resume clears emergencyBlank
      useGameStore.getState().resumeGame();
      expect(useGameStore.getState().emergencyBlank).toBe(false);
    });
  });

  describe('_hydrate', () => {
    it('should merge partial state', () => {
      const originalState = useGameStore.getState();
      useGameStore.getState()._hydrate({
        status: 'playing',
        currentRound: 2,
      });

      const newState = useGameStore.getState();
      expect(newState.status).toBe('playing');
      expect(newState.currentRound).toBe(2);
      expect(newState.sessionId).toBe(originalState.sessionId);
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

    it('should be a no-op at the first question', () => {
      const indices = setupBetweenRoundsWithQuestions(3);
      useGameStore.setState({
        displayQuestionIndex: indices[0],
        selectedQuestionIndex: indices[0],
        recapShowingAnswer: false,
      });

      useGameStore.getState().advanceScene('back');

      const state = useGameStore.getState();
      expect(state.displayQuestionIndex).toBe(indices[0]);
      expect(state.recapShowingAnswer).toBe(false);
      expect(state.audienceScene).toBe('recap_qa');
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
    it('should transition to recap_scores', () => {
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
    it('should seed recap_title: set displayQuestionIndex to first round Q and recapShowingAnswer to null', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.setState({
        status: 'between_rounds',
        audienceScene: 'round_summary',
        recapShowingAnswer: null,
      });

      useGameStore.getState().advanceScene('advance'); // round_summary -> recap_title

      const state = useGameStore.getState();
      expect(state.audienceScene).toBe('recap_title');
      expect(state.recapShowingAnswer).toBeNull();
      // displayQuestionIndex should be the first question of round 0
      const roundQuestions = state.questions.filter(q => q.roundIndex === 0);
      const expectedIndex = state.questions.indexOf(roundQuestions[0]);
      expect(state.displayQuestionIndex).toBe(expectedIndex);
    });

    it('should seed recap_qa: set recapShowingAnswer to false on entry', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.setState({
        status: 'between_rounds',
        audienceScene: 'recap_title',
        recapShowingAnswer: null,
      });

      useGameStore.getState().advanceScene('advance'); // recap_title -> recap_qa

      const state = useGameStore.getState();
      expect(state.audienceScene).toBe('recap_qa');
      expect(state.recapShowingAnswer).toBe(false);
    });

    it('should seed recap_scores: set recapShowingAnswer to null on exit from last answer', () => {
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
    function setupRecapScene(scene: 'recap_title' | 'recap_qa' | 'recap_scores') {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.setState({
        status: 'between_rounds',
        audienceScene: scene,
        currentRound: 0,
        totalRounds: 3,
      });
    }

    it('should advance to round_intro from recap_title on next_round', () => {
      setupRecapScene('recap_title');
      useGameStore.getState().advanceScene('next_round');
      expect(useGameStore.getState().audienceScene).toBe('round_intro');
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

  describe('pause selectors', () => {
    it('should return isPaused as false when not paused', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();

      const { result } = renderHook(() => useGameSelectors());
      expect(result.current.isPaused).toBe(false);
    });

    it('should return isPaused as true when paused', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().pauseGame();

      const { result } = renderHook(() => useGameSelectors());
      expect(result.current.isPaused).toBe(true);
    });

    it('should return canPause as true when playing', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();

      const { result } = renderHook(() => useGameSelectors());
      expect(result.current.canPause).toBe(true);
    });

    it('should return canPause as true when between_rounds', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().completeRound();

      const { result } = renderHook(() => useGameSelectors());
      expect(result.current.canPause).toBe(true);
    });

    it('should return canPause as false when in setup', () => {
      const { result } = renderHook(() => useGameSelectors());
      expect(result.current.canPause).toBe(false);
    });

    it('should return canResume as true when paused', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().pauseGame();

      const { result } = renderHook(() => useGameSelectors());
      expect(result.current.canResume).toBe(true);
    });

    it('should return canResume as false when not paused', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();

      const { result } = renderHook(() => useGameSelectors());
      expect(result.current.canResume).toBe(false);
    });
  });
});
