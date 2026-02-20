'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { QuestionType } from '@/types';
import type { RevealPhase } from '@/types/audience-scene';
import { answerOptionStagger, answerOption, springAnswerReveal } from '@/lib/motion/presets';

export interface AudienceAnswerOptionsProps {
  /** Question type determines layout */
  type: QuestionType;
  /** Option letters (e.g., ['A', 'B', 'C', 'D']) */
  options: string[];
  /** Human-readable option text for each option */
  optionTexts: string[];
  /** Currently revealed answer (null if not revealed yet) */
  revealedAnswer?: string | null;
  /**
   * Reveal phase for the 5-beat choreography.
   *
   * When provided, renders phase-aware visuals per beat:
   *   - freeze:       all options at full opacity, answer-flash CSS class applied
   *   - dim_wrong:    incorrect options at 32% opacity with saturate(0.2) filter
   *   - illuminate:   correct option glows green (#34D399), scale 1.06x, green box-shadow
   *   - score_update: same as illuminate, scores shown by parent
   *   - breathing:    settled glow pulse at scale 1.03
   *
   * When null/undefined: existing snap reveal behavior preserved (backward compat).
   */
  revealPhase?: RevealPhase | null;
}

/**
 * Answer option colors for audience display.
 * NOTE: These use BRIGHTER values than --trivia-option-a/b/c/d tokens
 * because audience text is always 30px+ (passes 3:1 large text threshold).
 * The darker token values in globals.css are for presenter view only (Issue A-03).
 *
 * Using hex values directly per section 9.9 of FINAL-DESIGN-PLAN.md:
 * "Audience display styles: Must use pre-computed hex values, not oklch(from...),
 * because audience displays may run on older smart TVs with Chrome 80-90 engines."
 */
const optionConfig: Record<string, {
  bg: string;
  bgRevealed: string;
  bgDimmed: string;
  border: string;
  badgeBg: string;
  label: string;
}> = {
  A: {
    bg:         'rgba(59, 130, 246, 0.12)',
    bgRevealed: '#3B82F6',
    bgDimmed:   'rgba(59, 130, 246, 0.04)',
    border:     '#3B82F6',
    badgeBg:    '#3B82F6',
    label:      'A',
  },
  B: {
    bg:         'rgba(239, 68, 68, 0.12)',
    bgRevealed: '#EF4444',
    bgDimmed:   'rgba(239, 68, 68, 0.04)',
    border:     '#EF4444',
    badgeBg:    '#EF4444',
    label:      'B',
  },
  C: {
    bg:         'rgba(16, 185, 129, 0.12)',
    bgRevealed: '#10B981',
    bgDimmed:   'rgba(16, 185, 129, 0.04)',
    border:     '#10B981',
    badgeBg:    '#10B981',
    label:      'C',
  },
  D: {
    bg:         'rgba(245, 158, 11, 0.12)',
    bgRevealed: '#F59E0B',
    bgDimmed:   'rgba(245, 158, 11, 0.04)',
    border:     '#F59E0B',
    badgeBg:    '#F59E0B',
    label:      'D',
  },
};

const defaultConfig = {
  bg:         'rgba(126, 82, 228, 0.12)',
  bgRevealed: '#7E52E4',
  bgDimmed:   'rgba(126, 82, 228, 0.04)',
  border:     '#7E52E4',
  badgeBg:    '#7E52E4',
  label:      '?',
};

/**
 * 2x2 color-coded answer panels for audience/projector view.
 *
 * Layout: A top-left, B top-right, C bottom-left, D bottom-right.
 * Each panel has a 4px left border accent in the option color.
 *
 * Reveal sequence (when revealedAnswer is set):
 *   1. All non-correct options dim to 40% opacity (200ms)
 *   2. Correct answer scales up with green glow (200ms delay from step 1)
 *   3. Incorrect answers get subtle red shift
 *
 * Text sizes ensure minimum 40px effective on 1920x1080.
 */
/**
 * Compute per-option visual state for the phase-aware reveal choreography.
 *
 * revealPhase beats:
 *   freeze:       full opacity, flash CSS class applied to container
 *   dim_wrong:    incorrect at 32% opacity, saturate(0.2) filter
 *   illuminate:   correct glows green (#34D399), scale 1.06x
 *   score_update: same as illuminate (scores shown by parent)
 *   breathing:    settled glow at scale 1.03
 */
