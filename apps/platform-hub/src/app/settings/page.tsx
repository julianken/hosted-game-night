'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@joolie-boolie/auth';
import { Button, Input } from '@joolie-boolie/ui';
import { useToast } from '@joolie-boolie/ui';
import { useThemeStore, THEME_OPTIONS } from '@/stores/theme-store';
import { ThemeMode } from '@/types';

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { presenterTheme: theme, setPresenterTheme: setTheme } = useThemeStore();

  const [facilityName, setFacilityName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to login if not authenticated
  // Skip redirect in E2E mode (cookies checked server-side in layout.tsx)
  useEffect(() => {
    // Check for E2E auth cookies (client-side check)
    const hasE2ECookies = document.cookie.includes('jb_user_id=');

    if (!authLoading && !user && !hasE2ECookies) {
      router.push('/login?redirect=%2Fsettings');
    }
  }, [user, authLoading, router]);

  // Load user data and profile from API
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          setEmail(data.email || '');
          setFacilityName(data.facility_name || '');
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };

    // Check for E2E mode
    const hasE2ECookies = document.cookie.includes('jb_user_id=');

    if (user || hasE2ECookies) {
      loadProfile();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword && newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (newPassword && !currentPassword) {
      toast.error('Current password is required to change password');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityName,
          email,
          currentPassword: newPassword ? currentPassword : undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      toast.success('Profile updated successfully');

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update profile'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check for E2E mode
  const hasE2ECookies = typeof window !== 'undefined' && document.cookie.includes('jb_user_id=');

  if (authLoading && !hasE2ECookies) {
    return (
      <main className="flex-1 py-8 md:py-12 px-4 md:px-8 pb-20 md:pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 rounded w-1/3 mb-8" style={{ background: 'var(--muted)' }}></div>
            <div className="space-y-6">
              <div className="h-20 rounded" style={{ background: 'var(--muted)' }}></div>
              <div className="h-20 rounded" style={{ background: 'var(--muted)' }}></div>
              <div className="h-20 rounded" style={{ background: 'var(--muted)' }}></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Allow rendering if user exists OR E2E cookies present
  if (!user && !hasE2ECookies) {
    return null;
  }

  return (
    <main className="flex-1 py-8 md:py-12 px-4 md:px-8 pb-20 md:pb-12">
      <div className="max-w-2xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1
            className="text-3xl md:text-4xl font-bold text-foreground mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Account Settings
          </h1>
          <p className="text-base text-foreground-secondary">
            Manage your profile, appearance, and security settings.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ================================================================
              Facility Information
              ================================================================ */}
          <section
            className="rounded-xl border overflow-hidden"
            style={{ background: 'var(--surface)', borderColor: 'var(--border-subtle)' }}
          >
            {/* Section header */}
            <div
              className="px-6 py-4 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <h2 className="text-lg font-semibold text-foreground">
                Facility Information
              </h2>
            </div>
            <div className="px-6 py-5">
              <Input
                id="facilityName"
                label="Facility Name"
                type="text"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                placeholder="Enter facility name"
                className="w-full"
              />
            </div>
          </section>

          {/* ================================================================
              Account Information
              ================================================================ */}
          <section
            className="rounded-xl border overflow-hidden"
            style={{ background: 'var(--surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="px-6 py-4 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <h2 className="text-lg font-semibold text-foreground">
                Account Information
              </h2>
            </div>
            <div className="px-6 py-5">
              <Input
                id="email"
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full"
                required
              />
            </div>
          </section>

          {/* ================================================================
              Theme Preference — visual selector cards
              ================================================================ */}
          <section
            className="rounded-xl border overflow-hidden"
            style={{ background: 'var(--surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="px-6 py-4 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <h2 className="text-lg font-semibold text-foreground">
                Theme Preference
              </h2>
              <p className="text-sm text-foreground-secondary mt-1">
                Choose your preferred color theme. Changes apply immediately.
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {THEME_OPTIONS.map((option) => {
                  const isSelected = theme === option.value;
                  return (
                    <label
                      key={option.value}
                      className="relative flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all"
                      style={{
                        borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                        background: isSelected
                          ? 'color-mix(in srgb, var(--primary) 8%, transparent)'
                          : 'var(--surface-elevated)',
                      }}
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={option.value}
                        checked={isSelected}
                        onChange={(e) => setTheme(e.target.value as ThemeMode)}
                        className="sr-only"
                      />

                      {/* Theme preview swatch */}
                      <div
                        className="w-10 h-10 rounded-lg mb-3 flex items-center justify-center border"
                        style={{
                          background:
                            option.value === 'light'
                              ? '#FAF9FB'
                              : option.value === 'dark'
                              ? '#0F0D13'
                              : 'linear-gradient(135deg, #0F0D13 50%, #FAF9FB 50%)',
                          borderColor: 'var(--border)',
                        }}
                        aria-hidden="true"
                      >
                        {isSelected && (
                          <svg
                            className="w-5 h-5"
                            style={{
                              color: option.value === 'light' ? '#0F0D13' : '#EDEDEF',
                            }}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                          >
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      <span
                        className="text-base font-medium"
                        style={{ color: isSelected ? 'var(--primary)' : 'var(--foreground)' }}
                      >
                        {option.label}
                      </span>

                      {option.value === 'system' && (
                        <p className="text-xs text-foreground-secondary mt-1 text-center leading-snug">
                          Follows device
                        </p>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ================================================================
              Password Change
              ================================================================ */}
          <section
            className="rounded-xl border overflow-hidden"
            style={{ background: 'var(--surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="px-6 py-4 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <h2 className="text-lg font-semibold text-foreground">
                Change Password
              </h2>
              <p className="text-sm text-foreground-secondary mt-1">
                Leave blank if you do not want to change your password.
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Input
                id="currentPassword"
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full"
                autoComplete="current-password"
              />
              <Input
                id="newPassword"
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 8 characters)"
                className="w-full"
                autoComplete="new-password"
                minLength={8}
              />
              <Input
                id="confirmPassword"
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full"
                autoComplete="new-password"
                minLength={8}
              />
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-4 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => router.push('/dashboard')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>

      </div>
    </main>
  );
}
