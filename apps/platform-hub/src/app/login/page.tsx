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
 * Login Page - Accessible sign in page.
 *
 * Features:
 * - Large, clear layout
 * - LoginForm component with validation
 * - Easy navigation to signup and password reset
 * - OAuth redirect support (preserves authorization_id parameter)
 * - Session expiration messaging (shows when session_expired=true)
 */
export default async function LoginPage(props: {
  searchParams: Promise<{ redirect?: string; authorization_id?: string; session_expired?: string }>;
}) {
  const searchParams = await props.searchParams;
  const sessionExpired = searchParams.session_expired === 'true';

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back to home link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-lg text-muted-foreground hover:text-foreground mb-8 focus:outline-none focus:ring-2 focus:ring-primary rounded px-1"
        >
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Home
        </Link>

        {/* Session expired notification */}
        {sessionExpired && (
          <div
            role="alert"
            className="mb-6 p-5 rounded-xl bg-warning/10 border-2 border-warning text-foreground"
          >
            <div className="flex items-start gap-3">
              <svg
                className="w-7 h-7 mt-0.5 flex-shrink-0 text-warning"
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
                <h2 className="text-xl font-semibold mb-1">
                  Your session has expired
                </h2>
                <p className="text-lg">
                  Please sign in again to continue.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-10">
          {/* Logo */}
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-primary rounded-2xl text-primary-foreground shadow-lg">
            <svg
              className="w-12 h-12"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-3">
            Welcome Back
          </h1>
          <p className="text-xl text-muted-foreground">
            Sign in to access your games
          </p>
        </div>

        {/* Form card */}
        <div className="bg-background border-2 border-border rounded-2xl p-8 shadow-sm">
          <LoginForm
            redirectTo={searchParams.redirect}
            authorizationId={searchParams.authorization_id}
          />
        </div>

        {/* Help text */}
        <p className="text-center text-base text-muted-foreground mt-8">
          Need help?{' '}
          <a
            href="mailto:support@joolieboolie.com"
            className="text-primary hover:text-primary/80 underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
          >
            Contact Support
          </a>
        </p>
      </div>
    </main>
  );
}
