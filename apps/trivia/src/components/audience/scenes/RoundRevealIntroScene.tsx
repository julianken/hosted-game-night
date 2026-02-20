'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useGameStore } from '@/stores/game-store';
import { heroSceneEnter, heroSceneEnterReduced } from '@/lib/motion/presets';

/**
 * RoundRevealIntroScene (T2.5.2)
 *
 * "ANSWERS" hero card opening the round-end reveal ceremony.
 * Displayed when the presenter starts the batch reveal ceremony (C key).
 *
 * Shows:
 * - Large "ANSWERS" text with hero enter animation (springDramatic)
 * - "Round N" subtitle
 * - Question count: "X Questions"
 * - Gradient text styling
 *
 * Auto-advances after 2.5s (BATCH_REVEAL_TIMING.ROUND_REVEAL_INTRO_MS).
 * Auto-advance is handled by the keyboard hook's useEffect watching timeRemaining.
 * Pressing Enter skips to the first question immediately.
 *
 * Motion: heroSceneEnter — scales from 0.85 with springDramatic. "Arrives with authority."
 */
export function RoundRevealIntroScene() {
  const shouldReduceMotion = useReducedMotion();

  const currentRound = useGameStore((state) => state.currentRound);
  const totalRounds = useGameStore((state) => state.totalRounds);
  const questions = useGameStore((state) => state.questions);

  const roundNumber = currentRound + 1;
  const isFinalRound = currentRound >= totalRounds - 1;
  const roundQuestionCount = questions.filter((q) => q.roundIndex === currentRound).length;

  const variants = shouldReduceMotion ? heroSceneEnterReduced : heroSceneEnter;

  return (
    <section
      className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-8 w-full px-4"
      role="region"
      aria-label={`Round ${roundNumber} answers reveal`}
      aria-live="polite"
    >
      <motion.div
        className="flex flex-col items-center gap-6 text-center"
        variants={variants}
        initial="hidden"
        animate="visible"
      >
        {/* "ANSWERS" hero text */}
        <div
          className="relative"
          style={{
            filter: 'drop-shadow(0 0 32px rgba(126, 82, 228, 0.6))',
          }}
        >
          <div
            className="rounded-3xl border-2 px-12 py-10"
            style={{
              borderColor: 'rgba(126, 82, 228, 0.5)',
              background: 'rgba(126, 82, 228, 0.08)',
            }}
          >
            {/* Pre-header: ceremony label */}
            <p
              className="font-bold uppercase tracking-widest mb-3"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)',
                letterSpacing: '0.25em',
                color: 'rgba(126, 82, 228, 0.7)',
              }}
            >
              {isFinalRound ? 'Final Round' : `Round ${roundNumber}`}
            </p>

            {/* Main "ANSWERS" word — hero display */}
            <h2
              className="font-black leading-none"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(5rem, 16vw, 12rem)',
                letterSpacing: '-0.04em',
                lineHeight: 0.9,
                // Gradient text effect
                background: 'linear-gradient(135deg, #a78bfa 0%, #7E52E4 50%, #6d28d9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              ANSWERS
            </h2>
          </div>
        </div>

        {/* Question count */}
        {roundQuestionCount > 0 && (
          <motion.p
            className="text-foreground-secondary"
            style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {roundQuestionCount} Question{roundQuestionCount !== 1 ? 's' : ''}
          </motion.p>
        )}

        {/* Auto-advance / press Enter hint */}
        <motion.p
          className="text-foreground-secondary motion-safe:animate-pulse"
          style={{ fontSize: 'clamp(0.75rem, 1.2vw, 1rem)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.8 }}
        >
          Revealing all answers...
        </motion.p>
      </motion.div>
    </section>
  );
}
