'use client';

import type { Team } from '@/types';

export interface AudienceScoreboardProps {
  teams: Team[];
  currentRound: number;
  totalRounds: number;
}

// Medal colors for top 3
const medalColors: Record<number, string> = {
  0: 'bg-yellow-500 text-black', // Gold
  1: 'bg-gray-400 text-black', // Silver
  2: 'bg-amber-700 text-white', // Bronze
};

const medalLabels: Record<number, string> = {
  0: '1st',
  1: '2nd',
  2: '3rd',
};

/**
 * Scoreboard display for between rounds.
 * Shows team rankings with medals for top 3.
 */
export function AudienceScoreboard({
  teams,
  currentRound,
  totalRounds,
}: AudienceScoreboardProps) {
  const isLastRound = currentRound >= totalRounds - 1;

  return (
    <section
      className="flex flex-col items-center h-full min-h-[60vh] gap-8 animate-in fade-in duration-500 motion-reduce:animate-none"
      role="region"
      aria-label={isLastRound ? 'Final standings' : `Round ${currentRound + 1} standings`}
    >
      {/* Header */}
      <div className="text-center" aria-live="polite">
        <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
          {isLastRound ? 'Final Round Complete!' : `Round ${currentRound + 1} Complete!`}
        </h2>
        <p className="mt-2 text-2xl text-muted-foreground">
          {isLastRound ? 'Final Standings' : `${totalRounds - currentRound - 1} round${totalRounds - currentRound - 1 > 1 ? 's' : ''} remaining`}
        </p>
      </div>

      {/* Scoreboard */}
      <div className="w-full max-w-4xl px-4">
        <table
          className="w-full bg-muted/10 rounded-2xl border border-border overflow-hidden"
          role="table"
          aria-label="Team standings"
        >
          {/* Column headers */}
          <thead>
            <tr className="bg-muted/20 border-b border-border text-xl font-semibold text-muted-foreground">
              <th scope="col" className="px-6 py-4 text-center w-1/6">Rank</th>
              <th scope="col" className="px-6 py-4 text-left w-1/2">Team</th>
              <th scope="col" className="px-6 py-4 text-right w-1/3">Score</th>
            </tr>
          </thead>

          {/* Team rows */}
          <tbody className="divide-y divide-border">
            {teams.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-2xl text-muted-foreground">
                  No teams yet
                </td>
              </tr>
            ) : (
              teams.map((team, index) => (
                <tr
                  key={team.id}
                  className={index < 3 ? 'bg-muted/5' : ''}
                >
                  {/* Rank */}
                  <td className="px-6 py-4 text-center">
                    {index < 3 ? (
                      <span
                        aria-label={`${medalLabels[index]} place`}
                        className={`
                          ${medalColors[index]}
                          inline-flex w-12 h-12 lg:w-14 lg:h-14 items-center justify-center
                          rounded-full text-xl lg:text-2xl font-bold
                        `}
                      >
                        {medalLabels[index]}
                      </span>
                    ) : (
                      <span className="text-2xl lg:text-3xl font-semibold text-muted-foreground">
                        {index + 1}
                      </span>
                    )}
                  </td>

                  {/* Team name */}
                  <td className="px-6 py-4">
                    <span
                      className={`
                        text-2xl lg:text-3xl font-medium
                        ${index < 3 ? 'text-foreground' : 'text-muted-foreground'}
                      `}
                    >
                      {team.name}
                    </span>
                  </td>

                  {/* Score */}
                  <td className="px-6 py-4 text-right">
                    <span
                      aria-label={`${team.score} points`}
                      className={`
                        text-3xl lg:text-4xl font-bold
                        ${index < 3 ? 'text-primary' : 'text-foreground'}
                      `}
                    >
                      {team.score}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Next round indicator */}
      {!isLastRound && (
        <div className="text-center mt-4" role="status" aria-live="polite">
          <p className="text-xl text-muted animate-pulse motion-reduce:animate-none">
            Next round starting soon...
          </p>
        </div>
      )}
    </section>
  );
}
