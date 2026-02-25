'use client';

import { useState } from 'react';
import { startOAuthFlow } from '@joolie-boolie/auth';

export interface LoginButtonProps {
  /** Path to redirect to after authentication (e.g., '/play') */
  returnTo?: string;
}

/**
 * Login button component that initiates OAuth 2.1 flow
 * Redirects to Platform Hub for authentication
 */
export function LoginButton({ returnTo }: LoginButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await startOAuthFlow(returnTo);
    } catch (error) {
      console.error('OAuth login failed:', error);
      setLoading(false);
      // In production, show user-friendly error message
      alert('Failed to start login. Please check your connection and try again.');
    }
  };

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="
        inline-flex items-center justify-center
        min-h-[56px] px-8 py-4
        text-xl font-semibold
        rounded-lg
        bg-primary text-primary-foreground
        hover:bg-primary/90 transition-colors
        focus:outline-none focus:ring-4 focus:ring-primary/50
        disabled:opacity-50 disabled:cursor-not-allowed
      "
    >
      {loading ? 'Redirecting...' : 'Sign in with Joolie Boolie'}
    </button>
  );
}
