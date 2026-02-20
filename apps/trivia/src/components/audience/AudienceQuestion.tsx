'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { Question, Timer } from '@/types';
import type { RevealPhase } from '@/types/audience-scene';
import { AudienceTimer } from './AudienceTimer';
import { AudienceAnswerOptions } from './AudienceAnswerOptions';
import { AudienceRoundInfo } from './AudienceRoundInfo';
import { questionReveal, springQuestionReveal } from '@/lib/motion/presets';

export interface AudienceQuestionProps {
  /** The current question to display */
  question: Question;
  /** Current question number within the round (1-based) */
  questionNumber: number;
  /** Total questions in this round */
  totalQuestions: number;
  /** Current round number (1-based for display) */
  roundNumber: number;
  /** Total number of rounds */
  totalRounds: number;
  /** Timer state (optional - shows timer if provided) */
  timer?: Timer;
  /** Whether timer is visible per settings */
  timerVisible?: boolean;
  /** Currently revealed answer (null if not revealed yet) */
  revealedAnswer?: string | null;
  /**
   * Reveal phase for 5-beat choreography (from AnswerRevealScene).
   * When provided, AudienceAnswerOptions enters phase-aware mode.
   */
  revealPhase?: RevealPhase | null;
}

// Category color mappings for visual distinction — using CSS vars for hex values
const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  music:   { bg: 'bg-purple-500/10', border: 'border-purple-500/40', text: 'text-purple-400' },
  movies:  { bg: 'bg-red-500/10',    border: 'border-red-500/40',    text: 'text-red-400' },
  tv:      { bg: 'bg-blue-500/10',   border: 'border-blue-500/40',   text: 'text-blue-400' },
  history: { bg: 'bg-amber-500/10',  border: 'border-amber-500/40',  text: 'text-amber-400' },
  science: { bg: 'bg-teal-500/10',   border: 'border-teal-500/40',   text: 'text-teal-400' },
  sports:  { bg: 'bg-green-500/10',  border: 'border-green-500/40',  text: 'text-green-400' },
  art:     { bg: 'bg-pink-500/10',   border: 'border-pink-500/40',   text: 'text-pink-400' },
};

const defaultCategoryColor = { bg: 'bg-primary/10', border: 'border-primary/40', text: 'text-primary' };

/**
 * Full-featured question display for audience/projector view.
 *
 * Hero text uses clamp(2.5rem, 5.5vw, 6rem) for cinematic scaling.
 * Minimum effective size at 1920x1080: ~105px (well above 40px minimum).
 * Motion entrance: springQuestionReveal slides up + fades in.
 * Respects prefers-reduced-motion via useReducedMotion().
 *
 * NOTE: Audience display text minimum 40px on 1920x1080 (Issue A-23).
 */
export function AudienceQuestion({
  question,
  questionNumber,
  totalQuestions,
  roundNumber,
  totalRounds,
  timer,
  timerVisible = true,
  revealedAnswer,
  revealPhase,
}: AudienceQuestionProps) {
  const shouldReduceMotion = useReducedMotion();
  const categoryStyle = categoryColors[question.category] || defaultCategoryColor;

  return (
    <motion.article
      key={question.text}
      variants={questionReveal}
      initial={shouldReduceMotion ? 'visible' : 'hidden'}
      animate="visible"
      transition={shouldReduceMotion ? { duration: 0 } : springQuestionReveal}
      className="flex flex-col h-full min-h-[80vh] py-4 gap-6"
      role="region"
      aria-label={`Question ${questionNumber} of ${totalQuestions}, Round ${roundNumber}`}
    >
      {/* Header: Round info and Timer */}
      <header className="flex flex-col lg:flex-row items-center justify-between gap-6 px-4">
        <div className="flex-1 w-full lg:w-auto">
          <AudienceRoundInfo
            roundNumber={roundNumber}
            totalRounds={totalRounds}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
            category={question.category}
          />
        </div>

        {timer && timerVisible && (
          <div className="flex-shrink-0">
            <AudienceTimer
              timer={timer}
              visible={timerVisible}
              size="compact"
              showStatus={false}
            />
          </div>
        )}
      </header>

      {/* Main content: Category badge + Question text */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 lg:px-8">
        {/* Category badge */}
        <div
          className={`
            mb-6 px-8 py-3 rounded-full border-2
            ${categoryStyle.bg} ${categoryStyle.border}
          `}
          aria-label={`Category: ${question.category}`}
        >
          <span
            className={`font-bold capitalize ${categoryStyle.text}`}
            style={{ fontSize: 'clamp(1.25rem, 2vw, 1.875rem)' }}
          >
            {question.category}
          </span>
        </div>

        {/* Hero question text — cinematic scale for projection */}
        <h2
          id="current-question"
          className="font-bold text-foreground text-center leading-tight max-w-6xl"
          style={{
            fontSize: 'clamp(2.5rem, 5.5vw, 6rem)',
            lineHeight: 1.15,
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.02em',
          }}
        >
          {question.text}
        </h2>
      </section>

      {/* Answer options section */}
      <section className="px-4 lg:px-8 pb-4">
        <div className="flex justify-center">
          <AudienceAnswerOptions
            type={question.type}
            options={question.options}
            optionTexts={question.optionTexts}
            revealedAnswer={revealedAnswer}
            revealPhase={revealPhase}
          />
        </div>
      </section>

      {/* Timer expired announcement */}
      {timer && timerVisible && timer.remaining <= 0 && timer.duration > 0 && (
        <div
          className="text-center py-4 border-t"
          style={{ background: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
          role="alert"
          aria-live="assertive"
        >
          <span
            className="font-bold text-red-400 motion-safe:animate-pulse"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}
          >
            TIME IS UP!
          </span>
        </div>
      )}
    </motion.article>
  );
}
