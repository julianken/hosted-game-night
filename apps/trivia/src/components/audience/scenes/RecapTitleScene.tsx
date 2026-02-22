'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useGameStore } from '@/stores/game-store';
import { heroSceneEnter, heroSceneEnterReduced } from '@/lib/motion/presets';

/**
 * RecapTitleScene (WU-06)
 *
 * "ROUND N RECAP" hero card shown at the start of the between-rounds recap flow.
 * Entry point before bidirectional Q/A review (recap_qa) and scores (recap_scores).
 *
 * Pattern mirrors RoundIntroScene: hero display-font number inside a bordered card
 * with motion entrance animation.
 *
 * Footer: "→ Begin · N Skip to next round"
 * Motion: heroSceneEnter (scaleUp + fade, springDramatic).
 * Reduced motion: instant fade-in.
 */
export function RecapTitleScene() {
  const shouldReduceMotion = useReducedMotion();

  const currentRound = useGameStore((state) => state.currentRound);
  const totalRounds = useGameStore((state) => state.totalRounds);

  const roundNumber = currentRound + 1;
  const isFinalRound = currentRound >= totalRounds - 1;

  const variants = shouldReduceMotion ? heroSceneEnterReduced : heroSceneEnter;

  return (
    <section
      className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-8 w-full px-4"
      role="region"
      aria-label={`Round ${roundNumber} recap`}
    >
      <motion.div
        className="flex flex-col items-center gap-6 text-center"
        variants={variants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero card */}
        <div
          className="relative"
          style={{
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
            {/* RECAP eyebrow label */}
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
              Round {roundNumber} Recap
            </p>

            {/* Large round number */}
            <h2
              className="font-black leading-none"
              style={{
                fontFamily: 'var(--font-display)',
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

        {/* Subtitle */}
        <motion.p
          className="text-foreground-secondary"
          style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          Let&apos;s review the answers
        </motion.p>
      </motion.div>

      {/* Navigation footer */}
      <div
        className="text-center"
        role="status"
        aria-live="polite"
        style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)' }}
      >
        <p className="text-foreground-secondary">
          &rarr; Begin &middot; N Skip to next round
        </p>
      </div>
    </section>
  );
}
