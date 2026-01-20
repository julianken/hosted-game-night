import { GameCard } from '@/components';

// Force dynamic rendering since we use AuthProvider
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
      {/* 3x3 grid representing bingo card */}
      <rect x="3" y="3" width="5" height="5" rx="1" />
      <rect x="10" y="3" width="5" height="5" rx="1" />
      <rect x="17" y="3" width="5" height="5" rx="1" />
      <rect x="3" y="10" width="5" height="5" rx="1" />
      <circle cx="12.5" cy="12.5" r="3" /> {/* Free space */}
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
      'Classic 75-ball bingo with dual-screen display. Perfect for bingo nights with large, easy-to-read numbers and automatic ball calling.',
    href: process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000/play'
      : '/bingo/play',
    icon: <BingoIcon />,
    status: 'available' as const,
    colorClass: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    id: 'trivia',
    title: 'Trivia Night',
    description:
      'Team-based trivia with presenter controls. Great for group entertainment with customizable categories and scoring.',
    href: process.env.NODE_ENV === 'development'
      ? 'http://localhost:3001/play'
      : '/trivia/play',
    icon: <TriviaIcon />,
    status: 'available' as const,
    colorClass: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {/* Hero Section */}
        <section
          className="py-10 sm:py-16 md:py-24 px-4 sm:px-6 md:px-8 text-center bg-gradient-to-b from-primary/5 to-transparent"
          aria-labelledby="hero-heading"
        >
          <div className="max-w-4xl mx-auto">
            {/* Platform Logo */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-4 sm:mb-6 md:mb-8 flex items-center justify-center bg-primary rounded-2xl md:rounded-3xl text-primary-foreground shadow-lg">
              <svg
                className="w-9 h-9 sm:w-11 sm:h-11 md:w-14 md:h-14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>

            <h1
              id="hero-heading"
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6"
            >
              Beak Gaming Platform
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Fun, accessible games designed for retirement communities.
              <br className="hidden sm:block" />
              <span className="text-primary font-semibold">
                Easy to run. Fun to play.
              </span>
            </p>
          </div>
        </section>

        {/* Game Selector Section */}
        <section
          className="py-8 sm:py-12 md:py-16 px-4 sm:px-6 md:px-8"
          aria-labelledby="games-heading"
        >
          <div className="max-w-6xl mx-auto">
            <h2
              id="games-heading"
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground text-center mb-3 sm:mb-4"
            >
              Choose Your Game
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground text-center mb-6 sm:mb-8 md:mb-12 max-w-2xl mx-auto">
              Select a game below to start playing. Each game has presenter
              controls and a separate audience display for projectors.
            </p>

            {/* Game Cards Grid */}
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-10"
              role="list"
              aria-label="Available games"
            >
              {games.map((game) => (
                <div key={game.id} role="listitem">
                  <GameCard
                    title={game.title}
                    description={game.description}
                    href={game.href}
                    icon={game.icon}
                    status={game.status}
                    colorClass={game.colorClass}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          className="py-8 sm:py-12 md:py-16 px-4 sm:px-6 md:px-8 bg-muted/5"
          aria-labelledby="features-heading"
        >
          <div className="max-w-6xl mx-auto">
            <h2
              id="features-heading"
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground text-center mb-6 sm:mb-8 md:mb-12"
            >
              Designed for You
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {/* Feature 1 */}
              <div className="text-center p-4 sm:p-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center rounded-xl sm:rounded-2xl bg-primary/10 text-primary">
                  <svg
                    className="w-7 h-7 sm:w-8 sm:h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                  Easy to Read
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground">
                  Large fonts and high contrast for visibility from anywhere in
                  the room.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="text-center p-4 sm:p-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center rounded-xl sm:rounded-2xl bg-primary/10 text-primary">
                  <svg
                    className="w-7 h-7 sm:w-8 sm:h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                  Dual Screen
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground">
                  Separate display for projectors so everyone can see the game.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="text-center p-4 sm:p-6 sm:col-span-2 md:col-span-1">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center rounded-xl sm:rounded-2xl bg-primary/10 text-primary">
                  <svg
                    className="w-7 h-7 sm:w-8 sm:h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                  Tablet Friendly
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground">
                  Works great on tablets and touch screens for easy control.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
