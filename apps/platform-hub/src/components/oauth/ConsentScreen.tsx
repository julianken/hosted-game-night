'use client';

import { useState } from 'react';
import { Button } from '@beak-gaming/ui';
import { ClientInfo } from './ClientInfo';
import { ScopesList } from './ScopesList';
import type { AuthorizationDetails } from '@/types/oauth';

export interface ConsentScreenProps {
  loading?: boolean;
  error?: string | null;
  details?: AuthorizationDetails | null;
  onApprove: () => Promise<void>;
  onDeny: () => Promise<void>;
  csrfToken?: string | null;
}

/**
 * ConsentScreen - Main OAuth consent UI component
 *
 * Features:
 * - Loading state with spinner
 * - Error state with clear messaging
 * - Consent state with client info and scopes
 * - Large, accessible buttons (44x44px minimum)
 * - Keyboard navigation support
 * - WCAG 2.1 AA compliant
 */
export function ConsentScreen({
  loading = false,
  error = null,
  details = null,
  onApprove,
  onDeny,
  csrfToken = null,
}: ConsentScreenProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isDenying, setIsDenying] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove();
    } catch {
      setIsApproving(false);
    }
  };

  const handleDeny = async () => {
    setIsDenying(true);
    try {
      await onDeny();
    } catch {
      setIsDenying(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (loading || isApproving || isDenying || !csrfToken) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleApprove();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleDeny();
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
          <p className="text-xl text-muted-foreground">
            Loading authorization details...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-error/10 border-2 border-error rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-error rounded-full text-white">
              <svg
                className="w-8 h-8"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-error mb-4">
              Authorization Error
            </h2>
            <p className="text-lg text-foreground mb-6">{error}</p>
            <Button
              onClick={() => (window.location.href = '/')}
              size="lg"
              variant="secondary"
            >
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Consent state
  if (!details) {
    return null;
  }

  return (
    <div
      className="flex-1 flex items-center justify-center px-4 py-12"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-primary rounded-2xl text-primary-foreground shadow-lg">
            <svg
              className="w-12 h-12"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Authorize Access
          </h1>
          <p className="text-xl text-muted-foreground">
            <span className="font-semibold">{details.client.name}</span> wants
            to access your Beak Gaming account
          </p>
        </div>

        {/* Content card */}
        <div className="bg-background border-2 border-border rounded-2xl p-8 shadow-sm space-y-6">
          {/* User info */}
          <div className="text-center pb-6 border-b-2 border-border">
            <p className="text-lg text-muted-foreground mb-2">
              You&apos;re signed in as
            </p>
            <p className="text-xl font-semibold text-foreground">
              {details.user.email}
            </p>
          </div>

          {/* Client info */}
          <ClientInfo client={details.client} />

          {/* Scopes list */}
          <ScopesList scopes={details.scopes} />

          {/* Action buttons */}
          <div className="pt-6 space-y-4">
            {/* Hidden CSRF token field for form-based submission */}
            {csrfToken && (
              <input type="hidden" name="csrf_token" value={csrfToken} />
            )}

            <Button
              onClick={handleApprove}
              loading={isApproving}
              disabled={isApproving || isDenying || !csrfToken}
              size="lg"
              className="w-full"
              aria-label="Allow access"
            >
              {isApproving ? 'Authorizing...' : 'Allow'}
            </Button>
            <Button
              onClick={handleDeny}
              loading={isDenying}
              disabled={isApproving || isDenying}
              size="lg"
              variant="secondary"
              className="w-full"
              aria-label="Deny access"
            >
              {isDenying ? 'Canceling...' : 'Deny'}
            </Button>
          </div>

          {/* Keyboard shortcuts help */}
          <p className="text-sm text-center text-muted-foreground pt-4">
            Keyboard shortcuts: <kbd className="px-2 py-1 bg-muted rounded">Enter</kbd> to allow,{' '}
            <kbd className="px-2 py-1 bg-muted rounded">Esc</kbd> to deny
          </p>
        </div>

        {/* Security notice */}
        <p className="text-center text-base text-muted-foreground mt-6">
          By allowing access, you agree to share the requested information with{' '}
          {details.client.name}. You can revoke this access at any time in your
          account settings.
        </p>
      </div>
    </div>
  );
}

ConsentScreen.displayName = 'ConsentScreen';
