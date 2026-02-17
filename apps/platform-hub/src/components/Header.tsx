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
 * Header - Platform header with branding.
 * Simple, clean header designed for users.
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
      <header
        ref={ref}
        className={`
          w-full py-4 sm:py-6 px-4 sm:px-6 md:px-8
          border-b border-border
          bg-background/80 backdrop-blur-sm
          ${className}
        `.trim()}
        role="banner"
        {...props}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo and Brand */}
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50 rounded-lg p-2 -m-2 shrink-0"
            aria-label="Joolie Boolie - Home"
          >
            {/* Joolie Boolie Logo - Simple bird icon */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-primary rounded-xl text-primary-foreground">
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <div>
              <span className="text-lg sm:text-2xl font-bold text-foreground">
                Joolie Boolie
              </span>
              <span className="hidden sm:block text-base text-muted-foreground">
                Fun for Everyone
              </span>
            </div>
          </Link>

          {/* Greeting + Navigation */}
          <div className="flex items-center gap-2 sm:gap-6 min-w-0">
            {!isLoading && user && (
              <span
                className="hidden md:inline text-lg font-medium text-foreground truncate"
                data-testid="facility-greeting"
              >
                Welcome{user.user_metadata?.facility_name ? `, ${user.user_metadata.facility_name}` : ''}
              </span>
            )}

          <nav aria-label="Main navigation">
            <ul className="flex items-center gap-1 sm:gap-4">
              <li>
                <Link
                  href="/"
                  className="
                    inline-flex items-center justify-center
                    min-h-[44px] px-3 sm:px-6 py-2
                    text-base sm:text-lg font-medium text-foreground
                    hover:text-primary
                    focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50
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
                  <li className="hidden sm:list-item">
                    <Link
                      href="/dashboard"
                      className="
                        inline-flex items-center justify-center
                        min-h-[44px] px-3 sm:px-6 py-2
                        text-base sm:text-lg font-medium text-foreground
                        hover:text-primary
                        focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50
                        rounded-lg
                        transition-colors duration-150
                      "
                    >
                      Dashboard
                    </Link>
                  </li>
                  <li className="hidden sm:list-item">
                    <Link
                      href="/settings"
                      className="
                        inline-flex items-center justify-center
                        min-h-[44px] px-3 sm:px-6 py-2
                        text-base sm:text-lg font-medium text-foreground
                        hover:text-primary
                        focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50
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
    );
  }
);

Header.displayName = 'Header';
