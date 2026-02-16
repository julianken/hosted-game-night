'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { Button } from '@beak-gaming/ui';

export interface UserPreferencesData {
  /** Preferred theme mode */
  theme?: 'light' | 'dark' | 'system';
  /** Sound effects enabled */
  soundEnabled?: boolean;
  /** Auto-call speed for bingo (seconds) */
  autoCallSpeed?: number;
  /** Default trivia category */
  defaultCategory?: string;
  /** Email notifications enabled */
  emailNotificationsEnabled?: boolean;
  /** Game reminders enabled */
  gameRemindersEnabled?: boolean;
  /** Weekly summary enabled */
  weeklySummaryEnabled?: boolean;
  /** Marketing emails enabled */
  marketingEmailsEnabled?: boolean;
}

export interface UserPreferencesProps extends HTMLAttributes<HTMLElement> {
  /** User preferences data */
  preferences?: UserPreferencesData;
  /** Whether data is loading */
  isLoading?: boolean;
}

// Default placeholder preferences
const defaultPreferences: UserPreferencesData = {
  theme: 'system',
  soundEnabled: true,
  autoCallSpeed: 5,
  defaultCategory: 'General Knowledge',
  emailNotificationsEnabled: true,
  gameRemindersEnabled: false,
  weeklySummaryEnabled: false,
  marketingEmailsEnabled: false,
};

/**
 * UserPreferences - Displays a summary of user preferences with quick access to settings.
 * Designed for senior users with clear labels and large touch targets.
 */
export const UserPreferences = forwardRef<HTMLElement, UserPreferencesProps>(
  ({ preferences, isLoading = false, className = '', ...props }, ref) => {
    const prefs = preferences || defaultPreferences;

    const getThemeLabel = (theme: string | undefined): string => {
      switch (theme) {
        case 'light':
          return 'Light Mode';
        case 'dark':
          return 'Dark Mode';
        default:
          return 'System Default';
      }
    };

    return (
      <section
        ref={ref}
        className={`
          p-6 md:p-8
          bg-background
          rounded-2xl border border-border
          ${className}
        `.trim()}
        aria-labelledby="preferences-heading"
        {...props}
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            id="preferences-heading"
            className="text-2xl md:text-3xl font-bold text-foreground"
          >
            Your Preferences
          </h2>
          <a
            href="/settings"
            className="
              inline-flex items-center gap-2
              text-lg text-primary hover:text-primary/80
              min-h-[44px] px-4 py-2
              rounded-lg
              focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50
              transition-colors duration-150
            "
          >
            Edit
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </a>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse p-4 rounded-xl bg-muted/10">
                <div className="h-4 w-24 bg-muted/30 rounded mb-2" />
                <div className="h-6 w-32 bg-muted/20 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Theme Preference */}
            <PreferenceItem
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              }
              label="Display"
              value={getThemeLabel(prefs.theme)}
            />

            {/* Sound Preference */}
            <PreferenceItem
              icon={
                prefs.soundEnabled ? (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                    />
                  </svg>
                )
              }
              label="Sound Effects"
              value={prefs.soundEnabled ? 'Enabled' : 'Disabled'}
              valueColor={prefs.soundEnabled ? 'text-success' : 'text-muted-foreground'}
            />

            {/* Auto-call Speed */}
            <PreferenceItem
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
              label="Bingo Speed"
              value={`${prefs.autoCallSpeed || 5} seconds`}
            />

            {/* Default Category */}
            <PreferenceItem
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              }
              label="Trivia Category"
              value={prefs.defaultCategory || 'General Knowledge'}
            />

            {/* Email Notifications */}
            <PreferenceItem
              icon={
                prefs.emailNotificationsEnabled ? (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 8L6 20M6 8l12 12"
                    />
                  </svg>
                )
              }
              label="Email Notifications"
              value={prefs.emailNotificationsEnabled ? 'Enabled' : 'Disabled'}
              valueColor={prefs.emailNotificationsEnabled ? 'text-success' : 'text-muted-foreground'}
            />

            {/* Game Reminders */}
            <PreferenceItem
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              }
              label="Game Reminders"
              value={prefs.gameRemindersEnabled ? 'On' : 'Off'}
              valueColor={prefs.gameRemindersEnabled ? 'text-success' : 'text-muted-foreground'}
            />

            {/* Weekly Summary */}
            <PreferenceItem
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              }
              label="Weekly Summary"
              value={prefs.weeklySummaryEnabled ? 'On' : 'Off'}
              valueColor={prefs.weeklySummaryEnabled ? 'text-success' : 'text-muted-foreground'}
            />

            {/* Marketing Emails */}
            <PreferenceItem
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                  />
                </svg>
              }
              label="Newsletter & Promotions"
              value={prefs.marketingEmailsEnabled ? 'On' : 'Off'}
              valueColor={prefs.marketingEmailsEnabled ? 'text-success' : 'text-muted-foreground'}
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                // Toggle sound - placeholder action
              }}
              aria-label={prefs.soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              {prefs.soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                // Toggle theme - placeholder action
              }}
            >
              Toggle Theme
            </Button>
          </div>
        </div>
      </section>
    );
  }
);

UserPreferences.displayName = 'UserPreferences';

interface PreferenceItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}

function PreferenceItem({ icon, label, value, valueColor = 'text-foreground' }: PreferenceItemProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/5 border border-border/50">
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-base text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold truncate ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
}
