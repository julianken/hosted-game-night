'use client';

import { useGameStore, useGameSelectors } from '@/stores/game-store';
import { AudienceQuestion } from '@/components/audience/AudienceQuestion';
import { WaitingDisplay } from '@/components/audience/WaitingDisplay';
import type { RevealPhase } from '@/types/audience-scene';

/**
 * AnswerRevealScene (T1.9)
 *
 * The 5-beat reveal choreography scene for instant mode.
 *
 * Reads revealPhase from the game store and passes it to AudienceAnswerOptions
 * (via AudienceQuestion) to drive phase-aware visuals:
 *
 *   Beat 1 - freeze:       Tension pause, all options at full opacity
 *   Beat 2 - dim_wrong:    Incorrect options dim to 32% opacity
 *   Beat 3 - illuminate:   Correct option glows green, scale 1.06x
 *   Beat 4 - score_update: Scores shown by parent overlay
 *   Beat 5 - breathing:    Settled glow pulse at scale 1.03
 *
 * The revealedAnswer is derived from the question's correctAnswers.
 * Timer is not shown (question is closed).
 */
export function AnswerRevealScene() {
  const displayQuestionIndex = useGameStore((state) => state.displayQuestionIndex);
  const currentRound = useGameStore((state) => state.currentRound);
  const totalRounds = useGameStore((state) => state.totalRounds);
  const settings = useGameStore((state) => state.settings);
  const revealPhase = useGameStore((state) => state.revealPhase) as RevealPhase | null;
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
    return <WaitingDisplay message="Revealing answer..." />;
  }

  // For the reveal, we use the first correct answer as the revealed answer.
  // This works for both multiple_choice and true_false.
  const revealedAnswer = displayQuestion.correctAnswers[0] ?? null;

  return (
    <AudienceQuestion
      question={displayQuestion}
      questionNumber={questionInRound}
      totalQuestions={questionsPerRound}
      roundNumber={currentRound + 1}
      totalRounds={totalRounds}
      timer={timer}
      timerVisible={false}
      revealedAnswer={revealedAnswer}
      revealPhase={revealPhase}
    />
  );
}
