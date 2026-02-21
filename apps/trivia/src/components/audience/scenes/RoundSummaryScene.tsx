'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import {
  scoreboardRowStagger,
  scoreboardRow,
  scoreDeltaBadge,
  scoreDeltaBadgeReduced,
  springAnswerReveal,
} from '@/lib/motion/presets';
import { getTeamColor } from '@/lib/motion/team-colors';
import type { ScoreDelta } from '@/types';

/**
 * Rank change indicator props.
 */
interface RankChangeProps {
  previousRank: number;
  newRank: number;
}

/**
 * Shows an up arrow, down arrow, or dash depending on rank change.
 */
function RankChange({ previousRank, newRank }: RankChangeProps) {
  const diff = previousRank - newRank; // Positive = moved up (better rank)

  if (diff > 0) {
    return (
      <span
        aria-label={`Moved up ${diff} place${diff !== 1 ? 's' : ''}`}
        style={{ color: '#4ade80', fontSize: '1em' }}
      >
        ↑
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span
        aria-label={`Moved down ${Math.abs(diff)} place${Math.abs(diff) !== 1 ? 's' : ''}`}
        style={{ color: '#f87171', fontSize: '1em' }}
      >
        ↓
      </span>
    );
  }
  return (
    <span
      aria-label="No rank change"
      style={{ color: 'var(--foreground-secondary)', fontSize: '1em' }}
    >
      —
    </span>
  );
}

const rankLabels: Record<number, string> = {
  0: '1st',
  1: '2nd',
  2: '3rd',
};

/**
 * RoundSummaryScene (T2.7)
 *
 * Full scoreboard with score deltas and rank changes. Replaces the fallback
 * AudienceScoreboard in SceneRouter for the round_summary scene.
 *
 * Shows:
 * - Round X Complete / Final Standings header
 * - All teams sorted by score (descending)
 * - Score delta badges ("+2 this round") from scoreDeltas store
 * - Rank change indicators (up arrow, down arrow, dash)
 * - Team accent colors via getTeamColor()
 *
 * Motion: staggered row entry from left.
 * Reduced motion: rows appear instantly.
 */
export function RoundSummaryScene() {
  const shouldReduceMotion = useReducedMotion();
  const currentRound = useGameStore((state) => state.currentRound);
  const totalRounds = useGameStore((state) => state.totalRounds);
  const scoreDeltas = useGameStore((state) => state.scoreDeltas);

  const { teamsSortedByScore } = useGameSelectors();

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
      aria-label={isLastRound ? 'Final standings' : `Round ${currentRound + 1} complete`}
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
          {isLastRound ? 'Final Standings' : `Round ${currentRound + 1} Complete!`}
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
      <motion.div
        className="w-full max-w-4xl px-4 space-y-3"
        variants={scoreboardRowStagger}
        initial={shouldReduceMotion ? 'visible' : 'hidden'}
        animate="visible"
        role="list"
        aria-label="Team standings"
      >
        {teamsSortedByScore.length === 0 ? (
          <p
            className="text-center text-foreground-secondary py-8"
            style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}
          >
            No teams yet
          </p>
        ) : (
          teamsSortedByScore.map((team, index) => {
            const teamColor = getTeamColor(index);
            const scoreBarWidth = maxScore > 0 ? (team.score / maxScore) * 100 : 0;
            const isTopThree = index < 3;
            const delta = deltaMap.get(team.id);

            return (
              <motion.div
                key={team.id}
                role="listitem"
                aria-label={`${rankLabels[index] ?? `${index + 1}th`} place: ${team.name}, ${team.score} points${delta ? `, ${delta.delta > 0 ? '+' : ''}${delta.delta} this round` : ''}`}
                variants={scoreboardRow}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { ...springAnswerReveal, delay: index * 0.07 }
                }
                className="relative flex items-center rounded-xl overflow-hidden"
                style={{
                  background: isTopThree
                    ? teamColor.subtle
                    : 'rgba(26, 23, 32, 0.6)',
                  borderLeft: `4px solid ${teamColor.bg}`,
                  padding: '16px 20px',
                  minHeight: '72px',
                }}
              >
                {/* Score bar background fill */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    width: `${scoreBarWidth}%`,
                    background: teamColor.subtle,
                    transition: shouldReduceMotion
                      ? 'none'
                      : 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                    opacity: 0.5,
                  }}
                />

                {/* Rank badge */}
                <div className="relative z-10 flex-shrink-0 w-16 text-center">
                  {isTopThree ? (
                    <span
                      className="inline-flex items-center justify-center rounded-full font-bold text-white"
                      style={{
                        background: teamColor.bg,
                        width: '44px',
                        height: '44px',
                        fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
                      }}
                      aria-hidden="true"
                    >
                      {rankLabels[index]}
                    </span>
                  ) : (
                    <span
                      className="font-semibold text-foreground-secondary"
                      style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Team name */}
                <div className="relative z-10 flex-1 px-4">
                  <span
                    className="font-semibold text-foreground"
                    style={{ fontSize: 'clamp(1.25rem, 2.5vw, 2rem)' }}
                  >
                    {team.name}
                  </span>
                </div>

                {/* Rank change indicator */}
                {delta && (
                  <div
                    className="relative z-10 flex-shrink-0 mr-3"
                    style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}
                    aria-hidden="true"
                  >
                    <RankChange
                      previousRank={delta.previousRank}
                      newRank={delta.newRank}
                    />
                  </div>
                )}

                {/* Score delta badge */}
                {delta && delta.delta !== 0 && (
                  <motion.div
                    className="relative z-10 flex-shrink-0 mr-3"
                    variants={
                      shouldReduceMotion ? scoreDeltaBadgeReduced : scoreDeltaBadge
                    }
                    initial="hidden"
                    animate="visible"
                    aria-hidden="true"
                  >
                    <span
                      className="inline-flex items-center justify-center rounded-full px-2 py-0.5 font-bold tabular-nums"
                      style={{
                        fontSize: 'clamp(0.75rem, 1.3vw, 1rem)',
                        background:
                          delta.delta > 0
                            ? 'rgba(34, 197, 94, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)',
                        color: delta.delta > 0 ? '#4ade80' : '#f87171',
                        border: `1px solid ${
                          delta.delta > 0
                            ? 'rgba(74, 222, 128, 0.4)'
                            : 'rgba(248, 113, 113, 0.4)'
                        }`,
                      }}
                    >
                      {delta.delta > 0 ? `+${delta.delta}` : delta.delta}
                    </span>
                  </motion.div>
                )}

                {/* Score */}
                <div className="relative z-10 flex-shrink-0">
                  <span
                    className="font-bold tabular-nums"
                    style={{
                      fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                      color: teamColor.bg,
                      fontFamily: 'var(--font-display)',
                    }}
                    aria-hidden="true"
                  >
                    {team.score}
                  </span>
                  <span className="sr-only">{team.score} points</span>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Scoring status indicator */}
      <div className="text-center mt-4" role="status" aria-live="polite">
        <p
          className="text-foreground-secondary motion-safe:animate-pulse"
          style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)' }}
        >
          Scoring in progress...
        </p>
      </div>
    </section>
  );
}
