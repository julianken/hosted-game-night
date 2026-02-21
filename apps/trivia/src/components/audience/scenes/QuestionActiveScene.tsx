'use client';

import { useMemo } from 'react';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import { AudienceQuestion } from '@/components/audience/AudienceQuestion';
import { WaitingDisplay } from '@/components/audience/WaitingDisplay';

/**
 * QuestionActiveScene (T1.9)
 *
 * Shows question text + answer options while the timer is running.
 * Timer display is handled separately by the scene layer, not by AudienceQuestion.
 *
 * Reads question data from the game store.
 */
export function QuestionActiveScene() {
  const displayQuestionIndex = useGameStore((state) => state.displayQuestionIndex);
  const currentRound = useGameStore((state) => state.currentRound);
  const totalRounds = useGameStore((state) => state.totalRounds);
  const settings = useGameStore((state) => state.settings);

  const { displayQuestion } = useGameSelectors();

  const questions = useGameStore((state) => state.questions);
  const questionsInRound = useMemo(
    () => questions.filter((q) => q.roundIndex === currentRound),
    [questions, currentRound],
  );
  const questionsPerRound = questionsInRound.length || settings.questionsPerRound;

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
