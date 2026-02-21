'use client';

import { useMemo } from 'react';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import { AudienceQuestion } from '@/components/audience/AudienceQuestion';
import { WaitingDisplay } from '@/components/audience/WaitingDisplay';

/**
 * QuestionReadingScene (T1.9)
 *
 * Shows question text + answer options with NO timer running.
 * Used when the presenter is reading the question aloud before starting the clock.
 *
 * Reads question data from the game store.
 */
export function QuestionReadingScene() {
  const displayQuestionIndex = useGameStore((state) => state.displayQuestionIndex);
  const currentRound = useGameStore((state) => state.currentRound);
  const totalRounds = useGameStore((state) => state.totalRounds);
  const questions = useGameStore((state) => state.questions);
  const settings = useGameStore((state) => state.settings);

  const { displayQuestion } = useGameSelectors();

  // Memoize to avoid creating a new array reference on every render
  // (useGameStore selectors must return stable references)
  const questionsPerRound = useMemo(() => {
    const count = questions.filter((q) => q.roundIndex === currentRound).length;
    return count || settings.questionsPerRound;
  }, [questions, currentRound, settings.questionsPerRound]);

  const questionInRound = displayQuestionIndex !== null
    ? (displayQuestionIndex % Math.max(questionsPerRound, 1)) + 1
    : 1;

  if (!displayQuestion) {
    return <WaitingDisplay message="Get ready..." />;
  }

  return (
    <AudienceQuestion
      question={displayQuestion}
      questionNumber={questionInRound}
      totalQuestions={questionsPerRound}
      roundNumber={currentRound + 1}
      totalRounds={totalRounds}
    />
  );
}
