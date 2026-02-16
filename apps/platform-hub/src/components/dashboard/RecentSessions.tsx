'use client';

import { HTMLAttributes, forwardRef } from 'react';

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

const gameConfig: Record<GameType, { label: string; colorClass: string; icon: React.ReactNode }> = {
  bingo: {
    label: 'Bingo',
    colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
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
    colorClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
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
    name: 'Movie Trivia Night',
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
 * RecentSessions - Displays a list of recent game sessions.
 * Shows game type, when it was played, duration, and participant count.
 * Designed for senior users with clear visual hierarchy and readable text.
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
        className={`
          p-6 md:p-8
          bg-background
          rounded-2xl border border-border
          ${className}
        `.trim()}
        aria-labelledby="recent-sessions-heading"
        {...props}
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            id="recent-sessions-heading"
            className="text-2xl md:text-3xl font-bold text-foreground"
          >
            Recent Sessions
          </h2>
          <a
            href="/history"
            className="
              inline-flex items-center gap-2
              text-lg text-primary hover:text-primary/80
              min-h-[44px] px-4 py-2
              rounded-lg
              focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50
              transition-colors duration-150
            "
          >
            View All
            <svg
              className="w-5 h-5"
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

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-xl bg-muted/10">
                <div className="w-12 h-12 rounded-lg bg-muted/30" />
                <div className="flex-1">
                  <div className="h-5 w-32 bg-muted/30 rounded mb-2" />
                  <div className="h-4 w-48 bg-muted/20 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : displaySessions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-muted/10">
              <svg
                className="w-8 h-8 text-muted"
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
            <p className="text-xl text-muted-foreground">No recent sessions</p>
            <p className="text-base text-muted-foreground mt-1">
              Start a game to see your history here
            </p>
          </div>
        ) : (
          <ul className="space-y-3" role="list" aria-label="Recent game sessions">
            {displaySessions.map((session) => {
              const config = gameConfig[session.gameType];
              return (
                <li
                  key={session.id}
                  className="
                    flex items-center gap-4 p-4
                    rounded-xl border border-border/50
                    hover:bg-muted/5 hover:border-border
                    transition-colors duration-150
                  "
                >
                  {/* Game Icon */}
                  <div
                    className={`
                      flex-shrink-0 w-12 h-12 md:w-14 md:h-14
                      flex items-center justify-center
                      rounded-lg ${config.colorClass}
                    `}
                  >
                    {config.icon}
                  </div>

                  {/* Session Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg md:text-xl font-semibold text-foreground truncate">
                        {session.name || config.label}
                      </span>
                      <span
                        className={`
                          inline-flex items-center px-2.5 py-0.5
                          text-base font-medium rounded-full
                          ${config.colorClass}
                        `}
                      >
                        {config.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-muted-foreground">
                      <span>{formatDate(session.startedAt)}</span>
                      <span className="flex items-center gap-1">
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
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {formatDuration(session.durationMinutes)}
                      </span>
                      {session.participants && (
                        <span className="flex items-center gap-1">
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
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                          {session.participants} players
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Arrow */}
                  <div className="flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-muted-foreground"
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
      </section>
    );
  }
);

RecentSessions.displayName = 'RecentSessions';
