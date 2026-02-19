'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { Badge, Card } from '@joolie-boolie/ui';

export type GameType = 'bingo' | 'trivia';

export interface GameSession {
  /** Unique session identifier */
  id: string;
  /** Type of game played */
  gameType: GameType;
  /** Session start time */
  startedAt: Date | string;
  /** Session duration in minutes */
  durationMinutes: number;
  /** Number of participants */
  participants?: number;
  /** Optional session notes/name */
  name?: string;
}

export interface RecentSessionsProps extends HTMLAttributes<HTMLElement> {
  /** List of recent game sessions */
  sessions?: GameSession[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Maximum number of sessions to display */
  maxSessions?: number;
}

const gameConfig: Record<GameType, { label: string; badgeColor: 'info' | 'success'; icon: React.ReactNode }> = {
  bingo: {
    label: 'Bingo',
    badgeColor: 'info',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="5" height="5" rx="1" />
        <rect x="10" y="3" width="5" height="5" rx="1" />
        <rect x="17" y="3" width="5" height="5" rx="1" />
        <rect x="3" y="10" width="5" height="5" rx="1" />
        <circle cx="12.5" cy="12.5" r="3" />
        <rect x="17" y="10" width="5" height="5" rx="1" />
        <rect x="3" y="17" width="5" height="5" rx="1" />
        <rect x="10" y="17" width="5" height="5" rx="1" />
        <rect x="17" y="17" width="5" height="5" rx="1" />
      </svg>
    ),
  },
  trivia: {
    label: 'Trivia',
    badgeColor: 'success',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5"
        aria-hidden="true"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
      </svg>
    ),
  },
};

// Placeholder data for when no sessions exist or auth is not integrated
const placeholderSessions: GameSession[] = [
  {
    id: '1',
    gameType: 'bingo',
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    durationMinutes: 45,
    participants: 24,
    name: 'Afternoon Bingo',
  },
  {
    id: '2',
    gameType: 'trivia',
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 26), // Yesterday
    durationMinutes: 60,
    participants: 32,
    name: 'Movie Trivia',
  },
  {
    id: '3',
    gameType: 'bingo',
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
    durationMinutes: 50,
    participants: 18,
    name: 'Weekend Bingo',
  },
  {
    id: '4',
    gameType: 'trivia',
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 120), // 5 days ago
    durationMinutes: 55,
    participants: 28,
    name: 'History Trivia',
  },
];

/**
 * RecentSessions - Timeline view of recent game sessions.
 * Uses Badge component for game type indicators.
 * Foreground-secondary for timestamps per design plan.
 */
export const RecentSessions = forwardRef<HTMLElement, RecentSessionsProps>(
  (
    { sessions, isLoading = false, maxSessions = 5, className = '', ...props },
    ref
  ) => {
    // Use placeholder data if no sessions provided
    const displaySessions = (sessions || placeholderSessions).slice(0, maxSessions);

    const formatDate = (date: Date | string): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Today - show time
        return `Today at ${d.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })}`;
      }
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;

      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    };

    const formatDuration = (minutes: number): string => {
      if (minutes < 60) return `${minutes} min`;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    return (
      <section
        ref={ref}
        className={['rounded-xl border', className].filter(Boolean).join(' ')}
        style={{ background: 'var(--surface)', borderColor: 'var(--border-subtle)' }}
        aria-labelledby="recent-sessions-heading"
        {...props}
      >
        {/* Section header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <h2
            id="recent-sessions-heading"
            className="text-lg font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Recent Sessions
          </h2>
          <a
            href="/history"
            className="
              inline-flex items-center gap-1.5
              text-sm text-primary hover:text-primary/80
              min-h-[44px] px-3 py-2
              rounded-lg
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
              transition-colors duration-150
            "
          >
            View All
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse flex items-center gap-4 p-3 rounded-lg"
                  style={{ background: 'var(--muted)' }}
                >
                  <div
                    className="w-10 h-10 rounded-lg"
                    style={{ background: 'var(--surface-hover)' }}
                  />
                  <div className="flex-1 space-y-2">
                    <div
                      className="h-4 w-32 rounded"
                      style={{ background: 'var(--surface-hover)' }}
                    />
                    <div
                      className="h-3 w-48 rounded"
                      style={{ background: 'var(--surface-elevated)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : displaySessions.length === 0 ? (
            <div className="text-center py-10">
              <div
                className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full"
                style={{ background: 'var(--muted)' }}
              >
                <svg
                  className="w-7 h-7 text-foreground-secondary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-base text-foreground-secondary">No recent sessions</p>
              <p className="text-sm text-foreground-secondary mt-1">
                Start a game to see your history here
              </p>
            </div>
          ) : (
            <ul className="space-y-2" role="list" aria-label="Recent game sessions">
              {displaySessions.map((session) => {
                const config = gameConfig[session.gameType];
                return (
                  <li
                    key={session.id}
                    className="flex items-center gap-3 p-3 rounded-lg border transition-colors duration-150"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    {/* Game icon */}
                    <div
                      className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg"
                      style={{
                        background: session.gameType === 'bingo'
                          ? 'color-mix(in srgb, var(--game-bingo) 15%, transparent)'
                          : 'color-mix(in srgb, var(--game-trivia) 15%, transparent)',
                        color: session.gameType === 'bingo'
                          ? 'var(--game-bingo)'
                          : 'var(--game-trivia)',
                      }}
                    >
                      {config.icon}
                    </div>

                    {/* Session info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-base font-semibold text-foreground truncate">
                          {session.name || config.label}
                        </span>
                        {/* Badge for game type — Issue 4.8 */}
                        <Badge
                          color={config.badgeColor}
                          badgeStyle="outline"
                          size="sm"
                        >
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-foreground-secondary">
                        <span>{formatDate(session.startedAt)}</span>
                        <span>{formatDuration(session.durationMinutes)}</span>
                        {session.participants && (
                          <span>{session.participants} players</span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-foreground-secondary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    );
  }
);

RecentSessions.displayName = 'RecentSessions';
