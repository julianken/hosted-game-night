'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useGameStore } from '@/stores/game-store';

/**
 * QuestionAnticipationScene
 *
 * Lightweight "Question N of M" interstitial displayed between questions.
 * Replaces the generic WaitingScene (spinner + wordmark) with an informative
 * display showing the upcoming question number and optional category badge.
 *
 * Duration: 2s auto-advance (QUESTION_ANTICIPATION_MS).
 * Skippable by presenter via Enter/D.
 */
export function QuestionAnticipationScene() {
  const shouldReduceMotion = useReducedMotion();

  const displayQuestionIndex = useGameStore((state) => state.displayQuestionIndex);
  const currentRound = useGameStore((state) => state.currentRound);
  const totalRounds = useGameStore((state) => state.totalRounds);
  const questions = useGameStore((state) => state.questions);
  const settings = useGameStore((state) => state.settings);

  const roundQuestions = useMemo(
    () => questions.filter((q) => q.roundIndex === currentRound),
    [questions, currentRound],
  );

  const questionsPerRound = roundQuestions.length || settings.questionsPerRound;

  // Compute the question number within the round (1-based)
  const questionInRound = useMemo(() => {
    if (displayQuestionIndex === null) return 1;
    const roundQIndex = roundQuestions.findIndex(
      (q) => questions.indexOf(q) === displayQuestionIndex,
    );
    return roundQIndex >= 0 ? roundQIndex + 1 : 1;
  }, [displayQuestionIndex, roundQuestions, questions]);

  // Get category from the upcoming question
  const upcomingQuestion = displayQuestionIndex !== null ? questions[displayQuestionIndex] : null;
  const category = upcomingQuestion?.category ?? null;

  const roundNumber = currentRound + 1;

  return (
    <section
      className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6 w-full px-4"
      role="region"
      aria-label={`Question ${questionInRound} of ${questionsPerRound}`}
      aria-live="polite"
    >
      <motion.div
        className="flex flex-col items-center gap-5 text-center"
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
        }
      >
        {/* Round indicator */}
        <p
          className="font-semibold uppercase tracking-widest text-foreground-secondary"
          style={{
            fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)',
            letterSpacing: '0.15em',
          }}
        >
          Round {roundNumber} of {totalRounds}
        </p>

        {/* Question number — hero text */}
        <div
          className="rounded-2xl border-2 px-10 py-6"
          style={{
            borderColor: 'rgba(126, 82, 228, 0.4)',
            background: 'rgba(126, 82, 228, 0.06)',
          }}
        >
          <p
            className="font-black uppercase tracking-widest mb-1"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1rem, 2vw, 1.5rem)',
              letterSpacing: '0.15em',
              color: 'var(--foreground-secondary)',
            }}
          >
            Question
          </p>
          <h2
            className="font-black leading-none text-foreground"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(4rem, 14vw, 12rem)',
              letterSpacing: '-0.04em',
              lineHeight: 0.9,
            }}
          >
            {questionInRound}
          </h2>
          <p
            className="mt-2 text-foreground-secondary"
            style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}
          >
            of {questionsPerRound}
          </p>
        </div>

        {/* Category badge — if available */}
        {category && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.25, delay: 0.15, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <div
              className="px-6 py-2.5 rounded-full border capitalize"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <span
                className="font-semibold text-foreground-secondary capitalize"
                style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}
              >
                {category.replace(/_/g, ' ')}
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
