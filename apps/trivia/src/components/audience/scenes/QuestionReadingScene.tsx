'use client';

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
 * Timer is passed but should not be visible (timerVisible=false).
 */
export function QuestionReadingScene() {
  const displayQuestionIndex = useGameStore((state) => state.displayQuestionIndex);
  const currentRound = useGameStore((state) => state.currentRound);
  const totalRounds = useGameStore((state) => state.totalRounds);
  const settings = useGameStore((state) => state.settings);
  const timer = useGameStore((state) => state.timer);

  const { displayQuestion } = useGameSelectors();

  const questionsInRound = useGameStore((state) =>
    state.questions.filter((q) => q.roundIndex === state.currentRound)
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
      timer={timer}
      timerVisible={false}
    />
  );
}
