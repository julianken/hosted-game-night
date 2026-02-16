'use client';

import { HTMLAttributes, forwardRef } from 'react';

export interface WelcomeHeaderProps extends HTMLAttributes<HTMLElement> {
  /** User's display name */
  userName?: string;
  /** User's email (fallback if no display name) */
  userEmail?: string;
  /** Whether user data is loading */
  isLoading?: boolean;
}

/**
 * WelcomeHeader - Displays a personalized welcome message for authenticated users.
 * Designed for senior users with large, readable text.
 */
export const WelcomeHeader = forwardRef<HTMLElement, WelcomeHeaderProps>(
  ({ userName, userEmail, isLoading = false, className = '', ...props }, ref) => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Good Morning';
      if (hour < 17) return 'Good Afternoon';
      return 'Good Evening';
    };

    const displayName = userName || userEmail?.split('@')[0] || 'Guest';

    return (
      <section
        ref={ref}
        className={`
          py-8 md:py-12 px-6 md:px-8
          bg-gradient-to-r from-primary/10 via-primary/5 to-transparent
          rounded-2xl border border-border
          ${className}
        `.trim()}
        aria-labelledby="welcome-heading"
        {...props}
      >
        <div className="max-w-4xl">
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-10 w-64 bg-muted/30 rounded-lg mb-4" />
              <div className="h-6 w-96 bg-muted/20 rounded-lg" />
            </div>
          ) : (
            <div>
              <h1
                id="welcome-heading"
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3"
              >
                {getGreeting()}, {displayName}!
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Welcome to your Beak Gaming dashboard. Ready to play?
              </p>
            </div>
          )}
        </div>

        {/* Quick Stats Summary */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <QuickStat
            label="Games Played"
            value={isLoading ? '-' : '12'}
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <QuickStat
            label="This Week"
            value={isLoading ? '-' : '3'}
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            }
          />
          <QuickStat
            label="Favorite Game"
            value={isLoading ? '-' : 'Bingo'}
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            }
          />
        </div>
      </section>
    );
  }
);

WelcomeHeader.displayName = 'WelcomeHeader';

interface QuickStatProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function QuickStat({ label, value, icon }: QuickStatProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-background/50 rounded-xl border border-border/50">
      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-base text-muted-foreground">{label}</p>
        <p className="text-xl md:text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
