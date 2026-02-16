'use client';

import { useCallback } from 'react';
import type { Team } from '@/types';
import type { BuzzInState } from '@/hooks/use-buzz-in';

// =============================================================================
// TYPES
// =============================================================================

export interface BuzzInPanelProps {
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
  /** Whether buzz-in is locked */
  isLocked: boolean;
  /** Activate buzz-in mode */
  onActivate: () => void;
  /** Deactivate buzz-in mode */
  onDeactivate: () => void;
  /** Reset for next question */
  onReset: () => void;
  /** Unlock to allow more buzzes */
  onUnlock: () => void;
  /** Get the keyboard key for a team index */
  getKeyForTeam: (teamIndex: number) => string | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BuzzInPanel({
  teams,
  firstBuzzTeam,
  buzzOrder,
  isActive,
  isLocked,
  onActivate,
  onDeactivate,
  onReset,
  onUnlock,
  getKeyForTeam,
}: BuzzInPanelProps) {
  // Find team index for key display
  const getTeamIndex = useCallback(
    (teamId: string): number => {
      return teams.findIndex((t) => t.id === teamId);
    },
    [teams]
  );

  return (
    <div
      className="space-y-4 p-4 bg-muted/20 rounded-lg border border-border"
      role="region"
      aria-label="Buzz-in controls"
    >
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Fast Answer Mode</h3>
        <button
          onClick={isActive ? onDeactivate : onActivate}
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors
            min-w-[100px] min-h-[44px]
            ${
              isActive
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }
          `}
          aria-pressed={isActive}
        >
          {isActive ? 'Stop' : 'Start'}
        </button>
      </div>

      {/* Status indicator */}
      <div
        className={`
          p-3 rounded-lg text-center font-medium
          ${
            isActive
              ? isLocked
                ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300'
                : 'bg-green-500/20 text-green-700 dark:text-green-300 animate-pulse motion-reduce:animate-none'
              : 'bg-muted text-muted-foreground'
          }
        `}
        role="status"
        aria-live="polite"
      >
        {!isActive && 'Buzz-in inactive'}
        {isActive && !isLocked && !firstBuzzTeam && 'Waiting for buzz...'}
        {isActive && firstBuzzTeam && (
          <span className="flex items-center justify-center gap-2">
            <span className="text-2xl font-bold">{firstBuzzTeam.name}</span>
            <span className="text-base opacity-75">buzzed first!</span>
          </span>
        )}
      </div>

      {/* First buzz highlight */}
      {firstBuzzTeam && (
        <div
          className="p-4 bg-primary/20 border-2 border-primary rounded-lg text-center animate-in zoom-in duration-200 motion-reduce:animate-none"
          role="alert"
          aria-live="assertive"
        >
          <div className="text-base text-muted-foreground mb-1">First to buzz</div>
          <div className="text-3xl font-bold text-primary">
            {firstBuzzTeam.name}
          </div>
          <div className="text-base text-muted-foreground mt-1">
            Key: {getKeyForTeam(getTeamIndex(firstBuzzTeam.id))}
          </div>
        </div>
      )}

      {/* Buzz order list */}
      {buzzOrder.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-base font-medium text-muted-foreground">
            Buzz Order
          </h4>
          <ul className="space-y-1" role="list" aria-label="Teams that buzzed">
            {buzzOrder.map((entry, index) => (
              <li
                key={entry.team.id}
                className={`
                  flex items-center justify-between p-2 rounded
                  ${index === 0 ? 'bg-primary/10' : 'bg-muted/50'}
                `}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-base font-bold
                      ${
                        index === 0
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }
                    `}
                  >
                    {index + 1}
                  </span>
                  <span className={index === 0 ? 'font-semibold' : ''}>
                    {entry.team.name}
                  </span>
                </span>
                {index > 0 && (
                  <span className="text-base text-muted-foreground">
                    +{entry.delta}ms
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Team key assignments */}
      {isActive && (
        <div className="space-y-2">
          <h4 className="text-base font-medium text-muted-foreground">
            Team Keys
          </h4>
          <div className="grid grid-cols-2 gap-2" role="list" aria-label="Team keyboard assignments">
            {teams.slice(0, 10).map((team, index) => {
              const key = getKeyForTeam(index);
              const hasBuzzed = buzzOrder.some((b) => b.team.id === team.id);
              const isFirst = firstBuzzTeam?.id === team.id;

              return (
                <div
                  key={team.id}
                  role="listitem"
                  className={`
                    flex items-center gap-2 p-2 rounded text-base
                    ${
                      isFirst
                        ? 'bg-primary/20 border border-primary'
                        : hasBuzzed
                        ? 'bg-muted/50 opacity-50'
                        : 'bg-background border border-border'
                    }
                  `}
                >
                  <kbd
                    className={`
                      px-2 py-1 rounded font-mono text-base
                      ${
                        isFirst
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }
                    `}
                  >
                    {key}
                  </kbd>
                  <span className={isFirst ? 'font-semibold' : ''}>
                    {team.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {isActive && (
        <div className="flex gap-2">
          <button
            onClick={onReset}
            className="flex-1 px-4 py-2 rounded-lg font-medium bg-muted hover:bg-muted/80 transition-colors min-h-[44px]"
          >
            Reset
          </button>
          {isLocked && firstBuzzTeam && (
            <button
              onClick={onUnlock}
              className="flex-1 px-4 py-2 rounded-lg font-medium bg-muted hover:bg-muted/80 transition-colors min-h-[44px]"
            >
              Allow More
            </button>
          )}
        </div>
      )}

      {/* Help text */}
      <p className="text-base text-muted-foreground text-center">
        Press number keys 1-9 (or 0 for team 10) to buzz in
      </p>
    </div>
  );
}