function getPhaseStyles(
  isCorrect: boolean,
  revealPhase: RevealPhase | null | undefined,
  shouldReduceMotion: boolean | null,
): {
  opacity: number;
  scale: number;
  filter: string;
  boxShadow: string;
  isCorrectPhaseActive: boolean;
} {
  const noMotion = shouldReduceMotion ?? false;

  // No phase — return neutral state
  if (!revealPhase) {
    return { opacity: 1, scale: 1, filter: 'saturate(1)', boxShadow: 'none', isCorrectPhaseActive: false };
  }

  switch (revealPhase) {
    case 'freeze':
      return { opacity: 1, scale: 1, filter: 'saturate(1)', boxShadow: 'none', isCorrectPhaseActive: false };
    case 'dim_wrong':
      if (isCorrect) {
        return { opacity: 1, scale: 1, filter: 'saturate(1)', boxShadow: 'none', isCorrectPhaseActive: false };
      }
      return {
        opacity: noMotion ? 0.5 : 0.32,
        scale: 1,
        filter: noMotion ? 'saturate(1)' : 'saturate(0.2)',
        boxShadow: 'none',
        isCorrectPhaseActive: false,
      };
    case 'illuminate':
    case 'score_update':
      if (isCorrect) {
        return {
          opacity: 1,
          scale: noMotion ? 1.0 : 1.06,
          filter: 'saturate(1)',
          boxShadow: noMotion ? 'none' : '0 0 28px 8px rgba(52, 211, 153, 0.45)',
          isCorrectPhaseActive: true,
        };
      }
      return {
        opacity: noMotion ? 0.5 : 0.32,
        scale: 1,
        filter: noMotion ? 'saturate(1)' : 'saturate(0.2)',
        boxShadow: 'none',
        isCorrectPhaseActive: false,
      };
    case 'breathing':
      if (isCorrect) {
        return {
          opacity: 1,
          scale: noMotion ? 1.0 : 1.03,
          filter: 'saturate(1)',
          boxShadow: noMotion ? 'none' : '0 0 24px 6px rgba(52, 211, 153, 0.35)',
          isCorrectPhaseActive: true,
        };
      }
      return {
        opacity: noMotion ? 0.5 : 0.32,
        scale: 1,
        filter: noMotion ? 'saturate(1)' : 'saturate(0.2)',
        boxShadow: 'none',
        isCorrectPhaseActive: false,
      };
    default:
      return { opacity: 1, scale: 1, filter: 'saturate(1)', boxShadow: 'none', isCorrectPhaseActive: false };
  }
}

