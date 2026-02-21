'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { Question } from '@/types';
import type { RevealPhase } from '@/types/audience-scene';
import { AudienceAnswerOptions } from './AudienceAnswerOptions';
import { questionReveal, springQuestionReveal } from '@/lib/motion/presets';

export interface AudienceQuestionProps {
  /** The current question to display */
  question: Question;
  /** Current question number (for aria-label) */
  questionNumber: number;
  /** Total questions (for aria-label) */
  totalQuestions: number;
  /** Current round number (for aria-label) */
  roundNumber: number;
  /** Total number of rounds (for aria-label) */
  totalRounds: number;
  /** Currently revealed answer (null if not revealed yet) */
  revealedAnswer?: string | null;
  /**
   * Reveal phase for 5-beat choreography (from AnswerRevealScene).
   * When provided, AudienceAnswerOptions enters phase-aware mode.
   */
  revealPhase?: RevealPhase | null;
}

/**
 * Question display for audience/projector view.
 *
 * Hero text uses clamp(3rem, 6.5vw, 8rem) for auditorium-scale projection.
 * Minimum effective size at 1920x1080: ~125px (readable from 30+ feet).
 * Answer options use clamp(1.5rem, 3vw, 3rem) with enlarged badges.
 * All spacing is viewport-relative (vh/vw) for proportional scaling.
 * Motion entrance: springQuestionReveal slides up + fades in.
 * Respects prefers-reduced-motion via useReducedMotion().
 */
export function AudienceQuestion({
  question,
  questionNumber,
  totalQuestions,
  roundNumber,
  totalRounds,
  revealedAnswer,
  revealPhase,
}: AudienceQuestionProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.article
      key={question.text}
      variants={questionReveal}
      initial={shouldReduceMotion ? 'visible' : 'hidden'}
      animate="visible"
      transition={shouldReduceMotion ? { duration: 0 } : springQuestionReveal}
      className="flex flex-col h-full"
      style={{ padding: '2vh 0', gap: '2.5vh' }}
      role="region"
      aria-label={`Question ${questionNumber} of ${totalQuestions}, Round ${roundNumber} of ${totalRounds}`}
    >
      {/* Question text — takes ~55% of vertical space, vertically centered */}
      <section
        className="flex flex-col items-center justify-center"
        style={{ flex: '1.2', padding: '0 4vw' }}
      >
        {/* Hero question text — auditorium scale for 30+ foot readability */}
        <h2
          id="current-question"
          className="font-bold text-foreground text-center leading-tight"
          style={{
            fontSize: 'clamp(3rem, 6.5vw, 8rem)',
            lineHeight: 1.1,
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.02em',
            maxWidth: '90vw',
          }}
        >
          {question.text}
        </h2>
      </section>

      {/* Answer options section — takes ~45% of vertical space */}
      <section
        className="flex-shrink-0 flex justify-center"
        style={{ padding: '0 3vw 1vh 3vw' }}
      >
        <AudienceAnswerOptions
          type={question.type}
          options={question.options}
          optionTexts={question.optionTexts}
          revealedAnswer={revealedAnswer}
          revealPhase={revealPhase}
        />
      </section>
    </motion.article>
  );
}
