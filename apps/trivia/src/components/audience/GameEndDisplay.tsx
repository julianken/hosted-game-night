'use client';

import type { Team } from '@/types';

export interface GameEndDisplayProps {
  teams: Team[];
}

// Medal colors for top 3
const medalColors: Record<number, string> = {
  0: 'bg-yellow-500 text-black', // Gold
  1: 'bg-gray-400 text-black', // Silver
  2: 'bg-amber-700 text-white', // Bronze
};

/**
 * Final results display shown when the game ends.
 * Highlights the winner with celebration styling.
 */
export function GameEndDisplay({ teams }: GameEndDisplayProps) {
  const winner = teams[0];
  const runnersUp = teams.slice(1, 3);
  const otherTeams = teams.slice(3);

  return (
    <section
      className="flex flex-col items-center h-full min-h-[60vh] gap-8 animate-in fade-in duration-500 motion-reduce:animate-none"
      role="region"
      aria-label="Final game results"
    >
      {/* Game Over header */}
      <div className="text-center" aria-live="polite">
        <h1 className="text-5xl lg:text-6xl font-bold text-foreground">
          Game Over!
        </h1>
      </div>

      {/* Winner spotlight */}
      {winner && (
        <div
          className="text-center py-8 px-12 rounded-3xl bg-gradient-to-b from-yellow-500/20 to-yellow-600/10 border-4 border-yellow-500 animate-in zoom-in-95 duration-700 motion-reduce:animate-none"
          role="article"
          aria-label={`Winner: ${winner.name} with ${winner.score} points`}
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="text-5xl lg:text-6xl" aria-hidden="true">🏆</span>
            <span className="text-4xl lg:text-5xl font-bold text-yellow-500">
              WINNER
            </span>
            <span className="text-5xl lg:text-6xl" aria-hidden="true">🏆</span>
          </div>
          <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground">
            {winner.name}
          </h2>
          <p className="mt-4 text-3xl lg:text-4xl font-semibold text-primary">
            {winner.score} points
          </p>
        </div>
      )}

      {/* Runners up */}
      {runnersUp.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-6 justify-center" role="list" aria-label="Runner-up positions">
          {runnersUp.map((team, index) => (
            <div
              key={team.id}
              role="listitem"
              aria-label={`${index === 0 ? '2nd' : '3rd'} place: ${team.name} with ${team.score} points`}
              className={`
                py-6 px-8 rounded-2xl border-2 text-center
                ${index === 0 ? 'border-gray-400 bg-gray-400/10' : 'border-amber-700 bg-amber-700/10'}
              `}
            >
              <span
                aria-hidden="true"
                className={`
                  ${medalColors[index + 1]}
                  inline-flex w-12 h-12 items-center justify-center
                  rounded-full text-xl font-bold mb-3
                `}
              >
                {index + 2}
              </span>
              <h3 className="text-2xl lg:text-3xl font-bold text-foreground">
                {team.name}
              </h3>
              <p className="mt-2 text-xl lg:text-2xl font-semibold text-muted-foreground">
                {team.score} points
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Other teams */}
      {otherTeams.length > 0 && (
        <div className="w-full max-w-3xl px-4">
          <h3 id="other-participants-heading" className="text-xl font-semibold text-muted-foreground text-center mb-4">
            Other Participants
          </h3>
          <div className="bg-muted/10 rounded-xl border border-border overflow-hidden">
            <ul className="divide-y divide-border" role="list" aria-labelledby="other-participants-heading">
              {otherTeams.map((team, index) => (
                <li
                  key={team.id}
                  className="flex items-center justify-between px-6 py-3"
                  aria-label={`${index + 4}th place: ${team.name} with ${team.score} points`}
                >
                  <div className="flex items-center gap-4">
                    <span aria-hidden="true" className="text-xl font-semibold text-muted-foreground w-8">
                      {index + 4}.
                    </span>
                    <span className="text-xl font-medium text-foreground">
                      {team.name}
                    </span>
                  </div>
                  <span className="text-xl font-semibold text-foreground">
                    {team.score}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* No teams message */}
      {teams.length === 0 && (
        <div className="text-center py-8" role="status">
          <p className="text-2xl text-muted-foreground">No teams participated</p>
        </div>
      )}

      {/* Thank you message */}
      <div className="text-center mt-4">
        <p className="text-2xl text-muted-foreground">
          Thanks for playing! <span aria-hidden="true">🎉</span>
        </p>
      </div>
    </section>
  );
}
