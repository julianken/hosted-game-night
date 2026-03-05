'use client';

import { useGameStore } from '@/stores/game-store';

/**
 * RoundScoringScene
 *
 * Minimal audience display during the `round_scoring` scene.
 * Shows "Scoring in progress..." with round number while the
 * facilitator enters per-team round scores on the presenter view.
 */
export function RoundScoringScene() {
  const currentRound = useGameStore((state) => state.currentRound);
  const teams = useGameStore((state) => state.teams);
  const roundScoringEntries = useGameStore(
    (state) => state.roundScoringEntries,
  );

  const roundNumber = currentRound + 1;
  const enteredCount = Object.keys(roundScoringEntries).length;
  const totalTeams = teams.length;

  return (
    <section
      className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6 w-full"
      role="region"
      aria-label={`Round ${roundNumber} scoring in progress`}
    >
      {/* Title */}
      <h2
        className="font-bold text-foreground text-center"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 5vw, 3.75rem)',
          letterSpacing: '-0.02em',
        }}
      >
        Scoring in Progress
      </h2>

      {/* Subtitle */}
      <p
        className="text-foreground-secondary text-center"
        style={{ fontSize: 'clamp(1rem, 2.5vw, 1.75rem)' }}
      >
        Round {roundNumber} &middot; Collecting Team Scores
      </p>

      {/* Progress bar */}
      {totalTeams > 0 && (
        <div className="w-full max-w-md flex flex-col items-center gap-2">
          <div
            className="w-full rounded-full overflow-hidden"
            style={{
              height: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
            }}
            role="progressbar"
            aria-valuenow={enteredCount}
            aria-valuemin={0}
            aria-valuemax={totalTeams}
            aria-label={`${enteredCount} of ${totalTeams} teams scored`}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${totalTeams > 0 ? (enteredCount / totalTeams) * 100 : 0}%`,
                background: 'var(--primary)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <span
            className="text-foreground-secondary tabular-nums"
            style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)' }}
          >
            {enteredCount}/{totalTeams}
          </span>
        </div>
      )}
    </section>
  );
}
