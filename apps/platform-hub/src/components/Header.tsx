'use client';

import { HTMLAttributes, forwardRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@joolie-boolie/auth';
import { Button } from '@joolie-boolie/ui';
import { useRouter } from 'next/navigation';

export interface HeaderProps extends HTMLAttributes<HTMLElement> {
  /** Optional logo URL */
  logoUrl?: string;
}

/**
 * Header - Glass-morphism platform header (Phase 3 redesign).
 * Sticky top-0, 64px height, Space Grotesk wordmark, ghost-style nav links.
 * Supports (backdrop-filter: blur) with solid fallback for older browsers.
 */
export const Header = forwardRef<HTMLElement, HeaderProps>(
  ({ logoUrl: _logoUrl, className = '', ...props }, ref) => {
    const { user, signOut, isLoading } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
      try {
        // Call the logout API endpoint to revoke tokens
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });

        // Sign out from auth context
        await signOut();

        // Redirect to home page
        router.push('/');
      } catch (error) {
        console.error('Logout failed:', error);
        // Still attempt to sign out locally even if API call fails
        await signOut();
        router.push('/');
      }
    };

    return (
      <>
        <header
          ref={ref}
          className={[
            'w-full',
            'sticky top-0',
            'h-16',                          /* Compact 64px height */
            'px-4 sm:px-6 md:px-8',
            'border-b border-border-subtle',
            /* Glass-morphism with solid fallback */
            'bg-surface/70 backdrop-blur-md',
            /* z-index from design token: --z-sticky = 30 */
            'z-[30]',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            /* Fallback for browsers that do not support backdrop-filter */
          } as React.CSSProperties}
          role="banner"
          {...props}
        >
          {/* Backdrop-filter fallback via inline style is handled via CSS below;
              Tailwind's backdrop-blur-md emits the necessary @supports guard in modern builds. */}
          <div className="h-full max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
            {/* Wordmark */}
            <Link
              href="/"
              className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg p-1 -m-1 shrink-0"
              aria-label="Joolie Boolie - Home"
            >
              {/* Brand mark — compact violet square */}
              <div
                className="w-8 h-8 flex items-center justify-center bg-primary rounded-lg text-primary-foreground shrink-0"
                aria-hidden="true"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>

              {/* "Joolie Boolie" wordmark in display font (Space Grotesk) */}
              <span
                className="text-xl font-bold text-foreground hidden sm:inline"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Joolie Boolie
              </span>
            </Link>

            {/* Navigation */}
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              {!isLoading && user && (
                <span
                  className="hidden lg:inline text-base font-medium text-foreground-secondary truncate mr-2"
                  data-testid="facility-greeting"
                >
                  Welcome{user.user_metadata?.facility_name ? `, ${user.user_metadata.facility_name}` : ''}
                </span>
              )}

              <nav aria-label="Main navigation">
                <ul className="flex items-center gap-0 sm:gap-1">
                  {/* "Games" link — always visible on desktop, hidden on mobile (bottom tab bar handles it) */}
                  <li className="hidden md:list-item">
                    <Link
                      href="/"
                      className="
                        inline-flex items-center justify-center
                        min-h-[44px] px-4 py-2
                        text-base font-medium text-foreground-secondary
                        hover:text-foreground
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                        rounded-lg
                        transition-colors duration-150
                      "
                    >
                      Games
                    </Link>
                  </li>

                  {/* Authenticated user navigation */}
                  {!isLoading && user && (
                    <>
                      <li className="hidden md:list-item">
                        <Link
                          href="/dashboard"
                          className="
                            inline-flex items-center justify-center
                            min-h-[44px] px-4 py-2
                            text-base font-medium text-foreground-secondary
                            hover:text-foreground
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                            rounded-lg
                            transition-colors duration-150
                          "
                        >
                          Dashboard
                        </Link>
                      </li>
                      <li className="hidden md:list-item">
                        <Link
                          href="/settings"
                          className="
                            inline-flex items-center justify-center
                            min-h-[44px] px-4 py-2
                            text-base font-medium text-foreground-secondary
                            hover:text-foreground
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                            rounded-lg
                            transition-colors duration-150
                          "
                        >
                          Settings
                        </Link>
                      </li>
                      <li>
                        <Button
                          onClick={handleLogout}
                          variant="secondary"
                          size="md"
                          data-testid="logout-button"
                          aria-label="Sign out of your account"
                        >
                          Sign Out
                        </Button>
                      </li>
                    </>
                  )}

                  {/* Unauthenticated user navigation */}
                  {!isLoading && !user && (
                    <li>
                      <Button
                        onClick={() => router.push('/login')}
                        variant="primary"
                        size="md"
                        data-testid="sign-in-button"
                        aria-label="Sign in to your account"
                      >
                        Sign In
                      </Button>
                    </li>
                  )}
                </ul>
              </nav>
            </div>
          </div>
        </header>

        {/* Mobile bottom tab bar (visible below 768px) — Issue 3.4 / UX 7.4 */}
        {!isLoading && user && (
          <nav
            aria-label="Mobile navigation"
            className="
              fixed bottom-0 inset-x-0
              md:hidden
              z-[30]
              border-t border-border-subtle
              bg-surface/90 backdrop-blur-md
            "
          >
            <ul className="flex items-stretch justify-around h-[56px]">
              <li className="flex-1">
                <Link
                  href="/"
                  className="
                    flex flex-col items-center justify-center
                    w-full h-full min-h-[44px] gap-0.5
                    text-xs font-medium text-foreground-secondary
                    hover:text-primary
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                    transition-colors duration-150
                  "
                  aria-label="Games"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Games</span>
                </Link>
              </li>
              <li className="flex-1">
                <Link
                  href="/dashboard"
                  className="
                    flex flex-col items-center justify-center
                    w-full h-full min-h-[44px] gap-0.5
                    text-xs font-medium text-foreground-secondary
                    hover:text-primary
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                    transition-colors duration-150
                  "
                  aria-label="Dashboard"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM13 7a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2V7zM3 17a2 2 0 012-2h4a2 2 0 012 2v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1zM13 17a2 2 0 012-2h4a2 2 0 012 2v1a2 2 0 01-2 2h-4a2 2 0 01-2-2v-1z" />
                  </svg>
                  <span>Dashboard</span>
                </Link>
              </li>
              <li className="flex-1">
                <Link
                  href="/settings"
                  className="
                    flex flex-col items-center justify-center
                    w-full h-full min-h-[44px] gap-0.5
                    text-xs font-medium text-foreground-secondary
                    hover:text-primary
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                    transition-colors duration-150
                  "
                  aria-label="Settings"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Settings</span>
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </>
    );
  }
);

Header.displayName = 'Header';
