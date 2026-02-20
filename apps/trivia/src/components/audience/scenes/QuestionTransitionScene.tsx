'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useGameStore } from '@/stores/game-store';
import { neutralSceneEnter } from '@/lib/motion/presets';

/**
 * QuestionTransitionScene (T2.5.1)
 *
 * SVG progress ring showing "X / Y" (e.g., "3 / 5") between questions
 * in batch mode. Shown after the presenter scores a question and before
 * the next question_anticipation scene.
 *
 * Shows:
 * - Animated SVG progress ring with question count
 * - "QUESTION X" label below the ring
 * - Category name of the next question
 *
 * Auto-advances after 1.5s (BATCH_REVEAL_TIMING.QUESTION_TRANSITION_MS).
 * Auto-advance is handled by useSceneAutoAdvance in the keyboard hook.
 *
 * Used by both question_transition and scoring_pause (via re-export).
 */
export function QuestionTransitionScene() {
  const shouldReduceMotion = useReducedMotion();

  const displayQuestionIndex = useGameStore((state) => state.displayQuestionIndex);
  const questions = useGameStore((state) => state.questions);
  const currentRound = useGameStore((state) => state.currentRound);

  // Get questions for current round
  const roundQuestions = questions.filter((q) => q.roundIndex === currentRound);
  const totalInRound = roundQuestions.length;

  // Determine current question position within the round
  let questionInRound = 1;
  let nextCategory: string | null = null;

  if (displayQuestionIndex !== null) {
    const currentRoundQuestion = roundQuestions.findIndex(
      (q) => questions.indexOf(q) === displayQuestionIndex
    );
    if (currentRoundQuestion >= 0) {
      questionInRound = currentRoundQuestion + 1;
      // Next question category (if there is a next question)
      const nextRoundQuestion = roundQuestions[currentRoundQuestion + 1];
      if (nextRoundQuestion) {
        nextCategory = nextRoundQuestion.category ?? null;
      }
    }
  }

  // SVG progress ring dimensions
  const RING_RADIUS = 80;
  const RING_STROKE = 8;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const progress = totalInRound > 0 ? questionInRound / totalInRound : 0;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  const svgSize = (RING_RADIUS + RING_STROKE) * 2 + 8;

  return (
    <section
      className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-8 w-full px-4"
      role="region"
      aria-label={`Question ${questionInRound} of ${totalInRound}`}
      aria-live="polite"
    >
      <motion.div
        className="flex flex-col items-center gap-6 text-center"
        variants={neutralSceneEnter}
        initial="hidden"
        animate="visible"
      >
        {/* SVG Progress Ring */}
        <div className="relative flex items-center justify-center">
          <svg
            width={svgSize}
            height={svgSize}
            viewBox={`0 0 ${svgSize} ${svgSize}`}
            aria-hidden="true"
          >
            {/* Background track */}
            <circle
              cx={svgSize / 2}
              cy={svgSize / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={RING_STROKE}
            />
            {/* Progress fill */}
            <circle
              cx={svgSize / 2}
              cy={svgSize / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="rgba(126, 82, 228, 0.8)"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
              style={{
                transition: shouldReduceMotion
                  ? 'none'
                  : 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: 'drop-shadow(0 0 8px rgba(126, 82, 228, 0.6))',
              }}
            />
          </svg>

          {/* Center text: "X / Y" */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            aria-hidden="true"
          >
            <span
              className="font-black leading-none tabular-nums"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                letterSpacing: '-0.04em',
                color: 'var(--foreground)',
              }}
            >
              {questionInRound}
            </span>
            <span
              className="text-foreground-secondary"
              style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)' }}
            >
              of {totalInRound}
            </span>
          </div>
        </div>

        {/* "QUESTION X" label */}
        <div>
          <p
            className="font-black uppercase tracking-widest"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.25rem, 2.5vw, 2rem)',
              letterSpacing: '0.2em',
              color: 'var(--foreground-secondary)',
            }}
          >
            Question {questionInRound}
          </p>

          {/* Next question category (if available) */}
          {nextCategory && (
            <motion.p
              className="mt-2 capitalize"
              style={{
                fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)',
                color: 'rgba(126, 82, 228, 0.8)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.25 }}
            >
              Next: {nextCategory.replace(/_/g, ' ')}
            </motion.p>
          )}
        </div>

        {/* Auto-advance hint */}
        <p
          className="text-foreground-secondary motion-safe:animate-pulse"
          style={{ fontSize: 'clamp(0.75rem, 1.2vw, 1rem)' }}
          aria-live="polite"
        >
          Next question coming up...
        </p>
      </motion.div>
    </section>
  );
}
