import { describe, it, expect } from 'vitest';
import { computeScoreDeltas } from '../scoring';
import type { Team } from '@/types';

/**
 * Helper: create a Team object with the given properties.
 */
function makeTeam(id: string, name: string, score: number): Team {
  return {
    id: id as import('@/types').TeamId,
    name,
    score,
    tableNumber: 1,
    roundScores: [score],
  };
}

describe('computeScoreDeltas', () => {
  it('should compute positive deltas for teams that scored', () => {
    const teams = [
      makeTeam('a', 'Team A', 5),
      makeTeam('b', 'Team B', 3),
    ];
    const previousScores: Record<string, number> = { a: 2, b: 1 };

    const deltas = computeScoreDeltas(teams, previousScores);

    expect(deltas).toHaveLength(2);
    const deltaA = deltas.find(d => d.teamId === 'a');
    const deltaB = deltas.find(d => d.teamId === 'b');
    expect(deltaA?.delta).toBe(3); // 5 - 2
    expect(deltaA?.newScore).toBe(5);
    expect(deltaB?.delta).toBe(2); // 3 - 1
    expect(deltaB?.newScore).toBe(3);
  });

  it('should assign newRank based on end-of-round scores', () => {
    const teams = [
      makeTeam('a', 'Team A', 10),
      makeTeam('b', 'Team B', 20),
      makeTeam('c', 'Team C', 15),
    ];
    const previousScores: Record<string, number> = { a: 0, b: 0, c: 0 };

    const deltas = computeScoreDeltas(teams, previousScores);

    expect(deltas.find(d => d.teamId === 'b')?.newRank).toBe(1); // 20 highest
    expect(deltas.find(d => d.teamId === 'c')?.newRank).toBe(2); // 15 second
    expect(deltas.find(d => d.teamId === 'a')?.newRank).toBe(3); // 10 third
  });

  it('should assign previousRank based on start-of-round scores (rank swap test)', () => {
    // Before: A=10 (rank 1), B=5 (rank 2)
    // After:  A=10 (rank 2), B=15 (rank 1)
    const teams = [
      makeTeam('a', 'Team A', 10),
      makeTeam('b', 'Team B', 15),
    ];
    const previousScores: Record<string, number> = { a: 10, b: 5 };

    const deltas = computeScoreDeltas(teams, previousScores);

    const deltaA = deltas.find(d => d.teamId === 'a');
    const deltaB = deltas.find(d => d.teamId === 'b');

    // Previous ranks (based on start-of-round scores)
    expect(deltaA?.previousRank).toBe(1); // A was leading
    expect(deltaB?.previousRank).toBe(2); // B was second

    // New ranks (based on end-of-round scores)
    expect(deltaA?.newRank).toBe(2); // A is now second
    expect(deltaB?.newRank).toBe(1); // B is now leading
  });

  it('should compute zero deltas when no scores changed', () => {
    const teams = [
      makeTeam('a', 'Team A', 5),
      makeTeam('b', 'Team B', 3),
    ];
    const previousScores: Record<string, number> = { a: 5, b: 3 };

    const deltas = computeScoreDeltas(teams, previousScores);

    for (const d of deltas) {
      expect(d.delta).toBe(0);
    }
  });

  it('should default missing previousScores to 0', () => {
    const teams = [
      makeTeam('a', 'Team A', 7),
      makeTeam('b', 'Team B', 4),
    ];
    // Empty previousScores — all teams should have prevScore = 0
    const previousScores: Record<string, number> = {};

    const deltas = computeScoreDeltas(teams, previousScores);

    expect(deltas.find(d => d.teamId === 'a')?.delta).toBe(7); // 7 - 0
    expect(deltas.find(d => d.teamId === 'b')?.delta).toBe(4); // 4 - 0
  });

  it('should return empty array for empty teams array', () => {
    const deltas = computeScoreDeltas([], {});
    expect(deltas).toEqual([]);
  });

  it('should preserve teams array order in output', () => {
    const teams = [
      makeTeam('c', 'Team C', 1),
      makeTeam('a', 'Team A', 3),
      makeTeam('b', 'Team B', 2),
    ];
    const previousScores: Record<string, number> = { a: 0, b: 0, c: 0 };

    const deltas = computeScoreDeltas(teams, previousScores);

    // Output order should match input teams order, not rank order
    expect(deltas[0].teamId).toBe('c');
    expect(deltas[1].teamId).toBe('a');
    expect(deltas[2].teamId).toBe('b');
  });

  it('should handle a single team with no competition', () => {
    const teams = [makeTeam('solo', 'Solo Team', 10)];
    const previousScores: Record<string, number> = { solo: 3 };

    const deltas = computeScoreDeltas(teams, previousScores);

    expect(deltas).toHaveLength(1);
    expect(deltas[0].teamId).toBe('solo');
    expect(deltas[0].teamName).toBe('Solo Team');
    expect(deltas[0].delta).toBe(7); // 10 - 3
    expect(deltas[0].newScore).toBe(10);
    expect(deltas[0].newRank).toBe(1);
    expect(deltas[0].previousRank).toBe(1);
  });
});
