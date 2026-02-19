'use client';

import { ReactNode, forwardRef, AnchorHTMLAttributes } from 'react';
import { Button, Card } from '@joolie-boolie/ui';

export interface DashboardGameCardProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** Game title */
  title: string;
  /** Brief description of the game */
  description: string;
  /** URL to the game */
  href: string;
  /** Icon or visual element for the game */
  icon: ReactNode;
  /** Last played timestamp */
  lastPlayed?: Date | string | null;
  /** Number of times played */
  timesPlayed?: number;
  /** Background color/style class (kept for backward compat) */
  colorClass?: string;
}

/**
 * DashboardGameCard - A compact card for quick access to games from the dashboard.
 * Uses shared Card component. Dark surface styling with token-based colors.
 * Shows game info with last played status and quick launch button.
 */
export const DashboardGameCard = forwardRef<HTMLAnchorElement, DashboardGameCardProps>(
  (
    {
      title,
      description,
      href,
      icon,
      lastPlayed,
      timesPlayed = 0,
      colorClass: _colorClass,
      className = '',
      ...props
    },
    ref
  ) => {
    const formatLastPlayed = (date: Date | string | null | undefined): string => {
      if (!date) return 'Never played';

      const playedDate = typeof date === 'string' ? new Date(date) : date;
      const now = new Date();
      const diffMs = now.getTime() - playedDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Played today';
      if (diffDays === 1) return 'Played yesterday';
      if (diffDays < 7) return `Played ${diffDays} days ago`;
      if (diffDays < 30) return `Played ${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
      return `Played ${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    };

    return (
      <Card variant="interactive" className={['group', className].filter(Boolean).join(' ')}>
        <div className="p-5 md:p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className="flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-xl"
              style={{
                background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                color: 'var(--primary)',
              }}
              aria-hidden="true"
            >
              {icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3
                className="text-xl md:text-2xl font-bold text-foreground mb-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {title}
              </h3>
              <p className="text-sm text-foreground-secondary mb-3 line-clamp-2 leading-relaxed">
                {description}
              </p>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-secondary">
                <span className="flex items-center gap-1.5">
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
                  {formatLastPlayed(lastPlayed)}
                </span>
                {timesPlayed > 0 && (
                  <span className="flex items-center gap-1.5">
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
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    {timesPlayed} {timesPlayed === 1 ? 'session' : 'sessions'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-5">
            <a
              ref={ref}
              href={href}
              className="block w-full"
              aria-label={`Play ${title}`}
              {...props}
            >
              <Button
                variant="primary"
                size="md"
                className="w-full"
                tabIndex={-1}
              >
                Play Now
                <svg
                  className="ml-2 w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Button>
            </a>
          </div>
        </div>
      </Card>
    );
  }
);

DashboardGameCard.displayName = 'DashboardGameCard';
