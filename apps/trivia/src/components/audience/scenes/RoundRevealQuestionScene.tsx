'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useGameStore } from '@/stores/game-store';
import {
  answerOptionStagger,
  answerOption,
  springPlayful,
  questionReveal,
  springQuestionReveal,
} from '@/lib/motion/presets';

/**
 * RoundRevealQuestionScene (T2.5.3)
 *
 * Question re-shown with options at neutral (full) opacity — the "recall moment"
 * before the answer is revealed. This is the batch ceremony equivalent of
 * asking "remember this one?" before revealing.
 *
 * Shows:
 * - "Question X of Y" header
 * - Question text
 * - All answer options at full opacity (neutral state, no correct/incorrect hints)
 * - NO timer, NO reveal phase
 *
 * Indefinite — presenter advances with Enter or Right Arrow (advanceCeremony).
 * Pressing Left Arrow retreats via retreatCeremony.
 *
 * Reads ceremony question data from store:
 *   revealCeremonyResults.questions[revealCeremonyQuestionIndex]
 */
export function RoundRevealQuestionScene() {
  const shouldReduceMotion = useReducedMotion();

  const revealCeremonyResults = useGameStore((state) => state.revealCeremonyResults);
  const revealCeremonyQuestionIndex = useGameStore(
    (state) => state.revealCeremonyQuestionIndex
  );

  const ceremonyQuestion = revealCeremonyResults && revealCeremonyQuestionIndex !== null
    ? (revealCeremonyResults.questions[revealCeremonyQuestionIndex] ?? null)
    : null;

  const totalQuestions = revealCeremonyResults?.questions.length ?? 0;
  const currentQuestionNumber = (revealCeremonyQuestionIndex ?? 0) + 1;

  if (!ceremonyQuestion) {
    return (
      <section
        className="flex items-center justify-center h-full"
        role="region"
        aria-label="Loading ceremony question"
      >
        <p className="text-foreground-secondary" style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}>
          Loading question...
        </p>
      </section>
    );
  }

  const { questionText, options, optionTexts } = ceremonyQuestion;

  // Option color config for neutral display (matches AudienceAnswerOptions palette)
  const optionColors: Record<string, { bg: string; border: string; badgeBg: string }> = {
    A: { bg: 'rgba(59, 130, 246, 0.12)',  border: '#3B82F6', badgeBg: '#3B82F6' },
    B: { bg: 'rgba(239, 68, 68, 0.12)',   border: '#EF4444', badgeBg: '#EF4444' },
    C: { bg: 'rgba(16, 185, 129, 0.12)',  border: '#10B981', badgeBg: '#10B981' },
    D: { bg: 'rgba(245, 158, 11, 0.12)',  border: '#F59E0B', badgeBg: '#F59E0B' },
  };
  const defaultOptionColor = { bg: 'rgba(126, 82, 228, 0.12)', border: '#7E52E4', badgeBg: '#7E52E4' };

  return (
    <article
      className="flex flex-col h-full min-h-[80vh] py-4 gap-6"
      role="region"
      aria-label={`Ceremony question ${currentQuestionNumber} of ${totalQuestions}`}
    >
      {/* Header: Question X of Y */}
      <header className="flex items-center justify-center px-4">
        <motion.div
          className="px-6 py-2 rounded-full border"
          style={{
            borderColor: 'rgba(126, 82, 228, 0.3)',
            background: 'rgba(126, 82, 228, 0.08)',
          }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <span
            className="font-bold"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1rem, 2vw, 1.5rem)',
              color: 'rgba(126, 82, 228, 0.9)',
              letterSpacing: '0.05em',
            }}
          >
            Question {currentQuestionNumber} of {totalQuestions}
          </span>
        </motion.div>
      </header>

      {/* Question text */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 lg:px-8">
        <motion.h2
          className="font-bold text-foreground text-center leading-tight max-w-6xl"
          style={{
            fontSize: 'clamp(2.5rem, 5.5vw, 6rem)',
            lineHeight: 1.15,
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.02em',
          }}
          variants={questionReveal}
          initial={shouldReduceMotion ? 'visible' : 'hidden'}
          animate="visible"
          transition={shouldReduceMotion ? { duration: 0 } : springQuestionReveal}
        >
          {questionText}
        </motion.h2>
      </section>

      {/* Answer options — neutral (all same, no reveal hints) */}
      <section className="px-4 lg:px-8 pb-4">
        <div className="flex justify-center">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 w-full max-w-5xl"
            variants={answerOptionStagger}
            initial={shouldReduceMotion ? 'visible' : 'hidden'}
            animate="visible"
            role="list"
            aria-label="Answer options"
          >
            {options.map((option, index) => {
              const config = optionColors[option] ?? defaultOptionColor;
              const text = optionTexts[index] ?? '';

              return (
                <motion.div
                  key={option}
                  variants={answerOption}
                  transition={shouldReduceMotion ? { duration: 0 } : { ...springPlayful, delay: index * 0.05 }}
                  className="flex items-center gap-4 rounded-xl overflow-hidden"
                  style={{
                    background: config.bg,
                    borderLeft: `4px solid ${config.border}`,
                    padding: '20px 24px',
                  }}
                  role="listitem"
                  aria-label={`Option ${option}: ${text}`}
                >
                  {/* Option badge */}
                  <span
                    aria-hidden="true"
                    className="flex items-center justify-center rounded-full font-bold flex-shrink-0 text-white"
                    style={{
                      background: config.badgeBg,
                      width: '60px',
                      height: '60px',
                      fontSize: 'clamp(1.25rem, 2.5vw, 1.875rem)',
                      minWidth: '60px',
                    }}
                  >
                    {option}
                  </span>

                  {/* Option text */}
                  <span
                    className="font-medium leading-snug text-foreground flex-1"
                    style={{ fontSize: 'clamp(1.25rem, 2.5vw, 2rem)' }}
                  >
                    {text}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Hint */}
      <div className="text-center pb-2" role="status" aria-live="polite">
        <p
          className="text-foreground-secondary"
          style={{ fontSize: 'clamp(0.75rem, 1.2vw, 1rem)' }}
        >
          Press Enter to reveal the answer
        </p>
      </div>
    </article>
  );
}
