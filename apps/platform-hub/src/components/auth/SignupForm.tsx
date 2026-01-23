'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@beak-gaming/ui';
import { useAuth } from '@beak-gaming/auth';

export interface SignupFormProps {
  /** Optional redirect URL after successful signup */
  redirectTo?: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

/**
 * SignupForm - Senior-friendly registration form.
 *
 * Features:
 * - Large fonts and buttons for accessibility
 * - Clear error messages with helpful guidance
 * - Password strength requirements explained
 * - Confirmation password field
 * - Loading states during submission
 */
export function SignupForm() {
  const { signUp, isLoading, error: authError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation (optional but recommended)
    if (name.trim() && name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Please enter your email address';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Please create a password';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = 'Password must include at least one uppercase letter';
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = 'Password must include at least one lowercase letter';
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = 'Password must include at least one number';
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      // Call signUp from useAuth hook with metadata
      const { error } = await signUp(email, password, {
        data: name ? { full_name: name } : undefined,
      });

      if (!error) {
        setIsSuccess(true);
        // Redirect handled by success screen link to /login
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Account Created!</h2>
          <p className="text-lg text-muted-foreground">
            Please check your email to verify your account before signing in.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-block text-lg text-primary hover:text-primary/80 underline font-semibold focus:outline-none focus:ring-2 focus:ring-primary rounded px-1"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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

      {/* Name field (optional) */}
      <div>
        <label
          htmlFor="name"
          className="block text-lg font-semibold text-foreground mb-2"
        >
          Name <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`
            w-full px-4 py-4 text-xl
            rounded-lg border-2
            bg-background text-foreground
            placeholder:text-muted
            focus:outline-none focus:ring-4 focus:ring-primary/30
            transition-colors duration-150
            ${errors.name
              ? 'border-error focus:border-error'
              : 'border-border focus:border-primary'
            }
          `}
          placeholder="Your name"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          disabled={isLoading}
        />
        {errors.name && (
          <p id="name-error" className="mt-2 text-lg text-error" role="alert">
            {errors.name}
          </p>
        )}
      </div>

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

      {/* Password field */}
      <div>
        <label
          htmlFor="password"
          className="block text-lg font-semibold text-foreground mb-2"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`
              w-full px-4 py-4 pr-14 text-xl
              rounded-lg border-2
              bg-background text-foreground
              placeholder:text-muted
              focus:outline-none focus:ring-4 focus:ring-primary/30
              transition-colors duration-150
              ${errors.password
                ? 'border-error focus:border-error'
                : 'border-border focus:border-primary'
              }
            `}
            placeholder="Create a password"
            aria-invalid={!!errors.password}
            aria-describedby="password-requirements password-error"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            disabled={isLoading}
          >
            {showPassword ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        <p id="password-requirements" className="mt-2 text-base text-muted-foreground">
          At least 8 characters with uppercase, lowercase, and a number
        </p>
        {errors.password && (
          <p id="password-error" className="mt-2 text-lg text-error" role="alert">
            {errors.password}
          </p>
        )}
      </div>

      {/* Confirm password field */}
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-lg font-semibold text-foreground mb-2"
        >
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={`
            w-full px-4 py-4 text-xl
            rounded-lg border-2
            bg-background text-foreground
            placeholder:text-muted
            focus:outline-none focus:ring-4 focus:ring-primary/30
            transition-colors duration-150
            ${errors.confirmPassword
              ? 'border-error focus:border-error'
              : 'border-border focus:border-primary'
            }
          `}
          placeholder="Re-enter your password"
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
          disabled={isLoading}
        />
        {errors.confirmPassword && (
          <p id="confirm-password-error" className="mt-2 text-lg text-error" role="alert">
            {errors.confirmPassword}
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
        Create Account
      </Button>

      {/* Sign in link */}
      <p className="text-center text-lg text-muted-foreground">
        Already have an account?{' '}
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

SignupForm.displayName = 'SignupForm';
