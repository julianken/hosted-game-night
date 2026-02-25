'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useGameStore } from '@/stores/game-store';
import { heroSceneEnter, heroSceneEnterReduced, EASE } from '@/lib/motion/presets';
import type { Team } from '@/types';

/**
 * RoundIntroScene (T2.6)
 *
 * "ROUND N" display card shown at the start of each round.
 * Shows round number, category (from first question of the round), and question count.
 * For rounds 2+ (currentRound > 0), also shows a compact previous-standings list
 * that appears ~0.7s after the round number to give the hero text visual priority.
 *
 * Final round variant: amber border glow and amber accent text.
 * Motion: hero enter animation (scaleUp + fade, springDramatic).
 * Reduced motion: instant fade-in.
 *
 * Auto-advance at 4s is handled by the timeRemaining watcher in useGameKeyboard.
 */
export function RoundIntroScene() {
  const shouldReduceMotion = useReducedMotion();

  const currentRound = useGameStore((state) => state.currentRound);
  const totalRounds = useGameStore((state) => state.totalRounds);
  const questions = useGameStore((state) => state.questions);
  const teams = useGameStore((state) => state.teams);

  const isFinalRound = currentRound >= totalRounds - 1;
  const roundNumber = currentRound + 1;

  // Get info from first question of this round
  const roundQuestions = questions.filter((q) => q.roundIndex === currentRound);
  const questionCount = roundQuestions.length;
  const firstQuestion = roundQuestions[0];
  const category = firstQuestion?.category ?? null;

  // Standings: only shown for round 2+ (currentRound > 0, 0-indexed).
  // Sorted descending by score; values reflect end-of-previous-round totals
  // because nextRoundEngine has already run before this scene is displayed.
  const showStandings = currentRound > 0 && teams.length > 0;
  const sortedTeams: Team[] = showStandings
    ? [...teams].sort((a, b) => b.score - a.score)
    : [];

  const variants = shouldReduceMotion ? heroSceneEnterReduced : heroSceneEnter;

  return (
    <section
      className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-8 w-full px-4"
      role="region"
      aria-label={`Round ${roundNumber} introduction`}
      aria-live="polite"
    >
      <motion.div
        className="flex flex-col items-center gap-6 text-center"
        variants={variants}
        initial="hidden"
        animate="visible"
      >
        {/* Round number — hero text */}
        <div
          className="relative"
          style={{
            // Final round amber border glow
            filter: isFinalRound
              ? 'drop-shadow(0 0 24px rgba(245, 158, 11, 0.5))'
              : undefined,
          }}
        >
          <div
            className="rounded-3xl border-2 px-12 py-8"
            style={{
              borderColor: isFinalRound
                ? 'rgba(245, 158, 11, 0.6)'
                : 'rgba(126, 82, 228, 0.4)',
              background: isFinalRound
                ? 'rgba(245, 158, 11, 0.08)'
                : 'rgba(126, 82, 228, 0.06)',
            }}
          >
            <p
              className="font-black uppercase tracking-widest mb-2"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1rem, 2vw, 1.5rem)',
                letterSpacing: '0.2em',
                color: isFinalRound
                  ? 'rgba(245, 158, 11, 0.8)'
                  : 'var(--foreground-secondary)',
              }}
            >
              {isFinalRound ? 'Final Round' : 'Round'}
            </p>
            <h2
              className="font-black leading-none"
              style={{
                fontFamily: 'var(--font-display)',
                // --display-text-round-num clamp
                fontSize: 'clamp(6rem, 20vw, 16rem)',
                letterSpacing: '-0.04em',
                lineHeight: 0.9,
                color: isFinalRound ? '#F59E0B' : 'var(--foreground)',
              }}
            >
              {roundNumber}
            </h2>
          </div>
        </div>

        {/* Category name — if available */}
        {category && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="px-8 py-3 rounded-full border capitalize"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <span
                className="font-semibold text-foreground-secondary capitalize"
                style={{ fontSize: 'clamp(1.25rem, 2.5vw, 2rem)' }}
              >
                {category.replace(/_/g, ' ')}
              </span>
            </div>
          </motion.div>
        )}

        {/* Question count */}
        {questionCount > 0 && (
          <motion.p
            className="text-foreground-secondary"
            style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {questionCount} Question{questionCount !== 1 ? 's' : ''}
          </motion.p>
        )}
      </motion.div>

      {/* Previous standings — rounds 2+ only, delayed 0.7s for visual flow */}
      {showStandings && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.35,
            delay: shouldReduceMotion ? 0 : 0.7,
            ease: EASE.entrance,
          }}
          aria-label="Standings after previous round"
        >
          <p
            className="text-center font-semibold uppercase tracking-widest mb-3"
            style={{
              fontSize: 'clamp(0.75rem, 1.2vw, 1rem)',
              letterSpacing: '0.18em',
              color: 'var(--foreground-secondary)',
            }}
          >
            Standings
          </p>
          <ol
            className="flex flex-col gap-2 w-full"
            style={{ minWidth: 'clamp(16rem, 30vw, 28rem)' }}
          >
            {sortedTeams.map((team, index) => {
              const isLeader = index === 0;
              return (
                <li
                  key={team.id}
                  className="flex items-center justify-between gap-4 rounded-xl px-5 py-2"
                  style={{
                    background: isLeader
                      ? 'rgba(126, 82, 228, 0.12)'
                      : 'rgba(255, 255, 255, 0.04)',
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: isLeader
                      ? 'rgba(126, 82, 228, 0.35)'
                      : 'rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <span
                    className="font-semibold tabular-nums"
                    style={{
                      fontSize: 'clamp(0.875rem, 1.4vw, 1.125rem)',
                      color: 'var(--foreground-secondary)',
                      minWidth: '1.5rem',
                    }}
                  >
                    {index + 1}.
                  </span>
                  <span
                    className="flex-1 font-semibold truncate"
                    style={{
                      fontSize: 'clamp(1rem, 1.6vw, 1.25rem)',
                      color: isLeader ? 'var(--foreground)' : 'var(--foreground-secondary)',
                    }}
                  >
                    {team.name}
                  </span>
                  <span
                    className="font-black tabular-nums"
                    style={{
                      fontSize: 'clamp(1rem, 1.6vw, 1.25rem)',
                      color: isLeader ? 'var(--color-accent, #7E52E4)' : 'var(--foreground)',
                    }}
                  >
                    {team.score}
                  </span>
                </li>
              );
            })}
          </ol>
        </motion.div>
      )}
    </section>
  );
}
