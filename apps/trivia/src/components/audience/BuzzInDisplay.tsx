'use client';

import type { Team } from '@/types';
import type { BuzzInState } from '@/hooks/use-buzz-in';

// =============================================================================
// TYPES
// =============================================================================

export interface BuzzInDisplayProps {
  /** Current buzz-in state */
  buzzInState: BuzzInState;
  /** All teams in the game */
  teams: Team[];
  /** Team that buzzed first (if any) */
  firstBuzzTeam: Team | null;
  /** Ordered list of teams that buzzed with time deltas */
  buzzOrder: Array<{ team: Team; delta: number }>;
  /** Whether buzz-in mode is active */
  isActive: boolean;
  /** Whether buzz-in is locked (first buzz received) */
  isLocked: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BuzzInDisplay({
  buzzInState,
  teams,
  firstBuzzTeam,
  buzzOrder,
  isActive,
  isLocked,
}: BuzzInDisplayProps) {
  // Don't render anything if buzz-in is not active
  if (!isActive) {
    return null;
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[40vh] p-8"
      role="region"
      aria-label="Buzz-in status"
    >
      {/* Waiting state - no buzz yet */}
      {!firstBuzzTeam && !isLocked && (
        <div
          className="text-center animate-pulse motion-reduce:animate-none"
          role="status"
          aria-live="polite"
        >
          <div className="text-6xl lg:text-8xl font-bold text-primary mb-4">
            BUZZ IN!
          </div>
          <div className="text-2xl lg:text-3xl text-muted-foreground">
            Press your team's number to answer first
          </div>

          {/* Team indicators */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 max-w-4xl">
            {teams.slice(0, 10).map((team, index) => (
              <div
                key={team.id}
                className="flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-lg border border-border"
              >
                <span className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                  {index === 9 ? '0' : index + 1}
                </span>
                <span className="text-lg font-medium">{team.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* First buzz - show winner prominently */}
      {firstBuzzTeam && (
        <div
          className="text-center animate-in zoom-in duration-300 motion-reduce:animate-none"
          role="alert"
          aria-live="assertive"
        >
          {/* Winner announcement */}
          <div className="mb-6">
            <div className="text-3xl lg:text-4xl text-muted-foreground mb-2">
              First to buzz
            </div>
            <div className="text-7xl lg:text-9xl font-black text-primary drop-shadow-lg">
              {firstBuzzTeam.name}
            </div>
          </div>

          {/* Visual flourish */}
          <div className="flex justify-center gap-2 mb-8">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-primary animate-bounce motion-reduce:animate-none"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>

          {/* Buzz order if multiple teams buzzed */}
          {buzzOrder.length > 1 && (
            <div className="mt-8 bg-muted/20 rounded-xl p-6 max-w-2xl mx-auto border border-border">
              <h3 className="text-xl font-semibold text-muted-foreground mb-4">
                Buzz Order
              </h3>
              <div className="space-y-3">
                {buzzOrder.map((entry, index) => (
                  <div
                    key={entry.team.id}
                    className={`
                      flex items-center justify-between p-3 rounded-lg
                      ${
                        index === 0
                          ? 'bg-primary/20 border-2 border-primary'
                          : 'bg-muted/30'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`
                          w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                          ${
                            index === 0
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }
                        `}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={`text-2xl ${
                          index === 0 ? 'font-bold text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {entry.team.name}
                      </span>
                    </div>
                    {index > 0 && (
                      <span className="text-lg text-muted-foreground">
                        +{entry.delta}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Locked state indicator */}
      {isLocked && firstBuzzTeam && (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 rounded-full text-lg">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>Buzz-in locked</span>
          </div>
        </div>
      )}
    </div>
  );
}
