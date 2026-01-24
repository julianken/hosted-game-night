import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components';

export const metadata: Metadata = {
  title: 'Sign In - Beak Gaming Platform',
  description: 'Sign in to your Beak Gaming Platform account to access Bingo, Trivia, and more games.',
};

// Force dynamic rendering to avoid build-time Supabase initialization
export const dynamic = 'force-dynamic';

/**
 * Login Page - Senior-friendly sign in page.
 *
 * Features:
 * - Large, clear layout
 * - LoginForm component with validation
 * - Easy navigation to signup and password reset
 * - OAuth redirect support (preserves authorization_id parameter)
 */
export default async function LoginPage(props: {
  searchParams: Promise<{ redirect?: string; authorization_id?: string }>;
}) {
  const searchParams = await props.searchParams;

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
            href="mailto:support@beakgaming.com"
            className="text-primary hover:text-primary/80 underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
          >
            Contact Support
          </a>
        </p>
      </div>
    </main>
  );
}
