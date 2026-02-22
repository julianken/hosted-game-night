'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useGameStore } from '@/stores/game-store';
import { heroSceneEnter, heroSceneEnterReduced, EASE } from '@/lib/motion/presets';
import { WaitingDisplay } from '@/components/audience/WaitingDisplay';

/**
 * RecapQAScene (WU-06)
 *
 * Bidirectional Q/A review scene shown during the between-rounds recap flow.
 * The presenter navigates forward (→) and backward (←) through questions,
 * toggling between the question face and answer face for each.
 *
 * Two faces controlled by recapShowingAnswer:
 *   false / null  -> Question face: question text + "→ Show answer" footer
 *   true          -> Answer face: question text + green answer block + "→ Next question" footer
 *
 * Key transitions:
 *   AnimatePresence mode="wait" with key on `recapShowingAnswer`
 *   drives a cross-fade between question face and answer face.
 *
 * Progress indicator: "Round X · Question N of M"
 *
 * Navigation footers:
 *   Question face: "→ Show answer · ← Previous · N Next round"
 *     (hide ← on first question)
 *   Answer face (not last): "→ Next question · ← Back · N Next round"
 *   Answer face (last question): "→ View scores · ← Back · N Next round"
 *
 * Motion: heroSceneEnter on outer container.
 * Reduced motion: heroSceneEnterReduced.
 */
export function RecapQAScene() {
  const shouldReduceMotion = useReducedMotion();

  const currentRound = useGameStore((state) => state.currentRound);
  const totalRounds = useGameStore((state) => state.totalRounds);
  const displayQuestionIndex = useGameStore((state) => state.displayQuestionIndex);
  const recapShowingAnswer = useGameStore((state) => state.recapShowingAnswer);
  const questions = useGameStore((state) => state.questions);

  // Questions belonging to the current round
  const questionsInRound = useMemo(
    () => questions.filter((q) => q.roundIndex === currentRound),
    [questions, currentRound],
  );

  // Current question within the round
  const currentQuestion = useMemo(() => {
    if (displayQuestionIndex === null) return null;
    return questions[displayQuestionIndex] ?? null;
  }, [questions, displayQuestionIndex]);

  // Position of this question within the round (0-based index).
  // findIndex returns -1 when displayQuestionIndex points to a question from
  // a different round (e.g. stale state after a round transition). Clamp to 0
  // so downstream calculations always produce a valid question number.
  const questionIndexInRound = useMemo(() => {
    if (!currentQuestion) return 0;
    return questionsInRound.findIndex((q) => q.id === currentQuestion.id);
  }, [questionsInRound, currentQuestion]);

  const safeQuestionIndex = questionIndexInRound === -1 ? 0 : questionIndexInRound;

  const totalQuestionsInRound = questionsInRound.length;
  const isFirstQuestion = safeQuestionIndex === 0;
  const isLastQuestion = safeQuestionIndex >= totalQuestionsInRound - 1;
  const isAnswerFace = recapShowingAnswer === true;

  const roundNumber = currentRound + 1;
  const questionNumberInRound = safeQuestionIndex + 1;

  const outerVariants = shouldReduceMotion ? heroSceneEnterReduced : heroSceneEnter;
  // Inner flip: fade between question face and answer face
  const faceVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0.1 : 0.18, ease: EASE.entrance },
    },
    exit: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : -6,
      transition: { duration: shouldReduceMotion ? 0.1 : 0.14, ease: EASE.exit },
    },
  };

  if (!currentQuestion) {
    return <WaitingDisplay message="Loading recap..." />;
  }

  const revealedAnswer = currentQuestion.correctAnswers[0] ?? '';

  return (
    <section
      className="flex flex-col items-center h-full min-h-[60vh] gap-6 w-full px-4"
      role="region"
      aria-label={`Round ${roundNumber} recap, question ${questionNumberInRound} of ${totalQuestionsInRound}`}
      aria-live="polite"
    >
      <motion.div
        className="flex flex-col items-center gap-6 w-full max-w-4xl"
        variants={outerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Progress indicator */}
        <div className="text-center">
          <p
            className="font-semibold text-foreground-secondary uppercase tracking-widest"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)',
              letterSpacing: '0.15em',
            }}
          >
            Round {roundNumber} &middot; Question {questionNumberInRound} of {totalQuestionsInRound}
          </p>
        </div>

        {/* Q/A face area — AnimatePresence drives question → answer cross-fade */}
        <AnimatePresence mode="wait" initial={false}>
          {isAnswerFace ? (
            <motion.div
              key="answer"
              className="w-full flex flex-col gap-5"
              variants={faceVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Question text (dimmed on answer face) */}
              <div
                className="w-full rounded-2xl px-8 py-6"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderLeft: '4px solid rgba(126, 82, 228, 0.4)',
                }}
              >
                <p
                  className="text-foreground-secondary"
                  style={{ fontSize: 'clamp(1.125rem, 2vw, 1.75rem)', lineHeight: 1.4 }}
                >
                  {currentQuestion.text}
                </p>
              </div>

              {/* Answer block — green highlighted */}
              <div
                className="w-full rounded-2xl px-8 py-6"
                style={{
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '2px solid rgba(74, 222, 128, 0.45)',
                }}
                role="region"
                aria-label="Correct answer"
              >
                <p
                  className="font-bold"
                  style={{
                    fontSize: 'clamp(0.875rem, 1.3vw, 1.125rem)',
                    color: '#4ade80',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem',
                  }}
                >
                  Correct Answer
                </p>
                <p
                  className="font-bold text-foreground"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                    color: '#4ade80',
                  }}
                >
                  {revealedAnswer}
                </p>
              </div>

              {/* Answer navigation footer */}
              <div
                className="text-center mt-2"
                role="status"
                style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)' }}
              >
                <p className="text-foreground-secondary">
                  {isLastQuestion
                    ? <>&rarr; View scores &middot; &larr; Back &middot; N Next round</>
                    : <>&rarr; Next question &middot; &larr; Back &middot; N Next round</>}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="question"
              className="w-full flex flex-col gap-5"
              variants={faceVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Question text — prominent */}
              <div
                className="w-full rounded-2xl px-8 py-8"
                style={{
                  background: 'rgba(126, 82, 228, 0.06)',
                  border: '2px solid rgba(126, 82, 228, 0.25)',
                }}
              >
                <h2
                  className="font-bold text-foreground"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.5rem, 3.5vw, 3rem)',
                    lineHeight: 1.2,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {currentQuestion.text}
                </h2>
              </div>

              {/* Question navigation footer */}
              <div
                className="text-center mt-2"
                role="status"
                style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)' }}
              >
                <p className="text-foreground-secondary">
                  {isFirstQuestion
                    ? <>&rarr; Show answer &middot; N Next round</>
                    : <>&rarr; Show answer &middot; &larr; Previous &middot; N Next round</>}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
