'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@beak-gaming/ui';
import { useAuth } from '@beak-gaming/auth';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForgotPasswordFormProps {
  // No props needed - form uses useAuth() hook directly
}

interface FormErrors {
  email?: string;
  general?: string;
}

/**
 * ForgotPasswordForm - Senior-friendly password reset request form.
 *
 * Features:
 * - Large fonts and buttons for accessibility
 * - Clear instructions and feedback
 * - Success state with helpful next steps
 * - Loading states during submission
 */
export function ForgotPasswordForm() {
  const { resetPassword, isLoading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Please enter your email address';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      // Use resetPassword from auth package
      const { error } = await resetPassword(email);
      if (!error) {
        setIsSuccess(true);
      }
      // Error handling is automatic via authError state
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-success"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h2>
          <p className="text-lg text-muted-foreground mb-4">
            If an account exists for <strong className="text-foreground">{email}</strong>, you will receive a password reset link shortly.
          </p>
          <p className="text-base text-muted-foreground">
            Be sure to check your spam folder if you don&apos;t see the email in your inbox.
          </p>
        </div>
        <div className="space-y-3">
          <Link
            href="/login"
            className="inline-block text-lg text-primary hover:text-primary/80 underline font-semibold focus:outline-none focus:ring-2 focus:ring-primary rounded px-1"
          >
            Return to Sign In
          </Link>
          <p className="text-base text-muted-foreground">
            Didn&apos;t receive an email?{' '}
            <button
              type="button"
              onClick={() => setIsSuccess(false)}
              className="text-primary hover:text-primary/80 underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
            >
              Try again
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Instructions */}
      <p className="text-lg text-muted-foreground">
        Enter the email address associated with your account, and we&apos;ll send you a link to reset your password.
      </p>

      {/* General error message from useAuth */}
      {authError && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-error/10 border-2 border-error text-error text-lg"
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{authError.message}</span>
          </div>
        </div>
      )}

      {/* Email field */}
      <div>
        <label
          htmlFor="email"
          className="block text-lg font-semibold text-foreground mb-2"
        >
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`
            w-full px-4 py-4 text-xl
            rounded-lg border-2
            bg-background text-foreground
            placeholder:text-muted
            focus:outline-none focus:ring-4 focus:ring-primary/30
            transition-colors duration-150
            ${errors.email
              ? 'border-error focus:border-error'
              : 'border-border focus:border-primary'
            }
          `}
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          disabled={isLoading}
        />
        {errors.email && (
          <p id="email-error" className="mt-2 text-lg text-error" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        size="lg"
        loading={isLoading}
        disabled={isLoading}
        className="w-full"
      >
        Send Reset Link
      </Button>

      {/* Back to login link */}
      <p className="text-center text-lg text-muted-foreground">
        Remember your password?{' '}
        <Link
          href="/login"
          className="text-primary hover:text-primary/80 underline font-semibold focus:outline-none focus:ring-2 focus:ring-primary rounded px-1"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

ForgotPasswordForm.displayName = 'ForgotPasswordForm';