export function AudienceAnswerOptions({
  type,
  options,
  optionTexts,
  revealedAnswer,
  revealPhase,
}: AudienceAnswerOptionsProps) {
  const shouldReduceMotion = useReducedMotion();
  const hasReveal = revealedAnswer !== null && revealedAnswer !== undefined;
  const isMultipleChoice = type === 'multiple_choice';
  const isTrueFalse = type === 'true_false';

  // Determine whether we're in phase-aware mode or legacy snap-reveal mode
  const isPhaseMode = revealPhase !== null && revealPhase !== undefined;

  if (isMultipleChoice) {
    return (
      <motion.div
        className={`grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 w-full max-w-5xl${isPhaseMode && revealPhase === 'freeze' ? ' answer-flash' : ''}`}
        variants={answerOptionStagger}
        initial={shouldReduceMotion ? 'visible' : 'hidden'}
        animate="visible"
        role="list"
        aria-label="Answer options"
      >
        {options.map((option) => {
          const config = optionConfig[option] || defaultConfig;
          const isCorrect = revealedAnswer === option;

          let opacity: number;
          let scale: number;
          let boxShadow: string;
          let bgColor: string;
          let filter: string | undefined;

          if (isPhaseMode) {
            // Phase-aware mode: use 5-beat choreography
            const phaseStyle = getPhaseStyles(isCorrect, revealPhase, shouldReduceMotion);
            opacity = phaseStyle.opacity;
            scale = phaseStyle.scale;
            boxShadow = phaseStyle.boxShadow;
            filter = phaseStyle.filter;
            bgColor = phaseStyle.isCorrectPhaseActive ? '#1a4a3a' : config.bg;
          } else {
            // Legacy snap-reveal mode (backward compat)
            const isIncorrect = hasReveal && !isCorrect;
            bgColor = isCorrect
              ? config.bgRevealed
              : isIncorrect
                ? config.bgDimmed
                : config.bg;
            opacity = isIncorrect && !shouldReduceMotion ? 0.4 : 1;
            scale = isCorrect && !shouldReduceMotion ? 1.03 : 1;
            boxShadow = isCorrect ? '0 0 24px 6px rgba(52, 211, 153, 0.35)' : 'none';
            filter = undefined;
          }

          const isCorrectPhaseActive = isPhaseMode && isCorrect && (
            revealPhase === 'illuminate' || revealPhase === 'score_update' || revealPhase === 'breathing'
          );

          return (
            <motion.div
              key={option}
              variants={answerOption}
              transition={shouldReduceMotion ? { duration: 0 } : springAnswerReveal}
              animate={{
                opacity,
                scale,
                boxShadow,
                filter,
              }}
              role="listitem"
              aria-label={`Option ${option}: ${optionTexts[options.indexOf(option)]}`}
              className="flex items-center gap-4 rounded-xl overflow-hidden"
              style={{
                background: isCorrectPhaseActive ? 'rgba(52, 211, 153, 0.12)' : bgColor,
                borderLeft: `4px solid ${isCorrectPhaseActive ? '#34D399' : config.border}`,
                padding: '20px 24px',
                transition: shouldReduceMotion ? 'none' : 'background 200ms ease, opacity 200ms ease',
                transitionDelay: isCorrect ? '200ms' : '0ms',
              }}
            >
              {/* Option badge */}
              <span
                aria-hidden="true"
                className="flex items-center justify-center rounded-full font-bold flex-shrink-0 text-white"
                style={{
                  background: isCorrect ? 'rgba(255,255,255,0.25)' : config.badgeBg,
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
                {optionTexts[options.indexOf(option)]}
              </span>

              {/* Correct checkmark */}
              {isCorrect && (
                <span className="ml-auto flex-shrink-0" aria-label="Correct answer">
                  <svg
                    className="text-white"
                    style={{ width: '40px', height: '40px' }}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                </span>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    );
  }

  if (isTrueFalse) {
    const isTrue = revealedAnswer === 'True';
    const isFalse = revealedAnswer === 'False';

    return (
      <motion.div
        className="flex flex-col sm:flex-row gap-6 lg:gap-10 justify-center w-full max-w-4xl"
        variants={answerOptionStagger}
        initial={shouldReduceMotion ? 'visible' : 'hidden'}
        animate="visible"
        role="list"
        aria-label="Answer options"
      >
        {/* True option */}
        <motion.div
          role="listitem"
          aria-label="Option: True"
          variants={answerOption}
          transition={shouldReduceMotion ? { duration: 0 } : springAnswerReveal}
          animate={{
            opacity: (hasReveal && !isTrue && !shouldReduceMotion) ? 0.4 : 1,
            scale: (isTrue && !shouldReduceMotion) ? 1.04 : 1,
            boxShadow: isTrue ? '0 0 24px 6px rgba(16, 185, 129, 0.40)' : 'none',
          }}
          className="flex-1 max-w-md rounded-2xl text-center"
          style={{
            background: isTrue ? '#10B981' : 'rgba(16, 185, 129, 0.10)',
            border: `4px solid #10B981`,
            padding: '40px',
          }}
        >
          <span
            className="font-bold block"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.75rem)',
              color: isTrue ? '#ffffff' : '#10B981',
            }}
          >
            TRUE
          </span>
          {isTrue && (
            <svg
              className="mx-auto mt-4 text-white"
              style={{ width: '64px', height: '64px' }}
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          )}
        </motion.div>

        {/* False option */}
        <motion.div
          role="listitem"
          aria-label="Option: False"
          variants={answerOption}
          transition={shouldReduceMotion ? { duration: 0 } : springAnswerReveal}
          animate={{
            opacity: (hasReveal && !isFalse && !shouldReduceMotion) ? 0.4 : 1,
            scale: (isFalse && !shouldReduceMotion) ? 1.04 : 1,
            boxShadow: isFalse ? '0 0 24px 6px rgba(239, 68, 68, 0.40)' : 'none',
          }}
          className="flex-1 max-w-md rounded-2xl text-center"
          style={{
            background: isFalse ? '#EF4444' : 'rgba(239, 68, 68, 0.10)',
            border: `4px solid #EF4444`,
            padding: '40px',
          }}
        >
          <span
            className="font-bold block"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.75rem)',
              color: isFalse ? '#ffffff' : '#EF4444',
            }}
          >
            FALSE
          </span>
          {isFalse && (
            <svg
              className="mx-auto mt-4 text-white"
              style={{ width: '64px', height: '64px' }}
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          )}
        </motion.div>
      </motion.div>
    );
  }

  return null;
}
