'use client';

import { useGameStore, useGameSelectors } from '@/stores/game-store';
import type { ScoreDelta } from '@/types';
import { ScoreboardRows } from './shared/ScoreboardRows';

/**
 * RecapScoresScene (WU-06)
 *
 * Animated scoreboard for the recap flow, shown after the Q/A review.
 * This is the terminal recap scene before advancing to the next round.
 *
 * Shows:
 * - "Round N Scores" header
 * - All teams sorted by score (descending)
 * - Score delta badges ("+N this round") from scoreDeltas store
 * - Rank change indicators
 * - Team accent colors via getTeamColor()
 *
 * Footer: "Press Enter or N for next round"
 *
 * Motion: staggered row entry from left (via ScoreboardRows).
 * Reduced motion: rows appear instantly.
 */
export function RecapScoresScene() {
  const currentRound = useGameStore((state) => state.currentRound);
  const totalRounds = useGameStore((state) => state.totalRounds);
  const scoreDeltas = useGameStore((state) => state.scoreDeltas);

  const { teamsSortedByScore } = useGameSelectors();

  const roundNumber = currentRound + 1;
  const isLastRound = currentRound >= totalRounds - 1;
  const maxScore =
    teamsSortedByScore.length > 0
      ? Math.max(...teamsSortedByScore.map((t) => t.score), 1)
      : 1;

  // Build delta lookup
  const deltaMap = new Map<string, ScoreDelta>(
    scoreDeltas.map((d) => [d.teamId, d]),
  );

  return (
    <section
      className="flex flex-col items-center h-full min-h-[60vh] gap-6 w-full"
      role="region"
      aria-label={isLastRound ? 'Final standings after recap' : `Round ${roundNumber} scores`}
    >
      {/* Header */}
      <div className="text-center" aria-live="polite">
        <h2
          className="font-bold text-foreground"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 5vw, 3.75rem)',
            letterSpacing: '-0.02em',
          }}
        >
          {isLastRound ? 'Final Standings' : `Round ${roundNumber} Scores`}
        </h2>
        <p
          className="mt-2 text-foreground-secondary"
          style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}
        >
          {isLastRound
            ? 'Game Over'
            : `${totalRounds - currentRound - 1} round${totalRounds - currentRound - 1 !== 1 ? 's' : ''} remaining`}
        </p>
      </div>

      {/* Scoreboard rows */}
      <ScoreboardRows
        teams={teamsSortedByScore}
        deltaMap={deltaMap}
        maxScore={maxScore}
      />

      {/* Navigation footer */}
      <div className="text-center mt-4" role="status" aria-live="polite">
        <p
          className="text-foreground-secondary"
          style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)' }}
        >
          Press Enter or N for next round
        </p>
      </div>
    </section>
  );
}
