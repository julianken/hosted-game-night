'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import { AudienceQuestion } from '@/components/audience/AudienceQuestion';
import { WaitingDisplay } from '@/components/audience/WaitingDisplay';
import { springUrgent } from '@/lib/motion/presets';

/**
 * QuestionClosedScene (T2.3)
 *
 * Shown when the question timer expires (question_closed scene).
 * "TIME'S UP!" badge replaces the timer. Question and options remain visible
 * but dimmed slightly (opacity 0.7) to indicate time has passed.
 *
 * The badge slams in using springUrgent (per motion spec for "TIME'S UP!").
 * Reduced motion: badge appears instantly.
 */
export function QuestionClosedScene() {
  const shouldReduceMotion = useReducedMotion();
  const displayQuestionIndex = useGameStore((state) => state.displayQuestionIndex);
  const currentRound = useGameStore((state) => state.currentRound);
  const totalRounds = useGameStore((state) => state.totalRounds);
  const { displayQuestion } = useGameSelectors();

  const settings = useGameStore((state) => state.settings);

  const questions = useGameStore((state) => state.questions);
  const questionsInRound = useMemo(
    () => questions.filter((q) => q.roundIndex === currentRound),
    [questions, currentRound],
  );
  const questionsPerRound = questionsInRound.length || settings.questionsPerRound;

  const questionInRound =
    displayQuestionIndex !== null
      ? (displayQuestionIndex % Math.max(questionsPerRound, 1)) + 1
      : 1;

  if (!displayQuestion) {
    return <WaitingDisplay message="Time's up!" />;
  }

  return (
    <div className="relative w-full h-full">
      {/* Question and options — dimmed to indicate time has passed */}
      <div style={{ opacity: 0.7 }}>
        <AudienceQuestion
          question={displayQuestion}
          questionNumber={questionInRound}
          totalQuestions={questionsPerRound}
          roundNumber={currentRound + 1}
          totalRounds={totalRounds}
        />
      </div>

      {/* TIME'S UP! overlay badge */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-live="assertive"
        role="alert"
      >
        <motion.div
          initial={
            shouldReduceMotion
              ? { opacity: 1, scale: 1 }
              : { opacity: 0, scale: 0.7 }
          }
          animate={{ opacity: 1, scale: 1 }}
          transition={
            shouldReduceMotion ? { duration: 0 } : { ...springUrgent }
          }
        >
          <div
            className="rounded-2xl border-2 text-center"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              borderColor: 'rgba(239, 68, 68, 0.7)',
              padding: 'clamp(16px, 3vw, 32px) clamp(24px, 5vw, 64px)',
              boxShadow:
                '0 0 40px rgba(239, 68, 68, 0.3), 0 0 80px rgba(239, 68, 68, 0.1)',
            }}
          >
            <span
              className="font-black text-red-400 block"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.5rem, 8vw, 7rem)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
                textShadow:
                  '0 0 20px rgba(239, 68, 68, 0.6), 0 0 40px rgba(239, 68, 68, 0.3)',
              }}
            >
              TIME&apos;S UP!
            </span>
            <p
              className="text-red-300 mt-2"
              style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}
            >
              Waiting for the answer...
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
