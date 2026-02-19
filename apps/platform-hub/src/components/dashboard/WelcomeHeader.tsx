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
 * WelcomeHeader - Compact welcome bar for the dashboard.
 * Single-row greeting with user name and session stats.
 * Uses design token CSS variables for colors.
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
        className={[
          'py-6 md:py-8 px-6 md:px-8',
          'rounded-xl border',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, var(--surface)) 0%, var(--surface) 100%)',
          borderColor: 'var(--border-subtle)',
        }}
        aria-labelledby="welcome-heading"
        {...props}
      >
        <div className="max-w-4xl">
          {isLoading ? (
            <div className="animate-pulse">
              <div
                className="h-9 w-64 rounded-lg mb-4"
                style={{ background: 'var(--muted)' }}
              />
              <div
                className="h-5 w-80 rounded-lg"
                style={{ background: 'var(--muted)' }}
              />
            </div>
          ) : (
            <div>
              <h1
                id="welcome-heading"
                className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {getGreeting()}, {displayName}
              </h1>
              <p className="text-base text-foreground-secondary">
                Welcome to your Joolie Boolie dashboard. Ready to play?
              </p>
            </div>
          )}
        </div>

        {/* Quick Stats Summary */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <QuickStat
            label="Games Played"
            value={isLoading ? '-' : '12'}
            icon={
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
    <div
      className="flex items-center gap-3 p-3 rounded-lg border"
      style={{
        background: 'color-mix(in srgb, var(--background) 60%, transparent)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div
        className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg"
        style={{
          background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
          color: 'var(--primary)',
        }}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm text-foreground-secondary">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
