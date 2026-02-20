'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useGameStore } from '@/stores/game-store';
import type { RevealPhase } from '@/types/audience-scene';
import { REVEAL_TIMING } from '@/types/audience-scene';
import {
  answerOptionStagger,
  answerOption,
  springPlayful,
  questionReveal,
  springQuestionReveal,
  teamCountLine,
} from '@/lib/motion/presets';

/**
 * RoundRevealAnswerScene (T2.5.4)
 *
 * 5-beat ceremony reveal within the batch reveal ceremony.
 * Uses compressed timing from REVEAL_TIMING (same as AnswerRevealScene).
 *
 * Reveal choreography (runs from mount via useEffect + setTimeout chain):
 *   0ms:    freeze — all options full opacity
 *   300ms:  dim_wrong — incorrect options dim (opacity 0.32, saturate 0.2)
 *   600ms:  illuminate — correct option glows green, scale 1.06x
 *   800ms:  score_update — team count visible
 *   1100ms: POST_REVEAL_LOCK expires (presenter can advance)
 *   1200ms: breathing — glow settles
 *
 * Also shows:
 * - "Question X of Y" header
 * - Question text
 * - All answer options with reveal choreography
 * - Explanation text (if exists, fades in at ~900ms)
 * - Team count: "X of Y teams got this right" (at ~1200ms)
 *
 * The revealPhase is synced to the store via setRevealPhase for audience reconnect.
 * Pressing Right Arrow advances (after 1.1s lock), Left Arrow retreats.
 *
 * When revealCeremonyAnswerShown is already true on mount (e.g., after retreat),
 * the component skips the animation and renders in settled "breathing" state.
 */
