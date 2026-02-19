import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components';

export const metadata: Metadata = {
  title: 'Sign In - Joolie Boolie',
  description: 'Sign in to your Joolie Boolie account to access Bingo, Trivia, and more games.',
};

// Force dynamic rendering to avoid build-time Supabase initialization
export const dynamic = 'force-dynamic';

/**
 * Resolve a back-link based on the redirect param (UX addition 7.6 / Issue 2.1).
 * - redirect contains "bingo"  -> "Back to Bingo"
 * - redirect contains "trivia" -> "Back to Trivia"
 * - otherwise                  -> "Back to games" -> /
 */
function resolveBackLink(redirect?: string): { label: string; href: string } {
  if (redirect) {
    if (redirect.includes('bingo')) {
      return {
        label: 'Back to Bingo',
        href: process.env.NEXT_PUBLIC_BINGO_URL || '/',
      };
    }
    if (redirect.includes('trivia')) {
      return {
        label: 'Back to Trivia',
        href: process.env.NEXT_PUBLIC_TRIVIA_URL || '/',
      };
    }
  }
  return { label: 'Back to games', href: '/' };
}

/**
 * Login Page — Two-column split layout.
 *
 * Desktop: Left column = login form. Right column = brand panel.
 * Mobile:  Single column, brand panel hidden.
 *
 * Features:
 * - Conditional back link based on redirect param (Issue 2.1)
 * - Session expiration messaging
 * - OAuth redirect support (preserves authorization_id parameter)
 */
export default async function LoginPage(props: {
  searchParams: Promise<{ redirect?: string; authorization_id?: string; session_expired?: string }>;
}) {
  const searchParams = await props.searchParams;
  const sessionExpired = searchParams.session_expired === 'true';
  const backLink = resolveBackLink(searchParams.redirect);

  return (
    <main className="flex-1 flex flex-col md:flex-row min-h-0 pb-14 md:pb-0">
      {/* ================================================================
          Left column — login form
          ================================================================ */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12 md:py-16 order-2 md:order-1">
        <div className="w-full max-w-md">
          {/* Back link — conditional per redirect param */}
          <Link
            href={backLink.href}
            className="inline-flex items-center gap-2 text-base text-foreground-secondary hover:text-foreground mb-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded px-1 transition-colors duration-150"
          >
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            {backLink.label}
          </Link>

          {/* Session expired notification */}
          {sessionExpired && (
            <div
              role="alert"
              className="mb-6 p-5 rounded-xl border-l-4 text-foreground"
              style={{
                background: 'color-mix(in srgb, var(--warning) 10%, transparent)',
                borderColor: 'var(--warning)',
              }}
            >
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--warning)' }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h2 className="text-lg font-semibold mb-1">
                    Your session has expired
                  </h2>
                  <p className="text-base text-foreground-secondary">
                    Please sign in again to continue.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form header */}
          <div className="mb-8">
            <h1
              className="text-3xl font-bold text-foreground mb-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Welcome Back
            </h1>
            <p className="text-base text-foreground-secondary">
              Sign in to access your games
            </p>
          </div>

          {/* Form card */}
          <div
            className="rounded-xl border p-6 sm:p-8"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <LoginForm
              redirectTo={searchParams.redirect}
              authorizationId={searchParams.authorization_id}
            />
          </div>

          {/* Help text */}
          <p className="text-center text-sm text-foreground-secondary mt-6">
            Need help?{' '}
            <a
              href="mailto:support@joolieboolie.com"
              className="text-primary hover:text-primary/80 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded transition-colors duration-150"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>

      {/* ================================================================
          Right column — brand panel (hidden on mobile)
          Desktop only: dark surface with wordmark and messaging
          ================================================================ */}
      <div
        className="hidden md:flex md:w-[45%] lg:w-[40%] flex-col items-center justify-center px-8 py-16 order-1 md:order-2 relative overflow-hidden"
        style={{ background: 'var(--surface)' }}
        aria-hidden="true"
      >
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 30%, color-mix(in srgb, var(--primary) 10%, transparent) 0%, transparent 100%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 text-center max-w-xs">
          {/* Brand mark */}
          <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-primary rounded-2xl text-primary-foreground shadow-lg">
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>

          {/* Wordmark */}
          <p
            className="text-3xl font-bold text-foreground mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Joolie Boolie
          </p>

          <p className="text-base text-foreground-secondary mb-10 leading-relaxed">
            Fun, accessible games designed for groups and communities.
          </p>

          {/* Feature list */}
          <ul className="space-y-3 text-left">
            {[
              'Bingo with automatic ball calling',
              'Team-based trivia with scoring',
              'Dual-screen display for projectors',
              'Works on tablets and touch screens',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-base text-foreground-secondary">
                <svg className="w-4 h-4 text-success shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
