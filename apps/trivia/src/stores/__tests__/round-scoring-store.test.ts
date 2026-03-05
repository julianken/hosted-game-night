import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '../game-store';
import { resetGameStore } from '@/test/helpers/store';

// Mock uuid for predictable but unique values
const mockUuidCounter = vi.hoisted(() => ({ value: 0 }));
vi.mock('uuid', () => ({
  v4: vi.fn(() => `mock-uuid-${++mockUuidCounter.value}`),
}));

describe('setRoundScores store action', () => {
  beforeEach(() => {
    resetGameStore();
    mockUuidCounter.value = 0;
  });

  function setupGameInRoundScoring() {
    const store = useGameStore.getState();
    // Add teams
    store.addTeam('Table 1');
    store.addTeam('Table 2');
    store.addTeam('Table 3');

    // Start the game
    store.startGame();

    const teams = useGameStore.getState().teams;
    expect(teams).toHaveLength(3);

    // Verify all teams start at 0
    for (const t of teams) {
      expect(t.score).toBe(0);
    }

    return teams;
  }

  it('should apply round scores to all teams', () => {
    const teams = setupGameInRoundScoring();

    const scoresMap: Record<string, number> = {};
    scoresMap[teams[0].id] = 5;
    scoresMap[teams[1].id] = 3;
    scoresMap[teams[2].id] = 7;

    useGameStore.getState().setRoundScores(scoresMap);

    const state = useGameStore.getState();
    const updatedTeams = state.teams;

    expect(updatedTeams.find((t) => t.id === teams[0].id)?.score).toBe(5);
    expect(updatedTeams.find((t) => t.id === teams[1].id)?.score).toBe(3);
    expect(updatedTeams.find((t) => t.id === teams[2].id)?.score).toBe(7);
  });

  it('should set roundScores for the current round', () => {
    const teams = setupGameInRoundScoring();

    const scoresMap: Record<string, number> = {};
    scoresMap[teams[0].id] = 4;
    scoresMap[teams[1].id] = 6;
    scoresMap[teams[2].id] = 2;

    useGameStore.getState().setRoundScores(scoresMap);

    const state = useGameStore.getState();
    const t1 = state.teams.find((t) => t.id === teams[0].id)!;
    const t2 = state.teams.find((t) => t.id === teams[1].id)!;
    const t3 = state.teams.find((t) => t.id === teams[2].id)!;

    // Round 0 should have the entered scores
    expect(t1.roundScores[0]).toBe(4);
    expect(t2.roundScores[0]).toBe(6);
    expect(t3.roundScores[0]).toBe(2);
  });

  it('should compute score deltas', () => {
    const teams = setupGameInRoundScoring();

    const scoresMap: Record<string, number> = {};
    scoresMap[teams[0].id] = 5;
    scoresMap[teams[1].id] = 3;
    scoresMap[teams[2].id] = 7;

    useGameStore.getState().setRoundScores(scoresMap);

    const state = useGameStore.getState();
    expect(state.scoreDeltas).toHaveLength(3);

    // All teams started at 0, so deltas should equal the scores entered
    const d1 = state.scoreDeltas.find((d) => d.teamId === teams[0].id);
    const d2 = state.scoreDeltas.find((d) => d.teamId === teams[1].id);
    const d3 = state.scoreDeltas.find((d) => d.teamId === teams[2].id);

    expect(d1?.delta).toBe(5);
    expect(d2?.delta).toBe(3);
    expect(d3?.delta).toBe(7);

    expect(d1?.newScore).toBe(5);
    expect(d2?.newScore).toBe(3);
    expect(d3?.newScore).toBe(7);
  });

  it('should clear roundScoringInProgress and roundScoringEntries', () => {
    setupGameInRoundScoring();

    // Simulate entering round_scoring state
    useGameStore.setState({
      roundScoringInProgress: true,
      roundScoringEntries: { 'some-team': 5 },
    });

    const teams = useGameStore.getState().teams;
    const scoresMap: Record<string, number> = {};
    for (const t of teams) {
      scoresMap[t.id] = 1;
    }

    useGameStore.getState().setRoundScores(scoresMap);

    const state = useGameStore.getState();
    expect(state.roundScoringInProgress).toBe(false);
    expect(state.roundScoringEntries).toEqual({});
  });

  it('should handle zero scores', () => {
    const teams = setupGameInRoundScoring();

    const scoresMap: Record<string, number> = {};
    scoresMap[teams[0].id] = 0;
    scoresMap[teams[1].id] = 0;
    scoresMap[teams[2].id] = 0;

    useGameStore.getState().setRoundScores(scoresMap);

    const state = useGameStore.getState();
    for (const t of state.teams) {
      expect(t.score).toBe(0);
    }
  });

  it('should compute correct ranks in scoreDeltas', () => {
    const teams = setupGameInRoundScoring();

    const scoresMap: Record<string, number> = {};
    scoresMap[teams[0].id] = 5;
    scoresMap[teams[1].id] = 10;
    scoresMap[teams[2].id] = 3;

    useGameStore.getState().setRoundScores(scoresMap);

    const state = useGameStore.getState();
    const d1 = state.scoreDeltas.find((d) => d.teamId === teams[0].id);
    const d2 = state.scoreDeltas.find((d) => d.teamId === teams[1].id);
    const d3 = state.scoreDeltas.find((d) => d.teamId === teams[2].id);

    // teams[1] has highest score -> rank 1
    expect(d2?.newRank).toBe(1);
    expect(d1?.newRank).toBe(2);
    expect(d3?.newRank).toBe(3);
  });
});
