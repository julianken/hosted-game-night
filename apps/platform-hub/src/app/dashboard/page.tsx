import {
  WelcomeHeader,
  DashboardGameCard,
  RecentSessions,
  UserPreferences,
} from '@/components/dashboard';

// Force dynamic rendering to avoid build-time Supabase initialization
export const dynamic = 'force-dynamic';

/**
 * Bingo icon - Grid pattern representing bingo card
 */
function BingoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-12 h-12 text-blue-600 dark:text-blue-400"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="5" height="5" rx="1" />
      <rect x="10" y="3" width="5" height="5" rx="1" />
      <rect x="17" y="3" width="5" height="5" rx="1" />
      <rect x="3" y="10" width="5" height="5" rx="1" />
      <circle cx="12.5" cy="12.5" r="3" />
      <rect x="17" y="10" width="5" height="5" rx="1" />
      <rect x="3" y="17" width="5" height="5" rx="1" />
      <rect x="10" y="17" width="5" height="5" rx="1" />
      <rect x="17" y="17" width="5" height="5" rx="1" />
    </svg>
  );
}

/**
 * Trivia icon - Question mark in a bubble
 */
function TriviaIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-12 h-12 text-emerald-600 dark:text-emerald-400"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
    </svg>
  );
}

// Game data configuration
const games = [
  {
    id: 'bingo',
    title: 'Beak Bingo',
    description:
      'Classic 75-ball bingo with dual-screen display. Perfect for bingo nights with large, easy-to-read numbers.',
    href:
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/play'
        : '/bingo/play',
    icon: <BingoIcon />,
    colorClass: 'bg-blue-50 dark:bg-blue-950/30',
    lastPlayed: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    timesPlayed: 8,
  },
  {
    id: 'trivia',
    title: 'Trivia Night',
    description:
      'Team-based trivia with presenter controls. Great for group entertainment with customizable categories.',
    href:
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001/play'
        : '/trivia/play',
    icon: <TriviaIcon />,
    colorClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    lastPlayed: new Date(Date.now() - 1000 * 60 * 60 * 26), // Yesterday
    timesPlayed: 4,
  },
];

// Placeholder user data (will be replaced with real auth data)
const placeholderUser = {
  name: 'Activity Director',
  email: 'activities@sunnydale.com',
};

export const metadata = {
  title: 'Dashboard | Beak Gaming Platform',
  description: 'Your Beak Gaming dashboard - quick access to games, recent sessions, and settings',
};

export default function DashboardPage() {
  return (
    <main className="flex-1 py-8 md:py-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8 md:space-y-12">
        {/* Welcome Header */}
        <WelcomeHeader
          userName={placeholderUser.name}
          userEmail={placeholderUser.email}
        />

        {/* Quick Access Games Section */}
        <section aria-labelledby="games-heading">
          <h2
            id="games-heading"
            className="text-2xl md:text-3xl font-bold text-foreground mb-6"
          >
            Quick Play
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {games.map((game) => (
              <DashboardGameCard
                key={game.id}
                title={game.title}
                description={game.description}
                href={game.href}
                icon={game.icon}
                colorClass={game.colorClass}
                lastPlayed={game.lastPlayed}
                timesPlayed={game.timesPlayed}
              />
            ))}
          </div>
        </section>

        {/* Two Column Layout for Sessions and Preferences */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
          {/* Recent Sessions */}
          <RecentSessions maxSessions={4} />

          {/* User Preferences */}
          <UserPreferences />
        </div>

        {/* Help Section */}
        <section
          className="p-6 md:p-8 bg-primary/5 rounded-2xl border border-primary/20"
          aria-labelledby="help-heading"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h2
                id="help-heading"
                className="text-2xl md:text-3xl font-bold text-foreground mb-2"
              >
                Need Help Getting Started?
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                Check out our quick start guides for running games, or contact support if you need assistance.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="/help/bingo"
                  className="
                    inline-flex items-center gap-2
                    min-h-[44px] px-6 py-2
                    text-lg font-medium
                    bg-primary text-primary-foreground
                    hover:bg-primary/90
                    rounded-lg
                    focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50
                    transition-colors duration-150
                  "
                >
                  Bingo Guide
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
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </a>
                <a
                  href="/help/trivia"
                  className="
                    inline-flex items-center gap-2
                    min-h-[44px] px-6 py-2
                    text-lg font-medium
                    bg-secondary text-secondary-foreground
                    hover:bg-secondary/90
                    rounded-lg
                    focus:outline-none focus-visible:ring-4 focus-visible:ring-secondary/50
                    transition-colors duration-150
                  "
                >
                  Trivia Guide
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
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