export function RoundRevealAnswerScene() {
  const shouldReduceMotion = useReducedMotion();

  const revealCeremonyResults = useGameStore((state) => state.revealCeremonyResults);
  const revealCeremonyQuestionIndex = useGameStore(
    (state) => state.revealCeremonyQuestionIndex
  );
  const revealCeremonyAnswerShown = useGameStore(
    (state) => state.revealCeremonyAnswerShown
  );
  const setRevealPhase = useGameStore((state) => state.setRevealPhase);

  const ceremonyQuestion = revealCeremonyResults && revealCeremonyQuestionIndex !== null
    ? (revealCeremonyResults.questions[revealCeremonyQuestionIndex] ?? null)
    : null;

  const totalQuestions = revealCeremonyResults?.questions.length ?? 0;
  const currentQuestionNumber = (revealCeremonyQuestionIndex ?? 0) + 1;

  // Local reveal phase state (drives visual render)
  // If answer was already shown (retreat case), start in breathing settled state
  const [localRevealPhase, setLocalRevealPhase] = useState<RevealPhase>(
    revealCeremonyAnswerShown ? 'breathing' : null
  );

  // Track whether we've already started the sequence on this mount
  const hasStartedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  useEffect(() => {
    // If already shown (retreat to settled state), skip animation
    if (revealCeremonyAnswerShown && !hasStartedRef.current) {
      setLocalRevealPhase('breathing');
      setRevealPhase('breathing');
      return;
    }

    // Only start the animation sequence once per mount, and only if not settled
    if (hasStartedRef.current || revealCeremonyAnswerShown) return;
    hasStartedRef.current = true;

    const schedule = (ms: number, fn: () => void) => {
      const id = setTimeout(fn, ms);
      timeoutsRef.current.push(id);
    };

    // Beat 1: freeze (immediate)
    setLocalRevealPhase('freeze');
    setRevealPhase('freeze');

    // Beat 2: dim wrong (300ms)
    schedule(REVEAL_TIMING.DIM_WRONG_START_MS, () => {
      setLocalRevealPhase('dim_wrong');
      setRevealPhase('dim_wrong');
    });

    // Beat 3: illuminate correct (600ms)
    schedule(REVEAL_TIMING.ILLUMINATE_START_MS, () => {
      setLocalRevealPhase('illuminate');
      setRevealPhase('illuminate');
    });

    // Beat 4: score_update visible (800ms)
    schedule(REVEAL_TIMING.SCORE_UPDATE_START_MS, () => {
      setLocalRevealPhase('score_update');
      setRevealPhase('score_update');
    });

    // POST_REVEAL_LOCK expires (1100ms) — keyboard handler unblocks via store subscription
    // The store's REVEAL_LOCK_SCENES subscription in useGameKeyboard handles this.

    // Beat 5: breathing (1200ms) — settled glow
    schedule(REVEAL_TIMING.BREATHING_START_MS, () => {
      setLocalRevealPhase('breathing');
      setRevealPhase('breathing');
    });

    return clearAllTimeouts;
  }, []); // Run only on mount — single lifecycle, intentionally empty deps array

  if (!ceremonyQuestion) {
    return (
      <section
        className="flex items-center justify-center h-full"
        role="region"
        aria-label="Loading answer reveal"
      >
        <p className="text-foreground-secondary" style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}>
          Loading...
        </p>
      </section>
    );
  }

  const {
    questionText,
    options,
    optionTexts,
    correctOptionIndex,
    explanation,
    teamsCorrect,
    teamsTotal,
  } = ceremonyQuestion;

  const correctOption = options[correctOptionIndex] ?? options[0];

  // Compute per-option visual state from reveal phase
  function getPhaseStyle(isCorrect: boolean) {
    const phase = localRevealPhase;
    if (!phase) {
      return { opacity: 1, scale: 1, filter: 'saturate(1)', boxShadow: 'none', isActive: false };
    }
    switch (phase) {
      case 'freeze':
        return { opacity: 1, scale: 1, filter: 'saturate(1)', boxShadow: 'none', isActive: false };
      case 'dim_wrong':
        return isCorrect
          ? { opacity: 1, scale: 1, filter: 'saturate(1)', boxShadow: 'none', isActive: false }
          : {
              opacity: shouldReduceMotion ? 0.5 : 0.32,
              scale: 1,
              filter: shouldReduceMotion ? 'saturate(1)' : 'saturate(0.2)',
              boxShadow: 'none',
              isActive: false,
            };
      case 'illuminate':
      case 'score_update':
        return isCorrect
          ? {
              opacity: 1,
              scale: shouldReduceMotion ? 1.0 : 1.06,
              filter: 'saturate(1)',
              boxShadow: shouldReduceMotion ? 'none' : '0 0 28px 8px rgba(52, 211, 153, 0.45)',
              isActive: true,
            }
          : {
              opacity: shouldReduceMotion ? 0.5 : 0.32,
              scale: 1,
              filter: shouldReduceMotion ? 'saturate(1)' : 'saturate(0.2)',
              boxShadow: 'none',
              isActive: false,
            };
      case 'breathing':
        return isCorrect
          ? {
              opacity: 1,
              scale: shouldReduceMotion ? 1.0 : 1.03,
              filter: 'saturate(1)',
              boxShadow: shouldReduceMotion ? 'none' : '0 0 24px 6px rgba(52, 211, 153, 0.35)',
              isActive: true,
            }
          : {
              opacity: shouldReduceMotion ? 0.5 : 0.32,
              scale: 1,
              filter: shouldReduceMotion ? 'saturate(1)' : 'saturate(0.2)',
              boxShadow: 'none',
              isActive: false,
            };
      default:
        return { opacity: 1, scale: 1, filter: 'saturate(1)', boxShadow: 'none', isActive: false };
    }
  }

  // Option color config
  const optionColors: Record<string, { bg: string; border: string; badgeBg: string }> = {
    A: { bg: 'rgba(59, 130, 246, 0.12)',  border: '#3B82F6', badgeBg: '#3B82F6' },
    B: { bg: 'rgba(239, 68, 68, 0.12)',   border: '#EF4444', badgeBg: '#EF4444' },
    C: { bg: 'rgba(16, 185, 129, 0.12)',  border: '#10B981', badgeBg: '#10B981' },
    D: { bg: 'rgba(245, 158, 11, 0.12)',  border: '#F59E0B', badgeBg: '#F59E0B' },
  };
  const defaultOptionColor = { bg: 'rgba(126, 82, 228, 0.12)', border: '#7E52E4', badgeBg: '#7E52E4' };

  // Team count is shown during score_update and breathing phases
  const showTeamCount = (
    localRevealPhase === 'score_update' ||
    localRevealPhase === 'breathing'
  );

  // Explanation is shown at ~900ms (after illuminate starts at 600ms + delay)
  const showExplanation = (
    localRevealPhase === 'illuminate' ||
    localRevealPhase === 'score_update' ||
    localRevealPhase === 'breathing'
  );

  return (
    <article
      className="flex flex-col h-full min-h-[80vh] py-4 gap-6"
      role="region"
      aria-label={`Ceremony answer reveal: question ${currentQuestionNumber} of ${totalQuestions}`}
    >
      {/* Header: Question X of Y */}
      <header className="flex items-center justify-center px-4">
        <div
          className="px-6 py-2 rounded-full border"
          style={{
            borderColor: 'rgba(52, 211, 153, 0.4)',
            background: 'rgba(52, 211, 153, 0.08)',
          }}
        >
          <span
            className="font-bold"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1rem, 2vw, 1.5rem)',
              color: 'rgba(52, 211, 153, 0.9)',
              letterSpacing: '0.05em',
            }}
          >
            Question {currentQuestionNumber} of {totalQuestions}
          </span>
        </div>
      </header>

      {/* Question text */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 lg:px-8 gap-4">
        <motion.h2
          className="font-bold text-foreground text-center leading-tight max-w-6xl"
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 5rem)',
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

        {/* Explanation text (appears after illuminate beat at ~900ms) */}
        {explanation && showExplanation && (
          <motion.div
            className="max-w-3xl text-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.30,
              ease: [0.22, 1, 0.36, 1],
              delay: shouldReduceMotion ? 0 : 0.30,
            }}
          >
            <p
              className="text-foreground-secondary italic"
              style={{ fontSize: 'clamp(1rem, 1.8vw, 1.5rem)', lineHeight: 1.5 }}
            >
              {explanation}
            </p>
          </motion.div>
        )}
      </section>

      {/* Answer options — phase-aware reveal */}
      <section className="px-4 lg:px-8">
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
              const isCorrect = option === correctOption;
              const config = optionColors[option] ?? defaultOptionColor;
              const text = optionTexts[index] ?? '';
              const phaseStyle = getPhaseStyle(isCorrect);

              return (
                <motion.div
                  key={option}
                  variants={answerOption}
                  transition={shouldReduceMotion ? { duration: 0 } : { ...springPlayful, delay: index * 0.04 }}
                  animate={{
                    opacity: phaseStyle.opacity,
                    scale: phaseStyle.scale,
                    boxShadow: phaseStyle.boxShadow,
                    filter: phaseStyle.filter,
                  }}
                  role="listitem"
                  aria-label={`Option ${option}: ${text}${isCorrect ? ' — Correct answer' : ''}`}
                  className="flex items-center gap-4 rounded-xl overflow-hidden"
                  style={{
                    background: phaseStyle.isActive ? 'rgba(52, 211, 153, 0.12)' : config.bg,
                    borderLeft: `4px solid ${phaseStyle.isActive ? '#34D399' : config.border}`,
                    padding: '20px 24px',
                    transition: shouldReduceMotion
                      ? 'none'
                      : 'background 250ms ease, border-color 250ms ease',
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
                    {text}
                  </span>

                  {/* Correct answer checkmark — appears at illuminate phase */}
                  {isCorrect && phaseStyle.isActive && (
                    <span className="ml-auto flex-shrink-0" aria-label="Correct answer">
                      <motion.svg
                        className="text-white"
                        style={{ width: '40px', height: '40px' }}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={
                          shouldReduceMotion
                            ? { duration: 0.10 }
                            : { ...springPlayful }
                        }
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </motion.svg>
                    </span>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Team count — fades in at score_update / breathing phase */}
      <div className="text-center pb-2" aria-live="polite">
        {showTeamCount && (
          <motion.p
            className="font-semibold"
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.5rem)',
              color: 'rgba(52, 211, 153, 0.9)',
            }}
            variants={teamCountLine}
            initial="hidden"
            animate="visible"
          >
            {teamsCorrect} of {teamsTotal} team{teamsTotal !== 1 ? 's' : ''} got this right
          </motion.p>
        )}
        {!showTeamCount && (
          <p
            className="text-foreground-secondary"
            style={{ fontSize: 'clamp(0.75rem, 1.2vw, 1rem)', opacity: 0.5 }}
          >
            &nbsp;
          </p>
        )}
      </div>
    </article>
  );
}
