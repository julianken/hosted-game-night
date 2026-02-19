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
      className="w-10 h-10"
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
      className="w-10 h-10"
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
    title: 'Bingo',
    description:
      'Classic 75-ball bingo with dual-screen display. Perfect for bingo nights with large, easy-to-read numbers and automatic ball calling.',
    href: process.env.NEXT_PUBLIC_BINGO_URL
      ? `${process.env.NEXT_PUBLIC_BINGO_URL}/play`
      : 'http://localhost:3000/play',
    icon: <BingoIcon />,
    status: 'available' as const,
    colorClass: '',
    accentColor: 'var(--game-bingo)',
  },
  {
    id: 'trivia',
    title: 'Trivia',
    description:
      'Team-based trivia with presenter controls. Great for group entertainment with customizable categories and scoring.',
    href: process.env.NEXT_PUBLIC_TRIVIA_URL
      ? `${process.env.NEXT_PUBLIC_TRIVIA_URL}/play`
      : 'http://localhost:3001/play',
    icon: <TriviaIcon />,
    status: 'available' as const,
    colorClass: '',
    accentColor: 'var(--game-trivia)',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col pb-14 md:pb-0">
      <main className="flex-1">
        {/* ================================================================
            Asymmetric Hero — 55% left text / 45% right game cards
            Collapses to single column on mobile (< 768px)
            ================================================================ */}
        <section
          className="px-4 sm:px-6 md:px-8 py-12 md:py-20 lg:py-28"
          aria-labelledby="hero-heading"
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center gap-12 lg:gap-16">

              {/* Left column — 55% — headline + description + CTAs */}
              <div className="md:w-[55%] md:shrink-0">
                {/* Eyebrow label */}
                <p
                  className="text-base font-semibold tracking-widest uppercase mb-4"
                  style={{ color: 'var(--accent)', letterSpacing: 'var(--tracking-widest)' }}
                >
                  Games for Everyone
                </p>

                {/* Headline in Space Grotesk display font */}
                <h1
                  id="hero-heading"
                  className="font-bold text-foreground mb-6 leading-tight"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
                    letterSpacing: 'var(--tracking-tighter)',
                    lineHeight: 'var(--leading-tight)',
                  }}
                >
                  Bring People<br />
                  Together with<br />
                  <span style={{ color: 'var(--primary)' }}>Play</span>
                </h1>

                <p className="text-lg md:text-xl text-foreground-secondary mb-8 leading-relaxed max-w-prose">
                  Fun, accessible games designed for groups and communities.
                  Easy to run. Everyone can participate.
                </p>

                {/* Dual CTAs */}
                <div className="flex flex-wrap gap-4">
                  <a
                    href={games[0].href}
                    className="
                      inline-flex items-center justify-center gap-2
                      min-h-[44px] px-6 py-3
                      text-base font-semibold rounded-lg
                      bg-primary text-primary-foreground
                      hover:bg-primary/90
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                      transition-colors duration-150
                    "
                    aria-label="Launch Bingo game"
                  >
                    Launch Bingo
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                  <a
                    href={games[1].href}
                    className="
                      inline-flex items-center justify-center gap-2
                      min-h-[44px] px-6 py-3
                      text-base font-semibold rounded-lg
                      border border-border text-foreground
                      hover:bg-surface-hover hover:border-border-strong
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                      transition-colors duration-150
                    "
                    aria-label="Launch Trivia game"
                  >
                    Launch Trivia
                  </a>
                </div>

                {/* Trust indicators */}
                <div className="mt-8 flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2 text-foreground-secondary text-base">
                    <svg className="w-4 h-4 text-success shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Dual-screen display
                  </div>
                  <div className="flex items-center gap-2 text-foreground-secondary text-base">
                    <svg className="w-4 h-4 text-success shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Tablet friendly
                  </div>
                  <div className="flex items-center gap-2 text-foreground-secondary text-base">
                    <svg className="w-4 h-4 text-success shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    High contrast
                  </div>
                </div>
              </div>

              {/* Right column — 45% — stacked game cards */}
              <div
                className="md:w-[45%] flex flex-col gap-4"
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
                      accentColor={game.accentColor}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            Features Bento Grid — below hero
            ================================================================ */}
        <section
          className="px-4 sm:px-6 md:px-8 py-12 md:py-16"
          aria-labelledby="features-heading"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="max-w-7xl mx-auto">
            <h2
              id="features-heading"
              className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Designed for You
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Feature 1 */}
              <div
                className="p-6 rounded-xl border"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div
                  className="w-12 h-12 mb-4 flex items-center justify-center rounded-lg"
                  style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}
                  aria-hidden="true"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Easy to Read</h3>
                <p className="text-base text-foreground-secondary leading-relaxed">
                  Large fonts and high contrast for visibility from anywhere in the room.
                </p>
              </div>

              {/* Feature 2 */}
              <div
                className="p-6 rounded-xl border"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div
                  className="w-12 h-12 mb-4 flex items-center justify-center rounded-lg"
                  style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}
                  aria-hidden="true"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Dual Screen</h3>
                <p className="text-base text-foreground-secondary leading-relaxed">
                  Separate display for projectors so everyone can see the game.
                </p>
              </div>

              {/* Feature 3 */}
              <div
                className="p-6 rounded-xl border sm:col-span-2 md:col-span-1"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div
                  className="w-12 h-12 mb-4 flex items-center justify-center rounded-lg"
                  style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}
                  aria-hidden="true"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Tablet Friendly</h3>
                <p className="text-base text-foreground-secondary leading-relaxed">
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
