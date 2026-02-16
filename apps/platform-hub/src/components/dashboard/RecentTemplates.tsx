'use client';

import { HTMLAttributes, forwardRef } from 'react';
import Link from 'next/link';
import type { Template } from '@/app/api/templates/route';

export interface RecentTemplatesProps extends HTMLAttributes<HTMLElement> {
  /** List of recent templates (up to 6: 3 per game) */
  templates?: Template[];
  /** Whether data is loading */
  isLoading?: boolean;
}

const gameConfig = {
  bingo: {
    label: 'Bingo',
    colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    gameUrl: process.env.NEXT_PUBLIC_BINGO_URL || 'http://localhost:3000',
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
    gameUrl: process.env.NEXT_PUBLIC_TRIVIA_URL || 'http://localhost:3001',
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

/**
 * RecentTemplates - Displays recent game templates in a two-column layout.
 * Shows 3 most recent templates per game (Bingo | Trivia).
 * Each template has a "Load" button that redirects to the game with template pre-selected.
 */
export const RecentTemplates = forwardRef<HTMLElement, RecentTemplatesProps>(
  ({ templates = [], isLoading = false, className = '', ...props }, ref) => {
    const formatDate = (date: Date | string): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHours === 0) return 'Just now';
      if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;

      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    };

    const truncateName = (name: string, maxLength: number = 30): string => {
      return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
    };

    const bingoTemplates = templates.filter((t) => t.game === 'bingo').slice(0, 3);
    const triviaTemplates = templates.filter((t) => t.game === 'trivia').slice(0, 3);

    return (
      <section
        ref={ref}
        className={`
          p-6 md:p-8
          bg-background
          rounded-2xl border border-border
          ${className}
        `.trim()}
        aria-labelledby="recent-templates-heading"
        {...props}
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            id="recent-templates-heading"
            className="text-2xl md:text-3xl font-bold text-foreground"
          >
            Recent Templates
          </h2>
          <Link
            href="/dashboard/templates"
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
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(2)].map((_, columnIdx) => (
              <div key={columnIdx} className="space-y-3">
                <div className="h-6 bg-muted/30 rounded w-24 mb-4" />
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse flex items-start gap-3 p-4 rounded-xl bg-muted/10 border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted/30" />
                    <div className="flex-1">
                      <div className="h-4 w-3/4 bg-muted/30 rounded mb-2" />
                      <div className="h-3 w-1/2 bg-muted/20 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bingo Templates Column */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                {gameConfig.bingo.icon}
                Bingo Templates
              </h3>
              {bingoTemplates.length === 0 ? (
                <div className="text-center py-8 px-4 bg-muted/5 rounded-xl border border-border/50">
                  <p className="text-base text-muted-foreground mb-2">
                    No Bingo templates yet
                  </p>
                  <a
                    href={gameConfig.bingo.gameUrl}
                    className="text-base text-primary hover:underline"
                  >
                    Create one in Bingo
                  </a>
                </div>
              ) : (
                <ul className="space-y-3" role="list" aria-label="Recent Bingo templates">
                  {bingoTemplates.map((template) => (
                    <li
                      key={template.id}
                      className="
                        flex items-start gap-3 p-4
                        rounded-xl border border-border/50
                        hover:bg-muted/5 hover:border-border
                        transition-colors duration-150
                      "
                    >
                      {/* Game Icon */}
                      <div
                        className={`
                          flex-shrink-0 w-10 h-10
                          flex items-center justify-center
                          rounded-lg ${gameConfig.bingo.colorClass}
                        `}
                      >
                        {gameConfig.bingo.icon}
                      </div>

                      {/* Template Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-base font-semibold text-foreground">
                            {truncateName(template.name)}
                          </h4>
                        </div>
                        <p className="text-base text-muted-foreground mb-2">
                          {formatDate(template.updated_at)}
                        </p>
                        <a
                          href={`${gameConfig.bingo.gameUrl}/play?template=${template.id}`}
                          className="
                            inline-flex items-center gap-1
                            min-h-[44px] px-3 py-2
                            text-base font-medium text-primary hover:text-primary/80
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded
                            transition-colors duration-150
                          "
                        >
                          Load in Bingo
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
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Trivia Templates Column */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                {gameConfig.trivia.icon}
                Trivia Templates
              </h3>
              {triviaTemplates.length === 0 ? (
                <div className="text-center py-8 px-4 bg-muted/5 rounded-xl border border-border/50">
                  <p className="text-base text-muted-foreground mb-2">
                    No Trivia templates yet
                  </p>
                  <a
                    href={gameConfig.trivia.gameUrl}
                    className="text-base text-primary hover:underline"
                  >
                    Create one in Trivia
                  </a>
                </div>
              ) : (
                <ul className="space-y-3" role="list" aria-label="Recent Trivia templates">
                  {triviaTemplates.map((template) => (
                    <li
                      key={template.id}
                      className="
                        flex items-start gap-3 p-4
                        rounded-xl border border-border/50
                        hover:bg-muted/5 hover:border-border
                        transition-colors duration-150
                      "
                    >
                      {/* Game Icon */}
                      <div
                        className={`
                          flex-shrink-0 w-10 h-10
                          flex items-center justify-center
                          rounded-lg ${gameConfig.trivia.colorClass}
                        `}
                      >
                        {gameConfig.trivia.icon}
                      </div>

                      {/* Template Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-base font-semibold text-foreground">
                            {truncateName(template.name)}
                          </h4>
                        </div>
                        <p className="text-base text-muted-foreground mb-2">
                          {formatDate(template.updated_at)}
                        </p>
                        <a
                          href={`${gameConfig.trivia.gameUrl}/play?template=${template.id}`}
                          className="
                            inline-flex items-center gap-1
                            min-h-[44px] px-3 py-2
                            text-base font-medium text-primary hover:text-primary/80
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded
                            transition-colors duration-150
                          "
                        >
                          Load in Trivia
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
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    );
  }
);

RecentTemplates.displayName = 'RecentTemplates';
