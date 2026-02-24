'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@joolie-boolie/ui';
import { useAuth, sanitizeRedirect } from '@joolie-boolie/auth';

export interface LoginFormProps {
  /** Optional redirect URL after successful login */
  redirectTo?: string;
  /** Optional authorization_id for OAuth flows */
  authorizationId?: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

/**
 * Builds a redirect URL with optional authorization_id query parameter.
 * Uses sanitizeRedirect from @joolie-boolie/auth to prevent open redirect attacks.
 */
function buildRedirectUrl(redirectTo: string | undefined, authorizationId: string | undefined): string {
  const redirect = sanitizeRedirect(redirectTo, '/dashboard');

  // Build redirect URL with authorization_id if present
  if (authorizationId) {
    return `${redirect}?authorization_id=${encodeURIComponent(authorizationId)}`;
  }

  return redirect;
}

/**
 * LoginForm - Accessible login form with email and password.
 *
 * Features:
 * - Large fonts and buttons for accessibility
 * - Clear error messages
 * - Loading states during submission
 * - Links to signup and password reset
 */
export function LoginForm({ redirectTo, authorizationId }: LoginFormProps) {
  const { signIn, isLoading, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Please enter your email address';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Please enter your password';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
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

    // Call Platform Hub login API to set cross-app SSO cookies
    // This replaces direct signIn call to ensure jb_access_token is set
    try {
      console.log('[LoginForm] Calling /api/auth/login...');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('[LoginForm] Response status:', response.status);
      const data = await response.json();
      console.log('[LoginForm] Response data:', { success: data.success, hasUser: !!data.user });

      if (!response.ok || !data.success) {
        console.log('[LoginForm] Login failed, calling signIn fallback');
        // Show error via useAuth's error state, then redirect if successful
        try {
          const result = await signIn(email, password);
          if (result.error) {
            console.log('[LoginForm] Fallback signIn failed:', result.error);
            return;
          }

          // Sync the session to httpOnly cookies for cross-app SSO
          if (result.session) {
            console.log('[LoginForm] Syncing session to httpOnly cookies...');
            try {
              await fetch('/api/auth/sync-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  accessToken: result.session.access_token,
                  refreshToken: result.session.refresh_token,
                }),
              });
            } catch (syncError) {
              console.warn('[LoginForm] Session sync failed (non-fatal):', syncError);
            }
          }

          // If signIn didn't throw, redirect to original destination or dashboard
          const fallbackUrl = buildRedirectUrl(redirectTo, authorizationId);
          console.log('[LoginForm] Fallback signIn successful, redirecting to:', fallbackUrl);
          window.location.href = fallbackUrl;
        } catch {
          // signIn failed - authError will be set by useAuth
          console.log('[LoginForm] Fallback signIn failed, staying on login page');
        }
        return;
      }

      // Success - redirect with preserved authorization_id if present
      const redirectUrl = buildRedirectUrl(redirectTo, authorizationId);
      console.log('[LoginForm] Login successful, redirecting to:', redirectUrl);

      // Always use window.location.href for post-login redirects
      // This ensures a full page load which:
      // 1. Properly reads the newly-set authentication cookies
      // 2. Guarantees the redirect happens (router.push can fail silently)
      // 3. Handles API routes that return HTTP 302 redirects
      window.location.href = redirectUrl;
      console.log('[LoginForm] Redirect initiated via window.location');
    } catch (error) {
      console.error('Login API error:', error);
      // Fallback to direct signIn on network errors
      try {
        const result = await signIn(email, password);
        if (result.error) {
          console.log('[LoginForm] Fallback signIn failed:', result.error);
          return;
        }

        // Sync the session to httpOnly cookies for cross-app SSO
        if (result.session) {
          console.log('[LoginForm] Syncing session to httpOnly cookies...');
          try {
            await fetch('/api/auth/sync-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                accessToken: result.session.access_token,
                refreshToken: result.session.refresh_token,
              }),
            });
          } catch (syncError) {
            console.warn('[LoginForm] Session sync failed (non-fatal):', syncError);
          }
        }

        // If signIn didn't throw, redirect to original destination or dashboard
        const fallbackUrl = buildRedirectUrl(redirectTo, authorizationId);
        console.log('[LoginForm] Fallback signIn successful, redirecting to:', fallbackUrl);
        window.location.href = fallbackUrl;
      } catch {
        // signIn failed - authError will be set by useAuth
        console.log('[LoginForm] Fallback signIn failed, staying on login page');
      }
    }
  };

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
            autoComplete="current-password"
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
            placeholder="Enter your password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded"
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
        {errors.password && (
          <p id="password-error" className="mt-2 text-lg text-error" role="alert">
            {errors.password}
          </p>
        )}
      </div>

      {/* Forgot password link */}
      <div className="text-right">
        <Link
          href="/forgot-password"
          className="text-lg text-primary hover:text-primary/80 underline focus:outline-none focus:ring-2 focus:ring-primary rounded px-1"
        >
          Forgot your password?
        </Link>
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        size="lg"
        loading={isLoading}
        disabled={isLoading}
        className="w-full"
      >
        Sign In
      </Button>

      {/* Sign up link */}
      <p className="text-center text-lg text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="text-primary hover:text-primary/80 underline font-semibold focus:outline-none focus:ring-2 focus:ring-primary rounded px-1"
        >
          Create one now
        </Link>
      </p>
    </form>
  );
}

LoginForm.displayName = 'LoginForm';

// Export utility function for testing
export { buildRedirectUrl };
