'use client';

import { useStatistics } from '@/hooks/use-statistics';

/**
 * Displays trivia game statistics on the home page.
 * Shows games played, average team score, accuracy, and popular categories.
 */
export function StatsDisplay() {
  const {
    isLoaded,
    gamesPlayed,
    averageTeamScore,
    highestTeamScore,
    mostPopularCategories,
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
    <section className="w-full max-w-4xl mx-auto mt-12 px-4">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
        Your Statistics
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Games Played */}
        <StatCard
          title="Games"
          value={gamesPlayed.toString()}
          description="Total played"
        />

        {/* Average Team Score */}
        <StatCard
          title="Avg. Score"
          value={averageTeamScore > 0 ? averageTeamScore.toString() : '-'}
          description="Per team"
        />

        {/* Highest Score */}
        <StatCard
          title="High Score"
          value={highestTeamScore > 0 ? highestTeamScore.toString() : '-'}
          description="Best team"
        />

        {/* Time Played */}
        <StatCard
          title="Time"
          value={formattedPlayTime}
          description="Total played"
        />
      </div>

      {/* Popular Categories */}
      {mostPopularCategories.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-center mb-3">
            Popular Categories
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {mostPopularCategories.map((category) => (
              <span
                key={category.category}
                className="inline-flex items-center px-3 py-1.5 bg-secondary/20 border border-secondary/30 rounded-full text-base capitalize"
              >
                {category.category}
                <span className="ml-1.5 text-base text-muted-foreground">
                  ({category.questionsAnswered} Q)
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
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
    <div className="bg-muted/10 rounded-xl p-4 border border-border text-center">
      <h3 className="text-base font-medium text-muted-foreground mb-1">
        {title}
      </h3>
      <p className="text-2xl md:text-3xl font-bold text-foreground">{value}</p>
      <p className="text-base text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
