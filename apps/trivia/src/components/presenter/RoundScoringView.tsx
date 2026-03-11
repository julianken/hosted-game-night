'use client';

import { useGameStore } from '@/stores/game-store';
import { getTeamsSortedByScore, getCurrentRoundQuestions } from '@/lib/game/engine';
import type { TriviaGameState } from '@/types';

/**
 * RoundScoringView — center panel component shown during the `round_scoring` scene.
 *
 * Displays:
 * 1. Compact standings (team rankings + scores)
 * 2. Round questions with correct answers (scrollable reference for the presenter)
 *
 * No props — reads directly from useGameStore.
 */
export function RoundScoringView() {
  const teams = useGameStore((s) => s.teams);
  const questions = useGameStore((s) => s.questions);
  const currentRound = useGameStore((s) => s.currentRound);
  const totalRounds = useGameStore((s) => s.totalRounds);
  const status = useGameStore((s) => s.status);
  const settings = useGameStore((s) => s.settings);

  // Build a minimal state object for selectors
  const stateForSelectors: TriviaGameState = {
    status,
    questions,
    selectedQuestionIndex: 0,
    displayQuestionIndex: null,
    currentRound,
    totalRounds,
    teams,
    teamAnswers: [],
    timer: { duration: 0, remaining: 0, isRunning: false },
    settings,
    showScoreboard: false,
    emergencyBlank: false,
    ttsEnabled: false,
    audienceScene: 'round_scoring',
    sceneBeforePause: null,
    sceneTimestamp: 0,
    revealPhase: null,
    scoreDeltas: [],
    recapShowingAnswer: null,
    questionStartScores: {},
    roundScoringEntries: {},
    roundScoringSubmitted: false,
  };

  const teamsSorted = getTeamsSortedByScore(stateForSelectors);
  const roundQuestions = getCurrentRoundQuestions(stateForSelectors);
  const roundNumber = currentRound + 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">
          Round {roundNumber} Scoring
        </h2>
        <span className="text-base text-muted-foreground">
          Round {roundNumber} of {totalRounds}
        </span>
      </div>

      {/* Compact Standings */}
      <section
        className="bg-surface-elevated border border-border rounded-xl p-3"
        role="region"
        aria-label="Current standings"
      >
        <h3 className="text-base font-semibold text-foreground mb-2">
          Standings
        </h3>
        <div className="flex flex-wrap gap-2" role="list" aria-label="Team rankings">
          {teamsSorted.map((team, index) => (
            <div
              key={team.id}
              role="listitem"
              aria-label={`${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} place: ${team.name} with ${team.score} points`}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-base
                ${index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-muted/50'}
              `}
            >
              <span className="font-medium" aria-hidden="true">{index + 1}.</span>
              <span>{team.name}</span>
              <span className="font-bold">{team.score}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Round Questions with Answers */}
      <section
        className="bg-surface-elevated border border-border rounded-xl p-3"
        role="region"
        aria-label={`Round ${roundNumber} questions and answers`}
      >
        <h3 className="text-base font-semibold text-foreground mb-2">
          Questions &amp; Answers
        </h3>
        <div
          className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted"
          role="list"
          aria-label="Questions with correct answers"
        >
          {roundQuestions.map((question, index) => (
            <div
              key={question.id}
              role="listitem"
              className="border border-border rounded-lg p-3 bg-background"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-muted text-muted-foreground">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-base text-foreground font-medium leading-snug">
                    {question.text}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Answer:</span>
                    <span className="text-sm font-semibold text-success">
                      {question.correctAnswers.map((ans) => {
                        // Map letter answers (A, B, C, D) to their option text
                        const optIndex = question.options.indexOf(ans);
                        if (optIndex >= 0 && question.optionTexts[optIndex] !== ans) {
                          return `${ans}: ${question.optionTexts[optIndex]}`;
                        }
                        return ans;
                      }).join(', ')}
                    </span>
                  </div>
                  {question.explanation && (
                    <p className="mt-1 text-sm text-muted-foreground italic">
                      {question.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {roundQuestions.length === 0 && (
            <p className="text-base text-muted-foreground text-center py-4">
              No questions in this round.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
