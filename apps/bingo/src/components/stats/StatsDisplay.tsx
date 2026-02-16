'use client';

import { useStatistics } from '@/hooks/use-statistics';

/**
 * Displays bingo game statistics on the home page.
 * Shows games played, average balls to win, most common patterns, and session duration.
 */
export function StatsDisplay() {
  const {
    isLoaded,
    gamesPlayed,
    averageBallsToWin,
    mostCommonPatterns,
    formattedPlayTime,
  } = useStatistics();

  // Don't render until stats are loaded from localStorage
  if (!isLoaded) {
    return null;
  }

  // Don't show stats section if no games have been played
  if (gamesPlayed === 0) {
    return null;
  }

  return (
    <section className="bg-muted/10 py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
          Your Statistics
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Games Played */}
          <StatCard
            title="Games Played"
            value={gamesPlayed.toString()}
            description="Total bingo games"
          />

          {/* Average Balls to Win */}
          <StatCard
            title="Avg. Balls to Win"
            value={averageBallsToWin > 0 ? averageBallsToWin.toString() : '-'}
            description="Balls called before winner"
          />

          {/* Most Common Pattern */}
          <StatCard
            title="Favorite Pattern"
            value={mostCommonPatterns[0]?.patternName ?? '-'}
            description={
              mostCommonPatterns[0]
                ? `Played ${mostCommonPatterns[0].timesPlayed} time${mostCommonPatterns[0].timesPlayed !== 1 ? 's' : ''}`
                : 'No patterns yet'
            }
          />

          {/* Session Duration */}
          <StatCard
            title="Time Playing"
            value={formattedPlayTime}
            description="Total time spent"
          />
        </div>

        {/* Most Common Patterns List */}
        {mostCommonPatterns.length > 1 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-center mb-4">
              Popular Patterns
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {mostCommonPatterns.map((pattern) => (
                <span
                  key={pattern.patternId}
                  className="inline-flex items-center px-4 py-2 bg-background border border-border rounded-lg text-lg"
                >
                  <span className="font-medium">{pattern.patternName}</span>
                  <span className="ml-2 text-muted-foreground">
                    ({pattern.timesPlayed})
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Individual statistic card component.
 */
interface StatCardProps {
  title: string;
  value: string;
  description: string;
}

function StatCard({ title, value, description }: StatCardProps) {
  return (
    <div className="bg-background rounded-xl p-6 shadow-sm border border-border text-center">
      <h3 className="text-lg font-medium text-muted-foreground mb-2">
        {title}
      </h3>
      <p className="text-4xl font-bold text-foreground mb-1">{value}</p>
      <p className="text-base text-muted-foreground">{description}</p>
    </div>
  );
}
