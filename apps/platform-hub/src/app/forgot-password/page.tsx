import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components';

export const metadata: Metadata = {
  title: 'Reset Password - Beak Gaming Platform',
  description: 'Reset your Beak Gaming Platform password to regain access to your account.',
};

// Force dynamic rendering to avoid build-time Supabase initialization
export const dynamic = 'force-dynamic';

/**
 * Forgot Password Page - Senior-friendly password reset page.
 *
 * Features:
 * - Large, clear layout
 * - ForgotPasswordForm component with validation
 * - Clear instructions and success feedback
 * - Easy navigation back to login
 */
export default function ForgotPasswordPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back to login link */}
        <Link
          href="/login"
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
          Back to Sign In
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          {/* Lock icon */}
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-primary/10 rounded-2xl text-primary">
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-3">
            Reset Password
          </h1>
          <p className="text-xl text-muted-foreground">
            We&apos;ll help you get back in
          </p>
        </div>

        {/* Form card */}
        <div className="bg-background border-2 border-border rounded-2xl p-8 shadow-sm">
          <ForgotPasswordForm />
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
