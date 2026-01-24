'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@beak-gaming/auth';
import { Button, Input } from '@beak-gaming/ui';
import { useToast } from '@beak-gaming/ui';
import { useThemeStore, THEME_OPTIONS } from '@/stores/theme-store';
import { ThemeMode } from '@/types';

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { theme, setTheme } = useThemeStore();

  const [facilityName, setFacilityName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=%2Fsettings');
    }
  }, [user, authLoading, router]);

  // Load user data
  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setFacilityName(user.user_metadata?.facility_name || '');
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

  if (authLoading) {
    return (
      <main className="flex-1 py-8 md:py-12 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted/20 rounded w-1/3 mb-8"></div>
            <div className="space-y-6">
              <div className="h-20 bg-muted/20 rounded"></div>
              <div className="h-20 bg-muted/20 rounded"></div>
              <div className="h-20 bg-muted/20 rounded"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="flex-1 py-8 md:py-12 px-4 md:px-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
          Account Settings
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Facility Information */}
          <section className="p-6 bg-background rounded-2xl border border-border">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Facility Information
            </h2>
            <div className="space-y-4">
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

          {/* Account Information */}
          <section className="p-6 bg-background rounded-2xl border border-border">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Account Information
            </h2>
            <div className="space-y-4">
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

          {/* Theme Preference */}
          <section className="p-6 bg-background rounded-2xl border border-border">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Theme Preference
            </h2>
            <p className="text-base text-muted-foreground mb-6">
              Choose your preferred color theme. Changes apply immediately.
            </p>
            <div className="space-y-3">
              {THEME_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-muted/10"
                  style={{
                    borderColor: theme === option.value ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: theme === option.value ? 'var(--color-primary-light)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={option.value}
                    checked={theme === option.value}
                    onChange={(e) => setTheme(e.target.value as ThemeMode)}
                    className="w-6 h-6 min-w-[24px] min-h-[24px] mr-4 accent-primary cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-xl font-medium text-foreground">
                      {option.label}
                    </span>
                    {option.value === 'system' && (
                      <p className="text-base text-muted-foreground mt-1">
                        Automatically switches between light and dark based on your device settings
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Password Change */}
          <section className="p-6 bg-background rounded-2xl border border-border">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Change Password
            </h2>
            <p className="text-base text-muted-foreground mb-6">
              Leave blank if you don't want to change your password
            </p>
            <div className="space-y-4">
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
          <div className="flex gap-4">
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
