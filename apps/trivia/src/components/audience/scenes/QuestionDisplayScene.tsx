'use client';

import { useMemo } from 'react';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import { useFrozenOnExit } from '@/hooks/use-frozen-on-exit';
import { AudienceQuestion } from '@/components/audience/AudienceQuestion';
import { WaitingDisplay } from '@/components/audience/WaitingDisplay';

export interface QuestionDisplaySceneProps {
  /**
   * When true, the timer is running and answers are enabled (was question_active).
   * When false, the question is being read aloud before the clock starts (was question_reading).
   */
  answersEnabled: boolean;
}

/**
 * QuestionDisplayScene (BEA-583)
 *
 * Merged replacement for QuestionReadingScene and QuestionActiveScene.
 * Shows question text + answer options. The `answersEnabled` prop controls
 * whether the timer is running.
 *
 * Reads question data from the game store.
 * Uses useFrozenOnExit to prevent visual glitches during AnimatePresence exit —
 * without it, store updates (e.g. displayQuestionIndex advancing) would cause
 * the exiting component to briefly show the next question's content.
 */
export function QuestionDisplayScene({ answersEnabled: _answersEnabled }: QuestionDisplaySceneProps) {
  const displayQuestionIndex = useGameStore((state) => state.displayQuestionIndex);
  const currentRound = useGameStore((state) => state.currentRound);
  const totalRounds = useGameStore((state) => state.totalRounds);
  const questions = useGameStore((state) => state.questions);
  const settings = useGameStore((state) => state.settings);

  const { displayQuestion } = useGameSelectors();

  // Memoize to avoid creating a new array reference on every render
  const questionsPerRound = useMemo(() => {
    const count = questions.filter((q) => q.roundIndex === currentRound).length;
    return count || settings.questionsPerRound;
  }, [questions, currentRound, settings.questionsPerRound]);

  const questionInRound = displayQuestionIndex !== null
    ? (displayQuestionIndex % Math.max(questionsPerRound, 1)) + 1
    : 1;

  // Freeze all rendered data during exit animation to prevent flash of next question
  const frozenQuestion = useFrozenOnExit(displayQuestion);
  const frozenQuestionInRound = useFrozenOnExit(questionInRound);
  const frozenQuestionsPerRound = useFrozenOnExit(questionsPerRound);
  const frozenCurrentRound = useFrozenOnExit(currentRound);
  const frozenTotalRounds = useFrozenOnExit(totalRounds);

  if (!frozenQuestion) {
    return <WaitingDisplay message="Get ready..." />;
  }

  return (
    <AudienceQuestion
      question={frozenQuestion}
      questionNumber={frozenQuestionInRound}
      totalQuestions={frozenQuestionsPerRound}
      roundNumber={frozenCurrentRound + 1}
      totalRounds={frozenTotalRounds}
    />
  );
}
