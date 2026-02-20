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
 * ScoreFlashScene (T2.2)
 *
 * Compact post-question scoreboard for instant mode. Shown after each
 * question's answer reveal. Displays team scores with deltas ("+1", "+2")
 * earned on the just-closed question. Teams sorted by score descending.
 *
 * Motion: rows stagger in from left (same as AudienceScoreboard).
 * Reduced motion: rows appear instantly.
 */
export function ScoreFlashScene() {
  const shouldReduceMotion = useReducedMotion();
  const scoreDeltas = useGameStore((state) => state.scoreDeltas);
  const currentRound = useGameStore((state) => state.currentRound);
  const totalRounds = useGameStore((state) => state.totalRounds);

  const { teamsSortedByScore } = useGameSelectors();

  // Build a lookup map from teamId -> ScoreDelta for fast access
  const deltaMap = new Map<string, ScoreDelta>(
    scoreDeltas.map((d) => [d.teamId, d]),
  );

  const maxScore =
    teamsSortedByScore.length > 0
      ? Math.max(...teamsSortedByScore.map((t) => t.score), 1)
      : 1;

  const questionNumber = useGameStore((state) => {
    const displayIdx = state.displayQuestionIndex;
    if (displayIdx === null) return null;
    const roundQs = state.questions.filter((q) => q.roundIndex === state.currentRound);
    const roundQ = roundQs.findIndex(
      (q) => state.questions.indexOf(q) === displayIdx,
    );
    return roundQ >= 0 ? roundQ + 1 : displayIdx + 1;
  });

  return (
    <section
      className="flex flex-col items-center h-full min-h-[60vh] gap-6 w-full"
      role="region"
      aria-label="Score update"
    >
      {/* Header */}
      <div className="text-center" aria-live="polite">
        <h2
          className="font-bold text-foreground"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 4vw, 3rem)',
            letterSpacing: '-0.02em',
          }}
        >
          {questionNumber !== null ? `After Question ${questionNumber}` : 'Score Update'}
        </h2>
        <p
          className="mt-1 text-foreground-secondary"
          style={{ fontSize: 'clamp(0.875rem, 1.8vw, 1.375rem)' }}
        >
          Round {currentRound + 1} of {totalRounds}
        </p>
      </div>

      {/* Scoreboard rows */}
      <motion.div
        className="w-full max-w-4xl px-4 space-y-2"
        variants={scoreboardRowStagger}
        initial={shouldReduceMotion ? 'visible' : 'hidden'}
        animate="visible"
        role="list"
        aria-label="Team scores"
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
            const delta = deltaMap.get(team.id);
            const hasPositiveDelta = delta && delta.delta > 0;
            const hasNegativeDelta = delta && delta.delta < 0;

            return (
              <motion.div
                key={team.id}
                role="listitem"
                aria-label={`${index + 1}. ${team.name}: ${team.score} points${delta ? `, ${delta.delta > 0 ? '+' : ''}${delta.delta} this question` : ''}`}
                variants={scoreboardRow}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { ...springAnswerReveal, delay: index * 0.06 }
                }
                className="relative flex items-center rounded-xl overflow-hidden"
                style={{
                  background:
                    index < 3 ? teamColor.subtle : 'rgba(26, 23, 32, 0.6)',
                  borderLeft: `4px solid ${teamColor.bg}`,
                  padding: '12px 16px',
                  minHeight: '60px',
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

                {/* Rank number */}
                <div className="relative z-10 flex-shrink-0 w-10 text-center">
                  <span
                    className="font-semibold text-foreground-secondary"
                    style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)' }}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                </div>

                {/* Team name */}
                <div className="relative z-10 flex-1 px-3">
                  <span
                    className="font-semibold text-foreground"
                    style={{ fontSize: 'clamp(1rem, 2vw, 1.625rem)' }}
                  >
                    {team.name}
                  </span>
                </div>

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
                        background: hasPositiveDelta
                          ? 'rgba(34, 197, 94, 0.2)'
                          : hasNegativeDelta
                            ? 'rgba(239, 68, 68, 0.2)'
                            : 'rgba(156, 163, 175, 0.2)',
                        color: hasPositiveDelta
                          ? '#4ade80'
                          : hasNegativeDelta
                            ? '#f87171'
                            : 'var(--foreground-secondary)',
                        border: `1px solid ${
                          hasPositiveDelta
                            ? 'rgba(74, 222, 128, 0.4)'
                            : hasNegativeDelta
                              ? 'rgba(248, 113, 113, 0.4)'
                              : 'rgba(156, 163, 175, 0.3)'
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
                      fontSize: 'clamp(1.25rem, 2.5vw, 2rem)',
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

      {/* Hint */}
      <div className="text-center" role="status" aria-live="polite">
        <p
          className="text-foreground-secondary motion-safe:animate-pulse"
          style={{ fontSize: 'clamp(0.75rem, 1.4vw, 1.125rem)' }}
        >
          Next question coming up...
        </p>
      </div>
    </section>
  );
}
