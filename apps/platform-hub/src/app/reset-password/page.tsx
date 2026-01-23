'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth';
import { useAuth } from '@beak-gaming/auth';

export default function ResetPasswordPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  useEffect(() => {
    // Check for token in URL hash (Supabase sends it as #access_token=xxx&type=recovery)
    const checkToken = async () => {
      try {
        const hash = window.location.hash;

        if (!hash) {
          setTokenError('No reset token found in URL');
          setIsCheckingToken(false);
          return;
        }

        // Parse hash parameters
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const type = params.get('type');

        if (!accessToken || type !== 'recovery') {
          setTokenError('Invalid or expired reset link');
          setIsCheckingToken(false);
          return;
        }

        // If we have a valid token, Supabase middleware will create a session
        // Wait a moment for auth state to update
        await new Promise(resolve => setTimeout(resolve, 500));

        setIsCheckingToken(false);
      } catch (error) {
        console.error('Error checking token:', error);
        setTokenError('An error occurred while verifying your reset link');
        setIsCheckingToken(false);
      }
    };

    checkToken();
  }, []);

  // Show loading state while checking token
  if (isCheckingToken || authLoading) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-lg text-muted-foreground">Verifying your reset link...</p>
        </div>
      </main>
    );
  }

  // Show error if token is invalid or user is not authenticated
  if (tokenError || !user) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-lg text-muted-foreground hover:text-foreground mb-8 transition-colors"
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

          <div className="bg-background border-2 border-border rounded-2xl p-8 shadow-sm">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-error/10 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-error"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Invalid Reset Link</h2>
                <p className="text-lg text-muted-foreground mb-4">
                  {tokenError || 'This password reset link is invalid or has expired.'}
                </p>
              </div>
              <Link
                href="/forgot-password"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-lg transition-colors"
              >
                Request a new reset link
              </Link>
            </div>
          </div>

          <p className="text-center text-base text-muted-foreground mt-8">
            Need help?{' '}
            <a
              href="mailto:support@beakgaming.com"
              className="text-primary hover:text-primary/80 underline"
            >
              Contact Support
            </a>
          </p>
        </div>
      </main>
    );
  }

  // Show reset password form if token is valid and user is authenticated
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-lg text-muted-foreground hover:text-foreground mb-8 transition-colors"
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

        <div className="text-center mb-10">
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
          <h1 className="text-4xl font-bold text-foreground mb-3">Create New Password</h1>
          <p className="text-xl text-muted-foreground">
            Choose a strong password for your account
          </p>
        </div>

        <div className="bg-background border-2 border-border rounded-2xl p-8 shadow-sm">
          <ResetPasswordForm />
        </div>

        <p className="text-center text-base text-muted-foreground mt-8">
          Need help?{' '}
          <a
            href="mailto:support@beakgaming.com"
            className="text-primary hover:text-primary/80 underline"
          >
            Contact Support
          </a>
        </p>
      </div>
    </main>
  );
}
